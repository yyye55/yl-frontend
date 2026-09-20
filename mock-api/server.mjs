/**
 * 「意林杯」本地 Mock API
 *
 * 用途：让前端可以脱离后端独立跑起来，用于演示 / 界面验收 / 点着看。
 * 特性：
 *   - 用【用户名】选择登录角色，密码随便填（非空即可）
 *   - 返回与后端 apps/core/services.py 完全一致的响应信封 {code,msg,data,count}
 *   - 列表接口返回带真实字段名的假数据，页面能渲染出表格而不是空表
 *   - 纯 Node 内置模块，零依赖
 *
 * 安全：本服务完全在本地内存中运行，不连接任何数据库，不向任何外部主机发请求。
 *
 * 启动：node mock-api/server.mjs
 */
import http from 'node:http'

const PORT = Number(process.env.PORT || 8787)
const PREFIX = '/ylbxt'

/* ============================================================
 * 账号：用户名决定角色，密码任意
 * ============================================================ */
const ACCOUNTS = [
  { keys: ['admin', '管理员', 'gly'], type: 3, nickname: '省组委会管理员', home: '/admin' },
  { keys: ['province', '省', '省级'], type: 4, nickname: '四川省教育厅', home: '/province' },
  { keys: ['committee', '组委会', '委员会'], type: 2, nickname: '省组委会', home: '/committee' },
  { keys: ['city', '市', '市级'], type: 1, nickname: '成都市教育局', home: '/city' },
  { keys: ['school', '学校', '校级'], type: 0, nickname: '成都市实验小学', home: '/school' }
]

function resolveAccount(username) {
  const u = String(username || '').trim().toLowerCase()
  const hit = ACCOUNTS.find((a) => a.keys.some((k) => u === k || u.includes(k)))
  const base = hit || ACCOUNTS[0]
  return {
    id: ACCOUNTS.indexOf(base) + 1,
    username: username || base.keys[0],
    nickname: base.nickname,
    name: base.nickname,
    type: base.type,
    school: base.type === 0 ? base.nickname : '',
    description: '本地演示账号（mock）',
    tel: '13800000000',
    leader: '领队甲',
    parent_id: 0
  }
}

/* ============================================================
 * 假数据
 * ============================================================ */
const GROUPS = ['小学组', '中学组', '大学组', '中小学教师组', '高校教师组']
const SCHOOLS = ['成都市实验小学', '成都市第七中学', '四川大学附属中学', '成都树德中学', '绵阳中学']
const PIECES = ['《红旗颂》', '《茉莉花》', '《歌唱祖国》', '《我的祖国》', '《长江之歌》', '《走向复兴》']
const NAMES = ['张伟', '李娜', '王芳', '刘洋', '陈静', '杨磊', '赵敏', '黄鹏']
const STATUS = { 0: '待审核', 1: '组委会通过', '-1': '未通过' }

const pick = (arr, i) => arr[i % arr.length]
const pad = (n) => String(n).padStart(2, '0')
const stamp = (i) => `2026-0${(i % 9) + 1}-${pad((i % 27) + 1)} 09:${pad(i % 60)}:00`

/** 报名/节目行 —— 字段取自 admin/report.vue、ReportList.vue 等页面的 el-table-column prop */
function reportRow(i) {
  return {
    id: i + 1,
    name: pick(PIECES, i),
    choir_name: pick(SCHOOLS, i) + '管乐团',
    school_name: pick(SCHOOLS, i),
    group: i % 5,
    group_name: pick(GROUPS, i),
    contact_name: pick(NAMES, i),
    contact_phone: '138' + String(10000000 + i).slice(0, 8),
    contact_way: pick(SCHOOLS, i),
    status: [0, 1, -1][i % 3],
    status_name: pick(Object.values(STATUS), i),
    spectrum: { id: i + 1, url: '' },
    file: { id: i + 1, url: '' },
    person: rowsFor(3, personRow),
    created_at: stamp(i),
    user: { id: (i % 5) + 1, nickname: pick(SCHOOLS, i), username: 'school' + (i % 5) }
  }
}

