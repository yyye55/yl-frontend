# 后端修改说明：用户「所属市州」（`parent_id`）

- 对接前端：`src/views/admin/user.vue`（管理员端 `/admin/user`）、`src/views/committee/user.vue`（组委会端 `/committee/user`）
- 后端基线：`ea12de8`
- **结论先说**：这个功能**不需要后端新增或修改任何接口**。前端用的全是现有契约。
  有 **2 处校验缺口**建议补上（第三节）—— 都属于"把已经约定好的规则补进接口层"，**不阻塞前端上线**。
  另有 **2 条顺带发现的相邻问题**（第七节），不属于本需求，仅供你们判断。
- **阅读顺序**：只想知道要改什么 → 看**第三节**和**第八节**。想了解全貌 → 从头看。

---

## 一、这个功能用到的数据模型

就是 `users.parent_id`。它的含义后端自己写得很清楚（`apps/core/services.py:66-70`）：

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

即：

| 账号类型 | `parent_id` 的含义 |
|---|---|
| 中小学账号（type=5） | 指向所属**市州账号（type=1）** 的 id |
| 其它类型（0 / 1 / 2 / 3） | 无业务含义 |
| `0` 或 `NULL` | 都表示"没有归属" |

> ⚠️ **这不是一个纯展示字段。** `parent_id` 是市州端数据范围的**唯一来源**。把一所中小学的归属从 A 市改到 B 市，等于 **A 市从此看不到它、B 市能看到了**。前端在两个弹窗的下拉下面都加了一行提示：
> 「归属决定该市州端能看到哪些中小学账号的报名，请谨慎修改。」

---

## 二、前端已经做了什么（现状）

| 位置 | 内容 |
|---|---|
| 管理员端列表 | 新增「所属市州」列，用 `user_dict.parent_id` 换名字显示 |
| 管理员端「添加用户」弹窗 | 选中小学账号时出现「所属市州」下拉 |
| 管理员端「修改用户」弹窗 | 该账号是中小学账号时出现「所属市州」下拉，可改、可清空 |
| 市州名字从哪来 | 前端额外调一次 `GET /api/admin/user/list?page=1&limit=1000&type=1`，本地建 `{id: 名称}` 对照表 |

**前端没有新增任何接口、没有新增任何请求字段。** 全部落在现有契约上：

| 环节 | 后端现状 | 位置 |
|---|---|---|
| 列表读 | `user_dict` **已返回 `parent_id`** | `apps/core/services.py:63` |
| 修改写 | `user_update_admin` 的字段白名单**已含 `parent_id`** | `apps/api/views.py:555` |
| 新增写 | `user_create_admin` **已支持并校验** `parent_id` | `apps/api/views.py:566-575` |

**组委会端**（`GET /api/committee/user/list`）走的也是同一个 `user_list`（见 `register_user_routes`，`:632`），所以**读这一侧组委会端也是现成的**，不需要额外工作。

---

## 三、需要后端改的两处

### 改动一 · `user_update_admin`（`apps/api/views.py:551`）：给 `parent_id` 加校验

**现状**：

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

**问题**：`user_create_admin` 有两道校验（父账号存在 + 必须是市州），`user_update_admin` **一道都没有** —— `parent_id` 混在循环里被无条件 `setattr`。

**后果**：直接打接口可以把它改成**不存在的 id**，或指向一个**学校账号**。而 `subordinate_school_ids()` 完全信任这个值，脏了之后市州端的数据范围就是错的。
（前端在 UI 层已经把选项限制成真实市州账号，所以正常操作不会出问题；缺的是接口层的守备。）

**建议改法**：抽一个与 create 共用的校验函数，`parent_id` 从循环里拿出来单独走。

```python
def _apply_parent_id(user, requested_parent):
    """中小学账号的所属市州：parent_id 必须为空，或指向一个 type=1 的市州账号。
    返回 None 表示通过；否则返回应当直接回给前端的错误响应。"""
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
        if k in data: setattr(user, k, data[k])            # ← parent_id 从这里移出
    if "parent_id" in data:
        err = _apply_parent_id(user, data["parent_id"])     # ← 补上与 create 同一套校验
        if err: return err
    if "can_report_twice" in data:
        user.can_report_twice = _as_bool(data["can_report_twice"])
    if "password" in data: user.set_password(RESET_PASSWORD_DEFAULT)
    user.save(); write_log(request.auth, 1, "修改用户 " + user.username)
    return response(success())
```

