<template>
  <JiemuList :list-api="committeeApi.recommend.getList" qiniu-key-prefix="scdyz/" />
</template>

<script setup>
/**
 * 组委会 - 优秀组织奖申报列表（路由 /committee/recommend）
 *
 * 【可信度：A】dist 模块 fc73（chunk-628151f4，作用域 8ec6982c），组件名 "jiemu"。
 * 模板实现统一放在 @/components/common/JiemuList.vue。
 *
 * 与 /admin/recommend 同属「变体 A」。逐行 diff 两者，差异仅两处：
 *   1. 接口：this.$api.committee.recommend.getList（管理员版为 admin.recommend）
 *   2. 编译产物中的作用域样式 id 与 webpack 模块号
 *   （见 dist-map.mjs --dump f7aa 与 --dump fc73 的对比：仅 4 行不同）
 * 因此本页与管理员版的参数完全一致。
 */
import JiemuList from '@/components/common/JiemuList.vue'
import { committeeApi } from '@/api'
</script>
