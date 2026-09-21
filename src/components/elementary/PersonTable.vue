<template>
  <div class="container">
    <div class="options">
      <!--
        dist 原文（模块 db6d 渲染函数）：

          t("el-upload",{ref:"upload",staticStyle:{margin:"10px",display:"inline-block"},
            attrs:{action:"/","show-file-list":!1,"on-change":e.importExcel,"auto-upload":!1}},[
            t("el-button",{...on:{click:()=>e.downloadStaticFile("/ylbxt/static/参演人员导入模板.xlsx","参演人员导入模板.xlsx")}},[下载模板]),
            t("el-button",{...attrs:{slot:"trigger",type:"text"},slot:"trigger"},[批量导入]),
            t("el-button",{...on:{click:e.add}},[添加一行]),
            t("el-button",{...on:{click:e.flush}},[清空]),
            t("el-upload",{...批量上传头像}),          ← 内层
            t("el-upload",{...隐藏的单个头像上传}),     ← 内层
            t("p",{...},[注：电子照片要求...])
          ])

        关于 slot="trigger" → <template #trigger>（见文件头「移植理由 5」的完整论证）：
        这里把 `批量导入` 挪进 #trigger 后，Element Plus 的 el-upload 会把它渲染在
        uploadContent 内部（唯一可点开文件选择框的区域），其余默认插槽子节点渲染在其后 ——
        与 Element UI 2 的 index.vue 渲染函数 `this.$slots.trigger ? [o, this.$slots.default] : o`
        **产出完全相同的 DOM 顺序与点击行为**，不是行为变更。
      -->
      <el-upload
        style="margin: 10px; display: inline-block"
        action="/"
        :show-file-list="false"
        :on-change="importExcel"
        :auto-upload="false"
      >
        <el-button
          style="color: #1890ff"
          type="text"
          @click="downloadStaticFile(BASE + 'static/参演人员导入模板.xlsx', '参演人员导入模板.xlsx')"
        >
          下载模板
        </el-button>

        <template #trigger>
          <el-button style="color: #1890ff" type="text">批量导入</el-button>
        </template>

        <el-button style="color: #1890ff" type="text" @click="add">添加一行</el-button>
        <el-button style="color: #1890ff" type="text" @click="flush">清空</el-button>

        <el-upload
          style="margin: 10px; display: inline-block"
          :on-success="uploadSuccessBatch"
          :data="QiniuData"
          :before-upload="beforeUpload"
          :action="domain"
          multiple
          accept="image/jpeg"
          :show-file-list="false"
        >
          <el-button style="color: #1890ff" type="text">批量上传头像</el-button>
        </el-upload>

        <el-upload
          :on-success="uploadSuccess"
          :data="QiniuData"
          :before-upload="beforeUpload"
          :action="domain"
          hidden
          :show-file-list="false"
        >
          <button ref="uploadAvatar" type="button">click</button>
        </el-upload>

        <p style="color: red; margin-bottom: 10px">注： 电子照片要求为蓝底、免冠、证件照、JPG格式,每张照片文件大小不超过100KB；批量上传文件名格式为<i style="color: blue">身份证后6位+姓名.jpg</i> 例如：<i style="color: blue">123456张三.jpg</i> 则与身份证号码后六位为 <i style="color: blue">123456</i> 且姓名为 <i style="color: blue">张三</i> 的人员对应。 </p>
      </el-upload>
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
        <div class="box-col">身份</div>
        <div class="box-col">角色</div>
        <div class="box-col">使用乐器</div>
        <div class="box-col">电子照片</div>
        <div class="box-col sticky-column">操作</div>
      </div>

      <div v-for="(item, index) in data" :key="index" class="box-line">
        <div class="box-col">{{ index + 1 }}</div>
        <div class="box-col">
          <el-input v-model="item.name" placeholder="请输入姓名" size="mini" />
        </div>
        <div class="box-col">
          <el-input v-model="item.card" placeholder="请输入身份证号码" size="mini" />
        </div>
        <div class="box-col">
          <el-select v-model="item.gender" placeholder="请选择" size="mini">
            <el-option label="男" value="男" />
            <el-option label="女" value="女" />
          </el-select>
        </div>
        <div class="box-col">
          <el-input v-model="item.age" size="mini" type="number" placeholder="请输入年龄" />
        </div>
        <div class="box-col">
          <el-input v-model="item.school" size="mini" placeholder="请输入学校全称" />
        </div>
        <div class="box-col">
          <el-input v-model="item.phone" size="mini" placeholder="请输入联系电话" />
        </div>
        <div class="box-col">
          <el-select v-model="item.type" placeholder="请选择" size="mini">
            <el-option label="学生" :value="0" />
            <el-option label="教师" :value="1" />
          </el-select>
        </div>
        <div class="box-col">
          <el-select v-model="item.position" placeholder="请选择" size="mini">
            <el-option label="正式队员" :value="0" />
            <el-option label="预备队员" :value="1" />
            <el-option label="指挥" :value="2" />
          </el-select>
        </div>
        <div class="box-col">
          <el-select v-model="item.instrument" placeholder="请选择" size="mini">
            <el-option label="短笛" value="短笛" />
            <el-option label="长笛" value="长笛" />
            <el-option label="单簧管" value="单簧管" />
            <el-option label="低音单簧管" value="低音单簧管" />
            <el-option label="中音萨克斯" value="中音萨克斯" />
            <el-option label="次中音萨克斯" value="次中音萨克斯" />
            <el-option label="上低音萨克斯" value="上低音萨克斯" />
            <el-option label="双簧管" value="双簧管" />
            <el-option label="大管" value="大管" />
            <el-option label="小号" value="小号" />
            <el-option label="长号" value="长号" />
            <el-option label="圆号" value="圆号" />
            <el-option label="上低音号" value="上低音号" />
            <el-option label="大号" value="大号" />
            <el-option label="打击乐" value="打击乐" />
            <el-option label="低音大提琴" value="低音大提琴" />
            <el-option label="其他" value="其他" />
          </el-select>
        </div>
        <div class="box-col">
          <img style="width: 59px; height: 82px" :src="item.head" />
        </div>
        <div class="box-col sticky-column">
          <el-button size="mini" @click="upAvatar(index)">上传头像</el-button>
          <el-button type="danger" size="mini" @click="remove(index)">删除</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * 参演人员名单表格（报名表单「参演人员」段）
 *
 * ===========================================================================
 * 【dist 已确认】来源：dist/chunk-0294a80a.165638130932c3751d03.js 模块 db6d
 * 该模块被 14 个报名/修改页共用，在这些页面里 import 为 `Person`（模板中写作 <Person>）。
 * 取证方式同 TeacherTable：检索 `n("db6d")` 命中 14 个路由 chunk，模块体字节完全相同，
 * 再反查路由得到与 Teacher 的那 16 个路由**恰好少两个**：
 *   /province/school/create 与 /province/school/edit/:id
 * （校级报名页只有「指导教师」没有「参演人员」，属 dist 事实）。其余 14 个路由为：
 *   /city/{elementary,teacher}/{create, edit/:id}
 *   /province/{elementary,teacher,teacher1}/{create, edit/:id}
 *   /school/{elementary,teacher}/{create, edit/:id}
 *
 * dist 原文组件选项（关键部分逐字）：
 *
 *   name:"Student",                     // ← 与 TeacherTable 同名，复制粘贴笔误，见「未保留项 b」
 *   props:["showdata"],
 *   data(){ return {
 *     data:[], msg:[], number:0,
 *     QiniuData:{ token:"", key:"ylbxt/avatar/" },
 *     domain:"https://upload.qiniup.com",
 *     host:"https://img.atyth.com/"
 *   } },
 *   watch:{ showdata(e){ this.data = e } },
 *   mounted(){ this.$nextTick(()=>{ this.showdata?this.data=this.showdata:this.data=[] }),
 *              this.getQiniuToken() },
 *   methods:{ add, remove, upAvatar, flush, check, checkLine, exportCheck, getData,
 *              importExcel, getPosition, getCacheData, uploadSuccess, uploadSuccessBatch,
 *              beforeUpload, getQiniuToken }
 *
 * 父页面的调用方式（对 dist 检索 $refs.person.* 全量确认）：
 *   <Person ref="person" :showdata="form.person" />
 *   this.$refs.person.getData()        // 提交前校验
 *   this.$refs.person.getCacheData()   // 草稿缓存
 * 对外契约（prop showdata / 方法 getData、getCacheData）与 TeacherTable 完全相同。
 *
 * ===========================================================================
 * 逐条移植理由
 * ===========================================================================
 * 1) `props:["showdata"]`、`watch`、`mounted`+`$nextTick`、`$set` → Vue 3 写法
 *    与 TeacherTable.vue 完全相同的四条，理由见该文件（不重复展开）。此处补充一条：
 *    `this.$set(this.data[this.Arrayindex],"head",url)` 在 Vue 3 直接写成
 *    `data.value[Arrayindex].head = url` —— 数组元素本身是深响应代理，新增 head 字段同样是响应式，
 *    `<img :src="item.head">` 会照常更新（这正是要保留 `$set` 语义的地方）。
 *
 * 2) 两个「挂在 this 上但没写进 data」的实例属性
 *    dist 的 beforeUpload 里 `this.filename=e.name`、upAvatar 里 `this.Arrayindex=e`，
 *    二者都不在 data 中声明。`<script setup>` 没有 this，改用模块级
 *    `let filename` / `let Arrayindex`：setup() 每个组件实例各跑一遍，作用域与
 *    Vue 2 的「每实例一份、非响应式」完全一致；而且它们只在同步流程里被读，
 *    不需要响应式（dist 里也没有任何模板引用它们）。
 *
 * 3) 工具 / 接口来源（dist 是全局的，本项目改为显式 import）
 *    - this.$api.files.saveFileInfo   → `import { fileApi } from '@/api/misc'` → fileApi.saveFileInfo
 *    - this.$api.communal.getQiNiuToken → `import { qiniuApi } from '@/api/misc'` → qiniuApi.getToken
 *      （两处映射均已核对 src/api/misc.js 的实际导出名）
 *    - this.rename(...)               → `import { rename } from '@/utils/excel'`
 *    - this.downloadStaticFile(...)   → `import { downloadStaticFile } from '@/utils/excel'`
 *      【dist 已确认】dist 的实现（app.js，Vue.prototype.downloadStaticFile）是
 *        const a=document.createElement("a"); a.href=路径; a.download=文件名;
 *        a.target="_blank"; a.click(); a.remove()
 *      src/utils/excel.js 里已有的 downloadStaticFile **逐字相同**，因此直接复用，
 *      没有新建第二份实现（本轮不允许改 excel.js，import 不是修改）。
 *      【部署前缀：唯一一处有意偏离 dist 字面量】「下载模板」的路径 dist 写死成
 *      "/ylbxt/static/参演人员导入模板.xlsx"（因为 dist 的 publicPath 就是 /ylbxt/）。
 *      本项目 vite.config.js 明确「部署前缀唯一来源是 base，代码里一律用
 *      import.meta.env.BASE_URL 读取」，且模板文件确实放在 frontend/public/static/
 *      （已比对 md5，与 dist/static/参演人员导入模板.xlsx 完全一致）。
 *      故改为 `BASE + 'static/参演人员导入模板.xlsx'`：生产环境 base='/ylbxt/' 拼出的
 *      字符串与 dist 逐字相同，开发环境 base='/' 才能命中 Vite 的 public 目录
 *      （否则开发时点「下载模板」必然 404）。做法与 src/views/test/index.vue 的
 *      MODEL_URL 一致。除该常量拼接外，downloadStaticFile 的第二个参数（下载文件名）
 *      与整个调用形式均保持 dist 原样。
 *    - this.xlsx2json(...)            → `import { xlsx2json } from '@/utils/xlsx'`（本轮新建的文件）
 *      dist 里它是 Vue.prototype 上的方法，返回 `[{ sheet: 行数组 }]`；新建的实现忠于该结构，
 *      原因与取证见 src/utils/xlsx.js 顶部注释。
 *
 * 4) `size="mini"` 原样保留
 *    【dist 已确认】Element Plus 只认 large/default/small，`mini` 会被静默当作 default，
 *    故输入框/下拉/按钮的视觉尺寸会比 dist 略大。按本项目统一决定，本轮不改 small，
 *    留给后续设计系统轮统一处理。
 *
 * 5) `slot="trigger"` → `<template #trigger>`（本组件唯一需要推敲的模板改动）
 *    【dist 已确认】Element UI 2 的 ElUpload(index.vue) 渲染函数：
 *        r = this.$slots.trigger || this.$slots.default
 *        o = e("upload", n, [r])
 *        return e("div", [..., this.$slots.trigger ? [o, this.$slots.default] : o, this.$slots.tip, ...])
 *      即：有 trigger 插槽时，**trigger 的内容**进 inner-upload（可点开选择框的区域），
 *      默认插槽的其余子节点作为兄弟节点跟在后面（不触发选择框）。
 *    【dist 已确认】Element Plus 的 ElUpload(upload.vue)：
 *        uploadContent 内 = $slots.trigger ? trigger : default
 *        key 2 = $slots.trigger ? renderSlot($slots,"default") : 无
 *      两者产出的 DOM 顺序（trigger 在前 → 其余默认插槽子节点 → tip → 列表）与点击行为一致。
 *    因此这一步是**等价翻译**，不是行为变更：在本项目下，
 *    「下载模板 / 添加一行 / 清空 / 批量上传头像」都不会弹文件选择框，只有「批量导入」会。
 *
 * 6) getData / getCacheData → defineExpose，签名与返回值逐字保留。
 *
 * 【dist 已知缺陷（按原样保留，未顺手修复）】
 *   a. `upAvatar(e){ event.preventDefault(), this.Arrayindex=e, this.$refs.uploadAvatar.click() }`
 *      —— 引用的是**全局 window.event**（浏览器非标准但普遍存在），而不是形参；
 *      dist 模板里传进 upAvatar 的其实是行下标 index，本来也拿不到事件对象。
 *      保留原样（含 `event.preventDefault()` 这一句），只加此标注。
 *   b. importExcel 第一个循环里遗留了 `console.log(t[e])`（每次导入都会把每行打印到控制台）。
 *      属于 dist 遗留的调试输出，按原样保留。
 *   c. importExcel 用 `e.name.split(".")[1]` 取扩展名：文件名含多个点时会取错段。
 *      原样保留。
 *   d. 校验失败提示里的行号用的是 sheet 数组下标（第一条数据报「第1行」），
 *      与 Excel 里的可见行号差 1，原样保留。
 *   e. beforeUpload 返回的是「先判体积、再判格式」的嵌套三元：体积超限时**优先**报体积错误，
 *      即使格式也不对。下面用同序的 if 链复现，未调整判定优先级。
 *   f. 【无法确认】`uploadSuccess` 里 `info.filename = this.filename` 取的是 beforeUpload
 *      最后一次写入的文件名。单文件上传时二者必然一致（一次 beforeUpload 对一个 on-success），
 *      批量上传走的是另一个方法（用 file.name），所以此处没有观察到不一致；
 *      但由于是「实例级可变变量」，理论上并发上传会串，dist 即如此。
 *   g. 【无法确认】`getPosition` 有 `"伴奏" → 3` 分支，而界面上的「角色」下拉只提供
 *      0 正式队员 / 1 预备队员 / 2 指挥 三项；该分支只可能由导入的 Excel 命中
 *      （src/components/common/ShowPerson.vue 的注释也确认 position=3 表示「伴奏」）。
 *      原样保留。
 *
 * 【未保留项（非功能缺失，逐条说明）】
 *   a. dist 外层 el-upload 上的 `ref:"upload"` 未移植：全组件（以及全 dist）从未读取
 *      `this.$refs.upload`（只用到 $refs.uploadAvatar），保留它只会多一个无引用变量。
 *   b. 内部 name:"Student" 未保留（与 TeacherTable 同因：复制粘贴笔误，且父页面是按
 *      import 绑定名 <Person> 注册使用的，没有任何地方按组件内部 name 解析）。
 *   c. data 里的 `msg:[]`、`number:0` 未保留：dist 声明了但组件内从未读写，
 *      父组件只调用 getData/getCacheData（已全量检索 $refs.person.* 确认）。
 */

