# 后端修改说明：用户「所属市州」（`parent_id`）

- 对接前端：`src/views/admin/user.vue`（管理员端 `/admin/user`）、`src/views/committee/user.vue`（组委会端 `/committee/user`）
- 后端基线：`ea12de8`
- **本文只讲 `parent_id`**（本文改动一 / 改动二）。
  同一需求还有一份**姊妹文档**：《后端修改说明-可报两支（can_report_twice）》——
  那份讲 `can_report_twice`（它的改动三 / 改动四），**改的是同样两个函数**，
  且那条**也是必做**（详见该文档第一节），**两份建议一起做**。
- **结论先说**：这个功能**不需要后端新增或修改任何接口**，前端用的全是现有契约。
  **本文需要动的代码是 2 处，都在 `apps/api/views.py` 一个文件里**（第三节）：
  - **改动一（必做）**：`user_update_admin` 缺 `parent_id` 校验，也缺「被改账号必须是 `type=5`」这道判断。
    因为 `parent_id` 是 `db_constraint=False` 的外键，**数据库层没有约束兜底**，接口校验是唯一一道防线。
  - **改动二**：`user_create_admin` 补类型判断 + 把 `committee` 赋值**提到校验之前**。
  - 两处**都不阻塞前端上线**（前端在 UI 层已经挡住），但接口层是通的。
  - 另有 **4 条顺带发现的相邻问题**（第七节）：**第 7 条（7.3）是必做，已单独成文**；
    第 5、6 条你们判断；第 7.4 条是前端的事，写在这里只是同步信息。
- **阅读顺序**：只想知道要改什么 → 看**第零节**、**第三节**、**第八节**。

---

## 零、后端要改的文件：**只有一个**

**`apps/api/views.py`** —— 就这一个文件，不用碰任何其它文件，**不要新建 migration**（不动 schema）。

下面是完整审计：**整个后端所有能写 `users.parent_id` 的地方**（按全仓库 grep 逐条核对，一条不漏）。

| # | 位置 | 是什么 | 能写 `parent_id` | 要改吗 |
|---|---|---|---|---|
| 1 | `apps/api/views.py:551` | `user_update_admin`（管理员/组委会改用户） | ✅ 白名单 `:555` 里有 | **要改**（改动一） |
| 2 | `apps/api/views.py:564` | `user_create_admin`（管理员/组委会建用户） | ✅ `:566 / :568 / :575` | **要改**（改动二） |
| 3 | `apps/api/views.py:313` | `user_update`（**用户自助改资料**） | ❌ 白名单 `:321` 只有 `username / nickname / description / tel / leader` | 不用动 |
| 4 | `apps/api/management/commands/import_laravel_data.py:23-24` | 一次性导入 Laravel 老数据的脚本 | ✅ 但只在手工跑导入时执行 | 不用动 |

**第 3 条是重点，请特别留意**：这是"用户改自己资料"的接口。它的白名单里**没有** `parent_id`，
所以一个中小学账号**没有办法把自己的归属改到别的市州**（那等于自选数据范围）。
这是一个**已经做对了**的地方 —— **不要动它**，也不要在改动一里"顺手统一"把它加进去。

**其它相关但不用改的文件**：

| 文件 | 为什么不用改 |
|---|---|
| `apps/core/services.py:56`（`user_dict`） | 已经在 `:63` 返回 `parent_id` 了。**特意不要动**，理由见第四节 |
| `apps/core/services.py:66`（`subordinate_school_ids`） | 数据范围的消费方，逻辑正确 |
| `apps/core/models.py:96-97`（`parent` 字段） | 字段定义已够用，不用迁移。但**必须了解它的三个特性**，见第一节 |

---

## 一、这个字段是什么：`users.parent_id`

它不是普通整数字段，是一个**自引用外键**（`apps/core/models.py:96-97`）：

```python
parent = models.ForeignKey("self", null=True, blank=True, on_delete=models.DO_NOTHING,
                           db_column="parent_id", related_name="children", db_constraint=False)
```

它的语义后端自己写在 `apps/core/services.py:66-75`：

```python
def subordinate_school_ids(city_user):
    """归属于该市州账号的中小学账号（type=5）id 列表。
    市州端查看下级学校报名情况的统一数据范围来源：parent_id 指向该市州账号。
    """
    return list(
        User.objects.filter(
            parent_id=city_user.id, type=User.TYPE_PRIMARY_SECONDARY
        ).values_list("id", flat=True)
    )
```

即：**中小学账号（type=5）的 `parent_id` 指向所属市州账号（type=1）的 id**；
其它类型（0 / 1 / 2 / 3）这个字段无业务含义。`0` 和 `NULL` 都表示"没有归属"。

### 改代码前必须知道的三个特性

