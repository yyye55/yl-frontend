<template>
  <ProgramForm variant="/school/teacher/create" />
</template>

<script setup>
/**
 * 节目报名页 —— 路由 /school/teacher/create
 *
 * 【dist 已确认】本页在原生产构建中对应 chunk 模块 4be7（组件名 name:"ElementaryCreate"），
 * 标题为「高校教师组节目报名」。
 *
 * 【为什么本文件这么薄】
 * 这一族的 12 个页面在 dist 里是 12 个独立模块，但逐字节比对后确认它们是**同一份实现**
 * （模板结构、scoped 样式、基础校验规则全部一致），差异只是若干「逐路由常量」。
 * 因此模板实现收敛到唯一组件 @/components/elementary/ProgramForm.vue，
 * 本文件只负责声明自己对应哪个变体。逐路由差异表见该组件头部注释。
 *
 * 【第十二届：路由已摘除，本文件保留】src/router/index.js 中该路由已被注释掉（原因见该文件头），
 * 因此本页当前不可达；文件本身、组件与逻辑均未改动，日后恢复教师组时把路由行加回即可。
 */
import ProgramForm from '@/components/elementary/ProgramForm.vue'
</script>
