<!--
  MealTable —— 用餐预约（学校端《赛事报名》表单）

  【本仓库新增，dist 无】
  这一整块在原始 dist 中**不存在**。位置：参展人员表格之后、红色报名须知提示之前。

  【数据出入口只有一个：v-model 绑 form.dinner_reservation_counts】
  父组件（OrchestraForm）用 `v-model="form.dinner_reservation_counts"` 绑定，本组件把它
  画成 6 个输入框。值往上走 form → draftPayload（暂存/提交），往下走草稿/正式报回显。
  本组件**不碰接口**，也不自己拼 payload —— 与全仓既有约定一致（转接层只有
  src/services/draftPayload.js 一处）。

  【6 格，且下标顺序由后端定死 —— 这是本文件最容易改错的地方】
  后端契约（2026-09-27 交付）按下标对齐 6 个时段，值是 null 或 ≥0 的整数：

      下标 0 = 11月20日午餐    下标 1 = 11月20日晚餐
      下标 2 = 11月21日午餐    下标 3 = 11月21日晚餐
      下标 4 = 11月22日午餐    下标 5 = 11月22日晚餐

  即 **下标 i 就是 MEAL_SLOTS[i]**，而 MEAL_SLOTS = 日期 × 餐次 的笛卡尔积
  （日期在外层、餐次在内层）。所以那两个数组**一旦增删或换序，下标就整体平移**，
  会静默把「21日午餐」的 12 人记到「20日晚餐」上 —— 后端不会报错，导出表上也看不出来。
  改动前必须先跟后端对齐下标。

  这份映射**不写在本文件里**，而是收在 config/mealSlots.js 一个入口（与
  config/roles.js 同一思路），本组件与 services/draftPayload.js 共用：
  两处若各写一份，改了一处忘了另一处同样会静默错位。

  【格子数为什么是 6 而不是 4】
  仓库里另一份 `系统需求.docx` 的附件2 只印了 4 格（11月21/22日的午、晚），据此写的
  `docs/用餐预约接口契约-第十二届.md` 初稿一度主张「没有 11月20日」。
  现已核对 **0921 定稿版通知**（`0921-定稿-…-技术用.docx`，也就是后端 registration_form.py
  注释里指名的那一份），其附件2 用餐预约栏是**两行表头、6 个格子**，逐字为：
  11月20日午餐 / 11月20日晚餐 / 11月21日午餐 / 11月21日晚餐 / 11月22日午餐 / 11月22日晚餐。
  与后端下标一一对应。旧版 docx 的 4 格是过期草稿，不要按它改回来。

  【排布选型】3 列 × 2 行 —— 日期做列，餐次做行
  另一种排法是 6 列 × 1 行（每天午餐/晚餐各占一列，表头写全「11月21日午餐」）。
  两种都实际渲染量过：在 1440px 下**都不出现横向滚动**（表宽都是 1352px，
  正好铺满），差别只在阅读方式 ——
    · 6 列 × 1 行：表头自带完整时间，不必交叉对照，但横向要扫 6 格
    · 3 列 × 2 行：版面更松，但定位一个格子要靠「行标签 + 列日期」两个维度
  最终采用 3 列 × 2 行。

  【为什么用原生 <table>，而不是同页那套 div 网格】
  同页的 TeacherTable / PersonTable 用的是 div + CSS Grid（.box / .box-col）。
  本表不用那套，原因有两条：
    1. 本表的格子由「哪一天」+「哪一餐」两个维度共同决定。原生表格的
       scope="col" / scope="row" 能让读屏正确念出「11月22日 晚餐 用餐人数」，
       div 网格没有这个语义，只能靠 aria-label 一个个补。
    2. 本表是 3 列 × 2 行的定长结构：没有 sticky 列、没有动态增删行、不需要
       拖动选择，div 网格那套能力一个都用不上，用它只是白白多一层复杂度。
  样式上与那两张表共用同一组色值和内边距（边框 #8c939d、首列 #dcdcdc、
  padding 5px、表头 line-height 35px、数据行 30px），所以看上去是一套。
