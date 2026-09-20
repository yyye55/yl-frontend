<template>
  <ReportList variant="/city/elementary/list" />
</template>

<script setup>
/**
 * 报名列表页 —— 路由 /city/elementary/list
 *
 * 【dist 已确认】本页在原生产构建中对应 chunk 模块 1c73（组件名 name:"ElementaryList"），
 * 标题为「报名汇总」。
 *
 * 【为什么本文件这么薄】5 个列表页在 dist 里是 5 个独立模块，逐字节比对后确认是同一份实现
 * （模板、scoped 样式、分页参数、删除确认文案全部一致），差异只是 API 作用域、表格列、
 * 以及是否有「类别」筛选。模板实现收敛到 @/components/elementary/ReportList.vue，
 * 逐路由差异表见该组件头部注释。
 *
 * 【路由未改动】本文件路径与 src/router/index.js 中已声明的 component 路径完全一致。
 */
import ReportList from '@/components/elementary/ReportList.vue'
</script>
