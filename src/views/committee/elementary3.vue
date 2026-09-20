<!--
  /committee/elementary3 —— 大学组报名审核

  【可信度：A】
    dist 证据：chunk-1b3c6962 模块 0e3c
    父路由：/committee (meta.role = 2 → type=2 组委会)

  业务说明（基于 dist data()）：
    - group = "大学组"（字符串）
    - pageTitle = "大学组报名审核"
    - 列集合 II：乐团名称 / 自选曲目 / 提交单位 / 参展学校 / 领队姓名 / 领队联系电话
    - 导出文件名："报名数据（大学组）"
    - 操作、API、筛选、状态分支：与 elementary/elementary1 完全一致

  本页面是 CommitteeReportList 的薄封装，传入：
    - group = "大学组"        （字符串）
    - groupLabel = "大学组"
    - pageTitle = "大学组报名审核"
    - columns = "II"

  与 elementary2 的区别：仅 group 不同（"中学组" vs "大学组"），模板/逻辑完全相同。

  【注意】后端 scoped_total 中 "大学组" 对应 Report.group="1"（数字），
  但 committee/elementary3 发的是 group="大学组"（字符串）——
  这与 elementary1 发 group="小学组"（字符串）而非数字一样，
  是 committee 域与 city/school 域在数据分组方式上的差异。
  组委会页面是按字符串名过滤，后端 report_queryset 直接用 request.GET.get("group") 匹配。
-->
<template>
  <CommitteeReportList
    group="大学组"
    group-label="大学组"
    page-title="大学组报名审核"
    columns="II"
  />
</template>

<script setup>
import CommitteeReportList from '@/components/committee/CommitteeReportList.vue'
</script>
