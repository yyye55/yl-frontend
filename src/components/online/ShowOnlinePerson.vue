<template>
  <!-- dist chunk-104e4496 模块 8dc0 中的 "人员信息" 列 scoped slot -->
  <!-- props: { crew, leader } -->
  <el-button type="text" @click="dialogTableVisible = true">查看人员信息</el-button>
  <!-- append-to-body：本组件在 el-table 的「人员信息」列单元格里，不加会被后面的列盖住。
       原因见 ShowPerson.vue 顶部关于 .el-table__cell{z-index:1} 的说明。 -->
  <el-dialog v-model="dialogTableVisible" title="人员信息" append-to-body>
    <!-- 带队教师表 -->
    <div class="show-title">带队教师</div>
    <el-table :data="leaderRows" border size="mini" style="width:100%">
      <el-table-column type="index" label="序号" align="center" header-align="center" />
      <el-table-column prop="name" label="姓名" align="center" header-align="center" />
      <el-table-column prop="card" label="身份证号" align="center" header-align="center" />
      <el-table-column prop="gender" label="性别" align="center" header-align="center" />
      <el-table-column prop="age" label="年龄" align="center" header-align="center" />
      <el-table-column prop="unit" label="所在单位" align="center" header-align="center" />
      <el-table-column prop="phone" label="手机号码" align="center" header-align="center" />
      <el-table-column prop="head" label="头像" align="center" header-align="center">
        <template #default="{ row }">
          <img v-if="row.head" :src="row.head" style="width:59px;height:82px" />
        </template>
      </el-table-column>
    </el-table>

    <!-- 参展人员表 -->
    <div class="show-title">参演人员</div>
    <el-table :data="crewRows" border size="mini" style="width:100%">
      <el-table-column type="index" label="序号" align="center" header-align="center" />
      <el-table-column prop="name" label="姓名" align="center" header-align="center" />
      <el-table-column prop="card" label="身份证号" align="center" header-align="center" />
      <el-table-column prop="age" label="年龄" align="center" header-align="center" />
      <el-table-column prop="gender" label="性别" align="center" header-align="center" />
      <el-table-column prop="school" label="学校或单位名称" align="center" header-align="center" />
      <el-table-column prop="phone" label="手机号码" align="center" header-align="center" />
      <el-table-column prop="head" label="头像" align="center" header-align="center">
        <template #default="{ row }">
          <img v-if="row.head" :src="row.head" style="width:59px;height:82px" />
        </template>
      </el-table-column>
    </el-table>
  </el-dialog>
</template>

<script setup>
/**
 * ShowOnlinePerson 在线展演人员信息弹窗（带队教师 + 参演人员）
 *
 * 【dist 已确认】chunk-104e4496 模块 8dc0 中「人员信息」列的 scoped slot：
 *   ShowOnlinePerson({ crew: e.row.crew, leader: e.row.leader })
 *
 * 数据来源：
 *   row.crew   → 参演人员数组（带队教师已被后端分离到 leader 字段）
 *   row.leader → 带队教师数组
 *
 * 【与 common/ShowPerson.vue 的区别】
 *   - ShowPerson 用于报名系统的人员信息：person_info 子对象、position===4→指导教师
 *   - ShowOnlinePerson 用于在线展演：直接字段名、无子对象、不区分 position
 */
import { ref, computed } from 'vue'

const props = defineProps({
  crew: { type: Array, default: () => [] },
  leader: { type: Array, default: () => [] }
})

const dialogTableVisible = ref(false)

const leaderRows = computed(() => props.leader || [])
const crewRows = computed(() => props.crew || [])
</script>

<style lang="scss" scoped>
.show-title {
  font-size: 16px;
  font-weight: 700;
  margin-top: 10px;
  margin-bottom: 10px;
}
</style>
