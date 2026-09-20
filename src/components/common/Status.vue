<template>
  <!-- dist 原文：div.status-box，内部四个 v-if 分支（不是 v-else-if） -->
  <div class="status-box">
    <div v-if="status === -2" class="case1"> 未填写 </div>
    <div v-if="status === -1" class="case1"> 已驳回 </div>
    <div v-if="status === 0" class="case2"> 待审核 </div>
    <div v-if="status === 1" class="case3"> 组委会通过 </div>
  </div>
</template>

<script setup>
/**
 * Status 报名状态标签
 *
 * 【可信度：A】逐行照搬 dist chunk-335604d9 的模块 3865（被 /admin/report 及
 * 各角色的报名列表页共用）。原文组件选项：
 *
 *   name:"Status",
 *   props:{ status:{ type:Number, default:0 } }
 *   模板：v-if 四分支 -2 未填写 / -1 已驳回 / 0 待审核 / 1 组委会通过
 *
 * 【重要】状态取值是 -2 / -1 / 0 / 1，共四个。
 * 本项目此前在 admin/report.vue 中推测的状态集合是 {0 待审核, 1 已通过, 2 已拒绝} ——
 * 其中「2」在后端与 dist 中都不存在，真实的「未通过」是 -1，
 * 「已驳回」也是 -1，「未填写」才是 -2。详见 report.vue 的说明。
 *
 * 后端依据（apps/core/models.py 的 Report.status）：
 *   -2 未填写（报名表已建但未提交） / -1 驳回 / 0 待审核 / 1 组委会通过
 */
defineProps({
  status: { type: Number, default: 0 }
})
</script>

<style lang="scss" scoped>
/* 照搬 dist/css/chunk-335604d9.9c29b119.css 中 [data-v-6f40df5c] 作用域的规则。
   注意 .status-box 本身在 dist 中没有任何样式，此处同样不写。 */
.case1 {
  color: #f56c6c;
}
.case2 {
  color: #409eff;
}
.case3 {
  color: #67c23a;
}
</style>
