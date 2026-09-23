/**
 * 报名暂存会话 —— 一份草稿的完整生命周期
 *
 * 负责规范里的这几件事，页面只消费状态、不自己管：
 *   · 首次创建 / 后续更新（§六、§七）
 *   · version 乐观锁：每次成功后立刻用返回值覆盖本地（§二十）
 *   · **保存请求串行**：同一个 draft_id 同时只允许一个请求在飞（§十九）
 *   · 409 版本冲突：不覆盖服务器、等用户重新加载（§二十一）
 *   · **没有变化不发**：手动暂存重复点不会白发请求（§二十二）
 *   · 正式提交：强制最后一次暂存 → 用最新 version 提交 → 清队列（§十）
 *   · 驳回后进入修改：edit-draft 换出草稿（§十三）
 *
 * ===========================================================================
 * 【本模块没有定时器 —— 暂存只由用户点击（或提交）触发】
 * ===========================================================================
 * 原先这里挂过一个 45 秒的 setInterval 做「自动暂存」。**已按产品要求整体删除**：
 * 用户没有点「暂存」，就不该有任何内容离开浏览器。
 *
 * 删除的连带影响，改动时别重新引入：
 *   · 唯一会**自动**发保存请求的入口没有了。现在只有两条路会走到 saveOnce：
 *     用户点「暂存」（页面 → save()），和提交前的 `save({force:true})`（§十）。
 *   · 因此也删掉了配套的 `isMeaningfulPayload` 空表单守卫 —— 它本来只在
 *     「定时器到点、但用户什么都没填」这一种情况下有用。手动点击是用户的明确
 *     意图，本来就不受它约束。
 *   · 页面的「本地镜像」（写 localStorage）**不在本模块**：它从不联网，所以不属于
 *     「自动暂存」这件事，本模块管不着。但它同样已经**没有定时器了** ——
 *     OrchestraForm / ProgramForm 里那支 dist 的 60 秒 setInterval 一并删除，
 *     现在只剩关页/切走时落盘（只有 OrchestraForm 有，见其 flushLocalCache）。
 *
 * ===========================================================================
 * 【串行是怎么保证的：一条 Promise 链，而不是一个布尔锁】
 * ===========================================================================
 * 用 `if (isSaving) return` 这种布尔锁只能**丢弃**并发请求，被丢的那次修改就永远
 * 没被保存（用户此时可能已经点了提交）。规范 §十九 要的是「排队」不是「丢弃」，
 * 所以这里用一条链把所有保存串起来：
 *
 *     调用方 ──enqueue(task)──→ chain = chain.then(task)
 *
 * · 任务按调用顺序依次执行，天然满足「同一 draft_id 同时最多一个在飞」；
 * · 链本身被吞掉异常（chain 永不 reject），单个任务失败不会卡死后续任务；
 * · 每次 enqueue 返回**该任务自己的** promise，调用方仍能 await 到结果或错误。
 *
 * 手动暂存 / 提交前最后一次暂存**全部**走 enqueue，所以两者之间也不可能并发。
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
 * @param {object} opts
 * @param {'school'|'city'} opts.scope        —— 只决定 URL 前缀（§二十八），不放请求体
 * @param {() => object} opts.getForm         —— 取当前表单（用于 buildDraftPayload）
 * @param {() => {fileList:Array, fileList1:Array}} opts.getFiles
 * @param {(restored) => void} opts.applyRestored —— 把 {form,fileList,fileList1} 写回页面
 * @param {(data) => void} opts.onSubmitted   —— 提交成功回调（跳转等）
 * @param {{load:Function,save:Function,clear:Function}} [opts.sessionStore]
 *        —— 草稿指针的落脚点，见下方长注释；不传则退化为「窗口期内存活」
 */

