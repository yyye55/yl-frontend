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
const openapi = JSON.parse(fs.readFileSync(path.resolve(root, '../yilinbei/openapi.json'), 'utf8'))

const valid = new Set(Object.keys(openapi.paths))
const norm = (p) => p.replace(/\{[^}]+\}/g, '{}')
const validNorm = new Set([...valid].map(norm))

const files = fs.readdirSync(path.join(root, 'src/api')).filter((f) => f.endsWith('.js'))
let miss = 0

for (const f of files) {
  const src = fs.readFileSync(path.join(root, 'src/api', f), 'utf8')
  const re = /request\.(get|post|put|delete|patch)\(\s*HOST\s*\+\s*'([^']+)'/g
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
    console.log('=== ' + f + ' ===')
    for (const r of rows) {
      console.log('  ' + (r.hit ? 'OK  ' : 'MISS') + ' ' + r.method.padEnd(6) + r.base.padEnd(40) + (r.hit || ''))
    }
  }
}
console.log('\n不匹配条数: ' + miss)
