/**
 * 后端代传上传服务（小文件走这条）
 *
 * 【两条通道的分工】
 *   - 大文件（video，700MB）→ 浏览器直传 OSS。见 src/services/ossUpload.js，
 *     后端只发 STS 钥匙、不经手文件。
 *   - 小文件（image/photo/spectrum/doc，≤20MB）→ 本文件。文件先 POST 给自家后端，
 *     由后端用常驻 AK 放进 OSS，前端只拿回 url。
 * 分流表在 ossUpload.js 的 UPLOAD_CHANNEL，调用点只传 biz、不关心走哪条。
 *
 * 【为什么必须自建 axios 实例，不能直接用 @/utils/request】
 * src/utils/request.js 有两个设定会把代传上传搞死，两条都踩实了：
 *
 *   1) request.js:47 `timeout: 12000`
 *      20MB 的 PDF 在校园网下基本必超 12 秒。而且超时走的是拦截器里 `!response`
 *      那个分支，弹出来的是「网络异常，请检查您的网络连接」——把「传得慢」说成
 *      「断网」，用户会去反复重试。这里 timeout: 0 表示不限时。
 *
 *   2) request.js:108 `case 404: window.location.href = BASE_URL + '404'`
 *      整页跳转，且发生在拦截器里、业务代码 catch 不到。后端 /api/oss/upload
 *      上线前，任何一次小文件上传都会把用户从表单里踢到 404 页，已填内容全丢。
 *      这里自己处理 404，退化成一条可读的提示。
 *
 * 这与直传通道是对称的 —— ali-oss 本来也不走 request.js。
 * 直传用的 /api/oss/token 与落库用的 /api/file/create 都是已存在的接口，
 * 不会触发 404 跳转，所以它们仍走全局 request，本文件不碰全局行为。
 */
import axios from 'axios'
import { HOST } from '@/utils/request'
import { getToken } from '@/utils/auth'

/**
 * 专用实例：不限时 + 自动带 token，但没有全局的 NProgress 与错误弹窗。
 * NProgress 不加是因为上传自带进度反馈（有的点有 FileCover，有的点没有），
 * 顶栏再跑一条会打架。
 */
const uploadClient = axios.create({
  baseURL: HOST,
  timeout: 0
})

uploadClient.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    // 与 request.js 一致：'Bearer ' 前缀在 utils/auth.js 的 setToken() 里
    // 写进 localStorage 时就带上了，这里原样透传即可
    config.headers['Authorization'] = token
  }
  return config
})

/**
 * 把各种失败归一成一条可展示的错误
 *
 * 【shown 的语义 —— 别搞反】本仓库已确立的约定是：
 *   shown === true 表示「这条错误**已经弹给用户看过了**」，调用方**不要**再弹。
 * 判据见 ossUpload.js 的 normalizeError：它把「拦截器已经提示过」的那几类
 * （无响应 / 401 / 403 / 404 / 500）标成 shown=true，其余留 falsy；
 * 调用方一律写成 `if (!err.shown) ElMessage.error(...)`。
 *
 * 【所以这里必须留 falsy，不能设 true】代传走的是本文件自建的 axios 实例，
 * **没有挂任何响应拦截器**，这些错误从头到尾没人弹过。若标成 shown=true，
 * 7 个上传点的 `if (!err.shown)` 会全部静默吞掉——包括后端接口尚未部署时那句
 * 「上传服务暂未就绪（后端接口未部署）」，用户点了上传会毫无反应。
 */
function toError(message) {
  const e = new Error(message)
  e.shown = false
  return e
}

/**
 * 上传单个文件（后端代传）
 *
 * @param {Object}   options
 * @param {File}     options.file        待上传文件
 * @param {string}   options.biz         业务类型，见 api/oss.js 的 OSS_BIZ_RULES
 * @param {Function} [options.onProgress] 进度回调，入参为 0~100 的百分数
 * @returns {Promise<{key: string, url: string, name: string}>}
 * @throws {Error} 失败时抛出；err.shown 恒为 false（本通道无人弹出过，调用方负责弹）
 */
export async function uploadViaBackend({ file, biz, onProgress }) {
  // 【不要手写 Content-Type】手写 multipart/form-data 会把 boundary 一起写死，
  // 后端解析不出分段。本仓库的 axios 是 1.20.0，遇到 FormData 会自动把
  // request.js:51 设的 application/x-www-form-urlencoded 默认头清掉，
  // 交给浏览器自己带 boundary，所以这里什么都不用管。
  const form = new FormData()
  form.append('file', file)
  form.append('biz', biz)

  let res
  try {
    ;({ data: res } = await uploadClient.post(HOST + '/api/oss/upload', form, {
      /**
       * 【进度条的语义要说清楚】onUploadProgress 量的是「浏览器 → 本后端」这一段，
       * 后端拿到文件后再往 OSS 传的那段不在这里面。所以进度条走到 100% 之后，
       * 服务端可能还要等一会儿才返回。小文件（≤20MB）这个空窗期可以接受，
       * 不额外做「处理中」态。
       */
      onUploadProgress: (e) => {
        if (!onProgress || !e.total) return
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    }))
  } catch (err) {
    const r = err && err.response
    // 无响应：断网、或用户中途取消
    if (!r) throw toError('上传失败：网络中断')
    // 后端接口尚未部署。这里刻意不复用全局拦截器的 404 跳转行为（见文件头说明）
    if (r.status === 404) throw toError('上传服务暂未就绪（后端接口未部署）')
    if (r.status === 401 || r.status === 403) throw toError('登录状态已失效，请重新登录后再上传')
    const detail = r.data && typeof r.data === 'object' ? r.data.msg || r.data.error : ''
    throw toError(detail || `上传失败（HTTP ${r.status}）`)
  }

  // 【业务失败是 HTTP 200 + code:1】后端 failure() 不走 HTTP 错误码，所以上面
  // 的 catch 根本不会触发，必须在这里自己判。msg 是后端给的中文
  // （如「文件大小不能超过20M」「阿里云OSS服务未配置」），直接透传给用户。
  if (!res || res.code !== 0) {
    throw toError((res && res.msg) || '上传失败')
  }

  const d = res.data || {}
  if (!d.url) throw toError('上传成功但后端未返回文件地址')

  // 归一成与直传通道（ossUpload.js）完全一致的返回结构，调用点无需区分来源
  return { key: d.key, url: d.url, name: d.filename || file.name }
}
