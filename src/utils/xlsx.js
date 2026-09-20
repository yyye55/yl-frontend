/**
 * 上传 xlsx 解析工具（Vue.prototype.xlsx2json 的独立实现）
 *
 * ===========================================================================
 * 【dist 已确认】来源：dist/app.165638130932c3751d03.js 中挂在 Vue.prototype 上的全局方法
 *   e.prototype.xlsx2json = function (e) {
 *     const t = n("1146")                       // 1146 = npm 包 xlsx
 *     return new Promise(function (resolve) {
 *       const o = new FileReader()
 *       o.onload = function (e) {
 *         const c = e.target.result
 *         this.wb = t.read(c, { type: "binary" })
 *         const o = []
 *         this.wb.SheetNames.forEach(name => {
 *           o.push({ sheet: t.utils.sheet_to_json(this.wb.Sheets[name]) })
 *         })
 *         resolve(o)
 *       }
 *       o.readAsBinaryString(e.raw)
 *     })
 *   }
 *
 * 【关键：返回结构】
 *   每个 sheet 一项，结构是 `{ sheet: <行对象数组> }` —— 行数组直接放在 `sheet` 字段上，
 *   **不是** `{ sheet: 名字, data: 行数组 }`。
 *   调用方（PersonTable.importExcel，dist 模块 db6d）的用法证实了这一点：
 *     this.xlsx2json(file).then(e => { const t = e[0].sheet; t[e].name / t[e].card ... })
 *   即 `e[0].sheet` 必须是行数组（否则 `t.length` 会退化成 sheet 名字符串的长度）。
 *
 * 【与 src/utils/excel.js 中同名函数的关系（务必注意）】
 *   src/utils/excel.js 里也有一个 `xlsx2json`，但它返回的是 `{ sheet: 名字, data: 行数组 }`，
 *   与 dist 的实际结构不一致，直接拿给 PersonTable 用会取不到数据。
 *   excel.js 属于本轮不许改动的文件，所以这里单独实现一份**忠于 dist 结构**的版本。
 *   （excel.js 的那个实现目前没有任何调用方，见该文件注释。）
 *
 * 【移植方式】
 *   - 原文的 `this.wb` 是挂在 FileReader 实例上的临时属性（同一个 onload 里写入并读取，
 *     外部从不访问），这里改用局部变量 `wb`，等价且不污染宿主对象。
 *   - xlsx 用动态 import 按需加载，与 src/utils/excel.js 的「体积修复（P1-10）」做法一致：
 *     若在此处静态 `import * as XLSX from 'xlsx'`，xlsx（约 800KB）会被整体打进
 *     import 本模块的那个路由 chunk。因此本函数是 async。
 *   - `file.raw` 逐字保留 dist 的写法：dist 只接受 element-ui / element-plus
 *     el-upload 的 uploadFile 对象（raw 才是真正的 File），不接受裸 File。
 *
 * 【dist 已知缺陷】没有 `reader.onerror`：文件读取失败时 Promise 永不 settle，
 * 调用方的 `.then` 会一直挂着（无报错、无提示）。此处按原样保留，不擅自加 onerror。
 */

let xlsxPromise = null
function loadXLSX() {
  if (!xlsxPromise) xlsxPromise = import('xlsx')
  return xlsxPromise
}

/**
 * 把 el-upload 选中的 xlsx/csv 解析成 [{ sheet: [...] }]
 *
 * @param {object} file el-upload 的 uploadFile 对象（必须有 .raw）
 * @returns {Promise<Array<{ sheet: Array<object> }>>} 每个 sheet 一项，行数组在 `sheet` 上
 */
export async function xlsx2json(file) {
  const XLSX = await loadXLSX()
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const binary = e.target.result
      const wb = XLSX.read(binary, { type: 'binary' })
      const out = []
      wb.SheetNames.forEach((name) => {
        out.push({ sheet: XLSX.utils.sheet_to_json(wb.Sheets[name]) })
      })
      resolve(out)
    }
    reader.readAsBinaryString(file.raw)
  })
}
