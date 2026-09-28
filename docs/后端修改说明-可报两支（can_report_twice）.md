# 后端修改说明：用户「可报两支」特许（`can_report_twice`）

- 对接前端：`src/views/admin/user.vue`（管理员端 `/admin/user`）
- 后端基线：`ea12de8`
- **姊妹文档**：《后端修改说明-用户所属市州（parent_id）》
  —— 那份讲 `parent_id`（**改动一 / 改动二**），本文讲 `can_report_twice`（**改动三 / 改动四**）。
  **两处改的是同样两个函数**，建议**一起做**。
- **结论先说**：
  - **界面上已经限制住了**（勾选框只在「中小学账号」出现），但**数据层完全没有限制**。
  - 后端**只有 2 处**要改，都在 `apps/api/views.py`，**不要新建 migration**。
  - 不改的后果是**静默的**：一条 `type=0` 却带着 `can_report_twice=true` 的账号，
    报名配额会从 1 支变成 2 支，而界面上完全看不出来。
- **阅读顺序**：只想知道要改什么 → 看**第零节**、**第三节**、**第七节**。

---

## 零、要改的文件：只有一个

**`apps/api/views.py`** —— 与 parent_id 那份是**同样的两个函数**，不用碰任何其它文件。

完整审计：**整个后端所有能写 `can_report_twice` 的地方**（全仓库 grep 逐条核对，一条不漏）。

| # | 位置 | 是什么 | 要改吗 |
|---|---|---|---|
| 1 | `apps/api/views.py:557-558` | `user_update_admin`（管理员/组委会改用户） | **要改**（改动三） |
| 2 | `apps/api/views.py:576-577` | `user_create_admin`（管理员/组委会建用户） | **要改**（改动四） |

字段定义在 `apps/core/models.py:93`：

```python
can_report_twice = models.BooleanField(default=False)
```

**只有这两条写入路径，而两条都不判 `type`。**

---

## 一、这个字段是什么：**它不是展示字段，是报名配额开关**

`apps/core/report_drafts.py:171-181`：

```python
if scope in ACCOUNT_QUOTA_SCOPES:                          # = (TYPE_SCHOOL=0, TYPE_PRIMARY_SECONDARY=5)
    account_limit = 2 if getattr(user, "can_report_twice", False) else 1
    if queryset.count() >= account_limit:
        ...
```

三个必须知道的事实：

| 事实 | 后果 |
|---|---|
| **判据是 `scope ∈ (0, 5)`，不是 `type == 5`** | `scope` 就是账号自己的 type（`views.py:132`：`scope = 4 if province else user.type`）。所以 **scope 0（高校端）也参与** —— 一条 `type=0` 账号带着 `true`，**一样能报 2 支** |
| **默认 `False`，但"默认"不等于"强制"** | 两条写入路径都不判 type，直连接口可以把它设成 `true` |
| **它泄漏的是规则明令限 1 支的那个渠道** | 红头文件「每所学校限报一支队伍」**同时适用于高校端与中小学端**（`report_drafts.py:160`） |

> **产品意图 vs 代码现实**
> 意图是"特许只发给中小学合并办学的学校"（前端勾选框 `v-if="type === 5"`，
> 后端注释也写着"特许只发给学校账号"）；
> 现实是 —— **这条限制只存在于前端界面上，数据层没有对应判据。**

---

## 二、问题：界面上限制了 ≠ 数据层保证

`can_report_twice` 的值进入数据库有**四条路，只有一条经过界面**：

| 数据从哪来 | 界面能拦住吗 |
|---|---|
| ① 现在的前端（**已修**） | ✅ 拦住了 |
| ② 老页面（用户没强刷，还在跑旧代码） | ❌ 拦不住，它会发 `true` |
| ③ 直连接口（有 token 就能调 `PUT` / `POST`） | ❌ 拦不住 |
| ④ 库里**已经存在**的脏数据 | ❌ 界面连"清"都做不到 |

