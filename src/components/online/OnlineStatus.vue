<!--
  OnlineStatus 在线展演列表页专用状态标签

  【dist 已确认】chunk-104e4496 模块 8dc0 中的 Status scoped slot
  Status({ status: e.row.status })

  【与 common/Status.vue 的区别】
  common/Status.vue: -2 未填写 / -1 已驳回 / 0 待审核 / 1 组委会通过
  OnlineStatus.vue:  -2 未填写 / -1 已驳回 / 0 已填写   / 1 组委会通过
  区别：报名系统「待审核」vs 在线展演「已填写」
-->
<template>
  <div class="status-box">
    <div v-if="status === -2" class="case1"> 未填写 </div>
    <div v-if="status === -1" class="case1"> 已驳回 </div>
    <div v-if="status === 0"  class="case2"> 已填写 </div>
    <div v-if="status === 1"  class="case3"> 组委会通过 </div>
  </div>
</template>

<script setup>
defineProps({
  status: { type: Number, default: 0 }
})
</script>

<style lang="scss" scoped>
.case1 { color: #f56c6c; }
.case2 { color: #409eff; }
.case3 { color: #67c23a; }
</style>
