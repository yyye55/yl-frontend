<template>
  <JiemuList
    :list-api="cityApi.recommend.getList"
    :upload-api="cityApi.recommend.createAndUpdate"
    center
  />
</template>

<script setup>
/**
 * 市级 - 优秀组织奖申报（路由 /city/recommend/index）
 *
 * 【可信度：A】dist 模块 f479（chunk-895b4464，作用域见该 chunk 的 [data-v-*] 规则），
 * 组件名 "jiemu"。模板实现统一放在 @/components/common/JiemuList.vue。
 *
 * 与 /school/recommend/index 同属「变体 B」，逐行 diff 两者仅接口模块不同：
 *   GET  /api/city/recommend/list  —— cityApi.recommend.getList
 *   POST /api/city/recommend/cau   —— cityApi.recommend.createAndUpdate
 * 其余模板、方法、常量（QiniuData.key 前缀 "ylbxt/"、domain、host）完全一致。
 */
import JiemuList from '@/components/common/JiemuList.vue'
import { cityApi } from '@/api'
</script>
