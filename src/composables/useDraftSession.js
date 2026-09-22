/**
 * 报名暂存会话 —— 一份草稿的完整生命周期
 *
 * 负责规范里的这几件事，页面只消费状态、不自己管：
 *   · 首次创建 / 后续更新（§六、§七）
 *   · version 乐观锁：每次成功后立刻用返回值覆盖本地（§二十）
 *   · **保存请求串行**：同一个 draft_id 同时只允许一个请求在飞（§十九）
 *   · 409 版本冲突：停止自动暂存、不覆盖服务器、等用户重新加载（§二十一）
 *   · 自动暂存：没有变化不发；失败不算"已暂存"（§二十二）
 *   · 正式提交：强制最后一次暂存 → 用最新 version 提交 → 停表 → 清队列（§十）
 *   · 驳回后进入修改：edit-draft 换出草稿（§十三）
 *
 * ===========================================================================
 * 【串行是怎么保证的：一条 Promise 链，而不是一个布尔锁】
 * ===========================================================================
 * 用 `if (isSaving) return` 这种布尔锁只能**丢弃**并发请求，被丢的那次修改就永远
 * 没被保存（自动暂存 45 秒后才补，用户此时可能已经点了提交）。规范 §十九 要的是
 * 「排队」不是「丢弃」，所以这里用一条链把所有保存串起来：
 *
 *     调用方 ──enqueue(task)──→ chain = chain.then(task)
 *
 * · 任务按调用顺序依次执行，天然满足「同一 draft_id 同时最多一个在飞」；
 * · 链本身被吞掉异常（chain 永不 reject），单个任务失败不会卡死后续任务；
 * · 每次 enqueue 返回**该任务自己的** promise，调用方仍能 await 到结果或错误。
 *
 * 自动暂存 / 手动暂存 / 提交前最后一次暂存**全部**走 enqueue，所以三者之间
 * 也不可能并发。
 */

import { reactive, computed, nextTick } from 'vue'
import {
  reportDraftApi,
  normalizeDraftError,
  unwrapSave,
  unwrapSubmit,
  DRAFT_ERR
} from '@/api/reportDraft'
import { buildDraftPayload, restoreDraftPayload, payloadSignature } from '@/services/draftPayload'

/** 自动暂存间隔。规范 §二十二 建议 30～60 秒 */
const AUTO_SAVE_INTERVAL_MS = 45000

/** 状态文案（规范 §二十二 建议的集合，逐条对应） */
const TEXT = {
  idle: '未保存',
  saving: '正在暂存……',
  saved: '已暂存',
  failed: '暂存失败，请重试',
  conflict: '草稿已在其他页面修改',
  submitting: '正在提交……',
  submitted: '已正式提交'
}

function clock(date = new Date()) {
  const p = (n) => String(n).padStart(2, '0')
  return `${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}`
}

/**
 * 这份 payload 有没有"用户在意的内容"。
 *
 * 【为什么需要它】自动暂存是定时器触发的。若不加判断，用户只是**打开**了报名页、
 * 什么都没填，定时器就会创建一条空草稿；之后每次进页面都会弹「你有未完成的草稿」。
 * 所以自动暂存只在有实质内容时才触发。
 *
 * 注意：group / establishment 有默认值（如学校端新增页预置「大学组/管乐团」），
 * 它们**不算**实质内容——否则光打开页面就能建草稿。手动点「暂存」不受此限制
 * （那是用户的明确意图）。
 */
export function isMeaningfulPayload(p) {
  if (!p) return false
  if (p.choir_name || p.name || p.contact_name || p.contact_phone) return true
  if (p.file || p.spectrum) return true
  if (Array.isArray(p.person) && p.person.some((x) => x && (x.name || x.card))) return true
  return false
}