import { ref, reactive, onMounted, nextTick, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { fileApi, qiniuApi } from '@/api/misc'
import { rename, downloadStaticFile } from '@/utils/excel'
import { xlsx2json } from '@/utils/xlsx'

const props = defineProps({
  /** 父组件传入的名单数组（通常是 form.person），可为 undefined / null */
  showdata: { default: undefined }
})

const data = ref([])
const QiniuData = reactive({ token: '', key: 'ylbxt/avatar/' })
const domain = 'https://upload.qiniup.com'
const host = 'https://img.atyth.com/'

/** 部署前缀（dist 是写死的 "/ylbxt/"），用法见文件头「移植理由 3」最后一段 */
const BASE = import.meta.env.BASE_URL

/** 隐藏的单个头像上传 input 的触发按钮（dist: this.$refs.uploadAvatar） */
const uploadAvatar = ref(null)

/* dist 里这两个是「挂在 this 上、未写进 data」的实例属性，见文件头「移植理由 2」 */
let filename = ''
let Arrayindex = 0

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
  getQiniuToken()
})

/** dist: add(){ this.data.push({}) } —— 与 TeacherTable 不同，这里推的是空对象 */
function add() {
  data.value.push({})
}

/** dist: remove(e){ this.data.splice(e,1) } */
function remove(index) {
  data.value.splice(index, 1)
}

