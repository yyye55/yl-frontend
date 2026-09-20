<!--
  /committee/elementary —— 中小学组报名审核

  【可信度：A】
    dist 证据：chunk-96fa5cf6 模块 f841
    父路由：/committee (meta.role = 2 → type=2 组委会)

  业务说明（基于 dist 模块 data() 与后端 apps/api/views.py）：
    - group = 0 表示"中小学组"（dist data().group 是数字 0）
    - 表格标题：「报名列表」
    - 表格列集合 I：合唱团名称 / 节目名称 / 提交单位 / 联系人 / 联系电话 / 联系地址
    - 操作：审核通过 / 驳回（带备注 dialog）/ 查看详情（ShowContent）
    - 顶部筛选：keyword + 审核状态（全部 / 待审核 / 未通过 / 组委会通过）
    - 导出文件名："YYYY年M月D日H时m分报名数据（中小学组）"

  本页面是 CommitteeReportList 的薄封装，传入：
    - group = 0            （数字；axios 自动转字符串）
    - groupLabel = "中小学组"
    - pageTitle = "报名列表"
    - columns = "I"

  与 elementary1 的区别：
    - group：0 vs "小学组"（类型不同！）
    - 列集合：I vs II
    - 标题：报名列表 vs 小学组报名审核
    - 导出文件名后缀：中小学组 vs 小学组
    - 后端 Report.group 字段是 CharField，数据库中存的是字符串

  与 teacher/teacher1 的区别：
    - 仅 group 值不同（0 vs 2 vs 3）
-->
<template>
  <CommitteeReportList
    :group="0"
    group-label="中小学组"
    page-title="报名列表"
    columns="I"
  />
</template>

<script setup>
import CommitteeReportList from '@/components/committee/CommitteeReportList.vue'
</script>