/*
 * ===========================================================================
 * 【sessionStore：为什么草稿身份不能只活在这个 composable 里】
 * ===========================================================================
 * draftId / draftVersion / lastSavedAt 都是 **reactive state，每个调用方一份**。
 * 而 useDraftSession 的调用方是 OrchestraForm.vue，路由一切换它就被卸载 ——
 * 于是「填着填着切到报名汇总看一眼，再切回来」会得到一份全新的 state：
 * draftId 为 null，界面从「已暂存」掉回「未保存」。内容其实一直在服务器上，
 * 只是没人记得它的门牌号。同理，刷新页面也一样。
 *
 * 解法是把**指针**存到组件之外：
 *
 *     sessionStore  ← 存取 { draftId, reportId, version, state }
 *
 * 【只存指针，绝不存内容】指针里没有表单内容，只有一个门牌号。真正的内容在
 * 重挂载时由 resumeSession() 回服务器拉（§八：草稿详情是权威版本）。
 * 为什么不顺手把内容也存进 localStorage？因为页面**已经有一份**表单缓存了
 * （OrchestraForm 的 tempSave，每 60 秒一次），再存一份只会多一个可能不一致的来源。
 * 而既有的那份什么时候更新、要不要让服务端内容盖上来，见 resumeSession 的
 * restoreContent —— 那是「不弄丢用户刚敲的字」这条底线所在，改动前务必先读。
 *
 * 【失效了要能干净退出】指针指向的草稿可能已被删除、或已提交转正。
 * resumeSession 遇到这两种情况会清掉指针并返回 false，交回调用方走老路；
 * 网络类失败则**保留**指针（下次进来还能再试），同样返回 false 不粘住页面。
 */