| 特性 | 后果 |
|---|---|
| **`db_constraint=False`** | **数据库层没有外键约束** —— 一个不存在的 id 能真的写进表里，数据库不拦。**接口层校验是唯一一道防线**，这是改动一必须做的根本原因 |
| **`null=True, blank=True`** | 列可以为 `NULL`。但既有代码的"没有归属"写法是 `values["parent_id"] = 0`（`:566`），所以库里**两种"没有归属"并存**。校验时两种都要当"空"放过 |
| **`on_delete=DO_NOTHING`** | 删账号**不会**级联清理；加上 `user_delete_admin` 用的是软删除，所以删掉市州后下属中小学的 `parent_id` **一定**会悬空 —— 第七节 7.1 的根因 |

> **⚠️ 这不是一个纯展示字段。** `parent_id` 是市州端数据范围的**唯一来源**。
> 把一所中小学的归属从 A 市改到 B 市，等于 **A 市从此看不到它、B 市能看到了**。
> 前端在两个弹窗的下拉下面都加了同一行提示：
> 「归属决定该市州端能看到哪些中小学账号的报名，请谨慎修改。」

---

## 二、前端现状（**已经能用，不需要后端配合**）

| 位置 | 内容 |
|---|---|
| 管理员端 / 组委会端列表 | 新增「所属市州」列（两页渲染表达式逐字一致） |
| 管理员端「添加用户」弹窗 | **仅当选中小学账号（type=5）**时出现「所属市州」下拉 |
| 管理员端「修改用户」弹窗 | **仅当该账号是 type=5** 时出现该下拉，可改、可清空 |
| 市州名字从哪来 | 前端额外调一次 `GET /api/admin/user/list?page=1&limit=1000&type=1`，本地建 `{id: 名称}` 对照表 |

**前端没有新增任何接口、没有新增任何请求字段。** 全部落在现有契约上：

| 环节 | 后端现状 | 位置 |
|---|---|---|
| 列表读 | `user_dict` **已返回 `parent_id`** | `apps/core/services.py:63` |
| 修改写 | `user_update_admin` 的字段白名单**已含 `parent_id`** | `apps/api/views.py:555` |
| 新增写 | `user_create_admin` **已支持并校验** `parent_id` | `apps/api/views.py:566-575` |

组委会端（`/api/committee/user/...`）走的是**同一套 handler**（`register_user_routes`，
`:603` 定义、`:631` 注册 `/admin`、`:632` 注册 `/committee`），所以读这一侧也是现成的。

**组委会端页面没有任何写入按钮**（只有「重置密码」，发的是 `{id, password}` 两个字段，
不带 `parent_id`），所以那边不需要改。

---

## 三、需要后端改的两处

### 改动一 · `user_update_admin`（`apps/api/views.py:551`）：给 `parent_id` 加校验

**现状**（`parent_id` 混在白名单里被无条件 `setattr`，一道校验都没有）：

```python
def user_update_admin(request):
    data = body(request); user = User.all_objects.filter(pk=data.get("id")).first()
    if not user: return response(failure("用户不存在"))
    # can_report_twice 是报名特许，只能由管理员/组委会授予，单独归一化，不能让学校自助提权
    for k in ("username", "nickname", "description", "tel", "leader", "type", "parent_id"):
        if k in data: setattr(user, k, data[k])
    if "can_report_twice" in data:
        user.can_report_twice = _as_bool(data["can_report_twice"])
    if "password" in data: user.set_password(RESET_PASSWORD_DEFAULT)
    user.save(); write_log(request.auth, 1, "修改用户 " + user.username)
    return response(success())
```

**问题**：`user_create_admin` 有两道校验（父账号存在 + 必须是市州），这里**一道都没有**。

**后果**：直接打接口可以把它改成**不存在的 id**，或指向一个**学校账号**。
`subordinate_school_ids()` 完全信任这个值 —— 它的过滤条件是 `parent_id=<市州id>` **并且** `type=5`
（`apps/core/services.py:73`），上面两种脏值**匹配不上任何真实市州**，
结果是**这个中小学账号从那座市州端的可见范围里静默消失**（报名数据还在，只是再也查不出来、管不了）。

**改法**：抽一个共用校验函数，`parent_id` 从循环里拿出来单独走；并补上 create 有、这里没有的一道判断
—— **被改的这个账号本身必须是 `type=5`**。

