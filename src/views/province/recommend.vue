<template>
  <JiemuList
    :list-api="provinceApi.recommend.getList"
    :upload-api="provinceApi.recommend.createAndUpdate"
    qiniu-key-prefix="ylbxt/"
    center
  />
</template>

<script setup>
/**
 * 省级 - 优秀组织奖申报（路由 /province/recommend/index）
 *
 * 【可信度：A】dist 模块 16bf（chunk-26b9c31af，作用域 06219892），组件名 "jiemu"。
 * 模板实现统一放在 @/components/common/JiemuList.vue。
 *
 * 本页属于「变体 B」（省级 / 市级 / 校级），与变体 A 的差异：
 *   - 多一个 el-upload「点击上传」+ 提示「只能上传PDF格式的文件，文件最大能上传20M!
 *     请上传本地展演活动工作总结。」
 *   - 表格各列带 align="center" / header-align="center"
 *   - mounted 里额外执行 this.user = this.getUser() 与 this.getQiNiuToken()
 *   - data.QiniuData.key 前缀为 "ylbxt/"（变体 A 为 "scdyz/"）
 *   - 刷新方法名为 refresh()（变体 A 为 reflush()，实现完全相同）
 *
 * 接口（与后端 openapi.json 逐条核对一致）：
 *   GET  /api/province/recommend/list  —— provinceApi.recommend.getList
 *   POST /api/province/recommend/cau   —— provinceApi.recommend.createAndUpdate
 *                                        （cau = create and update，dist 里即 createAndUpdate）
 */
import JiemuList from '@/components/common/JiemuList.vue'
import { provinceApi } from '@/api'
</script>
