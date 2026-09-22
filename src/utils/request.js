/**
 * Axios 请求封装
 *
 * 【可信度：A】直接照搬 dist/app.js 中的 axios 配置
 * - timeout: 12000
 * - Content-Type: application/x-www-form-urlencoded （POST 默认）
 * - 请求拦截：注入 Authorization、启动 nprogress
 * - 响应拦截：
 *     - data.code === 401 → "没有权限操作"
 *     - HTTP 401 → "登录认证已过期" + 跳登录
 *     - HTTP 403 → "无相关操作权限" + 跳登录
 *     - HTTP 404 → 跳 /404
 *     - HTTP 500 → 跳 /500
 *
 * 【Vue 3 重构】
 * - 移除 Vue.prototype.$message，使用 ElMessage
 * - 移除直接跳转 router，使用动态导入 router
 */

import axios from 'axios'
import NProgress from 'nprogress'
import { ElMessage } from 'element-plus'
import { getToken, clearToken, clearUser } from './auth'

// 【唯一来源】后端地址只从 .env 读取：开发 .env.development，生产 .env.production。
//
// 【为什么没有兜底地址】原实现在 env 缺失时静默回退到一条写死的内网穿透域名，
// 一旦该隧道失效，现象是「页面数据全空」而不是「配置错了」，排查成本极高；
// 且兜底域名与实际在用的隧道并不一致。现改为不兜底：
// env 缺失时 HOST 为空串，请求退化为同源相对路径（如 /api/login），
// 会立刻 404 到 dev server 自身，配置问题一眼可见。
const HOST = import.meta.env.VITE_API_BASE_URL || ''

// 生产环境本变量可能被刻意留空（同源部署），故告警只在开发环境打印。
if (!HOST && import.meta.env.DEV) {
  console.error('[request] VITE_API_BASE_URL 未配置，接口将请求同源地址')
}

// 创建 axios 实例
//
// 【baseURL 是兜底，不是开关】决定接口地址的是各调用点里拼的 HOST
// （一律写成 HOST + '/api/…'，属于绝对地址）；axios 遇到绝对地址会直接
// 跳过 baseURL，所以这里的 baseURL 正常情况下不生效，只在「万一有人写成
// 相对路径」时兜底。⇒ 要换后端地址，只改 .env 里的 VITE_API_BASE_URL。
const request = axios.create({
  baseURL: HOST,
  timeout: 12000
})

// POST 默认表单格式（与 dist 一致）
request.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded'

/**
 * 对象请求体一律 JSON 序列化
 *
 * 【为什么需要这一小段】axios 0.x（dist 用的）与 axios 1.x 对下面这行的处理**不一样**：
 *
 *     request.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded'
 *
 *   · axios 0.x 的 transformRequest：对象一律 `JSON.stringify(data)`，而
 *     setContentTypeIfUnset 发现头已存在便不再改动 —— 结果是
 *     **body 是 JSON、Content-Type 却写着 form-urlencoded**。
 *   · axios 1.x 的 transformRequest（node_modules/axios/lib/defaults/index.js）多了一行：
 *         if (contentType.indexOf('application/x-www-form-urlencoded') > -1)
 *           return toURLEncodedForm(data, formSerializer).toString()
 *     于是对象体被真的编码成表单键值对：`person[0][name]=…&person[0][card]=…`
 *
 * 后端 `apps/core/services.py:parse_body` 先 `json.loads(request.body)`，失败再退到
 * `request.POST.dict()`。Django 解析表单时**不做括号解嵌套**，`person[0][name]` 就是一整个
 * 平铺的键名，因此 `parse_body` 返回的字典里**根本没有 `person` 这个键**。
 * 而 create_report / update_report 都写的是 `data.get("person", [])` —— 取到空列表，
 * `store_people([])` 又是 `(True, [])`，于是**一个不带任何人员关联的报名表被成功创建**，
 * 接口照常回「创建成功」。
 *
 * 症状就是用户报的两条：
 *   ① 列表页「人员信息」弹窗是空表；④ 编辑页「指导教师」「参展人员」两张表也是空表。
 * （② ③ 是另外两个独立缺陷，与本条无关。）
 *
 * 【为什么在这里改、而不是把 Content-Type 换成 application/json】
 * 保持头不变 = 与 dist 的线上行为逐字节一致。`application/json` 不是 CORS 安全列表内的
 * content type，换成它会让跨域部署下的每个 POST 都先发一次 OPTIONS 预检，是否放行取决于
 * 别处的 CORS 配置 —— 那是本次修复不该引入的变量。后端不读 Content-Type，
 * parse_body 只认 body 本身，所以这样改就够。
 *
 * 【放行清单】FormData 必须原样透传，否则 multipart 的分段与 boundary 会被破坏
 * （上传链路全靠它）。其余二进制/字符串类型同理不动。
 */
function isRawBody(data) {
  if (typeof data === 'string') return true
  if (typeof FormData !== 'undefined' && data instanceof FormData) return true
  if (typeof URLSearchParams !== 'undefined' && data instanceof URLSearchParams) return true
  if (typeof Blob !== 'undefined' && data instanceof Blob) return true
  if (typeof ArrayBuffer !== 'undefined' && (data instanceof ArrayBuffer || ArrayBuffer.isView(data))) {
    return true
  }
  return false
}

