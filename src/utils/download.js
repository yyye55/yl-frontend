/**
 * 跨域文件下载：把 OSS 上的对象按**原始文件名**存到本地
 *
 * 【要解决的问题】
 * 后端落库的 url 是 OSS 的公开地址（apps/api/views.py 的 oss_upload：
 * `"url": f"{oss_public_host()}/{key}"`），而 key 是随机 UUID，例如
 *   https://ylbxt.oss-cn-chengdu.aliyuncs.com/doc/20260923/9f3c…c1.pdf
 * 原始文件名（「单位扫描件.pdf」「乐团集体照片.jpg」「演出视频.mp4」）只存在数据库里：
 *   · 报名详情 → Files.filename
 *   · 扫描件   → ScanFiles.files 这个 JSON 数组里每个元素的 name 字段
 *
 * 【为什么 <a href download> 修不好】
 * HTML 的 download 属性有一条硬规则：**跨源（cross-origin）时被浏览器忽略**。
 * OSS 域名与前端域名不同源，所以 download 指定的名字不生效，浏览器退回用 URL 最后
 * 一段命名 —— 这正是「下载下来是一串 UUID」的成因。
 * 两个调用点原来的属性值本身也写错了（详见各自组件的说明），但即便改对，
 * 只要还是跨源直链，download 依然会被忽略。所以只能走 blob：
 *   fetch 取字节 → createObjectURL → <a download=真文件名> → 点击 → 释放
 *
 * 【为什么用 fetch，而不是项目的 axios 实例】
 * src/utils/request.js 的全局实例有两个设定会把 OSS 下载搞坏：
 *   1) `timeout: 12000` —— 演出视频单文件上限 700MB（见后端 OSS_BIZ_RULES 的 video 项），
 *      12 秒必然超时，而超时走的是拦截器里弹「网络异常，请检查您的网络连接」那条分支，
 *      把「文件大」说成「断网」，用户会反复重试；
 *   2) 响应拦截器里 404 / 500 会 `window.location.href` 整页跳转 —— OSS 对不存在的
 *      对象回 404、权限不足回 403，用户会被踢出当前页面，已填内容全丢。
 * fetch 是浏览器内置能力，不是新增依赖（未引入任何 HTTP 库），用它正是为了绕开这两条。
 *
 * 【CORS 前提（运维侧，非前端可解）】
 * fetch 读 OSS 响应体要求 bucket 对该前端源放行。2026-09-23 实测真实 bucket：
 *   Origin: http://47.108.29.34（生产前后端同源域名）→ 返回 Access-Control-Allow-Origin，OK
 *   Origin: http://localhost:8080（本地开发）        → 无该头，浏览器拦截
 * 即本地开发点下载会在控制台报 CORS 错，需在 OSS 控制台把 localhost:8080 加进该 bucket
 * 的跨域规则；属 OSS 配置，不在本次前端改动范围内。
 */
export async function downloadRemoteFile(url, fileName) {
  const res = await fetch(url)
  if (!res.ok) throw new Error('下载失败（HTTP ' + res.status + '）')
  const blob = await res.blob()

  const objectUrl = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = objectUrl
  // download 是 DOMString 反射属性，赋 undefined 会被 String() 化成字面量 "undefined"，
  // 存盘名就成了 "undefined.pdf"。所以这里必须始终给一个真名字（兜底名与 utils/excel.js 一致）。
  a.download = fileName || '下载文件'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // 不立即 revoke：视频可达数百 MB，部分浏览器在下载尚未读完前 revoke 会中断下载。
  // 延迟释放既避免内存泄漏，也不影响下载完成。
  setTimeout(() => window.URL.revokeObjectURL(objectUrl), 10000)
}
