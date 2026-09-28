# 后端修改说明 · 报名列表搜索框（`keyword` 匹配范围）

**提出日期**：2026-09-28
**提出方**：前端
**要改的文件**：`apps/api/views.py` —— **只有这一个文件，不需要 migration**
**当前状态**：⚠️ 这段改动**已经提交在 `master` 上了**（`a5db1fd 搜索框`，合并提交 `82ee066`）。
所以请先看第零节，判断你那边属于哪种情况，不要直接从头改。

---

## 零、先做这一步：判断是「还没改」还是「改了没生效」

**线上现象**：报名列表页的搜索框，输入任何关键词都返回**空表**。

请在**后端部署目录**下执行：

```bash
cd <后端部署目录>
git log --oneline -1
```

| 看到什么 | 说明 | 你要做的 |
|---|---|---|
| `82ee066` 或 `a5db1fd` | 代码已经是对的 | **只差「重启服务」** → 直接跳到第四节 |
| 更早的提交 | 代码还没合过来 | 第二节 + 第三节 + 第四节 |

> **「只 `git pull` 不重启」是这个问题最容易踩的坑。**
> 代码文件换了、进程没重载，现象与完全没改**一模一样**，很容易被误判成「改了没用」。

---

## 一、问题是什么

报名列表的搜索框，前端只发**一个** `keyword` 参数。但后端原先这个参数的匹配范围
**取决于调用方身份** —— 同一个框在不同角色的页面上能搜到的字段不一样，
而且**「学校名」在任何角色下都搜不到**：

| 路由 | 端点（`views.py` 行号） | 实际调用 | 旧代码走哪支 | 旧行为 |
|---|---|---|---|---|
| `GET /api/admin/report/list` | `admin_report_list`（:521） | `report_page(request)` | `else` | 搜 `name` 或 `choir_name` |
| `GET /api/committee/report/list` | `committee_report_list`（:903） | `report_page(request, descending=True)` | `else` | 搜 `name` 或 `choir_name` |
| `GET /api/city/report/list` | `_list`（:1257，`prefix="/city"`） | `report_page(request, user_ids=...)` | `if` | **只搜 `name`** |
| `GET /api/school/report/list` | `_list`（`prefix="/school"`） | `report_page(request, request.auth)` | `if` | **只搜 `name`** |
| `GET /api/province/report/list` | `_list`（`prefix="/province"`） | `report_page(request, request.auth)` | `if` | **只搜 `name`** |
| `GET /api/primary/report/list` | `_list`（`prefix="/primary"`） | `report_page(request, request.auth)` | `if` | **只搜 `name`** |

`school_name`（学校名）**六条路由里一条都搜不到** —— 这就是前端当初不得不在工具栏上
另外摆一个「学校名」输入框的原因。

而那个补上去的框走的是 `school_name` 这个**独立参数**，它与 `keyword` 之间是
**AND** 关系：同一个词分别填进两个框，后端要求同一行的两个字段**都**含这个词，
结果必然是一张空表。**用户看到的就是「搜什么都搜不出来」。**

> 前端侧对应的现象：原先工具栏并排三个输入框（曲目名 / 乐团名 / 学校名），
> 用户不知道哪个该填、填一个不够、填三个更搜不出东西。

---

## 二、要改的地方（唯一一处）

**文件**：`apps/api/views.py`
**函数**：`report_queryset`（:95）
**位置**：`keyword` 那一段（改动前是 :102-107）

### 改前

```python
    keyword = request.GET.get("keyword")
    if keyword:
        if current_user or user_ids is not None:
            qs = qs.filter(name__icontains=keyword)
        else:
            qs = qs.filter(Q(name__icontains=keyword) | Q(choir_name__icontains=keyword))
```

### 改后

```python
    keyword = request.GET.get("keyword")
    if keyword:
        qs = qs.filter(
            Q(name__icontains=keyword)
            | Q(choir_name__icontains=keyword)
            | Q(school_name__icontains=keyword)
        )
```

### 为什么这么改

- 三支合一：一个框搜三个字段（曲目名 / 乐团名 / 学校名），**与调用方身份无关**。
  前端才能把它收敛成一个输入框。
