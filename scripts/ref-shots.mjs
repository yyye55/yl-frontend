/**
 * 参考截图工具（还原辅助，非运行时依赖）
 *
 * 作用：在本地把**原始 Vue2 dist** 跑起来并截图，作为还原 Vue3 页面时的「真值参照」。
 *
 * 关键点：所有 /api 请求由 Playwright 拦截并返回本地 fixture，
 *        **不会向生产环境 bigapp.scbdc.edu.cn 发出任何真实请求**。
 *        dist 的路由守卫是 beforeEach((e,t,n)=>{start(),n()})——没有任何鉴权逻辑，
 *        因此无需登录即可直接渲染任意页面（只需预置 localStorage.token / user）。
 *
 * 用法：
 *   node scripts/ref-shots.mjs                      截取全部路由
 *   node scripts/ref-shots.mjs --only /city,/school 只截匹配的路由
 *   node scripts/ref-shots.mjs --list               只列出待截路由
 * 输出：frontend/.ref/<路由转下划线>.png
 */
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const here = path.dirname(fileURLToPath(import.meta.url))
const argvRaw = process.argv.slice(2)
const getRaw = (n) => {
  const i = argvRaw.indexOf(n)
  return i >= 0 ? argvRaw[i + 1] : null
}

/**
 * --root 指定要截的站点根目录，默认是**原始 Vue2 dist**（真值参照）。
 * 传 --root ../dist-frontend（即重建产物）时，同样的 fixture、同样的路由、同样的视口，
 * 得到的是可与真值**逐像素对照**的重建截图。
 * 两份产物的 base 都是 /ylbxt/，所以路由可以直接复用。
 */
const DIST = getRaw('--root')
  ? path.resolve(here, getRaw('--root'))
  : path.resolve(here, '../../dist')
const OUT = getRaw('--out')
  ? path.resolve(here, getRaw('--out'))
  : path.resolve(here, '../.ref')
const BASE = '/ylbxt'

// 必须显式打印实际服务的根目录：--root 是相对 scripts/ 解析的，
// 早先手写 `--root ../dist` 以为指向原始 dist，实际解析成 frontend/dist（**重建产物**），
// 于是「基线」和「待比对」两份截图悄悄互换了身份，据此得出的配色结论全是反的。
{
  const kind = fs.existsSync(path.join(DIST, 'index.html'))
    ? fs.readdirSync(DIST).some((f) => /^app\.[0-9a-f]+\.js$/.test(f))
      ? '原始 Vue2 dist（webpack 产物）'
      : '重建产物（Vite 产物）'
    : '⚠ 目录下没有 index.html'
  console.log(`站点根目录: ${DIST}\n产物类型  : ${kind}\n`)
}

/* ================= 1. 静态服务器（把原始 dist 挂在 /ylbxt/ 下） ================= */
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.mp4': 'video/mp4'
}

function startServer() {
  const server = http.createServer((req, res) => {
    let rel = decodeURIComponent(req.url.split('?')[0])
    if (rel.startsWith(BASE)) rel = rel.slice(BASE.length)
    if (!rel.startsWith('/')) rel = '/' + rel
    let file = path.join(DIST, rel)
    // history 模式：非静态资源一律回落到 index.html
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      file = path.join(DIST, 'index.html')
    }
    const body = fs.readFileSync(file)
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' })
    res.end(body)
  })
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port })))
}

/* ================= 2. fixtures（字段取自后端序列化器与模型） ================= */
const USER = {
  id: 1,
  username: 'ref_user',
  nickname: '示例单位',
  description: '示例备注',
  tel: '13800000000',
  leader: '领队甲',
  type: 3,
  parent_id: 0
}

const PERSON = {
  id: 1,
  name: '张三',
  card: '510100199001011234',
  age: 35,
  school: '示例学校',
  phone: '13900000000',
  gender: '男',
  major: '音乐',
  head: 'https://via.placeholder.com/59x82.png',
  instrument: '长笛',
  other: '',
  remark: ''
}

const FILE_OBJ = { id: 1, name: '示例文件.pdf', url: 'https://example.com/f.pdf', filename: 'f.pdf' }

/**
 * /admin/index/total 与 /committee/index/total 共用的返回体
 *
 * 【契约来源：A】yilinbei/apps/api/views.py:406 stats_admin() —— 两个接口都直接复用它。
 *   [{"name":"小学组报名情况","data":[合计, 驳回, 待审核, 组委会通过]}, 中学组…, 大学组…]
 * 名称与顺序均照抄后端，便于与 dist 截图逐格对齐。
 */
