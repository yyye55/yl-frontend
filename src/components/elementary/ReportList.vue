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
          <el-button><el-icon><Search /></el-icon></el-button>
        </template>
      </el-input>

      <!-- 仅 cadb（/province/report/list）有「类别」筛选；其余 4 个模块的模板里没有这个 el-select -->
      <el-select
        v-if="cfg.group === 'filter'"
        v-model="group"
        placeholder="类别"
        size="mini"
        @change="getData"
      >
        <el-option label="全部" :value="null" />
        <el-option label="中小学组" :value="0" />
        <el-option label="大学组" :value="1" />
        <el-option label="中小学教师组" :value="2" />
        <el-option label="高校教师组" :value="3" />
      </el-select>

      <el-select v-model="status" placeholder="审核状态" size="mini" @change="getData">
        <el-option label="全部" :value="null" />
        <el-option label="待审核" :value="0" />
        <el-option label="未通过" :value="-1" />
        <el-option label="组委会通过" :value="1" />
      </el-select>

      <el-button
        class="menu-button"
        style="width: 100px"
        type="primary"
        size="mini"
        @click="refresh"
      >
        刷新
      </el-button>
    </div>

    <div class="content">
      <div class="bg-list">
        <p class="title">{{ cfg.title }}</p>

        <el-table :data="data" border size="mini" style="width: 100%">
          <el-table-column
            type="index"
            prop="date"
            label="序号"
            header-align="center"
            align="center"
          />

          <!-- 列集合 I：cadb / 4b6a / 67bc（教师组与省级列表） -->
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
              header-align="center"
              align="center"
              show-overflow-tooltip
            />
            <el-table-column
              prop="name"
              label="自选曲目名称"
              header-align="center"
              align="center"
              show-overflow-tooltip
            />
            <el-table-column prop="contact_name" label="领队姓名" header-align="center" align="center" />
            <el-table-column
              prop="contact_phone"
              label="领队联系电话"
              header-align="center"
              align="center"
            />
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

          <el-table-column
            label="操作"
            header-align="center"
            align="center"
            :width="cfg.actionWidth"
          >
            <template #default="{ row }">
              <!-- dist 原文是三元链：-1 -> 3 个控件 + 编辑/删除；0 -> 查看详情 + 编辑/删除；其余 -> 只有查看详情 -->
              <template v-if="row.status === -1">
                <Remark :data="row.remark" />
                <ShowContent :data="row" />
                <el-button size="mini" @click="edit(row)">编辑</el-button>
                <el-button size="mini" @click="remove(row.id)">删除</el-button>
              </template>
              <template v-else-if="row.status === 0">
                <ShowContent :data="row" />
                <el-button size="mini" @click="edit(row)">编辑</el-button>
                <el-button size="mini" @click="remove(row.id)">删除</el-button>
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
 * ReportList —— 报名列表（5 条路由共用）
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
 * | /province/report/list  | cadb | 报名列表 | province | 有 | I  | 440 | 有 select，初值 null | 按 row.group 分发（0/1/2） |
 * | /city/teacher/list     | 4b6a | 报名列表 | city     | 无 | I  | 500 | **固定 2** | /city/teacher/edit/:id 中小学教师组节目修改 |
 * | /school/teacher/list   | 67bc | 报名列表 | school   | 无 | I  | 500 | **固定 3** | /school/teacher/edit/:id 高校教师组节目修改 |
 * | /city/elementary/list  | 1c73 | 报名汇总 | city     | 无 | II | 500 | **无此参数** | /city/elementary/edit/:id 报名修改 |
 * | /school/elementary/list| cd09 | 报名汇总 | school   | 无 | II | 500 | **无此参数** | /school/elementary/edit/:id 报名修改 |
 *
 * 【更正 1 · 表格标题】不是「一套文案」。已用
 *     /staticClass:"title"\},\[e\._v\("([^"]*)"\)/
 * 逐个模块精确提取：cadb / 4b6a / 67bc = 「报名列表」，1c73 / cd09 = 「报名汇总」。
 *
 * 【更正 2 · group 参数 —— 本条曾判断错误，由运行时对照纠正】
 * 先前只看 `group:null` 的匹配结果，误判为「4b6a / 67bc 的 data() 里没有 group，
 * 所以 `group:this.group` 发出去是 undefined，等于没发」。**这是错的。**
 * 用 scripts 级别的双跑探针（.scratch/probe2.mjs）分别对原始 dist 与本次重建产物加载页面、
 * 记录真实外发请求后，实测结果为：
 *     /province/report/list   → GET .../report/list?limit=20&page=1
 *     /city/teacher/list      → GET .../report/list?group=2&limit=20&page=1
 *     /school/teacher/list    → GET .../report/list?group=3&limit=20&page=1
 *     /city/elementary/list   → GET .../report/list?limit=20&page=1
 *     /school/elementary/list → GET .../report/list?limit=20&page=1
 * 回到 dist 原文核对，4b6a / 67bc 的 data() 实际是
 *     data(){return{keyword:null,isDelete:null,status:null,page:1,limit:20,total:0,data:[],group:2,...}}
 *     data(){return{keyword:null,isDelete:null,status:null,page:1,limit:20,total:0,data:[],group:3,...}}
 * 即 group 是**写死的常量**（4b6a=2、67bc=3），只是模板里没有对应的 select 控件（用户看不到、也改不了）。
 * cadb 则是 `group:null` + 一个绑定到 this.group 的「类别」select。
 * 1c73 / cd09 的 data() 里**根本没有 group**，getData 里也没有 `group:this.group`，
 * 所以它们确实不发这个参数。
 * 本组件按上述实测结果实现：`cfg.group === 'filter'`（cadb）用 select 的值；
 * 数字（4b6a=2 / 67bc=3）为固定值；缺省则完全不发该参数。
 *
 * ===========================================================================
 * 三、dist 已知缺陷（保持原行为，仅记录）
 * ===========================================================================
 * 【中】cadb 的 edit() 只处理 group 0/1/2 三个分支，**没有 group === 3 的分支**：
 *     edit(e){
 *       if(0===e.group){.../province/elementary/edit/...}
 *       else if(1===e.group){.../province/school/edit/...}
 *       else if(2===e.group){.../province/teacher/edit/...}
 *     }
 *   即 group===3 的行点「编辑」不会有任何反应。已核对：所有会写入 group=3 的页面都在
 *   school 作用域（4be7 / 7fcd），不会进入省级列表，所以这条缺陷**目前不可达**，按原样保留。
 *
 * 【低】5 个模块都定义了 openImageDialog / updateFile / beforeUpload / uploadSuccess /
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
 * 1) `this.$api.<scope>.report.*` -> 从 @/api/{province,city,school} 具名导入（与 UploadScanDialog 一致）。
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
 * 【保留未改】`size="mini"`：Element Plus 只认 large/default/small，留到设计系统轮统一处理。
 */
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search } from '@element-plus/icons-vue'

