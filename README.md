# 「意林杯」四川省第十一届管乐展示活动报名系统 - 前端

多角色报名 + 多级审核 + 抽签 + 人脸识别签到 + 直播报道 + Excel 导入导出的 Vue 3 单页应用。

## 📋 项目信息

| 项目 | 内容 |
|------|------|
| **部署路径** | `/ylbxt/` |
| **后端域名** | `https://bigapp.scbdc.edu.cn/ylbxt` |
| **技术栈** | Vue 3 + Element Plus + Pinia + vue-router 4 + axios + Vite |
| **Node 版本** | 18+ |

## 🚀 快速开始

```bash
npm install
npm run dev:mock
```

`dev:mock` 会同时启动本地 mock 后端（`:8787`）和前端 dev server（`:8080`），
打开 http://localhost:8080/ 即可，**无需真实后端**。

登录方式：**用户名选择角色，密码随便填（非空即可）**。可用用户名见
[mock-api/README.md](mock-api/README.md)。

### 连接真实后端

把 [.env.development](.env.development) 里的 `VITE_API_BASE_URL` 改为
`https://bigapp.scbdc.edu.cn/ylbxt`，然后只跑前端：

```bash
npm run dev
```

### 其他命令

```bash
npm run mock      # 只启动 mock 后端
npm run build     # 生产构建，产物在 dist/
npm run preview   # 预览生产构建（:4173）
```

## 🗂️ 目录结构

```
yl-frontend/
├── mock-api/                        # 本地 mock 后端（零依赖，纯 Node 内置模块）
│   ├── server.mjs                  # 启动：node mock-api/server.mjs
│   └── README.md                   # 可用账号、已知限制
├── public/                          # 静态资源（运行时直接访问，不参与打包）
│   ├── models/                     # face-api.js 人脸识别模型
│   ├── static/                     # 参演人员导入模板.xlsx
│   ├── logo.png                    # 网站 logo + favicon
│   └── login-bg.png                # 登录页背景图
├── scripts/                         # 开发辅助脚本（非构建必需）
│   ├── audit-api-paths.mjs         # 审计 API 路径一致性
│   ├── dist-map.mjs                # 构建产物 chunk 映射
│   ├── probe-route.mjs             # 路由可达性探测
│   └── ref-shots.mjs               # Playwright 截图回归
├── src/
│   ├── api/                        # API 模块（按角色拆分）
│   │   ├── auth.js                 # 登录登出
│   │   ├── admin.js                # 管理员
│   │   ├── committee.js            # 委员会
│   │   ├── province.js             # 省级
│   │   ├── city.js                 # 市级
│   │   ├── school.js               # 学校
│   │   ├── v2.js                   # V2 系列（team/student/leader）
│   │   ├── chouqian.js             # 抽签
│   │   ├── scan.js                 # 人脸签到
│   │   ├── live.js                 # 直播 + 导出
│   │   ├── misc.js                 # 文件/七牛/用户
│   │   └── index.js                # 统一导出
│   ├── components/
│   │   ├── layout/                 # MainLayout + Sidebar + Header + Breadcrumb
│   │   ├── common/                 # SearchForm + PageHeader + 各类展示组件
│   │   ├── elementary/             # 小学组表单与表格
│   │   ├── committee/              # 委员会专用组件
│   │   └── online/                 # 直播相关组件
│   ├── composables/
│   │   └── useTabs.js              # 多 tab 逻辑
│   ├── config/
│   │   └── menus.js                # 侧边栏菜单配置
│   ├── router/
│   │   ├── index.js                # 路由表
│   │   └── guard.js                # 路由守卫
│   ├── store/
│   │   ├── index.js                # Pinia 实例
│   │   └── modules/
│   │       ├── tabs.js             # 多 tab 状态
│   │       └── user.js             # 用户状态
│   ├── styles/
│   │   ├── index.scss              # 全局样式入口
│   │   ├── variables.scss          # 颜色变量
│   │   ├── reset.scss              # 重置
│   │   ├── bg.scss                 # 背景
│   │   └── login.scss              # 登录页样式
│   ├── utils/
│   │   ├── auth.js                 # token/user localStorage
│   │   ├── request.js              # axios 封装
│   │   ├── excel.js                # SheetJS 导出导入
│   │   ├── xlsx.js                 # 表格工具
│   │   └── date.js                 # 时间格式化
│   ├── views/
│   │   ├── login/                  # 登录
│   │   ├── middle/                 # 中转
│   │   ├── test/                   # 人脸识别测试页
│   │   ├── error/                  # 404/500
│   │   ├── admin/                  # 管理员
│   │   ├── committee/              # 委员会
│   │   ├── province/               # 省级
│   │   ├── city/                   # 市级
│   │   ├── school/                 # 学校
│   │   ├── online/                 # 在线直播
│   │   └── chouqian/               # 抽签
│   ├── App.vue                     # 根组件
│   └── main.js                     # 入口
├── index.html
├── vite.config.js
├── package.json
├── .env.development
└── .env.production
```

