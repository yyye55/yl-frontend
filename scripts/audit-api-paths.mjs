/**
 * 审计工具（非运行时依赖）：把 src/api/*.js 里的每条请求路径与后端 openapi.json 对照。
 * 用法：node scripts/audit-api-paths.mjs
 *
 * 【能识别动态段】源码里的写法有两类：
 *   1) 完整字面量：  request.get(HOST + '/api/admin/user/list')
 *   2) 前缀 + 拼接： request.delete(HOST + '/api/city/report/delete/' + id)
 * 第 2 类的字面量以 '/' 结尾，需要补一个占位段才能与 openapi 的
 * '/api/city/report/delete/{id}' 对齐，否则会误报 MISS。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
// 【路径修正】后端目录是 yilinbeihou（不是 yilinbei），此处原写成 '../yilinbei/openapi.json'，
// 结果解析到 yl-frontend 同级的 yilinbei/yilinbei/ 上、直接 ENOENT。改为相对脚本自身的仓库根。
const openapi = JSON.parse(fs.readFileSync(path.resolve(root, '../yilinbeihou/openapi.json'), 'utf8'))

const valid = new Set(Object.keys(openapi.paths))
const norm = (p) => p.replace(/\{[^}]+\}/g, '{}')
const validNorm = new Set([...valid].map(norm))

/*
 * 【扫描范围】src/api/*.js 与 src/services/*.js。
 * services 里是自建 axios 实例的调用点（如 backendUpload.js 的
 * `uploadClient.post(HOST + '/api/oss/upload', ...)`），它们同样是在调后端接口，
 * 漏掉就会让新接口无声地不进入这份待办清单。故正则里的实例名不再写死为 request。
 */
const dirs = ['src/api', 'src/services']
const files = dirs.flatMap((d) =>
  fs.readdirSync(path.join(root, d)).map((f) => path.join(d, f))
).filter((f) => f.endsWith('.js'))
let miss = 0

for (const f of files) {
  const src = fs.readFileSync(path.join(root, f), 'utf8')
  const re = /\b[A-Za-z_$][\w$]*\.(get|post|put|delete|patch)\(\s*HOST\s*\+\s*'([^']+)'/g
  const rows = []
  let m
  while ((m = re.exec(src))) {
    const method = m[1].toUpperCase()
    const base = m[2]
    const candidates = [
      base,
      base.replace(/\/+$/, ''),
      base + '/',
      // 前缀 + 拼接 的场景（base 以 / 结尾），补占位段匹配 openapi 的 {id}/{type}
      ...(base.endsWith('/') ? [base + '{}'] : [])
    ]
    const hit = candidates.find((c) => validNorm.has(norm(c)))
    if (!hit) miss++
    rows.push({ method, base, hit })
  }
  if (rows.length) {
    console.log('=== ' + f.replace(/\\/g, '/') + ' ===')
    for (const r of rows) {
      console.log('  ' + (r.hit ? 'OK  ' : 'MISS') + ' ' + r.method.padEnd(6) + r.base.padEnd(40) + (r.hit || ''))
    }
  }
}
console.log('\n不匹配条数: ' + miss)