```python
def _account_type(user):
    """把 user.type 归一成 int。直连接口可能把 type 传成字符串 '5'。
    解析不出来（None、''、'abc' 等）时返回 None，绝不让它抛异常。"""
    try:
        return int(user.type)
    except (TypeError, ValueError):
        return None


def _apply_parent_id(user, requested_parent):
    """设置账号的所属市州，保证不变量：**只有中小学账号（type=5）才有 parent_id**。

    【必须在 user.type 已经定下来之后调用】本函数用 user.type 做判据。

    返回 None 表示通过；否则返回应当直接回给前端的错误响应。

    【为什么 type != 5 时是「归 0」而不是「报错」】
    user_update_admin 是**整对象更新** —— 前端改一个名字也会把整行发回来
    （editForm 是 modify(row) 的深拷贝，行里本来就带 parent_id）。
    如果这里报错，管理员连名字都改不了。
    归 0 既能自愈历史脏数据，又不会挡住任何正常编辑。
    """
    if _account_type(user) != User.TYPE_PRIMARY_SECONDARY:
        user.parent_id = 0
        return None
    if requested_parent in (None, "", 0, "0"):
        user.parent_id = 0
        return None
    parent = User.objects.filter(pk=requested_parent).first()
    if parent is None:
        return response(failure("上级账号不存在"))
    if parent.type != User.TYPE_CITY:
        return response(failure("上级账号必须是市州账号"))
    user.parent_id = parent.id
    return None


def user_update_admin(request):
    data = body(request); user = User.all_objects.filter(pk=data.get("id")).first()
    if not user: return response(failure("用户不存在"))
    # can_report_twice 是报名特许，只能由管理员/组委会授予，单独归一化，不能让学校自助提权
    for k in ("username", "nickname", "description", "tel", "leader", "type"):
        if k in data: setattr(user, k, data[k])        # ← parent_id 从这里移出；type 先定下来
    # 【顺序不能变】parent_id 必须放在上面这个循环**之后** ——
    # helper 读的是 user.type，而 type 可能就在同一个请求里被改掉（例如 5 → 0），
    # 必须用**新**的 type 判，否则这个请求会带着旧类型的判断写库。
    # 【守卫为什么用 _account_type 而不是裸比 user.type】两者必须同源：
    # 若守卫把字符串 '5' 当成"不是中小学"，而 helper 又把 '5' 认成 5，
    # 那么"type='5'、没传 parent_id"这个请求会进 helper、命中空值分支、
    # 把这个账号**本来有效的归属洗成 0**。共用一个归一化函数就不会分叉。
    if "parent_id" in data or _account_type(user) != User.TYPE_PRIMARY_SECONDARY:
        # 两个条件任一成立就进 helper：
        #   ① 本次请求带了 parent_id     → 调用方真的动了它
        #   ② 账号不是中小学账号         → 不该有归属，顺手自愈成 0
        # 两条都不成立（是中小学账号、且没传这个键）→ 完全不动，原值保留
        err = _apply_parent_id(user, data.get("parent_id"))
        if err: return err
    if "can_report_twice" in data:
        user.can_report_twice = _as_bool(data["can_report_twice"])
    if "password" in data: user.set_password(RESET_PASSWORD_DEFAULT)
    user.save(); write_log(request.auth, 1, "修改用户 " + user.username)
    return response(success())
```

**与前端的三条行为约定**（都对得上实测）：

1. **前端提交时，值为 `undefined` 的键会被 `JSON.stringify` 丢掉**（JS 的语言行为）。
   所以 `"parent_id" in data` 为假 → 对 type=5 账号走"原值保留"分支。

   **什么情况下这个键会不存在？实测确认只有一种：账号本来就没有归属**
   （`0` / `NULL` / 指向已删市州的悬空 id）。前端 `modify()` 把这几种值统一归一成
   `undefined`，下拉显示成「请选择所属市州」；管理员不碰它，提交时键就被丢掉了。
   > ⚠️ **"管理员只改个名字"不属于这一种**，别被直觉带偏：前端「修改」弹窗发的是整行深拷贝，
   > 账号若有有效归属（比如 7），`parent_id: 7` 会**跟着行一起回传** ——
   > 走的是"请求带了 `parent_id`、值等于原值"那条路，**不是 3a**（实测见 7.4 的表）。
   > 3a 存在的意义正是：**别把"这个账号本来没有归属"误判成"要清空"**。

   > ✅ **前端「清空归属」原先也走这一支（于是清空在库里不生效），已修为显式发 `0`**，
   > 现在走 3b。详见 7.4 —— **后端不需要为此改任何东西**，契约本来就是对的。
2. **"清空"那一支写 `0` 而不是 `NULL`**：与 `user_create_admin` 的既有写法（`:566`）一致。
   两种值对 `subordinate_school_ids()` 效果相同（`0` 和 `NULL` 都匹配不上任何市州），
   所以这个选择不影响数据范围，只是别在一个库里造出第三种"空"。
3. **前端「修改」弹窗发的是整个对象**（`editForm` 是列表行的深拷贝，含 `parent_id`）。
   所以校验**不能**用"报错"拦住非 type=5 的账号 —— 那会让管理员连改个名字都做不到。

---

### 改动二 · `user_create_admin`（`apps/api/views.py:564`）：加类型校验 + 调整 `committee` 顺序

**现状**：