export function useDraftSession({
  scope,
  getForm,
  getFiles,
  applyRestored,
  onSubmitted,
  onFatal,
  sessionStore = null
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

  /** 上一次成功保存时的 payload 签名 —— 「没有变化就不发」的判据 */
  let lastSignature = null
  /** 串行链（见文件头）。永不 reject。 */
  let chain = Promise.resolve()

  /* ------------------------- 草稿指针 ------------------------- */

  /**
   * 指针的内容。**只有身份，没有内容**（理由见文件头）。
   * 存的是 draftVersion/draftState 的当前值，用于 PUT 时的乐观锁 ——
   * 不存的话重挂载后第一次保存会带 version=null 而被后端判成冲突。
   */
  function persistSession() {
    if (!sessionStore || !state.draftId) return
    try {
      sessionStore.save({
        draftId: state.draftId,
        reportId: state.reportId,
        version: state.draftVersion,
        state: state.draftState
      })
    } catch (e) {
      // 存不进去（隐私模式 / 配额满）不该影响暂存本身，静默降级成"窗口期内有效"
    }
  }

  function clearSession() {
    if (!sessionStore) return
    try {
      sessionStore.clear()
    } catch (e) {
      /* 同上 */
    }
  }

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
    persistSession()
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
        // §二十一：禁止继续覆盖，等用户处理
        state.hasVersionConflict = true
      } else if (e.kind === DRAFT_ERR.NOT_FOUND) {
        /*
         * §二十六 DRAFT_NOT_FOUND：提示用户重新进入。
         *
         * 【必须把身份一起清掉】原先只清 draftId，指针没清，于是这个页面会话里：
         *   · 「暂存」按钮照常可点，点一次 404 一次；
         *   · localStorage 里的指针也原封不动，下次进来还会再去拉一次不存在的草稿。
         * resumeSession 的同类分支就会清，这里是一处遗漏。
         *
         * 清掉之后 saveOnce 会走 POST 重新建草稿 —— 这正是"草稿没了但用户还在填"
         * 时该做的事，比拿着一个死 ID 反复撞 404 好。
         */
        state.draftId = null
        state.reportId = null
        state.draftVersion = null
        clearSession()
        if (onFatal) onFatal(e)
      }
      throw e
    } finally {
      state.isSaving = false
    }
  }

  /**
   * 排队保存。手动暂存 / 提交前最后一次暂存全部走这里，保证串行。
   */
  function save(opt = {}) {
    return enqueue(() => saveOnce(opt))
  }

  /** 提交成功后：清空待发送队列（§十 步骤 11） */
  function clearPendingQueue() {
    chain = Promise.resolve()
  }

  /* ------------------------- 读取 / 恢复 ------------------------- */

  function adoptDraftMeta(d) {
    state.draftId = d.draft_id != null ? String(d.draft_id) : null
    state.reportId = d.report_id != null ? String(d.report_id) : null
    if (d.version !== undefined && d.version !== null) state.draftVersion = d.version
    if (d.state !== undefined && d.state !== null) state.draftState = d.state
    persistSession()
  }

  /**
   * 按草稿详情恢复页面（§八 / §二十三）。
   * 必须恢复**完整 payload**，并同步 draftId / reportId / version / state。
   */
  async function loadDraft(draftId, { restoreContent = true } = {}) {
    const res = await reportDraftApi.getById(scope, draftId)
    const body = res.data || {}
    if (body.code !== 0) {
      const e = normalizeDraftError({ response: { status: 200, data: body } })
      throw e
    }
    const d = body.data || {}
    adoptDraftMeta(d)

    /*
     * 【已提交的草稿绝不回填内容】
     *
     * state=1 表示这份草稿已经转成正式报名了，它已经不是"填写中的草稿"。
     * 原先先恢复内容、再由 resumeSession 判断 state，于是用户会看到：
     * 表单被填上一份他已经提交过的内容、状态却显示「未保存」；
     * 一保存就撞 409（后端不许改已提交草稿），点「重新加载」又回到这里，
     * 内容再填一遍、冲突解除、状态显示「已暂存」——**而服务器上什么都没存**。
     *
     * 放在这里拦是因为 loadDraft 是"把内容写进表单"的唯一入口：
     * reloadFromServer 也走它，只堵 resumeSession 是堵不住的。
     */
    if (state.draftState === 1) return d

    if (restoreContent) {
      const restored = restoreDraftPayload(d.payload, getForm())
      applyRestored(restored)
      await nextTick()

      // 恢复完立刻对齐签名：让"用户没再改动"就等于"与草稿一致"，
      // 否则用户点一次「暂存」会被判成"没有变化"而不发请求。
      lastSignature = payloadSignature(currentPayload())
      state.isDirty = false
    } else {
      /*
       * 【内容留在本地 —— 这个分支是为了不丢用户刚敲的字】
       *
       * 页面每 60 秒把当前表单写进 localStorage（本模块**不联网**，只是本地镜像）。
       * 它与服务端草稿是**同一份表单在不同时刻的快照**：用户敲完最后几个字就切走的话，
       * 本地那份可能比服务端新，而服务端那份可能比本地新。谁新谁旧这里判不出来。
       *
       * 那就按「不丢字」优先：内容用本地（== 用户最后看到的），只借服务端的
       * 身份与 version —— version 是真要借的，否则用户点「暂存」时会带着
       * version=null 去 PUT 而被后端判成冲突。
       *
       * 【签名置空 ≠ 会自动推上去】删掉自动暂存之前，`lastSignature = null` 会让
       * 下一个定时器周期把本地这份主动推上服务端。**现在没有定时器了**：本地内容
       * 要落到服务端，只能等用户点「暂存」或提交时的强制暂存。`lastSignature = null`
       * 在这里只剩一个作用：保证用户点「暂存」时不会因为"签名没变"被跳过。
       */
      lastSignature = null
      state.isDirty = true
    }

    /*
     * 【restoreContent=false 时不能写 lastSavedAt】
     *
     * lastSavedAt 是 statusText 判「已暂存」的唯一依据。而 restoreContent=false 走的
     * 正是"内容留在本地、还没上服务端"这一支 —— 此时把服务端的 updated_at 写进去，
     * 界面立刻显示「已暂存」，用户以为存住了，实际服务端根本没有这份内容，
     * 得等他自己点「暂存」才上去。这中间关掉页面，内容就只剩 localStorage 一份。
     *
     * 等下一次真正保存成功时由 adoptSaveResult 写，那才是"已暂存"成立的那一刻。
     */
    if (restoreContent) {
      state.lastSavedAt = d.updated_at ? clock(new Date(d.updated_at)) : null
    }
    return d
  }

  /**
   * 重挂载时认领上一次留下的草稿（§八 / §二十三）。
   *
   * 【要解决的是这个症状】填着填着切到报名汇总再切回来，刚才还显示「已暂存」，
   * 回来变成「未保存」—— 内容一直在服务器上，只是新实例不记得门牌号。
   * 顺带修掉一个更隐蔽的后果：draftId 丢了之后用户点「暂存」会走 **POST 创建**，
   * 靠后端 create_or_get_draft 的幂等兜底才没有产生第二条草稿。
   *
   * @param {{restoreContent?: boolean}} [opt]
   *        restoreContent=true（默认）：内容也以服务端草稿为准（§八 它是权威版本）。
   *        restoreContent=false：页面本地缓存里握着用户**最后看到的**内容，
   *        不能被一份可能更旧的草稿盖掉 —— 只借身份与 version，内容留在本地。
   *        判据是「本地有没有缓存」，由调用方掌握（composable 看不到 localStorage）。
   * @returns {Promise<boolean>} 是否认领成功。失败一律**不抛**，交回调用方走老路。
   */
  async function resumeSession({ restoreContent = true } = {}) {
    if (!sessionStore) return false

    let saved = null
    try {
      saved = sessionStore.load()
    } catch (e) {
      saved = null
    }
    const draftId = saved && saved.draftId != null ? String(saved.draftId) : null
    if (!draftId) return false

    try {
      const d = await loadDraft(draftId, { restoreContent })

      /*
       * 已提交的草稿不能再当"填写中的草稿"用：它已经转成正式报名了。
       * 留着指针会让下次进来又去拉一份改不动的草稿，且一保存就撞 409。
       *
       * 【内存里的身份也要清】原先只 clearSession() 清 localStorage，state.draftId /
       * draftVersion 仍指着那份已提交的草稿 —— 返回 false 之后页面继续按"没有草稿"
       * 走，可只要用户点一次「暂存」，saveOnce 就会拿这个 ID 去 PUT，撞 409。
       * （内容回填那半边已经在 loadDraft 里堵住，这里补齐身份这半边。）
       */
      if (state.draftState === 1) {
        clearSession()
        state.draftId = null
        state.reportId = null
        state.draftVersion = null
        return false
      }
      return true
    } catch (err) {
      const e = normalizeDraftError(err)

      /*
       * 失效的指针要清掉（NOT_FOUND / 已提交 / 冲突 / payload 不合法），
       * 否则每次进页面都要为它白发一次请求。
       * 只有**这一次没读到**的三种情况例外，指针留着下次再试：断网、服务端出错、
       * 登录态过期 —— 这三种里用户没做错任何事，草稿大概率还在。
       */
      const transient =
        e.kind === DRAFT_ERR.NETWORK || e.kind === DRAFT_ERR.HTTP || e.kind === DRAFT_ERR.AUTH
      if (!transient) clearSession()

      // 内存里一律不留半吊子身份，否则 saveOnce 会拿着一个读不到的 draftId 去 PUT
      state.draftId = null
      state.reportId = null
      state.draftVersion = null
      return false
    }
  }

  /**
   * 编辑中的草稿摘要列表（§九）
   *
   * 【两种信封都要认 —— 这里曾经恒返回 []】
   * 后端 apps/api/views.py 的 _draft_list 返回的是
   *     success("获取成功", { "data": [...], "count": N })
   * 而 success() 自己还会再套一层 {"code":0,"msg":...,"data":<上面那个>}，
   * 于是真正的数组在 `body.data.data`，**套了两层**。
   * 原先只认 `Array.isArray(body.data)`，恒为 false ⇒ 这个函数永远返回空数组
   * ⇒ OrchestraForm.detectExistingDraft 里 `drafts.length === 0` 恒成立
   * ⇒ 「检测到您有一份未提交的草稿，是否继续填写？」**永远不会弹**。
   * 那不只是少了个提示：它正好拆掉了「草稿被新增页劫持」那条路上唯一的提醒。
   *
   * 平铺（规范 §九 的写法）和套两层（后端现状）都接受，后端将来改哪一边都不会再断。
   */
  async function listDrafts() {
    const res = await reportDraftApi.getList(scope)
    const body = res.data || {}
    if (body.code !== 0) return []
    const d = body.data
    if (Array.isArray(d)) return d
    if (d && Array.isArray(d.data)) return d.data
    return []
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
   *   9-12 清队列、回调跳转
   */
  async function submit() {
    /*
     * 【为什么不再拦 isSaving —— 那是一个静默的失败】
     *
     * 原先这里是 `if (state.isSubmitting || state.isSaving) return null`。
     * isSaving 是"某次保存正在飞"的标记，而提交按钮只按 isSubmitting 禁用
     * （模板 :disabled 里没有 isSaving）。于是用户在一次「暂存」PUT 正在飞时点
     * 「立即报名」→ 校验通过 → 确认框确认 → submitDraft() 返回 null →
     * 调用方 OrchestraForm 只处理 thrown error ⇒ **页面毫无反应**：不报错、不成功、不跳转。
     *
     * 而这道拦截本来就是多余的：上面那条串行链保证提交前的 save({force:true})
     * 会**排在**在飞的那次保存之后执行，且 saveOnce 是在任务真正执行时才读
     * state.draftVersion，所以拿到的仍是最新 version。让提交照常入队才是对的。
     *
     * isSubmitting 保留：它是真正的重复提交防护，且此时 UI 已在显示「正在提交……」，
     * 双击时静默是合理的。
     */
    if (state.isSubmitting) return null
    if (state.hasVersionConflict) {
      // 冲突未解决不允许提交，否则会把旧内容固化进正式报名
      throw Object.assign(new Error(TEXT.conflict), { kind: DRAFT_ERR.CONFLICT })
    }

    state.isSubmitting = true
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
      // 草稿已转正式报名，指针使命结束。留着它下次进来会去拉一份不可编辑的草稿。
      clearSession()

      if (onSubmitted) onSubmitted(d)
      return d
    } catch (err) {
      // 提交失败不改任何状态：用户留在页面上，可以继续改、继续点「暂存」或再提交
      throw err && err.kind ? err : normalizeDraftError(err)
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

    /*
     * 【服务器上那份已经提交了 —— 这不是"别处改的更新版本"】
     *
     * 409 的唯一出路是"重新加载服务器草稿"，但如果服务器上那份草稿已经是 state=1
     * （用户开着的另一个标签页已经提交过），重新加载拿回来的是一份**改不动**的草稿。
     * 此时若照常解除冲突，界面会显示「已暂存」，而服务器上什么都没存；
     * 下一次保存必然再撞 409 —— 用户就卡在这个循环里出不来。
     *
     * 正确收口是把它当"已提交"处理：置 submitted（状态文案随之变成「已正式提交」）、
     * 清掉指针，并明确告诉用户为什么。
     */
    if (state.draftState === 1) {
      state.submitted = true
      state.hasVersionConflict = false
      clearSession()
      throw Object.assign(new Error('该草稿已在其他页面提交，不能再修改'), {
        kind: DRAFT_ERR.ALREADY_SUBMITTED
      })
    }

    state.hasVersionConflict = false
    return d
  }

  /* ------------------------- 展示 ------------------------- */

  const statusText = computed(() => {
    if (state.submitted) return TEXT.submitted
    if (state.isSubmitting) return TEXT.submitting
    if (state.hasVersionConflict) return TEXT.conflict
    if (state.isSaving) return TEXT.saving
    if (state.saveError) return TEXT.failed
    // 只报「已暂存」，不带时刻 —— 用户要的是「存住了没有」，时分秒既没用又占地方。
    // 因而 lastSavedAt 现在只是个**「有没有保存过」的标记**（statusLevel 也用它），
    // 时间戳本身保留着仅为排查时能对得上。
    if (state.lastSavedAt) return TEXT.saved
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

  /** 页面用它把表单改动标记为脏（仅用于 UI 显示，不触发任何保存） */
  function markDirty() {
    if (state.submitted) return
    state.isDirty = payloadSignature(currentPayload()) !== lastSignature
  }

  return {
    state,
    statusText,
    statusLevel,
    currentPayload,
    save,
    submit,
    loadDraft,
    resumeSession,
    listDrafts,
    enterEditFromRejected,
    reloadFromServer,
    markDirty,
    TEXT,
    DRAFT_ERR
  }
}