function statsAdmin() {
  return [
    { name: '小学组报名情况', data: [12, 1, 4, 7] },
    { name: '中学组报名情况', data: [9, 0, 2, 7] },
    { name: '大学组报名情况', data: [6, 2, 1, 3] }
  ]
}

/** 状态覆盖 -2/-1/0/1 四种，便于一次性看清 <Status> 的四个分支 */
function reportRow(i) {
  return {
    id: i,
    user_id: 1,
    choir_name: '示例合唱团' + i,
    name: '示例曲目' + i,
    name1: '指定曲目' + i,
    school_name: '示例学校' + i,
    desc: '这是一段乐团简介占位文字。',
    group: (i - 1) % 4,
    establishment: 0,
    establishment_name: '管乐团',
    contact_name: '联系人' + i,
    contact_phone: '1380000000' + i,
    contact_way: '四川省成都市示例路 ' + i + ' 号',
    time_length: 305,
    spectrum: FILE_OBJ,
    file: FILE_OBJ,
    dinner_reservation: [{ id: 1, name: '张三', tel: '13900000000' }],
    status: (i % 4) - 2, // -2 / -1 / 0 / 1
    remark: '这里是驳回原因示例文字。',
    deleted_at: null,
    created_at: '2026-01-0' + i + ' 10:00:00',
    updated_at: '2026-01-0' + i + ' 10:00:00',
    user: USER,
    person: [
      { id: i * 10 + 1, report_id: i, person_id: 1, position: 0, type: 0, person_info: PERSON },
      { id: i * 10 + 2, report_id: i, person_id: 2, position: 4, type: 1, person_info: PERSON },
      { id: i * 10 + 3, report_id: i, person_id: 3, position: 2, type: 0, person_info: PERSON }
    ]
  }
}

function userRow(i) {
  return {
    id: i,
    username: 'user' + i,
    nickname: '单位' + i,
    description: '备注' + i,
    tel: '1380000000' + i,
    leader: '修改人' + i,
    type: (i - 1) % 3,
    parent_id: 0
  }
}

