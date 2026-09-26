<template>
  <OrchestraForm variant="/primary/elementary/create" />
</template>

<script setup>
/**
 * 中小学端 · 赛事报名页 —— 路由 /primary/elementary/create
 *
 * 【为什么本文件只有 3 行】
 * 表单的真实实现是唯一组件 @/components/elementary/OrchestraForm.vue（1961 行），
 * 本文件只负责声明「我对应哪个变体」。
 * 该组件用 variant 字符串去查内部的 VARIANTS 表，查出来的那一条决定了：
 * 标题、乐团类别/组别下拉给哪些选项、走哪个 api 作用域、提交成功后跳哪。
 *
 * 【本变体（在 OrchestraForm 的 VARIANTS 里）】
 *   '/primary/elementary/create' -> mode:'create'、api.create:'primary'
 *   乐团类别：管乐团 / 铜管乐团
 *   参演组别：小学组 / 中学组
 *   提交成功后跳 /primary/elementary/list
 *
 * 【为什么是这三个选项】中小学端报的就是"中小学"，与市州端是同一批报考对象。
 * 因此人数上下限、展示时长、「中小学乐团指挥须为本校在职教师」这些规则
 * 全部自动生效 —— 它们的判据是**组别**（src/config/personRules.js 第 336 行
 * 判断 `level !== '大学组'`），跟"哪个端"无关。
 *
 * 【不要把这个字符串改成 /city/...】那样会连累接口一起变：variant 是
 * 「用哪套接口」的唯一开关，写成 /city 就会去打 /api/city/*，
 * 而后端对 type=5 的账号在 /api/city/* 上返 403。
 */
import OrchestraForm from '@/components/elementary/OrchestraForm.vue'
</script>