**注意与前端的行为约定**：前端「清空归属」时**不会发 `parent_id` 这个键**（`JSON.stringify` 丢弃值为 `undefined` 的键）。
所以 `if "parent_id" in data` 为假 → 保持原值不变。这是**有意的**：用户没碰这个字段时，数据库里的原值（`0` 或 `NULL`）原样保留，前端不制造无谓的写入。

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
        values["type"] = 0
    user = User(**values)
    user.set_password(data.get("password", "")); user.save()
    write_log(request.auth, 2, "创建用户用户 " + user.username)
    return response(success("添加成功"))
```

**两个问题**：

1. 只检查「父账号是市州」，**不检查「新账号是 type=5」**。所以可以给一个学校账号设上 `parent_id`。
2. **`if committee: values["type"] = 0` 在校验之后才执行。** 组委会建账号时类型会被覆盖成 0，但 parent 校验已经通过了 → **建出一个 `type=0` 却带着 `parent_id` 的账号**。

> ⚠️ **第 2 条是现在就存在的 bug，不是假设。** `register_user_routes("/committee", 2)`（`:632`）把 `user_create_admin(request, committee=True)` 暴露给了组委会端。虽然前端组委会页目前没有「添加账号」按钮，但**接口是通的**，直接打就能复现。
>
> 一个 type=0 的账号挂在某市州名下，会让那个市州端**多看到本不该看到的报名**（因为 `subordinate_school_ids()` 只按 `parent_id` + `type=5` 过滤，脏数据会以另一种方式扭曲范围）。

**建议改法**：把 `if committee:` 提到 parent 校验**之前**，再加类型判断。

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

> `int()` 那一层是防御性的：前端 `el-option :value="5"` 发的是**数字** 5，但直接打接口可能传字符串 `'5'`。

---

## 四、请**不要**做的事

**不要为了返回市州名称去改 `user_dict`。**

`user_dict`（`apps/core/services.py:56`）是**全局共用**的序列化函数，有 **9 处调用方**：

```
apps/api/views.py:225   审核列表里嵌的 user
apps/api/views.py:284   登录接口          ← 改它会让登录响应也多一个字段
apps/api/views.py:309   获取当前用户
apps/api/views.py:368   参展扫描件列表
apps/api/views.py:533   管理员账号列表     ← 只有这一处需要
apps/api/views.py:628 / 644
apps/core/services.py:350 / 368
```

改它的影响面远超本需求。**前端已经用"额外查一次 `?type=1` 建对照表"绕开了，不需要后端动。**

如果后端确实希望由服务端返回市州名，正确做法是**新写一个只给 `user_list` 用的序列化函数**，不要碰原来的 `user_dict`。但**本需求不需要这么做**。

---

## 五、接口契约（不需要改动，仅备查）

前端用到的全部接口都是现成的：

| 用途 | 接口 | 位置 |
|---|---|---|
| 管理员端列表 | `GET /api/admin/user/list` | `:631` 注册 |
| 组委会端列表 | `GET /api/committee/user/list` | `:632` 注册 |
| 取市州清单（前端建对照表） | `GET /api/admin/user/list?type=1&limit=1000` | 同上，`user_list:522` 的 type 过滤 |
| 修改用户 | `PUT /api/admin/user/`、`PUT /api/committee/user/` | 都指向 `user_update_admin:551` |
| 新增用户 | `POST /api/admin/user/`、`POST /api/committee/user/` | 都指向 `user_create_admin:564` |

**前端请求体没有变化**，`parent_id` 只是本来就写在契约里的一个字段：

```json
// PUT 修改（只在用户真的选了/改了市州时才会带 parent_id）
{ "id": 9, "username": "xxx", "nickname": "xxx", "parent_id": 7 }

