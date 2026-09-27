/**
 * 账号 / 密码的长度口径 —— 全站唯一来源
 *
 * 【为什么要收敛到这一个文件】
 * 涉及账号、密码的输入框散在 4 个页面共 6 处，原先各写各的，跑出四套数：
 *   登录 3-15 / 5-15、添加账号 2-20 / 6-32、自助改密 8-20、重置密码 无长度限制。
 * 后果不是"看着不整齐"，而是真实的数据锁死：管理员按 6-32 建一个 20 位密码的账号，
 * 用户输入完全正确，却被登录页的 max:15 拦下，连请求都发不出去。
 * 现在这些数字只有一份，改一处就是全站改。
 *
 * 【后端不校验】后端（Django）对账号/密码的长度、格式一律不校验，只靠
 * User.username 的 max_length=30。所以这一层是**唯一**的一层，
 * 数字定错没有第二道防线兜底。ACCOUNT_MAX=20 < 30，不会撞到数据库上限。
 *
 * 【登录页为什么不判长度 —— 别"顺手补回来"】
 * 登录页是"读"（校验存量的凭证），其余入口是"写"（决定新建什么）。
 * 读的口子判长度不提供任何安全性（攻击者不会走 UI 提交），只提供锁定风险：
 * 存量账号的密码是历史上按 6-32 建的，登录页任何小于 32 的上限都会把它们挡在门外。
 * 因此 login/index.vue 只判必填，长度规则整条删除 —— 这是刻意的，不是漏写。
 */

export const ACCOUNT_MIN = 3
export const ACCOUNT_MAX = 20

export const PASSWORD_MIN = 6
export const PASSWORD_MAX = 20

export const MSG_ACCOUNT_LENGTH = `长度在 ${ACCOUNT_MIN} 到 ${ACCOUNT_MAX} 个字符`
export const MSG_PASSWORD_LENGTH = `长度在 ${PASSWORD_MIN} 到 ${PASSWORD_MAX} 个字符`

/**
 * 【checkPasswordInput 为什么没了 —— 别当成漏写补回来】
 *
 * 这里原本还导出一个 checkPasswordInput(value)，专供 ElMessageBox.prompt 的
 * inputValidator，也是全仓唯一一个按 EP 那套契约（返回字符串 = 红字提示、
 * 返回 true = 放行）写的校验函数，所以不能和 el-form 的 rules 合并。
 *
 * 它只有两个调用方：admin/user.vue 与 committee/user.vue 的「重置密码」。
 * 那两处已经改成 ElMessageBox.confirm —— 不再由操作者指定新密码，
 * 一律重置为 DEFAULT_PASSWORD（见 src/config/defaultPassword.js），
 * 没有输入框可校验，函数随之失去全部调用方，于是删除。
 *
 * 【它当初防的是什么，现在还防不防】
 * 防的是「空输入被当成重置成功」：后端旧写法 `if data.get("password")` 对空串
 * 不成立，于是密码没改、接口却返回 success()。这个坑现在从根上没有了 ——
 * 请求体里的 password 由页面写死成默认口令，不可能为空、也不可能是一串空格。
 */
