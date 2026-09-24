<template>
  <div class="container">
    <div class="options">
      <el-button style="color: #1890ff" type="text" @click="add">添加一行</el-button>
      <el-button style="color: #1890ff" type="text" @click="flush">清空</el-button>
      <!--
        【第十二届·第三轮】隐藏的单张照片上传通道，与参展人员表同款同源。
        整条 el-upload 加 hidden 不显示；用户点某一行「上传照片」时，
        upAvatar(index) 先记下要写哪一行，再 .click() 下面这个按钮去弹文件选择框。
        里面那个 <button> 不能删 —— el-upload 的文件选择框是挂在它的点击上的，
        它就是这个通道的「扳机」，只是被 hidden 藏起来了。
      -->
      <el-upload
        :http-request="uploadFileSingle"
        :before-upload="beforeUploadSingle"
        hidden
        :show-file-list="false"
      >
        <button ref="uploadAvatar" type="button">click</button>
      </el-upload>
    </div>
    <!-- ref 给 useDragScroll：按住表头行/序号列等空白处可鼠标拖动横滚 -->
    <div ref="boxRef" class="box">
      <!-- dist 里是编译期提升的静态子树 e._m(0) -->
      <div class="box-line-title">
        <div class="box-col">序号</div>
        <div class="box-col">姓名</div>
        <div class="box-col">身份证号</div>
        <div class="box-col">性别</div>
        <div class="box-col">年龄</div>
        <div class="box-col">学校名称</div>
        <div class="box-col">联系电话</div>
        <!-- 【第十二届·第三轮】新增列，位置与参展人员表一致（联系电话之后、操作之前） -->
        <div class="box-col">电子照片</div>
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
          <!--
            【第十二届·第三轮】电子照片格，与参展人员表逐字同款：
            有地址画 <img>，没有则画同尺寸（59×82）占位遮罩。
            教师行加行时推的是 {type:1, position:4}，没有 head 字段；后端草稿回填
            给的是 head:''（见 src/services/draftPayload.js 的 payloadToPerson）——
            两种情况 v-if 都为假，都走占位分支，不会再出现破碎图片图标。
            占位块的样式来自 @use 进来的共用文件，两表逐像素一致。
          -->
          <img v-if="item.head" style="width: 59px; height: 82px" :src="item.head" />
          <div v-else class="head-placeholder">
            <span class="head-placeholder-icon">+</span>
            <span>待上传</span>
          </div>
        </div>
        <div class="box-col">
          <!-- 「上传照片」与参展人员表同款：先记行号，再弹文件框（见 upAvatar）。 -->
          <el-button @click="upAvatar(index)">上传照片</el-button>
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
 * 【第十二届·第三轮 新增：电子照片列 + 逐行上传照片 —— dist 里没有这个功能】
 * ===========================================================================
 * 上面那份 dist 原文没有照片列、没有上传。本表这一列是**新加**的，为的是让指导教师
 * 也能交照片，且交互、校验、存储与参展人员表完全一致（用户要求「用的逻辑+设计与
 * 下方参展人员的电子照片设计+上传照片一样」）。新增内容只有三块：
 *   1) 表头/行体各多一格「电子照片」（联系电话 与 操作 之间），有地址画 <img>，
 *      没有则画 59×82 占位遮罩（与人员表逐字同款，样式来自 src/styles/photo-cell.css）；
 *   2) 操作列多一个「上传照片」按钮 + 一条 hidden 的 el-upload 通道；
 *   3) 脚本里 usePhotoUpload() 取回 upAvatar / beforeUploadSingle / uploadFileSingle。
 *
 * 【为什么不影响对外契约 / 不用改后端】
 *   head 是人员行本来就有的字段：草稿的 build/restore 走
 *   src/services/draftPayload.js 的 personToPayload / payloadToPerson，教师行与
 *   参展人员行走的是同一份映射（buildDraftPayload 把 form.teacher 一并放进 payload.person），
 *   head 已经在里面。所以照片写进 `item.head` 后，暂存、提交、编辑页回填自动带上，
 *   后端与接口一个都不用动。dist 的 check/checkLine 也不校验 head，无需改校验。
 *
 * 【本表**没有**批量上传照片】「批量上传照片」按钮在参展人员表的工具栏里，它只遍历
 *   参展人员表的数据（form.person），够不到本表的行（form.teacher）。本轮明确不做
 *   跨表批量，教师照片按行逐张上传。
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
import { useDragScroll } from '@/composables/useDragScroll'
/* 【第十二届·第三轮】单张上传照片的零件，与参展人员表共用同一份实现
   （@/composables/usePhotoUpload）：体积上限、JPG、命名规则、OSS 通道、
   占位块尺寸都不再有第二份副本。
   本表**不用** beforeUpload —— 那是「批量上传照片」的基础闸，而批量按钮在参展
   人员表上、只匹配 form.person，够不到本表的行（见本轮改造说明）。 */
