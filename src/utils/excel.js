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
 * 从 blob 下载 xlsx
 */
export function downloadExcelFile(blob, fileName) {
  const b = new Blob([blob], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=utf-8' })
  const url = window.URL.createObjectURL(b)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName + '.xlsx'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.URL.revokeObjectURL(url)
}

/**
 * 从 blob 下载 pdf
 */
export function downloadPdfFile(blob, fileName) {
  const b = new Blob([blob])
  const url = window.URL.createObjectURL(b)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName + '.pdf'
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
