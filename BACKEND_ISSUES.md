# 第十二届「意林杯」四川省管乐展示活动报名系统 - 后端问题清单（BE List）

> **文档版本**：v1.0
> **创建时间**：2026-09-21
> **前端负责**：Vue3 前端已完成第二阶段审计与可修复问题的修改
> **本文档目的**：将所有**必须由后端处理**的问题统一整理，便于后端负责人排期与实现
> **红头文件**：《"意林杯"四川省第十二届管乐展示活动相关要求》（最高业务依据）

---

## 一、问题汇总（按优先级）

| 优先级 | ID | 问题 | 是否阻塞业务 |
|---|---|---|---|
| 🔴 阻塞业务 | BE-05 | OSS 视频上传接口缺失 | 是 |
| 🔴 阻塞业务 | BE-02 | 每所学校限报一队无后端约束 | 是 |
| 🟠 严重 | BE-03 | 报名锁定无字段控制（提交后仍可改） | 严重 |
| 🟠 严重 | BE-01 | stats 查询无法区分管乐/铜管乐团 | 严重 |
| 🟡 一般 | BE-09 | 报名时间窗口无后端控制 | 一般 |
| 🟡 一般 | BE-08 | 学校已报名状态查询接口缺失 | 一般 |
| 🟡 一般 | BE-11 | 指定曲目字典缺失 | 一般 |
| 🟡 一般 | BE-10 | 导出文件名不含第十二届届数 | 一般 |
| 🟢 低 | BE-04 | 资格审核（本校师生校验） | 低 |
| 🟢 低 | BE-06 | 集体照 600dpi 分辨率校验 | 低 |
| 🟢 低 | BE-07 | 服务端文件格式/大小兜底校验 | 低 |

---

## 二、阻塞业务问题（必须优先解决）

### BE-05：OSS 视频上传接口缺失

| 项目 | 内容 |
|---|---|
| **红头文件依据** | 第十二届要求视频格式 MP4/MOV、大小 ≤700MB、10月26日前上传；视频中的自选曲目必须与现场自选曲目一致 |
| **当前接口情况** | 仅有 `/api/qiniu/token`（七牛云），但项目实际已迁移至阿里 OSS；前端 `/api/oss/*` 接口不存在 |
| **为什么前端无法解决** | 前端不知道 OSS bucket 名称、region、STS 临时凭证的签发密钥 |
| **后端需要提供** | 二选一方案：<br>**方案 A（推荐，前端直传）**：`POST /api/oss/video-token` 返回 STS 临时凭证 `{accessKeyId, accessKeySecret, securityToken, expiration, bucket, region}`<br>**方案 B（后端代收）**：`POST /api/oss/video-upload` 接收 multipart 视频流，落盘后返回文件 URL |
| **前端后续配合** | 方案 A：获取 STS 凭证后调用 `ali-oss` SDK 直传 OSS，将返回 URL 写入表单<br>方案 B：直接调用 multipart 上传接口 |
| **当前前端报错** | 上传视频时拿到七牛 uptoken，但 dist 时代已迁移 OSS，前端代码若继续用七牛会上传失败 |
| **业务影响** | 无此接口，**用户无法上传展示视频**，整个报名流程无法闭环 |

---

### BE-02：每所学校限报一队无后端约束

| 项目 | 内容 |
|---|---|
| **红头文件依据** | 第十二届要求"每个学校只能报名一个队伍，并且只能报名一个组别" |
| **当前接口情况** | `create_report` 仅对省级账号做了 8 队限制（`Report.objects.filter(user_id=user.id).count() >= 8`）；市级/学校账号无任何重复约束 |
| **为什么前端无法解决** | 数据库唯一性约束必须在数据库层；并发请求、绕过前端直接调 API 等场景必须由后端拦截 |
| **后端需要提供** | 1. `report` 表加唯一约束（`UNIQUE (user_id, deleted_at)` 或新增 `school_id` 字段后 `UNIQUE (school_id)`）<br>2. `create_report` 前先 `Report.objects.filter(user_id=user.id, deleted_at__isnull=True).exists()` 检查<br>3. 重复时返回 409 Conflict + `failure("您所在学校已完成本届报名，不可重复提交")` |
| **前端后续配合** | 1. 提供 `GET /api/school/report/exists` 接口返回是否已报名（详见 BE-08）<br>2. 前端在创建报名按钮处预判并禁用<br>3. 提交失败时捕获 409 并提示 |
| **业务影响** | **同一学校可重复报名**，违反红头文件业务规则 |

