<!--
  /committee/colleges —— 大学组报名审核

  【可信度：A】
    dist 证据：chunk-2280a150 模块 714f
    父路由：/committee (meta.role = 2 → type=2 组委会)

  业务说明（基于 dist data()）：
    - group = 1（数字），导出文件名"报名数据（大学组）"
    - 列集合 I：序号 / 合唱团名称 / 节目名称 / 提交单位 / 联系人 / 联系电话 / 联系地址
      / 人员信息(ShowPerson) / 状态(Status) / 操作
    - 操作：审核通过 / 驳回（remark dialog）/ 查看（ShowContent）

  【注意】group=1（数字）与 elementary3 的 group="大学组"（字符串）不同！
    - colleges: group=1 (数字 1) → axios 转 "1" → 后端 filter(group="1")
    - elementary3: group="大学组" (字符串) → 后端 filter(group="大学组")
    - 两者都叫"大学组"，但底层 Report.group 字段值不同（数字1 vs 字符串"大学组"）
    - 这是原系统的真实数据形态：[CONFLICT·CONFIRMED]

  【colleges vs elementary3 对比】
    - 模板完全相同（同一个 chunk 模板），区别仅为 group 值
    - 列集合 I（无 school_name）vs 列集合 II（有 school_name）
    - 这与 elementary/elementary1 的关系类似（group 类型+列集合的组合差异）

  API：committee.report.getList({page,limit,keyword,group:1,status}) → /api/committee/report/list
        committee.report.check({id,status,remark?}) → /api/committee/report/check
        exportApi.exportGroupData({group:1}) → /api/export/data?group=1

    【本仓库增强，dist 无】（逐项列明，便于回溯与取舍）
    - 接口空响应守卫：`if (!body) { ElMessage.error('响应为空'); return }`（dist 直接 `.then(t => ...)`，无此判断）
    - 错误文案兜底：`body.msg || '...'`（dist 直接用 `t.msg`，为 undefined 时提示为空）
    - 导出按钮 loading：`:loading="exporting"` + 防重复点击（dist 的按钮无 loading 属性）
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

      <el-button class="menu-button" type="primary" size="mini" :loading="exporting" @click="exportXlsx">
        导出数据
      </el-button>

      <el-button class="menu-button" type="primary" size="mini" @click="refresh">
        刷新
      </el-button>
    </div>

    <div class="content">
      <div class="bg-list">
        <p class="title">报名列表</p>

        <el-table :data="data" border size="mini" style="width: 100%">
          <el-table-column type="index" prop="date" label="序号" header-align="center" align="center" />
          <el-table-column prop="choir_name" label="合唱团名称" header-align="center" align="center" show-overflow-tooltip />
          <el-table-column prop="name" label="节目名称" header-align="center" align="center" show-overflow-tooltip />
          <el-table-column prop="user.nickname" label="提交单位" header-align="center" align="center" show-overflow-tooltip />
          <el-table-column prop="contact_name" label="联系人" header-align="center" align="center" />
          <el-table-column prop="contact_phone" label="联系电话" header-align="center" align="center" />
          <el-table-column prop="contact_way" label="联系地址" header-align="center" align="center" show-overflow-tooltip />
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

const keyword = ref(null)
const status = ref(null)
const page = ref(1)
const limit = ref(20)
const total = ref(0)
const data = ref([])
const exporting = ref(false)

function handleSizeChange(size) {
  page.value = 1; limit.value = size; getData()
}
function refresh() { getData() }
function handleCurrentChange(current) { page.value = current; getData() }

function getData() {
  committeeApi.report.getList({
    page: page.value, limit: limit.value,
    keyword: keyword.value, group: 1, status: status.value
  }).then((res) => {
    const body = res?.data
    if (!body) { ElMessage.error('响应为空'); return }
    if (body.code === 0) { total.value = body.count; data.value = body.data }
    else ElMessage.error(body.msg || '获取失败')
  })
}

function check(id, statusVal) {
  committeeApi.report.check({ id, status: statusVal }).then((res) => {
    const body = res?.data
    if (!body) { ElMessage.error('响应为空'); return }
    if (body.code === 0) { ElMessage.success('审核成功'); getData() }
    else ElMessage.error(body.msg || '审核失败')
  })
}

function returnBack(id) {
  ElMessageBox.prompt('请输入驳回原因', '驳回', {
    confirmButtonText: '确定', cancelButtonText: '取消'
  }).then(({ value }) => {
    committeeApi.report.check({ id, status: -1, remark: value }).then((res) => {
      const body = res?.data
      if (!body) { ElMessage.error('响应为空'); return }
      if (body.code === 0) { ElMessage.success('驳回成功'); getData() }
      else ElMessage.error(body.msg || '驳回失败')
    })
  }).catch(() => { ElMessage.info('取消输入') })
}

function exportXlsx() {
  if (exporting.value) return
  exporting.value = true
  const now = new Date()
  const ts = now.getFullYear() + '年' + (now.getMonth() + 1) + '月' + now.getDate() + '日' + now.getHours() + '时' + now.getMinutes() + '分'
  exportApi.exportGroupData({ group: 1 }).then((res) => {
    const blob = res?.data
    if (!blob) { ElMessage.error('响应为空'); return }
    downloadExcelFile(blob, ts + '报名数据（大学组）')
  }).finally(() => { exporting.value = false })
}

onMounted(() => { getData() })
</script>

<style lang="scss" scoped>
/*
 * 全量搬运自 css/chunk-2280a150.64bebd19.css（10 条规则，scoped id 76fa03ee）。
 * 仅去掉 [data-v-76fa03ee] 属性选择器（由 Vue SFC 编译期生成等价的 scoped 属性）。
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

.options > .el-input {
  width: 220px !important;
}

.content {
  position: relative;
  background-color: #fff;
  padding: 10px;
  margin-top: 20px;
  box-shadow: 1px 1px 5px 1px #8c939d;
  min-height: calc(100% - 150px);
  width: calc(100% - 20px);
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