-->
<template>
  <div class="container">
    <table class="meal-table">
      <thead>
        <tr>
          <th scope="col" class="col-meal">餐次</th>
          <th v-for="day in DAYS" :key="day" scope="col">{{ day }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(meal, mi) in MEALS" :key="meal">
          <th scope="row" class="col-meal">{{ meal }}</th>
          <td v-for="(day, di) in DAYS" :key="day">
            <!--
              人数输入框。几点说明：
                · type="text" + inputmode="numeric" —— 不用 type="number"。原生
                  number 框会放行 '-'、'.'、'e'（「12.」这类中间态在部分浏览器里
                  取到的 value 甚至是空串），而后端草稿路径对**小数/负数**是直接 400，
                  对**字符串**也是 400。与其等到提交时才炸，不如在输入层就把它们
                  挡掉：onInput 里的 replace(/\D/g,'') 只留数字。
                  移动端拉数字键盘靠 inputmode，与 type=number 等效。
                · aria-label 是给读屏用的 —— 表头虽在语义上已关联，但读屏聚焦到
                  输入框时只会念「编辑框」，补上完整上下文才知道是哪一格。
                · maxlength="4" 是**纯界面护栏**，不是业务规则：后端对这个值没有上限
                  （红头文件对人数也无规定）。挡的是粘贴进一串 20 位数字那种情况 ——
                  Number('9'.repeat(20)) 仍满足 Number.isInteger，会原样进 payload。
            -->
            <el-input
              :model-value="display(slotIndex(di, mi))"
              type="text"
              inputmode="numeric"
              maxlength="4"
              :aria-label="`${day}${meal} 用餐人数`"
              placeholder="请输入人数"
              @input="(v) => onInput(slotIndex(di, mi), v)"
            />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
/**
 * 用餐预约表格（学校端《赛事报名》表单）
 *
 * 【无校验提示是刻意的】这一栏不是必填，也不参与组队人数那套规则
 * （config/personRules.js 只管正式/预备队员与打击乐）。唯一的硬约束
 * 「null 或 ≥0 的整数」在输入层（只收数字）和转接层（draftPayload 再规整一次）
 * 各收一道，界面上不需要也不应该再报一次错。
 */
// 赛事 3 天、2 个餐次、6 个时段的标签与下标换算，全部来自这一个入口。
// 本组件**不自己写** DAYS/MEALS 字面量：那份数组的顺序就是后端下标顺序，
// 复制一份到组件里改错一处就会静默错位（完整理由见 config/mealSlots.js 文件头）。
// 别名沿用模板里既有的 DAYS / MEALS / slotIndex 三个名字，改动面最小。
import {
  MEAL_DAYS as DAYS,
  MEAL_KINDS as MEALS,
  MEAL_SLOT_COUNT,
  mealSlotIndex as slotIndex
} from '@/config/mealSlots'

const props = defineProps({
  /**
   * 6 个时段的人数，下标同 mealSlots.MEAL_SLOTS。元素为 null 或 ≥0 的整数。
   * 长度不足 6（含空数组、前端初值 [] 、后端回显 null）时，缺的位置一律按「未填」渲染。
   */
  modelValue: { type: Array, default: () => [] }
})
const emit = defineEmits(['update:modelValue'])

/**
 * 把任意来源的值统一成 payload 要的 6 位数组：每位只可能是 null 或正整数。
 * 与 services/draftPayload.js 的 normalizeMealCounts 是同一套口径 —— 那边是
 * 「出口前兜底」，这边是「回显时兜底」，两道都留是因为 form 的值有两个来源
 * （用户输入、后端回显），任一路径漏掉都会把脏值带上天。
 */
function normalize(list) {
  return Array.from({ length: MEAL_SLOT_COUNT }, (_, i) => {
    const v = Array.isArray(list) ? list[i] : null
    return Number.isInteger(v) && v > 0 ? v : null
  })
}

/**
 * 读第 i 格 → 输入框里显示的字符串。
 * null / undefined / 0 / 负数 / 小数 / 脏值一律显示空 —— 后端契约里
 * 「null、元素 null、0」三者语义等价，都是「该时段未填人数」。
 */
function display(i) {
  const v = props.modelValue?.[i]
  return Number.isInteger(v) && v > 0 ? String(v) : ''
}

/**
 * 写第 i 格。三点：
 *  1) 每次都从 modelValue **整体重算 6 位**再 emit —— 数组是不可变替换、不做原地改，
 *     这样父组件的 form 引用一定变化，草稿的「有没有变」判据（payloadSignature）
 *     与本组件的重渲染都不会漏。
 *  2) 清空输入框 → null（不是 0）。两种在契约上等价，但只保留一种写法可以让
 *     build→restore→build 成为**幂等**的，否则每次往返都在 null / 0 之间抖动，
 *     payloadSignature 会一直认定「有变化」而反复暂存。
 *  3) 只留数字（见模板注释）。留空串 → null；"0" 与 "00" → null（同上，语义等价）；
 *     超过 4 位由 maxlength 挡在输入层，到不了这里。
 */
function onInput(i, raw) {
  const digits = String(raw ?? '').replace(/\D/g, '')
  const value = digits === '' ? 0 : Number(digits)
  const next = normalize(props.modelValue)
  next[i] = value > 0 ? value : null
  emit('update:modelValue', next)
}
</script>

<style lang="scss" scoped>
/*
 * 数值全部取自 components/elementary/PersonTable.vue 的 scoped 块，
 * 以便两张表看上去是一套：边框 #8c939d、首列底 #dcdcdc、
 * padding 5px、表头 line-height 35px、数据行 line-height 30px。
 */
.container {
  margin-bottom: 10px;
}

.meal-table {
  width: 100%;
  border-collapse: collapse;
  /* fixed：列宽只由首行决定，输入框里数字位数变化不会挤动列宽 */
  table-layout: fixed;
}

.meal-table th,
.meal-table td {
  border: 1px solid #8c939d;
  padding: 5px;
  text-align: center;
  font-weight: normal;
  font-size: 14px;
  color: #303133;
}

.meal-table thead th {
  background: #fff;
  line-height: 35px;
  white-space: nowrap;
}

/*
 * 「餐次」列（表头的「餐次」+ 两个行标签「午餐」「晚餐」）。
 * 底色 #dcdcdc 与 PersonTable 里序号列（.box-col:first-child）的处理一致。
 * width 只在 table-layout:fixed 下由**首行**生效，所以写在表头格上就够。
 */
.meal-table .col-meal {
  width: 130px;
  background-color: #dcdcdc;
}

.meal-table tbody td {
  background: #fff;
  line-height: 30px;
}

/*
 * 输入框文字居中。el-input 内部结构在子组件里，scoped 选择器够不到，
 * 必须用 :deep()。
 * 依据：src/styles/index.css 里「四个端所有表格文字一律居中」的既有约定。
 * 不加 tabular-nums —— table-layout 已是 fixed，数字位数变化本来就挤不动列宽。
 */
.meal-table :deep(.el-input__inner) {
  text-align: center;
}

/*
 * 【已删除】隐藏 type="number" 原生上下箭头的两条规则（-webkit-inner-spin-button
 * 与 Firefox 的 appearance: textfield）。
 * 输入框已从 type="number" 改成 type="text" + inputmode="numeric"（理由见模板注释），
 * 浏览器不再渲染那对箭头，两条规则已无处生效。留着只会让人以为这里还是 number 框。
 */
</style>
