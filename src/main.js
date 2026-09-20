/**
 * 应用入口
 *
 * 【可信度：A】基于 dist 中 app.js 的初始化逻辑还原
 * - Vue 2 原版：Vue.use(ElementUI) + Vue.use(Vuex) + Vue.use(VueRouter) + Vue.prototype.$api = ...
 * - Vue 3 重构：createApp + app.use(...)
 */
import { createApp } from 'vue'
import App from './App.vue'

// 路由
import router from './router'
// 状态管理
import pinia from './store'

// Element Plus
//
// 【体积修复（P1-10）】原实现是「完整引入」：
//     import ElementPlus from 'element-plus'
//     import 'element-plus/dist/index.css'
//     app.use(ElementPlus, { locale: zhCn })
//     for (const [k, c] of Object.entries(ElementPlusIconsVue)) app.component(k, c)
// 这与 vite.config.js 里已经配置的 unplugin-vue-components / unplugin-auto-import 按需方案重复，
// 且完整引入会让入口 chunk 无法 tree-shake（实测约 1.66 MB）。
//
// 现在改为纯按需：
//   - 模板中的 <el-xxx> 组件 由 unplugin-vue-components + ElementPlusResolver 自动引入（含样式）
//   - 脚本中的 ElMessage / ElMessageBox 等由 unplugin-auto-import + ElementPlusResolver 自动引入
//   - 全局中文语言包改由 App.vue 的 <el-config-provider :locale="zhCn"> 提供
//     （分页器的「共 N 条 / 条-页 / 前往」等文案依赖它）
// 只有下面这一个指令必须显式注册：v-loading 在模板里是内置指令写法，
// 不在上面两个插件的解析范围内。
import { ElLoading } from 'element-plus'

// 全局样式
import './styles/index.scss'

// 路由守卫
import './router/guard'

const app = createApp(App)

app.use(pinia)
app.use(router)

// 等同 unplugin-vue-components 的 directives 能力，显式注册更可控
app.directive('loading', ElLoading.directive)

// 【已移除】app.config.globalProperties.$auth / $excel
// 二者是 Vue 2 时代在 Vue.prototype 上挂工具方法的写法。经全量检索，
// 本项目没有任何组件通过 this.$auth / this.$excel 调用它们 ——
// 各页面都是 `import { ... } from '@/utils/auth'` 直接引用的。
// 保留它们带来的唯一后果是把 @/utils/excel 静态拉进入口 chunk，
// 而该模块顶部 `import * as XLSX from 'xlsx'`，等于把 xlsx 整包打进首屏。
// 现在已经没有全局挂载，utils/excel 内部也改成了按需动态加载 XLSX（见该文件说明）。

app.mount('#app')
