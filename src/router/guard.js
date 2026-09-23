/**
 * 路由守卫
 *
 * 【可信度：A】基于 dist/app.js 中 router.beforeEach/afterEach 还原
 * - 原版只有 nprogress.start() / done()
 * - 本项目增加：登录校验、token 注入提示
 *
 * 【route.meta.requiresAuth】 控制是否需要登录
 * 【route.meta.role】 限制角色（仅登录后路由生效）
 */

import NProgress from 'nprogress'
import 'nprogress/nprogress.css'
import router from './index'
import { getToken, getUser, clearToken, clearUser } from '@/utils/auth'

NProgress.configure({ showSpinner: false })

const whiteList = ['/login', '/test', '/404', '/500']

router.beforeEach((to, from, next) => {
  NProgress.start()

  // 不需要登录的页面
  if (whiteList.includes(to.path)) {
    return next()
  }

  // 需要登录
  const token = getToken()
  if (!token) {
    return next('/login')
  }

  // token 存在但 user 缺失/损坏 → 登录态不完整，按未登录处理
  //
  // 【修复】原写法为 `if (meta.role !== undefined && user)`，当 user 为 null 时
  // （localStorage.user 被清除、被其他标签页清空或 JSON 损坏）整个角色校验会被短路跳过，
  // 仅凭一个 token 即可进入 /admin、/committee 等受保护页面。现改为先校验 user 完整性。
  const user = getUser()
  if (!user) {
    clearToken()
    clearUser()
    return next('/login')
  }

  // 角色校验：meta.role 与 user.type 必须一致
  if (to.meta && to.meta.role !== undefined && user.type !== to.meta.role) {
    // 没有权限，跳转到自己的 layout
    return next('/middle')
  }

  next()
})

router.afterEach((to) => {
  NProgress.done()
  if (to.meta && to.meta.title) {
    document.title = `${to.meta.title} - “意林杯”管乐展示活动报名系统`
  }
})

/**
 * 分片 404 自愈
 *
 * 【问题】部署时 .github/workflows/frontend-deploy.yml 先清空线上目录再全量替换
 * （`find "$TARGET" -mindepth 1 -maxdepth 1 -exec rm -rf {} +`），而 vite.config.js 的
 * chunkFileNames 是 'js/[name].[hash].js' —— 文件名带内容哈希，每次构建都变。于是
 * 部署前就开着的标签页会去要一个已被删掉的文件，404。表现是「点菜单没反应」，
 * 控制台之外没有任何提示（已打开的 SPA 不会重新取 HTML，index.html 的 no-cache 兜不住）。
 *
 * 【链路】已从真实产物 dist/js/index.DsOMGvTp.js 逐环核对：
 *   路由 `component: () => import(...)` 构建成
 *     _e(() => import("./elementary-list.<hash>.js"), __vite__mapDeps([...]))
 *   该助手失败时执行 `!e.defaultPrevented && throw i`（即不 preventDefault 就重抛）
 *   → vue-router 的 navigate() reject → triggerError → 本回调
 *
 * 【覆盖范围】router.onError 是分片失败唯一能到达的地方，而它兜住的远不止那个路由分片
 * 本身 —— __vite__mapDeps 列出的 30 多个共享依赖分片失败也汇进同一条路
 * （产物里 `for (const a of i||[]) a.status==="rejected" && o(a.reason)`）。
 * 所以「路由分片 + 它整条依赖闭包」都在内。
 *
 * 【非路由动态 import】utils/xlsx.js 的 import('xlsx')、services/ossUpload.js 的
 * import('ali-oss') 不经过 router.onError（错误抛回调用方），由文件末尾那个
 * window 上的 vite:preloadError 监听接住，复用下面同一个判定函数。
 *
 * 【导出按钮不走这条路】各页导出用的是 downloadExcelFile / downloadPdfFile，收的是
 * 后端生成的 blob，不加载任何分片 —— 点了必然成功，与分片 404 无关。
 * （utils/excel.js 里会 import('xlsx') 的三个函数中，exportTable / makeXLSX 零调用方。）
 *
 * 【为什么刷新能修】旧标签页只要重新取一次 HTML（index.html 是 no-cache），拿到的就是
 * 新构建的入口与新哈希。表单内容不会丢 —— OrchestraForm 的 beforeunload 会把内容镜像进本地缓存。
 *
 * 【只能修到什么程度】分片失败发生在 vue-router 的 navigate() 内部，而 URL 是在之后的
 * finalizeNavigation 里才更新的 —— navigate 一 reject，那一步就不执行，地址栏停在原页。
 * 所以「已开着页面、点菜单失败」这种，刷完还需用户再点一次菜单（点了就成功）；
 * 若落点本身就是坏路由，URL 已是目标，刷完直接恢复，用户无感。
 *
 * 【注意】本函数刻意只依赖 sessionStorage / navigator / Date / location 四个全局名，
 * 不引用任何外部变量 —— 保持这个性质，它就能被离线脚本抽取出来单独跑（已验证 27 例）。
 * 函数内几处看似多余的写法（原样写回的探写、Number.isFinite、catch 里不刷）分别对应
 * fail-closed 与防死循环，删错一行会造成无限刷新，改动前请先把那些注释读完。
 */
