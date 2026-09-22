<template>
  <div class="container">
    <div class="options">
      <el-button style="color: #1890ff" type="text" @click="add">添加一行</el-button>
      <el-button style="color: #1890ff" type="text" @click="flush">清空</el-button>
    </div>
    <div class="box">
      <!-- dist 里是编译期提升的静态子树 e._m(0) -->
      <div class="box-line-title">
        <div class="box-col">序号</div>
        <div class="box-col">姓名</div>
        <div class="box-col">身份证号</div>
        <div class="box-col">性别</div>
        <div class="box-col">年龄</div>
        <div class="box-col">学校名称</div>
        <div class="box-col">联系电话</div>
        <div class="box-col">操作</div>
      </div>

      <div v-for="(item, index) in data" :key="index" class="box-line">
        <div class="box-col">{{ index + 1 }}</div>
        <div class="box-col">
          <el-input v-model="item.name" placeholder="请输入姓名" />
        </div>
        <div class="box-col">
          <el-input v-model="item.card" placeholder="请输入身份证号码" />
        </div>
        <div class="box-col">
          <el-select v-model="item.gender" placeholder="请选择">
            <el-option label="男" value="男" />
            <el-option label="女" value="女" />
          </el-select>
        </div>
        <div class="box-col">
          <el-input v-model="item.age" type="number" placeholder="请输入年龄" />
        </div>
        <div class="box-col">
          <el-input v-model="item.school" placeholder="请输入学校全称" />
        </div>
        <div class="box-col">
          <el-input v-model="item.phone" placeholder="请输入联系电话" />
        </div>
        <div class="box-col">
          <el-button type="danger" @click="remove(index)">删除</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * 指导教师名单表格（报名表单「指导教师」段）
 *
 * ===========================================================================
 * 【dist 已确认】来源：dist/chunk-0294a80a.165638130932c3751d03.js 模块 1607
 * 该模块被 16 个报名/修改页共用（dist 事实），在这些页面里 import 为 `Teacher`（模板中写作 <Teacher>）。
 * 取证方式：对 dist 全量检索 `n("1607")`，命中 16 个路由 chunk，逐一抽取模块体比对字节完全相同。
 * 本项目中由 OrchestraForm.vue 与 ProgramForm.vue 共用，覆盖 8 条路由：
 *   /city|school/elementary/{create, edit/:id}
 *   /city|school/teacher/{create, edit/:id}
 * ===========================================================================
 *
 * dist 原文组件选项（逐字）：
 *
 *   name:"Student",                       // ← 与 PersonTable 同名，见下方「未保留项」
 *   components:{[elButton.name]:elButton, [elInput.name]:elInput, [elSelect.name]:elSelect,
 *               [elOption.name]:elOption, ...},
 *   props:["showdata"],
 *   data(){ return { data:[], msg:[], number:0 } },
 *   watch:{ showdata(e){ this.data = e } },
 *   mounted(){ this.$nextTick(()=>{ this.showdata ? this.data = this.showdata : this.data = [] }) },
 *   methods:{ add, remove, flush, check, checkLine, getData, getCacheData }
 *
 * 父页面的调用方式（对 dist 检索 $refs.teacher.* 全量确认）：
 *   <Teacher ref="teacher" :showdata="form.teacher" />      // chunk-0294a80a 的 ElementaryEdit 渲染函数
 *   this.$refs.teacher.getData()        // 提交前校验，失败返回 false
 *   this.$refs.teacher.getCacheData()   // 直接取数组（草稿缓存用）
 * 因此本组件的对外契约（prop showdata / 方法 getData、getCacheData）必须保持原样。
 *
 * ===========================================================================
 * 逐条移植理由
 * ===========================================================================
 * 1) `props:["showdata"]` → `defineProps({ showdata: { default: undefined } })`
 *    dist 用的是数组写法，既无类型也无默认值。这里**刻意不声明 type: Array**：
 *    父组件传的是 `form.teacher`，在表单初始化/接口返回前可能是 undefined 甚至 null，
 *    而组件自身用 `this.showdata ? ... : []` 兜底（即把「假值」都视为空表）。
 *    若补上 type: Array，传 null 时会触发 Vue 的 prop 类型告警，属于新增噪音。
 *
 * 2) `watch:{ showdata(e){ this.data = e } }` → `watch(() => props.showdata, (e) => { data.value = e })`
 *    保留原语义：**不 immediate、不 deep**，只在父组件替换整个数组引用时同步。
 *
 * 3) `mounted(){ this.$nextTick(...) }` → `onMounted(() => nextTick(...))`
 *    逐行等价。$nextTick 的用途与 dist 一致：挂载完成后再用 props 覆盖一次初始空数组。
 *
 * 4) `this.$set(n,"name",t)` → `v-model="item.name"`（直接赋值）
 *    Vue 2 数组元素的新增属性需要 $set 才能响应；Vue 3 的 ref 数组是深响应代理，
 *    `item.name = v` 即可。编译产物与 dist 的 model 回调一一对应。
 *
 * 5) `e._m(0)` → 展开成普通模板里的表头 div
 *    静态提升只是编译期优化，渲染结果与 dist 的 staticRenderFns 完全一致。
 *
 * 6) `size="mini"` 已移除
 *    【dist 已确认】dist 全文用 size="mini"（Element UI 2 的尺寸档）。
 *    Element Plus 只认 large/default/small，`mini` 不被识别、每次渲染告警一次；
 *    EP 中没有 `.el-input--mini` / `.el-select--mini` / `.el-button--mini` 任何规则，
 *    所以 dist 里这个属性本来也是空转，删掉后渲染结果与 dist（及迁移后现状）一致。
 *    **未**改成 small —— `--small` 是真实尺寸规则，会把输入框/按钮压小。
 *
 * 7) `el-icon-*` 图标：本组件 dist 原文未使用任何图标；本组件也不需要
 *    @element-plus/icons-vue 的显式 import。
 *
 * 8) getData / getCacheData → defineExpose
 *    必须暴露给父组件（见上文父页面用法），签名与返回值逐字保留：
 *      getData()  : 先 check()，任一行不合法则 ElMessage.error 并返回 false；否则返回 data 数组
 *      getCacheData(): 不校验，直接返回 data 数组
 *
 * 9) Element 组件由 vite.config.js 的 unplugin-vue-components(ElementPlusResolver) 按需自动引入，
 *    所以模板里的 el-button/el-input/el-select/el-option 不需要手写 import（与 dist 里
 *    逐个注册 [elButton.name]:elButton 的写法等价，只是改成了编译期解析）。
 *    ElMessage 不在模板里，按项目惯例显式 import。
 *
 * 【未保留项（非功能缺失，逐条说明）】
 *   a. 内部 name:"Student" 未保留。
 *      dist 里 Teacher(1607) 与 Person(db6d) 的 name 都写着 "Student"，是复制粘贴留下的笔误。
 *      父页面是靠 import 绑定名注册的（渲染函数里写的是 _c("Teacher") / _c("Person")），
 *      没有任何地方按组件内部 name 解析它们；保留 "Student" 反而会让 Vue Devtools 里
 *      两个组件同名难以区分，故不声明 defineOptions({name})。
 *   b. data 里的 `msg:[]`、`number:0` 两个字段：dist 声明了但在本组件内**从未被读写**，
 *      父组件也只调用 getData/getCacheData（已对 dist 全量检索 $refs.teacher.
 *      getData|getCacheData，无第三种访问）。为避免死状态，这里不声明。
 *
 * 【dist 已知缺陷】无。本模块的逻辑（含 check/checkLine 的嵌套三元）是自洽的。
 * 注意 check() 的空表短路：`if (this.data && this.data.length > 0)`，即 data 为空数组时
 * 直接返回 true（视为校验通过），getData() 于是返回 `[]`（[] 是 truthy，父组件的
 * `if (!data) return` 不会拦住空表）—— 这是 dist 的既有行为，原样保留。
 */

