<template>
  <JiemuList
    :list-api="schoolApi.recommend.getList"
    :upload-api="schoolApi.recommend.createAndUpdate"
    qiniu-key-prefix="ylbxt/"
    center
  />
</template>

<script setup>
/**
 * 校级 - 优秀组织奖申报（路由 /school/recommend/index）
 *
 * 【可信度：A】dist 模块 e791（chunk-38b8c098），组件名 "jiemu"。
 * 模板实现统一放在 @/components/common/JiemuList.vue。
 *
 * 与 /city/recommend/index 同属「变体 B」，仅接口模块不同：
 *   GET  /api/school/recommend/list  —— schoolApi.recommend.getList
 *   POST /api/school/recommend/cau   —— schoolApi.recommend.createAndUpdate
 *
 * 【旁证】变体 A（管理员版）的 uploadFile 死代码里调的正是
 * `this.$api.school.recommend.createAndUpdate` —— 与本页一致。
 * 这从侧面印证：变体 A 的上传逻辑是从变体 B 复制过去后忘记删除的残留，
 * 故在 JiemuList 中通过「是否传入 uploadApi」来区分，而不是保留那套永远不会执行的代码。
 */
import JiemuList from '@/components/common/JiemuList.vue'
import { schoolApi } from '@/api'
</script>
