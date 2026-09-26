<template>
  <div class="container">
    <div v-if="success" class="container-text">
      <div class="export-demo" style="padding: 5px 0 20px 0">
        <!--
          【第十二届权限调整】市州端不负责上传盖章材料，故「盖章扫描件上传」按钮
          按登录角色隐藏（判据见 composables/usePermission.js，不写死 type）。
          「报名信息表导出」保留 —— 市州端要用它汇总本市州各校报名信息。
          el-button 上的 :disabled="!pass" 与 dist 一致（pass 恒为 true，见文件头说明 2）。
        -->
        <el-button type="primary" :disabled="!pass" @click="exportReport()">
          报名信息表导出
        </el-button>
        <el-button
          v-if="canUploadSealScan"
          type="primary"
          :disabled="!pass"
          @click="dialogRef.open()"
        >
          报名信息表表盖章扫描件上传
        </el-button>
      </div>
    </div>

    <!-- 【第十二届新增·仅标题】给下面这张老表补一个标题。
         老表原本没有标题（.title 样式在本页 <style scoped> 里已经存在，只是模板没用过），
         不补的话，下面新增的「乐团类别一览」有标题、它没有，两张表叠在一起分不出谁是谁。
         纯新增一行，不碰表格本身；删掉这一行不影响任何东西。 -->
    <p class="title">报名一览</p>
    <el-table :data="data" style="width:100%">
      <el-table-column header-align="center" align="center" prop="name" label="类型" width="180" />
      <el-table-column header-align="center" align="center" prop="total" label="合计" />
      <el-table-column header-align="center" align="center" prop="data1" label="驳回" />
      <el-table-column header-align="center" align="center" prop="data2" label="待审核" />
      <el-table-column header-align="center" align="center" prop="data3" label="组委会通过" />
    </el-table>

    <!-- 【第十二届新增】乐团类别一览，位置：老表下面、上传弹窗组件之前 -->
    <p class="title">乐团类别一览</p>
    <el-table :data="establishmentData" style="width:100%">
      <!-- 乐团类型列：插槽写法与上面老表的类型列保持一致；
           宽度 180 = 本页老表类型列的宽度，两张表左边缘对齐。 -->
      <el-table-column label="乐团类型" width="180">
        <template #default="{ row }">
          <span>{{ row.name }}</span>
        </template>
      </el-table-column>
      <!-- 4 个数字列直接 prop 绑定扁平字段 total/data1/data2/data3（本接口没有拆数组的问题）。
           注意：不要照抄上面老表直接 prop="total" 却读 res.data.data 的组合 —— 那是老接口的结构。 -->
      <el-table-column prop="total" label="合计" />
      <el-table-column prop="data1" label="驳回" />
      <el-table-column prop="data2" label="待审核" />
      <el-table-column prop="data3" label="组委会通过" />
      <!-- 老表写了 align="center"（dist 原样），本表故意不写：
           全局 CSS（styles/index.css:74）已让所有 el-table 居中，再写一遍是重复。 -->
    </el-table>

    <UploadScanDialog
      ref="dialogRef"
      v-model="dialogImageVisible"
      :limit="1"
      tip="上传加盖公章的扫描文件，格式为PDF，单个文件大小不超过20M"
    />
  </div>
</template>

