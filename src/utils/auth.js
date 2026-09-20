/**
 * 认证工具
 *
 * 【可信度：A】完全照搬 dist 中 Vue.prototype.setToken/getUser/setUser/clearToken/...
 * - localStorage key: 'token' (Bearer 前缀) / 'user' (JSON) / 其他 cache key
 * - getUser() 找不到 user 时跳登录（与 dist 行为一致）
 *
 * 【Vue 3 重构说明】
 * 原 Vue 2 中这些方法挂在 Vue.prototype 上，所有组件可通过 this.xxx() 调用。
 * Vue 3 不推荐在原型上挂载业务方法，本项目通过：
 *   1. 模块导出 (本文件) — 推荐用 import 引入
 *   2. app.config.globalProperties.$auth = auth — 兼容 Options API / 模板内调用
 */

import router from '@/router'

const TOKEN_KEY = 'token'
const USER_KEY = 'user'

/* ========== Token ========== */
export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, 'Bearer ' + token)
}

export function getToken() {
  const t = localStorage.getItem(TOKEN_KEY)
  return !(!t || t === 'undefined') ? t : ''
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

/* ========== User ========== */
export function setUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function getUser() {
  const raw = localStorage.getItem(USER_KEY)
  if (raw) {
    try { return JSON.parse(raw) } catch (_) { return null }
  }
  // 与 dist 行为一致：找不到 user 时直接跳登录
  // 但因为工具函数不能直接调 router，这里改为返回 null，由调用方决定
  return null
}

export function clearUser() {
  localStorage.removeItem(USER_KEY)
}

/* ========== 全清 ========== */
export function clearAllMsg() {
  localStorage.clear()
}

/* ========== 通用 cache ========== */
export function addCache(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

export function getCache(key) {
  const raw = localStorage.getItem(key)
  if (!raw) return null
  try { return JSON.parse(raw) } catch (_) { return null }
}

export function clearCache(key) {
  localStorage.removeItem(key)
}

/* ========== 退出登录 ========== */
export function logout() {
  clearToken()
  clearUser()
  // 【修复】原实现用 window.location.href 整页跳转，会绕过 Vue Router：
  //   1) 触发一次完整页面重载，路由守卫 / NProgress / 标签页状态全部丢失；
  //   2) 生产环境 base 是 /ylbxt/，而 window.location.href 是绝对路径赋值，
  //      与 P0-1 统一用 import.meta.env.BASE_URL 的做法不一致。
  // 现改为走 Router。导入是安全的：router/index.js 只依赖 vue-router，不反向依赖本文件，
  // 不会形成循环依赖（guard.js 是 main.js 里单独 import 的副作用模块）。
  if (typeof window !== 'undefined') router.replace('/login')
}
