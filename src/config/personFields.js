/**
 * 人员基础字段的**格式**校验 —— 参演人员表 / 参演人员表(含专业) / 指导教师表 三处共用一份。
 *
 * 【为什么要单独一个文件】
 * 这三张表各自有一份 `checkLine`（界面填写）和 `exportCheck`（Excel 导入），共 5 份校验逻辑。
 * 格式规则若各写各的，迟早出现「界面拦得住、Excel 导入拦不住」这类缺口 ——
 * 乐器字段已经栽过一次（见 config/personRules.js 里 isPercussion 的长注释：
 * 导入路径原样透传单元格文本，`打击乐 ` 带个尾随空格就绕过了人数上限）。
 * 所以规则值、正则、文案集中在这里，两个入口引用同一份。
 *
 * 【这里只管格式，不管必填】
 * 必填与否由各表自己判 —— 它们的文案本来就不一样（界面是「性别需选择」、
 * 导入是「性别需填写」），且判定顺序在 dist 原文里是固定的。硬合并会改变既有行为。
 *
 * 【为什么不用 Element Plus 的 el-form rules】
 * 这三张表是手写的 div 表格，`<el-input>` 外层没有 `<el-form-item>`，
 * 而 EP 的校验只认 el-form-item 链 —— 挂在 el-input 上的 rules 根本不会触发。
 * 故沿用它们既有的 checkLine / exportCheck 通道。
 *
 * 【校验松紧】按「标准」档：
 *   姓名  —— 禁数字，长度 2–20（去首尾空格后）
 *   身份证后6位 —— 5 位数字 + 末位数字或 X/x（见下方 RE_CARD 的说明）
 *   年龄  —— 5–80 的整数
 *   学校  —— 不能是纯数字（不限制必须写「XX学校」，避免误伤办学点等非标准名称）
 *   电话  —— 11 位手机号，或带区号的固定电话（红头文件口径，见 checkPersonPhone）
 *
 * 【身份证这条不是"纯前端把关"，是后端规则的镜像】
 * 2026-09-28 起，`card` 的语义由「完整 18 位身份证号」改为「后 6 位」，权威实现在后端
 * `apps/core/models.py` 的 `normalize_card()`（`CARD_PATTERN` / `CARD_ERROR` / `CARD_MAX_LENGTH`），
 * `store_people` / 暂存 / `/live/` / 后台改人员四条写入路径都调它。
 * 本文件里的 RE_CARD 与 CARD_ERROR **逐字抄自后端**，改任何一边都必须同步另一边，
 * 否则会出现「前端放行、后端整批拒绝」这类用户看不懂的失败。
 */

/**
 * 身份证后 6 位：5 位数字 + 末位数字或 X。
 * **逐字同后端** `models.CARD_PATTERN`（含 `[0-9]` 的写法，不改成 `\d`，便于两边肉眼比对）。
 * **不做校验位验算**（用户口径：只限位数与末尾字符）。
 */
const RE_CARD = /^[0-9]{5}[0-9Xx]$/

/** **逐字同后端** `models.CARD_ERROR`。两处文案一旦分叉，用户就会看到两套说法 */
const CARD_ERROR = '身份证后6位应为6位，前5位为数字，末位为数字或X'

/** 中国大陆手机号：11 位、1 开头、第二位 3-9 */
const RE_MOBILE = /^1[3-9]\d{9}$/

/**
 * 固定电话：区号（0 开头，2-4 位）+ 7-8 位号码，中间可带一个连字符。
 * 例：028-86269727 / 01012345678 / 0755-1234567
 * 区号位数取 2-4 是因为现实里三种都有（010 三位、028 三位、0755 四位），
 * 号码 7 位是部分地市仍在用的旧制式。
 */
const RE_LANDLINE = /^0\d{2,3}-?\d{7,8}$/

/** 整数（可用来判年龄；'12.5'、'-5'、'12岁' 都不匹配） */
const RE_INT = /^-?\d+$/

/** 至少含一个非数字字符 —— 用来排除「学校名称填了 12345」这种 */
const RE_HAS_NON_DIGIT = /\D/

const AGE_MIN = 5
const AGE_MAX = 80
const NAME_MIN = 2
const NAME_MAX = 20

/** Excel 单元格里年龄可能是数字类型，统一转字符串再判，不因为类型不同而漏判 */
function str(v) {
  return v === null || v === undefined ? '' : String(v)
}

/**
 * 姓名：不能是空白、不能含数字、长度 2–20。
 *
 * 【只禁数字，不限定汉字】少数民族姓名（如「阿依古丽·买买提」）、
 * 外籍或港澳台姓名用字都不在常用字表内，卡死字符集会误伤真人。
 * 数字则是明确的误填信号（家长常把「1」当成占位符先填上）。
 *
 * @returns {string|null} 不合格时返回给用户看的原因，合格返回 null
 */
export function checkPersonName(value) {
  const name = str(value).trim()
  if (!name) return null // 空由各表的必填分支负责
  if (/\d/.test(name)) return '姓名不能包含数字'
  if (name.length < NAME_MIN || name.length > NAME_MAX) {
    return `姓名长度应为${NAME_MIN}-${NAME_MAX}个字符`
  }
  return null
}

