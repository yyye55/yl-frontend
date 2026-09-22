/**
 * 上传总入口 —— 按 biz 分流到「直传」或「后端代传」，并实现大文件的直传链路
 *
 * 【本文件现在是两个文件的入口】：
 *   - 大文件（video）：本文件内的 ali-oss 分片直传，后端只发 STS 临时凭证
 *   - 小文件（image/photo/spectrum/doc）：转发给 ./backendUpload.js，文件
 *     先 POST 给自家后端，由后端代传进 OSS
 *   分流表见下方 UPLOAD_CHANNEL。
 *
 * 【本文件替换了原 src/services/videoUpload.js】原文件是第十二届改造留下的
 * 「预留结构」：`upload()` 全程 TODO，恒定返回 `{success:false, error:'OSS 上传接口尚未就绪'}`，
 * 且假设后端返回 policy/signature 表单签名，与后端实际签发的 STS 凭证对不上。
 * 它没有任何调用方，留着只会误导后来人，故整体重写。
 *
 * 【为什么用 multipartUpload 而不是 put】
 *   1) 700MB 单请求 put 一旦中断就得从头再来，分片可以只重传失败的分片；
 *   2) put 没有进度回调，而视频上传必须给进度（OrchestraForm/ProgramForm 用
 *      FileCover.vue 的进度圈），700MB 无反馈用户会以为卡死；
 *   3) 大文件走单请求更容易触发浏览器/网关的超时与内存问题。
 *
 * 【权限】分片上传需要 oss:InitiateMultipartUpload / UploadPart / CompleteMultipartUpload，
 * 这三者都包含在 `oss:PutObject` 里；再加后端已授予的 AbortMultipartUpload / ListParts /
 * ListMultipartUploads，凭证权限刚好够用，不需要改后端。
 */
import { ossApi, validateForBiz } from '@/api/oss'
import { uploadViaBackend } from './backendUpload'

/**
 * 上传通道分流表 —— 两条通道的唯一事实来源
 *
 * 【为什么分两条】用户定的架构：
 *   - 大文件/大视频：浏览器直传 OSS，后端只负责发一把「钥匙」（STS 临时凭证）。
 *     700MB 必须分片，才扛得住学校网络下的中断重传。
 *   - 小文件：POST 给自家后端，由后端代传进 OSS。小文件分片没有收益，
 *     而后端代传能让「上传」和「业务校验」在同一侧完成。
 *
 * 【为什么是表而不是让调用点自己选】调用点只传 biz，不关心走哪条通道。
 * 所以 OrchestraForm/ProgramForm 里 photo / spectrum 从「直传」改判为
 * 「后端代传」时，那两个文件一行都不用改。
 *
 * 【新增 biz 时必须同时改两处】这里，以及 src/api/oss.js 的 OSS_BIZ_RULES
 * （后端 apps/api/views.py 的 OSS_BIZ_RULES 是第三处，且是真正的防线）。
 * 漏配的 biz 会在下面直接抛错，不会静默走错通道。
 */
const UPLOAD_CHANNEL = {
  video: 'direct', // 700MB，必须分片直传，否则弱网下中断即从头再来
  photo: 'backend',
  spectrum: 'backend',
  image: 'backend',
  doc: 'backend'
}

/** 分片大小：700MB → 140 片，远低于 OSS 的 10000 片上限，也留足了重试余量 */
const PART_SIZE = 5 * 1024 * 1024

/**
 * 把「拦截器 reject 出来的东西」归一成一条可展示的错误
 *
 * 【为什么需要】request.js 的响应拦截器 reject 的是 `response || error`：
 *   - 有响应（405/422…）-> response 对象，带 status / data
 *   - 无响应（断网/超时）-> axios error，拦截器已弹过「网络异常…」
 *   - 401/403/404/500 -> 拦截器已提示并跳转
 * 后两类不该再弹一次。这里沿用 showApiError 的判据，把「已经提示过」标记出来，
 * 由调用方决定是否补提示。
 */
function normalizeError(err, fallback) {
  const res = err && err.response ? err.response : err
  const alreadyShown = !res || !res.status || [401, 403, 404, 500].includes(res.status)
  if (alreadyShown) {
    const e = new Error(fallback)
    e.shown = true
    return e
  }
  const body = res.data
  const detail = body && typeof body === 'object' ? body.msg || body.error : ''
  return new Error(detail || `${fallback}（HTTP ${res.status}）`)
}

/**
 * 上传单个文件到 OSS（按 biz 自动分流到直传 / 后端代传两条通道）
 *
 * 【签名对两条通道统一】返回值与错误约定完全一致，调用点不需要知道
 * 这个文件最终是浏览器直接推上去的、还是后端转手的。
 *
 * @param {Object}   options
 * @param {File}     options.file        待上传文件
 * @param {string}   options.biz         业务类型，见 api/oss.js 的 OSS_BIZ_RULES
 * @param {Function} [options.onProgress] 进度回调，入参为 0~100 的百分数
 * @returns {Promise<{key: string, url: string, name: string}>}
 *          key 是 ObjectKey，url 是可直接访问/落库的完整地址
 * @throws {Error} 失败时抛出；err.shown 为 true 表示**这条错误已经弹过了**
 *         （直传通道里被全局拦截器提示过的那几类），调用方一律按
 *         `if (!err.shown) ElMessage.error(...)` 写即可，两条通道都遵循这个约定。
 *         ⚠️ 语义容易记反：true = 已提示、别重复；false/undefined = 该你弹。
 */
