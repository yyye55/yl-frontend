<template>
  <div class="container">
    <div v-if="success" class="container-text">
      <div class="export-demo" style="padding: 5px 0 20px 0">
        <el-button type="primary" size="mini" @click="exportReport('报名信息表导出')">
          报名信息表导出
        </el-button>
        <el-button type="primary" size="mini" @click="dialogRef.open()">
          报名信息表表盖章扫描件上传
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
      tip="上传加盖公章的扫描文件，格式为PDF，单个文件大小不超过20M"
    />
  </div>
</template>

<script setup>
/**
 * 校级首页（路由 /school/index），组件名 "index"，作用域 89781142
 *
 * 【可信度：A】照搬 dist 模块 5d2b（chunk-33943255）。原文渲染函数可用 `node scripts/dist-map.mjs --dump 5d2b` 复现。
 * 与 /city/index（044d）、/province/index（bec3）同源，差异对照表见 src/views/city/index.vue 的文件头。
 * 本页（school）相对于 city 的区别只有三处：
 *   1. 导出按钮**没有** :disabled="!pass" 绑定；
 *   2. el-upload 的 limit 是 2（city 为 1）；
 *   3. exportReport 传入的文件名是 "报名信息表导出"（city 为 "报名信息表"）。
 * 接口模块为 school.index，作用域 id 89781142。
 *
 * data(){ return { data:[], limit:[], success:[], tableData:[], pass:!0,
 *   dialogImageVisible:!1, dialogImageUrl:"", dialogVisible:!1, fileList:[], filename:"",
 *   QiniuData:{token:"",key:"ylbxt/"}, domain:"https://upload.qiniup.com", host:"https://img.atyth.com/" } }
 * mounted(){ this.getTotal() }
 *
 * 【保留 dist 的事实，不擅自"修好"】success 初值仍是空数组 []（truthy，故 v-if 恒真）；
 * pass 字段保留但恒为 true —— getPercent() 在 dist 的 mounted 中未被调用，全模板也无引用，
 * 属不可达代码，故不移植（该页模板也确实没有用到 pass）。
 *
 * 接口：GET /api/school/index/total（yilinbei/apps/api/views.py:673 → scoped_total(request,0,"school")）
 *   返回 success("获取成功！", {"success":{"colleges":0,"teacher":0,"colleges1":0},
 *                              "data":[{"name":"大学组","total":…,"data1":…,"data2":…,"data3":…}]})
 *   只有一行（大学组），字段为扁平的 total/data1/data2/data3，与 admin/committee 的 data:[…] 结构不同。
 *
 * 样式同 city（.container / .container-text / .full / .title / .ptable）。
 *
 * 【本页旧实现的问题（已重写）】旧版为 el-empty「页面开发中」占位。
 */
import { ref, onMounted } from 'vue'
import { ElMessageBox } from 'element-plus'
import { schoolApi } from '@/api'
import { exportApi } from '@/api/live'
import { downloadPdfFile } from '@/utils/excel'
import UploadScanDialog from '@/components/common/UploadScanDialog.vue'

const data = ref([])
const limit = ref([])
// dist 初值即空数组（truthy），故 v-if="success" 恒真；详见 city/index.vue 文件头说明
const success = ref([])
const tableData = ref([])
const pass = ref(true)
const dialogImageVisible = ref(false)
const dialogRef = ref(null)

/** dist: getTotal(){ $api.school.index.getIndexTotal().then(({data:e})=>{ 0===e.code && (this.data=e.data.data,this.success=e.data.success,this.limit=e.data.limit) }) } */
function getTotal() {
  schoolApi.index.getIndexTotal().then(({ data: res }) => {
    if (res.code === 0) {
      data.value = res.data.data
      success.value = res.data.success
      limit.value = res.data.limit
    }
  })
}

/** dist: exportReport(e){ MessageBox.confirm("此操作需在所在单位账号所有数据都已报送完毕后操作, 确认操作?","提示",{…}).then(()=>{ $api.communal.exportReportData().then(t=>{ this.downloadPdfFile(t.data,e) }) }).catch(()=>{}) } */
function exportReport(name) {
  ElMessageBox.confirm('此操作需在所在单位账号所有数据都已报送完毕后操作, 确认操作?', '提示', {
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
