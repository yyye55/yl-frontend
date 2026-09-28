<!--
  Committee 报名列表共用组件

  【可信度：A】
    dist 证据：committee 下共 6 条路由基于同一份 dist 模块模板（渲染结构、methods、
    API 调用逐字一致，仅 group / 列集合 / title / 导出文件名后缀不同）：
      - /committee/teacher      → chunk-d5f8d9e2  模块 b23d
      - /committee/teacher1     → chunk-23580f5a  模块 75c1
      - /committee/elementary   → chunk-96fa5cf6  模块 f841
      - /committee/elementary1  → chunk-6e3f572b  模块 260e
      - /committee/elementary2  → chunk-7d7cca8f  模块 6245
      - /committee/elementary3  → chunk-1b3c6962  模块 0e3c

  这 6 条路由在**本仓库**被拆成两个组件承载：
      - TeacherList.vue          → /committee/teacher、/committee/teacher1        （2 页）
      - CommitteeReportList.vue  → /committee/elementary  ~ elementary3          （4 页，即本文件）

  ⚠ 组件拆分是本仓库的实现选择，dist 并无此划分。核对调用方请以
    `grep -rln '<CommitteeReportList' src/` 与 `grep -rln '<TeacherList' src/` 为准。

  各页参数（本仓库传入）：
      elementary   group=0        columns="I"   pageTitle="报名列表"
      elementary1  group="小学组"  columns="II"  pageTitle="小学组报名审核"
      elementary2  group="中学组"  columns="II"  pageTitle="中学组报名审核"
      elementary3  group="大学组"  columns="II"  pageTitle="大学组报名审核"

  6 份 dist 模块共性：
    - 顶部工具栏：keyword input + status select(slot="prepend") + 导出 + 刷新
    - 表格 + 分页（page-sizes=[20,50,100,200]）
    - methods 一致：getData / check / returnBack / exportXlsx / handleSizeChange / handleCurrentChange / refresh
    - 操作列：ShowContent + Remark + 审核通过 / 驳回
    - API 一致：committee.report.{getList,check} + 导出（dist 借 communal.exportGroupData，
      本项目改走组委会专属接口 committeeApi.exportData.data）

  6 份 dist 模块差异：
    - group 值（用于过滤；注意 elementary 传数字 0，其余传字符串）
    - 列集合（I：合唱团 / 节目；II：乐团 / 自选曲目 / 学校 / 领队姓名/电话）
    - 页 title
    - 导出文件名后缀

  后端契约（A）：见 yilinbei/apps/api/views.py
    - GET  /api/committee/report/list   → { code, msg, data, count }
    - PUT  /api/committee/report/check  body { id, status, remark? } → 改 Report.status
    - GET  /api/committee/export/data?group=... → Blob xlsx（组委会整组导出，type=2）
      注：dist 时代这里是 GET /api/export/data。后端为修跨校泄漏给那条接口加了
      user_id 过滤（只能导本人），组委会名下无报名会导出空表，故另开本接口，
      查询范围与 Excel 格式仍与原版 ExportController::exportReportData 一致。

  【注意】group 类型：elementary / teacher / teacher1 用数字 (0/2/3)；
  elementary1 用字符串 "小学组"。后端 Report.group 是 CharField，请求会被 axios 自动 stringify，
  数据库中存的字符串必须精确匹配。本组件不强制类型，原样发送 props.group。

    【本仓库增强，dist 无】（逐项列明，便于回溯与取舍）
    - 接口空响应守卫：`if (!body) { ElMessage.error('响应为空'); return }`（dist 直接 `.then(t => ...)`，无此判断）
    - 错误文案兜底：`body.msg || '...'`（dist 直接用 `t.msg`，为 undefined 时提示为空）
    - 导出按钮 loading：`:loading="exporting"` + 防重复点击（dist 的按钮无 loading 属性）
    - 工具栏新增「乐团名称」「学校名称」两个搜索框，keyword 的 placeholder 由「请输入内容」
      改为按列集合写出的真实列名。依据是后端 report_queryset 新增的 choir_name / school_name
      两个 icontains 参数（yilinbei hou/apps/api/views.py:112-117），以及 keyword 在本页
      同时匹配 name 与 choir_name 这一事实（views.py:752-753）。详见模板里那两段注释。
