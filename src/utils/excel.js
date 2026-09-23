/**
 * Excel 导入导出工具
 *
 * 【可信度：B】基于 dist/app.js 中 Vue.prototype 上的方法反推
 * - exportTable(elTableId, fileName): 把 HTML 表格导出为 xlsx
 * - xlsx2json(file): 把上传的 xlsx 转为 JSON 数组（每个 sheet 一个对象）
 * - makeXLSX(fileName, aoa): 创建一个 xlsx（用于导出用户表）
 * - downloadExcelFile(blob, fileName): 下载 blob 为 xlsx
 * - downloadPdfFile(blob, fileName): 下载 blob 为 pdf
 * - downloadStaticFile(url, fileName): 下载静态文件
 * - rename(filename): 随机重命名文件（保留扩展名）
 * - pluck(arr, key): 取数组中某字段
 *
 * 【Vue 3 重构】原方法是 Vue.prototype，本项目用纯函数导出
 */

/**
 * 【体积修复（P1-10）】xlsx 改为按需动态加载。
 *
 * 原先这里写的是顶部静态 `import * as XLSX from 'xlsx'`。只要有任何模块引用本文件，
 * xlsx 就会被拉进同一个 chunk —— 而 main.js 当时把本模块挂到 app.config.globalProperties.$excel，
 * 于是整个 xlsx（约 800 KB）被打进了首屏入口 chunk。
 *
 * 实际上本项目只用到 downloadExcelFile 一个函数，而它根本不需要 xlsx
 * （只做 Blob + <a download>）。真正需要 xlsx 的 exportTable / xlsx2json / makeXLSX
 * 目前在 src 下没有任何调用方（见下方各函数的说明）。
 * 因此改成在这三个函数内部 await import('xlsx')，xlsx 会被拆成独立的异步 chunk，
 * 只有真正触发导入/导出表格时才加载。
 *
 * 这样每个函数从同步变为 async —— 因为当前没有调用方，不存在兼容性影响；
 * 若后续新增调用方，记得 await 返回值。
 */
let xlsxPromise = null
function loadXLSX() {
  if (!xlsxPromise) xlsxPromise = import('xlsx')
  return xlsxPromise
}

/**
 * 把 HTML 表格（el-table）导出为 xlsx
 *
 * 【当前无调用方】dist 中存在同名方法（Vue.prototype.exportTable），本项目保留实现以备还原。
 * 【用法变更】因内部改为动态加载，本函数现在是 async，调用方需要 await。
 *
 * @param {string} fileName 导出文件名（不含扩展名）
 * @param {string} tableId  表格 DOM id
 */
export async function exportTable(fileName, tableId) {
  const XLSX = await loadXLSX()
  const wb = XLSX.utils.table_to_book(document.getElementById(tableId))
  const wbout = XLSX.write(wb, { bookType: 'xlsx', bookSST: true, type: 'array' })
  try {
    const blob = new Blob([wbout], { type: 'application/octet-stream' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName + '.xlsx'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  } catch (e) {
    console.error('[exportTable]', e, wbout)
  }
  return wbout
}

/**
 * 上传 xlsx 文件，解析为 JSON（每个 sheet 一个对象）
 * @param {File} file element-ui upload 的 file 对象
 * @returns {Promise<Array<{sheet: string, data: Array<Object>}>>}
 */
export async function xlsx2json(file) {
  const XLSX = await loadXLSX()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = e.target.result
        const wb = XLSX.read(data, { type: 'binary' })
        const out = []
        wb.SheetNames.forEach((name) => {
          out.push({ sheet: name, data: XLSX.utils.sheet_to_json(wb.Sheets[name]) })
        })
        resolve(out)
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = reject
    reader.readAsBinaryString(file.raw || file)
  })
}

/**
 * 创建 xlsx（用于导出自定义数据）
 * @param {string} fileName 文件名
 * @param {Array<Array<any>>} aoa  二维数组
 */
