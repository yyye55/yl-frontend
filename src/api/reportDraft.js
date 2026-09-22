/**
 * 报名暂存（草稿）API —— 学校端 / 市州端共用
 *
 * 【接口契约来源】第十二届「意林杯」报名暂存前后端对接规范。
 * scope 由 URL 决定（school / city），**不放请求体**；user_id / status / state 同理，
 * 全部由后端从登录态推导。
 *
 * ===========================================================================
 * 【为什么要另起一个 axios 实例，而不是复用 @/utils/request】
 * ===========================================================================
 * request.js 是给「一次性页面动作」设计的，它有两个设定会和自动暂存天然冲突
 * （逐行核对过，不是推测）：
 *
 *   request.js:160  case 404: window.location.href = BASE_URL + '404'
 *   request.js:163  case 500: window.location.href = BASE_URL + '500'
 *
 *   这两条是**整页跳转**，业务代码 catch 不到。后果：
 *     · 后端草稿接口尚未部署时，任何一次自动暂存都会把用户从填了一半的表单里
 *       踢到 404 页，且已填内容全部丢失 —— 而自动暂存是定时器触发的，
 *       用户根本没做任何操作。
 *     · 规范 §二十六 要求前端区分并处理 DRAFT_NOT_FOUND（草稿不存在 →
 *       停止自动暂存、回列表页）。若后端用 HTTP 404 表达它，上面的跳转会把
 *       这个语义整个吞掉，前端**永远收不到**。
 *
 *   request.js:47   timeout: 12000
 *   65 人满编名单的完整快照在弱网下可能超过 12 秒；超时后走的是
 *   「网络异常，请检查您的网络连接」分支，文案对自动暂存是误导的。
 *
 *   request.js:146-149  无响应时弹全局 ElMessage
 *   自动暂存失败会以固定节奏反复弹窗，且与页面自己的「暂存失败，请重试」
 *   状态文案重复。
 *
 * ⇒ 本实例：timeout: 0（不设总超时，由调用方与浏览器决定）、不挂全局拦截器、
 *   自带错误归一（normalizeDraftError）。这与本仓库既有的先例一致 ——
 *   src/services/backendUpload.js 当初也是为同一个理由（404 整页跳转）另起的实例。
 *
 * 【Content-Type 刻意不改】与 request.js 同款做法：头仍是 post 默认的
 * application/x-www-form-urlencoded，但请求拦截器里先把对象 JSON.stringify 成字符串，
 * 于是 body 是 JSON 文本、头不变。原因见 request.js:79-86 ——
 * application/json 不在 CORS 安全列表内，改头会让跨域部署下每个 POST/PUT
 * 都先发一次 OPTIONS 预检，是否放行取决于别处的 CORS 配置，属于不应引入的变量。
 * 后端 apps/core/services.py:parse_body 是先 json.loads(request.body)、
 * 失败才退到 request.POST.dict()，所以这样发它照样解析得出来。
 *
 * ===========================================================================
 * 【⚠ 后端接口不一致问题（转交后端，前端不自行修改后端）】
 * ===========================================================================
 * 1) 路径单复数不一致：本文件按规范原文实现 ——
 *      草稿   用单数  /api/{scope}/report/drafts
 *      驳回编辑用复数  /api/{scope}/reports/{report_id}/edit-draft
 *    而本项目后端（apps/api/views.py 的 register_scope_routes）现状全是**单数**
 *    /api/{scope}/report/...。二者必须统一，否则 edit-draft 会 404。
 *    前端此处按规范原文写，后端若定为单数，改本文件 PATHS 一处即可。
 *
 * 2) 这 6 个接口后端**一个都还没有**：全仓 `grep -rni draft --include=*.py` 零命中，
 *    路由表里也没有 /report/drafts*。前端先按契约实现，后端就绪前调用会失败
 *    （由本实例自己的错误归一处理，不会整页跳 404）。
 */

import axios from 'axios'
import { HOST } from '@/utils/request'
import { getToken } from '@/utils/auth'

/** scope → URL 段。只认这两个值，写错立刻抛，不静默拼出一个错地址 */
const SCOPE_SEGMENT = { school: 'school', city: 'city' }

/**
 * 路径集中在这一张表里。
 * 后端若把 edit-draft 定成单数 /report/{id}/edit-draft，只改这一行。
 */
const PATHS = {
  drafts: (seg) => `${HOST}/api/${seg}/report/drafts`,
  draft: (seg, id) => `${HOST}/api/${seg}/report/drafts/${id}`,
  submit: (seg, id) => `${HOST}/api/${seg}/report/drafts/${id}/submit`,
  editDraft: (seg, id) => `${HOST}/api/${seg}/reports/${id}/edit-draft`
}

function prefixOf(scope) {
  const seg = SCOPE_SEGMENT[scope]
  if (!seg) throw new Error(`[reportDraft] 未知 scope：${scope}（只允许 school / city）`)
  return seg
}

const draftRequest = axios.create({ baseURL: HOST, timeout: 0 })

// 与 request.js:51 一致：POST 默认表单头（实际 body 是 JSON 文本，见文件头说明）
draftRequest.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded'