-->
<template>
  <div class="bg">
    <div class="options">
      <!--
        【本次变更：一个框搜三个字段，placeholder 写全三个列名】
        「请输入内容」等于没说 —— 用户不知道这个框到底搜哪一列。后端 report_queryset
        （yilinbei hou/apps/api/views.py）里 keyword 原先的匹配范围**取决于调用方**：
        本组件走 /api/committee/report/list，落在 `Q(name) | Q(choir_name)` 那一支，
        而市州/学校/中小学端只匹配 name（见 components/elementary/ReportList.vue）——
        同一个框在不同身份的页面上搜的范围不一样，谁也搜不到 school_name。
        本次后端把 keyword 统一扩成「name | choir_name | school_name」，
        三个身份的页面对齐成同一套口径，所以 placeholder 也把三个列名一起写出来。
      -->
      <!--
        【本次变更：搜索框补上三个缺口】
        ① 文字被裁。placeholder 是「请输入曲目/乐团/学校名称」共 13 个字，约 182px；
           而 .options > .el-input 的宽度被样式钉在 220px，扣掉右侧后置按钮（约 40px）
           与输入框内边距（22px）只剩约 158px —— 右半句直接被裁掉。宽度已放宽到 300px。
        ② 放大镜按钮是死的。此前是 `<el-button :icon="Search" />`，没有任何点击事件；
           能搜出结果只是因为「点击会让输入框失焦、顺带触发 @change」，属于蒙对的。
        ③ 不能一键清空。加了 clearable；点「×」是程序赋值，不会触发 change，
           所以必须另外接 @clear。
        @mousedown.prevent 见 ReportList.vue 同处的说明（避免失焦与点击各发一条请求）。
      -->
      <el-input
        v-model="keyword"
        class="input-with-select"
        :placeholder="KEYWORD_PLACEHOLDER"
        clearable
        @change="getData"
        @clear="getData"
      >
        <template #append>
          <el-button :icon="Search" @mousedown.prevent @click="getData" />
        </template>
      </el-input>

      <!--
        【本次变更：两个框收掉了】
        这里原先还有乐团名、学校名两个独立输入框，走的是后端 report_queryset 的
        choir_name / school_name 参数。那两个参数与 keyword 是 **AND** 关系，
        所以它们解决的是「再叠一层筛选」，而不是「一个框搜更多字段」——
        本页的 keyword 当时能命中 name 与 choir_name、唯独搜不到 school_name，
        才需要单摆一个学校名框。
        现在后端已把 keyword 扩成「曲目名 | 乐团名 | 学校名」（见 report_queryset
        里 keyword 那段注释），再用单独的框去叠关键词只会越筛越少，故收回。
      -->

      <!--
        placeholder 写「全部」而不是「审核状态」：
        「全部」这一项的 value 是 null，对 el-select 来说就是空值，它会回头显示 placeholder。
        所以只有把 placeholder 本身写成「全部」，选中「全部」时框里才会出现「全部」两个字。
        这只是显示文案，status 仍然是 null，axios 会丢弃空值参数 —— 也就是「全部」= 不传 status。
      -->
      <el-select v-model="status" placeholder="全部" @change="getData">
        <el-option label="全部" :value="null" />
        <el-option label="待审核" :value="0" />
        <el-option label="未通过" :value="-1" />
        <el-option label="组委会通过" :value="1" />
      </el-select>

      <el-button
        class="menu-button"
        type="primary"
        :loading="exporting"
        @click="exportXlsx"
      >导出数据</el-button>

      <el-button
        class="menu-button"
        type="primary"
        @click="refresh"
      >刷新</el-button>
    </div>

    <div class="content">
      <div class="bg-list">
        <p class="title">{{ pageTitle }}</p>

        <el-table :data="data" border style="width: 100%">
          <el-table-column type="index" prop="date" label="序号" width="60" header-align="center" align="center" />

          <!-- 列集合 I（teacher / elementary）：合唱团 + 节目 + 联系人/电话/地址 -->
          <template v-if="columns === 'I'">
            <el-table-column prop="choir_name" label="合唱团名称" header-align="center" align="center" show-overflow-tooltip />
            <el-table-column prop="name" label="节目名称" header-align="center" align="center" show-overflow-tooltip />
            <el-table-column prop="user.nickname" label="提交单位" header-align="center" align="center" show-overflow-tooltip />
            <el-table-column prop="contact_name" label="联系人" header-align="center" align="center" />
            <el-table-column prop="contact_phone" label="联系电话" header-align="center" align="center" />
            <el-table-column prop="contact_way" label="联系地址" header-align="center" align="center" show-overflow-tooltip />
          </template>

          <!-- 列集合 II（elementary1 / school/elementary）：乐团 + 自选曲目 + 学校 + 领队 -->
          <template v-else>
            <el-table-column prop="choir_name" label="乐团名称" header-align="center" align="center" show-overflow-tooltip />
            <el-table-column prop="name" label="自选曲目" header-align="center" align="center" show-overflow-tooltip />
            <el-table-column prop="user.nickname" label="提交单位" header-align="center" align="center" show-overflow-tooltip />
            <el-table-column prop="school_name" label="参展学校" width="200" header-align="center" align="center" show-overflow-tooltip />
            <el-table-column prop="contact_name" label="领队姓名" header-align="center" align="center" />
            <el-table-column prop="contact_phone" label="领队联系电话" width="150" header-align="center" align="center" />
          </template>

          <el-table-column label="人员信息" width="120" header-align="center" align="center">
            <template #default="{ row }">
              <ShowPerson :data="row.person" />
            </template>
          </el-table-column>

          <el-table-column label="状态" header-align="center" align="center">
            <template #default="{ row }">
              <Status :status="row.status" />
            </template>
          </el-table-column>

          <el-table-column label="操作" width="350" header-align="center" align="center">
            <template #default="{ row }">
              <ShowContent :data="row" />
              <template v-if="row.status < 1">
                <Remark v-if="row.status === -1" :data="row.remark" />
                <el-button @click="check(row.id, 1)">审核通过</el-button>
                <el-button v-if="row.status === 0" @click="returnBack(row.id)">驳回</el-button>
              </template>
              <template v-else-if="row.status === 1">
                <el-button @click="returnBack(row.id)">驳回</el-button>
              </template>
            </template>
          </el-table-column>
        </el-table>

        <el-pagination
          class="my-pagination"
          v-model:current-page="page"
          v-model:page-size="limit"
          :page-sizes="[20, 50, 100, 200]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * CommitteeReportList — 通用审核列表
 *
 * 父组件传入 group / groupLabel / pageTitle / columns 即可。
 *
 * props.group 的类型可以是 number（elementary/teacher/teacher1）或 string（elementary1）；
 * axios 会自动 stringify。后端按字符串匹配 Report.group（CharField）。
 *
 * 列集合 columns：
 *   - 'I'   合唱团 / 节目 / 提交单位 / 联系人 / 联系电话 / 联系地址（teacher / elementary 用）
 *   - 'II'  乐团 / 自选曲目 / 提交单位 / 参展学校 / 领队姓名 / 领队联系电话（elementary1 / school/elementary 用）
 */
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search } from '@element-plus/icons-vue'