**第 ② 条不是假设。** 修复前的前端**实测发出过**：

```json
{"type":0,"can_report_twice":true,"parent_id":7}
```

而**今天的后端会收下它、建出一个脏账号**。也就是说这个界面限制**已经被界面自己绕过了一次**。

**第 ④ 条更隐蔽，而且自愈不了。** 「修改用户」弹窗发的是**整行深拷贝**，
而 `user_dict`（`apps/core/services.py:62`）把 `can_report_twice` 也返回：

```python
"can_report_twice": bool(getattr(user, "can_report_twice", False)),
```

于是 —— 界面上**看不到**这个勾选框，但请求体里**带着它**，值就是库里那个 `true`；
后端 `if "can_report_twice" in data` 照收 → **写回去还是 `true`**。

结果：**脏数据在界面上永远洗不掉**，管理员每次编辑它，脏值就被重新确认一次。
（对比 `parent_id`：改动一上线后就能自愈。这个字段目前没有这条出路。）

---

## 三、要改的两处

### 改动三 · `user_update_admin`（`apps/api/views.py:551`）：加类型判据

**现状**（只做布尔归一化，不判 type）：

```python
    if "can_report_twice" in data:
        user.can_report_twice = _as_bool(data["can_report_twice"])
```

**改法**：抽一个与 `_apply_parent_id` 并列的共用函数，非中小学**归 `false` 自愈**。

```python
def _apply_can_report_twice(user, data):
    """设置账号的「可报两支」特许，保证不变量：**只有中小学账号（type=5）才可能有它**。

    【必须在 user.type 已经定下来之后调用】本函数用 user.type 做判据，
    与 _apply_parent_id 同规矩。

    【为什么非中小学是「归 false」而不是报错】
    user_update_admin 是**整对象更新** —— 库里一条 type=0 + can_report_twice=true
    的脏数据，如果这里报错，管理员连它的名字都改不了（与 _apply_parent_id 同一个理由）。

    【为什么非中小学是「归 false」而不是「保持原值」】
    保持原值 = 脏数据永远洗不掉（见第二节第 ④ 条）。
    """
    if _account_type(user) != User.TYPE_PRIMARY_SECONDARY:
        user.can_report_twice = False          # 不该有 → 自愈
        return
    if "can_report_twice" in data:             # 是中小学 → 只有调用方真传了才改
        user.can_report_twice = _as_bool(data["can_report_twice"])
```

调用位置 —— **顺序不能变**，两个 helper 都读 `user.type`，必须等 `setattr` 循环把 type 定下来之后：

```python
def user_update_admin(request):
    data = body(request); user = User.all_objects.filter(pk=data.get("id")).first()
    if not user: return response(failure("用户不存在"))
    # can_report_twice 是报名特许，只能由管理员/组委会授予，不能让学校自助提权
    for k in ("username", "nickname", "description", "tel", "leader", "type"):
        if k in data: setattr(user, k, data[k])
    # 【顺序不能变】下面两个 helper 都读 user.type，必须等上面把 type 定下来
    if "parent_id" in data or _account_type(user) != User.TYPE_PRIMARY_SECONDARY:
        err = _apply_parent_id(user, data.get("parent_id"))
        if err: return err
    _apply_can_report_twice(user, data)        # ← 本次新增，替换原来的两行裸赋值
    if "password" in data: user.set_password(RESET_PASSWORD_DEFAULT)
    user.save(); write_log(request.auth, 1, "修改用户 " + user.username)
    return response(success())
```

> `_account_type` 是姊妹文档里定义的归一化函数（把 `user.type` 归一成 int，
> 解析不出来时返回 `None`，绝不抛异常）。
> **两处必须共用它** —— 否则守卫和 helper 可能对同一个字符串 `"5"` 判断不一致，
> 出现"守卫放行、helper 按中小学处理"的分叉。

---

### 改动四 · `user_create_admin`（`apps/api/views.py:564`）：加类型判据 + 把归一化提前

