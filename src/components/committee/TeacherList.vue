<!--
  Committee Teacher 列表（共用组件：teacher=group=2 教师组 / teacher1=group=3 高校教师组）

  【可信度：A】
    dist 证据：
      - /committee/teacher      → chunk-d5f8d9e2 模块 b23d
      - /committee/teacher1     → chunk-23580f5a 模块 75c1

  两份 dist 模块**完全相同**，唯一区别：
    - data().group: b23d=2 / 75c1=3
    - export 文件名后缀：b23d="报名数据（中小学教师组）" / 75c1="报名数据（高校教师组）"

  render / data / methods 字段全部一致。组件 name 都叫 "elementary"（dist 旧命名）。

  后端契约（A）：见 yilinbei/apps/api/views.py committee_report_list / committee_report_check
  - GET  /api/committee/report/list   → { code, msg, data, count }
  - PUT  /api/committee/report/check  body { id, status, remark? } → 改 Report.status
  - GET  /api/export/data?group=2|3   → Blob xlsx (committee 任意登录均可)
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
/**
 * Committee Teacher 列表（teacher / teacher1 共用）
 *
 * 父组件传入 group（数字 2 或 3），决定调用 committeeApi.report.getList 时过滤的组别，
 * 以及导出文件名后缀。
 *
 * group 字段：
 *   - 2: 中小学教师组  (dist 模块 b23d，路由 /committee/teacher)
 *   - 3: 高校教师组    (dist 模块 75c1，路由 /committee/teacher1)
 *
 * 模板与逻辑完全一致；group 是父组件传的唯一 prop 差异。
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
  group: { type: Number, required: true },  // 2 或 3
  groupLabel: { type: String, required: true }  // '中小学教师组' 或 '高校教师组'
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

/**
 * 【dist 证据】A：getData()
 *   getData(){
 *     const e={page:this.page, limit:this.limit, keyword:this.keyword, group:this.group, status:this.status};
 *     this.$api.committee.report.getList(e).then(({data:e})=>{
 *       0===e.code?(this.total=e.count,this.data=e.data):ElMessage.error(e.msg)
 *     })
 *   }
 *
 * 响应是扁平的 {data, count, code, msg}（见 yilinbei/apps/core/services.py:20 page_response）。
 * 注意：axios 拦截器透传完整 body，业务层拿到的是 res.data 是整个 body，不是 axios 默认的 { data: body }。
 */
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
    // axios 拦截器已处理 4xx/5xx；此处不重复提示
  })
}

/**
 * 【dist 证据】A：check(id, status)
 *   check(e, t){
 *     const n={id:e, status:t};
 *     this.$api.committee.report.check(n).then(({data:e})=>{
 *       0===e.code?(ElMessage.success("审核成功"), this.getData()):ElMessage.error(e.msg)
 *     })
 *   }
 */
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

/**
 * 【dist 证据】A：returnBack(id)
 *   ElMessageBox.prompt("请输入驳回原因","驳回",{confirmButtonText:"确定",cancelButtonText:"取消"})
 *     .then(({value})=>{
 *       const payload={id, status:-1, remark:value};
 *       this.$api.committee.report.check(payload).then(({data:e})=>{
 *         0===e.code?(ElMessage.success("驳回成功"), this.getData()):ElMessage.error(e.msg)
 *       })
 *     })
 *     .catch(()=>{ ElMessage({type:"info", message:"取消输入"}) })
 *
 * Vue3 中 ElMessageBox.prompt({type:"info"}) 需要 ElMessage.info()，不是直接传对象。
 */
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

/**
 * 【dist 证据】A：exportXlsx()
 *   exportXlsx(){
 *     const e="报名数据（中小学教师组）";   // teacher1 时为 "报名数据（高校教师组）"
 *     const t=new Date();
 *     const n=t.getFullYear()+"年"+(t.getMonth()+1)+"月"+t.getDate()+"日"+t.getHours()+"时"+t.getMinutes()+"分";
 *     this.$api.communal.exportGroupData({group:this.group}).then(t=>{
 *       this.downloadExcelFile(t.data, n+e)
 *     })
 *   }
 *
 * 后端契约：A → GET /api/export/data?group=2|3 (Blob xlsx)
 * 见 yilinbei/apps/api/views.py export_data
 */
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
 * dist CSS 文件未发现本页面专属样式（已 grep 全部 chunk-*.css）。
 * 这里的 .bg / .options / .content / .title / .my-pagination 是项目内统一的页面容器
 * 样式，沿用 src/components/elementary/ReportList.vue 的局部写法以保持视觉一致。
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
