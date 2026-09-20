<template>
  <OrchestraForm variant="/school/elementary/create" />
</template>

<script setup>
/**
 * 赛事报名页 —— 路由 /school/elementary/create
 *
 * 【dist 已确认】本页在原生产构建中对应 chunk 模块 3d27，组件名 name:"ElementaryCreate"，
 * 作用域样式 id 6517e16c，标题「赛事报名」。
 *
 * 【为什么本文件这么薄】
 * 本页与 /city/elementary/create、/city/elementary/edit/:id、/school/elementary/edit/:id
 * 在 dist 里是 4 个独立模块，但逐字节比对后确认它们是**同一份实现**，差异只是若干
 * 「逐路由常量」。因此模板实现收敛到唯一组件 @/components/elementary/OrchestraForm.vue，
 * 本文件只负责声明自己对应哪个变体。逐路由差异表见该组件头部注释。
 *
 * 【本变体要点】3d27 是 4 个模块里**唯一**给表单带业务默认值的：
 *   form:{read:false, minute:0, second:0, **group:"大学组", establishment:"管乐团"**, dinner_reservation:[]}
 * （5e02 / 30d4 / 0b72 都只有 read/minute/second/dinner_reservation，已逐模块 grep 确认）。
 * 另外「类型」只有 管乐团 一个选项，「参演组别」只有 大学组 一个选项，
 * 「指定曲目」无条件渲染（无 v-if），提交接口走 school 作用域，成功后跳 /school/elementary/list。
 *
 * 【路由未改动】本文件路径与 src/router/index.js 中已声明的 component 路径完全一致。
 */
import OrchestraForm from '@/components/elementary/OrchestraForm.vue'
</script>
