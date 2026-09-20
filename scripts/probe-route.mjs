/**
 * 路由探针（还原辅助工具，非运行时依赖）
 *
 * 用途：截图对不上时，先用它回答一个最基本的问题——
 *      「访问这个 URL，最终到底落在哪个页面上？」。
 * 因为重建版有 meta.role 守卫，角色不符会被静默重定向到 /middle，
 * 此时截图内容与目标路由毫不相干，很容易被误判成「页面还原错了」。
 *
 * 用法：
 *   node scripts/probe-route.mjs /committee/recommend
 *   node scripts/probe-route.mjs /city/elementary/list --role 1
 *   node scripts/probe-route.mjs /admin/report --root ../../dist   （探原始 dist）
 *
 * 输出：最终 URL、路由名、页面首屏文本、控制台报错。
 */
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const here = path.dirname(fileURLToPath(import.meta.url))
const argv = process.argv.slice(2)
const getFlag = (n) => {
  const i = argv.indexOf(n)
  return i >= 0 ? argv[i + 1] : null
}

const route = argv.find((a) => a.startsWith('/') && a !== '/') || getFlag('--path')
if (!route) {
  console.error('用法: node scripts/probe-route.mjs /committee/recommend [--role 2] [--root ../dist]')
  process.exit(1)
}

const ROOT = getFlag('--root') ? path.resolve(here, getFlag('--root')) : path.resolve(here, '../dist')
const BASE = '/ylbxt'
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf'
}

function startServer() {
  const server = http.createServer((req, res) => {
    let rel = decodeURIComponent(req.url.split('?')[0])
    if (rel.startsWith(BASE)) rel = rel.slice(BASE.length)
    if (!rel.startsWith('/')) rel = '/' + rel
    let file = path.join(ROOT, rel)
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(ROOT, 'index.html')
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' })
    res.end(fs.readFileSync(file))
  })
  return new Promise((r) => server.listen(0, '127.0.0.1', () => r({ server, port: server.address().port })))
}

// 默认按路径前缀推角色，可用 --role 覆盖
const ROLE_BY_PREFIX = [
  ['/admin', 3],
  ['/committee', 2],
  ['/province', 4],
  ['/city', 1],
  ['/school', 0]
]
const role = Number(getFlag('--role') ?? ROLE_BY_PREFIX.find(([p]) => route.startsWith(p))?.[1] ?? 3)

const { server, port } = await startServer()
const browser = await chromium.launch()
const ctx = await browser.newContext()

await ctx.addInitScript(
  (t) => {
    localStorage.setItem('token', 'Bearer probe-token')
    localStorage.setItem(
      'user',
      JSON.stringify({
        id: 1,
        username: 'probe_user',
        nickname: '示例单位',
        description: '',
        tel: '13800000000',
        leader: '领队甲',
        parent_id: 0,
        type: t
      })
    )
  },
  role
)

const page = await ctx.newPage()
let blocked = 0
await page.route('**/*', (r) => {
  const u = r.request().url()
  if (u.includes('127.0.0.1') || u.includes('localhost')) return r.continue()
  blocked++
  return r.fulfill({ status: 200, contentType: 'application/json; charset=utf-8', body: JSON.stringify({ code: 0, msg: '', data: [], count: 0 }) })
})

const errs = []
page.on('pageerror', (e) => errs.push(String(e)))
page.on('console', (m) => {
  if (m.type() === 'error') errs.push(m.text())
})

const target = `http://127.0.0.1:${port}${BASE}${route}`
await page.goto(target, { waitUntil: 'networkidle', timeout: 20000 })
await page.waitForTimeout(600)

const finalUrl = page.url()
const text = await page.locator('body').innerText()
console.log('请求 URL   : ' + target)
console.log('最终 URL   : ' + finalUrl)
console.log('是否被重定向: ' + (finalUrl.replace(/\/$/, '') !== target.replace(/\/$/, '') ? '是 (被守卫拦下)' : '否'))
console.log('角色 type  : ' + role)
console.log('外部请求拦截: ' + blocked + ' 条（未出网）')
console.log('首屏文本   : ' + text.replace(/\s+/g, ' ').slice(0, 300))
if (errs.length) {
  console.log('\n控制台报错 ' + errs.length + ' 条:')
  ;[...new Set(errs)].slice(0, 6).forEach((e) => console.log('  - ' + e.slice(0, 220)))
}

await browser.close()
server.close()
