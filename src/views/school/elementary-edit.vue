<template>
  <OrchestraForm variant="/school/elementary/edit/:id" />
</template>

<script setup>
/**
 * 报名修改页 —— 路由 /school/elementary/edit/:id
 *
 * 【dist 已确认】本页在原生产构建中对应 chunk 模块 0b72，组件名 name:"ElementaryEdit"，
 * 作用域样式 id a05320c6，标题「报名修改」。
 *
 * 【为什么本文件这么薄】
 * 本页与 /city/elementary/create、/school/elementary/create、/city/elementary/edit/:id
 * 在 dist 里是 4 个独立模块，但逐字节比对后确认它们是**同一份实现**，差异只是若干
 * 「逐路由常量」。因此模板实现收敛到唯一组件 @/components/elementary/OrchestraForm.vue，
 * 本文件只负责声明自己对应哪个变体。逐路由差异表见该组件头部注释。
 *
 * 【本变体要点】「类型」只有 管乐团 一个选项，「参演组别」只有 大学组 一个选项，
 * 「指定曲目」无条件渲染（无 v-if），getById/update 都走 school 作用域，
 * 编辑页无 暂存 按钮、无草稿缓存、提交成功后只弹提示不跳转。
 *
 * 【路由未改动】本文件路径与 src/router/index.js 中已声明的 component 路径完全一致。
 */
import OrchestraForm from '@/components/elementary/OrchestraForm.vue'
</script>