export async function uploadToOss({ file, biz, onProgress }) {
  // 兜底校验：表单的 beforeUpload 已经判过，这里防的是将来新增调用点时漏判
  const check = validateForBiz(file, biz)
  if (!check.valid) throw new Error(check.error)

  const channel = UPLOAD_CHANNEL[biz]
  // 【未知 biz 直接抛，不猜】猜错通道的后果是静默失败或权限错误，比一条
  // 明确的报错难查得多。这个错误不会出现在线上——beforeUpload 会先拦住。
  if (!channel) throw new Error(`未配置上传通道的业务类型：${biz}`)

  // 小文件：交给后端代传，本函数到此为止（其返回值结构与本函数一致）
  if (channel === 'backend') {
    return uploadViaBackend({ file, biz, onProgress })
  }

  // 以下是大文件的直传链路（video）
  /**
   * 【为什么 ali-oss 是动态 import 而不是顶部静态 import】
   * 本文件现在被 8 个上传点共用，其中 7 个走代传通道、根本用不到 ali-oss。
   * 静态 import 会让每一个引用了 uploadToOss 的路由 chunk 都拖上 ali-oss
   * （实测：一个 712KB / gzip 196KB 的共享 chunk），连只传 PDF 的
   * /city/recommend、/school/recommend 也不例外。改成动态 import 后，
   * 只有真要把 700MB 视频推上去的那一刻才去下载它 —— 相对于视频本身的体积，
   * 这点开销可以忽略，而小文件页面则完全不受影响。
   */
  const aliOss = await import('ali-oss')
  // 【CJS 互操作】ali-oss 是 CommonJS 包，Vite 预打包后取 default 才是构造函数；
  // 兜底 `|| aliOss` 是防止某些打包形态下 default 缺省。
  const OSS = aliOss.default || aliOss

  let res
  try {
    ;({ data: res } = await ossApi.getToken({
      biz,
      filename: file.name,
      contentType: file.type,
      fileSize: file.size
    }))
  } catch (err) {
    throw normalizeError(err, '获取上传凭证失败')
  }

  // 业务失败走的是 HTTP 200 + code 1（后端 failure()），不经过拦截器的错误分支，
  // 所以这里必须自己判，msg 是后端给的中文（如「阿里云OSS服务未配置」「视频大小不能超过700MB」）
  if (res.code !== 0) throw new Error(res.msg || '获取上传凭证失败')

  const t = res.data
  const client = new OSS({
    region: t.region, // 'oss-cn-chengdu'，ali-oss 认的就是这个「OSS 区域 ID」形态
    endpoint: t.endpoint,
    accessKeyId: t.accessKeyId,
    accessKeySecret: t.accessKeySecret,
    // 【字段名映射】后端信封里叫 securityToken，ali-oss 构造函数认的是 stsToken
    stsToken: t.securityToken,
    bucket: t.bucket,
    secure: true,
    /**
     * 凭证有效期 3600s（后端 ALIYUN_OSS_STS_EXPIRE）。700MB 在约 200KB/s 的弱网下
     * 要跑近 1 小时，会中途过期，所以必须支持刷新。
     *
     * 【为什么只取凭证、丢掉新 key】后端每次签发都会生成新的 ObjectKey，
     * 但 key 的前缀是 `{biz}/{YYYYMMDD}/`，且会话策略恰好收敛到这个前缀 ——
     * 同一天内新旧凭证能写同一个目录，所以沿用原 key 仍然合法。
     * 唯一失效窗口：上传过程跨过了午夜（前缀里的日期变了）。
     */
    refreshSTSToken: async () => {
      const { data: r } = await ossApi.getToken({
        biz,
        filename: file.name,
        contentType: file.type,
        fileSize: file.size
      })
      if (r.code !== 0) throw new Error(r.msg || '刷新上传凭证失败')
      return {
        accessKeyId: r.data.accessKeyId,
        accessKeySecret: r.data.accessKeySecret,
        stsToken: r.data.securityToken
      }
    }
  })

  try {
    await client.multipartUpload(t.key, file, {
      mime: file.type,
      partSize: PART_SIZE,
      progress: (p) => {
        if (onProgress) onProgress(Math.round(p * 100))
      }
    })
  } catch (err) {
    // ali-oss 抛的是自己的错误对象（含 code/status），不经过 axios 拦截器，
    // 所以没有「已经提示过」这回事，统一给一条可读文案。
    // 【原样存 msg 会很难看】OSS 的错误消息是英文 XML，比如
    // "The Access Key Id you provided does not exist in our records."
    const e = new Error(err && err.message ? `上传失败：${err.message}` : '上传失败')
    e.cause = err
    throw e
  }

  // host 由后端下发（ALIYUN_OSS_HOST 或按 bucket+endpoint 推导），前端不硬编码域名。
  // 【注意末尾斜杠】后端返回的 host 不带尾斜杠，与七牛的 `host` 常量写法不同，这里显式补。
  return { key: t.key, url: `${t.host}/${t.key}`, name: file.name }
}