const fixtureMap = [
  // ---- 登录 ----
  [/\/api\/login$/, () => ({ code: 0, msg: '登录成功', data: { token: 'ref-token', user: USER } })],
  [/\/api\/logout$/, () => ({ code: 0, msg: 'ok', data: null })],

  // ---- 文件 / 七牛 ----
  [/\/api\/file\/list/, () => ({ code: 0, msg: '', data: [FILE_OBJ], count: 1 })],
  [/\/api\/file\/create/, () => ({ code: 0, msg: '', data: FILE_OBJ })],
  [/\/api\/qiniu\/token/, () => ({ code: 0, msg: '', data: { token: 'ref-qiniu', domain: 'https://example.com' } })],

  // ---- 列表类：统一返回 4 行，覆盖四种状态 ----
  [/\/report\/list/, () => {
    const data = [1, 2, 3, 4].map(reportRow)
    return { code: 0, msg: '', data, count: 40 }
  }],
  [/\/user\/list/, () => {
    const data = [1, 2, 3].map(userRow)
    return { code: 0, msg: '', data, count: 3 }
  }],
  [/\/person\/list/, () => ({ code: 0, msg: '', data: [PERSON], count: 1 })],
  [/\/log\/list/, () => ({
    code: 0,
    msg: '',
    data: [{ id: 1, user_id: 1, type: 1, content: '修改节目报名表 示例', created_at: '2026-01-01 10:00:00', user: USER }],
    count: 1
  })],
  [/\/recommend\/list/, () => ({
    code: 0,
    msg: '',
    data: [{ id: 1, name: '优秀组织奖申报示例', user_id: 1, created_at: '2026-01-01 10:00:00', status: 0, user: USER }],
    count: 1
  })],
  [/\/online\/list/, () => ({
    code: 0,
    msg: '',
    data: [{ id: 1, name: '展演节目示例', user_id: 1, created_at: '2026-01-01 10:00:00', user: USER, leader: [], crew: [] }],
    count: 1
  })],
  [/\/live\/list/, () => ({ code: 0, msg: '', data: [{ id: 1, name: '直播示例', user: USER }], count: 1 })],
  [/\/scan\/list/, () => ({
    code: 0,
    msg: '',
    data: [{ id: 1, user_id: 1, ...USER, scanfile: [{ id: 1, user_id: 1, type: 0, files: [FILE_OBJ], status: 0, remark: '', created_at: '2026-01-01' }] }],
    count: 1
  })],
  [/\/chouqian\//, () => ({ code: 0, msg: '', data: [{ id: 1, name: '抽签项目示例', type: 1, code: 'A01', user: USER }], count: 1 })],

  // ---- 统计类 ----
  // 【契约来源：A】逐条核对 yilinbei/apps/api/views.py。
  // 四个首页的 /index/total **不是同一种结构**，必须分别给，否则表格整列取到 undefined：
  //
  //   (1) admin / committee 复用 stats_admin()（views.py:406）
  //       -> data 是数组，每行 { name, data:[合计, 驳回, 待审核, 组委会通过] }
  //          dist 模块 2953（/admin/index）与 22ce（/committee/index）正是按 data[0..3] 渲染四列。
  //   (2) city / school 走 scoped_total()（views.py:628）
  //       -> data 是对象 { success, limit?, data:[{name,total,data1,data2,data3}] }
  //          每行是**扁平命名**字段，与 (1) 完全不同。
  //
  // 注意 fixtureMap 是「首个匹配即返回」，所以这几条必须放在任何宽泛的 /index/total 规则之前。
  [/\/admin\/index\/total/, () => ({ code: 0, msg: '', data: statsAdmin() })],
  [/\/committee\/index\/total/, () => ({ code: 0, msg: '', data: statsAdmin() })],
  [/\/city\/index\/total/, () => ({
    code: 0,
    msg: '',
    data: {
      success: { elementary: 0, teacher: 0 },
      data: [
        { name: '小学组', total: 12, data1: 1, data2: 4, data3: 7 },
        { name: '中学组', total: 9, data1: 0, data2: 2, data3: 7 }
      ]
    }
  })],
  [/\/school\/index\/total/, () => ({
    code: 0,
    msg: '',
    data: {
      success: { colleges: 0, teacher: 0, colleges1: 0 },
      data: [{ name: '大学组', total: 6, data1: 2, data2: 1, data3: 3 }]
    }
  })],
  // /index/percent 的真实结构见 views.py:663 city_percent()：{ data:[{require,pass,data:[]}] }。
  // 注意：dist 里 getPercent() 只在 city 首页定义、且**没有被 mounted 调用**，属不可达代码，
  // 三个地区首页渲染时都不会请求它。这里给出真实结构仅作兜底。
  [/\/(index)\/percent/, () => ({
    code: 0,
    msg: '',
    data: [{ require: '中学组数量不低于中小学组报送总数40%', pass: 1, data: ['中学组数量所在比:0%'] }]
  })],

  // ---- 详情类 ----
  [/\/report\/\d+$/, () => ({ code: 0, msg: '', data: reportRow(1) })],
  [/\/live\/\d+$/, () => ({ code: 0, msg: '', data: { id: 1, name: '直播示例', user: USER, leader: [], crew: [] } })],

  // ---- 写操作 ----
  [/\/(update|create|check|delete|restore)/, () => ({ code: 0, msg: '操作成功', data: 1 })]
]

function respond(url) {
  for (const [re, make] of fixtureMap) {
    if (re.test(url)) return make(url)
  }
  // 兜底：不认识的接口也给成功空数据，避免页面因报错而中断渲染
  return { code: 0, msg: '', data: [], count: 0 }
}

/* ================= 3. 路由列表 ================= */
/**
 * 路由表：两种写法都要覆盖
 *   component:()=>Promise.all([...])  —— 懒加载（大多数页面）
 *   component:xxxx                    —— 同步引入（/login 就是这种，早先漏掉过）
 */
function routesFromDist() {
  // 路由清单**永远取自原始 dist**：重建产物的文件名/结构不同，且我们正是要
  // 用原始路由去驱动重建产物的截图，两边才能对齐。
  const ORIG = path.resolve(here, '../../dist')
  const appFile = fs.readdirSync(ORIG).find((f) => f.startsWith('app.') && f.endsWith('.js'))
  const app = fs.readFileSync(path.join(ORIG, appFile), 'utf8')
  const out = []
  const re = /path:"([^"]+)",name:"([^"]+)",component:/g
  let m
  while ((m = re.exec(app))) out.push(m[1])
  return out
}

/* ================= 4. 主流程 ================= */
const argv = process.argv.slice(2)
const getFlag = (n) => {
  const i = argv.indexOf(n)
  return i >= 0 ? argv[i + 1] : null
}
const only = getFlag('--only')
// 动态路由也截：用具体 id 代入，否则 /online/edit/:id、/chouqian/do/:type 这类页面永远没有参照
let routes = routesFromDist().map((r) => r.replace(/:[a-zA-Z_]+/g, '1'))
if (only) {
  const keys = only.split(',')
  routes = routes.filter((r) => keys.some((k) => r.includes(k)))
}

if (argv.includes('--list')) {
  routes.forEach((r) => console.log(r))
  console.log('共 ' + routes.length + ' 条')
  process.exit(0)
}

fs.mkdirSync(OUT, { recursive: true })
const { server, port } = await startServer()
const browser = await chromium.launch()
let intercepted = 0
let externalBlocked = 0
const externalHosts = new Set()
const errors = []

/**
 * 【每个路由一个独立 context】
 *
 * 登录态必须用 addInitScript 预置 —— 它在**每次导航**时都会执行，
 * 能保证 SPA 启动、路由守卫读取 localStorage 之前，登录态已经就位。
 * 但 addInitScript 绑定在 context 上、创建后不可更改，而不同路由需要不同角色
 * （重建版的 meta.role 守卫会把角色不符的请求重定向走）。
 * 所以：**每个路由新建一个 context**，把该路由的角色烧进 initScript。
 *
 * 这里踩过两个坑，两次都会让截图内容与目标路由毫不相干、从而误判为「页面还原错了」：
 *   1) 所有路由共用一个固定 type=3 的 context
 *      -> /committee|city|school 全被守卫重定向到 /admin/index；
 *   2) 改成用 page.evaluate 在导航前改 localStorage
 *      -> 时序不稳，截出来是登录页。
 * 用「一路由一 context」把这个不确定性彻底消掉。
 */
async function newPageFor(role) {
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 950 }, deviceScaleFactor: 1 })
  await ctx.addInitScript((t) => {
    localStorage.setItem('token', 'Bearer ref-token')
    localStorage.setItem(
      'user',
      JSON.stringify({
        id: 1,
        username: 'ref_user',
        nickname: '示例单位',
        description: '',
        tel: '13800000000',
        leader: '领队甲',
        parent_id: 0,
        type: t
      })
    )
  }, role)

  const page = await ctx.newPage()

  /**
   * 【唯一路由出口】所有网络请求都必须在这里被决定，不允许有请求「漏网」出到公网。
   * 早先只拦截了 bigapp.scbdc.edu.cn，结果 fixture 里的占位图 URL 真的发到了外网
   * （ERR_CONNECTION_TIMED_OUT），既违反了「零外部流量」，又让 networkidle 永远等不到位
   * 导致 5 个 edit 路由超时。现在改为白名单制：
   *   127.0.0.1:本机        -> 放行（本地 dist 静态资源）
   *   bigapp.scbdc.edu.cn  -> 用本地 fixture 应答
   *   其他一切域名          -> 直接放行一个空响应，并记录域名，绝不出网
   */
  await page.route('**/*', async (route) => {
    const url = route.request().url()
    let host = ''
    try {
      host = new URL(url).host
    } catch {
      return route.continue()
    }

    // 本地静态服务器
    if (host.startsWith('127.0.0.1') || host.startsWith('localhost')) return route.continue()

    // 后端接口
    if (host === 'bigapp.scbdc.edu.cn') {
      intercepted++
      return route.fulfill({
        status: 200,
        contentType: 'application/json; charset=utf-8',
        body: JSON.stringify(respond(url))
      })
    }

    // 其余（占位图、字体、CDN 等）一律本地兜底，不出网
    externalBlocked++
    externalHosts.add(host)
    if (/\.(png|jpe?g|gif|svg|webp|ico)(\?|$)/i.test(url)) {
      return route.fulfill({
        status: 200,
        contentType: 'image/png',
        // 1x1 透明 PNG，保证页面有图可渲染且不需要打网络
        body: Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          'base64'
        )
      })
    }
    return route.fulfill({ status: 200, contentType: 'application/octet-stream', body: '' })
  })

  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push('[console] ' + msg.text())
  })

  return { ctx, page }
}

