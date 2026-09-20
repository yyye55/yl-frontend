/**
 * 各角色 Layout 的侧边栏菜单定义
 *
 * 【可信度：A】逐项照搬 dist 中 6 个 layout chunk 的 el-menu 渲染函数。
 * 证据文件（dist/）：
 *   admin      -> chunk-40286ec0
 *   committee  -> chunk-77f01b0c
 *   province   -> chunk-470ebdb5
 *   city       -> chunk-3058b73e
 *   school     -> chunk-16e50bab
 *   online     -> chunk-4c9a67a5
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
 *
 * 【分组分隔线】dist 中为 `div.line > div`，文案含前后各两个破折号，原样保留。
 *
 * 【keepAlive】dist 中 el-main 的内容分两种写法：
 *   admin / committee：  t("el-main",[t("router-view")],1)
 *   province / city / school / online：
 *     t("el-main",[ t("keep-alive",[ e.$route.meta.keepAlive ? t("router-view") : e._e() ],1),
 *                   e.$route.meta.keepAlive ? e._e() : t("router-view") ],1)
 * 即只有后 4 个 layout 包了 keep-alive，由路由的 meta.keepAlive 决定是否缓存。
 * 【注意】dist 中没有任何一条路由设置了 meta.keepAlive，因此该分支实际恒为 false，
 * 效果与不写 keep-alive 相同。这里按原样保留结构，不额外启用缓存。
 */

/** 意林杯系列 layout 共用的品牌标题（dist 原文含全角右引号，故意保留原样） */
const YILINBEI_TITLE = ['意林杯”四川省第十一届', '管乐展示活动']
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
      // dist 原文：菜单显示「扫描件列表」，但 tab 标题是「参展扫描件列表」
      { index: '/committee/scan', text: '扫描件列表', label: '参展扫描件列表', icon: 'el-icon-picture-outline' },
      { type: 'line', text: '—— 账号管理 ——' },
      { index: '/committee/user', text: '用户管理', label: '用户管理', icon: 'el-icon-user' }
    ]
  },

  /* ---------- 省级 (type=4) ---------- */
  province: {
    title: XIBU_TITLE,
    activeTextColor: '#db3399',
    keepAlive: true,
    items: [
      { index: '/province/index', text: '首页', label: '首页', icon: 'el-icon-s-home' },
      { type: 'line', text: '—— 网上报名 ——' },
      { index: '/province/elementary/create', text: '中小学组节目报名', label: '中小学组节目报名', icon: 'el-icon-s-flag' },
      { index: '/province/teacher/create', text: '中小学教师组节目报名', label: '中小学教师组节目报名', icon: 'el-icon-s-shop' },
      { index: '/province/school/create', text: '大学组节目报名', label: '大学组节目报名', icon: 'el-icon-s-flag' },
      { index: '/province/teacher1/create', text: '高校教师组节目报名', label: '高校教师组节目报名', icon: 'el-icon-star-off' },
      { type: 'line', text: '—— 报名信息 ——' },
      { index: '/province/report/list', text: '节目统计', label: '节目统计', icon: 'el-icon-help' },
      { index: '/province/recommend/index', text: '优秀组织奖申报', label: '优秀组织奖申报', icon: 'el-icon-s-goods' }
    ]
  },

  /* ---------- 市级 (type=1) ---------- */
  city: {
    title: YILINBEI_TITLE,
    activeTextColor: '#003366',
    keepAlive: true,
    items: [
      { index: '/city/index', text: '首页', label: '首页', icon: 'el-icon-s-home' },
      { type: 'line', text: '—— 网上报名 ——' },
      { index: '/city/elementary/create', text: '赛事报名', label: '赛事报名', icon: 'el-icon-s-flag' },
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
      { type: 'line', text: '—— 报名信息 ——' },
      { index: '/school/elementary/list', text: '报名汇总', label: '报名汇总', icon: 'el-icon-help' }
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