---

## 三、严重问题（影响核心功能）

### BE-03：报名锁定无字段控制

| 项目 | 内容 |
|---|---|
| **红头文件依据** | "名单确定后不得更改" |
| **当前接口情况** | `update_report` 每次都执行 `report.status = 0`（重置为待审核），完全无视"锁定"状态；无 `is_locked` 字段 |
| **为什么前端无法解决** | 数据保护必须后端控制；前端可隐藏编辑按钮，但绕过 API 直接调用仍可修改 |
| **后端需要提供** | 1. `report` 表新增字段 `is_locked BOOLEAN DEFAULT FALSE`<br>2. `submit` / `update_report` 后由后端决定是否置 `is_locked=true`<br>3. `update_report` API 在 `report.is_locked == True` 时直接返回 `failure("名单已锁定，不可修改")`（HTTP 200 但 code=1）<br>4. 管理员/组委会审核通过（`status=1`）时自动 `is_locked=true`<br>5. `update_report` 在执行 `report.status = 0` 时同步设置 `is_locked=true`（防止编辑后还是可改） |
| **前端后续配合** | 编辑页加载时读 `report.is_locked` 字段，若为 true 则禁用所有表单项并显示"已锁定"提示 |
| **业务影响** | 提交后仍可任意修改，违反红头文件"名单确定后不得更改" |

---

### BE-01：stats 查询无法区分管乐/铜管乐团

| 项目 | 内容 |
|---|---|
| **红头文件依据** | 第十二届新增"铜管乐团"类型，5 组（管乐团-小学/中学/大学 + 铜管乐团-小学/中学） |
| **当前接口情况** | `stats_admin`（apps/api/views.py:406）和 `scoped_total`（apps/api/views.py:660）按 `group="小学组"/"中学组"/"大学组"` 字符串过滤，未区分 establishment（管乐/铜管）<br>实际效果：管乐小学与铜管小学的报名都计入"小学组报名情况"，无法区分 |
| **为什么前端无法解决** | 前端不做后端统计查询，只能被动接收数据 |
| **后端需要提供** | 1. 修改 `stats_admin` 和 `scoped_total`，按 `(establishment, group)` 联合分组<br>2. 返回结构应包含完整 5 组：<br>```json<br>[<br>  {"name":"管乐团-小学组报名情况","establishment":"管乐团","group":"小学组","data":[合计,驳回,待审核,通过]},<br>  {"name":"管乐团-中学组报名情况","establishment":"管乐团","group":"中学组","data":[...]},<br>  {"name":"管乐团-大学组报名情况","establishment":"管乐团","group":"大学组","data":[...]},<br>  {"name":"铜管乐团-小学组报名情况","establishment":"铜管乐团","group":"小学组","data":[...]},<br>  {"name":"铜管乐团-中学组报名情况","establishment":"铜管乐团","group":"中学组","data":[...]}<br>]<br>``` |
| **前端后续配合** | 前端首页表格（admin/index、committee/index、city/index、school/index）已支持任意表格数据渲染，无需改前端逻辑 |
| **业务影响** | 管理员无法看到管乐/铜管各 5 组的精确统计，影响评审分配 |

---

## 四、一般问题

### BE-09：报名时间窗口无后端控制

| 项目 | 内容 |
|---|---|
| **红头文件依据** | 报名账号申请截止：2026-09-28；系统报名：2026-10-09 ~ 2026-10-26；视频上传截止：2026-10-26 |
| **当前接口情况** | `create_report` / `update_report` / `file_create` 均无任何时间判断 |
| **为什么前端无法解决** | 用户可修改浏览器时间绕过前端判断；权威时间窗口必须由后端控制 |
| **后端需要提供** | 1. 引入 `settings.REGISTRATION_DEADLINE = datetime(2026, 10, 26, 23, 59, 59)`<br>2. `create_report` / `update_report`：`if timezone.now() > settings.REGISTRATION_DEADLINE: return failure("报名已截止")`<br>3. `file_create`（视频上传）：同类截止时间检查<br>4. 账号申请（admin/user/create）：`if timezone.now() > datetime(2026, 9, 28): return failure("账号申请已截止")` |
| **前端后续配合** | 前端在报名/上传页面显示倒计时与文案，但不影响业务；后端是唯一权威 |
| **业务影响** | 截止日期后可继续报名，违反业务规则 |