/** 用户行 —— admin/user.vue: username/nickname/description/tel/leader/type */
function userRow(i) {
  const type = i % 5
  const kinds = ['学校', '市级', '组委会', '管理员', '省级']
  return {
    id: i + 1,
    username: ['school', 'city', 'committee', 'admin', 'province'][type] + (i + 1),
    nickname: pick(SCHOOLS, i),
    description: '第' + (i + 1) + '号单位',
    tel: '138' + String(10000000 + i).slice(0, 8),
    leader: pick(NAMES, i),
    type,
    type_name: kinds[type],
    parent_id: 0,
    created_at: stamp(i)
  }
}

/** 人员行 —— admin/person.vue: name/card/school */
function personRow(i) {
  return {
    id: i + 1,
    name: pick(NAMES, i),
    card: '5101' + String(20000101 + i),
    school: pick(SCHOOLS, i),
    tel: '138' + String(10000000 + i).slice(0, 8),
    type: i % 5
  }
}

/** 日志行 —— admin/log.vue: created_at/content/user.nickname */
function logRow(i) {
  const acts = ['用户登录', '新增报名', '修改用户', '审核通过', '导出数据', '用户退出']
  return {
    id: i + 1,
    content: pick(acts, i),
    name: pick(acts, i),
    created_at: stamp(i),
    user: { id: (i % 5) + 1, nickname: pick(NAMES, i), username: 'user' + (i % 5) }
  }
}

/** 扫描件行 —— admin/scan.vue: date/nickname */
function scanRow(i) {
  return {
    id: i + 1,
    date: `2026-0${(i % 9) + 1}-${pad((i % 27) + 1)}`,
    nickname: pick(SCHOOLS, i),
    name: pick(SCHOOLS, i),
    url: '',
    status: i % 2
  }
}

/** 推荐行 */
function recommendRow(i) {
  return { ...reportRow(i), recommend: 1, remark: '推荐意见 ' + (i + 1) }
}

const rowsFor = (n, fn) => Array.from({ length: n }, (_, i) => fn(i))
const LIST_LEN = 23

/** 报名一览表 —— 与后端 stats_admin() 返回的 [{name, data:[合计,驳回,待审核,组委会通过]}] 一致 */
const STATS_ADMIN = [
  { name: '小学组报名情况', data: [42, 3, 11, 28] },
  { name: '中学组报名情况', data: [31, 1, 6, 24] },
  { name: '大学组报名情况', data: [18, 2, 4, 12] },
  { name: '中小学教师组报名情况', data: [25, 0, 5, 20] },
  { name: '高校教师组报名情况', data: [14, 1, 3, 10] }
]

/** 市/校/省首页表 —— 字段取自 {province,city,school}/index.vue 的 el-table-column prop */
const STATS_SCOPED = [
  { id: 1, name: '小学组', total: 42, data1: 38, data2: 3, data3: 1 },
  { id: 2, name: '中学组', total: 31, data1: 29, data2: 2, data3: 0 },
  { id: 3, name: '大学组', total: 18, data1: 16, data2: 2, data3: 0 },
  { id: 4, name: '中小学教师组', total: 25, data1: 24, data2: 1, data3: 0 },
  { id: 5, name: '高校教师组', total: 14, data1: 13, data2: 1, data3: 0 }
]

/* ============================================================
 * 响应信封（与 apps/core/services.py 一致）
 * ============================================================ */
const ok = (data = null, msg = '') => ({ code: 0, msg, data })
const page = (data, count = data.length) => ({ code: 0, msg: '', data, count })
const fail = (msg) => ({ code: 1, msg, data: null })

/* ============================================================
 * 路由
 * ============================================================ */
/** 角色守卫 —— 对应后端 role_error(request, expected)
 *  真实后端在每一个 admin/committee/city/school/province 端点上都调了它，
 *  所以「学校账号能不能读管理端数据」这件事，答案是：404/403，读不到。 */