import { ref, onMounted, nextTick, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { checkPersonBasics } from '@/config/personFields'

const props = defineProps({
  /** 父组件传入的名单数组（通常是 form.teacher），可为 undefined / null */
  showdata: { default: undefined }
})

const data = ref([])

watch(
  () => props.showdata,
  (val) => {
    data.value = val
  }
)

onMounted(() => {
  nextTick(() => {
    data.value = props.showdata ? props.showdata : []
  })
})

/** dist: add(){ this.data.push({type:1,position:4}) } —— 指导教师固定 type=1（教师）、position=4（指导教师） */
function add() {
  data.value.push({ type: 1, position: 4 })
}

/** dist: remove(e){ this.data.splice(e,1) } */
function remove(index) {
  data.value.splice(index, 1)
}

/** dist: flush(){ this.data=[] } */
function flush() {
  data.value = []
}

/**
 * dist: check(){
 *   if(this.data&&this.data.length>0)
 *     for(let e=0;e<this.data.length;e++){
 *       const t=this.checkLine(this.data[e])
 *       if(!t.flag) return Message.error("指导教师名单第"+(e+1)+"行"+t.msg), !1
 *     }
 *   return !0
 * }
 * 逗号运算符展开成两条语句，求值顺序与返回值一致。
 */
function check() {
  if (data.value && data.value.length > 0) {
    for (let i = 0; i < data.value.length; i++) {
      const result = checkLine(data.value[i])
      if (!result.flag) {
        ElMessage.error('指导教师名单第' + (i + 1) + '行' + result.msg)
        return false
      }
    }
  }
  return true
}

/**
 * dist 原文是一串嵌套三元：
 *   e.name ? (e.card ? (e.age ? (undefined===e.gender||""===e.gender ? {性别需选择}
 *            : e.school ? (e.phone ? (undefined===e.type||""===e.type ? {身份需选择}
 *            : (undefined===e.position||""===e.position ? {角色需选择} : {flag:!0,msg:"验证成功"}))
 *            : {电话号码不能为空}) : {学校名称不能为空})
 *            : {年龄不能为空}) : {身份证不能为空}) : {姓名不能为空}
 * 下面按同一判定顺序改写成 if 链，**判定顺序、判定条件、返回文案逐条对齐**，
 * 唯一区别是可读性（等价改写，不是简化：没有合并/删除任何分支）。
 */
function checkLine(item) {
  if (!item.name) return { flag: false, msg: '姓名不能为空' }
  if (!item.card) return { flag: false, msg: '身份证不能为空' }
  if (!item.age) return { flag: false, msg: '年龄不能为空' }
  if (item.gender === undefined || item.gender === '') return { flag: false, msg: '性别需选择' }
  if (!item.school) return { flag: false, msg: '学校名称不能为空' }
  if (!item.phone) return { flag: false, msg: '电话号码不能为空' }
  if (item.type === undefined || item.type === '') return { flag: false, msg: '身份需选择' }
  if (item.position === undefined || item.position === '') return { flag: false, msg: '角色需选择' }
  // 【第十二届·补格式校验】见 config/personFields.js。以上全是 dist 原判定，
  // 只判"填没填"；格式放在最后，不改动上面任何一条的优先级。
  const formatErr = checkPersonBasics(item)
  if (formatErr) return { flag: false, msg: formatErr }
  return { flag: true, msg: '验证成功' }
}

/** dist: getData(){ return !!this.check() && this.data } */
function getData() {
  return !!check() && data.value
}

/** dist: getCacheData(){ return this.data } */
function getCacheData() {
  return data.value
}

defineExpose({ getData, getCacheData })
</script>

<style lang="scss" scoped>
/* dist/css/chunk-0294a80a.260c9e35.css 中 [data-v-12e40084] 的全部 9 条规则 */
.container {
  margin-bottom: 10px;
}

.box {
  overflow-x: auto;
  text-align: center;
}

/* 【列宽依据】前 7 列必须与 PersonTable.vue 逐字相同 ——
 * 两表同页上下排布且前 7 列完全同名同序（序号/姓名/身份证号/性别/年龄/
 * 学校名称/联系电话），宽度一致才会在视觉上对齐成一个整体。
 * 改这里请同步改 PersonTable.vue。
 *
 * dist 原值 50/120/180/120/130/160/150/80 合计 990px（不溢出），
 * 但学校名称 160px 实测需要 183px，长校名会被输入框截掉。
 * 现按实测重排，合计 858px。
 * padding 由 10px 收到 6px 的理由同 PersonTable：给各列文字区让位。 */
.box-line-title,
.box-line {
  display: grid;
  grid-template-columns: 38px 96px 182px 72px 78px 184px 128px 80px;
  justify-content: stretch;
}

.box-col {
  border-left: 1px solid #8c939d;
  border-bottom: 1px solid #8c939d;
  padding: 5px 6px;
}

.box-line-title {
  line-height: 35px;
}

.box-line-title > .box-col {
  border-top: 1px solid #8c939d;
}

.box-line-title > .box-col:last-child,
.box-line > .box-col:last-child {
  border-right: 1px solid #8c939d;
}

.box-line > .box-col:first-child {
  line-height: 30px;
}

.box-line-title > .box-col:first-child,
.box-line > .box-col:first-child {
  background-color: #dcdcdc;
}
</style>