/** dist: upAvatar(e){ event.preventDefault(), this.Arrayindex=e, this.$refs.uploadAvatar.click() } */
function upAvatar(index) {
  // 【dist 已知缺陷】引用全局 window.event 而非形参，原样保留
  event.preventDefault()
  Arrayindex = index
  uploadAvatar.value.click()
}

/** dist: flush(){ this.data=[] } */
function flush() {
  data.value = []
}

/** dist: check(){ ... Message.error("参演人员名单第"+(e+1)+"行"+t.msg) ... } —— 与 TeacherTable 同构 */
function check() {
  if (data.value && data.value.length > 0) {
    for (let i = 0; i < data.value.length; i++) {
      const result = checkLine(data.value[i])
      if (!result.flag) {
        ElMessage.error('参演人员名单第' + (i + 1) + '行' + result.msg)
        return false
      }
    }
  }
  return true
}

/**
 * dist 的嵌套三元（界面校验）判定顺序：
 *   姓名 → 身份证 → 年龄 → 性别(空) → 学校 → 电话 → 身份(空) → 角色(空) → 使用乐器(空) → 通过
 * 注意：界面校验里 type/position 是**数字**（el-option 的 :value 是 0/1/2），
 * 所以只判 undefined/""，不做「值是否合法」的比对；值合法性比对在 exportCheck（字符串版）里。
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
  if (item.instrument === undefined || item.instrument === '') {
    return { flag: false, msg: '使用乐器需选择' }
  }
  return { flag: true, msg: '验证成功' }
}

/**
 * dist 的嵌套三元（导入校验，判定的是**中文字符串**，因为 Excel 里填的是「学生」「正式队员」这种文本）。
 * 判定顺序：姓名 → 身份证 → 年龄 → 性别(空) → 性别(格式) → 学校 → 电话 → 身份(空) → 身份(格式)
 *          → 角色(空) → 使用乐器(空) → 角色(格式) → 通过
 * 注意 dist 的顺序就是「先判空、再判格式」，且**乐器为空**排在**角色格式**之前，下面逐条对齐。
 */
