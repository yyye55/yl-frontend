<template>
  <div class="container">
    <p class="title">报名一览</p>
    <el-table :data="tableData" size="mini" style="width:100%">
      <el-table-column prop="name" label="类型" width="240" />
      <!--
        dist 原文写的是 prop="data[0]" .. prop="data[3]"。
        Element UI 的 getPropByPath 认识中括号下标，Element Plus 的 getProp 只按 "." 拆分，
        直接照搬会取到 undefined、整列空白，因此这里改用插槽读取 row.data[n]。
        label / 顺序 / 宽度均与 dist 一致。
      -->
      <el-table-column label="合计">
        <template #default="{ row }">{{ row.data && row.data[0] }}</template>
      </el-table-column>
      <el-table-column label="驳回">
        <template #default="{ row }">{{ row.data && row.data[1] }}</template>
      </el-table-column>
      <el-table-column label="待审核">
        <template #default="{ row }">{{ row.data && row.data[2] }}</template>
      </el-table-column>
      <el-table-column label="组委会通过">
        <template #default="{ row }">{{ row.data && row.data[3] }}</template>
      </el-table-column>
    </el-table>

    <p class="title">导出管理</p>
    <div class="export-button">
      <el-button type="primary" @click="exportData1">导出报名数据</el-button>
      <el-button type="primary" @click="exportData2">导出器乐统计数据</el-button>
    </div>
  </div>
</template>

<script setup>
/**
 * 管理员首页
 *
 * 【可信度：A】逐项照搬 dist/chunk-0b33b17b（路由 /admin/index 对应的 chunk）。
 * 原文渲染函数：
 *
 *   t("div",{staticClass:"container"},[
 *     t("p",{staticClass:"title"},[e._v("报名一览")]),
 *     t("el-table",{staticStyle:{width:"100%"},attrs:{data:e.data,size:"mini"}},[
 *       t("el-table-column",{attrs:{prop:"name",label:"类型",width:"240"}}),
 *       t("el-table-column",{attrs:{prop:"data[0]",label:"合计"}}),
 *       t("el-table-column",{attrs:{prop:"data[1]",label:"驳回"}}),
 *       t("el-table-column",{attrs:{prop:"data[2]",label:"待审核"}}),
 *       t("el-table-column",{attrs:{prop:"data[3]",label:"组委会通过"}})
 *     ],1),
 *     t("p",{staticClass:"title"},[e._v("导出管理")]),
 *     t("div",{staticClass:"export-button"},[
 *       t("el-button",{attrs:{type:"primary"},on:{click:()=>e.exportData1()}},[e._v("导出报名数据")]),
 *       t("el-button",{attrs:{type:"primary"},on:{click:e.exportData2}},[e._v("导出器乐统计数据")])
 *     ],1)
 *   ])
 *
 *   data(){ return { data:[], limit:{}, success:[] } }
 *   mounted(){ this.getData() }
 *   methods:{
 *     exportData1(){ this.$api.admin.exportData.data1().then(e=>{ this.downloadExcelFile(e.data,"报名数据") }) },
 *     exportData2(){ this.$api.admin.exportData.data2().then(e=>{ this.downloadExcelFile(e.data,"器乐统计数据") }) },
 *     getData(){ this.$api.admin.index.getIndexTotal().then(({data:e})=>{ 0===e.code && (this.data=e.data) }) }
 *   }
 *
 * 原文样式（dist/css/chunk-0b33b17b.7d4eb47e.css）：
 *   .container{display:flex;justify-content:flex-start;flex-direction:column;flex-wrap:wrap}
 *   .title{position:relative;border-bottom:1px solid #dcdcdc;line-height:30px;
 *          padding-left:20px;margin-bottom:10px}
 *   .title:before{content:"";position:absolute;left:0;bottom:5px;width:3px;height:20px;
 *                 background-color:#1890ff}
 *
 * 后端对应接口：GET /api/admin/index/total
 *   返回 success("获取成功！", stats_admin(request))，其中 stats_admin 返回
 *   [{ name:"小学组报名情况", data:[合计, 驳回, 待审核, 组委会通过] }, ... 中学组、大学组]
 *   —— 与 dist 的 data[0..3] 四列一一对应，字段名与顺序均已核对。
 *
 * 【本页旧实现的问题（已重写）】旧版是"PageHeader + 4 个统计卡片 + 欢迎列表 + 【C：推测】提示"，
 * 卡片读取的 total / pending / passed / signed 四个字段在后端与 dist 中都不存在，
 * 属于凭空捏造的内容，与 dist 的页面结构也完全不符。
 */

import { ref, onMounted } from 'vue'
import { adminApi } from '@/api'
import { downloadExcelFile } from '@/utils/excel'

const tableData = ref([])

function getData() {
  // 与 dist 一致：失败时静默（不弹提示），只在 code===0 时写入
  adminApi.index.getIndexTotal().then(({ data: res }) => {
    if (res.code === 0) tableData.value = res.data
  })
}

function exportData1() {
  adminApi.exportData.data1().then((res) => {
    downloadExcelFile(res.data, '报名数据')
  })
}

function exportData2() {
  adminApi.exportData.data2().then((res) => {
    downloadExcelFile(res.data, '器乐统计数据')
  })
}

onMounted(getData)
</script>

<style lang="scss" scoped>
.container {
  display: flex;
  justify-content: flex-start;
  flex-direction: column;
  flex-wrap: wrap;
}

.title {
  position: relative;
  border-bottom: 1px solid #dcdcdc;
  line-height: 30px;
  padding-left: 20px;
  margin-bottom: 10px;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    bottom: 5px;
    width: 3px;
    height: 20px;
    background-color: #1890ff;
  }
}
</style>