**现状**：`can_report_twice` 只做了一次布尔归一化，**没有和 `type` 做匹配检查**。

**改法**：把 `int(values.get("type"))` 这层归一化**提到两个校验之前**
（`parent_id` 与 `can_report_twice` 两处判据都要用它），再加一条判断。

```python
def user_create_admin(request, committee=False):
    data = body(request); values = {k: data.get(k) for k in ("username", "nickname", "description", "tel", "leader", "type") if k in data}
    values["parent_id"] = 0
    if committee:
        values["type"] = 0                       # ← 先定死类型
    # 【类型归一化提到两个校验之前】parent_id 与 can_report_twice 两处判据都要用它；
    # committee 那行已经在上面执行过，所以这里读到的一定是最终类型。
    try:
        new_type = int(values.get("type"))
    except (TypeError, ValueError):
        new_type = None
    # 中小学账号（type=5）可在创建时指定所属市州（parent_id 必须指向 type=1 的市州账号）
    requested_parent = data.get("parent_id")
    if requested_parent not in (None, "", 0, "0"):
        if new_type != User.TYPE_PRIMARY_SECONDARY:
            return response(failure("只有中小学账号可以设置所属市州"))
        parent = User.objects.filter(pk=requested_parent).first()
        if parent is None:
            return response(failure("上级账号不存在"))
        if parent.type != User.TYPE_CITY:
            return response(failure("上级账号必须是市州账号"))
        values["parent_id"] = parent.id
    # 【本次新增】「可报两支」是中小学合并办学的特许，其它类型一律拒绝
    if "can_report_twice" in data:
        values["can_report_twice"] = _as_bool(data["can_report_twice"])
        if values["can_report_twice"] and new_type != User.TYPE_PRIMARY_SECONDARY:
            return response(failure("只有中小学账号可以报送两支队伍"))
    user = User(**values)
    user.set_password(data.get("password", "")); user.save()
    write_log(request.auth, 2, "创建用户用户 " + user.username)
    return response(success("添加成功"))
```

#### 为什么 create 是**报错**、update 是**归 false** —— 与 parent_id 那份完全同构

两条路径对同一件事（"非中小学不该有这个特许"）处理方式不同，因为**操作性质不一样**：

| | 调用方在做什么 | 报错的代价 | 所以 |
|---|---|---|---|
| **create** | 明确要求"新建一个带特许的账号" | **无代价** —— 前端发不出来（勾选框只在 `type===5` 渲染，切类型时 `@change` 会清掉） | **报错**。告诉调用方"这条路由给不了你要的东西" |
| **update** | 整对象更新，改个名字也会把整行发回来 | **很大** —— 库里一条脏数据会让管理员**连名字都改不了** | **归 false 自愈**，不报错 |

> 一句话记法：**create 是"新建"，报错不伤谁；update 是"改存量"，报错会锁死编辑。**
> 两边都保证同一条不变量 —— **只有 `type=5` 的账号，`can_report_twice` 才可能是 `true`。**

---

## 四、验证清单（已用真数据实测，**14/14 通过**）

改完之后建议这样验证（不需要前端配合，直接打接口）：