```python
def user_create_admin(request, committee=False):
    data = body(request); values = {k: data.get(k) for k in ("username", "nickname", "description", "tel", "leader", "type") if k in data}
    values["parent_id"] = 0
    # 中小学账号（type=5）可在创建时指定所属市州（parent_id 必须指向 type=1 的市州账号）
    requested_parent = data.get("parent_id")
    if requested_parent not in (None, "", 0, "0"):
        parent = User.objects.filter(pk=requested_parent).first()
        if parent is None:
            return response(failure("上级账号不存在"))
        if parent.type != User.TYPE_CITY:
            return response(failure("上级账号必须是市州账号"))
        values["parent_id"] = parent.id
    if "can_report_twice" in data:
        values["can_report_twice"] = _as_bool(data["can_report_twice"])
    if committee:
        values["type"] = 0                     # ← 在校验**之后**才执行
    user = User(**values)
    user.set_password(data.get("password", "")); user.save()
    write_log(request.auth, 2, "创建用户用户 " + user.username)
    return response(success("添加成功"))
```

**两个问题**：

1. 只检查「父账号是市州」，**不检查「新账号是 type=5」** → 可以给一个学校账号设上 `parent_id`。
2. **`if committee: values["type"] = 0` 在校验之后才执行** → 组委会建账号时类型被覆盖成 0，
   但 parent 校验早就通过了，**建出一个 `type=0` 却带着 `parent_id` 的账号**。

> **第 2 条是现在就存在的 bug，不是假设。** `:632` 把 `user_create_admin(request, committee=True)`
> 暴露给了组委会端。虽然前端组委会页没有「添加账号」按钮，但**接口是通的**，直接打就能复现。
>
> **后果有多大（如实说，不夸大）**：`subordinate_school_ids()` 带 `type=5` 过滤，
> 所以这个 `type=0` 的账号**不会被算进任何市州的数据范围** —— **眼下不构成越权**。
> 真正的危害是**破坏了「只有 type=5 才有 parent_id」这条不变量**，而且它是个**潜伏陷阱**：
> `user_update_admin` 允许改 `type`（`:555` 的白名单里有），哪天有人把这条账号的 `type` 改成 5，
> 它会**静默地**进入那个市州的可见范围，排查起来很难往这上面想。

**改法**：把 `if committee:` 提到 parent 校验**之前**（先定死类型，再判类型），并加类型判断。

```python
def user_create_admin(request, committee=False):
    data = body(request); values = {k: data.get(k) for k in ("username", "nickname", "description", "tel", "leader", "type") if k in data}
    values["parent_id"] = 0
    if committee:
        values["type"] = 0                       # ← 从下面提到这里，先定死类型
    # 中小学账号（type=5）可在创建时指定所属市州（parent_id 必须指向 type=1 的市州账号）
    requested_parent = data.get("parent_id")
    if requested_parent not in (None, "", 0, "0"):
        # 只有中小学账号才有"所属市州"这个概念，其它类型带上这个字段一律拒绝
        try:
            new_type = int(values.get("type"))
        except (TypeError, ValueError):
            new_type = None
        if new_type != User.TYPE_PRIMARY_SECONDARY:
            return response(failure("只有中小学账号可以设置所属市州"))
        parent = User.objects.filter(pk=requested_parent).first()
        if parent is None:
            return response(failure("上级账号不存在"))
        if parent.type != User.TYPE_CITY:
            return response(failure("上级账号必须是市州账号"))
        values["parent_id"] = parent.id
    if "can_report_twice" in data:
        values["can_report_twice"] = _as_bool(data["can_report_twice"])
    user = User(**values)
    user.set_password(data.get("password", "")); user.save()
    write_log(request.auth, 2, "创建用户用户 " + user.username)
    return response(success("添加成功"))
```

> `int()` 那一层是防御性的：前端 `el-option :value="5"` 发的是**数字** 5，
> 但直接打接口可能传字符串 `'5'`。改动一里的 `_account_type()` 是同一个思路，
> 两处保持一致 —— **同一份数据在两处被解析成不同的类型，是最容易出暗病的地方**。

#### ⚠️ 为什么 create 是**报错**、而改动一（update）是**归 0** —— 不是写岔了

两条路径对同一件事（"非中小学账号不该有 `parent_id`"）处理方式不同，因为**操作性质不一样**：

| | 调用方在做什么 | 报错的代价 | 所以 |
|---|---|---|---|
| **create** | 明确要求"新建一个带归属的账号" | **无代价** —— 前端发不出这种请求（下拉只在 `type===5` 渲染，切类型时 `@change` 会清掉 `parent_id`，实测确认），只有直连接口才会撞上 | **报错**。告诉调用方"这条路由给不了你要的东西"，比悄悄建出一个**和你要的不一样**的账号好 |
| **update** | 整对象更新，改个名字也会把整行（含 `parent_id`）发回来 | **很大** —— 库里若有一条历史脏数据（`type=0` + `parent_id=7`），管理员**连名字都改不了** | **归 0 自愈**，不报错 |