/**
 * @param {object} opts
 * @param {'school'|'city'} opts.scope        —— 只决定 URL 前缀（§二十八），不放请求体
 * @param {() => object} opts.getForm         —— 取当前表单（用于 buildDraftPayload）
 * @param {() => {fileList:Array, fileList1:Array}} opts.getFiles
 * @param {(restored) => void} opts.applyRestored —— 把 {form,fileList,fileList1} 写回页面
 * @param {(data) => void} opts.onSubmitted   —— 提交成功回调（跳转等）
 * @param {boolean} [opts.autoSave]           —— 是否启用自动暂存
 */
export function useDraftSession({
  scope,
  getForm,
  getFiles,
  applyRestored,
  onSubmitted,
  onFatal,
  autoSave = true
}) {
  const state = reactive({
    draftId: null,
    reportId: null,
    draftVersion: null,
    draftState: null,

    isDirty: false,
    isSaving: false,
    isSubmitting: false,
    hasVersionConflict: false,

    lastSavedAt: null,
    saveError: null,
    submitted: false
  })

  /** 上一次成功保存时的 payload 签名 —— 自动暂存「没有变化就不发」的判据 */
  let lastSignature = null
  /** 自动暂存定时器 */
  let timer = null
  /** 串行链（见文件头）。永不 reject。 */
  let chain = Promise.resolve()

  /* ------------------------- payload ------------------------- */

  function currentPayload() {
    const files = (getFiles && getFiles()) || {}
    return buildDraftPayload({
      form: getForm(),
      fileList: files.fileList,
      fileList1: files.fileList1
    })
  }

  /* ------------------------- 串行队列 ------------------------- */

  function enqueue(task) {
    const run = chain.then(task, task)
    // 链吞掉异常：单个任务失败不能卡死后面的保存
    chain = run.then(
      () => {},
      () => {}
    )
    return run
  }

  /* ------------------------- 保存 ------------------------- */

  function adoptSaveResult(d, signature) {
    // §七 / §二十：每次成功后必须立刻更新 version，禁止继续用旧值
    if (d.draftId) state.draftId = d.draftId
    if (d.reportId) state.reportId = d.reportId
    if (d.version !== undefined && d.version !== null) state.draftVersion = d.version
    if (d.state !== undefined && d.state !== null) state.draftState = d.state
    if (signature !== undefined) lastSignature = signature
    state.lastSavedAt = clock()
    state.saveError = null
    state.isDirty = false
  }

  /**
   * 执行一次保存。
   * @param {{force?: boolean}} [opt] force=true 时即使没有变化也发（正式提交前用，§十）
   */
  async function saveOnce(opt = {}) {
    if (state.hasVersionConflict) {
      // §二十一：冲突未解决前禁止继续保存，绝不覆盖服务器
      return { skipped: true, reason: 'conflict' }
    }
    if (state.submitted) return { skipped: true, reason: 'submitted' }

    const payload = currentPayload()
    const signature = payloadSignature(payload)

    // §二十二：没有变化 → 不发送（force 除外）
    if (!opt.force && state.draftId && signature !== null && signature === lastSignature) {
      return { skipped: true, reason: 'unchanged' }
    }

    state.isSaving = true
    state.saveError = null
    try {
      // §六：首次创建。成功后必须记住 draft_id，**后续一律不再调创建接口**。
      const res = state.draftId
        ? await reportDraftApi.update(scope, state.draftId, state.draftVersion, payload)
        : await reportDraftApi.create(scope, payload)

      const d = unwrapSave(res)
      adoptSaveResult(d, signature)
      return { ok: true, ...d }
    } catch (err) {
      const e = normalizeDraftError(err)
      state.saveError = e.msg

      if (e.kind === DRAFT_ERR.CONFLICT) {
        // §二十一：停止自动暂存、禁止继续覆盖、等用户处理
        state.hasVersionConflict = true
        stopAutoSave()
      } else if (e.kind === DRAFT_ERR.NOT_FOUND) {
        // §二十六 DRAFT_NOT_FOUND：停止自动暂存，提示用户重新进入
        stopAutoSave()
        if (onFatal) onFatal(e)
      }
      throw e
    } finally {
      state.isSaving = false
    }
  }

  /**
   * 排队保存。手动暂存 / 自动暂存 / 提交前最后一次暂存全部走这里，保证串行。
   */
  function save(opt = {}) {
    return enqueue(() => saveOnce(opt))
  }

  /* ------------------------- 自动暂存 ------------------------- */

  function autoTick() {
    if (state.hasVersionConflict || state.submitted || state.isSubmitting) return
    if (!state.draftId) {
      // 还没建草稿：只有出现实质内容才建，避免"打开页面就产生空草稿"
      if (!isMeaningfulPayload(currentPayload())) return
    }
    const payload = currentPayload()
    if (payloadSignature(payload) === lastSignature) return // 没有变化不发

    // 自动暂存的失败已经在 saveOnce 里记进 state.saveError，这里吞掉即可
    save().catch(() => {})
  }

  function startAutoSave() {
    stopAutoSave()
    if (!autoSave) return
    timer = setInterval(autoTick, AUTO_SAVE_INTERVAL_MS)
  }

  function stopAutoSave() {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  /** 提交成功/致命错误后：清空待发送队列（§十 步骤 11） */
  function clearPendingQueue() {
    chain = Promise.resolve()
  }

  /* ------------------------- 读取 / 恢复 ------------------------- */

  function adoptDraftMeta(d) {
    state.draftId = d.draft_id != null ? String(d.draft_id) : null
    state.reportId = d.report_id != null ? String(d.report_id) : null
    if (d.version !== undefined && d.version !== null) state.draftVersion = d.version
    if (d.state !== undefined && d.state !== null) state.draftState = d.state
  }

  /**
   * 按草稿详情恢复页面（§八 / §二十三）。
   * 必须恢复**完整 payload**，并同步 draftId / reportId / version / state。
   */
  async function loadDraft(draftId) {
    const res = await reportDraftApi.getById(scope, draftId)
    const body = res.data || {}
    if (body.code !== 0) {
      const e = normalizeDraftError({ response: { status: 200, data: body } })
      throw e
    }
    const d = body.data || {}
    adoptDraftMeta(d)

    const restored = restoreDraftPayload(d.payload, getForm())
    applyRestored(restored)
    await nextTick()

    // 恢复完立刻对齐签名：让"用户没再改动"就等于"与草稿一致"，
    // 否则下一次自动暂存会立刻多发一次内容完全相同的请求。
    lastSignature = payloadSignature(currentPayload())
    state.isDirty = false
    state.lastSavedAt = d.updated_at ? clock(new Date(d.updated_at)) : null
    return d
  }

  /** 编辑中的草稿摘要列表（§九） */
  async function listDrafts() {
    const res = await reportDraftApi.getList(scope)
    const body = res.data || {}
    if (body.code !== 0) return []
    return Array.isArray(body.data) ? body.data : []
  }

  /**
   * 驳回后进入修改（§十三）。
   * 调 edit-draft 换出草稿，恢复 payload，之后所有保存都针对 draft_id，
   * **不再直接改正式 Report**。report_id 保持原值，重提时不会新建报名（§十四）。
   */
  async function enterEditFromRejected(reportId) {
    const res = await reportDraftApi.editRejected(scope, reportId)
    const body = res.data || {}
    if (body.code !== 0) {
      throw normalizeDraftError({ response: { status: 200, data: body } })
    }
    const d = body.data || {}
    adoptDraftMeta(d)

    const restored = restoreDraftPayload(d.payload, getForm())
    applyRestored(restored)
    await nextTick()

    lastSignature = payloadSignature(currentPayload())
    state.isDirty = false
    state.lastSavedAt = d.updated_at ? clock(new Date(d.updated_at)) : null
    return d
  }

  /* ------------------------- 正式提交（§十） ------------------------- */

  /**
   * 正式提交。严格按 §十 的 12 步：
   *   1-3 页面负责禁用交互（isSubmitting 已经置位，页面据此收口）
   *   4   取当前完整表单 payload（saveOnce 内部做）
   *   5-7 强制最后一次暂存，拿到最新 version
   *   8   用最新 version 提交
   *   9-12 停表、清队列、回调跳转
   */
  async function submit() {
    if (state.isSubmitting || state.isSaving) return null
    if (state.hasVersionConflict) {
      // 冲突未解决不允许提交，否则会把旧内容固化进正式报名
      throw Object.assign(new Error(TEXT.conflict), { kind: DRAFT_ERR.CONFLICT })
    }

    state.isSubmitting = true
    stopAutoSave() // 提交期间不再有自动暂存插进来
    try {
      // 最后一次暂存**强制发送**（§十：不能跳过最后一次暂存）。
      // 即使签名没变也发，保证提交所依据的草稿就是用户此刻看到的内容。
      const saved = await save({ force: true })
      if (!saved || !saved.ok || !state.draftId) {
        throw Object.assign(new Error(state.saveError || '暂存失败，无法提交'), {
          kind: DRAFT_ERR.HTTP
        })
      }

      // 用**刚拿到的** version 提交（§十 步骤 8）
      const res = await reportDraftApi.submit(scope, state.draftId, state.draftVersion)
      const d = unwrapSubmit(res)

      state.draftState = 1
      // §十一：后续正式业务一律用 report_id，绝不把 draft_id 当正式报名 ID
      state.reportId = d.reportId
      state.submitted = true
      clearPendingQueue()

      if (onSubmitted) onSubmitted(d)
      return d
    } catch (err) {
      // 提交路径的失败要恢复自动暂存，否则用户改完也没人保存了
      const e = err && err.kind ? err : normalizeDraftError(err)
      if (e.kind !== DRAFT_ERR.CONFLICT) startAutoSave()
      throw e
    } finally {
      state.isSubmitting = false
    }
  }

  /* ------------------------- 冲突恢复（§二十一） ------------------------- */

  /**
   * 用户确认后重新加载服务器草稿。
   * 【只做这一条路】规范明令禁止「自动用本地旧数据覆盖服务器」，也禁止
   * 「自动把 version 改成 server_version 再强存」——所以这里没有别的入口。
   */
  async function reloadFromServer() {
    if (!state.draftId) return null
    const d = await loadDraft(state.draftId)
    state.hasVersionConflict = false
    startAutoSave()
    return d
  }

  /* ------------------------- 展示 ------------------------- */

  const statusText = computed(() => {
    if (state.submitted) return TEXT.submitted
    if (state.isSubmitting) return TEXT.submitting
    if (state.hasVersionConflict) return TEXT.conflict
    if (state.isSaving) return TEXT.saving
    if (state.saveError) return TEXT.failed
    if (state.lastSavedAt) return `${TEXT.saved} ${state.lastSavedAt}`
    return TEXT.idle
  })

  /** 给 UI 决定用哪一档样式（normal / success / warning / danger） */
  const statusLevel = computed(() => {
    if (state.submitted) return 'success'
    if (state.hasVersionConflict || state.saveError) return 'danger'
    if (state.isSaving || state.isSubmitting) return 'warning'
    if (state.lastSavedAt) return 'success'
    return 'info'
  })

  /** 页面用它把表单改动标记为脏（§二十二：没有变化不发） */
  function markDirty() {
    if (state.submitted) return
    state.isDirty = payloadSignature(currentPayload()) !== lastSignature
  }

  return {
    state,
    statusText,
    statusLevel,
    isMeaningfulPayload,
    currentPayload,
    save,
    submit,
    startAutoSave,
    stopAutoSave,
    loadDraft,
    listDrafts,
    enterEditFromRejected,
    reloadFromServer,
    markDirty,
    TEXT,
    DRAFT_ERR
  }
}