/**
 * 身份证后 6 位：5 位数字 + 末位数字或 X/x。文案与判据都同后端。
 *
 * 【刻意不验校验位】后 6 位里本来就不含校验位（末位是顺序码的末位），没有可验的东西。
 * 同样不禁止小写 x —— 手抄时很常见，后端 `normalize_card` 会把它归一成大写 X。
 *
 * 【前端不做归一回写】不 trim 后写回、不改大小写：归一由后端负责，草稿回读拿到的
 * 就是归一后的值，前端再写一遍只会多一处可能与后端分叉的地方。
 *
 * @returns {string|null} 不合格时返回给用户看的原因，合格返回 null
 */
export function checkPersonCard(value) {
  const card = str(value).trim()
  if (!card) return null // 空由各表的必填分支负责，见 isBlankCard
  if (!RE_CARD.test(card)) return CARD_ERROR
  return null
}

/**
 * 身份证是否**实质为空** —— 纯空格算空。各表的必填分支用它，不要写 `!item.card`。
 *
 * 【为什么必须单独一个函数】`" "` 是 truthy，`!item.card` 判它「已填」而放行；接着
 * checkPersonCard trim 成 `''` → 返回 null（空值不归它管）→ 整行校验**全部通过**。
 * 但后端 `normalize_card` strip 后不匹配正则，会按 CARD_ERROR 拒掉整批提交。
 * 于是用户看到的是一条来自后端的、说不出是哪一行的格式错误。
 * 两个判据都以 trim 后的值为准，这个缝才补得上。
 */
export function isBlankCard(value) {
  return !str(value).trim()
}

/**
 * 年龄：5–80 的整数。
 *
 * 【为什么连负数/小数一起管】`<el-input type="number">` 允许输入负号和小数点，
 * 光判「非空」会让 -5 岁、3.5 岁一路走到提交。
 */
export function checkPersonAge(value) {
  const raw = str(value).trim()
  if (!raw) return null
  if (!RE_INT.test(raw)) return '年龄必须是整数'
  const age = Number(raw)
  if (age < AGE_MIN || age > AGE_MAX) return `年龄应在${AGE_MIN}-${AGE_MAX}之间`
  return null
}

/**
 * 学校名称：不能是纯数字。
 *
 * 【为什么只禁纯数字】校园乐团里存在「XX市第一小学」「XX大学附属中学」以外的
 * 非标准名称（集团校、办学点、少年宫下属乐团），限定必须含「学校/大学/学院」
 * 之类关键词会挡住真实用户。纯数字则只可能是误填。
 */
export function checkPersonSchool(value) {
  const school = str(value).trim()
  if (!school) return null
  if (!RE_HAS_NON_DIGIT.test(school)) return '学校名称不能是纯数字'
  return null
}

/**
 * 联系电话：11 位手机号，或带区号的固定电话。
 *
 * 【为什么连固话一起收 —— 这是红头文件的口径，不是放宽】
 * 文件对两类联系方式是**分开写**的：
 *   附件2《报名信息表》—— 领队 / 指挥 / 指导老师的联系方式，一律写「联系电话」；
 *   附件3《教师观摩登记表》—— 单独写「手机号码」。
 * 起草人既然在两处用了不同的词，就不是随手写的。而附件2 正是本系统报名字段
 * 的出处，系统里这些栏目的标题也**全部**是「联系电话」
 * （PersonTable / PersonTableMajor / TeacherTable / ReportList 已逐一核对），
 * 没有任何一处叫「手机号码」。
 *
 * 最直接的一条旁证：文件末尾组委会自己留的联系方式写的是
 * 「联系电话：028-86269727、13881945747」—— 固话与手机并列出现在同一个
 * 「联系电话」栏下。既然组委会自己用固话作联系电话，就没有理由把只留座机的
 * 领队挡在报名窗口期外。
 *
 * 【仍然拦得住什么】字母、位数不足、位数超长、既非 1 开头也非 0 开头的数字串，
 * 一律拒。放宽的只是「固话」这一类真实存在的号码，不是「随便填」。
 *
 * 【为什么先去空格】从通讯录粘贴常带空格（「138 0013 8000」），
 * 不为这个判用户填错。全角空格 U+3000 一并去掉。
 */
export function checkPersonPhone(value) {
  const phone = str(value).trim().replace(/[\s　]/g, '')
  if (!phone) return null
  if (RE_MOBILE.test(phone) || RE_LANDLINE.test(phone)) return null
  return '联系电话应为11位手机号，或带区号的固定电话（例：028-86269727）'
}

/**
 * 一次性跑完五条基础字段，按**用户能看到的顺序**返回第一条错误。
 *
 * 三张表的五条规则完全一致，差别只在各自额外的字段（专业名称 / 性别格式 / 身份格式…），
 * 所以这里只回答「基础五项有没有问题」，调用方把它插到自己原有的判定顺序里即可。
 *
 * @returns {string|null} 第一条错误文案，全通过返回 null
 */
export function checkPersonBasics(item) {
  if (!item) return null
  return (
    checkPersonName(item.name) ||
    checkPersonCard(item.card) ||
    checkPersonAge(item.age) ||
    checkPersonSchool(item.school) ||
    checkPersonPhone(item.phone) ||
    null
  )
}