<script setup>
/**
 * 市级首页（路由 /city/index），组件名 "index"，作用域 09486db2
 *
 * 【可信度：A】照搬 dist 模块 044d（chunk-13167452）。原文渲染函数可用 `node scripts/dist-map.mjs --dump 044d` 复现。
 * 与 /school/index（5d2b）是同一个组件的两个变体，
 * 模板骨架、data、全部 methods（除接口模块名）逐字节相同，只有以下几处不同，本页取 city 的值：
 *
 *   | 差异点                       | city（本页）              | school                |
 *   |------------------------------|---------------------------|-----------------------|
 *   | 导出按钮 disabled            | !pass                     | 无                     |
 *   | 上传文件数上限 limit         | 1                         | 2                     |
 *   | exportReport 传入的文件名    | "报名信息表"              | "报名信息表导出"       |
 *   | 确认框正文                   | …所有**数据**都已报送完毕 | …所有数据都已报送完毕  |
 *   | container-text 内容          | 仅两个按钮                | 仅两个按钮             |
 *   | 接口模块                     | city.index                | school.index          |
 *   | 作用域 id                    | 09486db2                  | 89781142              |
 *
 * 【第十二届更正】表中「exportReport 传入的文件名」一行已是历史：现在两页都不传文件名，
 * 由 utils/excel.js 的 downloadPdfFile 统一给默认名（见该函数与本页 exportReport 的注释）。
 *
 * （dist 中还有第三个变体 /province/index（bec3，作用域 525d87bf），省级端已下线，未纳入本项目。）
 *
 * data(){ return { data:[], limit:[], success:[], tableData:[], pass:!0,
 *   dialogImageVisible:!1, dialogImageUrl:"", dialogVisible:!1, fileList:[], filename:"",
 *   QiniuData:{token:"",key:"ylbxt/"}, domain:"https://upload.qiniup.com", host:"https://img.atyth.com/" } }
 * mounted(){ this.getTotal() }
 *
 * 【保留 dist 的两处事实，不擅自"修好"】
 * 1. success 初值是**空数组 []** 而不是 null/{}。空数组是 truthy，所以 v-if="success"
 *    从一开始就成立，这个判断实际上恒真；后端返回的 success 也始终是对象（见下）。
 *    按 dist 原样保留，初始值仍写 []。
 * 2. pass 恒为 true：唯一会把它置 false 的 getPercent() 在 mounted 中**没有被调用**
 *    （mounted 只调 getTotal），且模板里也没有任何地方调用它。因此城市页的两个导出按钮
 *    在 dist 中永远不会进入 disabled 态。本页保留 :disabled="!pass" 绑定与 pass 字段，
 *    但不移植 getPercent —— 它在 dist 中不可达，移植过来只会是死代码。
 *
 * 接口：GET /api/city/index/total（yilinbei/apps/api/views.py:660 → scoped_total(request,1,"city")）
 *   返回 success("获取成功！", {"success":{"elementary":0,"teacher":0},
 *                              "data":[{"name":"小学组"|"中学组","total":…,"data1":…,"data2":…,"data3":…}]})
 *   注意：这里的 data 元素是**扁平命名**字段 total/data1/data2/data3，
 *   与 /admin/index、/committee/index 的 data:[…] 数组结构**不是**一回事，
 *   所以本页列可以直接用 prop="total" 等，不存在 Element Plus getProp 取不到中括号下标的问题。
 *
 * 样式（dist/css/chunk-13167452.19a46b7b.css，三个页面逐字节相同）：
 *   .container{display:flex;justify-content:flex-start;flex-direction:column;flex-wrap:wrap}
 *   .container-text{background-color:#fff;margin-bottom:20px;padding:10px;line-height:30px}
 *   .full{color:red}          ← 模板中未被引用
 *   .title{padding:20px 0;font-weight:700;font-size:16px}   ← 本页模板未用到
 *   .ptable{width:100%;text-align:center}   ← 模板中未被引用
 * 后两条与本页无关，但同属该 chunk 的 scoped 样式，一并保留以保持一致。
 *
 * 【本页旧实现的问题（已重写）】旧版是 "PageHeader + el-empty「页面开发中」+ el-alert"，
 * 纯占位，未调用任何接口，与 dist 结构完全不符。
 */
import { ref, onMounted } from 'vue'
import { ElMessageBox } from 'element-plus'
import { cityApi } from '@/api'
import { exportApi } from '@/api/live'
import { downloadPdfFile } from '@/utils/excel'
import { showApiError } from '@/utils/request'
import { usePermission } from '@/composables/usePermission'
import UploadScanDialog from '@/components/common/UploadScanDialog.vue'