---

### BE-08：学校已报名状态查询接口缺失

| 项目 | 内容 |
|---|---|
| **红头文件依据** | 每校一队（见 BE-02） |
| **当前接口情况** | 无任何"学校是否已报名"查询接口；前端只能等用户提交失败才知道 |
| **为什么前端无法解决** | 该数据必须由后端从数据库中查询 |
| **后端需要提供** | `GET /api/school/report/exists` 返回：<br>```json<br>{<br>  "code": 0,<br>  "data": {<br>    "has_report": true,<br>    "report_id": 123,<br>    "group": "管乐团-小学组",<br>    "establishment": "管乐团",<br>    "status": 0<br>  }<br>}<br>``` |
| **前端后续配合** | 1. 创建报名按钮处调用 `schoolApi.report.exists()`<br>2. 已报名则按钮变为"已报名，[查看详情]"<br>3. 防止用户重复点击 |
| **业务影响** | 用户体验差；后端是 409 时才报错，但前端可提前给出友好提示 |

---

### BE-11：指定曲目字典缺失

| 项目 | 内容 |
|---|---|
| **红头文件依据** | 第十二届指定曲目由组委会统一定义，必须从字典中选择，不可自由输入 |
| **当前接口情况** | 无曲目字典表；前端 `form.name1`（指定曲目）为自由文本 |
| **为什么前端无法解决** | 曲目字典（特别是大学组 vs 中学组差异）由组委会确定并维护，必须由后端提供数据 |
| **后端需要提供** | 1. 新建 `repertoire` 表（id, establishment, group_level, title, composer, year 等字段）<br>2. 录入第十二届各组别的指定曲目<br>3. `GET /api/repertoire/list?establishment=管乐团&group=大学组` 返回曲目列表<br>4. `create_report` / `update_report` 中 `name1` 必须从曲目字典中取值 |
| **前端后续配合** | OrchestraForm 改"指定曲目"为 `el-select`，下拉选项来自 `repertoire` API |
| **业务影响** | 无法保证所有参赛队演奏同一指定曲目，破坏活动一致性 |

---

### BE-10：导出文件名不含第十二届届数

| 项目 | 内容 |
|---|---|
| **红头文件依据** | 文件名应反映"第十二届"以与历史文件区分 |
| **当前接口情况** | `export_services.py` 中文件名硬编码：<br>`/api/export/report` → `"节目报送表.pdf"`<br>`/api/export/person` → `"参演人员信息表.pdf"`<br>`/api/admin/export/data1` → `"数据导出.xlsx"`<br>`/api/admin/export/data2` → `"数据导出.xlsx"`<br>`/api/admin/chouqian/export/{type}` → `"{组别}现场展演抽签顺序表.xlsx"`<br>`/api/admin/chouqian/exportall` → `"所有类别抽签排序表.xlsx"` |
| **为什么前端无法解决** | 文件名由后端在 `Content-Disposition` 中生成 |
| **后端需要提供** | 将上述文件名改为：<br>`"第十二届意林杯节目报送表.pdf"`<br>`"第十二届意林杯参演人员信息表.pdf"`<br>`"第十二届意林杯数据导出.xlsx"`<br>等等 |
| **前端后续配合** | 前端已不覆盖后端文件名（`a.download = fileName ? fileName + '.xlsx' : undefined`），只需后端修复 |
| **业务影响** | 文件名与历史资料混淆，文件归档时易出错 |

---

## 五、低优先级问题

### BE-04：资格审核（本校师生校验）

| 项目 | 内容 |
|---|---|
| **红头文件依据** | 资格审核识别"非本校师生" |
| **当前接口情况** | `create_report` 仅校验 `Person.card` 唯一性，无学校归属校验 |
| **为什么前端无法解决** | 跨表身份证+学校匹配校验由后端 `Person.card` + `Person.school` + `User.description` 联合查询 |
| **后端需要提供** | `create_report` / `update_report` 中：<br>1. 提取 `form.teacher[].card` + `form.person[].card`<br>2. 对每个身份证号，查 `Person` 表中 `school` 字段<br>3. 若 `person.school != form.school_name`，标记为"非本校师生"<br>4. 警告而非硬性拒绝（允许指挥/外聘教师）<br>5. 字段存入 `Report.check_remark` 或类似字段 |
| **前端后续配合** | 显示警告提示，但不阻止提交 |
| **业务影响** | 非本校师生无法被标记，需人工审核 |