| # | 操作 | 期望 |
|---|---|---|
| 1 | `PUT`，账号 `type=0` 且库里是 `can_report_twice=true`，只改 `nickname`、**不传这个键** | 改名成功，特许被**自动清成 `false`**，**不报错** |
| 2 | `PUT`，账号 `type=0`，**不传**这个键 | 通过，保持 `false` |
| 3 | `PUT`，账号 `type=0`，显式传 `can_report_twice: true` | 通过，但落库是 **`false`**（直连也塞不进） |
| 4 | `PUT`，账号 `type=5`，传 `true` | 通过，落库 **`true`**（正常授予） |
| 5 | `PUT`，账号 `type=5` 且库里已是 `true`，**不传**这个键 | 通过，**保持 `true`**（键不传 = 不动） |
| 6 | `PUT`，把 type 从 **5 改成 0**，同时传 `true` | 类型改成功，特许清成 `false`（**必须用改后的 type 判**：先 setattr、后校验） |
| 7 | `PUT`，`type` 传**字符串** `"5"` + `true` | 与传数字 5 结果相同（归一化生效） |
| 8 | `PUT`，`type` 传**字符串** `"0"` + `true` | 清成 `false` |
| 9 | `POST /api/admin/user/`，`type: 0` + `true` | 返回「只有中小学账号可以报送两支队伍」 |
| 10 | `POST /api/admin/user/`，`type: 0` + `false` | 通过，落库 `false`。**前端实际发的就是这个形状，不能误伤** |
| 11 | `POST /api/admin/user/`，`type: 0` + **不带**这个键 | 通过，默认 `false` |
| 12 | `POST /api/admin/user/`，`type: 5` + `true` | 通过，落库 `true` |
| 13 | `POST /api/committee/user/`，`type: 5` + `true` | 返回「只有中小学账号可以报送两支队伍」（committee 强制 `type=0`，**必须被拒**） |
| 14 | `POST /api/admin/user/`，`type: 5` + **不带**这个键 | 通过 |

**第 1 条和第 3 条是重点**：它们分别覆盖"存量脏数据自愈"和"直连接口也塞不进"。
**第 10 条也必须测** —— 前端在非中小学账号上发的是显式 `false`，不能被误判成"要设特许"。

---

## 五、存量数据：跑一次 SQL

改动三**只在账号被编辑时**自愈。**没人碰的脏账号会永远脏着。** 建议先查、再清：

```sql
-- 先查：非中小学却带着「可报两支」特许（每一条都在多给一支队伍的名额）
SELECT id, type, username, nickname, can_report_twice
FROM users
WHERE can_report_twice = true AND type <> 5;

-- 再清（确认上面结果符合预期后再执行）
UPDATE users SET can_report_twice = false WHERE can_report_twice = true AND type <> 5;
```

要不要带 `deleted_at IS NULL` 由你们定 —— 软删除的行留着 `true` 也不会被登录取用。

---

## 六、不要做的事

**① 不要改报名口径。**
`ACCOUNT_QUOTA_SCOPES = (TYPE_SCHOOL, TYPE_PRIMARY_SECONDARY)`、scope 5 的组别白名单
（小学组 / 中学组）、`assert_report_group_unique` —— 这些都是组委会定的规则，**一个字都不要动**。

本文只做一件事：**让 `can_report_twice` 这个开关只对中小学账号可授予。**
"哪些渠道能报几支"的规则本身，不属于本需求。

**② 不要试图靠"前端不发这个字段"来解决。**
「修改用户」弹窗发的是整行深拷贝，"不发" = 后端 `"x" in data` 为假 = **不改动**
= 库里的脏值**原封不动**（见第二节第 ④ 条）。
而且管理员**看不到也清不掉**它（界面上没这一项）。
方向必须反过来：**让后端有判据并归 `false`** —— 这正是改动三用"归 false 自愈"的原因。

---

## 七、一句话总结

**界面负责"让人选不出错"，后端负责"让数据错不了"。**

- `parent_id` 已经按后者做了（姊妹文档的改动一 / 改动二），**`can_report_twice` 漏了**。
- 要改的只有 **2 处**，都在 `apps/api/views.py` 的两个函数里，与 `parent_id` 的改动**完全同构**：
  - **改动三**（`user_update_admin`）：非 `type=5` → **归 `false` 自愈**，不报错。
  - **改动四**（`user_create_admin`）：非 `type=5` 且要设 `true` → **报错拒绝**。
- 不改的后果**静默且实际**：一条 `type=0` 却带着 `true` 的账号，报名配额从 1 支变 2 支，
  而且**发生在规则明令限 1 支的渠道上**，界面上完全看不出来。