## 🎭 角色体系

| type | 角色 | 登录后跳转 | 主功能 |
|------|------|-----------|--------|
| 0 | 学校 | `/school` | 录入报名信息 |
| 1 | 市级 | `/city` | 审核本市的报名 |
| 2 | 委员会 | `/committee` | 终极审核、抽签、直播 |
| 3 | 管理员 | `/admin` | 全局管理 |
| 4 | 省级 | `/province` | 省级管理 |

## 📡 API 一览

所有路径以 `VITE_API_BASE_URL` 为前缀。

### 通用
- `POST /api/login` 登录
- `POST /api/logout` 登出

### 管理员 (type=3)
- `/api/admin/report/list` `/check`
- `/api/admin/user/list` `/export` `/` (POST/PUT)
- `/api/admin/person/list` `/`
- `/api/admin/log/list`
- `/api/admin/recommend/list`
- `/api/admin/index/total`
- `/api/admin/chouqian/{type}` `/update` `/export/{type}` `/exportall`
- `/api/admin/export/data1` `/data2`

### 委员会 (type=2)
- `/api/committee/{report,user,online,recommend,index}/...`
- ⚠️ `/committee/api/user`（DELETE）少了一层 `/api` 前缀，**保留原 URL**

### 省级 (type=4)
- `/api/province/report/{create,list,delete/{id},{id},update}`
- `/api/province/recommend/cau` `/list`
- `/api/province/index/{total,percent}`

### 市级 (type=1) 与 省级 结构对称

### 学校 (type=0) 与 市级 结构对称

### 抽签系统
- `/api/chouqian/school/{list,update,export/}`
- `/api/chouqian/jiemu/all/{type}` `/update` `/export/{type}` `/exportall`

### 人脸识别
- `/api/scan/cau` (POST, 上传)
- `/api/scan/files` (GET, 已上传文件)
- `/api/scan/list` (GET, 签到列表)

### 直播报道
- `/api/live/list` `/` (PUT) `/{id}`

### 导出中心
- `/api/export/report` `/person` `/data`

### V2 升级接口
- `/api/v2/admin/{report,team,student,leader}/...`
- `/api/v2/committee/{report,team}/...`
- `/api/v2/school/{report,team}/...`

## 🤖 人脸识别模块

使用 **face-api.js** + 浏览器端 TensorFlow.js 实现，模型文件位于 `public/models/`。

实际加载的模型（见 [src/views/test/index.vue](src/views/test/index.vue)）：

| 模型 | 用途 |
|------|------|
| `ssd_mobilenetv1_model` | 人脸检测 |
| `face_landmark_68_model` | 68 个面部关键点 |
| `face_recognition_model` | 128 维特征向量 |

模型路径由 `import.meta.env.BASE_URL + 'models'` 推导，随 Vite `base` 自动适配部署前缀。
**模型必须留在 `public/models/`，不能打进 bundle。**

测试页面：`/test` —— 可加载模型、打开摄像头、实时检测、提取特征。

集成页面：`/admin/scan`、`/committee/scan`、`/online/index`。

## 🔐 权限

- **登录后**根据 `user.type` 跳转到对应 layout
- **路由级权限**：路由 `meta.role` 与 `user.type` 不匹配时跳回 `/middle`
- **Token 失效**：HTTP 401 自动跳登录
- **无权限**：HTTP 403 自动跳登录

## 🛠️ 环境变量

| 变量 | 说明 |
|------|------|
| `VITE_API_BASE_URL` | API 基础地址。development 默认指向本地 mock，production 指向线上后端 |
| `VITE_APP_TITLE` | 页面标题 |

**部署前缀只有一个来源**：`vite.config.js` 的 `base`（production 下为 `/ylbxt/`）。
代码中一律用 `import.meta.env.BASE_URL` 读取，不要再新增 `VITE_BASE` 之类的自定义变量——两套来源必然漂移。

## ⚠️ 已知问题

以下问题在当前代码中真实存在，尚未修复：

1. **Element Plus 图标全站不渲染** —— 图标组件未导入
2. **主题色未生效** —— 全站配色回退到 Element 默认蓝
3. **`size="mini"` 已从 Element Plus 移除** —— 仍有多处在使用
4. **接口失败路径产生未处理的 Promise rejection**
5. **HTTP 400 无用户可见提示**

## 📦 开发辅助脚本

```bash
node scripts/audit-api-paths.mjs    # 审计 API 路径
node scripts/dist-map.mjs           # 构建产物 chunk 映射
node scripts/probe-route.mjs        # 路由可达性探测
node scripts/ref-shots.mjs          # Playwright 截图回归（产物写入 .ref-current/）
```

截图回归依赖 Playwright，首次使用需 `npx playwright install chromium`。