draftRequest.interceptors.request.use(
  (config) => {
    const token = getToken()
    if (token) config.headers['Authorization'] = token
    // 先 stringify 成字符串，绕开 axios 1.x 的 toURLEncodedForm（理由同 request.js:107-111）
    if (config.data !== null && typeof config.data === 'object') {
      config.data = JSON.stringify(config.data)
    }
    return config
  },
  (error) => Promise.reject(error)
)

/* =========================================================================
 * 错误归一
 * ========================================================================= */

/**
 * 归一后的错误种类。调用方只 switch 这个，不直接看 HTTP 状态码。
 */
export const DRAFT_ERR = {
  CONFLICT: 'conflict',                 // 409：版本冲突，草稿已被别处更新
  NOT_FOUND: 'not_found',               // 草稿不存在
  NOT_REJECTED: 'not_rejected',         // 报名不是驳回状态，不能进入修改
  INVALID: 'invalid',                   // 400：payload 不合法
  ALREADY_SUBMITTED: 'already_submitted', // 已提交（按成功处理，见 §十二）
  AUTH: 'auth',                         // 401/403
  NETWORK: 'network',                   // 断网 / 超时 / 无响应
  HTTP: 'http'                          // 其余 HTTP 状态
}

/**
 * 把后端错误信封归一成一个形状稳定的对象。
 *
 * 【两种表达方式都要认】规范 §二十一/§二十六 用**字符串业务码**表达
 * （如 code:"DRAFT_VERSION_CONFLICT"），而本项目后端既有的 failure() 用的是
 * code:1 + 中文 msg。二者可能同时存在，所以这里**先看 code 字符串，再看 HTTP 状态**，
 * 不假设后端只用其中一种。
 *
 * 【返回值】{ kind, msg, serverVersion, status }，永不抛。
 *   serverVersion 只在 CONFLICT 时有值（规范 §二十一：data.server_version）。
 */
export function normalizeDraftError(err) {
  const res = err && err.response ? err.response : err
  const status = res && res.status ? res.status : 0

  // 无响应：断网 / 超时 / 被取消
  if (!status) {
    return { kind: DRAFT_ERR.NETWORK, msg: '网络中断，请检查网络后重试', serverVersion: null, status: 0 }
  }

  const body = (res.data && typeof res.data === 'object') ? res.data : {}
  // 业务码可以是字符串（规范）也可以是数字（本项目既有 failure 约定）
  const code = typeof body.code === 'string' ? body.code : ''
  const data = (body.data && typeof body.data === 'object') ? body.data : {}
  const serverVersion = data.server_version != null ? data.server_version
    : (data.version != null ? data.version : null)

  /*
   * 【顺序要紧：具体的业务码必须先于通用的 HTTP 状态判断】
   *
   * 后端有**三种**情况都返回 409（apps/core/report_drafts.py:42 / :47 / :60）：
   *   DRAFT_VERSION_CONFLICT      真·版本冲突
   *   REPORT_NOT_REJECTED         报名不是驳回状态（edit-draft / 重新提交）
   *   DRAFT_DATA_INTEGRITY_ERROR  已提交草稿缺 report_id（服务端数据问题）
   * 原先把 `status === 409` 写在最前面，于是后两者一律被吞成 CONFLICT。
   *
   * 后果不是文案不准，是**守卫被整个绕过**：OrchestraForm.enterEdit 只在
   * kind===NOT_REJECTED 时拦下「非驳回状态的报名」并直接 return；被误判成
   * CONFLICT 后会落进它下面的通用 catch，弹「草稿服务暂时不可用」并继续
   * getMessage()，**本该被拒绝的编辑入口照常打开**。故先按码判，判不出来再退到状态。
   *
   * 例外：DRAFT_DATA_INTEGRITY_ERROR 刻意**不**单列，落到下面的 status===409。
   * 它同样该「停止自动暂存」（useDraftSession 只在 CONFLICT 时停），而它的 msg
   * 是原样透传的，用户仍看得到真实原因，不至于被误导成版本冲突。
   */
  if (code === 'DRAFT_VERSION_CONFLICT') {
    return { kind: DRAFT_ERR.CONFLICT, msg: body.msg || '草稿已在其他页面更新', serverVersion, status }
  }
  if (code === 'DRAFT_NOT_FOUND') {
    return { kind: DRAFT_ERR.NOT_FOUND, msg: body.msg || '草稿不存在或已被删除', serverVersion: null, status }
  }
  if (code === 'REPORT_NOT_REJECTED') {
    return { kind: DRAFT_ERR.NOT_REJECTED, msg: body.msg || '该报名不是驳回状态，无法进入修改', serverVersion: null, status }
  }
  if (code === 'DRAFT_ALREADY_SUBMITTED') {
    return { kind: DRAFT_ERR.ALREADY_SUBMITTED, msg: body.msg || '该草稿已经提交', serverVersion: null, status }
  }
  if (code === 'INVALID_DRAFT_PAYLOAD') {
    return { kind: DRAFT_ERR.INVALID, msg: body.msg || '暂存内容不合法，请检查填写项', serverVersion: null, status }
  }

  // 到这里说明后端没给可识别的字符串业务码（含本项目既有 failure() 的数字码 1），
  // 只能退回 HTTP 状态判断。
  if (status === 409) {
    return { kind: DRAFT_ERR.CONFLICT, msg: body.msg || '草稿已在其他页面更新', serverVersion, status }
  }
  if (status === 404) {
    return { kind: DRAFT_ERR.NOT_FOUND, msg: body.msg || '草稿不存在或已被删除', serverVersion: null, status }
  }
  if (status === 400) {
    return { kind: DRAFT_ERR.INVALID, msg: body.msg || '暂存内容不合法，请检查填写项', serverVersion: null, status }
  }
  if (status === 401 || status === 403) {
    return { kind: DRAFT_ERR.AUTH, msg: body.msg || '登录状态已失效，请重新登录', serverVersion: null, status }
  }
  return { kind: DRAFT_ERR.HTTP, msg: body.msg || `暂存请求失败（HTTP ${status}）`, serverVersion, status }
}

