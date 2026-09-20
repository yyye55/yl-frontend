/**
 * Tabs Store（标签页）
 *
 * 【可信度：A】逐行对照 dist/app.js 中的 Vuex tabs 模块还原，原文：
 *
 *   new Vuex.Store({
 *     state: { tabsActive: "/index", tabs: [] },
 *     mutations: {
 *       addTab(e,t){ -1===e.tabs.findIndex(e=>e.name===t.name)&&e.tabs.push(t); e.tabsActive=t.name },
 *       removeTab(e,{activeName:t,tabs:n}){ e.tabsActive=t; e.tabs=n; return t },
 *       clearTabs(e){ e.tabs=[]; e.tabsActive="" }
 *     },
 *     actions: {
 *       addTab({commit:e,state:t},n){ return new Promise((c,o)=>{
 *           n.name===t.tabsActive ? c(null) : (e("addTab",n), c(n)) }) },
 *       removeTab({commit:e,state:t},n){ return new Promise((c,o)=>{
 *           let a=t.tabs, r=t.tabsActive
 *           r===n && a.forEach((e,t)=>{ if(e.name===n){ const e=a[t+1]||a[t-1]; e&&(r=e.name) } })
 *           a=a.filter(e=>e.name!==n); e("removeTab",{activeName:r,tabs:a}); c(r) }) },
 *       clearAllTabs({commit:e}){ e("clearTabs") }
 *     }
 *   })
 *
 * 【Vue 3 重构】Vuex -> Pinia。Pinia 没有独立的 mutation 层，
 * 因此把 dist 的 mutation 实现为下划线前缀的「内部」action，action 层保持同名同语义，
 * 这样调用方（openWindow / closeWindow）写法和 dist 完全一致。
 *
 * 【已确认的行为（勿自行"优化"）】
 *  1. 纯内存状态，没有 localStorage 持久化 —— 刷新后标签页清空。
 *  2. 不存在"关闭当前 / 关闭其他 / 关闭全部"菜单，只有每个标签页上的 × 。
 *     clearAllTabs 仅在退出登录时调用。
 *  3. addTab 的判据是 tabsActive 而不是"是否已存在"：
 *     若目标已存在但非激活，不会重复 push，但仍会置为激活。
 *  4. removeTab 关闭非激活标签时不改变激活项；
 *     关闭激活标签时取 tabs[i+1] || tabs[i-1]，都没有则保持原值（此时会指向已关闭的标签）。
 */

import { defineStore } from 'pinia'

export const useTabsStore = defineStore('tabs', {
  state: () => ({
    // dist 原文初值就是 '/index'（该路径本身并不是一个真实路由，原样保留）
    tabsActive: '/index',
    tabs: []
  }),
  actions: {
    /* ==================== 对应 dist 的 mutations ==================== */

    /** dist mutation addTab：按 name 去重后追加，并把该 tab 置为激活 */
    _addTab(tab) {
      if (this.tabs.findIndex((t) => t.name === tab.name) === -1) {
        this.tabs.push(tab)
      }
      this.tabsActive = tab.name
    },

    /** dist mutation removeTab */
    _removeTab({ activeName, tabs }) {
      this.tabsActive = activeName
      this.tabs = tabs
      return activeName
    },

    /** dist mutation clearTabs */
    _clearTabs() {
      this.tabs = []
      this.tabsActive = ''
    },

    /* ==================== 对应 dist 的 actions ==================== */

    /**
     * 打开（或激活）一个标签页
     * @returns {Promise<object|null>} 目标已是激活标签时返回 null（调用方据此决定不跳转）
     */
    addTab(tab) {
      if (tab.name === this.tabsActive) return Promise.resolve(null)
      this._addTab(tab)
      return Promise.resolve(tab)
    },

    /**
     * 关闭标签页，返回关闭后应当激活的标签 name
     * @returns {Promise<string>} activeName
     */
    removeTab(name) {
      let tabs = this.tabs
      let tabsActive = this.tabsActive
      if (tabsActive === name) {
        tabs.forEach((t, i) => {
          if (t.name === name) {
            const next = tabs[i + 1] || tabs[i - 1]
            if (next) tabsActive = next.name
          }
        })
      }
      tabs = tabs.filter((t) => t.name !== name)
      return Promise.resolve(this._removeTab({ activeName: tabsActive, tabs }))
    },

    /** 清空全部标签页（dist 中仅在退出登录时调用） */
    clearAllTabs() {
      this._clearTabs()
    }
  }
})
