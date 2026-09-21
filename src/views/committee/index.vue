<template>
  <div class="container">
    <p class="title">报名一览</p>
    <el-table :data="tableData" style="width:100%">
      <!--
        【第十二届改造】后端 stats_admin() 返回 "小学组报名情况"/"中学组报名情况"/"大学组报名情况"
        这些是 11 届遗留字符串。对 12 届，组委会首页展示新 5 组统计暂无完整后端支持，
        目前做友好展示：保留原名 + 括号说明。
        完整 12 届统计（管乐/铜管 x 小学/中学/大学）需要后端按 establishment+group 联合分组（BE-01）。
      -->
      <el-table-column label="类型" width="280">
        <template #default="{ row }">
          <span>{{ row.name }}</span>
          <span v-if="row.name === '小学组报名情况'" style="color:#888;font-size:12px">
          </span>
          <span v-else-if="row.name === '中学组报名情况'" style="color:#888;font-size:12px">
          </span>
          <span v-else-if="row.name === '大学组报名情况'" style="color:#888;font-size:12px">
          </span>
        </template>
      </el-table-column>
      <!--
        dist 原文写的是 prop="data[0]" .. prop="data[3]"。
        Element UI 的 getPropByPath 认识中括号下标；Element Plus 的 getProp 只按 "." 拆分路径，
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
  </div>
</template>

<script setup>
/**
 * 组委会首页（路由 /committee/index），组件名 "index"，作用域 5ad9e65c
 *
 * 【可信度：A】照搬 dist 模块 22ce（chunk-3bab71b2）。原文渲染函数：
 *
 *   t("div",{staticClass:"container"},[
 *     t("p",{staticClass:"title"},[e._v("报名一览")]),
 *     t("el-table",{staticStyle:{width:"100%"},attrs:{data:e.data,size:"mini"}},[
 *       t("el-table-column",{attrs:{prop:"name",label:"类型",width:"240"}}),
 *       t("el-table-column",{attrs:{prop:"data[0]",label:"合计"}}),
 *       t("el-table-column",{attrs:{prop:"data[1]",label:"驳回"}}),
 *       t("el-table-column",{attrs:{prop:"data[2]",label:"待审核"}}),
 *       t("el-table-column",{attrs:{prop:"data[3]",label:"组委会通过"}})
 *     ],1)
 *   ])
 *
 *   data(){ return { data:[], limit:{}, success:[] } }
 *   mounted(){ this.getData() }
 *   methods:{ getData(){ this.$api.committee.index.getIndexTotal()
 *              .then(({data:e})=>{ 0===e.code && (this.data=e.data) }) } }
 *
 * 与 /admin/index（dist 模块 2953）逐行对比的差异，只有两处：
 *   1. 本页**没有**「导出管理」标题与两个导出按钮（导出是管理员专属，后端
 *      /api/admin/export/data1|data2 也做了 role_error(request,3) 校验）；
 *   2. 组件名与接口模块不同。
 * 模板、data 结构、mounted 时机、样式规则完全一致。
 *
 * 样式（dist/css/chunk-3bab71b2.*.css，与 /admin/index 的 115a0d63 逐字节相同）：
 *   .container{display:flex;justify-content:flex-start;flex-direction:column;flex-wrap:wrap}
 *   .title{position:relative;border-bottom:1px solid #dcdcdc;line-height:30px;
 *          padding-left:20px;margin-bottom:10px}
 *   .title:before{content:"";position:absolute;left:0;bottom:5px;width:3px;height:20px;
 *                 background-color:#1890ff}
 *
 * 后端对应接口：GET /api/committee/index/total（yilinbei/apps/api/views.py:608）
 *   def committee_total(request):
 *       err = role_error(request, 2); return err or response(success("获取成功！", stats_admin(request)))
 *
 * 【重要】该接口复用 stats_admin()（views.py:406），与 /api/admin/index/total 返回**同一个**结构：
 *   [{"name": "小学组报名情况", "data": [合计, 驳回, 待审核, 组委会通过]},
 *    {"name": "中学组报名情况", "data": [...]},
 *    {"name": "大学组报名情况", "data": [...]}]
 * 字段名与顺序同 dist 的 data[0..3] 四列一一对应，已核对。
 * 注意 data 里的顺序是 [总数, status=-1, status=0, status=1]，
 * 对应列标题「合计 / 驳回 / 待审核 / 组委会通过」。
 *
 * 【本页旧实现的问题（已重写）】旧版是 "PageHeader + el-empty「页面开发中」+ el-alert"，
 * 属于占位内容，与 dist 的页面结构完全不符，且未调用任何接口。
 */
import { ref, onMounted } from 'vue'
import { committeeApi } from '@/api'

const tableData = ref([])

function getData() {
  // 与 dist 一致：失败时静默（不弹提示），只在 code===0 时写入
  committeeApi.index.getIndexTotal().then(({ data: res }) => {
    if (res.code === 0) tableData.value = res.data
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
