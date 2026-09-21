/**
 * 路由配置
 *
 * 【可信度：A】直接基于 dist/app.js 中的 routes 数组重建
 * - 37 个路由（不含动态路由）
 * - 6 个 layout：admin / committee / province / city / school / online
 * - 中转路由：/ 与 /middle，根据 user.type 重定向
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
  // 人脸识别测试页（独立路由，使用 face-api.js）
  {
    path: '/test',
    name: '/test',
    component: () => import('@/views/test/index.vue'),
    meta: { title: '人脸识别测试', requiresAuth: false }
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
  // 抽签系统（独立路由，不需要 layout）
  //
  // 【修复】补 meta.role = 3（管理员）。后端 4 个抽签接口都走 role_error(request, 3)，
  // 非管理员拿到的是 403「无该页面操作权限！」；而前端响应拦截器把 403 当作
  // 「登录态失效」处理（清 token + 跳 /login）。原先两条路由没有 meta.role，
  // 于是学校/评委等账号可以进到页面，再被莫名其妙弹回登录页；
  // 现在由守卫直接按角色拦下，跳该角色自己的首页（/middle），不误导用户。
  {
    path: '/chouqian/index',
    name: '/chouqian/index',
    component: () => import('@/views/chouqian/index.vue'),
    meta: { title: '抽签首页', requiresAuth: true, role: 3 }
  },
  {
    path: '/chouqian/do/:type',
    name: '/chouqian/do',
    component: () => import('@/views/chouqian/do.vue'),
    meta: { title: '执行抽签', requiresAuth: true, role: 3 }
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
      { path: 'report',      name: '/admin/report',    component: () => import('@/views/admin/report.vue'),    meta: { title: '报名审核', icon: 'Document' } },
      // 【修复】title 原为「扫码签到」——那是与扫描件页一起被虚构出来的标题。
      // /admin/scan 的真实内容是参展扫描件列表（dist 组件 name:"tuijian"，
      // 菜单文案见 src/config/menus.js 的 admin.scan），故标题一并订正。
      // 说明：dist 的路由本身没有 meta.title（已全量检索确认），此处是本项目补充的描述性字段，
      // 修改它不影响任何路由匹配行为。
      { path: 'scan',        name: '/admin/scan',      component: () => import('@/views/admin/scan.vue'),      meta: { title: '参展扫描件列表', icon: 'Camera' } },
      { path: 'recommend',   name: '/admin/recommend', component: () => import('@/views/admin/recommend.vue'), meta: { title: '推荐', icon: 'Star' } },
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
      { path: 'elementary',  name: '/committee/elementary',component: () => import('@/views/committee/elementary.vue'),meta: { title: '小学组', icon: 'School' } },
      // 【修复】原 title 为「小学1组/小学2组/小学3组」，但 dist 的组委会菜单明确写着
      // elementary1=小学组报名审核、elementary2=中学组报名审核、elementary3=大学组报名审核
      // （见 src/config/menus.js 的 committee.items）。按菜单文案订正。
      { path: 'elementary1', name: '/committee/elementary1',component: () => import('@/views/committee/elementary1.vue'),meta: { title: '小学组报名审核', icon: 'School' } },
      { path: 'elementary2', name: '/committee/elementary2',component: () => import('@/views/committee/elementary2.vue'),meta: { title: '中学组报名审核', icon: 'School' } },
      { path: 'elementary3', name: '/committee/elementary3',component: () => import('@/views/committee/elementary3.vue'),meta: { title: '大学组报名审核', icon: 'School' } },
      { path: 'colleges',    name: '/committee/colleges',  component: () => import('@/views/committee/colleges.vue'),  meta: { title: '大学组', icon: 'Reading' } },
      { path: 'teacher',     name: '/committee/teacher',   component: () => import('@/views/committee/teacher.vue'),   meta: { title: '教师组', icon: 'Avatar' } },
      { path: 'teacher1',    name: '/committee/teacher1',  component: () => import('@/views/committee/teacher1.vue'),  meta: { title: '教师1组', icon: 'Avatar' } },
      { path: 'recommend',   name: '/committee/recommend', component: () => import('@/views/committee/recommend.vue'), meta: { title: '推荐', icon: 'Star' } },
      // 【修复】同 /admin/scan，标题由「扫码签到」订正为真实页面名。
      // 注意 dist 中本项菜单文字是「扫描件列表」、而打开后的标签页标题是「参展扫描件列表」
      // （见 src/config/menus.js 的 committee.scan 注释），此处采用后者。
      { path: 'scan',        name: '/committee/scan',      component: () => import('@/views/committee/scan.vue'),      meta: { title: '参展扫描件列表', icon: 'Camera' } },
      { path: 'online',      name: '/committee/online',    component: () => import('@/views/committee/online.vue'),    meta: { title: '在线直播', icon: 'VideoCamera' } },
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
      { path: 'elementary/create',         name: '/city/elementary/create',      component: () => import('@/views/city/elementary-create.vue'),meta: { title: '小学组-新增' } },
      { path: 'elementary/edit/:id',       name: '/city/elementary/edit/:id',    component: () => import('@/views/city/elementary-edit.vue'), meta: { title: '小学组-编辑' } },
      { path: 'elementary/list',           name: '/city/elementary/list',        component: () => import('@/views/city/elementary-list.vue'),  meta: { title: '小学组-列表', icon: 'Document' } },
      { path: 'teacher/create',            name: '/city/teacher/create',         component: () => import('@/views/city/teacher-create.vue'),   meta: { title: '教师组-新增' } },
      { path: 'teacher/edit/:id',          name: '/city/teacher/edit/:id',       component: () => import('@/views/city/teacher-edit.vue'),    meta: { title: '教师组-编辑' } },
      { path: 'teacher/list',              name: '/city/teacher/list',           component: () => import('@/views/city/teacher-list.vue'),     meta: { title: '教师组-列表', icon: 'Document' } },
      { path: 'recommend/index',           name: '/city/recommend/index',        component: () => import('@/views/city/recommend.vue'),         meta: { title: '推荐', icon: 'Star' } }
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
      { path: 'elementary/create',         name: '/school/elementary/create',    component: () => import('@/views/school/elementary-create.vue'),meta: { title: '小学组-新增' } },
      { path: 'elementary/edit/:id',       name: '/school/elementary/edit/:id',  component: () => import('@/views/school/elementary-edit.vue'), meta: { title: '小学组-编辑' } },
      { path: 'elementary/list',           name: '/school/elementary/list',      component: () => import('@/views/school/elementary-list.vue'),  meta: { title: '小学组-列表', icon: 'Document' } },
      { path: 'teacher/create',            name: '/school/teacher/create',       component: () => import('@/views/school/teacher-create.vue'),   meta: { title: '教师组-新增' } },
      { path: 'teacher/edit/:id',          name: '/school/teacher/edit/:id',     component: () => import('@/views/school/teacher-edit.vue'),    meta: { title: '教师组-编辑' } },
      { path: 'teacher/list',              name: '/school/teacher/list',         component: () => import('@/views/school/teacher-list.vue'),     meta: { title: '教师组-列表', icon: 'Document' } },
      { path: 'recommend/index',           name: '/school/recommend/index',      component: () => import('@/views/school/recommend.vue'),         meta: { title: '推荐', icon: 'Star' } }
    ]
  },

  // ============ 在线直播 (无 layout 包裹，原项目推测为独立页) ============
  {
    path: '/online',
    name: '/online',
    component: MainLayout,
    redirect: '/online/index',
    meta: { requiresAuth: true, title: '直播报道' },
    children: [
      { path: 'index',        name: '/online/index',     component: () => import('@/views/online/index.vue'), meta: { title: '直播首页', icon: 'VideoCamera' } },
      { path: 'list',         name: '/online/list',      component: () => import('@/views/online/list.vue'),  meta: { title: '直播列表', icon: 'List' } },
      { path: 'edit/:id',     name: '/online/edit/:id',  component: () => import('@/views/online/edit.vue'),  meta: { title: '编辑直播' } }
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
