/**
 * 横向拖拽滚动（按住表格空白处左右拖动）
 *
 * 【要解决的问题】
 * 参展人员表 12 列，网格下限合计 1376px；1366 / 1440 的笔记本和 1600 / 1680 的显示器
 * 都放不下，只能靠 .box 的 overflow-x 滚动条。而横向滚动条在 Windows 上只有十几像素高、
 * 又贴在表格最下方 —— 用户得先翻到页面底部才能拉到它，非常难用。
 * 甲方要求：按住表格空白处直接拖。
 *
 * 【为什么不用 CSS 或原生能力】
 *   · `overflow-x: auto` 的鼠标滚轮只吃纵向，除非按着 Shift —— 不是自然操作；
 *   · HTML5 drag&drop 会带上拖拽影子、与 el-input 的原生拖选冲突，且拖到一半
 *     浏览器会开始「拖文件」；这里要的是「把容器当成一张纸平移」，用 pointer 事件最直接。
 *
 * 【交互口径（与甲方确认过）】
 *   · 只对鼠标生效（pointerType === 'mouse'）。触屏和触控板本来就能双指横滑，
 *     再接管反而会打断原生惯性滚动。
 *   · 落点必须**不是**输入框/下拉框/按钮/链接 —— 落在控件上说明用户想操作它，不是想拖动。
 *     所以「按哪能拖」= 表头行、序号列、操作列的文字、以及每个格子 5px 的内边距。
 *   · 移动超过 threshold 像素才算拖动。低于阈值一律当点击放行，避免手一抖就误滚。
 *   · 首次移动若是纵向为主，直接放弃本次拖动 —— 不能把用户的下拉手势翻译成横滚。
 *   · 真正拖动过之后，浏览器补发的那个 click 会被吃掉（否则从一个格子拖到另一个格子，
 *     落点上的按钮会被误点）。
 *
 * 【拖动中为什么用 `起点 + 位移` 而不是累加】
 *   scrollLeft 在到达边界后会被浏览器钳住。若按「每帧加 dx」写，拖到最右再往回拖，
 *   必须先把「多拖出去的那段虚位移」补完才会开始移动，手感像卡住。
 *   用 `startScrollLeft - (clientX - startX)` 就天然没有这个问题：越界那部分自动被丢弃。
 */

import { onBeforeUnmount, onMounted, watch } from 'vue'

/** 落在这些元素上时不启动拖动 —— 用户是在操作控件，不是在平移表格 */
const INTERACTIVE_SELECTOR = [
  'input',
  'textarea',
  'select',
  'button',
  'a',
  '[contenteditable]',
  '.el-select',
  '.el-input',
  '.el-textarea',
  '.el-upload',
].join(',')

/**
 * 让一个横向溢出容器支持鼠标拖拽平移。
 *
 * @param {import('vue').Ref<HTMLElement|null>} targetRef 容器（模板上写 ref="boxRef"）。
 *   允许「一开始为 null、稍后才有值」—— 内部会持续监听，元素一出现就自动挂上
 *   （弹窗里的表格要用到这一点，详见下方 onMounted 处的说明）。
 * @param {{ threshold?: number }} [options] threshold 拖动判定阈值，默认 4px
 */