import { committeeApi } from '@/api/committee'
import { downloadExcelFile } from '@/utils/excel'

import ShowPerson from '@/components/common/ShowPerson.vue'
import ShowContent from '@/components/common/ShowContent.vue'
import Status from '@/components/common/Status.vue'
import Remark from '@/components/common/Remark.vue'

const props = defineProps({
  /** group 值，传给后端过滤 Report.group */
  group: { type: [Number, String], required: true },
  /** 导出文件名后缀 / 文案 */
  groupLabel: { type: String, required: true },
  /** 页面标题：通常是 groupLabel，也可能是 "小学组报名审核"（dist elementary1 原样） */
  pageTitle: { type: String, required: true },
  /** 列集合：'I' 或 'II' */
  columns: { type: String, default: 'I', validator: v => v === 'I' || v === 'II' }
})

/**
 * 【本次变更】搜索框的 placeholder 文本，按当前列集合（props.columns）取值。
 *
 * 取的就是表格里那两个列的真实表头（见模板的 columns === 'I' 分支）——
 * 框里说的必须和表头一致，否则用户会照着一个页面上的词去另一个页面搜。
 * 本页的 keyword 现在匹配 name / choir_name / school_name 三个字段，故三个列名都写进去。
 */
const KEYWORD_PLACEHOLDER =
  props.columns === 'I' ? '请输入节目/合唱团/学校名称' : '请输入曲目/乐团/学校名称'

const keyword = ref(null)
const status = ref(null)
const page = ref(1)
const limit = ref(20)
const total = ref(0)
const data = ref([])
const exporting = ref(false)

function handleSizeChange(size) {
  page.value = 1
  limit.value = size
  getData()
}

function refresh() {
  getData()
}

function handleCurrentChange(current) {
  page.value = current
  getData()
}

function getData() {
  const params = {
    page: page.value,
    limit: limit.value,
    keyword: keyword.value,
    group: props.group,
    status: status.value
    // 【本次变更】原先这里还带 choir_name / school_name 两个参数（对应上面被收掉的两个框）。
    // 现在 keyword 一个就覆盖三个字段。值为 null 时无需剔除的写法保持不变
    // —— axios 的默认序列化器会丢弃 null/undefined，即「框里没填」= 不传该条件。
  }
  committeeApi.report.getList(params).then((res) => {
    const body = res && res.data
    if (!body) {
      ElMessage.error('响应为空')
      return
    }
    if (body.code === 0) {
      total.value = body.count
      data.value = body.data
    } else {
      ElMessage.error(body.msg || '获取失败')
    }
  }).catch(() => {
    // 拦截器已处理
  })
}