> 一句话记法：**create 是"新建"，报错不伤谁；update 是"改存量"，报错会锁死编辑。**
> 两边都保证同一条不变量 —— **只有 `type=5` 的账号，`parent_id` 才可能是非 0**。

> **注意改动二只修 `parent_id` 这一处。** 同一函数里 `can_report_twice` 也缺 `type` 判据
> （见 7.3）—— 那一条**已单独成文**：《后端修改说明-可报两支（can_report_twice）》，
> 是那份文档的**改动三 / 改动四**。
> 之所以拆开而不是并进来：它**不是**可选优化（`ACCOUNT_QUOTA_SCOPES` 含 type 0，
> 脏账号真的会放宽报名配额），跟本文"页面上把 `parent_id` 显示出来"不是一回事，
> 混在一起会让改动边界说不清楚。

---

## 四、请**不要**做的事

**不要为了返回市州名称去改 `user_dict`。**

`user_dict`（`apps/core/services.py:56`）是**全局共用**的序列化函数，
全仓库共 **10 处**使用点（9 处直接调用 + 1 处作为序列化器传入）：

```
直接调用 user_dict(x)：
  apps/api/views.py:85     serialize_user_list  —— 注意：该函数全仓库无调用方（死代码）
  apps/api/views.py:225    审核列表里嵌的 user
  apps/api/views.py:284    登录接口          ← 改它会让登录响应也多一个字段
  apps/api/views.py:309    获取当前用户
  apps/api/views.py:368    参展扫描件列表
  apps/api/views.py:628    单个用户信息
  apps/api/views.py:644    日志列表
  apps/core/services.py:350 / :368    报名详情

作为序列化器传入（由 list_page 在 services.py:90 调用）：
  apps/api/views.py:533    账号列表          ← 本需求唯一相关的一处
```

改它的影响面远超本需求。**前端已经用"额外查一次 `?type=1` 建对照表"绕开了，不需要后端动。**

如果后端确实希望由服务端返回市州名，正确做法是**新写一个只给 `user_list` 用的序列化函数**，
不要碰原来的 `user_dict`。但**本需求不需要这么做**。

---

## 五、接口契约（不需要改动，仅备查）

| 用途 | 接口 | 位置 |
|---|---|---|
| 管理员端列表 | `GET /api/admin/user/list` | `:631` 注册 |
| 组委会端列表 | `GET /api/committee/user/list` | `:632` 注册 |
| 取市州清单（前端建对照表） | `GET /api/admin/user/list?type=1&limit=1000` | 同上，type 过滤在 `user_list:522` / `:530-532` |
| 修改用户 | `PUT /api/admin/user/`、`PUT /api/committee/user/` | 都指向 `user_update_admin:551` |
| 新增用户 | `POST /api/admin/user/`、`POST /api/committee/user/` | 都指向 `user_create_admin:564` |

**前端请求体没有新增字段**，`parent_id` 本来就是契约里的字段。实测抓到的真实请求体：

```jsonc
// POST 新增（中小学账号 + 选了成都市）—— 实测抓包
{ "username": "sch_x", "nickname": "测试学校", "password": "abc12345",
  "type": 5, "can_report_twice": false, "parent_id": 7 }

// PUT 修改（改的是 type=5 账号）—— editForm 是整行的深拷贝，整对象发回来
{ "id": 101, "username": "sch_a", "nickname": "成都市实验小学",
  "leader": "张", "tel": "1", "description": "",
  "type": 5, "can_report_twice": false, "parent_id": 7 }

// PUT 修改（把类型从 5 改成 0）—— parent_id 这个键**整个不存在**
{ "id": 101, "username": "sch_a", "nickname": "成都市实验小学",
  "leader": "张", "tel": "1", "description": "",
  "type": 0, "can_report_twice": false }
```

> 最后一条是**关键约定**：前端切类型时会把这个键整个删掉（值设成 `undefined`，
> 被 `JSON.stringify` 丢弃），**不是发 `null`、也不是发 `0`**。
> 后端应当把它理解成"调用方没碰这个字段" → **保持数据库原值不动**。

---

## 六、验证清单

改完之后建议这样验证（都不需要前端配合，直接打接口）：

