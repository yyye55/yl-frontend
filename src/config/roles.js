/**
 * 角色常量 + 「市州端只读」判定
 *
 * 【为什么单开一个文件】
 * 「市州端不再具有赛事报名权限，只保留报名信息查看权限」这条规则同时约束三处
 * 互不相干的代码 —— 侧边栏菜单（config/menus.js）、首页按钮（views/city/index.vue）、
 * 报名列表操作列（components/elementary/ReportList.vue），以及路由守卫
 * （router/guard.js）。若各处自己写 `type === 1`，一旦业务再调整（市州端恢复报名、
 * 或省级端重新上线）就得满仓搜数字。这里收敛成唯一入口。
 *
 * 【取值来源】user.type —— 与 utils/auth.js 的 localStorage.user、
 * store/modules/user.js 的 userType getter 同源。
 * 本文件只处理「一个角色值」，不读存储；读存储在
 * composables/usePermission.js（组件内）与 router/guard.js（守卫内）做。
 *
 *   0 = 学校端   1 = 市州端（市级）   2 = 组委会   3 = 管理员   5 = 中小学端
 *
 * 【为什么没有 4】type=4 是省级，已下线（路由、菜单、ROLE_HOME 都没有它）。
 * 数字 4 这个坑**继续空着**，不复用 —— 后端 user.type 已经发过 4 这个值给历史账号，
 * 前端若把它改成别的含义，那些账号会莫名进到一个不相干的端。
 * 【为什么中小学端是 5 而不是 4】同一个理由：4 被占过了。
 */

export const ROLE = {
  SCHOOL: 0,
  CITY: 1,
  COMMITTEE: 2,
  ADMIN: 3,
  PRIMARY: 5
}

/**
 * 该角色是否只读（不能创建 / 编辑 / 删除 / 提交报名，不能上传盖章扫描件）
 *
 * 目前只有市州端只读；学校端、中小学端照旧可写。
 * 判定必须基于登录用户角色，不基于 URL 或菜单文案 ——
 * 手敲 /city/elementary/create 也要被 router/guard.js 拦下，那里调用的是同一个函数。
 *
 * 【为什么中小学端（type=5）不需要在这里加分支】
 * 本函数问的是「是不是那个被降级的市州端」，答案只对 type=1 成立。
 * 新增的 type=5 天然落在 false 这一侧 —— 也就是"可写"，这正是中小学端要的行为。
 * type 不在这里列举，新增端时**默认是可写的**，要收紧才来这里加。
 *
 * @param {number} type 当前登录用户的 user.type
 * @returns {boolean}
 */
export function isViewOnlyScope(type) {
  return type === ROLE.CITY
}

export default { ROLE, isViewOnlyScope }
