/**
 * 各角色 Layout 的侧边栏菜单定义
 *
 * 【可信度：A】逐项照搬 dist 中 5 个 layout chunk 的 el-menu 渲染函数。
 * 证据文件（dist/）：
 *   admin      -> chunk-40286ec0
 *   committee  -> chunk-77f01b0c
 *   city       -> chunk-3058b73e
 *   school     -> chunk-16e50bab
 *   online     -> chunk-4c9a67a5
 * （dist 另有 province -> chunk-470ebdb5，省级端已下线，未纳入本项目）
 *
 * 【重要】原版菜单是「每个 layout 各自硬编码」的，不是从路由 children 自动生成的。
 * 因此条目集合、顺序、文案、图标、分组分隔线都必须按本文件还原，
 * 不要改回「遍历 route.children」——那会多出 dist 里根本不存在的菜单项。
 *
 * 【字段说明】
 *   index  el-menu-item 的 index（同时也是路由 path，也是 tab 的 name）
 *   text   菜单上显示的文字
 *   label  点击后传给 openWindow 作为 tab 标题的文字
 *          —— 注意 label 与 text 并不总是相同，dist 原文即如此：
 *             committee 的扫描件项：text="扫描件列表"，label="参展扫描件列表"
 *   icon   Element UI 2.x 图标类名（原样保留，不改成 Element Plus 的组件名）
 *          —— 类名保持原样是为了让本文件与 dist 的渲染函数可以逐条对照；
 *             实际映射到 Element Plus 图标组件的逻辑在 Sidebar.vue 里（那里才需要 import 组件）。
 *   requires  可选，能力名（见本文件末尾 MENU_REQUIREMENTS）。
 *             当前登录角色不具备该能力时，Sidebar 不渲染这一项；
 *             若某一分组线下面已无可见项，连分组线一起不渲染。
 *
 * 【分组分隔线】dist 中为 `div.line > div`，文案含前后各两个破折号，原样保留。
 * 第十二届起分组线多一条规则：若它下面已无可见菜单项（项被角色过滤掉），
 * 分组线本身也不再渲染 —— 见本文件末尾的 isMenuItemVisible 与 Sidebar.vue。
 *
 * 【keepAlive】dist 中 el-main 的内容分两种写法：
 *   admin / committee：  t("el-main",[t("router-view")],1)
 *   city / school / online：
 *     t("el-main",[ t("keep-alive",[ e.$route.meta.keepAlive ? t("router-view") : e._e() ],1),
 *                   e.$route.meta.keepAlive ? e._e() : t("router-view") ],1)
 * 即只有后 3 个 layout 包了 keep-alive，由路由的 meta.keepAlive 决定是否缓存。
 * 【注意】dist 中没有任何一条路由设置了 meta.keepAlive，因此该分支实际恒为 false，
 * 效果与不写 keep-alive 相同。这里按原样保留结构，不额外启用缓存。
 */

/**
 * 【第十二届改造说明】
 * 1. 标题从"第十一届"改为"第十二届"
 * 2. 教师组菜单已在本届隐藏（代码保留，不删除）
 *    - city: 无教师组入口
 *    - school: 无教师组入口
 *    - committee: teacher, teacher1 已隐藏
 * 3. 第十二届组别待后端确认后，将用于：
 *    - 组委会审核页面筛选
 *    - 统计页面显示
 * 4. 【权限调整】市州端不再具有赛事报名权限，只保留报名信息查看权限。
 *    city 的「赛事报名」项**不是删掉**，而是标上 requires:'reportCreate'，
 *    由 Sidebar 按当前登录角色过滤（学校端照旧可见）。这样：
 *      - 入口的显示判据是 user.type，不是"这个 layout 下面固定没有"；
 *      - 将来若市州端恢复报名权限，改 MENU_REQUIREMENTS 一处即可，
 *        菜单项本身（文案/图标/顺序）无需改动。
 *    注意 school 的「赛事报名」不加 requires —— 学校端必须保持原样。
 */

/** 【第十二届权限调整】菜单项的可见性判据统一来自 @/config/roles.js */
import { isViewOnlyScope } from './roles'

/** “意林杯”系列 layout 共用的品牌标题
 * 【第十二届改造】2024年改为2026年 */
