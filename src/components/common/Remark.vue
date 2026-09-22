<template>
  <div class="main">
    <el-button style="font-size:12px;margin-right:6px" @click="dialogTableVisible = true">
      查看驳回信息
    </el-button>
    <!-- append-to-body：本组件在 el-table 的操作列单元格里，不加会被后面的列盖住。
         原因见 ShowPerson.vue 顶部关于 .el-table__cell{z-index:1} 的说明。 -->
    <el-dialog v-model="dialogTableVisible" title="驳回原因" append-to-body>
      <p style="font-size:15px">{{ data }}</p>
    </el-dialog>
  </div>
</template>

<script setup>
/**
 * Remark 驳回原因查看
 *
 * 【可信度：A】逐行照搬 dist chunk-335604d9 的模块 4391。原文组件选项：
 *
 *   name:"Remark",
 *   props:{ data:{ default:[] } },          // 原文未声明 type
 *   data(){ return { dialogTableVisible:!1 } },
 *   mounted(){}                              // 空钩子，无行为
 *
 * 模板：el-button(size=mini, font-size:12px, margin-right:6px)「查看驳回信息」
 *       -> el-dialog(title="驳回原因") -> p(font-size:15px) 直接渲染 data
 *
 * 【关于 props.data】原文声明 default 为 []，但实际调用方传的是 row.remark —— 一个字符串
 * （见 report.vue 的 `t("Remark",{attrs:{data:n.row.remark}})`）。原文没有声明 type，
 * 因此这里同样不声明 type，保持「接受任意值」的原行为。
 *
 * 【mounted 空钩子未迁移】原文 mounted(){} 是空实现，无任何副作用。
 */
defineProps({
  data: { default: () => [] }
})

import { ref } from 'vue'

const dialogTableVisible = ref(false)
</script>

<style lang="scss" scoped>
/* dist/css/chunk-335604d9.9c29b119.css 中 [data-v-d28ad06a] */
.main {
  display: inline-block;
}
</style>