// POST 新增
{ "username": "xxx", "nickname": "xxx", "type": 5, "parent_id": 7, "can_report_twice": false }
```

---

## 六、验证建议

改完之后建议这样验证（都不需要前端配合，直接打接口）：

| # | 操作 | 期望 |
|---|---|---|
| 1 | `PUT /api/admin/user/`，`parent_id` 指向一个不存在的 id（如 99999） | 返回「上级账号不存在」，**不写库** |
| 2 | `PUT /api/admin/user/`，`parent_id` 指向一个 type=0 的学校账号 | 返回「上级账号必须是市州账号」，**不写库** |
| 3 | `PUT /api/admin/user/`，`parent_id: null`（或整个键不传） | 通过，且**原值不被改动** |
| 4 | `POST /api/committee/user/`，带 `type: 5` + 合法 `parent_id` | 返回「只有中小学账号可以设置所属市州」→ 因为 committee 会强制 type=0，**必须被拒** |
| 5 | `POST /api/admin/user/`，`type: 0` + 合法 `parent_id` | 返回「只有中小学账号可以设置所属市州」 |
| 6 | `POST /api/admin/user/`，`type: 5` + 合法 `parent_id` | 创建成功，`parent_id` 落库 |
| 7 | `POST /api/admin/user/`，`type: 5` + 不带 `parent_id` | 创建成功，`parent_id = 0`（与现状一致，**不能变成必填**） |

第 7 条要特别注意：**「所属市州」前端没有设为必填**，后端也不能设成必填 —— 现存账号大多没有归属。

---

## 七、顺带发现的两个相邻问题（**与本需求无关**，仅供你们判断要不要处理）

这两条**不影响前端上线**，也**不需要为本需求修改**。列出来只是因为它们都跟 `parent_id` 有关，
你们看到文档时可能想一并评估。

### 7.1 删除市州账号后，下属中小学的 `parent_id` 会悬空

`user_delete_admin`（`apps/api/views.py:586`）只做软删除，不动下属账号：

```python
def user_delete_admin(request):
    ids = request_ids(request, body(request)); User.objects.filter(id__in=ids).exclude(id=1).update(deleted_at=timezone.now())
    return response(success())
```

**后果**：删掉一个市州账号后，它名下所有中小学账号的 `parent_id` 仍然指着那个已删的 id。
这些学校于是**不属于任何市州** —— `subordinate_school_ids()` 是靠"市州账号 id"去反查的，
而那个市州账号已经登不进来了，所以这些学校的报名**任何市州端都看不到**。

**前端表现**：新增的「所属市州」列在那几行显示「—」（已在 UI 层兜住，不会崩、不会显示裸数字）。
**但数据范围的问题不在这张表上** —— 那些报名是真的没人能看到了。

**如果你们认为需要处理**，可选做法（择一）：
- 删除市州账号时，把名下中小学的 `parent_id` 一并归零；
- 或删除前先拦一道，提示"该市州下还有 N 个中小学账号"。

> 这是**既有行为的缺口，不是本次前端改动引入的**。前端这次只是把 `parent_id` 显示出来，
> 反而让这个问题变得可见了。

### 7.2 导出的 Excel 里没有「所属市州」这一列

`user_export_admin`（`apps/api/views.py:596`）的列是写死的 6 列：

```python
rows = [["账号", "名称", "密码", "修改人姓名", "修改人联系方式", "备注"]]
```

组委会端页面上有「导出所有账号」按钮。页面上新加了「所属市州」列，**导出的 Excel 里不会有**。

注意：这个导出格式**本来就和页面列表不一致**（导出有「密码」「备注」，页面有「序号」「类型」，两边列并不对应），
所以不补也不矛盾。**要不要补由你们定** —— 本需求（页面显示）不依赖它。

---

## 八、汇总

### 本需求需要改的（第三节）

| # | 改动 | 位置 | 阻塞前端吗 |
|---|---|---|---|
| 1 | `user_update_admin` 补 `parent_id` 校验 | `apps/api/views.py:551` | ❌ 不阻塞 |
| 2 | `user_create_admin` 加类型校验 + `committee` 顺序前置 | `apps/api/views.py:564` | ❌ 不阻塞 |
| 3 | **不要**改 `user_dict` | — | ❌ 只是提醒 |

**两处前端都已经在 UI 层挡住了，所以现在就能用。** 补上只是把守备下沉到接口层，防止绕过界面直接调接口。

### 顺带发现、需要你们判断的（第七节）

| # | 问题 | 位置 | 与本需求的关系 |
|---|---|---|---|
| 4 | 删市州账号后下属中小学 `parent_id` 悬空 | `apps/api/views.py:586` | 既有缺口，非本次引入 |
| 5 | 导出 Excel 不含「所属市州」列 | `apps/api/views.py:596` | 可选，前端不依赖 |

---

## 九、一句话总结

**前端已经能用了，后端一行不改也能跑。**
第 1、2 条是补守备（防直连接口）；第 4、5 条是顺带发现，你们自行判断。
