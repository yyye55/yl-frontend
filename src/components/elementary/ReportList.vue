<template>
  <div class="bg">
    <div class="options">
      <el-input
        v-model="keyword"
        class="input-with-select"
        placeholder="请输入内容"
        @change="getData"
      >
        <template #append>
          <el-button><el-icon><Search /></el-icon></el-button>
        </template>
      </el-input>

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
        style="width: 100px"
        type="primary"
        @click="refresh"
      >
        刷新
      </el-button>
    </div>

    <div class="content">
      <div class="bg-list">
        <p class="title">{{ cfg.title }}</p>

        <el-table :data="data" border style="width: 100%">
          <el-table-column
            type="index"
            prop="date"
            label="序号"
            width="60"
            header-align="center"
            align="center"
          />

          <!-- 列集合 I：4b6a / 67bc（教师组列表） -->
          <template v-if="cfg.columns === 'I'">
            <el-table-column
              prop="choir_name"
              label="合唱团名称"
              header-align="center"
              align="center"
              show-overflow-tooltip
            />
            <el-table-column
              prop="name"
              label="节目名称"
              header-align="center"
              align="center"
              show-overflow-tooltip
            />
            <el-table-column prop="contact_name" label="联系人" header-align="center" align="center" />
            <el-table-column prop="contact_phone" label="联系电话" header-align="center" align="center" />
            <el-table-column prop="contact_way" label="联系地址" header-align="center" align="center" />
          </template>

          <!-- 列集合 II：1c73 / cd09（赛事报名列表） -->
          <template v-else>
            <el-table-column
              prop="choir_name"
              label="乐团名称"
              header-align="center"
              align="center"
              show-overflow-tooltip
            />
            <el-table-column
              prop="school_name"
              label="参展学校"
              width="200"
              header-align="center"
              align="center"
              show-overflow-tooltip
            />
            <el-table-column
              prop="name"
              label="自选曲目"
              header-align="center"
              align="center"
              show-overflow-tooltip
            />
            <el-table-column prop="contact_name" label="领队姓名" header-align="center" align="center" />
            <el-table-column
              prop="contact_phone"
              label="领队联系电话"
              width="150"
              header-align="center"
              align="center"
            />
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

          <el-table-column
            label="操作"
            width="360"
            header-align="center"
            align="center"
            :width="cfg.actionWidth"
          >
            <template #default="{ row }">
              <!--
                dist 原文是三元链：-1 -> 3 个控件 + 编辑/删除；0 -> 查看详情 + 编辑/删除；其余 -> 只有查看详情

                【第十二届·暂存改造 / 一处可见行为变更】「编辑」**只保留在 status === -1（已驳回）**，
                待审核（0）不再提供。依据：暂存规范 §十三「只有驳回状态才允许修改报名」——
                修改要走 edit-draft 把正式 Report 换成草稿再改，后端对非驳回状态直接回
                REPORT_NOT_REJECTED，此时还摆一个点进去必然报错的按钮，比没有更糟。

                「删除」按钮原样保留（0 和 -1 都还在），它不属于本次暂存改造的范围。
                状态取值：-2 未填写 / -1 已驳回 / 0 待审核 / 1 组委会通过（见 Status.vue）。

                【第十二届权限调整】「编辑」「删除」再叠一层角色判断 canEditReport：
                市州端不再具有赛事报名权限（只保留查看），进到 /city/elementary/list 时
                这两个按钮不渲染；「查看详情」（ShowContent）与「驳回原因」（Remark）
                对市州端照旧保留 —— 本次只收走写操作的入口。
                学校端两个变体（/school/teacher/list、/school/elementary/list）的
                canEditReport 恒为 true，显示结果与本改造前逐字节相同。
              -->
              <template v-if="row.status === -1">
                <Remark :data="row.remark" />
                <ShowContent :data="row" />
                <el-button v-if="canEditReport" @click="edit(row)">编辑</el-button>
                <el-button v-if="canEditReport" @click="remove(row.id)">删除</el-button>
              </template>
              <template v-else-if="row.status === 0">
                <ShowContent :data="row" />
                <el-button v-if="canEditReport" @click="remove(row.id)">删除</el-button>
              </template>
              <template v-else>
                <ShowContent :data="row" />
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
 * ReportList —— 报名列表（4 条路由共用）
 *
 * ===========================================================================
 * 一、为什么是一个组件 + 变体表
 * ===========================================================================
 * 【dist 已确认】5 条路由在 dist 里是 5 个独立 chunk 模块（组件名都叫 name:"ElementaryList"），
 * 但逐字节比对后确认是**同一份实现**：
 *   - 模板结构逐节点一致（差异只有表格标题、列集合、操作列宽度、是否渲染「类别」筛选）；
 *   - 5 个模块的 scoped 样式完全相同的 8 条规则：
 *       .bg / .options / .options>* / .options>.el-input{width:220px!important} / .content /
 *       .title / .title:before{background-color:#036} / .my-pagination
 *     作用域 id 各不相同（047299ca / bbca108a / edb0fb24 / a87eeb78 / 16214dfd），规则内容逐字节相同；
 *   - getData / refresh / handleSizeChange / handleCurrentChange / remove / edit 的实现逐字相同，
 *     连删除确认文案「此操作将永久删除该数据请谨慎操作, 是否继续?」与「删除成功！」都一致。
 *
 * ===========================================================================
 * 二、逐路由差异表（全部来自 dist 原文）
 * ===========================================================================
 * | 路由 | dist 模块 | 表格标题 | api | 类别筛选 | 列集合 | 操作列宽 | group | 编辑跳转 |
 * |---|---|---|---|---|---|---|---|---|
 * | /city/teacher/list     | 4b6a | 报名列表 | city     | 无 | I  | 500 | **固定 2** | /city/teacher/edit/:id 中小学教师组节目修改 |
 * | /school/teacher/list   | 67bc | 报名列表 | school   | 无 | I  | 500 | **固定 3** | /school/teacher/edit/:id 高校教师组节目修改 |
 * | /city/elementary/list  | 1c73 | 报名汇总 | city     | 无 | II | 500 | **无此参数** | /city/elementary/edit/:id 报名修改 |
 * | /school/elementary/list| cd09 | 报名汇总 | school   | 无 | II | 500 | **无此参数** | /school/elementary/edit/:id 报名修改 |
 *
 * 【更正 1 · 表格标题】不是「一套文案」。已用
 *     /staticClass:"title"\},\[e\._v\("([^"]*)"\)/
 * 逐个模块精确提取：4b6a / 67bc = 「报名列表」，1c73 / cd09 = 「报名汇总」。
 *
 * 【更正 2 · group 参数 —— 本条曾判断错误，由运行时对照纠正】
 * 先前只看 `group:null` 的匹配结果，误判为「4b6a / 67bc 的 data() 里没有 group，
 * 所以 `group:this.group` 发出去是 undefined，等于没发」。**这是错的。**
 * 用 scripts 级别的双跑探针（.scratch/probe2.mjs）分别对原始 dist 与本次重建产物加载页面、
 * 记录真实外发请求后，实测结果为：
 *     /city/teacher/list      → GET .../report/list?group=2&limit=20&page=1
 *     /school/teacher/list    → GET .../report/list?group=3&limit=20&page=1
 *     /city/elementary/list   → GET .../report/list?limit=20&page=1
 *     /school/elementary/list → GET .../report/list?limit=20&page=1
 * 回到 dist 原文核对，4b6a / 67bc 的 data() 实际是
 *     data(){return{keyword:null,isDelete:null,status:null,page:1,limit:20,total:0,data:[],group:2,...}}
 *     data(){return{keyword:null,isDelete:null,status:null,page:1,limit:20,total:0,data:[],group:3,...}}
 * 即 group 是**写死的常量**（4b6a=2、67bc=3），只是模板里没有对应的 select 控件（用户看不到、也改不了）。
 * 1c73 / cd09 的 data() 里**根本没有 group**，getData 里也没有 `group:this.group`，
 * 所以它们确实不发这个参数。
 * 本组件按上述实测结果实现：
 * 数字（4b6a=2 / 67bc=3）为固定值；缺省则完全不发该参数。
 *
 * ===========================================================================
 * 三、dist 已知缺陷（保持原行为，仅记录）
 * ===========================================================================
 * 【低】4 个模块都定义了 openImageDialog / updateFile / beforeUpload / uploadSuccess /
 *   removeSuccess / handleExceed / getQiniuToken / beforeClose 一整套「上传审核图」逻辑，
 *   模板里也有对应的 el-dialog（title="上传审核图"、:limit=5）。但**模板中没有任何控件
 *   调用 openImageDialog**（已逐个模块检索模板区：`openImageDialog` 出现 0 次，
 *   `dialogImageVisible` 只出现在 dialog 的 visible 绑定、update:visible 回写、
 *   和「取消」按钮三处）—— 也就是说 dialogImageVisible 永远不会变成 true，
 *   **整个上传弹窗在这 5 个页面里是不可达的死代码**。
 *   处理：与项目已有先例（components/common/UploadScanDialog.vue 头部说明 3 记录了
 *   dist 中同样不可达的内层预览弹窗「不移植，避免留下永远弹不出来的空弹窗」）保持一致，
 *   本组件**不渲染**这个弹窗。如需保留，可在后续轮次单独讨论。
 *
 * 【低】exportReport(e,t) 在 5 个模块里都有定义（确认弹窗 + 下载），但**模板里同样没有任何
 *   控件绑定它**（模板内出现的按钮文案只有：刷新 / 表格标题 / 编辑 / 删除 / 上传弹窗自身的
 *   确认上传、取消），因此也是死代码。另外它调用的是写死的 `$api.school.exportReportData(e)`，
 *   而本项目 src/api/live.js 里的 exportApi.exportReportData 是**不接受参数**的
 *   （request.get('/api/export/report',{responseType:'blob'})）。
 *   处理：不移植该方法 —— 移植一个不可达、且签名与本项目实际接口不符的方法，只会留下误导。
 *
 * ===========================================================================
 * 四、Vue 2 -> Vue 3 / Element UI -> Element Plus 迁移说明
 * ===========================================================================
 * 1) `this.$api.<scope>.report.*` -> 从 @/api/{city,school} 具名导入（与 UploadScanDialog 一致）。
 * 2) `slot="append"` / `slot="prepend"` -> `<template #append>` / `<template #prepend>`。
 *    dist 把 el-select 写在 el-input 的 `slot="prepend"` 里；Element Plus 的 el-input 已不再
 *    渲染 prepend 插槽为同行前置元素（Input 只有 prepend/append 两个插槽，但语义是
 *    「输入框前的附加内容」）。这里把两个 el-select 直接作为兄弟节点放在 .options 里 ——
 *    `.options` 本身就是 `display:flex`，视觉结果与 dist 的 .options 布局一致。
 * 3) `icon="el-icon-search"` -> `<el-icon><Search /></el-icon>`（Element Plus 移除字体图标）。
 * 4) el-pagination 的 `:current-page` + `update:current-page` 写法 -> `v-model:current-page`
 *    与 `v-model:page-size`；`size-change` / `current-change` 两个回调与实现保持原样。
 * 5) `Message/MessageBox` -> `ElMessage/ElMessageBox`。
 * 6) computed 里 dist 声明了 `...mapState(["tabsActive","tabs"])`，但这两个状态在本页面
 *    模板与逻辑中**从未被读取**，故不迁移（与 JiemuList.vue 记录被省略字段的做法一致）。
 * 7) `mounted(){this.getData()}` -> `onMounted(getData)`。
 * 8) `data-isDelete` 等 dist 声明后从未使用的字段同样不迁移。
 *
 * 【已移除】`size="mini"`：Element Plus 只认 large/default/small，不含 "mini"，每渲染一次
 * 告警一次；而 EP 里没有 `.el-*--mini` 规则，该属性本就不产生样式，删掉是零视觉变化。
 * **未**改成 small —— `--small` 是真实尺寸规则，会把表格/按钮/下拉改小。
 */
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search } from '@element-plus/icons-vue'