// 【第十二届权限调整】市州端只读：隐藏盖章扫描件上传入口（导出保留）
const { canUploadSealScan } = usePermission()

const data = ref([])
const limit = ref([])
// dist 初值即空数组（truthy），故 v-if="success" 恒真；详见文件头说明
const success = ref([])
const tableData = ref([])
const pass = ref(true)
const dialogImageVisible = ref(false)
const dialogRef = ref(null)

/** dist: getTotal(){ $api.city.index.getIndexTotal().then(({data:e})=>{ 0===e.code && (this.data=e.data.data,this.success=e.data.success,this.limit=e.data.limit) }) } */
function getTotal() {
  cityApi.index.getIndexTotal().then(({ data: res }) => {
    if (res.code === 0) {
      data.value = res.data.data
      success.value = res.data.success
      limit.value = res.data.limit
    }
  })
}

// ── 【第十二届新增】乐团类别一览的数据源 ────────────────────────────
// ⚠ 变量名必须是 establishmentData —— 本页上面已经有一个叫 data 的 ref（装老表数据），
//   新变量若也叫 data 会直接编译报错（重复声明）。
const establishmentData = ref([])

function getEstablishment() {
  // 与上面 getTotal() 同样的静默失败策略：只在 code===0 时写入，失败不弹提示。
  cityApi.index.getIndexEstablishment().then(({ data: res }) => {
    // ⚠ 这里同样是 res.data.data，但原因和上面 getTotal() 不一样，别互相"简化"：
    //   · 老接口 /city/index/total 是 {success, data, limit} 三个字段装在 data 里；
    //   · 新接口是 success("获取成功！", {"data": …})，data 里只有一个 data 字段。
    //   两者恰好都落在 res.data.data，但换成 res.data 都会拿到对象 → 表格「暂无数据」且不报错。
    if (res.code === 0) establishmentData.value = res.data.data
  })
}

/**
 * dist: exportReport(e){ MessageBox.confirm("此操作需在所在单位账号所有数据都已报送完毕后操作, 确认操作?","提示",{confirmButtonText:"确定",cancelButtonText:"取消",type:"warning"}).then(()=>{ $api.communal.exportReportData().then(t=>{ this.downloadPdfFile(t.data,e) }) }).catch(()=>{}) }
 *
 * 【第十二届改动，两处】
 * 1. 不再传文件名：改由 utils/excel.js 的 downloadPdfFile 统一决定（默认
 *    "报名信息表.pdf"，与后端 Content-Disposition 一致），避免 city/school 两页
 *    各写一个名字、其中一个还与后端不符。注意这不是「让浏览器去读后端响应头」——
 *    blob URL 拿不到响应头，原因与实测见该函数注释。
 * 2. 内层请求必须 return：原写法是块体、无 return，下面 .catch 只能接住确认框的
 *    取消，接不到接口失败 —— 非 401 的 4xx 会走 request.js 响应拦截器的 default
 *    分支只 console.log，用户看到「点了没反应」。现补上 showApiError 提示。
 *    （确认框的 'cancel'/'close' 传入 showApiError 会因其无 status 而静默返回，
 *      行为与原来的 .catch(()=>{}) 一致。）
 */
function exportReport() {
  ElMessageBox.confirm('此操作需在所在单位账号所有数据都已报送完毕后操作, 确认操作?', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  })
    .then(() => {
      return exportApi.exportReportData().then((res) => {
        downloadPdfFile(res.data)
      })
    })
    .catch((err) => showApiError(err, '导出失败'))
}

onMounted(getTotal)
// 两个 onMounted 各自注册、依次执行 → 两个接口并行发出，谁先回来谁先上屏，新表不拖慢老表
onMounted(getEstablishment)
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
