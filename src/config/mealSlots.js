/**
 * 用餐预约的 6 个时段 —— 下标映射的唯一事实来源
 *
 * 【为什么单开一个文件】
 * 「下标 i 是哪一个时段」这件事同时约束两处互不相干的代码：
 *   · components/elementary/MealTable.vue  —— 把它渲染成 3 列 × 2 行的输入框
 *   · services/draftPayload.js             —— 把它规整成固定 6 位的数组发给后端
 * 两处若各自写一份 DAYS/MEALS，改了一处忘了另一处，结果**不是报错而是静默错位**：
 * 学校填在「11月21日午餐」的 12 人会被当成「11月20日晚餐」存进去，后端不报错，
 * 导出的报名表上也看不出异常。故收敛成唯一入口，与 config/roles.js 同一思路。
 *
 * 【下标由后端定死，前端无权增删或换序】
 * 后端 2026-09-27 交付的 dinner_reservation_counts 契约原文：
 *   下标 0 = 11月20日午餐   1 = 11月20日晚餐
 *        2 = 11月21日午餐   3 = 11月21日晚餐
 *        4 = 11月22日午餐   5 = 11月22日晚餐
 * 即「日期在外层、餐次在内层」的两层排法。下面的 SLOTS 就是按这个顺序展开的，
 * 一定要改（比如换成 4 格、或加上 11月23日）必须**先跟后端改契约**，不能只改这里。
 *
 * 【为什么是 6 格，不是 4 格】
 * 仓库里那份 `系统需求.docx` 的附件2 只印了 4 格（11月21/22 日的午、晚），
 * 据此写的 docs/用餐预约接口契约-第十二届.md 初稿一度主张「没有 11月20日」。
 * 已核对 **0921 定稿版通知**（后端 registration_form.py 注释里指名的那一份）：
 * 其附件2 用餐预约栏是两行表头、6 个格子，逐字与下面的 SLOTS 一致。
 * 旧版 docx 的 4 格是过期草稿。
 *
 * 【值的形状】元素为 null 或 ≥0 的整数。
 *   null / 0 / 缺位 三者语义等价，都表示「该时段未填人数」。
 *   前端统一用 null 表示未填（不产生 0），理由见 draftPayload.js 的 normalizeMealCounts。
 */

/** 赛事 3 天，日期做表头列（也是 SLOTS 的外层维度） */
export const MEAL_DAYS = ['11月20日', '11月21日', '11月22日']

/** 两个餐次，做表格的行（也是 SLOTS 的内层维度） */
export const MEAL_KINDS = ['午餐', '晚餐']

/** 6 个时段的完整标签，顺序即后端下标，见文件头 */
export const MEAL_SLOTS = MEAL_DAYS.flatMap((day) => MEAL_KINDS.map((kind) => day + kind))

/** 时段总数。payload 里该数组固定按这个长度上送（不足由后端补 null，但我们自己补齐更可控） */
export const MEAL_SLOT_COUNT = MEAL_SLOTS.length

/**
 * 网格位置 → 下标。日期在外层、餐次在内层，与后端的排法一致。
 * 模板不自己算下标（`di * 2 + mi` 这种写法一旦维度顺序被改就会静默算错）。
 */
export function mealSlotIndex(dayIndex, kindIndex) {
  return dayIndex * MEAL_KINDS.length + kindIndex
}