/** 报错必须能归因到具体路由，否则「14 条报错」这种汇总信息没有任何可操作性 */
const errorsByRoute = new Map()

/**
 * 【重建产物专用】按路由前缀切换登录用户角色。
 *
 * 原始 dist 的路由守卫是 `beforeEach((e,t,n)=>{start(), n()})`——**不做任何鉴权**，
 * 所以无论什么角色都能直接打开任意页面。而重建版加了 meta.role 校验，
 * 角色不符会被重定向到 /middle，截出来的就不是目标页面了
 * （实测：固定用 type=3 时，/committee|city|school 的页面全被重定向到
 *  /admin/index，截图内容与目标路由完全不符，极易误判为「还原错了」）。
 *
 * 角色映射取自 src/router/index.js 的 meta.role：
 *   /admin->3  /committee->2  /city->1  /school->0
 * 注意这只影响**截图时的登录态**，不改变任何产品逻辑。
 */
const ROLE_BY_PREFIX = [
  ['/admin', 3],
  ['/committee', 2],
  ['/city', 1],
  ['/school', 0]
]
function roleFor(route) {
  for (const [prefix, role] of ROLE_BY_PREFIX) if (route.startsWith(prefix)) return role
  return 3 // /login /test /middle /online /chouqian 等公共或无需角色的页面
}