const CHUNK_RELOAD_KEY = 'chunkReloadAt'
const CHUNK_RELOAD_WINDOW_MS = 60000

/**
 * 判断是否该为这次分片失败刷新页面，是则刷新并返回 true。
 *
 * 三条判断缺一不可，任一走错都比原来更糟：
 *   1) 只认分片加载失败。router.onError 也会接住业务异常与守卫抛错，不加判定会变成随手一刷。
 *   2) 断网不刷。断网时 import() 失败的文案与分片 404 完全一样
 *      （都是 Failed to fetch dynamically imported module），不挡就会白刷一次，
 *      刷完仍断网、页面还是坏的。
 *   3) 存储不可用就不刷（fail-closed），理由见下方 catch。
 */
function tryRecoverChunkError(error) {
  // 文案由浏览器决定，三家各不相同，故不按 name 判断
  // （ChunkLoadError 是 webpack 运行时造的名字，本项目是 Vite/Rollup，按 name 判永不命中）：
  //   Chromium  Failed to fetch dynamically imported module: <url>
  //   Firefox   error loading dynamically imported module: <url>
  //   Safari    Importing a module script failed.
  //   Vite 自造  Unable to preload CSS for <url>
  // 另保留 Loading chunk 以兼容将来换打包器。
  const msg = String((error && error.message) || error)
  const chunkGone = /dynamically imported module|Importing a module script failed|Unable to preload|Loading chunk/i.test(msg)
  if (!chunkGone) return false

  if (typeof navigator !== 'undefined' && navigator.onLine === false) return false

  try {
    // 用时间戳而不是「刷过一次」的布尔标记：sessionStorage 跨刷新存活，
    // 布尔标记等于「每个标签页终生只自愈一次」—— 五分钟后再遇到分片失败就不救了。
    const parsed = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY))
    // 非有限数（记录损坏）按「无记录」处理：若原样留着 NaN，
    // `now - NaN > 窗口` 恒为 false，自愈会被永久静默关闭。
    const last = Number.isFinite(parsed) ? parsed : 0

    // 探写：把读回来的值原样写回。既证明「可写」，又不挪动时间戳 ——
    // 若这里写 now，60 秒窗口会被一直往前推，同样变成永久静默。
    sessionStorage.setItem(CHUNK_RELOAD_KEY, String(last))

    if (Date.now() - last > CHUNK_RELOAD_WINDOW_MS) {
      sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()))
      location.reload()
      return true
    }
  } catch (_) {
    /*
     * 存储不可用（隐私设置禁用网站数据、企业策略、跨源 iframe 的存储分区）→ 不刷。
     *
     * 【必须 fail-closed】若既读不到也写不进，`last` 永远是 0，`now - 0 > 60000`
     * 永远成立 → 刷新 → 又失败 → 再刷，页面变成抖动的白屏，比原来的「点了没反应」
     * 严重得多。拿不到防循环能力就不自愈，交给用户手动刷新。
     */
  }
  return false
}

router.onError((error) => {
  NProgress.done()
  // 已自愈（含刚触发刷新）时不再重复记录
  if (tryRecoverChunkError(error)) return
  console.error('[Router Error]', error)
})

/*
 * 非路由动态 import 的分片 404 自愈（复用上面同一个判定）
 *
 * 覆盖 utils/xlsx.js 的 import('xlsx') 与 services/ossUpload.js 的 import('ali-oss')。
 * 这两个错误抛回调用方，不经过 router.onError，只能靠 window 事件接。
 *
 * 【为什么一个监听就够】产物里全项目只有一份 preload 助手，放在入口 index.<hash>.js，
 * 每个动态 chunk 都从它导入（各自起别名 _e / fa / We）。实测 dist 里含
 * "vite:preloadError" 的 chunk 只有入口那一个 —— 所以 xlsx、ali-oss、路由、
 * 以及它们依赖的共享分片，全部从这一个入口过。
 *
 * 【不会与 router.onError 重复刷新】路由分片失败时两条路都会响，顺序是
 * dispatchEvent 在前、throw 在后。window 这条先跑并写入时间戳，router.onError
 * 那条再判定时 now - last 已是 0，直接返回 false —— 时间戳那行就是幂等锁。
 *
 * 【注意】导出按钮不在此列：各页导出走的是 downloadExcelFile/downloadPdfFile，
 * 收的是后端生成的 blob，不加载任何分片，点了必然成功。
 */
window.addEventListener('vite:preloadError', (e) => {
  if (tryRecoverChunkError(e.payload)) return
  console.error('[Chunk Error]', e.payload)
})
