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
 *   身份证 —— 18 位，前 17 位数字，末位数字或 X/x
 *   年龄  —— 5–80 的整数
 *   学校  —— 不能是纯数字（不限制必须写「XX学校」，避免误伤办学点等非标准名称）
 *   电话  —— 11 位手机号（1[3-9] 开头）
 * 后端 `card` 是 CharField(max_length=255)、无格式约束，故这几条是纯粹的前端把关，
 * 与后端不冲突。
 */

/** 身份证实打实的 18 位：17 位数字 + 末位数字或 X。**不做校验位验算**（用户口径：只限位数与末位） */
const RE_CARD = /^\d{17}[\dXx]$/

/** 中国大陆手机号：11 位、1 开头、第二位 3-9 */
const RE_PHONE = /^1[3-9]\d{9}$/

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
 * 身份证号：18 位，前 17 位数字，末位数字或 X/x。
 *
 * 【刻意不验校验位】19 位/17 位这类长度错误是用户能自己改的；校验位算错则会让
 * 户口本上抄来的号也过不去，反而制造求助。用户给的口径就是「严格 18 位、末位可 X」。
 * 同样不禁止小写 x —— 手抄时很常见，阻止它没有任何好处。
 */
export function checkPersonCard(value) {
  const card = str(value).trim()
  if (!card) return null
  if (!RE_CARD.test(card)) return '身份证号应为18位，末位可以是数字或X'
  return null
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
 * 联系电话：11 位手机号。
 *
 * 【为什么只认手机号】红头文件的联系渠道就是手机（短信通知、赛程变更），
 * 座机（区号-号码）收不到短信。这与用户选定的「标准」档一致。
 * 前端自己的校验只会**拦住明显不是手机号**的输入，不产生新的沟通负担。
 */
export function checkPersonPhone(value) {
  const phone = str(value).trim()
  if (!phone) return null
  if (!RE_PHONE.test(phone)) return '联系电话应为11位手机号'
  return null
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
