<!--
  Committee 报名列表共用组件

  【可信度：A】
    dist 证据：以下 4 条路由都基于同一份 dist 模块模板（group/列集合/title 略有不同）：
      - /committee/teacher      → chunk-d5f8d9e2   模块 b23d   group=2     columns=I  title="报名列表"
      - /committee/teacher1     → chunk-23580f5a   模块 75c1   group=3     columns=I  title="报名列表"
      - /committee/elementary   → chunk-96fa5cf6   模块 f841   group=0     columns=I  title="报名列表"
      - /committee/elementary1  → chunk-6e3f572b   模块 260e   group="小学组" columns=II title="小学组报名审核"

  4 份 dist 模块共性：
    - 顶部工具栏：keyword input + status select(0 待审核/-1 未通过/1 组委会通过) + 导出 + 刷新
    - 表格 + 分页（page-sizes=[20,50,100,200]）
    - methods 完全一致：getData / check / returnBack / exportXlsx / handleSizeChange / handleCurrentChange / refresh
    - 操作列：ShowContent + Remark + 审核通过 / 驳回
    - API 完全一致：committee.report.{getList,check} + communal.exportGroupData（→ exportApi.exportGroupData）

  4 份 dist 模块差异：
    - group 值（用于过滤）
    - 列集合（I：合唱团 / 节目；II：乐团 / 自选曲目 / 学校 / 领队姓名/电话）
    - 页 title
    - 导出文件名后缀

  本组件通过 props 控制全部差异。teacher / teacher1 / elementary / elementary1 4 页共用。

  后端契约（A）：见 yilinbei/apps/api/views.py
    - GET  /api/committee/report/list   → { code, msg, data, count }
    - PUT  /api/committee/report/check  body { id, status, remark? } → 改 Report.status
    - GET  /api/export/data?group=...   → Blob xlsx

  【注意】group 类型：elementary / teacher / teacher1 用数字 (0/2/3)；
  elementary1 用字符串 "小学组"。后端 Report.group 是 CharField，请求会被 axios 自动 stringify，
  数据库中存的字符串必须精确匹配。本组件不强制类型，原样发送 props.group。
-->
<template>
  <div class="bg">
    <div class="options">
      <el-input
        v-model="keyword"
        class="input-with-select"
        placeholder="请输入内容"
        size="mini"
        @change="getData"
      >
        <template #append>
          <el-button :icon="Search" />
        </template>
      </el-input>

      <el-select v-model="status" placeholder="审核状态" size="mini" @change="getData">
        <el-option label="全部" :value="null" />
        <el-option label="待审核" :value="0" />
        <el-option label="未通过" :value="-1" />
        <el-option label="组委会通过" :value="1" />
      </el-select>

      <el-button
        class="menu-button"
        type="primary"
        size="mini"
        :loading="exporting"
        @click="exportXlsx"
      >导出数据</el-button>

      <el-button
        class="menu-button"
        type="primary"
        size="mini"
        @click="refresh"
      >刷新</el-button>
    </div>

    <div class="content">
      <div class="bg-list">
        <p class="title">{{ pageTitle }}</p>

        <el-table :data="data" border size="mini" style="width: 100%">
          <el-table-column type="index" prop="date" label="序号" header-align="center" align="center" />

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
            <el-table-column prop="school_name" label="参展学校" header-align="center" align="center" show-overflow-tooltip />
            <el-table-column prop="contact_name" label="领队姓名" header-align="center" align="center" />
            <el-table-column prop="contact_phone" label="领队联系电话" header-align="center" align="center" />
          </template>

          <el-table-column label="人员信息" header-align="center" align="center">
            <template #default="{ row }">
              <ShowPerson :data="row.person" />
            </template>
          </el-table-column>

          <el-table-column label="状态" header-align="center" align="center">
            <template #default="{ row }">
              <Status :status="row.status" />
            </template>
          </el-table-column>

          <el-table-column label="操作" :width="500" header-align="center" align="center">
            <template #default="{ row }">
              <ShowContent :data="row" />
              <template v-if="row.status < 1">
                <Remark v-if="row.status === -1" :data="row.remark" />
                <el-button size="mini" @click="check(row.id, 1)">审核通过</el-button>
                <el-button v-if="row.status === 0" size="mini" @click="returnBack(row.id)">驳回</el-button>
              </template>
              <template v-else-if="row.status === 1">
                <el-button size="mini" @click="returnBack(row.id)">驳回</el-button>
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
import { exportApi } from '@/api/live'
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
  exportApi.exportGroupData({ group: props.group }).then((res) => {
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
 * 【CSS 证据等级：B】
 * dist CSS 文件未发现本页面专属样式。沿用 ReportList.vue 的局部样式保持视觉一致。
 */
.bg {
  padding: 10px;
  position: relative;
}

.options {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 10px;

  > * {
    width: 220px !important;
  }
  > .el-button {
    width: auto !important;
  }
}

.content {
  display: flex;
  flex-direction: column;
}

.title {
  font-size: 16px;
  font-weight: 600;
  margin: 10px 0;
  position: relative;
  padding-left: 12px;

  &::before {
    content: "";
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 4px;
    height: 16px;
    background-color: #036;
    border-radius: 2px;
  }
}

.my-pagination {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