import { cityApi } from '@/api/city'
import { schoolApi } from '@/api/school'
// 中小学端（type=5）。第三个端，只换接口前缀
import { primaryApi } from '@/api/primary'
import { useTabs } from '@/composables/useTabs'
import { usePermission } from '@/composables/usePermission'

import ShowPerson from '@/components/common/ShowPerson.vue'
import Status from '@/components/common/Status.vue'
import Remark from '@/components/common/Remark.vue'
import ShowContent from '@/components/common/ShowContent.vue'

const MODULES = { city: cityApi, school: schoolApi, primary: primaryApi }

/* =========================================================================
 * 逐路由变体表
 * ========================================================================= */
const VARIANTS = {
  '/city/teacher/list': {
    title: '报名列表', api: 'city',
    // data() 里写死 group:2，模板中无对应控件
    group: 2, columns: 'I', actionWidth: 500,
    editPath: (id) => `/city/teacher/edit/${id}`, editLabel: '中小学教师组节目修改'
  },
  '/school/teacher/list': {
    title: '报名列表', api: 'school',
    // data() 里写死 group:3，模板中无对应控件
    group: 3, columns: 'I', actionWidth: 500,
    editPath: (id) => `/school/teacher/edit/${id}`, editLabel: '高校教师组节目修改'
  },
  '/city/elementary/list': {
    title: '报名汇总', api: 'city',
    // data() 中无 group，getData 也不发该参数
    columns: 'II', actionWidth: 500,
    editPath: (id) => `/city/elementary/edit/${id}`, editLabel: '报名修改'
  },
  '/school/elementary/list': {
    title: '报名汇总', api: 'school',
    columns: 'II', actionWidth: 500,
    editPath: (id) => `/school/elementary/edit/${id}`, editLabel: '报名修改'
  },
  /*
   * 中小学端（type=5，第十二届新增，dist 里没有）。
   *
   * 【为什么整条照抄 /city/elementary/list】两边看的是同一批数据（中小学的报名），
   * 列集合、筛选条件、操作列宽度都一样。唯一的区别是数据源和「编辑」跳到哪。
   *
   * 【group 字段为什么也不写】与 city/school 的 elementary 变体一致：
   * getData 不发 group 参数，所以本端列表查的是该账号下的**全部**报名，
   * 而不是按组别过滤 —— 小学组、中学组两条都会出现在同一页里。
   *
   * 【editPath 必须指向 /primary/...】ReportList 的「编辑」按钮用 openWindow(editPath(id))
   * 开新窗口。若这里仍写 /city/elementary/edit/:id，中小学端用户点编辑会打开市州端的页面，
   * 而后端对 type=5 的账号在 /api/city/* 上会返 403 —— 表现是「点编辑跳出个空白/报错的窗口」。
   */
  '/primary/elementary/list': {
    title: '报名汇总', api: 'primary',
    columns: 'II', actionWidth: 500,
    editPath: (id) => `/primary/elementary/edit/${id}`, editLabel: '报名修改'
  }
}

