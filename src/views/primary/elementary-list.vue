<template>
  <ReportList variant="/primary/elementary/list" />
</template>

<script setup>
/**
 * 中小学端 · 报名汇总页 —— 路由 /primary/elementary/list
 *
 * 【为什么本文件只有 3 行】
 * 列表的真实实现是 @/components/elementary/ReportList.vue，本文件只声明变体。
 *
 * 【本变体（在 ReportList 的 VARIANTS 里）】
 *   '/primary/elementary/list' -> title '报名汇总'、api 'primary'、
 *   列集合 'II'、操作列宽 500、编辑跳 /primary/elementary/edit/:id
 *
 * 【列集合 II 是什么】ReportList 里定义了几套列方案，'II' 是赛事报名汇总那套
 * （审核状态、驳回原因、人员信息、盖章扫描件、操作列等）。
 * 市州端和学校端的 elementary/list 用的也是 'II' —— 三端同一套列。
 *
 * 【本端不需要过滤 group】与 city/school 一致：getData 不发 group 参数，
 * 所以小学组和中学组的报名会一起出现在这一页里。
 *
 * 【操作列按钮的可见性】ReportList 用 usePermission() 的 canEditReport 决定
 * 是否显示「编辑/删除」。中小学端不是只读端（isViewOnlyScope 只认 type=1），
 * 所以这四个按钮都会显示 —— 这正是中小学端要的。
 */
import ReportList from '@/components/elementary/ReportList.vue'
</script>