- `Q` 与三个字段都是现成的：`Q` 本来就在用，`school_name` 是 `Report` 上已有的字段
  （下面的独立参数一直在用它），**不需要加字段、不需要 migration**。
- 函数签名 `report_queryset(request, current_user=None, user_ids=None)` **不用动** ——
  这两个参数前面几行已经在做**数据范围**过滤（本人 / 本市州下属学校），
  那是权限，与关键词匹配范围是两件事。

---

## 三、不要动的地方

| 位置 | 为什么不动 |
|---|---|
| 下面几行的 `choir_name` / `school_name` **独立参数** | 它们是给「只想按某一列搜」用的，**保留**。前端本次不再传它们，但历史请求、外部调用传了仍然生效 —— 属于纯增量，留着不冲突 |
| `report_queryset` 前几行的 `user_id` / `user_id__in` 过滤 | 那是**数据范围**（本人 / 本市州下属学校），是权限，**一个字都不要动** |
| `status` / `group` 两个筛选参数 | 与本次无关 |
| 各端点的 `role_error(request, N)` 角色校验 | 与本次无关 |

---

## 四、部署 / 重启（本次真正的待办）

```bash
cd <后端部署目录>
git pull                     # 拉到 82ee066
# 然后必须让进程重新加载代码，按你们的部署方式选一种：
#   gunicorn/uwsgi  →  reload / restart
#   supervisor      →  supervisorctl restart <program>
#   systemd         →  systemctl restart <service>
```

**只 `git pull` 不重启 = 没改。** 请把「重启」这一步单独确认一遍。

---

## 五、验收用例

**前提**：用管理员账号登录，页面 `/admin/report`，组别与状态都选「全部」。

| 在搜索框输入 | 期望结果 | 说明 |
|---|---|---|
| 某条报名的**曲目名** | 有结果 | 改动前也有 |
| 某条报名的**乐团名** | 有结果 | 改动前管理员有、学校端没有 |
| 某条报名的**学校名** | **有结果** | ⭐ **改动前任何身份都搜不到 —— 最能区分新旧版本** |
| 一个不存在的词（如 `zzzz`） | 空表 | 这是正常的 |

**重点验第 3 行。** 如果第 3 行有结果了，第 1、2 行就必然没问题。

再任选一个**学校端 / 市州端**账号，在各自的报名列表页搜**自己的学校名**，
同样应该有结果（这几条路由改动前连 `choir_name` 都搜不到）。

---

## 六、另请确认一个会让「整页空白」的疑点（与搜索无关）

组委会端有三条路由，前端传的 `group` 是**第十一届的旧字符串**：

| 前端页面 | 传的 `group` |
|---|---|
| `/committee/elementary1` | `"小学组"` |
| `/committee/elementary2` | `"中学组"` |
| `/committee/elementary3` | `"大学组"` |

而后端是精确匹配（`report_queryset` 里 `qs.filter(group=request.GET.get("group"))`），
且 `Report.group` 是 `CharField`，**库里存什么就必须传什么**。

第十二届的正式组别看起来已改成 `"管乐团-小学组"` 这类五个值
（管理员端 `/admin/report` 的组别下拉就是这五个）。
**如果库里存的确实已经是新值，这三页会因为匹配不上而整页空白 —— 与搜不搜无关。**

**请只回一句话**：`Report.group` 在库里实际存的是哪一套取值？

- 若确认是新值 → **前端来改**这三页的传参，不用后端动；
- 若库里仍是旧值 → 那这三页是正常的，本疑点作废。

（这条**不改任何东西**，只是需要一句确认。）

---

## 七、前端侧本次做了什么（供对齐）

四个列表页（学校端 / 组委会端两处 / 管理员端）的搜索框，从并排三个收成一个，
只发 `keyword` 一个参数；placeholder 写明「曲目 / 乐团 / 学校名」三列，
让用户知道这一个框能搜三列。

**前端已经按「后端会返回三字段 OR 的结果」改完并构建通过。**
在第四节的重启完成之前，页面上搜什么都会是空表 —— 这不是前端的问题。
