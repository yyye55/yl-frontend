<template>
  <div class="container">
    <!--
      v-if="success" —— 照搬 school/city 的写法。注意 success 的初值是**空数组 []**，
      空数组是 truthy，所以这个判断从第一帧起就成立、恒真。
      也就是说：即便 getTotal() 请求失败，下面两个按钮照样显示。
      这是 dist 带过来的既有行为（city/school 两页一模一样），
      三端保持一致比"顺手修好它"更重要 —— 单独改这一端会让三个首页行为不一致，
      而且用户看到的现象（接口挂了按钮还在）本身不影响操作，点导出后端自然会报错。
    -->
    <div v-if="success" class="container-text">
      <div class="export-demo" style="padding: 5px 0 20px 0">
        <!--
          「报名信息表导出」-> exportApi.exportReportData()
          这个接口是 GET /api/export/report，**不带端前缀**（见 src/api/live.js:20），
          city 和 school 用的就是同一个。所以中小学端不需要为它做任何改动。
        -->
        <el-button type="primary" @click="exportReport()">
          报名信息表导出
        </el-button>
        <!--
          「报名信息表表盖章扫描件上传」—— 按需求保留，与高校端一致。
          :limit="2" 也是跟高校端一致（市州端是 1，因为它不负责上传盖章材料）。

          【按钮为什么没有 v-if】市州端首页这一颗按钮上有 v-if="canUploadSealScan"
          （判据见 composables/usePermission.js）。中小学端不是只读端，
          该判据恒为 true，加了等于白加，所以按高校端原样不写 —— 少一层间接。
          注意别把它写成学校的现行代码：school/index.vue 上这颗按钮同样没有 v-if。
        -->
        <el-button type="primary" @click="dialogRef.open()">
          报名信息表表盖章扫描件上传
        </el-button>
      </div>
    </div>

    <!--
      统计表。data 直接绑接口返回的 data.data 数组（不加工、不排序）。
      中小学端后端固定返回**两行**：小学组、中学组，字段是扁平的
      total / data1 / data2 / data3。列名与高校端逐字相同，所以表头不用动。

      字段语义（后端文档）：
        total 合计（不是某一状态）
        data1 未通过（report.status = -1，表头写「驳回」）
        data2 待审核（report.status = 0）
        data3 已通过（report.status = 1，表头写「组委会通过」）
    -->
    <el-table :data="data" style="width:100%">
      <el-table-column header-align="center" align="center" prop="name" label="类型" width="180" />
      <el-table-column header-align="center" align="center" prop="total" label="合计" />
      <el-table-column header-align="center" align="center" prop="data1" label="驳回" />
      <el-table-column header-align="center" align="center" prop="data2" label="待审核" />
      <el-table-column header-align="center" align="center" prop="data3" label="组委会通过" />
    </el-table>

    <!-- 盖章扫描件上传弹窗。limit=2 与高校端一致；tip 文案三端相同，照抄 -->
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
 * 中小学端首页（路由 /primary/index）
 *
 * 【怎么来的】以 src/views/school/index.vue（高校端首页）为蓝本逐行改写，
 * 与它、以及 src/views/city/index.vue 是同一份 UI 的三个端各自实现。
 * 本页是**新增文件**，没有动 school/city 那两份 —— 那两页在跑，不碰。
 *
 * 三端首页的差异只有这几处：
 *
 *   | 差异点                    | primary（本页） | school          | city            |
 *   |---------------------------|-----------------|-----------------|-----------------|
 *   | 接口模块                  | primary.index   | school.index    | city.index      |
 *   | 导出按钮 :disabled="!pass"| 无              | 无              | 有              |
 *   | 盖章上传 limit            | 2               | 2               | 1               |
 *   | 盖章上传按钮 v-if         | 无（恒显示）    | 无（恒显示）    | canUploadSealScan |
 *   | 统计表行数                | 固定 2 行       | 1 行（大学组）  | 按组别数        |
 *
 * 【本页只调一个接口】GET /api/primary/index/total。
 *
 *   为什么**不**调 percent（报送比例面板）：这是对齐高校端现状后的决定，不是漏写。
 *   school/index.vue 的 onMounted 里只有 getTotal()，全模板也没有任何地方引用 pass。
 *   也就是说大学组首页从来没有接过这个面板，按「大学组接了中小学组才接」的口径，
 *   本页同样不接。后端确实提供了 /api/primary/index/percent（三行规则文案 + pass），
 *   要用的话在这里加一个 getPercent() 和一个面板即可 —— 接口文件里也已说明为何暂不提供。
 *
 *   为什么**不**调 establishment（乐团类别统计）：需求方明确说本端首页不接这一块。
 *   后端接口存在，但 api/primary.js 里没有对应方法，避免留下没人调的死函数。
 *
 * 【响应体形状（后端文档实测原文）】
 *   {"code":0,"msg":"获取成功！",
 *    "data":{"success":{"elementary":0,"teacher":0},
 *            "data":[{"name":"小学组","total":1,"data1":0,"data2":0,"data3":1},
 *                    {"name":"中学组","total":1,"data1":0,"data2":1,"data3":0}]}}
 *   注意 data.success 是历史遗留占位字段，三端恒为同一形状、无业务含义，
 *   但模板 v-if="success" 依赖它是个 truthy 值 —— 照原样赋给它即可，别删。
 *
 * 【与 school 版相比，本页**删掉**了三个 ref】limit / tableData / pass。
 *   它们在本页模板里没有任何引用，方法里也不读，属于 dist 留下的死变量：
 *     · limit    —— school/city 的 total 响应里有这个字段，本端响应里**没有**，
 *                   照抄 school 的 `limit.value = res.data.limit` 只会赋成 undefined；
 *     · pass     —— school 版里恒为 true 且模板不引用（city 版才用它绑 :disabled）；
 *     · tableData—— 三端都没用到。
 *   删掉是**零视觉变化**的清理（没有任何东西读它们），保留反而会让人以为
 *   "是不是还有一处逻辑没接上"。这一处与 school 版不同，是特意为的。
 */
