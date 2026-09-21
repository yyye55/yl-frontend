<!--
  /committee/teacher1 —— 高校教师组报名审核

  【可信度：A】
    dist 证据：chunk-23580f5a 模块 75c1
    父路由：/committee (meta.role = 2 → type=2 组委会)

  【第十二届：路由已摘除，本文件保留】src/router/index.js 中该路由已被注释掉（原因见该文件头），
  因此本页当前不可达；文件本身、组件与逻辑均未改动，日后恢复教师组时把路由行加回即可。

  业务说明：
    - group = 3 表示"高校教师组"
    - 表格列、操作、筛选 与 /committee/teacher 完全相同
    - 唯一差异：group=3、导出文件名后缀为"高校教师组"
    - 两份 dist 模块完全一致（组件 name 都是 "elementary"），共用同一份 UI 实现
-->
<template>
  <TeacherList :group="3" group-label="高校教师组" />
</template>

<script setup>
import TeacherList from '@/components/committee/TeacherList.vue'
</script>