| # | 操作 | 期望 |
|---|---|---|
| 1 | `PUT`，`parent_id` 指向**不存在的 id**（如 99999），账号是 type=5 | 返回「上级账号不存在」，**不写库** |
| 2 | `PUT`，`parent_id` 指向一个 **type=0 的学校账号**，账号是 type=5 | 返回「上级账号必须是市州账号」，**不写库** |
| 3a | `PUT`，**整个 `parent_id` 键都不传**，账号是 type=5 | 通过，**原值完全不动**。前端在"账号本来就没有归属"时走这条 |
| 3b | `PUT`，显式传 `parent_id: null` 或 `0`，账号是 type=5 | 通过，**写成 `0`**。← 前端「清空归属」现在走这条（见 7.4） |
| 4 | `POST /api/committee/user/`，带 `type: 5` + 合法 `parent_id` | 返回「只有中小学账号可以设置所属市州」→ committee 强制 type=0，**必须被拒** |
| 5 | `POST /api/admin/user/`，`type: 0` + 合法 `parent_id` | 返回「只有中小学账号可以设置所属市州」 |
| 6 | `POST /api/admin/user/`，`type: 5` + 合法 `parent_id` | 创建成功，`parent_id` 落库 |
| 7 | `POST /api/admin/user/`，`type: 5` + **不带** `parent_id` | 创建成功，`parent_id = 0`（**不能变成必填**） |
| 8 | `PUT`，改一条 `type=0` 账号（假设库里带着 `parent_id=7`）的 `nickname`，**请求里没有 `parent_id` 键** | 改名成功，且该账号 `parent_id` 被**自动清成 0**，**不报错** |
| 9 | `PUT`，把一条 `type=5` 账号**改成** `type=0`，同时带 `parent_id: 7` | 类型改成功，`parent_id` 清成 0（**必须用改后的 type 判**：先 setattr、后校验） |
| 10 | `PUT`，`type` 传**字符串** `"5"` + 合法 `parent_id` | 与传数字 5 结果相同（两处 `int()` 归一化生效） |

**第 3a 与 3b 一定要分开测**：结果不一样。"键不传"是**保持原值**，"显式传空"是**写成 0**。
两条前端都会走（3a：账号本来没归属；3b：用户点了清空），把 3b 写成"原值不动"是错的
（`if "parent_id" in data` 为真就会进 helper）。

**第 7 条要特别注意**：「所属市州」前端没有设为必填，后端也不能设成必填 —— 现存账号大多没有归属。

---

## 七、顺带发现的四个相邻问题（**与本需求无关**，仅供判断）

这四条**不影响前端上线**，也**不需要为本需求修改**。

### 7.1 删除市州账号后，下属中小学的 `parent_id` 会悬空

`user_delete_admin`（`:586`）只做软删除，不动下属账号：

```python
def user_delete_admin(request):
    ids = request_ids(request, body(request)); User.objects.filter(id__in=ids).exclude(id=1).update(deleted_at=timezone.now())
    return response(success())
```

**后果**：删掉一个市州账号后，它名下所有中小学账号的 `parent_id` 仍然指着那个已删的 id。
这些学校于是**不属于任何市州** —— 那个市州账号已经登不进来了，所以这些学校的报名
**任何市州端都看不到**。（前端「所属市州」列在那几行显示「—」，UI 层兜住了，不会崩；
但**数据范围的问题不在这张表上** —— 那些报名是真的没人能看到了。）

**可选做法**（择一）：删除市州账号时把名下中小学的 `parent_id` 一并归零；
或删除前拦一道，提示"该市州下还有 N 个中小学账号"（模型上有 `related_name="children"`，
`city_user.children.count()` 直接可用）。

> 这是**既有缺口，不是本次前端改动引入的**。前端这次只是把 `parent_id` 显示出来，
> 反而让这个问题变得可见了。

### 7.2 导出的 Excel 里没有「所属市州」列

`user_export_admin`（`:596`）的列是写死的 6 列（`:598`）：

```python
rows = [["账号", "名称", "密码", "修改人姓名", "修改人联系方式", "备注"]]
```

注意：这个导出格式**本来就和页面列表不一致**（导出有「密码」「备注」，页面有「序号」「类型」，
两边列并不对应），所以不补也不矛盾。**要不要补由你们定** —— 本需求（页面显示）不依赖它。

### 7.3 `can_report_twice` 可以和 `type` 不匹配（本次实测才发现）

`user_create_admin` 对 `can_report_twice` 只做了一次布尔归一化（`:576-577`），
**没有和 `type` 做匹配检查**，于是可以建出一个 `type=0`（学校账号）却带着 `can_report_twice=true` 的账号。

**这是实测抓到的，不是推测**：修前端 `@change` 之前，管理员端「添加账号」按
「选中小学账号 → 勾可报两支 → 选成都市 → 改回学校账号 → 确定」操作，
实际发出的请求体是 `{"type":0,"can_report_twice":true,"parent_id":7}`。
**前端已修**（现在发的是 `{"type":0,"can_report_twice":false}`），但**接口本身仍然接受这种组合**。

**⚠️ 更正（2026-09-28，实查后改）**：本节初稿写过一句
「不处理也行：`ACCOUNT_QUOTA_SCOPES` 另外框了一层范围」—— **这句是错的**，现予更正。

实查 `apps/core/report_drafts.py:26-28`：

```python
ACCOUNT_QUOTA_SCOPES = (User.TYPE_SCHOOL, User.TYPE_PRIMARY_SECONDARY)   # = (0, 5)
```