/** 把「后端认为已经提交」的响应统一成提交成功的数据形状 */
function asSubmitted(data) {
  return {
    draftId: data && data.draft_id != null ? String(data.draft_id) : null,
    reportId: data && data.report_id != null ? String(data.report_id) : null,
    draftState: data ? data.draft_state : null,
    reportStatus: data ? data.report_status : null
  }
}

/* =========================================================================
 * 接口
 * ========================================================================= */

export const reportDraftApi = {
  /**
   * 创建草稿。POST /api/{scope}/report/drafts
   * 【绝不重复调用】首次成功后必须记住 draft_id，后续一律走 update。
   * 请求体只发 { payload }；draft_id/report_id/version/state/scope/user_id/status 一律不发。
   */
  create(scope, payload) {
    return draftRequest.post(PATHS.drafts(prefixOf(scope)), { payload })
  },

  /**
   * 更新草稿。PUT /api/{scope}/report/drafts/{draft_id}
   * 必须带当前 version（乐观锁）；成功后调用方要立刻用返回的 version 覆盖本地。
   */
  update(scope, draftId, version, payload) {
    return draftRequest.put(PATHS.draft(prefixOf(scope), draftId), { version, payload })
  },

  /** 草稿详情（含完整 payload）。GET /api/{scope}/report/drafts/{draft_id} */
  getById(scope, draftId) {
    return draftRequest.get(PATHS.draft(prefixOf(scope), draftId))
  },

  /** 编辑中的草稿**摘要**列表。GET /api/{scope}/report/drafts */
  getList(scope) {
    return draftRequest.get(PATHS.drafts(prefixOf(scope)))
  },

  /** 正式提交。POST /api/{scope}/report/drafts/{draft_id}/submit —— 只发 version，不发 payload */
  submit(scope, draftId, version) {
    return draftRequest.post(PATHS.submit(prefixOf(scope), draftId), { version })
  },

  /** 驳回后进入修改。POST /api/{scope}/reports/{report_id}/edit-draft —— 空 body */
  editRejected(scope, reportId) {
    return draftRequest.post(PATHS.editDraft(prefixOf(scope), reportId), {})
  }
}

/* =========================================================================
 * 响应解包（供 composable 使用）
 * ========================================================================= */

/**
 * 解「创建 / 更新」的响应。
 * 【注意 code 的类型】成功是数字 0；失败/冲突时后端可能给字符串码（规范 §二十一）。
 * 所以这里**不能**写 `code === 0 ? 成功 : 失败`——要先把错误归一跑一遍。
 */
export function unwrapSave(res) {
  const body = res && res.data ? res.data : {}
  if (body.code === 0) {
    const d = body.data || {}
    return {
      draftId: d.draft_id != null ? String(d.draft_id) : null,
      reportId: d.report_id != null ? String(d.report_id) : null,
      version: d.version,
      state: d.state,
      updatedAt: d.updated_at || null
    }
  }
  // code 非 0：交给归一逻辑决定种类（可能是冲突，也可能是一般失败）
  throw Object.assign(new Error(body.msg || '暂存失败'), { response: { status: 200, data: body } })
}

/**
 * 解「正式提交」的响应。
 *
 * 【重复提交要当成功】规范 §十二：后端可能回 code:0 + msg「该草稿已经提交」，
 * 但 data 里带着 report_id。这必须按提交成功处理，**不能重新创建报名**。
 * 因此判据是「data 里有没有 report_id」，不是 msg 文案。
 */
export function unwrapSubmit(res) {
  const body = res && res.data ? res.data : {}
  const d = body.data || {}
  const alreadyReported = body.code === 'DRAFT_ALREADY_SUBMITTED' || d.draft_state === 1
  if (body.code === 0 || alreadyReported) {
    if (d.report_id == null) {
      throw Object.assign(new Error(body.msg || '提交未返回报名 ID'), {
        response: { status: 200, data: { ...body, msg: body.msg || '提交未返回报名 ID' } }
      })
    }
    return asSubmitted(d)
  }
  throw Object.assign(new Error(body.msg || '提交失败'), { response: { status: 200, data: body } })
}

export default reportDraftApi