export async function makeXLSX(fileName, aoa) {
  const XLSX = await loadXLSX()
  const wb = XLSX.utils.book_new()
  const sheet = XLSX.utils.aoa_to_sheet(aoa)
  XLSX.utils.book_append_sheet(wb, sheet, '用户表')
  const wbout = XLSX.write(wb, { bookType: 'xlsx', bookSST: true, type: 'array' })
  try {
    const blob = new Blob([wbout], { type: 'application/octet-stream' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName + '.xlsx'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  } catch (e) {
    console.error('[makeXLSX]', e)
  }
}

/**
 * 后端实际文件名映射（apps/api/export_services.py）
 * 下列取值是后端的实际结果，作为「前端该取什么名字」的事实参考（后端 workbook_response
 * 会设置 Content-Disposition filename）。
 * 【更正】原文写「前端不应覆盖，浏览器会根据 Content-Disposition 自动命名」——不成立：
 * blob URL 背后没有 HTTP 响应，<a> 读不到响应头（实测见 downloadPdfFile）。
 * 现在文件名一律由前端给：调用方显式传入，缺省时用本函数的默认值。
 *
 * 后端实际文件名：
 *   /api/export/data     → "数据导出.xlsx"
 *   /api/admin/export/data1 → "数据导出.xlsx"
 *   /api/admin/export/data2 → "数据导出.xlsx"
 *   /api/export/report   → "节目报送表.pdf"
 *   /api/export/person   → "参演人员信息表.pdf"
 *   /api/admin/chouqian/export/{type} → "{组别}现场展演抽签顺序表.xlsx"
 *
 * 注意：后端文件名不含届数（第十二届也仍为"节目报送表.pdf"），
 * 这是后端 BE 问题，标记为 BE-11。
 */
export function downloadExcelFile(blob, fileName) {
  const b = new Blob([blob], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=utf-8' })
  const url = window.URL.createObjectURL(b)
  const a = document.createElement('a')
  a.href = url
  // 【第十二届修复】文件名必须始终给一个真名字，不能赋 undefined：download 是
  // DOMString 反射属性，赋 undefined 会被 String() 化成 "undefined"，存盘名变成
  // "undefined.xlsx"。原注释写的「不传时浏览器用后端 Content-Disposition」不成立 ——
  // blob URL 拿不到响应头，实测见下面的 downloadPdfFile。
  // 当前 8 个调用点全部传了名字，这个兜底分支未被触发。
  a.download = (fileName || '导出数据') + '.xlsx'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.URL.revokeObjectURL(url)
}

/**
 * 从 blob 下载 pdf
 *
 * 【第十二届改动】文件名不再由页面硬编码，收归本函数；默认名与后端
 * GET /api/export/report 的 Content-Disposition 一致（"报名信息表.pdf"）。
 * 原先 city 页传 "报名信息表"、school 页传 "报名信息表导出"，后者与后端不一致。
 *
 * 【为什么不能「不传名就让浏览器用后端名字」——实测结论】
 * blob: URL 背后没有 HTTP 响应，所以 `<a>` 拿不到那次 axios 请求的
 * Content-Disposition。用 Edge 实测（playwright，见 .scratch 探针）：
 *     a.download 不赋值   → 存成 blob 的 UUID，如 "43232db3-….pdf"
 *     a.download = ''     → 同上，仍是 UUID
 *     a.download = undefined → 字面量字符串 → "undefined.pdf"
 *                            （download 是 DOMString 反射属性，赋 undefined 会被 String() 化）
 * ⇒ a.download 必须始终是一个真名字，且不能赋 undefined。
 *
 * 【如果要真正跟随后端改名】得在调用方按接口文档第 4 节解析
 * res.headers['content-disposition']（RFC5987 / RFC2047 两种编码）再传进来。
 * 注意 Content-Disposition 不是 CORS 安全列表内的响应头：开发环境前端 localhost
 * 直连后端 47.108.29.34 属跨域，后端不额外配 Access-Control-Expose-Headers 的话
 * JS 读出来恒为 undefined，只能退回默认名 —— 因此默认名这道兜底不能省。
 */
export function downloadPdfFile(blob, fileName) {
  const b = new Blob([blob])
  const url = window.URL.createObjectURL(b)
  const a = document.createElement('a')
  a.href = url
  a.download = (fileName || '报名信息表') + '.pdf'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.URL.revokeObjectURL(url)
}

/**
 * 下载静态文件
 */
export function downloadStaticFile(url, fileName) {
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.target = '_blank'
  a.click()
  a.remove()
}

/**
 * 文件名随机化（保留扩展名）
 */
export function rename(filename) {
  const idx = filename.lastIndexOf('.')
  const ext = filename.substring(idx + 1, filename.length).toLowerCase()
  return Math.random().toString(35).slice(2) + Date.now() + '.' + ext
}

/**
 * 数组取字段
 */
export function pluck(arr, key) {
  return arr.map((o) => o[key])
}
