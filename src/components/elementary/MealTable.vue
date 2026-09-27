<!--
  MealTable —— 用餐预约（学校端《赛事报名》表单新增模块）

  【本仓库新增，dist 无】
  这一整块在原始 dist 中**不存在**。位置：参展人员表格之后、红色报名须知提示之前。

  【仅前端静态 —— 这是刻意的，不是没做完】
  按需求约定，本模块**只渲染页面 UI**：
    · 不调用任何接口；不参与报名提交；不写暂存草稿
    · 输入框的值只活在组件本地（counts），刷新页面或切换标签页即丢
    · 不声明 props、不 emit 任何事件 —— 父页面（OrchestraForm）拿不到这 6 个数
  如果要真正收集这些数据，还需要另外接三处：提交体、草稿暂存、后端字段。
  在那之前，本组件的输入框只是「能打字」，填了不会被保存，也不会被提交。

  【为什么用原生 <table>，而不是同页那套 div 网格】
  同页的 TeacherTable / PersonTable 用的是 div + CSS Grid（.box / .box-col）。
  本表不用那套，原因有两条：
    1. 这 6 个格子由「哪一天」+「哪一餐」两个维度共同决定。原生表格的
       scope="col" / scope="row" 能让读屏正确念出「11月22日 晚餐 用餐人数」，
       div 网格没有这个语义，只能靠 aria-label 一个个补。
    2. 本表是 3 列 × 2 行的定长结构：没有 sticky 列、没有动态增删行、不需要
       拖动选择，div 网格那套能力一个都用不上，用它只是白白多一层复杂度。
  样式上与那两张表共用同一组色值和内边距（边框 #8c939d、首列 #dcdcdc、
  padding 5px、表头 line-height 35px、数据行 30px），所以看上去是一套。

  【排布选型】3 列 × 2 行 —— 日期做列，餐次做行
  另一种排法是 6 列 × 1 行（每天午餐/晚餐各占一列，表头写全「11月21日午餐」）。
  两种都实际渲染量过：在 1440px 下**都不出现横向滚动**（表宽都是 1352px，
  正好铺满），差别只在阅读方式 ——
    · 6 列 × 1 行：表头自带完整时间，不必交叉对照，但横向要扫 6 格
    · 3 列 × 2 行：版面更松，但定位一个格子要靠「行标签 + 列日期」两个维度
  最终采用 3 列 × 2 行。

  【赛事日期为什么写死在 DAYS 里】
  需求是固定的 3 天（11月21/22/23日），不是从接口或配置读的。
  若以后要跟着赛事配置走，改 DAYS / MEALS 两个数组即可 ——
  表头、数据行、counts 的键、aria-label 全都是从这两个数组推出来的，不用改模板。
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
        <tr v-for="meal in MEALS" :key="meal">
          <th scope="row" class="col-meal">{{ meal }}</th>
          <td v-for="day in DAYS" :key="day">
            <!--
              人数输入框。几点说明：
                · type="number" + min="0" + step="1" 由 el-input 透传到内部 <input>，
                  移动端会拉起数字键盘（inputmode 同理）。
                · aria-label 是给读屏用的 —— 表头虽在语义上已关联，但读屏聚焦到
                  输入框时只会念「编辑框」，补上完整上下文才知道是哪一格。
                · 不做校验：这是静态布局，填负数、填文字都不会拦。
            -->
            <el-input
              v-model="counts[day][meal]"
              type="number"
              min="0"
              step="1"
              inputmode="numeric"
              :aria-label="`${day}${meal} 用餐人数`"
              placeholder="请输入人数"
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
 * 无 props、无 emit、无接口调用 —— 见文件头的「仅前端静态」说明。
 */
import { reactive } from 'vue'

// 赛事 3 天。同时当作表头文案与 counts 的键。
const DAYS = ['11月21日', '11月22日', '11月23日']
const MEALS = ['午餐', '晚餐']

// counts[日期][餐次]，例如 counts['11月22日']['晚餐']
// 键必须在这里一次建全：Vue 3 的 reactive 对**后加**的键也能追踪，
// 但一次建全可以避免「模板先渲染、键后出现」时 v-model 拿到 undefined。
const counts = reactive(
  Object.fromEntries(DAYS.map((day) => [day, Object.fromEntries(MEALS.map((meal) => [meal, '']))]))
)
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
 * 隐藏 type="number" 的原生上下箭头。
 * demo 里就有这两条，落代码时漏了 —— 不隐藏的话 6 个格子每格右侧都挂一个
 * 小箭头（Chrome / Edge），既与页面其它控件不一致，又白占宽度、把居中挤偏。
 * 上一条给 WebKit，下一条给 Firefox（它不认 -webkit- 前缀，走 appearance）。
 */
.meal-table :deep(.el-input__inner::-webkit-outer-spin-button),
.meal-table :deep(.el-input__inner::-webkit-inner-spin-button) {
  -webkit-appearance: none;
  margin: 0;
}

.meal-table :deep(.el-input__inner[type='number']) {
  -moz-appearance: textfield;
  appearance: textfield;
}
</style>
