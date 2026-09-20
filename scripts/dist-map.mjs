/**
 * dist 路由地图（审计/还原辅助工具，非运行时依赖）
 *
 * 用途：把原始 Vue2 dist 的「路由 -> chunk -> webpack 模块 -> 页面要素」整条链打通，
 *       在一次运行里给出每个页面的：组件名、作用域样式 id、调用的接口、data 字段。
 *       还原 47 个占位页时用它替代人工翻 minified 代码。
 *
 * 用法：
 *   node scripts/dist-map.mjs                    列出全部路由的页面要素
 *   node scripts/dist-map.mjs --ph               只列出仍是占位页（el-empty）的页面
 *   node scripts/dist-map.mjs --dump <modId>     打印某模块完整源码（配合上面的 modId）
 *   node scripts/dist-map.mjs --page /city/index 只处理匹配的路由
 *   node scripts/dist-map.mjs --api              按接口聚合，反查「哪些页面调用它」
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const DIST = path.resolve(here, '../../dist')

const appFile = fs.readdirSync(DIST).find((f) => f.startsWith('app.') && f.endsWith('.js'))
if (!appFile) {
  console.error('找不到 dist/app.*.js，请确认上游 dist 目录：' + DIST)
  process.exit(1)
}
const app = fs.readFileSync(path.join(DIST, appFile), 'utf8')

/* ---------- 1. 解析路由表 ---------- */
const routes = []
const routeRe =
  /path:"([^"]+)",name:"([^"]+)",component:\(\)=>Promise\.all\(\[([^\]]*)\]\)\.then\(n\.bind\(null,"([^"]*)"\)\)/g
let m
while ((m = routeRe.exec(app))) {
  routes.push({
    path: m[1],
    name: m[2],
    chunks: [...m[3].matchAll(/n\.e\("([^"]+)"\)/g)].map((x) => x[1]),
    modId: m[4]
  })
}

/* ---------- 2. chunk 源码缓存 + 模块抽取 ---------- */
const chunkCache = new Map()
function chunkSrc(name) {
  if (chunkCache.has(name)) return chunkCache.get(name)
  const f = fs.readdirSync(DIST).find((x) => x.startsWith(name + '.') && x.endsWith('.js'))
  const s = f ? fs.readFileSync(path.join(DIST, f), 'utf8') : ''
  chunkCache.set(name, s)
  return s
}

/**
 * 定位模块表项中 id 的起始下标。
 * 模块表里 id 的前置字符有三种情况，必须都覆盖：
 *   "f993":function   —— 带引号的 id（字符串型）
 *   ,2953:function    —— 数字型 id，且不是表内第一项
 *   {2953:function    —— 数字型 id，且是表内第一项（容易漏，曾导致 /admin/index 查不到）
 */
function findModuleIndex(src, modId) {
  const quoted = src.indexOf('"' + modId + '":function')
  if (quoted >= 0) return quoted + 1 // 跳过开头的引号，指向 id 本身
  for (const pre of [',', '{']) {
    const j = src.indexOf(pre + modId + ':function')
    if (j >= 0) return j + 1
  }
  return -1
}

/** 按 webpack module id 抽取模块源码（花括号配平） */
function extractModule(src, modId) {
  const i = findModuleIndex(src, modId)
  if (i < 0) return null
  const start = src.indexOf('{', i)
  if (start < 0) return null
  let depth = 0
  let j = start
  for (; j < src.length; j++) {
    const c = src[j]
    if (c === '{') depth++
    else if (c === '}') {
      depth--
      if (depth === 0) {
        j++
        break
      }
    }
  }
  return src.slice(i, j)
}

/** 先在该路由声明的 chunk 里找，找不到再全量兜底 */
function locate(modId, chunks) {
  for (const c of chunks) {
    const s = chunkSrc(c)
    if (s && findModuleIndex(s, modId) >= 0) {
      return { chunk: c, src: extractModule(s, modId) }
    }
  }
  for (const f of fs.readdirSync(DIST)) {
    if (!f.endsWith('.js') || !f.startsWith('chunk-')) continue
    const s = fs.readFileSync(path.join(DIST, f), 'utf8')
    if (findModuleIndex(s, modId) >= 0) {
      return { chunk: f.replace(/\..*$/, ''), src: extractModule(s, modId) }
    }
  }
  return null
}

/* ---------- 3. 从模块源码提取页面要素 ---------- */
function summarize(src) {
  if (!src) return {}
  const apiCalls = [...new Set((src.match(/\$api\.[a-zA-Z0-9_]+\.[a-zA-Z0-9_]+/g) || []))].map((s) =>
    s.replace('$api.', '')
  )
  // 作用域样式 id：Object(x["a"])(opt,render,staticRenderFns,!1,null,"2d559894",null)
  const scoped = (src.match(/!1,null,"([0-9a-f]{8})",null\)/) || [])[1] || ''
  // 组件 name
  const name = (src.match(/name:"([A-Za-z0-9_$-]+)",components:/) || [])[1] || ''
  // 是否调用了子组件（还原时要注意依赖顺序）
  const childComps = [...new Set((src.match(/t\("([A-Z][A-Za-z0-9]+)",/g) || []))].map((s) =>
    s.slice(3, -2)
  )
  return { apiCalls, scoped, name, childComps }
}

/* ---------- 4. 输出 ---------- */
const argv = process.argv.slice(2)
const getFlag = (n) => {
  const i = argv.indexOf(n)
  return i >= 0 ? argv[i + 1] : null
}

if (getFlag('--dump')) {
  const modId = getFlag('--dump')
  const r = routes.find((x) => x.modId === modId)
  const found = locate(modId, r ? r.chunks : [])
  if (!found) {
    console.error('模块未找到: ' + modId)
    process.exit(1)
  }
  console.log('##### ' + found.chunk + ' :: ' + modId + '  (' + found.src.length + ' chars)')
  console.log(found.src)
  process.exit(0)
}

const filter = getFlag('--page')
const list = filter ? routes.filter((r) => r.path.includes(filter)) : routes

const byApi = new Map()
let placeholder = 0
const rows = []

for (const r of list) {
  const found = locate(r.modId, r.chunks)
  const info = summarize(found && found.src)
  // 占位页判据：本项目里占位页都是 el-empty，dist 侧对应「几乎没有 data 字段」的极简模块
  const isPlaceholder = !info.apiCalls || info.apiCalls.length === 0
  if (isPlaceholder) placeholder++
  for (const a of info.apiCalls || []) {
    if (!byApi.has(a)) byApi.set(a, [])
    byApi.get(a).push(r.path)
  }
  rows.push({ ...r, ...info, chunk: found ? found.chunk : '??', size: found ? found.src.length : 0 })
}

/* 抽取「可能会随页面变化」的属性，用于家族内对比 */
function attrs(src) {
  const labels = [...src.matchAll(/label:"([^"]*)"/g)].map((x) => x[1])
  const props = [...src.matchAll(/prop:"([^"]*)"/g)].map((x) => x[1])
  const apis = [...new Set(src.match(/\$api\.[a-zA-Z0-9_]+\.[a-zA-Z0-9_]+/g) || [])].map((s) =>
    s.replace('$api.', '')
  )
  const nums = [...new Set(src.match(/\b(?:group|type|status):-?\d+/g) || [])]
  return { labels, props, apis, nums }
}

if (argv.includes('--families')) {
  const fams = new Map()
  for (const r of routes) {
    const found = locate(r.modId, r.chunks)
    if (!found) continue
    const info = summarize(found.src)
    const key = info.name || '(无 name) ' + r.path
    if (!fams.has(key)) fams.set(key, [])
    fams.get(key).push({ route: r.path, modId: r.modId, src: found.src, ...attrs(found.src) })
  }
  console.log('=== 页面家族（同名组件共用一套模板）===')
  for (const [name, members] of [...fams].sort((a, b) => b[1].length - a[1].length)) {
    if (members.length < 2) continue
    console.log('\n########## ' + name + '  (' + members.length + ' 个页面) ##########')
    for (const mm of members) {
      console.log(
        '  ' +
          mm.route.padEnd(30) +
          mm.modId.padEnd(7) +
          ' api=' +
          mm.apis.join(',') +
          '  常量=' +
          mm.nums.join(',')
      )
      console.log('      labels: ' + mm.labels.join(' | '))
      console.log('      props : ' + mm.props.join(' | '))
    }
  }
  process.exit(0)
}

if (argv.includes('--api')) {
  console.log('=== 按接口聚合（哪些页面调用它）===')
  for (const [a, ps] of [...byApi].sort()) {
    console.log('  ' + a.padEnd(34) + ps.length + ' 个页面: ' + ps.join(' '))
  }
  console.log('\n接口总数: ' + byApi.size)
  process.exit(0)
}

console.log('=== 路由页面要素（共 ' + rows.length + ' 条）===')
for (const r of rows) {
  const flag = r.apiCalls && r.apiCalls.length ? '  ' : '空'
  console.log(
    flag +
      ' ' +
      r.path.padEnd(30) +
      r.modId.padEnd(7) +
      (r.chunk + '').padEnd(16) +
      String(r.size).padStart(6) +
      '  ' +
      (r.name || '-').padEnd(14) +
      (r.apiCalls || []).join(',')
  )
}
console.log('\n无接口调用的页面（疑似占位/纯展示）: ' + placeholder + ' / ' + rows.length)