---

### BE-06：集体照 600dpi 分辨率校验

| 项目 | 内容 |
|---|---|
| **红头文件依据** | 第十二届集体照要求 JPEG/TIFF 格式、分辨率不低于 600dpi、用于制作秩序册 |
| **当前接口情况** | 无 DPI 校验 |
| **为什么前端无法解决** | 前端无法读取 JPEG/PDF 的 DPI 元数据 |
| **后端需要提供** | `file_create` 中集体照 type：<br>1. 使用 Pillow 读取图片<br>2. `image.info.get('dpi', (72, 72))` 取 DPI<br>3. 若 min(dpi) < 600 返回 `failure("集体照分辨率需不低于 600dpi")` |
| **前端后续配合** | 前端已有格式/大小校验（≤20MB + JPEG/TIFF），DPI 由后端保证 |
| **业务影响** | 低分辨率集体照用于印刷秩序册会模糊 |

---

### BE-07：服务端文件格式/大小兜底校验

| 项目 | 内容 |
|---|---|
| **红头文件依据** | 照片 ≤100KB + JPG；视频 MP4/MOV ≤700MB；集体照 JPEG/TIFF ≤20MB |
| **当前接口情况** | `file_create` 直接落库，无任何文件格式/大小校验 |
| **为什么前端无法解决** | 防绕过必须由后端做；用户可直接调 API 绕过前端 |
| **后端需要提供** | `file_create` 中根据 `type` 字段（photo/spectrum/file）执行：<br>1. photo（个人照片）：`size ≤ 100*1024` + MIME=`image/jpeg`<br>2. spectrum（集体照）：`size ≤ 20*1024*1024` + MIME=`image/jpeg` 或 `image/tiff`<br>3. file（视频）：`size ≤ 700*1024*1024` + MIME=`video/mp4` 或 `video/quicktime` |
| **前端后续配合** | 前端已有前端校验，后端是双重保障 |
| **业务影响** | 绕过前端可上传超大文件 / 错误格式文件 |

---

## 六、字段约束补充说明

### Report 模型当前字段（已确认）

```python
# apps/core/models.py
class Report(models.Model):
    id = BigAutoField(primary_key=True)
    user_id = IntegerField(db_index=True)
    choir_name = CharField(max_length=255)
    name = CharField(max_length=255)          # 自选曲目
    name1 = CharField(max_length=255)         # 指定曲目
    school_name = CharField(max_length=255)
    desc = CharField(max_length=1000)
    group = CharField(max_length=255)         # 存字符串 "小学组"/"中学组"/"大学组"
    establishment = CharField(max_length=255) # 存字符串 "管乐团"/"铜管乐团"
    establishment_name = CharField(max_length=255)
    contact_name = CharField(max_length=255)
    contact_phone = CharField(max_length=255)
    contact_way = CharField(max_length=255)
    time_length = IntegerField(default=0)
    spectrum = IntegerField()                 # 集体照 Files.id
    file = IntegerField()                     # 视频 Files.id
    dinner_reservation = JSONField()          # 用餐预约
    status = IntegerField(default=0)          # -1驳回 0待审核 1通过
    remark = CharField(max_length=255)
    # 需要新增：
    # is_locked = BooleanField(default=False)  # BE-03
```

### 后端需要新增的字段

```sql
-- BE-03：报名锁定
ALTER TABLE report ADD COLUMN is_locked BOOLEAN DEFAULT FALSE;

-- BE-02 备选：学校唯一约束（若新增 school_id 字段）
ALTER TABLE report ADD COLUMN school_id INTEGER;
ALTER TABLE report ADD CONSTRAINT uq_school UNIQUE (school_id);
```

### 现有 schema 不存在的问题

后端 Report 表**不存在**以下字段（前端 ProgramForm 发送了这些字段但被后端静默丢弃）：

