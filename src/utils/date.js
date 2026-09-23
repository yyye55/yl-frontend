/**
 * 时间格式化工具
 *
 * ===========================================================================
 * 【对早期注释的更正：dist 里没有 Date.prototype.Format】
 * ===========================================================================
 * 本文件原先的头注释写「直接照搬 dist/app.js 中的 Date.prototype.Format 实现」，
 * 经复核，这是**不成立的**：
 *   - 全量检索原始 dist 的 app.js 与 67 个业务 chunk，`Date.prototype.X=` 出现 **0 次**；
 *   - dist 里那批格式化方法挂在 **Vue.prototype** 上（app.js 模块 `a7fe` 的
 *     `t.install=function(e){e.prototype.Format=...}`，install 的入参 e 就是 Vue）。
 * 也就是说 `Format / timeFormat / getOperationType / goto` 是「挂在 Vue 实例上、
 * 但内部又用 this.getMonth() 这类 Date 方法」的写法 —— 在 Vue 实例上 this 并非 Date，
 * 属于 dist 自身的坏味道。实测这四个方法在全 dist 的调用次数均为 **0**，是死代码。
 *
 * 下面保留 installDateFormat() 仅为兼容旧调用方（实测本项目已无任何调用），
 * 但不再宣称它来自 dist。真正被大量使用、且必须忠实还原的是下面单独导出的
 * getM / getS。
 */

/**
 * 【可信度：A】dist 原文（app.js 模块 a7fe）：
 *     e.prototype.getM=function(e){let t=0;return t=parseInt(e/60),t},
 *     e.prototype.getS=function(e){let t=0;return t=parseInt(e)%60,t}
 * 注意用的是 parseInt 而非 Math.floor —— 对非负数两者等价，
 * time_length 恒为非负秒数，故行为一致；此处照搬 parseInt 以逐字对齐。
 *
 * 为什么要单独导出：dist 里这两个方法在 **Vue.prototype** 上，页面用 `this.getM(秒)`
 * 或模板里 `{{ getM(秒) }}` 调用；全 dist 有 **21 个路由** 依赖它们
 * （/admin/report、/committee/elementary[1-3]、/committee/colleges、/committee/teacher[1]、
 *  /city|school 的 elementary|teacher list 与 edit 等）。
 * Vue3 的 <script setup> 没有 this，故改为具名导出 + 显式 import；
 * 导入的绑定会被 <script setup> 自动暴露给模板，因此模板里的 getM(...) 写法依然成立。
 */
export function getM(seconds) {
  return parseInt(seconds / 60)
}

export function getS(seconds) {
  return parseInt(seconds) % 60
}

/**
 * 【非 dist 产物】给 Date.prototype 扩展 Format / timeFormat / getM / getS。
 * 保留仅为兼容旧调用方；本项目当前无任何调用点。
 */
export function installDateFormat() {
  if (Date.prototype.Format) return // 避免重复挂载
  Date.prototype.Format = function (fmt) {
    const o = {
      'M+': this.getMonth() + 1,
      'd+': this.getDate(),
      'H+': this.getHours(),
      'm+': this.getMinutes(),
      's+': this.getSeconds(),
      'q+': Math.floor((this.getMonth() + 3) / 3),
      S: this.getMilliseconds()
    }
    if (/(y+)/.test(fmt)) {
      fmt = fmt.replace(RegExp.$1, (this.getFullYear() + '').substr(4 - RegExp.$1.length))
    }
    for (const k in o) {
      if (new RegExp('(' + k + ')').test(fmt)) {
        fmt = fmt.replace(
          RegExp.$1,
          RegExp.$1.length === 1 ? o[k] : ('00' + o[k]).substr(('' + o[k]).length)
        )
      }
    }
    return fmt
  }

  Date.prototype.timeFormat = function () {
    const t = this
    const n = t.getFullYear()
    const c = t.getMonth() + 1 < 10 ? '0' + (t.getMonth() + 1) : t.getMonth() + 1
    const o = t.getDate() < 10 ? '0' + t.getDate() : t.getDate()
    return n + '-' + c + '-' + o
  }

  Date.prototype.getM = function (s) {
    return parseInt(s / 60)
  }

  Date.prototype.getS = function (s) {
    return parseInt(s) % 60
  }
}

