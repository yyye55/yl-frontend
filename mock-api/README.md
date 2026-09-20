# 本地演示环境（Mock API）

让前端脱离后端独立跑起来，用于演示 / 界面验收 / 点着看。
**完全在本地内存运行，不连数据库，不向任何外部主机发请求。**

## 启动

在仓库根目录一条命令同时起 mock 后端和 dev server：

```bash
npm run dev:mock
```

然后打开 http://127.0.0.1:8080/

也可以分开起（两个终端）：

```bash
npm run mock    # mock 后端，端口 8787
npm run dev     # 前端 dev server，端口 8080
```

## 登录

**用户名选角色，密码随便填（非空即可）**：

| 用户名 | 角色 | 登录后进入 |
|---|---|---|
| `admin` | 管理员 (type 3) | `/admin/index` |
| `province` | 省级 (type 4) | `/province/index` |
| `committee` | 组委会 (type 2) | `/committee/index` |
| `city` | 市级 (type 1) | `/city/index` |
| `school` | 学校 (type 0) | `/school/index` |

用户名支持中文关键词（如 `省`、`市`、`学校`）和前缀匹配，未匹配到时默认按管理员处理。

## 它是怎么接上的

`.env.development` 里把 API 基础地址指向本地：

```
VITE_API_BASE_URL=http://127.0.0.1:8787/ylbxt
```

`src/utils/request.js` 读的就是这个变量。

**想切回真实后端**：把该变量改成 `https://bigapp.scbdc.edu.cn/ylbxt`，重启 vite 即可。

## 覆盖范围

- 登录 / 登出 / 用户信息
- 全部列表接口（报名、推荐、用户、人员、日志、扫描件、在线、抽签…）—— 返回 23 条带真实字段名的假数据，支持 `page` / `page_size` 分页
- 首页统计（`index/total`、`index/percent`）—— 形状与后端 `stats_admin()` 一致
- 增 / 删 / 改 —— 一律返回成功，让交互流程能走完（**不会真的改变数据**，刷新即复原）

### 角色数据隔离（与真实后端对齐）

真实后端 `apps/api/views.py:67 report_queryset()` 会做 `filter(user_id=current_user.id)`，
且每个端点都有 `role_error()` 守卫。本服务如实模拟了这两层：

| 行为 | 说明 |
|---|---|
| **报名汇总按单位隔离** | `/school|city|province /report/list` 只返回**本单位**的报名。学校账号看到的所有行的「乐团名称 / 参展学校」都是自己 |
| **跨角色访问返回 403** | 学校 token 打 `/api/admin/*` → `403 无该页面操作权限！`（对应后端 `role_error`） |
| **不隔离的接口** | `/api/admin/*`、`/api/committee/*` 的列表**故意返回全部**——这两类角色本就负责审核全部报名 |

登录返回的 token 里编码了角色（`mock-token-<type>-<id>-<ts>`），服务端据此还原身份。

## 已知限制

| 限制 | 说明 |
|---|---|
| **文件上传不可用** | 七牛 token 是假的，上传节目单/照片会失败 |
| **导出的是占位文件** | 点击导出会下载一个名为 `mock-export.xlsx` 的文本文件，Excel 打不开，仅用于验证下载流程 |
| **数据不持久** | 所有写操作都是空操作，刷新页面后回到初始假数据 |
| **只实现了 GET 语义** | 搜索/筛选参数被忽略，翻页有效 |

## 注意

本环境**不修复任何已知缺陷**。仓库根 [README.md](../README.md) 的「已知问题」一节里列出的问题（图标不渲染、主题色为 Element 默认蓝、`size="mini"` 失效等）在这个演示环境里**同样存在**——因为它跑的就是同一份源码。
