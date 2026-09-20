<template>
  <ProgramForm variant="/school/teacher/edit/:id" />
</template>

<script setup>
/**
 * 节目修改页 —— 路由 /school/teacher/edit/:id
 *
 * 【dist 已确认】本页在原生产构建中对应 chunk 模块 7fcd（组件名 name:"ElementaryEdit"），
 * 标题为「高校教师组节目修改」。
 *
 * 【为什么本文件这么薄】
 * 这一族的 12 个页面在 dist 里是 12 个独立模块，但逐字节比对后确认它们是**同一份实现**
 * （模板结构、scoped 样式、基础校验规则全部一致），差异只是若干「逐路由常量」。
 * 因此模板实现收敛到唯一组件 @/components/elementary/ProgramForm.vue，
 * 本文件只负责声明自己对应哪个变体。逐路由差异表见该组件头部注释。
 *
 * 【路由未改动】本文件路径与 src/router/index.js 中已声明的 component 路径完全一致。
 */
import ProgramForm from '@/components/elementary/ProgramForm.vue'
</script>
