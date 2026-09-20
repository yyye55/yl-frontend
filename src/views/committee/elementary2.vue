<!--
  /committee/elementary2 —— 中学组报名审核

  【可信度：A】
    dist 证据：chunk-7d7cca8f 模块 6245
    父路由：/committee (meta.role = 2 → type=2 组委会)

  业务说明（基于 dist data()）：
    - group = "中学组"（字符串）
    - pageTitle = "中学组报名审核"
    - 列集合 II：乐团名称 / 自选曲目 / 提交单位 / 参展学校 / 领队姓名 / 领队联系电话
    - 导出文件名："报名数据（中学组）"
    - 操作、API、筛选、状态分支：与 elementary/elementary1 完全一致

  本页面是 CommitteeReportList 的薄封装，传入：
    - group = "中学组"        （字符串）
    - groupLabel = "中学组"
    - pageTitle = "中学组报名审核"
    - columns = "II"

  与 elementary3 的区别：仅 group 不同（"中学组" vs "大学组"），模板/逻辑完全相同。
  与 elementary1 的区别：仅 group 不同（"小学组" vs "中学组"），列集合和 title 均相同。

  后端 Report.group 是 CharField，数据库中存的是字符串；
  字符串 "中学组" 必须与 Report 表中的 group 字段精确匹配。
-->
<template>
  <CommitteeReportList
    group="中学组"
    group-label="中学组"
    page-title="中学组报名审核"
    columns="II"
  />
</template>

<script setup>
import CommitteeReportList from '@/components/committee/CommitteeReportList.vue'
</script>