import { usePhotoUpload } from '@/composables/usePhotoUpload'

// 8 列下限合计 855px，本项目常见分辨率下都放得下（1440 实测无横向滚动），
// 挂上是因为它跟参展人员表上下并排：只让一张表能拖、另一张拖不动会更奇怪，
// 且窗口被拖得很窄时这张表同样会溢出。
const boxRef = ref(null)
useDragScroll(boxRef)

const props = defineProps({
  /** 父组件传入的名单数组（通常是 form.teacher），可为 undefined / null */
  showdata: { default: undefined }
})

/*
 * 【第十二届·第四轮】新增一个对外事件，只为「指导教师超员了立刻提示」这一个用途。
 *
 * 【背景】父页面要校验「指导教师最多 1 人（教师指挥）/ 2 人」这条上限，而它要跟参展人员
 * 表里的指挥身份**一起**看才知道用哪个上限，所以判定在父页面做、本表只负责通知
 * 「我这边行数变了」。本表原本没有任何事件，父页面只在暂存 / 提交时调 getCacheData()，
 * 于是加到第 3 行也不会有人吭声，要等提交才被打回。
 * 【只增不改】prop showdata 与 getData / getCacheData 的签名、语义一字未动。
 */
const emit = defineEmits(['rows-change'])

const data = ref([])

/*
 * 【第十二届·第三轮】接上单张上传照片的三个零件：
 *   uploadTrigger → 模板里 ref="uploadAvatar"，就是那个藏起来的「扳机」按钮
 *   upAvatar      → 「上传照片」按钮的点击处理：记下这一行的下标，再弹文件选择框
 *   beforeUploadSingle → 文件选中后的校验（体积/格式/文件名是否对上这一行的人）
 *   uploadFileSingle   → 通过校验后真正上传，成功后把 url 写回该行的 head
 * 传进去的回调回答「第 i 行是哪个对象」—— 公共模块不认识本表的数据结构。
 */
const { uploadTrigger: uploadAvatar, upAvatar, beforeUploadSingle, uploadFileSingle } =
  usePhotoUpload((i) => data.value[i])

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

/*
 * 【第十二届·第四轮】「影响校验的字段变了」的通知口。
 * 本表没有身份 / 角色两列（add() 推的行固定是 { type: 1, position: 4 }，见下），
 * 所以**行数就是唯一的变量**：加一行 / 删一行 / 清空。
 * 用 watch(data.length) 而不是 deep watch —— 用户打姓名、身份证时不该触发校验。
 * 父组件整体替换 showdata（编辑页回填、草稿恢复）同样会触发一次，这是故意保留的：
 * 一张按旧规则存下来的、有 3 名指导教师的表，一打开就该看见不合规提示。
 *
 * 【位置必须在 data 声明之后】watch 的取值函数会被**立即执行一次**（用来建立初始依赖），
 * 放在 const data 之前会撞上 TDZ，挂载时就抛 ReferenceError。
 */
watch(() => data.value.length, () => emit('rows-change'))

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
/* 【第十二届·第三轮】@use 必须是 style 块里的第一条语句（Sass 语法要求）。
   占位块样式与参展人员表共用同一份，两表逐像素一致。 */
@use '../../styles/photo-cell.css';

/* dist/css/chunk-0294a80a.260c9e35.css 中 [data-v-12e40084] 的全部 9 条规则 */
.container {
  margin-bottom: 10px;
}

.box {
  overflow-x: auto;
  text-align: center;
}

