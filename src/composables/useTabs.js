/**
 * 标签页导航（openWindow / closeWindow）
 *
 * 【可信度：A】来自 dist 中每个 layout 的同名方法，原文：
 *   openWindow(e,t){ this.addTab({name:e,label:t}).then(e=>{ null!=e && this.$router.push(e.name) }) }
 *   closeWindow(e){ this.removeTab(e).then(e=>{ this.$router.replace(e) }) }
 *
 * 【为什么抽成 composable】
 * 原 Vue 2 中这两个方法是 layout 组件上的方法，模板里用 `e.openWindow(...)` 调用。
 * Vue 3 里 Sidebar 与 MainLayout 都要用（菜单点击、标签页 ×、标签页切换），
 * 因此抽到这里共享，业务语义与 dist 保持一致：
 *   openWindow(name, label) —— 已激活则什么都不做（不跳转、不重复建 tab）
 *   closeWindow(name)       —— 关闭后跳转到 store 选出的下一个激活标签
 */

import { useRouter } from 'vue-router'
import { useTabsStore } from '@/store/modules/tabs'

export function useTabs() {
  const router = useRouter()
  const tabsStore = useTabsStore()

  /**
   * 打开标签页并跳转
   * @param {string} name  路由 path（同时也是 tab 的 name）
   * @param {string} label tab 上显示的标题
   */
  function openWindow(name, label) {
    return tabsStore.addTab({ name, label }).then((tab) => {
      // tab 为 null 表示该标签已经是激活标签，dist 此时不跳转
      if (tab != null) router.push(tab.name)
      return tab
    })
  }

  /**
   * 关闭标签页并跳转
   * @param {string} name 要关闭的 tab 的 name
   */
  function closeWindow(name) {
    return tabsStore.removeTab(name).then((activeName) => {
      // dist 是无条件 replace。这里仅多一个空串保护：
      // removeTab 正常不会返回空串，只有 clearAllTabs 之后才会，避免 router.replace('') 抛错。
      if (activeName) router.replace(activeName)
      return activeName
    })
  }

  return { openWindow, closeWindow, tabsStore }
}

export default useTabs
