/**
 * 路由配置
 *
 * 【可信度：A】直接基于 dist/app.js 中的 routes 数组重建
 * - 37 个路由（不含动态路由）
 * - 5 个 layout：admin / committee / city / school / online（省级端已下线）
 * - 中转路由：/ 与 /middle，根据 user.type 重定向
 *
 * 【第十二届：教师组路由已摘除（8 条），文件保留】
 *   /city/teacher/{create, edit/:id, list}
 *   /school/teacher/{create, edit/:id, list}
 *   /committee/teacher、/committee/teacher1
 * 依据：本届《通知》报名对象只有「管乐团（小学组/中学组/大学组）」与「铜管乐团（小学组/中学组）」，
 * 全文无「教师组」。代码层面的佐证是前后端数据模型已分家 ——
 * 本届表单 OrchestraForm 提交 group:'小学组'|'中学组'|'大学组'（字符串）+ establishment，
 * 教师组那套提交的是 group:2|3（数字）+ group_type（第十一届模型），
 * 后端 scoped_total() 的 city/school 分支也已改用字符串分组，只剩 province 兜底分支还在用数字。
 * 处理方式：只摘路由，**对应的 .vue 页面文件与 ProgramForm/ReportList 的教师变体全部保留**，
 * 原因是「教师组菜单已在本届隐藏（代码保留，不删除）」这一既有决定，且摘路由已能关掉
 * 「手敲 URL 即可用 group=2|3 往 Report 表写脏数据、并混进报名汇总」这个入口。
 * 若日后恢复教师组：把下列注释掉的路由行加回即可，无需改动任何页面文件。
 *
 * 【第十二届：已删除 15 条用不到的路由（页面文件全部保留）】
 *   /test
 *   /online、/online/index、/online/list、/online/edit/:id   西部学校音乐周展演（另一场活动）
 *   /chouqian/index、/chouqian/do/:type
 *   /admin/report、/admin/recommend
 *   /committee/elementary、/committee/colleges、/committee/recommend、/committee/online
 *   /city/recommend/index、/school/recommend/index
 * 判定：src/config/menus.js 的菜单里无入口，且全项目无 openWindow()/router.push() 指向。
 * ⚠️ 反例：/city|school/elementary/edit/:id 同样不在菜单里，但被 ReportList 的「编辑」按钮调用，必须保留。
 * 恢复：从 git 历史取回对应路由即可，无需改动任何页面文件。
 *
 * 【路由命名规则】
 * 沿用 dist 中的 name 命名（如 "/login"、"/admin/index"），方便后续排查
 */

import { createRouter, createWebHistory } from 'vue-router'

// 布局组件
const MainLayout = () => import('@/components/layout/MainLayout.vue')