const YILINBEI_TITLE = ['“意林杯”四川省第十二届', '管乐展示活动']
/** 西部学校音乐周系列 layout 的品牌标题 */
const XIBU_TITLE = ['西部学校音乐周', '展演活动']

export const LAYOUT_MENUS = {
  /* ---------- 管理员 (type=3) ---------- */
  admin: {
    title: YILINBEI_TITLE,
    activeTextColor: '#003366',
    items: [
      { index: '/admin/index', text: '首页', label: '首页', icon: 'el-icon-s-home' },
      { index: '/admin/scan', text: '参展扫描件列表', label: '参展扫描件列表', icon: 'el-icon-picture-outline' },
      { index: '/admin/user', text: '用户管理', label: '用户管理', icon: 'el-icon-user' },
      { index: '/admin/person', text: '人员管理', label: '人员管理', icon: 'el-icon-s-opportunity' },
      { index: '/admin/log', text: '日志管理', label: '日志管理', icon: 'el-icon-s-order' }
    ]
  },

  /* ---------- 组委会 (type=2) ---------- */
  committee: {
    title: YILINBEI_TITLE,
    activeTextColor: '#003366',
    items: [
      { index: '/committee/index', text: '首页', label: '首页', icon: 'el-icon-s-home' },
      { type: 'line', text: '—— 审核 ——' },
      { index: '/committee/elementary1', text: '小学组报名审核', label: '小学组报名审核', icon: 'el-icon-info' },
      { index: '/committee/elementary2', text: '中学组报名审核', label: '中学组报名审核', icon: 'el-icon-s-data' },
      { index: '/committee/elementary3', text: '大学组报名审核', label: '大学组报名审核', icon: 'el-icon-s-grid' },
      // 【第十二届隐藏】铜管乐团审核入口待后端确认后添加
      // { index: '/committee/elementary4', text: '铜管乐团审核', label: '铜管乐团审核', icon: 'el-icon-s-data' },
      // 【第十二届隐藏】教师组已隐藏，不再显示
      // { index: '/committee/teacher', text: '教师组报名审核', label: '教师组报名审核', icon: 'el-icon-s-grid' },
      // { index: '/committee/teacher1', text: '教师1组报名审核', label: '教师1组报名审核', icon: 'el-icon-s-grid' },
      { type: 'line', text: '—— 扫描件与账号 ——' },
      { index: '/committee/scan', text: '扫描件列表', label: '参展扫描件列表', icon: 'el-icon-picture-outline' },
      { index: '/committee/user', text: '用户管理', label: '用户管理', icon: 'el-icon-user' }
    ]
  },

  /* ---------- 市级 (type=1) ---------- */
  city: {
    title: YILINBEI_TITLE,
    activeTextColor: '#003366',
    keepAlive: true,
    items: [
      { index: '/city/index', text: '首页', label: '首页', icon: 'el-icon-s-home' },
      // 【第十二届权限调整】该分组线下面只有「赛事报名」一项，市州端登录后这一项被
      // requires 过滤掉，分组线也由 Sidebar 一并去掉（否则会剩一条空的分隔线）。
      { type: 'line', text: '—— 网上报名 ——' },
      { index: '/city/elementary/create', text: '赛事报名', label: '赛事报名', icon: 'el-icon-s-flag', requires: 'reportCreate' },
      // 【第十二届新增】铜管乐团报名待后端确认后添加
      // { index: '/city/brass/create', text: '铜管乐团报名', label: '铜管乐团报名', icon: 'el-icon-s-flag' },
      { type: 'line', text: '—— 报名信息 ——' },
      { index: '/city/elementary/list', text: '报名汇总', label: '报名汇总', icon: 'el-icon-help' }
    ]
  },

  /* ---------- 学校 (type=0) ---------- */
  school: {
    title: YILINBEI_TITLE,
    activeTextColor: '#db3399',
    keepAlive: true,
    items: [
      { index: '/school/index', text: '首页', label: '首页', icon: 'el-icon-s-home' },
      { type: 'line', text: '—— 网上报名 ——' },
      { index: '/school/elementary/create', text: '赛事报名', label: '赛事报名', icon: 'el-icon-s-flag' },
      // 【第十二届新增】铜管乐团报名待后端确认后添加
      // { index: '/school/brass/create', text: '铜管乐团报名', label: '铜管乐团报名', icon: 'el-icon-s-flag' },
      { type: 'line', text: '—— 报名信息 ——' },
      { index: '/school/elementary/list', text: '报名汇总', label: '报名汇总', icon: 'el-icon-help' }
    ]
  },

  /* ---------- 中小学 (type=5) ---------- */
  /**
   * 【与 school 块的关系】菜单文字、图标、分组线、配色全部照抄 school。
   * 需求原话是「导航栏、侧边栏、底栏都跟高校端一样」，所以这里**不引入任何差异**
   * ——包括 activeTextColor 也用高校端那个粉色 #db3399。
   *
   * 【为什么「赛事报名」不带 requires】
   * requires 是给「被降级为只读」的市州端用的（city 那块写的是 requires: 'reportCreate'，
   * 判定见文件末尾 MENU_REQUIREMENTS）。中小学端是要报名的端，
   * 加上会被判成不可见 —— 菜单里直接少一项，而路由又是通的，很难查。
   * 与 school 一致，不加。
   *
   * 【key 必须叫 primary】Sidebar 用 resolveLayoutKey(route.path) 取路径首段来查这张表
   * （见本文件末尾），/primary/... 的首段就是 'primary'。key 若对不上，
   * 侧边栏整块渲染不出来（不报错，就是空的）。
   */
  primary: {
    title: YILINBEI_TITLE,
    activeTextColor: '#db3399',
    keepAlive: true,
    items: [
      { index: '/primary/index', text: '首页', label: '首页', icon: 'el-icon-s-home' },
      { type: 'line', text: '—— 网上报名 ——' },
      { index: '/primary/elementary/create', text: '赛事报名', label: '赛事报名', icon: 'el-icon-s-flag' },
      { type: 'line', text: '—— 报名信息 ——' },
      { index: '/primary/elementary/list', text: '报名汇总', label: '报名汇总', icon: 'el-icon-help' }
    ]
  },

  /* ---------- 在线展演 (无角色限制) ---------- */
  online: {
    title: XIBU_TITLE,
    activeTextColor: '#db3399',
    keepAlive: true,
    items: [
      { index: '/online/index', text: '首页', label: '首页', icon: 'el-icon-s-home' },
      { type: 'line', text: '—— 现场展演信息 ——' },
      { index: '/online/list', text: '展演节目列表', label: '展演节目列表', icon: 'el-icon-s-flag' }
    ]
  }
}