/* ============ 请求拦截 ============ */
request.interceptors.request.use(
  (config) => {
    NProgress.start()
    const token = getToken()
    if (token) {
      config.headers['Authorization'] = token
    }
    // 先自己 stringify 成字符串：axios 1.x 的 transformRequest 只在 data 仍是
    // 「对象」时才会走 toURLEncodedForm 那一支，字符串会被原样放行。
    if (config.data !== null && typeof config.data === 'object' && !isRawBody(config.data)) {
      config.data = JSON.stringify(config.data)
    }
    return config
  },
  (error) => {
    NProgress.done()
    return Promise.reject(error)
  }
)

/* ============ 响应拦截 ============ */
function gotoLogin() {
  clearToken()
  clearUser()
  setTimeout(() => {
    // 跳登录页。BASE_URL 由 vite.config.js 的 base 派生，恒带尾部 '/'，
    // 生产为 /ylbxt/login，开发为 /login
    window.location.href = import.meta.env.BASE_URL + 'login'
  }, 1000)
}

request.interceptors.response.use(
  (response) => {
    NProgress.done()
    const { data } = response
    // 业务码 401
    if (data && data.code === 401) {
      ElMessage.error('没有权限操作')
      return Promise.reject(response)
    }
    // HTTP 状态 200 但业务可能失败，这里把整 response 透传给业务代码自己处理
    return response
  },
  (error) => {
    NProgress.done()
    const { response } = error
    if (!response) {
      ElMessage.error('网络异常，请检查您的网络连接')
      return Promise.reject(error)
    }
    switch (response.status) {
      case 401:
        ElMessage.error('登录认证已过期！')
        gotoLogin()
        break
      case 403:
        ElMessage.error('无相关操作权限！')
        gotoLogin()
        break
      case 404:
        window.location.href = import.meta.env.BASE_URL + '404'
        break
      case 500:
        window.location.href = import.meta.env.BASE_URL + '500'
        break
      default:
        console.log(response.status, error.message)
    }
    return Promise.reject(response || error)
  }
)

/**
 * 从响应中提取业务响应体（保留 code/msg/data/count 完整信封）
 *
 * 【可信度：A】业务码与响应结构来源：
 *   1) dist 分页列表：
 *      report.getList(e).then(({data:e})=>{ 0===e.code ? (this.total=e.count, this.data=e.data) : ElMessage.error(e.msg) })
 *   2) dist 登录：   1===e.code ? ElMessage.error(e.msg) : ...
 *   3) dist 七牛 token：({data:e})=>{ 0===e.code ? (this.QiniuData.token=e.uptoken) : ElMessage.error(e.msg) }
 *      —— 注意这里直接读 e.uptoken，说明业务层拿到的是「完整 body」而不是 body.data
 *   4) 后端 apps/core/services.py：
 *      success()       -> {"code": 0, "msg": ..., "data": ...}
 *      failure()       -> {"code": 1, "msg": ..., "data": ...}
 *      page_response() -> {"data": [...], "count": N, "code": 0, "msg": ""}
 *      （全仓不存在 code 200）
 *
 * 【修复记录】原实现判断 `body.code === 200`，而后端成功码恒为 0，两个分支都不命中，
 * 于是接口「成功」时反而走失败分支：弹出 msg（例如“操作成功!”）并返回 rejected Promise，
 * 调用方未 await 该 Promise，导致 admin/report、admin/user、admin/scan、admin/index
 * 四个页面数据恒为空。现改为与 dist / 后端一致的 `code === 0`。
 *
 * 【返回值语义 —— 与 dist 保持一致】
 *   成功 -> 返回完整 body，调用方自行读 body.data / body.count / body.uptoken
 *   失败 -> ElMessage.error(msg) 后返回 null；不抛异常、不 reject
 *           （dist 的写法就是 `0===e.code ? 处理 : ElMessage.error(e.msg)`，
 *             失败只提示、不中断页面，也不返回 Promise）
 */
export function unwrap(res) {
  const body = res && res.data !== undefined ? res.data : res
  if (!body) return null
  // code === undefined：兼容非信封响应（如 blob 导出）
  if (body.code === 0 || body.code === undefined) {
    return body
  }
  if (body.msg) ElMessage.error(body.msg)
  return null
}

/**
 * 把请求失败转成一句用户可见的提示（与 unwrap 对称：unwrap 管成功，本函数管失败）
 *
 * 【为什么需要它】上面的响应拦截器只对 401/403/404/500 和「无响应」做了提示，
 * 其余状态（405/422 等）走 default 分支，仅 console.log 就 reject ——
 * 调用方若不写 .catch，用户看到的就是「按钮点了没反应」。本函数补上这一段。
 *
 * 【入参 err 是什么】拦截器默认分支 reject 的是 `response || error`：
 *   - 有响应（405/422/…）-> 传进来的是 response 对象，带 status / data
 *   - 无响应（断网/超时）-> 传进来的是 axios error，拦截器已提示「网络异常…」
 * 【返回】实际弹出的文案；返回 null 表示拦截器已经提示过/已跳转，调用方不必再处理。
 *
 * 【为什么不读 body.detail】detail 是 Django / django-ninja 框架自带的英文原文
 * （如 "Method not allowed"、"value is not a valid integer"），不适合直接给用户看；
 * 只取后端业务信封里的 msg（failure/success）与 error（role_error）。
 */
export function showApiError(err, fallback = '操作失败') {
  const res = err && err.response ? err.response : err
  if (!res || !res.status) return null                       // 网络异常：拦截器已提示
  if ([401, 403, 404, 500].includes(res.status)) return null // 拦截器已提示并跳转
  const body = res.data
  const detail = body && typeof body === 'object' ? (body.msg || body.error) : ''
  const message = detail || `${fallback}（HTTP ${res.status}）`
  ElMessage.error(message)
  return message
}

export { HOST }
export default request