import { provinceApi } from '@/api/province'
import { cityApi } from '@/api/city'
import { schoolApi } from '@/api/school'
import { useTabs } from '@/composables/useTabs'

import ShowPerson from '@/components/common/ShowPerson.vue'
import Status from '@/components/common/Status.vue'
import Remark from '@/components/common/Remark.vue'
import ShowContent from '@/components/common/ShowContent.vue'

const MODULES = { province: provinceApi, city: cityApi, school: schoolApi }

/* =========================================================================
 * 逐路由变体表
 * ========================================================================= */
const VARIANTS = {
  '/province/report/list': {
    title: '报名列表', api: 'province',
    // 'filter' = 模板里有「类别」select，绑定 this.group（data() 初值 null）
    group: 'filter', columns: 'I', actionWidth: 440,
    // cadb 的 edit 按 row.group 分发
    editByGroup: true
  },
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
  }
}

const props = defineProps({
  /** 变体键，取值为路由 path（例如 '/province/report/list'），由薄封装页显式传入 */
  variant: { type: String, required: true }
})

const cfg = VARIANTS[props.variant]
if (!cfg) {
  throw new Error(`[ReportList] 未知变体：${props.variant}`)
}

const { openWindow } = useTabs()

/* ------------------------- dist data() ------------------------- */
const keyword = ref(null)
const status = ref(null)
const group = ref(null)
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
 * dist:
 *   getData(){
 *     const e={page,limit,keyword,status}            // cadb/4b6a/67bc 还带 group
 *     this.$api.<scope>.report.getList(e).then(({data:e})=>{
 *       0===e.code ? (this.total=e.count, this.data=e.data) : Message.error(e.msg)
 *     })
 *   }
 * 响应是**扁平**的 {data,count,code,msg}（后端 core/services.py:20 page_response），
 * 所以读 res.count / res.data，而不是 res.data.data。
 */
function getData() {
  const params = { page: page.value, limit: limit.value, keyword: keyword.value, status: status.value }
  // cadb: 取 select 的值（初值 null，axios 会把 null/undefined 从 query 中丢弃）
  // 4b6a / 67bc: 固定常量 2 / 3
  // 1c73 / cd09: 不发该参数
  if (cfg.group === 'filter') params.group = group.value
  else if (cfg.group !== undefined) params.group = cfg.group

  MODULES[cfg.api].report.getList(params).then(({ data: res }) => {
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
 *   cadb（省级列表）按 row.group 分发到三个编辑页；其余 4 个模块是一条固定路径。
 *   dist 的写法是 this.addTab({name,label}).then(t=>{null!=t&&this.$router.push({path:...})})，
 *   与 @/composables/useTabs 的 openWindow(name, label) 语义逐行一致。
 * 【保留 dist 缺陷】cadb 没有 group===3 的分支，此时不跳转（见文件头第三节）。
 */
function edit(row) {
  let target = null

  if (cfg.editByGroup) {
    if (row.group === 0) {
      target = { path: `/province/elementary/edit/${row.id}`, label: '中小学组节目修改' }
    } else if (row.group === 1) {
      target = { path: `/province/school/edit/${row.id}`, label: '大学组节目修改' }
    } else if (row.group === 2) {
      target = { path: `/province/teacher/edit/${row.id}`, label: '教师组节目修改' }
    }
  } else {
    target = { path: cfg.editPath(row.id), label: cfg.editLabel }
  }

  if (!target) return
  openWindow(target.path, target.label)
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