const ROLE_GUARD = [
  [/^\/api\/v2\/(admin|committee|school)\//, { admin: 3, committee: 2, school: 0 }],
  [/^\/api\/(admin|committee|city|school|province)\//, { admin: 3, committee: 2, city: 1, school: 0, province: 4 }]
]

function guard(pathname, auth) {
  for (const [re, map] of ROLE_GUARD) {
    const m = re.exec(pathname)
    if (!m) continue
    const need = map[m[1]]
    if (need === undefined) continue
    if (!auth) return { code: 403, msg: '无该页面操作权限！', data: null }
    if (auth.type !== need) return { code: 403, msg: '无该页面操作权限！', data: null }
  }
  return null
}

function route(pathname, method, query, body, auth) {
  const p = pathname.replace(PREFIX, '')

  const denied = guard(pathname, auth)
  if (denied) return denied

  /* ---------- 登录 / 登出 ---------- */
  if (p === '/api/login' && method === 'POST') {
    const username = body.username || query.username || ''
    const password = body.password || query.password || ''
    if (!username) return fail('用户不存在')
    if (!password) return fail('账号或密码错误')
    const acc = resolveAccount(username)
    // token 里带上角色，后续请求据此做数据隔离（真实后端是按 user_id 过滤）
    return ok({ token: `mock-token-${acc.type}-${acc.id}-${Date.now()}`, user: acc }, '登录成功')
  }
  if (p === '/api/logout') return ok(null, '退出成功')
  if (p === '/api/user' && method === 'PUT') {
    return ok({ ...resolveAccount(body.username), ...body })
  }
  if (p === '/api/rules') return ok({ list: [] })

  /* ---------- 首页统计 ---------- */
  if (p === '/api/admin/index/total') return ok(STATS_ADMIN, '获取成功！')
  if (p === '/api/committee/index/total') return ok(STATS_ADMIN, '获取成功！')
  if (/^\/api\/(province|city|school)\/index\/total$/.test(p)) {
    return ok({ data: STATS_SCOPED, success: STATS_SCOPED, limit: 3 }, '获取成功！')
  }
  if (/^\/api\/(province|city|school)\/index\/percent$/.test(p)) {
    const percent = STATS_SCOPED.map((r, i) => ({ name: r.name, percent: 60 + i * 7, total: r.total }))
    return ok({ list: percent, data: percent }, '获取成功！')
  }

  /* ---------- 角色作用域列表 ----------
   * 真实后端 apps/api/views.py:67 report_queryset()：
   *     if current_user: qs = qs.filter(user_id=current_user.id)
   * /school、/city、/province 的 report/list 都走 register_scope_routes，
   * 传入 request.auth —— 所以每个账号【只能看到自己单位提交的报名】。
   * 这里如实模拟：每个账号只返回属于自己的那几条。
   */
  if (method === 'GET' && /^\/api\/(province|city|school)\/report\/list$/.test(p)) {
    const scope = p.split('/')[2]
    if (!auth) return fail('登录认证已过期')
    // 角色必须匹配，否则 403 —— 对应后端 role_error()
    const want = { school: 0, city: 1, province: 4 }[scope]
    if (auth.type !== want) return { code: 403, msg: '无该页面操作权限！', data: null }
    const n = 3 + auth.id // 每个账号条数不同，便于肉眼确认隔离生效
    const mine = rowsFor(n, (i) => ({
      ...reportRow(i),
      // 归属全部替换成「本单位」，等价于 user_id 过滤后的效果
      school_name: auth.nickname,
      choir_name: auth.nickname + '管乐团',
      user: { id: auth.id, nickname: auth.nickname, username: auth.username }
    }))
    return page(mine, mine.length)
  }

  /* ---------- 列表 ---------- */
  const LISTS = [
    [/\/report\/list$/, () => rowsFor(LIST_LEN, reportRow)],
    [/\/recommend\/list$/, () => rowsFor(LIST_LEN, recommendRow)],
    [/\/person\/list$/, () => rowsFor(LIST_LEN, personRow)],
    [/\/log\/list$/, () => rowsFor(LIST_LEN, logRow)],
    [/\/scan\/list$/, () => rowsFor(LIST_LEN, scanRow)],
    [/\/scan\/files$/, () => rowsFor(LIST_LEN, scanRow)],
    [/\/online\/list$/, () => rowsFor(LIST_LEN, reportRow)],
    [/\/live\/list$/, () => rowsFor(LIST_LEN, reportRow)],
    [/\/file\/list$/, () => rowsFor(LIST_LEN, scanRow)],
    [/\/student\/list$/, () => rowsFor(LIST_LEN, personRow)],
    [/\/leader\/list$/, () => rowsFor(LIST_LEN, personRow)],
    [/\/team\/list$/, () => rowsFor(LIST_LEN, reportRow)],
    [/\/v2\/.*\/list$/, () => rowsFor(LIST_LEN, reportRow)],
    [/\/(admin|committee)\/user\/list$/, () => rowsFor(LIST_LEN, userRow)],
    [/\/user\/list$/, () => rowsFor(LIST_LEN, userRow)],
    [/\/jiemu\/all\//, () => rowsFor(LIST_LEN, reportRow)],
    [/\/chouqian\/school\/list$/, () => rowsFor(LIST_LEN, recommendRow)],
    [/\/chouqian\//, () => rowsFor(LIST_LEN, reportRow)]
  ]
  if (method === 'GET') {
    for (const [re, gen] of LISTS) {
      if (re.test(p)) {
        const data = gen()
        // 支持分页参数，让翻页有真实反馈
        const pageNo = Number(query.page || query.pageNum || 1)
        const size = Number(query.page_size || query.limit || 20)
        const start = (pageNo - 1) * size
        return page(data.slice(start, start + size), data.length)
      }
    }
  }

  /* ---------- 详情 ---------- */
  if (method === 'GET' && /^\/api\/(province|city|school)\/report\/\d+$/.test(p)) {
    return ok(reportRow(Number(p.split('/').pop()) || 0))
  }
  if (method === 'GET' && /^\/api\/live\/\d+$/.test(p)) {
    return ok(pick([reportRow(0), reportRow(1)], Number(p.split('/').pop()) || 0))
  }

  /* ---------- 写操作：一律返回成功，让交互流程能走完 ---------- */
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    if (/\/export/.test(p)) return ok(null, '导出成功')
    return ok(null, '操作成功!')
  }

  /* ---------- 导出（blob） ---------- */
  if (/\/export|\/exportall/.test(p)) return ok(null, '导出成功')

  /* ---------- 七牛 token（演示环境不支持真实上传） ---------- */
  if (p === '/api/qiniu/token') return { code: 0, msg: '', data: { uptoken: 'mock-uptoken-demo' }, uptoken: 'mock-uptoken-demo' }

  /* ---------- 兜底 ---------- */
  return ok([], '')
}

/* ============================================================
 * HTTP 服务
 * ============================================================ */
const isExport = (pathname) => /\/export|\/exportall|export\//.test(pathname)

/** 解析 Authorization: Bearer mock-token-<type>-<id>-<ts> */
function parseAuth(header) {
  if (!header) return null
  const m = /mock-token-(\d+)-(\d+)-/.exec(header)
  if (!m) return null // 非本服务签发的 token 一律视为未登录
  const type = Number(m[1])
  const id = Number(m[2])
  const base = ACCOUNTS.find((a) => a.type === type) || ACCOUNTS[0]
  return { id, type, nickname: base.nickname, username: base.keys[0] }
}

function parseBody(raw, contentType) {
  if (!raw) return {}
  if (contentType.includes('application/json')) {
    try { return JSON.parse(raw) } catch { return {} }
  }
  const out = {}
  for (const [k, v] of new URLSearchParams(raw)) out[k] = v
  return out
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`)
  const { pathname, searchParams } = url

  // CORS —— 前端 dev server 在 8080，这里是跨域
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With')
  res.setHeader('Access-Control-Max-Age', '86400')

  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end() }

  // 从 Authorization: mock-token-<type>-<id>-<ts> 还原身份，用于数据隔离
  const auth = parseAuth(req.headers.authorization)

  let raw = ''
  req.on('data', (c) => { raw += c })
  req.on('end', () => {
    const query = Object.fromEntries(searchParams)
    const body = parseBody(raw, req.headers['content-type'] || '')
    const result = route(pathname, req.method, query, body, auth)

    // ===== 打印，方便看前端到底调了什么 =====
    const tag = `[${req.method}] ${pathname}`
    if (isExport(pathname)) {
      console.log(`${tag}  -> 导出桩`)
      res.writeHead(200, {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="mock-export.xlsx"'
      })
      return res.end('本文件由本地 Mock API 生成，仅用于演示下载流程，不是真实报表。')
    }

    console.log(`${tag}  -> code=${result.code}${result.count !== undefined ? ' count=' + result.count : ''}`)
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify(result))
  })
})

server.listen(PORT, '127.0.0.1', () => {
  console.log('')
  console.log('  「意林杯」本地 Mock API 已启动')
  console.log(`  地址：http://127.0.0.1:${PORT}${PREFIX}`)
  console.log('')
  console.log('  登录时用【用户名】选角色，密码随便填：')
  console.log('    admin      管理员   -> /admin')
  console.log('    province   省级     -> /province')
  console.log('    committee  组委会   -> /committee')
  console.log('    city       市级     -> /city')
  console.log('    school     学校     -> /school')
  console.log('')
})
