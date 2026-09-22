<template>
  <JiemuList :list-api="adminApi.recommend.getList" />
</template>

<script setup>
/**
 * 管理员 - 优秀组织奖申报列表（路由 /admin/recommend）
 *
 * 【可信度：A】dist 模块 f7aa（chunk-278da94c，作用域 43031bc6），组件名 "jiemu"。
 * 模板实现统一放在 @/components/common/JiemuList.vue（4 个路由共用同一份源码）。
 *
 * 本页属于「变体 A」（管理员 / 组委会）：
 *   - 只有「刷新」按钮，**没有**上传入口
 *   - dist 的 mounted 只调用 getData()，不调用 getUser()、不取七牛 token
 *   - 接口：this.$api.admin.recommend.getList({page, limit})
 *
 * 注：dist 原文的 data 里仍带着 QiniuData / domain / host / getQiNiuToken / beforeUpload /
 * uploadFile 等一整套上传逻辑（key 前缀写作 "scdyz/"），但本变体模板中没有任何元素能触发它们，
 * 且 uploadFile 内部调用的还是 school.recommend.createAndUpdate（跨角色接口），属于复制源码时
 * 残留的死代码。因此本页不传 uploadApi，这些死代码不会被激活，也不会误导调用方。
 */
import JiemuList from '@/components/common/JiemuList.vue'
import { adminApi } from '@/api'
</script>
