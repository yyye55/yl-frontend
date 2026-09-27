/**
 * 重置密码的默认口令 —— 前端唯一来源
 *
 * 【它出现在哪三处，为什么必须是一份】
 *   1. 管理员端 /admin/user 与组委会端 /committee/user 的「重置密码」——
 *      点确定后真正被写进库里的那个口令；
 *   2. 同一个页面上表格上方的提示语「提示：重置密码后恢复为默认密码：…」；
 *   3. 登录页 views/login/index.vue —— 用户输入的口令等于它时，登录前会先弹
 *      「系统监测到，密码为初始密码，请登录系统后在右上角的[修改信息]中修改密码」。
 * 三处说的是同一件事：第 1 处写错 = 提示语骗人、且用户拿着提示语里的口令登不进去；
 * 第 3 处写错 = 那条提醒永远不弹（不报错，只是静默失效，最难发现）。
 *
 * 【后端也有一份，且后端才是最终生效的那个】
 *   yilinbei hou/apps/api/views.py:521  `RESET_PASSWORD_DEFAULT = "scylb@2026"`
 *   yilinbei hou/apps/api/views.py:543  `if "password" in data: user.set_password(RESET_PASSWORD_DEFAULT)`
 * 即：请求体里只要**出现** password 这个键，它的**值被忽略**，一律重置为上面那个常量。
 * 所以这个文件改了、后端那份不改，前端提示的和实际生效的仍然对不上。两处要一起改。
 *
 * 【前端为什么还是把真值发过去，而不是发个占位字符串】
 * 「值被忽略」是后端当前实现的一条约定，不是协议。发真值意味着不依赖它：
 * 万一后端退回旧写法 `if data.get("password"): user.set_password(data["password"])`，
 * 发真值的结果与现在完全一致；发空值则变成「什么也不改、接口仍返回成功」的静默失败。
 */
export const DEFAULT_PASSWORD = 'scylb@2026'