/**
 * 时间相关快捷函数（直接用，不依赖原型扩展）
 */
export function formatDate(date, fmt = 'yyyy-MM-dd HH:mm:ss') {
  if (!date) return ''
  const d = date instanceof Date ? date : new Date(date)
  return d.Format ? d.Format(fmt) : fallback(d, fmt)
}

function fallback(d, fmt) {
  const o = {
    'M+': d.getMonth() + 1,
    'd+': d.getDate(),
    'H+': d.getHours(),
    'm+': d.getMinutes(),
    's+': d.getSeconds()
  }
  let out = fmt
  if (/(y+)/.test(out)) {
    out = out.replace(RegExp.$1, (d.getFullYear() + '').substr(4 - RegExp.$1.length))
  }
  for (const k in o) {
    if (new RegExp('(' + k + ')').test(out)) {
      out = out.replace(RegExp.$1, RegExp.$1.length === 1 ? o[k] : ('00' + o[k]).substr(('' + o[k]).length))
    }
  }
  return out
}

/**
 * 后端时间字符串 → Date（按浏览器本地时区取值）
 *
 * 后端返回的是 **UTC**，且带偏移量后缀。实测过两种形态：
 *   "2026-09-23T02:02:00.246712+00:00"   T 分隔（草稿接口）
 *   "2026-09-22 02:22:34.915124+00:00"   空格分隔（admin/log 接口）
 * 两种都带 +00:00，`new Date()` 能解析出**绝对时刻**，之后 getHours() 之类
 * 按浏览器本地时区取数 —— UTC→北京时间这一步就自动完成了。
 *
 * 直接把这个字符串显示给用户有两个问题（原样显示过一阵子）：
 *   1) 看不懂：`2026-09-23T02:02:00.246712+00:00` 对普通用户是天书；
 *   2) **时间差 8 小时**：上例是 UTC 02:02，北京时间其实是 10:02。
 *      只把格式改好看、不转时区，等于把一个读不出来的错数变成一个读得出来的错数。
 *
 * 两处归一化，都是为了让各引擎都能解析：
 *   1) 空格换 T —— 部分引擎不认 "yyyy-MM-dd HH:mm:ss" 这种非标准写法；
 *   2) 小数秒截到 3 位 —— ECMAScript 只规定毫秒精度，6 位的 "246712"
 *      在 Safari / 旧引擎上可能被判非法（V8 宽容，但不能只测 V8）。
 *
 * @returns {Date|null} 解析失败返回 null
 */
export function parseServerTime(value) {
  if (!value) return null
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value
  const normalized = String(value).replace(' ', 'T').replace(/\.(\d{3})\d+/, '.$1')
  const d = new Date(normalized)
  return isNaN(d.getTime()) ? null : d
}

/**
 * 后端时间字符串 → 给人看的样子。
 *
 * 解析失败时返回**空串**（而不是原始字符串或 Invalid Date）：
 * 调用方一律按「没有时间可显示」处理，宁可少显示一段，也不把
 * `2026-09-23T02:02:00.246712+00:00` 这种东西甩到用户脸上。
 *
 * 注：`views/admin/log.vue:113` 有一个等价的本地实现 formatCreatedAt
 * （带秒、失败时回退原串）。本函数的 fmt 参数正是为兼容它那种带秒的用法而留的，
 * 但**没有去改它** —— 它是好的、能用的，没必要为了去重去动一个无关页面。
 *
 * @param {string|Date} value
 * @param {string} fmt 见 formatDate，默认精确到分（「最后保存」这类场景秒是噪音）
 */
export function formatDateTime(value, fmt = 'yyyy-MM-dd HH:mm') {
  const d = parseServerTime(value)
  return d ? formatDate(d, fmt) : ''
}

/**
 * 秒转 mm:ss
 */
export function secondsToTime(s) {
  if (!s || isNaN(s)) return '00:00'
  const m = Math.floor(s / 60)
  const ss = s % 60
  return `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}