import { ref, onMounted } from 'vue'
import { ElMessageBox } from 'element-plus'
import { primaryApi } from '@/api'
import { exportApi } from '@/api/live'
import { downloadPdfFile } from '@/utils/excel'
import { showApiError } from '@/utils/request'
import UploadScanDialog from '@/components/common/UploadScanDialog.vue'

/** 统计表数据，直接来自接口的 data.data（固定两行：小学组 / 中学组） */
const data = ref([])
/**
 * 接口返回的 data.success（恒为 {elementary:0, teacher:0} 的占位对象）。
 * 初值写成空数组是照搬 dist —— 空数组 truthy，使模板的 v-if="success" 一开始就成立。
 * 别"修正"成 null 或 {}：改成 null 会让内容区在第一帧闪一下才出现。
 */
const success = ref([])
/** 盖章上传弹窗的显示状态（模板里用 v-model 绑定） */
const dialogImageVisible = ref(false)
/** 弹窗组件实例，用来调它自己的 open() */
const dialogRef = ref(null)

/**
 * 拉首页统计。
 *
 * 判成功用的是 `res.code === 0`（数字 0）。这与后端成功外壳一致。
 * 【别用 code === 1 去判失败】后端有两套错误表达：业务失败是 code:1（数字），
 * 而权限类错误（例如 type=5 误打 /api/city/*）返的是 HTTP 403 + code:"FORBIDDEN"（字符串）。
 * 后者会被 axios 当成异常抛出去、由 request.js 的拦截器统一提示，
 * 根本走不到这里的 .then —— 所以本函数只需要处理成功分支，
 * 也只有这一种成功判定，不做字符串 code 的比较。
 *
 * 【没有 .catch 是照搬 school 版的写法】请求失败由 utils/request.js 的
 * 响应拦截器统一弹提示（这也是 request.js 存在的意义）。本页是只读展示，
 * 没有"失败了要回滚什么"的状态，因此不额外兜。
 */
function getTotal() {
  primaryApi.index.getIndexTotal().then(({ data: res }) => {
    if (res.code === 0) {
      data.value = res.data.data
      success.value = res.data.success
      // 这里**不再**写 limit.value = res.data.limit —— 本端响应没有该字段，见文件头说明
    }
  })
}

/**
 * 导出报名信息表（PDF）。
 *
 * 【为什么要先弹确认框】文案照搬 school/city：导出的是"全部数据"，
 * 若还有学校没报送完，导出的表是残缺的。这是业务上的一次提醒，不是技术必需。
 *
 * 【为什么内层 return 出来】让 .catch 能接住 exportApi 的失败。
 * 原先 dist 的写法是 `.then(()=>{ api().then(...) })` —— 内层 promise 没有返回，
 * 于是内层失败永远不会进到 .catch，用户点导出失败时界面毫无反应。
 * 两处（city/school）都已修过，本页直接采用修好的写法。
 *
 * 【不传文件名】dist 里三端各传各的名字（school 传 "报名信息表导出"），
 * 与后端实际不符。现在统一由 utils/excel.js 的 downloadPdfFile 给默认名 "报名信息表.pdf"。
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

// 进页面就拉一次。没有轮询、没有定时刷新 —— 与 school/city 一致。
onMounted(getTotal)
</script>

<!--
  样式块逐条照抄 school/index.vue，没有增删改。
  全部是 CSS（scoped SCSS），模板里没有新增任何内联 style 或 JS 驱动的样式。
  .export-demo / .el-table 那些没在这里定义的，用的是全局样式。
-->
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