/**
 * 从当前路径推断所属 layout key
 * 例：/admin/report -> 'admin'
 */
export function resolveLayoutKey(path) {
  const seg = (path || '').split('/')[1]
  return LAYOUT_MENUS[seg] ? seg : ''
}

/** 取某个 layout 的菜单配置 */
export function getLayoutMenu(path) {
  return LAYOUT_MENUS[resolveLayoutKey(path)] || null
}

/* =========================================================================
 * 菜单项的可见性（按当前登录角色）
 * ========================================================================= */

/**
 * 能力名 -> 判定函数（形参是当前登录用户的 user.type）
 *
 * 菜单项在配置里写 `requires: '能力名'`，Sidebar 拿登录角色来这里查表。
 * 判据全部落在 @/config/roles.js 上，本表只做"能力名 -> 判定"的映射，
 * 不在这里重新拼角色数字。
 */
export const MENU_REQUIREMENTS = {
  /** 赛事报名入口：市州端不可见（学校端照旧）*/
  reportCreate: (type) => !isViewOnlyScope(type)
}

/**
 * 某一菜单项对给定角色是否可见
 *
 * 【能力名写错时按「不可见」处理（fail-closed）】
 * 菜单是权限的表现层，两种出错方向代价不对等：
 *   - 误判为不可见：只少显示一项，而且开发时一眼就能看出来；
 *   - 误判为可见：市州端会重新露出赛事报名入口，正是本次改造要消除的东西。
 * 所以查不到能力名时不放行。
 * （真正防越权的是 router/guard.js，菜单只管显示。）
 */
export function isMenuItemVisible(item, type) {
  if (!item || !item.requires) return true
  const check = MENU_REQUIREMENTS[item.requires]
  return check ? check(type) : false
}
