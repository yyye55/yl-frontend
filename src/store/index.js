/**
 * Pinia 入口
 *
 * 【可信度：A】基于 dist/app.js 中的 Vuex.Store 还原
 * 原 Vuex 只管理 tabs，本项目用 Pinia 替代，结构更清晰
 */

import { createPinia } from 'pinia'

const pinia = createPinia()

export default pinia

// 导出 useTabsStore 方便使用
export { useTabsStore } from './modules/tabs'
export { useUserStore } from './modules/user'