function check(id, statusValue) {
  committeeApi.report.check({ id, status: statusValue }).then((res) => {
    const body = res && res.data
    if (!body) {
      ElMessage.error('响应为空')
      return
    }
    if (body.code === 0) {
      ElMessage.success('审核成功')
      getData()
    } else {
      ElMessage.error(body.msg || '审核失败')
    }
  })
}

function returnBack(id) {
  ElMessageBox.prompt('请输入驳回原因', '驳回', {
    confirmButtonText: '确定',
    cancelButtonText: '取消'
  }).then(({ value }) => {
    committeeApi.report.check({ id, status: -1, remark: value }).then((res) => {
      const body = res && res.data
      if (!body) {
        ElMessage.error('响应为空')
        return
      }
      if (body.code === 0) {
        ElMessage.success('驳回成功')
        getData()
      } else {
        ElMessage.error(body.msg || '驳回失败')
      }
    })
  }).catch(() => {
    ElMessage.info('取消输入')
  })
}

function exportXlsx() {
  if (exporting.value) return
  exporting.value = true
  const now = new Date()
  const ts =
    now.getFullYear() + '年' +
    (now.getMonth() + 1) + '月' +
    now.getDate() + '日' +
    now.getHours() + '时' +
    now.getMinutes() + '分'
  committeeApi.exportData.data({ group: props.group }).then((res) => {
    const blob = res && res.data
    if (!blob) {
      ElMessage.error('响应为空')
      return
    }
    downloadExcelFile(blob, ts + '报名数据（' + props.groupLabel + '）')
  }).catch(() => {
    // 拦截器已处理
  }).finally(() => {
    exporting.value = false
  })
}

onMounted(() => {
  getData()
})
</script>

<style lang="scss" scoped>
/*
 * 全量搬运自 css/chunk-96fa5cf6.d5eec5ed.css（10 条规则，scoped id 51be727d）。
 * 仅去掉 [data-v-51be727d] 属性选择器（由 Vue SFC 编译期生成等价的 scoped 属性）。
 * 声明顺序、属性值均与 dist 逐字一致。
 */
.bg {
  position: relative;
  background: #fff;
  padding: 10px;
  min-height: calc(100% - 20px);
  width: calc(100% - 20px);
}

.options {
  box-shadow: 1px 1px 5px 1px #8c939d;
  padding: 10px 20px 0 20px;
  display: flex;
  justify-content: flex-start;
  flex-wrap: wrap;
  align-items: center;
}

.options > * {
  margin-bottom: 10px;
  margin-right: 10px;
}

/* 【本次变更：220px → 300px】220px 是 dist 的值，当时 placeholder 只有「请输入内容」4 个字；
   现在框里写的是「请输入曲目/乐团/学校名称」13 个字（约 182px），220px 扣掉后置按钮（约 40px）
   与输入框内边距（22px）只剩约 158px，右半句会被裁掉。300px 下留给文字约 238px。
   四个页面（ReportList / 本文件 / TeacherList / admin/report.vue）共用同一个值，要改一起改。 */
.options > .el-input {
  width: 300px !important;
}

/* 状态下拉必须给固定宽度，否则它占满整行、把「导出数据 / 刷新」两个按钮挤到后面几行。
   Element Plus 定义了 --el-select-width:100%，而 .el-select 的 width 就是取这个变量，
   于是下拉一旦成为 flex item，基准宽度就是 .options 的整个内容宽，换行后还会被自身
   margin-right:10px 挤掉 10px。同款写法见上面的 .el-input 规则。 */
.options > .el-select {
  width: 160px !important;
}

.content {
  position: relative;
  background-color: #fff;
  padding: 10px;
  margin-top: 20px;
  box-shadow: 1px 1px 5px 1px #8c939d;
  min-height: calc(100% - 150px);
}

.title {
  position: relative;
  border-bottom: 1px solid #dcdcdc;
  line-height: 30px;
  padding-left: 20px;
  margin-bottom: 10px;
}

.title:before {
  content: "";
  position: absolute;
  left: 0;
  bottom: 5px;
  width: 3px;
  height: 20px;
  background-color: #036;
}

.my-pagination {
  margin-top: 10px;
}

.menu-button {
  width: 100px;
}

.enter-upload {
  margin-top: 20px;
}
</style>