**它包含 type 0。** 所以 scope 0（高校端）**不是**被框在外面，而是**实实在在参与**这个配额
（`:175`：`account_limit = 2 if getattr(user, "can_report_twice", False) else 1`）。
也就是说，一条 `type=0 + can_report_twice=true` 的账号**真的能报 2 支**，
而且报的正是红头文件明令限 1 支的那个渠道 —— 后果不是"界面上看不出来"，
而是"**界面上看不出来，而且真的生效**"。
（唯一还成立的是后半句：界面确实只在 `type===5` 时渲染那个勾选框。）

**所以要处理，没有"不处理也行"这一说。**

> **本节的完整方案已单独成文** →《后端修改说明-可报两支（can_report_twice）》
> （本节的 `can_report_twice` 在那份文档里是**改动三 / 改动四**，
> 与本文改动一 / 改动二改的是**同样两个函数**，建议一起做）。
> 该文档还多了一条本文没写的自愈问题：**「修改用户」发的是整行深拷贝，
> 库里的脏值会被原样回传、永远洗不掉**。

**最小改法**（详细版见上述文档）：紧挨着改动二那处类型判断加一条同样的判据，
非 `type=5` 时**归 `false`**（不是报错 —— 理由同改动一：整对象更新不能锁死编辑）。

### 7.4 前端「清空归属」曾是静默空操作（**纯前端问题**，实测发现，**已修**）

**这一条不需要后端做任何事**，写在这里是为了让上面 3a / 3b 的口径有据可查。

#### 曾经的问题

「修改用户」弹窗的「所属市州」下拉是 `clearable` 的。点 × 清空时，el-select 把值置为
`undefined`（`DEFAULT_VALUE_ON_CLEAR`），提交时这个键被 `JSON.stringify` 丢掉，
后端 `"parent_id" in data` 为假 → 走"原值保留"分支 → **库里的归属根本没被清掉**：

```
（修复前的实测 body）
{"id":101,...,"type":5,"leader":"张",...,"can_report_twice":false}   ← 没有 parent_id 键
```

界面上显示「请选择所属市州」，库里仍然是 `7`，刷新一下又变回「成都市」。

**后端把"键不传"当成"不动"是正确的契约，不要改** —— 改成"键不传 = 清空"更糟。
修在前端：让"清空"**显式发 `parent_id: 0`**（走 3b），别让后端去猜调用方的意图。

#### 修法（已完成）

用 `@clear` 把"用户主动清空过"这个**意图**记进一个标记 `editCityCleared`，
`@change`（重新选了值）时撤销，提交那一刻才翻译成 `0`。
**为什么要绕这一下**：el-select 判空集合是 `["", undefined, null]`，数字 `0` 不算空 ——
真把下拉的值设成 `0`，框里会渲染出一个裸「0」。

#### 修复后的实测结果（Playwright 驱动真实构建产物，抓浏览器实际发出的 PUT body）

样本行 `type=5 / parent_id=7（成都市）`；市州清单 `7=成都市、8=绵阳市`。

| 场景 | 期望 | 实际 |
|---|---|---|
| 不碰任何字段，直接确定 | `7`（**原值回传**，见下方⚠️） | `7` ✅ |
| **点 × 清空归属，确定** | **`0`** | **`0`** ✅ |
| 点 × 清空 → 再选「绵阳市」，确定 | `8`（标记须被 `@change` 撤销） | `8` ✅ |
| 直接改选「绵阳市」，确定 | `8` | `8` ✅ |
| 只改名称（接在上一行之后），确定 | `7`（标记须在打开时复位） | `7` ✅ |
| **账号本来就没有归属（`parent_id=0`），不碰，确定** | **键不存在**（走 3a） | 键不存在 ✅ |
| 同上账号，下拉里 × 的数量 | `0`（**值为空时 el-select 不渲染清空按钮**） | `0` ✅ |

> ⚠️ **顺带纠正一个容易说错的点**：**"账号有有效归属、管理员只改个名字"不属于 3a。**
> 前端「修改」弹窗发的是整行深拷贝，`parent_id: 7` 会跟着行一起回传 ——
> 请求带了 `parent_id`、值恰好等于原值，走的是**校验通过**那条路，不是"键不传"。
> 3a 只由"账号本来就没有归属"这一种情况走到（表里第 6 行）。

> 「添加用户」弹窗**从头到尾没有这个问题**：那边的清空最终落到后端建号的默认值
> `values["parent_id"] = 0` 上，结果和"清空"一致。只有「修改」弹窗受影响。

---

## 八、汇总

### 本需求需要改的（第三节）

> **要改的文件只有一个：`apps/api/views.py`。** 完整审计见第零节。

