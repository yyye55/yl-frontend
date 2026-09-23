<template>
  <div>
    <el-button type="text" @click="dealWith">查看人员信息</el-button>
    <!--
      append-to-body —— 必须加，否则弹窗会被后面的列盖住。
      本组件渲染在 el-table 的单元格里，而 Element Plus 给 .el-table__cell 加了
      `position: relative; z-index: 1`，**每个 td 因此自成层叠上下文**。
      弹窗不 teleport 出去的话，el-overlay 的 z-index:2005 只能在所在 td 内部比拼；
      而状态列/操作列那些 td 同为 z=1、在 DOM 里又更靠后，于是「待审核」「查看详情」
      「编辑」「删除」整条盖在弹窗上面 —— 用户看到的就是「外面的白框出现在了里面，
      还可以看到待审核三个字」。
      实测（__debug__/probe-stack.cjs）：遮罩矩形本身是 0,0 1440x900、满视口，
      位置没问题，坏的只是层叠顺序。
    -->
    <el-dialog v-model="dialogTableVisible" title="人员信息" append-to-body>
      <div class="show-title">指导教师</div>
      <el-table :data="teacher" border style="width:100%">
        <el-table-column type="index" label="序号" width="60" align="center" header-align="center" />
        <el-table-column prop="person_info.name" label="姓名" width="100" align="center" header-align="center" />
        <el-table-column prop="person_info.card" label="身份证号" width="200" align="center" header-align="center" />
        <el-table-column prop="person_info.gender" label="性别" align="center" header-align="center" />
        <el-table-column prop="person_info.age" label="年龄" align="center" header-align="center" />
        <el-table-column prop="person_info.school" label="学校名称" width="200" align="center" header-align="center" />
        <el-table-column prop="person_info.phone" label="联系电话" width="150" align="center" header-align="center" />
      </el-table>

      <div class="show-title">参演人员</div>
      <el-table :data="person" border style="width:100%">
        <el-table-column type="index" label="序号" width="60" align="center" header-align="center" />
        <el-table-column prop="person_info.name" label="姓名" width="100" align="center" header-align="center" />
        <el-table-column prop="person_info.card" label="身份证号" width="200" align="center" header-align="center" />
        <el-table-column prop="person_info.gender" label="性别" align="center" header-align="center" />
        <el-table-column prop="person_info.age" label="年龄" align="center" header-align="center" />
        <el-table-column prop="person_info.school" label="学校名称" width="200" align="center" header-align="center" />
        <el-table-column prop="person_info.phone" label="联系电话" width="150" align="center" header-align="center" />
        <el-table-column label="身份" align="center" header-align="center">
          <template #default="{ row }">
            <span v-if="row.type === 0">学生</span>
            <span v-else-if="row.type === 1">教师</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="角色" width="100" align="center" header-align="center">
          <template #default="{ row }">
            <span v-if="row.position === 0">正式队员</span>
            <span v-else-if="row.position === 1">预备队员</span>
            <span v-else-if="row.position === 2">指挥</span>
            <span v-else-if="row.position === 3">伴奏</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="person_info.instrument" label="使用乐器" width="150" align="center" header-align="center" />
        <el-table-column prop="person_info.head" label="头像" width="100" align="center" header-align="center">
          <template #default="{ row }">
            <img :src="row.person_info.head" style="width:59px;height:82px" />
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup>
/**
 * ShowPerson 报名人员信息弹窗（指导教师 / 参演人员两张表）
 *
 * 【可信度：A】逐行照搬 dist chunk-335604d9 的模块 064f（报名列表页的「人员信息」列共用）。
 * 原文组件选项：
 *
 *   name:"ShowPerson",
 *   props:{ data:{ default:[] } },
 *   mounted(){},
 *   data(){ return { dialogTableVisible:!1, teacher:[], person:[] } },
 *   methods:{
 *     dealWith(){
 *       this.dialogTableVisible = !0,
 *       this.data.length > 0 || (this.data = [this.data]),   // 规范化成数组
 *       this.person = [], this.teacher = []
 *       for (let e = 0; e < this.data.length; e++)
 *         4 === this.data[e].position ? this.teacher.push(this.data[e]) : this.person.push(this.data[e])
 *     }
 *   }
 *
 * 【取值依据（关键）】
 *   身份 row.type     ：0 学生 / 1 教师 / 其他 -
 *   角色 row.position ：0 正式队员 / 1 预备队员 / 2 指挥 / 3 伴奏 / 其他 -
 *                       （position === 4 不参与「角色」列，而是被拆到上方「指导教师」表）
 *   —— 与后端 ReportPerson 模型一致（apps/core/models.py: `position`、`type` 均为 IntegerField）。
 *   子字段 person_info.* 来自 report_dict 的
 *   `item["person_info"] = model_dict(Person.objects.filter(pk=link.person_id).first())`，
 *   Person 模型确有 name / card / gender / age / school / phone / instrument / head 字段。
 *
 * 【与 dist 的差异（两处，均为适配 Vue 3 或修正明显笔误）】
 *  1. 列属性用 `prop` 而非 dist 原文的 `property`。
 *     dist 是 Element UI 2.x 写法；`property` 在 Element Plus 中已是废弃别名，
 *     统一改用现行的 `prop`，渲染结果完全一致。
 *  2. dealWith 不再改写 props.data。
 *     原文 `this.data.length>0 || (this.data=[this.data])` 与 `this.person=[]` 都是直接改 prop。
 *     Vue 3 允许修改「传入对象自身的属性」，但这里改为用局部 ref 计算，
 *     结果数组与原版逐项相同，且不再产生对父组件的隐式副作用。
 *     规范化逻辑保持一致：数组且非空 -> 原样；否则（含空数组、非数组）-> 包成单元素数组。
 *
 * 【mounted 空钩子未迁移】原文 mounted(){} 为空实现。
 */
import { ref } from 'vue'

const props = defineProps({
  data: { default: () => [] }
})

const dialogTableVisible = ref(false)
const teacher = ref([])
const person = ref([])

function dealWith() {
  dialogTableVisible.value = true

  const raw = props.data
  // 等价于 dist 的 `this.data.length > 0 || (this.data = [this.data])`
  const list = Array.isArray(raw) && raw.length > 0 ? raw : [raw]

  teacher.value = []
  person.value = []
  for (let i = 0; i < list.length; i++) {
    if (list[i] && list[i].position === 4) teacher.value.push(list[i])
    else person.value.push(list[i])
  }
}
</script>

<style lang="scss" scoped>
/* dist/css/chunk-335604d9.9c29b119.css 中 [data-v-76a13883] */
.show-title {
  font-size: 16px;
  font-weight: 700;
  margin-top: 10px;
  margin-bottom: 10px;
}
</style>