/* 【列宽依据 —— 与 PersonTable.vue 总宽恒等，且任何宽度下都不截断文字】
 *
 * 用户要求：「指导老师和参展人员的框大小和宽度保持一致……
 * 里面的字（如 placeholder="请输入姓名"）要看得完整……现在是教师的要短一点」。
 *
 * 旧值（dist 抄来的）是固定 px：教师表 38/96/182/72/78/184/128/80 合计 858px，
 * 而人员表合计 1382px —— 两表同页上下排布，教师表右侧空出 500 多 px，所以显「短」。
 * 而且 96px 的姓名列留给输入框只有 61px，装不下 70px 宽的「请输入姓名」，是截断的。
 *
 * 现在改用 minmax(下限px, 权重fr)，两条要求各由一半保证：
 *   ① 全部轨道都是 fr → 永远把 .box 铺满；两表的 .box 同宽，
 *      所以任何分辨率下两表总宽都严格相等；
 *   ② 下限 = 该列内容一个不落所需的最小列宽，窗口再窄也不截断。
 *
 * 下限怎么来的（浏览器实测，不是估的）：
 *   列宽下限 = 文本宽 + .box-col 左右 padding 5×2 + 左边框 1 + 控件自身 chrome
 *   · 输入框 chrome：.el-input__wrapper 的 padding 1px 11px → 22px
 *   · 下拉框 chrome：.el-select__wrapper 的 padding 12×2 + gap 6 + 箭头 14 → 44px
 *   · 文本宽：14px 字号下中文一字 14px；18 位身份证约 145px
 *   例：「请输入姓名」5 字 = 70px → 70 + 11 + 22 = 103，取 105 留 2px 余量。
 *
 * fr 权重怎么定：**数值 = 参照容器 1660px 时希望该列得到的像素宽 ÷ 100**。
 *   1660px 是目前最常见的 1920 屏下 .box 的实宽
 *   （1440 视口 − 侧栏 200 − el-main 左右 padding 40 − .bg4 左右 padding 20 = 1180，
 *     1920 视口同式得 1660）。
 *
 * 【为什么不跟 PersonTable 的前 7 列逐列对齐】
 *   两表列数不同（9 列 vs 12 列），「总宽相等」与「前 7 列逐列对齐」数学上不可兼得 ——
 *   教师表要凑满和人员表一样的宽度，多出来的像素只能全塞进「操作」一列。
 *   用户明确要的是「两个表的长度宽度都要一致」，所以取等宽、放弃逐列对齐。
 *
 * ===========================================================================
 * 【第十二届·第三轮：新增「电子照片」列后的列宽账】
 * ===========================================================================
 * 列数 8 → 9，新增的一列插在 联系电话 与 操作 之间。两处取值刻意与 PersonTable
 * 的对应列**完全相同**，理由不是对齐（两表列数不同，对不齐）而是「同样的内容给同样的宽度」：
 *   · 电子照片  minmax(72px, 0.78fr) —— 与人员表那一列逐字相同。
 *       下限 72px 的算法：占位块/照片 59px + padding 5×2 + 左边框 1 = 70，取 72 留 2px。
 *   · 操作      minmax(72px, 1.20fr) → minmax(168px, 1.61fr)。
 *       这一列现在要放下「上传照片 + 删除」两个按钮（和人员表一样），
 *       168px 是人员表实测值；不改成 168 的话两个按钮会被挤成两行、行高被撑高。
 * 下限合计：30+105+178+99+105+133+133+72+168 = 1023px。
 *   1440 视口下 .box 实宽 1180px ≥ 1023，不出现横向滚动（1366 视口是 1046，也够）。
 *
 * 【一句更正】上面「改这里的 fr 权重，必须同步改 PersonTable 的权重，否则总宽不等」
 *   是**不准确**的：总宽相等由「两张表的 .box 同宽 + 全部轨道都是 fr」两条保证，
 *   与权重取值无关（fr 永远把容器分完）。真正会让两表看起来不一样宽的是**下限之和
 *   超过容器**：那时该表出现横向滚动条、表体被裁切。所以改权重是自由的，
 *   改 minmax 的下限才要看这张账。本轮两表的下限之和都远小于常见容器宽度 */
.box-line-title,
.box-line {
  display: grid;
  /*                     序号        姓名         身份证号      性别        年龄         学校名称      联系电话      电子照片      操作 */
  grid-template-columns:
    minmax(30px, 1.00fr) minmax(105px, 2.40fr) minmax(178px, 3.00fr) minmax(99px, 1.60fr)
    minmax(105px, 1.70fr) minmax(133px, 3.40fr) minmax(133px, 2.60fr) minmax(72px, 0.78fr)
    minmax(168px, 1.61fr);
  justify-content: stretch;
}

/* padding 6px → 5px：每列给文字区让出 2px，12 列合计 24px 的下限余量
 * （人员表 12 列下限合计因此从 1400px 降到 1376px，仍在旧值 1382px 以内，
 *  窄屏不会比改动前更容易出现横向滚动）。
 * display:flex + 居中与 PersonTable 的 .box-col 保持一致，两表上下排布的垂直对齐才齐。 */
.box-col {
  border-left: 1px solid #8c939d;
  border-bottom: 1px solid #8c939d;
  padding: 5px;
  display: flex;
  justify-content: center;
  align-items: center;
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