| # | 改动 | 位置 | 阻塞前端吗 |
|---|---|---|---|
| 1 | `user_update_admin` 补 `parent_id` 校验（含"被改账号须为 type=5"，须在 `setattr(type)` **之后**判；非 type=5 **归 0 自愈、不报错**） | `apps/api/views.py:551` | ❌ 不阻塞 |
| 2 | `user_create_admin` 加类型校验 + `if committee:` 前置（非 type=5 **报错拒绝**） | `apps/api/views.py:564` | ❌ 不阻塞 |
| 3 | **不要**改 `user_dict` | `apps/core/services.py:56` | ❌ 只是提醒 |
| 4 | **不要**给自助改资料接口加 `parent_id` | `apps/api/views.py:313` | ❌ 只是提醒 |

**两处前端都已经在 UI 层挡住了，所以现在就能用。**
补上不是为了救前端 —— 改动一是把守备下沉到接口层（防绕过界面直接调接口，
且数据库层没有 FK 约束兜底），改动二是修一条不变量缺口（前端碰不到，但接口是通的）。

> **本次顺手修了一个前端自己的 bug，如实告知**：管理员端「添加账号」里，
> 类型选择器的 `@change` **原来挂错了元素** —— 挂在「可报两支」复选框上，
> 而那个复选框只在 `type===5` 时才渲染，导致「切换类型时清空」这段逻辑**从来没执行过**。
> 已修（`@change` 挂到类型选择器上）。**这一条只影响前端，你们不用动**；
> 但它正好说明改动一的「归 0 自愈」不是多余的防御 —— **老版本页面（用户没强刷）仍会发出这种请求**。
>
> 实测抓到的请求体（Playwright 驱动真实构建产物，抓浏览器实际发出的 POST body）：
>
> | 版本 | 实际发出的 body | 说明 |
> |---|---|---|
> | 修复前 | `{"type":0,"can_report_twice":true,"parent_id":7}` | **漏两个字段** |
> | 修复后 | `{"type":0,"can_report_twice":false}` | `parent_id` 键直接消失 |
>
> ⚠️ **漏的不止 `parent_id`** —— `can_report_twice: true` 也跟着漏出去了，
> 等于给一个非中小学账号白送一份「可报两支」特许（见 7.3）。
> 修复后 `can_report_twice` 会**显式发 `false`**（原先是 `undefined`、键被丢弃），
> 对你们无影响：`if "can_report_twice" in data: values[...] = _as_bool(...)`，显式 `false` 与不传等效。

### 顺带发现（第七节）—— 5 / 6 你们判断，**7 必做**，8 前端已修

| # | 问题 | 位置 | 与本需求的关系 |
|---|---|---|---|
| 5 | 删市州账号后下属中小学 `parent_id` 悬空 | `apps/api/views.py:586` | 既有缺口，非本次引入，你们判断 |
| 6 | 导出 Excel 不含「所属市州」列 | `apps/api/views.py:596` | 可选，前端不依赖，你们判断 |
| 7 | `can_report_twice` 可与 `type` 不匹配 | `apps/api/views.py:576-577` | **必做**（不是可选）；**已单独成文** →《后端修改说明-可报两支（can_report_twice）》 |
| 8 | 前端「清空归属」曾是静默空操作（**已修**） | `src/views/admin/user.vue`（**前端**） | 实测发现；**后端不用动**，只是同步信息 |

---

## 九、一句话总结

**前端已经能用了，后端一行不改也能跑。**

- **第 1、2 条**是要动的代码，都在 `apps/api/views.py` 一个文件里，各是一个小函数：
  - 改动一：给 `user_update_admin` 补 `parent_id` 校验。**必做** —— `db_constraint=False`，
    数据库层没有外键约束，接口校验是**唯一**一道防线。非 type=5 归 0 自愈、不报错。
  - 改动二：给 `user_create_admin` 加类型判断 + 把 `if committee:` 提前。修一条不变量缺口，
    眼下不构成越权，但留着是个潜伏陷阱。非 type=5 报错拒绝。
- **第 3、4 条**是**不要动**的地方（`user_dict` 有 10 处使用点；自助改资料接口的白名单是对的）。
- **第 5、6 条**是顺带发现，你们自行判断要不要处理。
- **第 7 条（7.3，`can_report_twice`）不是"自行判断"，是必做**，
  且**已单独成文** →《后端修改说明-可报两支（can_report_twice）》（那份的改动三 / 改动四）。
  改的是**同样两个函数**，建议和上面改动一 / 改动二一起做。
  ⚠️ 初稿曾说"不处理也行，`ACCOUNT_QUOTA_SCOPES` 另外框了一层范围"—— **已更正，那句是错的**。
- **第 8 条（7.4）是前端的事**，写在这里只是同步信息：前端「清空归属」原先不生效，
  **已在前端修好**（清空时显式发 `parent_id: 0`，走 3b）。
  **后端不需要为此改契约** —— 3a / 3b 两条分支保持原样就够了。
