/**
 * 远端附件下载（OSS URL → Blob → 数据库里的原始文件名）
 *
 * 【要解决的问题】扫描件 / 照片 / 视频三类附件都存在阿里云 OSS 上：数据库保存的是
 * 原始中文名（files.filename / scan_files.files[].name），OSS 的 ObjectKey 却是
 * `{biz}/{YYYYMMDD}/{uuid}{ext}`（见后端 apps/api/views.py 的 oss_token，
 * 原名从不进入 key）。前端此前一律用 <a :href="f.url" :download="..."> 直链下载，
 * 这条路有两个**互相独立**的坑，任一个都会让存盘名变成那串 UUID：
 *
 *   1) `download` 属性对**跨域** href 一律被浏览器忽略（HTML 规范明文规定），
 *      而 OSS 与本系统不同源 —— 属性值写得再对也没用；
 *   2) 两处调用点的属性值本身也没写对（ShowScFile 绑了一个不存在的字段，
 *      ShowContent 漏了冒号写成字面量），各自的说明见对应组件。
 *
 * 所以唯一可行的做法是：自己把文件取成 Blob，再用 blob: URL 触发下载 ——
 * blob URL 与页面同源，`download` 属性这才生效。
 *
 * 【为什么用 fetch，而不是项目的 request 实例】
 * utils/request.js 的请求拦截器会**无条件**给每个请求加上
 * `Authorization: <本站 bearer token>`。拿它去请求 *.aliyuncs.com 有两个后果：
 *   · 把本系统的登录 token 泄露给第三方域名；
 *   · OSS 看到 Authorization 会当成「自带签名的请求」去验签，直接 400/403。
 * 另外带自定义头的跨域请求会先发 CORS 预检（OPTIONS），而裸 fetch 的 GET 属于
 * 「简单请求」，只要响应带 Access-Control-Allow-Origin 即可 —— 这是对 OSS CORS
 * 配置要求最低的写法。同理也不走 request 的拦截器，不会误触发 NProgress 与
 * 401/403/404/500 的整页跳转。
 *
 * OSS 侧 CORS 对本站是放开的：上传链路本身就是浏览器直传 OSS
 * （@/services/ossUpload.js 的 ali-oss multipartUpload），那同样是跨域请求。
 *
 * 【CORS 实测（2026-09-23，真实 bucket ylbxt）】
 *   Origin: http://47.108.29.34（生产前后端同源域名）→ 响应带 Access-Control-Allow-Origin，可用
 *   Origin: http://localhost:8080（本地开发）        → 无该头，浏览器拦截
 * 即本地开发点下载会在控制台报 CORS 错，需在 OSS 控制台把 localhost:8080 加进该 bucket
 * 的跨域规则；属 OSS 配置，不在前端改动范围内。
 */

import { ElMessage } from 'element-plus'

/** 文件名兜底：URL 为空或原始名为空时，至少不要出现 undefined/空名 */
function fallbackName(url) {
  try {
    const seg = decodeURIComponent(new URL(url).pathname.split('/').pop() || '')
    return seg || '下载文件'
  } catch (e) {
    // url 不是合法绝对地址（历史数据里的相对路径 / 已下线的七牛域名等）
    return '下载文件'
  }
}

/**
 * 下载远端文件，用原始文件名存盘
 *
 * @param {string} url      远端文件地址（OSS 绝对 URL）
 * @param {string} filename 数据库里保存的原始文件名；为空时退回 URL 最后一段
 * @returns {Promise<boolean>} 是否成功触发下载。失败时已弹提示并 console.error，
 *                            调用方不需要再写 catch（与 unwrap/showApiError 的分工一致）
 */
export async function downloadRemoteFile(url, filename) {
  if (!url) {
    ElMessage.error('文件下载失败：文件地址为空')
    return false
  }
  try {
    const res = await fetch(url)
    // OSS 对不存在/无权限的对象返回 403/404 + XML，不检查会存下一个 XML 错误页
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const blob = await res.blob()

    const objectUrl = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = objectUrl
    // download 是 DOMString 反射属性：赋 undefined 会被 String() 化成字面量
    // "undefined"，所以这里必须是「非空字符串」，兜底不能省（同 utils/excel.js）。
    a.download = filename || fallbackName(url)
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)

    // 不在点击后立刻 revoke：Chromium 系浏览器在 click() 同步返回时可能还没
    // 真正开始读取 blob，立即释放会让大文件（视频上限 700MB）下载被中断。
    // FileSaver.js 出于同一原因也是延迟释放；这里给 10s，之后清掉这个 URL。
    window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 10000)
    return true
  } catch (err) {
    // 走到这里的常见原因：OSS 未对本站放开 GET 跨域（TypeError: Failed to fetch）、
    // 对象不存在/无权限、断网。不做静默降级 —— 退回直链只会存下一个 UUID 文件，
    // 正是本函数要修掉的现象。
    console.error('[downloadRemoteFile]', url, err)
    ElMessage.error('文件下载失败，请稍后重试')
    return false
  }
}