| 字段 | 来源 | 建议 |
|---|---|---|
| `group_type` | 前端 ProgramForm | 后端不需要，是 11 届遗留字段 |
| `origin` | 前端 ProgramForm | 后端不需要 |
| `territory` | 前端 ProgramForm | 后端不需要 |

---

## 七、API 接口清单（需要新增/修改）

### 需要新增的接口

| 方法 | 路径 | 用途 | 对应 BE |
|---|---|---|---|
| POST | `/api/oss/video-token` | 获取 OSS 临时凭证 | BE-05 |
| GET | `/api/school/report/exists` | 学校是否已报名 | BE-08 |
| GET | `/api/repertoire/list` | 指定曲目字典查询 | BE-11 |

### 需要修改的接口

| 方法 | 路径 | 修改内容 | 对应 BE |
|---|---|---|---|
| POST | `/api/{city,school,province}/report/create` | 加唯一性检查 | BE-02 |
| PUT | `/api/{city,school,province}/report/update` | 加时间窗检查 + 锁定判断 | BE-03, BE-09 |
| GET | `/api/admin/index/total` | 改为 (establishment, group) 联合分组 | BE-01 |
| GET | `/api/committee/index/total` | 同上 | BE-01 |
| GET | `/api/city/index/total` | 同上 | BE-01 |
| GET | `/api/school/index/total` | 同上 | BE-01 |
| GET | `/api/province/index/total` | 同上 | BE-01 |
| POST | `/api/file/create` | 加文件类型/大小校验 | BE-06, BE-07 |
| GET | `/api/export/report` | 文件名加"第十二届" | BE-10 |
| GET | `/api/export/person` | 同上 | BE-10 |
| GET | `/api/export/data` | 同上 | BE-10 |
| GET | `/api/admin/export/data1` | 同上 | BE-10 |
| GET | `/api/admin/export/data2` | 同上 | BE-10 |

---

## 八、优先级建议与排期参考

### 第一阶段：阻塞业务（1 周内必须完成）

1. **BE-05** OSS 视频上传接口
2. **BE-02** 每校一队唯一约束

### 第二阶段：严重问题（2 周内）

3. **BE-03** 报名锁定
4. **BE-01** stats 联合分组查询

### 第三阶段：一般问题（视项目进度）

5. **BE-09** 时间窗口控制
6. **BE-08** 已报名状态查询
7. **BE-11** 指定曲目字典
8. **BE-10** 文件名加届数

### 第四阶段：低优先级（建议完成）

9. **BE-04** 资格审核
10. **BE-06** 600dpi 校验
11. **BE-07** 文件格式兜底

---

## 九、前端已完成的配套修改（无需后端配合）

为避免后端处理时回头修改前端，以下前端修复已经完成并通过 `npm run build` 验证：

| 修改文件 | 修改内容 |
|---|---|
| `src/views/admin/report.vue` | group filter 从数字 `0-4` 改为后端字符串 `管乐团-小学组` 等 |
| `src/components/elementary/ReportList.vue` | `edit()` 中 row.group 改为字符串比较 |
| `src/config/groupConfig.js` | BACKEND_GROUP_VALUE/BACKEND_ESTABLISHMENT_VALUE 改为已验证的后端字符串（※该文件全项目零引用，已删除；等价信息在 `src/config/personRules.js` 的 `orchestraType` / `level`） |
| `src/utils/excel.js` | downloadExcelFile 不覆盖后端 Content-Disposition 文件名 |
| `src/views/committee/index.vue` | 表格 11 届统计名加 12 届说明 |
| `README.md` | 第十二届 BE 依赖清单已存档 |

---

## 十、文档维护说明

- **文档作者**：前端负责人
- **更新方式**：后端完成每条 BE 后，请回复"BE-XX 已完成"，前端将在后续轮次更新本文档
- **后端实施完成后**：建议后端负责人同步更新以下文件：
  - `apps/api/views.py` 中各接口实现
  - `apps/core/models.py` 中字段定义
  - 数据库迁移文件 `apps/core/migrations/`
  - OpenAPI 文档（通过 `python manage.py export_openapi`）

---

> **最后提醒**：本清单中所有问题均基于 2026-09-21 时刻的后端代码（apps/api/views.py、apps/core/models.py、apps/core/services.py、apps/api/export_services.py）审计得出。
> 如后端代码后续有调整，请前端再次复核对应字段映射是否仍然成立。
