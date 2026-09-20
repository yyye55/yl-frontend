<template>
  <OrchestraForm variant="/city/elementary/create" />
</template>

<script setup>
/**
 * 赛事报名页 —— 路由 /city/elementary/create
 *
 * 【dist 已确认】本页在原生产构建中对应 chunk 模块 5e02，组件名 name:"ElementaryCreate"，
 * 作用域样式 id c01ac1ca，标题「赛事报名」。
 *
 * 【为什么本文件这么薄】
 * 本页与 /school/elementary/create、/city/elementary/edit/:id、/school/elementary/edit/:id
 * 在 dist 里是 4 个独立模块，但逐字节比对后确认它们是**同一份实现**，差异只是若干
 * 「逐路由常量」（标题、类型/组别选项、指定曲目 v-if、api 作用域、提交后跳转）。
 * 因此模板实现收敛到唯一组件 @/components/elementary/OrchestraForm.vue，
 * 本文件只负责声明自己对应哪个变体。逐路由差异表见该组件头部注释。
 *
 * 【本变体要点】city 新增是 4 个模块里**唯一**给「指定曲目」加了
 * `v-if="form.establishment === '管乐团'"` 的（其余 3 个无条件渲染），
 * 且「类型」有 管乐团/铜管乐团 两个选项，「参演组别」只有 小学组/中学组 两个（编辑页是 3 个）。
 *
 * 【路由未改动】本文件路径与 src/router/index.js 中已声明的 component 路径完全一致。
 */
import OrchestraForm from '@/components/elementary/OrchestraForm.vue'
</script>