function exportCheck(item) {
  if (!item.name) return { flag: false, msg: '姓名不能为空' }
  if (!item.card) return { flag: false, msg: '身份证不能为空' }
  if (!item.age) return { flag: false, msg: '年龄不能为空' }
  if (item.gender === undefined || item.gender === '') return { flag: false, msg: '性别需填写' }
  if (item.gender !== '男' && item.gender !== '女') {
    return { flag: false, msg: '性别格式只能是男、女' }
  }
  if (!item.school) return { flag: false, msg: '学校名称不能为空' }
  if (!item.phone) return { flag: false, msg: '电话号码不能为空' }
  if (item.type === undefined || item.type === '') return { flag: false, msg: '身份不能为空' }
  if (item.type !== '学生' && item.type !== '教师') {
    return { flag: false, msg: '身份格式只能是学生、教师' }
  }
  if (item.position === undefined || item.position === '') {
    return { flag: false, msg: '角色不能为空' }
  }
  if (item.instrument === undefined || item.instrument === '') {
    return { flag: false, msg: '使用乐器需选择' }
  }
  if (item.position !== '正式队员' && item.position !== '预备队员' && item.position !== '指挥') {
    return { flag: false, msg: '角色格式只能是正式队员、预备队员、指挥' }
  }
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

/**
 * dist:
 *   importExcel(e){
 *     const t=e.name.split(".")[1], n=["xlsx","xlc","xlm","xls","xlt","xlw","csv"].some(t=>t===e)
 *     if(!n) return Message.error("格式有误")
 *     this.xlsx2json(e).then(e=>{
 *       if(e&&e.length>0){
 *         this.data=[]
 *         const t=e[0].sheet
 *         for(let e=1;e<t.length;e++){ console.log(t[e]); const n=this.exportCheck(t[e]);
 *           if(!n.flag) return Message.error("导入失败！参演人员名单第"+e+"行"+n.msg),!1 }
 *         for(let e=1;e<t.length;e++) this.data.push({ name:t[e].name, ... })
 *       }
 *     })
 *   }
 * 行下标从 1 开始（跳过表头），两个循环必须都跳过表头，故 i 均从 1 起。
 * 注意 xlsx2json 的 sheet 元素存储行数组，所以 `res[0].sheet` 是行数组。
 */
function importExcel(file) {
  const ext = file.name.split('.')[1]
  const valid = ['xlsx', 'xlc', 'xlm', 'xls', 'xlt', 'xlw', 'csv'].some((e) => e === ext)
  if (!valid) return ElMessage.error('格式有误')

  xlsx2json(file).then((res) => {
    if (res && res.length > 0) {
      data.value = []
      const sheet = res[0].sheet
      for (let i = 1; i < sheet.length; i++) {
        // 【dist 已知缺陷】dist 遗留的调试输出，原样保留
        console.log(sheet[i])
        const result = exportCheck(sheet[i])
        if (!result.flag) {
          return ElMessage.error('导入失败！参演人员名单第' + i + '行' + result.msg)
        }
      }
      for (let i = 1; i < sheet.length; i++) {
        data.value.push({
          name: sheet[i].name,
          card: sheet[i].card,
          age: sheet[i].age,
          gender: sheet[i].gender,
          school: sheet[i].school,
          number: sheet[i].number,
          phone: sheet[i].phone,
          instrument: sheet[i].instrument,
          type: sheet[i].type === '学生' ? 0 : 1,
          position: getPosition(sheet[i].position)
        })
      }
    }
  })
}

/** dist: switch(e){ case "正式队员":0; case "预备队员":1; case "指挥":2; case "伴奏":3; default:0 } */
function getPosition(position) {
  switch (position) {
    case '正式队员':
      return 0
    case '预备队员':
      return 1
    case '指挥':
      return 2
    case '伴奏':
      return 3
    default:
      return 0
  }
}

/**
 * dist:
 *   uploadSuccess(e,t){
 *     const n={};
 *     n.filename=this.filename, n.type=t.raw.type, n.size=t.size, n.url=this.host+e.key,
 *     this.$api.files.saveFileInfo(n).then(({data:e})=>{ 0===e.code
 *       ? this.$set(this.data[this.Arrayindex],"head",n.url) : Message.error("文件上传失败") })
 *   }
 */
function uploadSuccess(res, file) {
  const info = {}
  info.filename = filename
  info.type = file.raw.type
  info.size = file.size
  info.url = host + res.key

  fileApi.saveFileInfo(info).then(({ data: body }) => {
    if (body.code === 0) data.value[Arrayindex].head = info.url
    else ElMessage.error('文件上传失败')
  })
}

/**
 * dist:
 *   uploadSuccessBatch(e,t){
 *     const n={};
 *     n.filename=t.name, n.type=t.raw.type, n.size=t.size, n.url=this.host+e.key,
 *     saveFileInfo(n).then(({data:e})=>{
 *       if(0===e.code){
 *         const e=t.name.substring(0,t.name.lastIndexOf("."));
 *         if(e.length<6) return void Message.error("文件名格式错误："+t.name);
 *         const r=e.substring(0,6), i=e.substring(6),
 *               o=this.data.findIndex(e=>{ if(!e.card||!e.name) return !1;
 *                 const t=e.card.length>=6?e.card.substring(e.card.length-6):e.card;
 *                 return t===r&&e.name===i })
 *         -1!==o ? this.$set(this.data[o],"head",n.url) : Message.error("未找到匹配的人员："+t.name)
 *       } else Message.error("文件上传失败")
 *     })
 *   }
 * 匹配规则：文件名（去扩展名）前 6 位 === 身份证号后 6 位，且剩余部分 === 姓名。
 */
function uploadSuccessBatch(res, file) {
  const info = {}
  info.filename = file.name
  info.type = file.raw.type
  info.size = file.size
  info.url = host + res.key

  fileApi.saveFileInfo(info).then(({ data: body }) => {
    if (body.code === 0) {
      const nameNoExt = file.name.substring(0, file.name.lastIndexOf('.'))
      if (nameNoExt.length < 6) {
        ElMessage.error('文件名格式错误：' + file.name)
        return
      }
      const cardTail = nameNoExt.substring(0, 6)
      const personName = nameNoExt.substring(6)
      const idx = data.value.findIndex((item) => {
        if (!item.card || !item.name) return false
        const tail = item.card.length >= 6 ? item.card.substring(item.card.length - 6) : item.card
        return tail === cardTail && item.name === personName
      })
      if (idx !== -1) data.value[idx].head = info.url
      else ElMessage.error('未找到匹配的人员：' + file.name)
    } else {
      ElMessage.error('文件上传失败')
    }
  })
}

/**
 * dist:
 *   beforeUpload(e){
 *     this.QiniuData.key="ylbxt/", this.filename=e.name;
 *     const t="image/jpeg"===e.type;
 *     this.QiniuData.key+=this.rename(e.name);
 *     const n=e.size/1024/1024<.1;
 *     return n ? (t ? (t&&n) : (Message.error("格式只能是jpg"),!1))
 *              : (Message.error("文件大小不能超过100k"),!1)
 *   }
 * 注意 dist 的顺序：先重置 key、再追加随机名（**每次 beforeUpload 都会重置**，
 * 所以这里不存在 UploadScanDialog 那种 key 累加的缺陷），再判体积、后判格式。
 */
function beforeUpload(file) {
  /*
   * 【第十二届改造】红头文件要求：
   *   - 师生电子照片：蓝底、免冠证件照、JPG、每张不超过 100KB
   *   - 学生照片命名：「身份证后6位+姓名.jpg」
   *   - 教师照片命名：「按系统规定命名」
   * 客户端硬校验（JPG + ≤100KB），蓝底与命名格式仅在前端提示，无法像素级校验。
   * 【保留 dist 缺陷】QiniuData.key 每次都重置（不会累加），故此处写法正确。
   */
  QiniuData.key = 'ylbxt/'
  filename = file.name

  const isJpg = file.type === 'image/jpeg'
  QiniuData.key += rename(file.name)

  // dist 原文顺序：先判体积、再判格式（保留）
  const sizeOk = file.size / 1024 < 100
  if (!sizeOk) {
    ElMessage.error('文件大小不能超过100KB')
    return false
  }
  if (!isJpg) {
    ElMessage.error('照片格式只能是JPG')
    return false
  }
  return isJpg && sizeOk
}

/** dist: getQiniuToken(){ $api.communal.getQiNiuToken().then(({data:e})=>{ 0===e.code ? this.QiniuData.token=e.uptoken : Message.error(e.msg) }) } */
function getQiniuToken() {
  qiniuApi.getToken().then(({ data: body }) => {
    if (body.code === 0) QiniuData.token = body.uptoken
    else ElMessage.error(body.msg)
  })
}

defineExpose({ getData, getCacheData })
</script>

<style lang="scss" scoped>
/* dist/css/chunk-0294a80a.260c9e35.css 中 [data-v-5568d648] 的全部 10 条规则 */
.container {
  margin-bottom: 10px;
}

.box {
  overflow-x: auto;
  text-align: center;
}

.box-line-title,
.box-line {
  display: grid;
  grid-template-columns: 50px 120px 180px 120px 130px 140px 150px 130px 130px 140px 140px 160px;
  justify-content: stretch;
}

.box-col {
  border-left: 1px solid #8c939d;
  border-bottom: 1px solid #8c939d;
  padding: 5px 10px;
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

.sticky-column {
  position: sticky;
  right: 0;
  background-color: #fff;
  z-index: 10;
  border-right: 1px solid #ddd;
}
</style>