const props = defineProps({
  /** 变体键，取值为路由 path（例如 '/city/teacher/list'），由薄封装页显式传入 */
  variant: { type: String, required: true }
})

const cfg = VARIANTS[props.variant]
if (!cfg) {
  throw new Error(`[ReportList] 未知变体：${props.variant}`)
}

const { openWindow } = useTabs()
/** 【第十二届权限调整】市州端只读：报名汇总里不提供「编辑」「删除」*/
const { canEditReport } = usePermission()

/* ------------------------- dist data() ------------------------- */
const keyword = ref(null)
const status = ref(null)
const page = ref(1)
const limit = ref(20)
const total = ref(0)
const data = ref([])

/** dist: handleSizeChange(e){ this.page=1, this.limit=e, this.getData() } */
function handleSizeChange(size) {
  page.value = 1
  limit.value = size
  getData()
}

/** dist: refresh(){ this.getData() } —— 注意 dist 这里是直接重新拉取，没有重置分页 */
function refresh() {
  getData()
}

/** dist: handleCurrentChange(e){ this.page=e, this.getData() } */
function handleCurrentChange(current) {
  page.value = current
  getData()
}

/**
 * 【响应乱序保护：只认最后一次请求的结果】
 *
 * 翻页 / 改每页条数 / 点刷新都会发新请求，而它们**互不等待** —— 用户在
 * 「第 2 页」还没回来时点了「第 3 页」，就是两个请求同时在飞。谁先到不取决于
 * 谁先发：第 2 页那次若因网络抖动慢了一拍，它会在第 3 页的结果**之后**落地，
 * 于是 `data.value` 被覆盖成第 2 页的行，而分页控件高亮的是第 3 页。
 * 用户看到的是「页码和内容对不上」，且刷新一次就好 —— 最难查的那类。
 *
 * 做法：每次请求领一个递增序号，回来时不是最新那号就整个丢弃。
 * 注意**丢弃时不弹任何提示** —— 那份结果本身没错，只是过期了，
 * 弹窗只会让用户以为自己操作失败。
 */
