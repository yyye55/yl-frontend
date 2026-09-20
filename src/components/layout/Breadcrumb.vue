<template>
  <el-breadcrumb separator="/" class="breadcrumb">
    <el-breadcrumb-item v-for="(item, idx) in items" :key="idx" :to="item.path || ''">
      {{ item.title }}
    </el-breadcrumb-item>
  </el-breadcrumb>
</template>

<script setup>
/**
 * 面包屑导航
 *
 * 【可信度：C】基于 Element UI 后台常见做法
 * 从 route.matched 提取 title
 */

import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const items = computed(() => {
  return route.matched
    .filter((m) => m.meta && m.meta.title)
    .map((m) => ({ title: m.meta.title, path: m.path }))
})
</script>

<style lang="scss" scoped>
.breadcrumb { font-size: 14px; }
:deep(.el-breadcrumb__inner) { font-weight: 400 !important; color: #909399; }
</style>