// ============ 顶层路由 ============
const routes = [
  // 登录
  {
    path: '/login',
    name: '/login',
    component: () => import('@/views/login/index.vue'),
    meta: { title: '登录', requiresAuth: false }
  },
  // 根路径：根据登录态跳转到 /middle 或 /login
  {
    path: '/',
    name: '/',
    redirect: '/middle'
  },
  // 中转：根据 user.type 重定向
  {
    path: '/middle',
    name: '/middle',
    component: () => import('@/views/middle/index.vue'),
    meta: { requiresAuth: true }
  },
  // ============ 管理员 (type=3) ============
  {
    path: '/admin',
    name: '/admin',
    component: MainLayout,
    redirect: '/admin/index',
    meta: { requiresAuth: true, role: 3, title: '管理员后台' },
    children: [
      { path: 'index',       name: '/admin/index',     component: () => import('@/views/admin/index.vue'),     meta: { title: '首页', icon: 'House' } },
      // 【修复】title 原为「扫码签到」——那是与扫描件页一起被虚构出来的标题。
      // /admin/scan 的真实内容是参展扫描件列表（dist 组件 name:"tuijian"，
      // 菜单文案见 src/config/menus.js 的 admin.scan），故标题一并订正。
      // 说明：dist 的路由本身没有 meta.title（已全量检索确认），此处是本项目补充的描述性字段，
      // 修改它不影响任何路由匹配行为。
      { path: 'scan',        name: '/admin/scan',      component: () => import('@/views/admin/scan.vue'),      meta: { title: '参展扫描件列表', icon: 'Camera' } },
      { path: 'user',        name: '/admin/user',      component: () => import('@/views/admin/user.vue'),      meta: { title: '用户管理', icon: 'User' } },
      { path: 'person',      name: '/admin/person',    component: () => import('@/views/admin/person.vue'),    meta: { title: '人员管理', icon: 'UserFilled' } },
      { path: 'log',         name: '/admin/log',       component: () => import('@/views/admin/log.vue'),       meta: { title: '操作日志', icon: 'Tickets' } }
    ]
  },

  // ============ 委员会 (type=2) ============
  {
    path: '/committee',
    name: '/committee',
    component: MainLayout,
    redirect: '/committee/index',
    meta: { requiresAuth: true, role: 2, title: '组委会后台' },
    children: [
      { path: 'index',       name: '/committee/index',     component: () => import('@/views/committee/index.vue'),     meta: { title: '首页', icon: 'House' } },
      // 【修复】原 title 为「小学1组/小学2组/小学3组」，但 dist 的组委会菜单明确写着
      // elementary1=小学组报名审核、elementary2=中学组报名审核、elementary3=大学组报名审核
      // （见 src/config/menus.js 的 committee.items）。按菜单文案订正。
      { path: 'elementary1', name: '/committee/elementary1',component: () => import('@/views/committee/elementary1.vue'),meta: { title: '小学组报名审核', icon: 'School' } },
      { path: 'elementary2', name: '/committee/elementary2',component: () => import('@/views/committee/elementary2.vue'),meta: { title: '中学组报名审核', icon: 'School' } },
      { path: 'elementary3', name: '/committee/elementary3',component: () => import('@/views/committee/elementary3.vue'),meta: { title: '大学组报名审核', icon: 'School' } },
      // 【第十二届摘除】教师组/教师1组审核（group=2|3，第十一届模型）。页面文件保留，见文件头说明。
      // { path: 'teacher',  name: '/committee/teacher',  component: () => import('@/views/committee/teacher.vue'),  meta: { title: '教师组', icon: 'Avatar' } },
      // { path: 'teacher1', name: '/committee/teacher1', component: () => import('@/views/committee/teacher1.vue'), meta: { title: '教师1组', icon: 'Avatar' } },
      // 【修复】同 /admin/scan，标题由「扫码签到」订正为真实页面名。
      // 注意 dist 中本项菜单文字是「扫描件列表」、而打开后的标签页标题是「参展扫描件列表」
      // （见 src/config/menus.js 的 committee.scan 注释），此处采用后者。
      { path: 'scan',        name: '/committee/scan',      component: () => import('@/views/committee/scan.vue'),      meta: { title: '参展扫描件列表', icon: 'Camera' } },
      { path: 'user',        name: '/committee/user',      component: () => import('@/views/committee/user.vue'),      meta: { title: '用户管理', icon: 'User' } }
    ]
  },

  // ============ 市级 (type=1) ============
  {
    path: '/city',
    name: '/city',
    component: MainLayout,
    redirect: '/city/index',
    meta: { requiresAuth: true, role: 1, title: '市级后台' },
    children: [
      { path: 'index',                     name: '/city/index',                  component: () => import('@/views/city/index.vue'),           meta: { title: '首页', icon: 'House' } },
      { path: 'elementary/create',         name: '/city/elementary/create',      component: () => import('@/views/city/elementary-create.vue'),meta: { title: '中小学组-新增' } },
      { path: 'elementary/edit/:id',       name: '/city/elementary/edit/:id',    component: () => import('@/views/city/elementary-edit.vue'), meta: { title: '中小学组-编辑' } },
      { path: 'elementary/list',           name: '/city/elementary/list',        component: () => import('@/views/city/elementary-list.vue'),  meta: { title: '中小学组-列表', icon: 'Document' } },
      // 【第十二届摘除】教师组新增/编辑/列表（group=2，第十一届模型）。页面文件保留，见文件头说明。
      // 摘除理由之一：create 页会向 Report 写 group="2"，而本作用域报名汇总不带 group 参数（查全部），
      // 该记录会混进正常报表。详见文件头。
      // { path: 'teacher/create',   name: '/city/teacher/create',   component: () => import('@/views/city/teacher-create.vue'), meta: { title: '教师组-新增' } },
      // { path: 'teacher/edit/:id', name: '/city/teacher/edit/:id', component: () => import('@/views/city/teacher-edit.vue'),   meta: { title: '教师组-编辑' } },
      // { path: 'teacher/list',     name: '/city/teacher/list',     component: () => import('@/views/city/teacher-list.vue'),   meta: { title: '教师组-列表', icon: 'Document' } }
    ]
  },

  // ============ 学校 (type=0) ============
  {
    path: '/school',
    name: '/school',
    component: MainLayout,
    redirect: '/school/index',
    meta: { requiresAuth: true, role: 0, title: '学校后台' },
    children: [
      { path: 'index',                     name: '/school/index',                component: () => import('@/views/school/index.vue'),          meta: { title: '首页', icon: 'House' } },
      { path: 'elementary/create',         name: '/school/elementary/create',    component: () => import('@/views/school/elementary-create.vue'),meta: { title: '大学组-新增' } },
      { path: 'elementary/edit/:id',       name: '/school/elementary/edit/:id',  component: () => import('@/views/school/elementary-edit.vue'), meta: { title: '大学组-编辑' } },
      { path: 'elementary/list',           name: '/school/elementary/list',      component: () => import('@/views/school/elementary-list.vue'),  meta: { title: '大学组-列表', icon: 'Document' } },
      // 【第十二届摘除】教师组新增/编辑/列表（group=3，第十一届模型）。页面文件保留，见文件头说明。
      // { path: 'teacher/create',   name: '/school/teacher/create',   component: () => import('@/views/school/teacher-create.vue'), meta: { title: '教师组-新增' } },
      // { path: 'teacher/edit/:id', name: '/school/teacher/edit/:id', component: () => import('@/views/school/teacher-edit.vue'),   meta: { title: '教师组-编辑' } },
      // { path: 'teacher/list',     name: '/school/teacher/list',     component: () => import('@/views/school/teacher-list.vue'),   meta: { title: '教师组-列表', icon: 'Document' } }
    ]
  },

  // 404
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/error/404.vue'),
    meta: { title: '404 未找到', requiresAuth: false }
  },
  {
    path: '/404',
    name: '404',
    component: () => import('@/views/error/404.vue'),
    meta: { title: '404', requiresAuth: false }
  },
  {
    path: '/500',
    name: '500',
    component: () => import('@/views/error/500.vue'),
    meta: { title: '500', requiresAuth: false }
  }
]

// 【部署前缀】必须使用 Vite 内置的 BASE_URL（由 vite.config.js 的 base 派生，恒带尾部 /）
// 原 dist 为 new Router({ mode: 'history', base: '/ylbxt/' })
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

export default router
