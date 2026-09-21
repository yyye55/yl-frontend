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

router.onError((error) => {
  NProgress.done()
  console.error('[Router Error]', error)
})