let reqSeq = 0

/**
 * dist:
 *   getData(){
 *     const e={page,limit,keyword,status}            // 4b6a/67bc 还带 group
 *     this.$api.<scope>.report.getList(e).then(({data:e})=>{
 *       0===e.code ? (this.total=e.count, this.data=e.data) : Message.error(e.msg)
 *     })
 *   }
 * 响应是**扁平**的 {data,count,code,msg}（后端 core/services.py:20 page_response），
 * 所以读 res.count / res.data，而不是 res.data.data。
 */
function getData() {
  const params = { page: page.value, limit: limit.value, keyword: keyword.value, status: status.value }
  // 4b6a / 67bc: 固定常量 2 / 3
  // 1c73 / cd09: 不发该参数
  if (cfg.group !== undefined) params.group = cfg.group

  reqSeq += 1
  const seq = reqSeq
  MODULES[cfg.api].report.getList(params).then(({ data: res }) => {
    if (seq !== reqSeq) return
    if (res.code === 0) {
      total.value = res.count
      data.value = res.data
    } else {
      ElMessage.error(res.msg)
    }
  })
}

/**
 * dist:
 *   remove(e){ MessageBox.confirm("此操作将永久删除该数据请谨慎操作, 是否继续?","提示",{...})
 *     .then(()=>{ this.$api.<scope>.report.delete({id:e}).then(({data:e})=>{
 *       0===e.code ? (Message.success("删除成功！"), this.getData()) : Message.error(e.msg) }) })
 *     .catch(()=>{}) }
 */
