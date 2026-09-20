<!--
  /committee/elementary1 —— 小学组报名审核

  【可信度：A】
    dist 证据：chunk-6e3f572b 模块 260e
    父路由：/committee (meta.role = 2 → type=2 组委会)

  业务说明（基于 dist 模块 data() 与后端 apps/api/views.py）：
    - group = "小学组"（dist data().group 是**字符串**，与 elementary 的数字 0 不同）
    - 表格标题：「小学组报名审核」（与 elementary 的「报名列表」不同）
    - 表格列集合 II：乐团名称 / 自选曲目 / 提交单位 / 参展学校 / 领队姓名 / 领队联系电话
      （注意：列集合 II 比 I 多 school_name 列，少 contact_way 列；
       "联系人/联系电话" 改为 "领队姓名/领队联系电话"；
       "节目名称" 改为 "自选曲目"；
       "合唱团名称" 改为 "乐团名称"）
    - 操作：审核通过 / 驳回（带备注 dialog）/ 查看详情（ShowContent）
    - 导出文件名："YYYY年M月D日H时m分报名数据（小学组）"

  本页面是 CommitteeReportList 的薄封装，传入：
    - group = "小学组"          （字符串；与 elementary 的数字 0 类型不同！）
    - groupLabel = "小学组"
    - pageTitle = "小学组报名审核"
    - columns = "II"

  【CONFLICT 提示】elementary1 的 group 是字符串 "小学组"，但项目内其他 group
  字段（elementary / teacher / teacher1）是数字。后端 Report.group 字段是 CharField，
  数据库中实际存的是字符串，dist 在创建报告时由 ReportForm 决定 group 字符串值。
  本组件按 dist 原文原样发送 group 值，不做类型转换。

  【已知相似页面】src/components/elementary/ReportList.vue 的 '/city/elementary/list'
  和 '/school/elementary/list' 变体也用列集合 II（学校列），但**那 2 个**不传 group
  （getData 不发 group 参数），而 committee/elementary1 必须发 group="小学组" —— 这是
  committee 域与 city/school 域在数据权限上的不同。
-->
<template>
  <CommitteeReportList
    group="小学组"
    group-label="小学组"
    page-title="小学组报名审核"
    columns="II"
  />
</template>

<script setup>
import CommitteeReportList from '@/components/committee/CommitteeReportList.vue'
</script>
