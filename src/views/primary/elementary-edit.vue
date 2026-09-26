<template>
  <OrchestraForm variant="/primary/elementary/edit/:id" />
</template>

<script setup>
/**
 * 中小学端 · 报名修改页 —— 路由 /primary/elementary/edit/:id
 *
 * 【为什么本文件只有 3 行】
 * 与 elementary-create.vue 同理：实现全在 @/components/elementary/OrchestraForm.vue，
 * 本文件只声明自己对应哪个变体。
 *
 * 【与 create 版的差别（都在 OrchestraForm 的 VARIANTS 里）】
 *   mode 是 'edit' 而不是 'create'：
 *     · 有「暂存」按钮 / 有草稿缓存与定时暂存（create 才有；edit 没有）
 *     · 提交成功后只弹提示、不跳转（create 会跳报名汇总）
 *     · 进页面先按 route.params.id 调 getById 回填
 *   本变体的 getById 与 update 都指向 primary 作用域 -> /api/primary/report/{id} 与 /update。
 *
 * 【编辑页没有 redirect 字段】这是照搬 city 编辑变体的现状，不是漏写。
 *
 * 【:id 从哪来】ReportList 的「编辑」按钮 openWindow(`/primary/elementary/edit/${id}`)
 * 打开本页（该路径写死在 ReportList 的 '/primary/elementary/list' 变体里）。
 * 所以本文件的路由名必须与那里拼出来的路径完全一致，否则点了编辑是 404 页。
 */
import OrchestraForm from '@/components/elementary/OrchestraForm.vue'
</script>