function remove(id) {
  ElMessageBox.confirm('此操作将永久删除该数据请谨慎操作, 是否继续?', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  })
    .then(() => {
      MODULES[cfg.api].report.delete({ id }).then(({ data: res }) => {
        if (res.code === 0) {
          ElMessage.success('删除成功！')
          getData()
        } else {
          ElMessage.error(res.msg)
        }
      })
    })
    .catch(() => {})
}

/**
 * dist edit()：
 *   4 个模块都是一条固定路径。
 *   dist 的写法是 this.addTab({name,label}).then(t=>{null!=t&&this.$router.push({path:...})})，
 *   与 @/composables/useTabs 的 openWindow(name, label) 语义逐行一致。
 */
function edit(row) {
  openWindow(cfg.editPath(row.id), cfg.editLabel)
}

onMounted(() => {
  getData()
})
</script>

<style lang="scss" scoped>
/* 照搬 dist：5 个模块的 scoped 样式逐字节相同（作用域 id 各异），
   出处例如 chunk-5880598a 的 [data-v-047299ca] */
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

/* dist: .options>* —— Vue 3 的 scoped 编译结果与 Vue 2 相同（.options > *[data-v-x]） */
.options > * {
  margin-bottom: 10px;
  margin-right: 10px;
}

/* 子组件（el-input / el-select）的根元素会继承父作用域 id，故该规则在 Vue 3 下同样命中 */
.options > .el-input {
  width: 220px !important;
}

/* 状态下拉必须给固定宽度，否则它占满整行、把刷新按钮挤到第三行。
   Element Plus 定义了 --el-select-width:100%，而 .el-select 的 width 就是取这个变量，
   于是下拉一旦成为 flex item，基准宽度就是 .options 的整个内容宽：第一行放完输入框
   （220+10）后剩余空间放不下它，换行；独占一行后又与自身 margin-right:10px 抢空间，
   被迫收缩 10px，刷新按钮再被挤到下一行 —— 实测 1920/1600/1366/1280/1024 五个视口
   全是 3 行（下拉宽 = 容器内容宽 − 10，正好印证 width:100%）。
   同款写法见上面的 .el-input 规则；权重上 .options > .el-select[data-v-x] 已高于 .el-select，
   这里加 !important 只为与相邻规则保持一致的风格。 */
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
  content: '';
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
</style>