export function useDragScroll(targetRef, options = {}) {
  const threshold = options.threshold ?? 4

  let el = null
  let pointerId = null
  let startX = 0
  let startY = 0
  let startScrollLeft = 0
  /** 'idle' | 'pending'（按下但还没过阈值）| 'dragging' */
  let phase = 'idle'
  /** 本次交互是否真的拖动过；留给捕获阶段的 click 处理器决定要不要吃掉事件 */
  let didDrag = false
  let resizeObserver = null

  function onPointerDown(e) {
    if (phase !== 'idle') return
    if (e.pointerType !== 'mouse') return
    if (e.button !== 0) return
    if (e.target.closest(INTERACTIVE_SELECTOR)) return
    startX = e.clientX
    startY = e.clientY
    startScrollLeft = el.scrollLeft
    pointerId = e.pointerId
    phase = 'pending'
    // 上一次拖动可能结束在容器外、没等到 click 补发，这里一并清掉，
    // 否则这个残留的 true 会吃掉用户接下来的第一次正常点击。
    didDrag = false
  }

  function onPointerMove(e) {
    if (phase === 'idle' || e.pointerId !== pointerId) return

    const dx = e.clientX - startX
    const dy = e.clientY - startY

    if (phase === 'pending') {
      if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return
      // 纵向为主 → 这不是横拖，放弃本次（也让页面正常往下滚）
      if (Math.abs(dy) > Math.abs(dx)) {
        reset()
        return
      }
      phase = 'dragging'
      didDrag = true
      // 指针捕获：拖出容器外也能继续跟手，松手事件也不会丢
      el.setPointerCapture(pointerId)
      el.style.userSelect = 'none'
      el.style.cursor = 'grabbing'
    }

    el.scrollLeft = startScrollLeft - dx
    e.preventDefault()
  }

  function onPointerUp(e) {
    if (phase === 'idle') return
    if (e && e.pointerId !== pointerId) return
    // didDrag 不在这里清 —— 浏览器马上要补发 click，
    // 那是 onDragClickCapture 判断的唯一依据（清在下次 pointerdown）。
    reset()
  }

  function reset() {
    const wasDragging = phase === 'dragging'
    // 必须**先**把 phase 归位再 updateCursor —— updateCursor 见到 'dragging' 会直接
    // return，若顺序反过来，光标就永远停在 grabbing 上回不到 grab。
    phase = 'idle'
    if (wasDragging) {
      try {
        el.releasePointerCapture(pointerId)
      } catch (_) {
        // 指针已经松开时再 release 会抛 NotFoundError，忽略即可
      }
      el.style.userSelect = ''
      updateCursor()
    }
    pointerId = null
  }

  /**
   * 禁掉容器内的一切原生拖拽。
   *
   * 参展人员表有「电子照片」列（<img>，PersonTable.vue:145），图片默认可原生拖拽；
   * 文本也可能被拖成原生选区拖放。这两种一旦触发，浏览器会接管手势并朝我们抛
   * pointercancel，正在进行的平移会硬生生断掉。表里没有任何东西需要原生拖拽，一律禁。
   */
  function onDragStart(e) {
    e.preventDefault()
  }

  /** 拖动结束后浏览器还会在落点上补一个 click，必须吃掉，否则会误点按钮/误跳链接 */
  function onDragClickCapture(e) {
    if (!didDrag) return
    didDrag = false
    e.stopPropagation()
    e.preventDefault()
  }

  /** 没溢出就不该出现抓手光标 —— 否则用户会去拖一个拖不动的东西 */
  function updateCursor() {
    if (!el || phase === 'dragging') return
    el.style.cursor = el.scrollWidth > el.clientWidth ? 'grab' : ''
  }

  /** 把一套事件挂到目标节点上。对同一个节点重复调用是安全的（幂等）。 */
  function attach(node) {
    if (!node) return
    // 目标换成了另一个节点：先把旧节点上的摘干净，别把监听器留在废弃的 DOM 上
    if (el && el !== node) detach()
    if (el === node) return
    el = node
    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerup', onPointerUp)
    el.addEventListener('pointercancel', onPointerUp)
    // 捕获阶段：必须抢在格子里任何业务处理器之前
    el.addEventListener('click', onDragClickCapture, true)
    el.addEventListener('dragstart', onDragStart)
    el.addEventListener('pointerenter', updateCursor)
    // 视口变化会改变溢出与否；增删行只改 scrollWidth 不改容器尺寸，
    // 所以这里配合 pointerenter 一起兜住（够用，不值得再挂 MutationObserver）
    resizeObserver = new ResizeObserver(updateCursor)
    resizeObserver.observe(el)
    updateCursor()
  }

  /** 摘掉事件与观察器。可重复调用；连接状态一并复位。 */
  function detach() {
    // 注意：观察器要在 el 判空**之前**关 —— 否则 el 已经是 null 时这里会提前 return，
    // 把上一轮的 ResizeObserver 漏在后台（原实现在「先返回后 disconnect」的顺序上有此隐患）。
    if (resizeObserver) {
      resizeObserver.disconnect()
      resizeObserver = null
    }
    if (!el) return
    el.removeEventListener('pointerdown', onPointerDown)
    el.removeEventListener('pointermove', onPointerMove)
    el.removeEventListener('pointerup', onPointerUp)
    el.removeEventListener('pointercancel', onPointerUp)
    el.removeEventListener('click', onDragClickCapture, true)
    el.removeEventListener('dragstart', onDragStart)
    el.removeEventListener('pointerenter', updateCursor)
    el = null
    // 拖动中途被摘掉时，把交互状态一起归零，避免下次挂载带着旧的 pointerId / phase
    pointerId = null
    phase = 'idle'
    didDrag = false
  }

  /*
   * 【为什么用 watch，而不是原来的「在 onMounted 里读一次 targetRef.value」】
   *
   * 原写法是 `el = targetRef.value; if (!el) return` —— 只抓一次，抓不到就永久放弃。
   * 对 PersonTable / TeacherTable 完全够用：容器跟着组件一起挂载，
   * 走到 onMounted 时元素必然已经在，一次就能抓到。过去一直没出过问题。
   *
   * 但把它用到「表格装在 el-dialog 里」的场景就会**静默失效**：
   * el-dialog 默认懒渲染（EP use-dialog.mjs 的 rendered ref），不点开弹窗，
   * 表格根本不在 DOM 里。而调用方（ShowPerson）自己的 onMounted 发生在页面初次渲染时，
   * 那一刻只能读到 null → 直接 return → 之后代码看上去毫无问题、控制台一句报错都没有，
   * 就是拖不动。实测（probe）：溢出 732px、光标是 auto（说明压根没挂上）、
   * 拖 120px 后 scrollLeft 仍为 0。
   *
   * 换成 watch + immediate 之后，两种调用方走同一条路径：
   *   · ref 一开始就有值（PersonTable / TeacherTable）—— immediate 立刻回调，
   *     挂载时机与原来**完全一致**，行为不变；
   *   · ref 稍后才有值（弹窗打开后表格才创建）—— 值一变就挂上，不再错过。
   * 调用方因此不必关心「谁先挂载」，也不需要 nextTick / 手动重试。
   */
  onMounted(() => {
    watch(
      () => targetRef.value,
      (node) => {
        if (node) attach(node)
        else detach()
      },
      { immediate: true }
    )
  })

  onBeforeUnmount(detach)
}

export default useDragScroll
