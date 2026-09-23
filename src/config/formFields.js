/**
 * 报名表单**顶层字段**的校验规则 —— 直接挂到 el-form 的 `rules` 上用。
 *
 * 【和 config/personFields.js 的分工】
 * personFields.js 管人员表那几列（姓名/身份证/年龄/学校/电话），是手写 div 表格，
 * 走不了 el-form；本文件管表单顶层的「参展学校名称 / 领队姓名 / 领队电话 / 联系地址」，
 * 这些是真 el-form-item，能挂 rules。
 *
 * 两边**语义相同的字段共用同一份规则**（姓名 / 学校 / 电话直接复用 personFields 的
 * 纯函数），否则同一个「联系电话」在人员表里要求 11 位手机号、在表单顶层却 1-20 个
 * 字符随便填，早晚会被当成两个 bug 报上来。
 *
 * 【原来是什么样】这四个字段此前只有 required + 长度区间：
 *   参展学校名称  1-100 字符  →  「12345」照收
 *   领队姓名      1-20  字符  →  「123」照收
 *   领队电话      1-20  字符  →  「abc」照收
 *   联系地址      1-100 字符  →  「1」照收
 * 长度校验拦得住「太长」，拦不住「填错了」。
 *
 * 【刻意不管「名称」类字段】乐团名称 / 合唱团名称 / 区县名称 / 曲目名称保持自由填写 ——
 * 乐团怎么命名是报送单位自己的事（「XX市实验小学管乐团」和「XX少年宫管乐团」都合法），
 * 卡字符集只会误伤真人。
 */

import {
  checkPersonName,
  checkPersonSchool,
  checkPersonPhone
} from '@/config/personFields'

/**
 * 把 personFields 那条「返回文案 / null」的纯函数，适配成 el-form 的 validator 形状。
 *
 * 【空值一律放行】必填与否由 rules 里自己的 `required` 那条负责，两件事不混在一起 ——
 * 混了的话「没填」和「填错」会报同一条文案，用户分不清该补还是该改。
 *
 * @param {(value: *) => (string|null)} checker
 * @returns {(rule, value, callback) => void}
 */
export function asElFormRule(checker) {
  return function validate(rule, value, callback) {
    const msg = checker(value)
    if (msg) callback(new Error(msg))
    else callback()
  }
}

/** 联系地址最短字数。见下方 checkAddress 里为什么定这个数 */
const ADDRESS_MIN = 5

/**
 * 联系地址：不能是纯数字，且要写到能寄东西的程度。
 *
 * 【为什么只判这两条】地址没有正则可写 —— 「成都市青羊区XX路1号」含数字是正常的，
 * 「XX大学附属中学」这种单位地址也一样合法。能明确判成误填的只有两种：
 *   · 纯数字（多半是手滑，或把邮编/门牌号单填进来了）
 *   · 短到不构成地址（「1」「成都」）
 * 其余一律放行。判据取宽不取严：报名窗口期把真人卡在门口，
 * 比放过一个含糊地址的代价大得多。
 *
 * 【为什么最短是 5 个字】一份能用的邮寄地址至少要写到「市+区+路」：
 * 「成都市青羊区」5 个字，是下限；再短就连投递都谈不上。
 * 必要时改这一个常量即可，文案里的数字跟着变，不会出现文案与规则对不上的情况。
 *
 * @returns {string|null} 不合格时返回给用户看的原因，合格返回 null
 */
export function checkAddress(value) {
  const addr = value === null || value === undefined ? '' : String(value).trim()
  if (!addr) return null // 空由 required 那条负责
  if (!/\D/.test(addr)) return '联系地址不能是纯数字'
  if (addr.length < ADDRESS_MIN) {
    return `联系地址请填写完整（不少于${ADDRESS_MIN}个字，例：成都市青羊区XX路1号）`
  }
  return null
}

/* -------------------------------------------------------------------------
 * 挂到 rules 里的 validator（与 personFields 的规则同源，不要在这里另写正则）
 * ------------------------------------------------------------------------- */

/** 姓名：禁数字、长度 2-20。人员表与表单顶层共用同一份判据 */
export const validateName = asElFormRule(checkPersonName)

/** 学校名称：不能是纯数字 */
export const validateSchool = asElFormRule(checkPersonSchool)

/** 联系电话：11 位手机号，或带区号的固定电话（与人员表同源，见 personFields.checkPersonPhone） */
export const validatePhone = asElFormRule(checkPersonPhone)

/** 联系地址：不能是纯数字、不少于 5 个字 */
export const validateAddress = asElFormRule(checkAddress)
