/**
 * 重置密码的默认口令 —— 前端唯一来源
 *
 * 【它出现在哪三处，为什么必须是一份】
 *   1. /admin/user 与 /committee/user 的「重置密码」—— 点确定后真正被写进库里的口令；
 *   2. 两个页面表格上方的提示语「提示：重置密码后恢复为默认密码：…」；
 *   3. 登录页 views/login/index.vue —— 用户输入的口令等于它时，登录前会弹提醒改密码。
 * 第 1 处写错 = 提示语骗人、用户拿着提示语里的口令登不进去；
 * 第 3 处写错 = 那条提醒永远不弹（不报错，静默失效，最难发现）。
 *
 * 【后端也有一份，最终生效的是后端那份】
 *   apps/api/views.py  RESET_PASSWORD_DEFAULT = "scylb@2026"
 *   apps/api/views.py  user_update_admin 里 `if "password" in data: user.set_password(...)`
 * 即请求体里只要**出现** password 键，它的**值被忽略**，一律重置为上面那个常量。
 * 所以这个文件改了、后端那份不改，前端提示的和实际生效的仍对不上，两处要一起改。
 *
 * 【刻意不写后端行号】后端一天多次提交，行号每次都会漂（实测：同一天从 :565 漂到 :592）。
 * 要定位就按常量名 RESET_PASSWORD_DEFAULT 或函数名 user_update_admin 搜，别按行号找。
 *
 * 【前端为什么仍把真值发过去】「值被忽略」是后端当前实现的约定，不是协议。发真值意味着
 * 不依赖它：万一后端退回旧写法 `if data.get("password"): set_password(data["password"])`，
 * 发真值的结果与现在完全一致；发空值则变成「什么也不改、接口仍返回成功」的静默失败。
 */
export const DEFAULT_PASSWORD = 'scylb@2026'
