<template>
  <div class="container">
    <div v-if="success" class="container-text">
      <p class="title">报送数量</p>
      <p>中小学组：{{ success.elementary }}</p>
      <p>大学组：{{ success.colleges }}</p>
      <p>中小学教师组：{{ success.teacher }}</p>
      <p>高校教师组：{{ success.teacher1 }}</p>

      <p class="title">报送名额</p>
      <p>
        单位指标数为8个，指标数包括中小学生组、中小学教师组、大学生组、高校教师组，报送指标由各地省级教育主管部门统筹安排，可根据实际情况适当调整。
      </p>

      <div class="export-demo" style="padding: 5px 0 20px 0">
        <el-button type="primary" size="mini" @click="exportReport('节目报送表')">
          导出节目报送表
        </el-button>
        <el-button type="primary" size="mini" @click="exportReportPerson('参演人员信息采集表')">
          导出节目参演人员信息采集表
        </el-button>
        <el-button type="primary" size="mini" @click="dialogRef.open()">
          报送表及人员信息采集表盖章扫描件上传
        </el-button>
      </div>
    </div>

    <el-table :data="data" size="mini" style="width:100%">
      <el-table-column header-align="center" align="center" prop="name" label="类型" width="180" />
      <el-table-column header-align="center" align="center" prop="total" label="合计" />
      <el-table-column header-align="center" align="center" prop="data1" label="驳回" />
      <el-table-column header-align="center" align="center" prop="data2" label="待审核" />
      <el-table-column header-align="center" align="center" prop="data3" label="组委会通过" />
    </el-table>

    <UploadScanDialog
      ref="dialogRef"
      v-model="dialogImageVisible"
      :limit="2"
      tip="请按顺序（报送表、人员信息采集表）上传加盖公章的扫描文件，格式为PDF，单个文件大小不超过20M"
    />
  </div>
</template>

<script setup>
/**
 * 省级首页（路由 /province/index），组件名 "index"，作用域 525d87bf
 *
 * 【可信度：A】照搬 dist 模块 bec3（chunk-6934918b）。原文渲染函数可用 `node scripts/dist-map.mjs --dump bec3` 复现。
 * 三个地区首页（city 044d / school 5d2b / province bec3）同源，差异对照表见 src/views/city/index.vue。
 * 本页（province）相对于 city / school 多出：
 *
 *   1. container-text 里在按钮之前多两段静态文本：
 *        p.title「 报送数量 」+ 四行 success 计数（中小学组 / 大学组 / 中小学教师组 / 高校教师组）
 *        p.title「 报送名额 」+ 一段固定说明（"单位指标数为8个，……"）
 *      注意 dist 原文用的是 `_v(" 报送数量 ")`、`_v(" 单位指标数为8个，…")`，文案两侧带空格，
 *      模板中已原样保留。
 *   2. 三个导出按钮（city / school 只有两个）：多出「导出节目参演人员信息采集表」，
 *      调用 exportReportPerson —— 该方法在 city / school 两个模块里虽然也定义了，
 *      但模板中没有任何按钮引用它，属不可达代码；只有 province 真正绑定了。
 *   3. 上传弹窗的提示文案是「请按顺序（报送表、人员信息采集表）上传…」（city / school 无此句）。
 *   4. 确认框正文用「节目」而非「数据」：
 *      "此操作需在所在单位账号所有节目都已报送完毕后操作, 确认操作?"（city / school 为「数据」）
 *   5. 接口模块为 province.index，作用域 id 525d87bf。
 *
 * data / mounted / 其余 methods 与 city、school 逐字节相同。
 *
 * 【保留 dist 的事实，不擅自"修好"】success 初值是空数组 []（truthy，v-if 恒真）。
 * 因此首屏在接口返回前会渲染出「中小学组：」等四行空值 —— 这是 dist 的原始表现，
 * 接口返回后立即被真实数字覆盖（`[].elementary` 为 undefined，_s(undefined) 输出空串，不会报错）。
 *
 * 接口：
 *   GET /api/province/index/total（views.py:683 → scoped_total(request,4,"province")）
 *     返回 {"success":{"elementary":…,"colleges":…,"teacher":…,"teacher1":…},
 *           "limit":{"elementary":1,"colleges":1,"teacher":1,"teacher1":1},
 *           "data":[{"name":"中小学组节目统计"|"大学组节目统计"|"中小学教师组节目统计"|"高校教师组节目统计",
 *                    "total":…,"data1":…,"data2":…,"data3":…}]}   —— 四行
 *   GET /api/export/report  → exportApi.exportReportData()     （dist: $api.communal.exportReportData）
 *   GET /api/export/person  → exportApi.exportReportPersonData()（dist: $api.communal.exportReportPersonData）
 *
 * 【本页旧实现的问题（已重写）】旧版为 el-empty「页面开发中」占位。
 */
import { ref, onMounted } from 'vue'
import { ElMessageBox } from 'element-plus'
import { provinceApi } from '@/api'
import { exportApi } from '@/api/live'
import { downloadPdfFile } from '@/utils/excel'
import UploadScanDialog from '@/components/common/UploadScanDialog.vue'

const data = ref([])
const limit = ref([])
// dist 初值即空数组（truthy），故 v-if="success" 恒真；详见文件头说明
const success = ref([])
const tableData = ref([])
const pass = ref(true)
const dialogImageVisible = ref(false)
const dialogRef = ref(null)

/** dist: getTotal(){ $api.province.index.getIndexTotal().then(({data:e})=>{ 0===e.code && (this.data=e.data.data,this.success=e.data.success,this.limit=e.data.limit) }) } */
function getTotal() {
  provinceApi.index.getIndexTotal().then(({ data: res }) => {
    if (res.code === 0) {
      data.value = res.data.data
      success.value = res.data.success
      limit.value = res.data.limit
    }
  })
}

/** dist: exportReport(e){ MessageBox.confirm("此操作需在所在单位账号所有节目都已报送完毕后操作, 确认操作?","提示",{…}).then(()=>{ $api.communal.exportReportData().then(t=>{ this.downloadPdfFile(t.data,e) }) }).catch(()=>{}) } */
function exportReport(name) {
  ElMessageBox.confirm('此操作需在所在单位账号所有节目都已报送完毕后操作, 确认操作?', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  })
    .then(() => {
      exportApi.exportReportData().then((res) => {
        downloadPdfFile(res.data, name)
      })
    })
    .catch(() => {})
}

/** dist: exportReportPerson(e){ 同上，改调 $api.communal.exportReportPersonData() } */
function exportReportPerson(name) {
  ElMessageBox.confirm('此操作需在所在单位账号所有节目都已报送完毕后操作, 确认操作?', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  })
    .then(() => {
      exportApi.exportReportPersonData().then((res) => {
        downloadPdfFile(res.data, name)
      })
    })
    .catch(() => {})
}

onMounted(getTotal)
</script>

<style lang="scss" scoped>
.container {
  display: flex;
  justify-content: flex-start;
  flex-direction: column;
  flex-wrap: wrap;
}

.container-text {
  background-color: #fff;
  margin-bottom: 20px;
  padding: 10px;
  line-height: 30px;
}

.full {
  color: red;
}

.title {
  padding: 20px 0;
  font-weight: 700;
  font-size: 16px;
}

.ptable {
  width: 100%;
  text-align: center;
}
</style>