/**
 * 等样式就绪后再截图
 *
 * 【为什么必须等】Vue Router 的异步 chunk 会把**该页面自己的 CSS**以 <link> 动态插入
 * <head>。`waitUntil:'networkidle'` 只保证网络空闲，并不保证这些 <link> 已经解析生效。
 *
 * 实测结论：等待时长不足时，本页 chunk CSS 尚未生效，控件会回退到 Element Plus 的
 * **默认**样式（按钮背景是 rgb(64,158,255) 而不是 dist 的 .el-button--primary{#036}）。
 * 早先固定等一个偏短的时长，导致 .ref 基线里若干页面截的是「样式未应用」的中间态，
 * 拿这种基线去比对重建版会得出完全错误的结论（曾据此误判「按钮配色反了」）。
 *
 * 这里轮询 document.styleSheets.length，连续两次不再变化即认为样式已稳定。
 */
async function settleCss(page, timeout = 6000) {
  const start = Date.now()
  let last = -1
  let stable = 0
  while (Date.now() - start < timeout) {
    // 统计**已解析的规则总数**，而不是 styleSheets.length。
    // <link> 一插入 document.styleSheets 就会立刻多出一项（此时 cssRules 还是空的），
    // 所以数表数量会在样式真正生效之前就"稳定"下来——那样等于没等。
    const n = await page
      .evaluate(() => {
        let total = 0
        for (const s of document.styleSheets) {
          try {
            total += s.cssRules ? s.cssRules.length : 0
          } catch {
            /* 跨域表读不到，忽略 */
          }
        }
        return total
      })
      .catch(() => -1)
    if (n === last && n > 0) {
      if (++stable >= 3) return
    } else {
      stable = 0
      last = n
    }
    await page.waitForTimeout(150)
  }
}

for (const r of routes) {
  const url = `http://127.0.0.1:${port}${BASE}${r}`
  const before = errors.length
  // 每个路由独立 context，登录角色随路由切换（见 newPageFor 的说明）
  const { ctx, page } = await newPageFor(roleFor(r))
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 })
    await settleCss(page)
    await page.waitForTimeout(300)
    const name = r.replace(/^\//, '').replace(/[/:]/g, '_') + '.png'
    await page.screenshot({ path: path.join(OUT, name), fullPage: true })

    // 守卫若把请求重定向走，截到的就不是目标页面 —— 必须显式报出来，
    // 否则「截图看起来不对」会被误判成「页面还原错了」
    const landed = new URL(page.url()).pathname.replace(BASE, '')
    const redirected = landed.replace(/\/$/, '') !== r.replace(/\/$/, '')

    const mine = errors.slice(before)
    if (mine.length) errorsByRoute.set(r, mine)
    console.log(
      'OK   ' +
        r.padEnd(34) +
        ' -> ' +
        name +
        (redirected ? '   [被重定向到 ' + landed + ']' : '') +
        (mine.length ? '   [' + mine.length + ' 报错]' : '')
    )
  } catch (e) {
    errorsByRoute.set(r, [...errors.slice(before), 'goto: ' + e.message.split('\n')[0]])
    console.log('FAIL ' + r.padEnd(34) + ' ' + e.message.split('\n')[0])
  } finally {
    await ctx.close()
  }
}

console.log('\n后端请求拦截: ' + intercepted + ' 条（全部由本地 fixture 应答）')
console.log('外部域名拦截: ' + externalBlocked + ' 条 ' + (externalHosts.size ? '[' + [...externalHosts].join(', ') + ']' : '(无)'))
console.log('向外发出的真实请求: 0 条')

if (errorsByRoute.size) {
  console.log('\n按路由归因的页面报错（共 ' + errorsByRoute.size + ' 个路由）:')
  for (const [r, list] of errorsByRoute) {
    console.log('\n  ▸ ' + r)
    ;[...new Set(list)].slice(0, 4).forEach((e) => console.log('      - ' + e.slice(0, 190)))
  }
}

await browser.close()
server.close()
console.log('\n截图目录: ' + OUT)
