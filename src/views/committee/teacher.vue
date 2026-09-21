<!--
  /committee/teacher —— 中小学教师组报名审核

  【可信度：A】
    dist 证据：chunk-d5f8d9e2 模块 b23d
    父路由：/committee (meta.role = 2 → type=2 组委会)

  【第十二届：路由已摘除，本文件保留】src/router/index.js 中该路由已被注释掉（原因见该文件头），
  因此本页当前不可达；文件本身、组件与逻辑均未改动，日后恢复教师组时把路由行加回即可。

  业务说明（基于 dist 模块 data() 与后端 apps/api/views.py）：
    - group = 2 表示"中小学教师组"
    - 表格列：序号 / 合唱团名称 / 节目名称 / 提交单位 / 联系人 / 联系电话 / 联系地址 / 人员信息 / 状态 / 操作
    - 操作：审核通过 / 驳回（带备注 dialog）/ 查看详情（ShowContent）
    - 顶部筛选：keyword + 审核状态（全部 / 待审核 / 未通过 / 组委会通过）
    - 导出文件名："YYYY年M月D日H时m分报名数据（中小学教师组）"

  本页面只是 TeacherList.vue 的薄封装，传入 group=2 与 groupLabel="中小学教师组"。

  与 teacher1 的唯一区别：group 不同（2 vs 3）、导出文件名后缀不同。
  两份 dist 模块完全一致 —— 组件 name 都是 "elementary"（dist 旧命名）。
-->
<template>
  <TeacherList :group="2" group-label="中小学教师组" />
</template>

<script setup>
import TeacherList from '@/components/committee/TeacherList.vue'
</script>
