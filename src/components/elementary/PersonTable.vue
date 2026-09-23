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
              <p style="color: red; margin-bottom: 10px">注：电子照片要求为蓝底免冠证件照，JPG格式，每张不超过100KB；上传文件名格式为：学生照片以学生身份证号后6位命名，例如：<span style="color: black">123456.jpg</span>则与身份证号码后六位为 <span style="color: black">123456 </span>的人员对应；教师照片命名规则以教师姓名+教师身份证号后6位命名，例如：<span style="color: black">张三123456.jpg</span>则与身份证号码后六位为 <span style="color: black">123456</span> 且姓名为 <span style="color: black">张三</span> 的人员对应。</p>
      <el-upload
        class="import-bar"
        style="display: inline-flex; align-items: center; flex-wrap: wrap; gap: 8px"
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
          style="display: inline-block"
          :http-request="uploadFileBatch"
          :before-upload="beforeUpload"
          multiple
          accept="image/jpeg"
          :show-file-list="false"
        >
          <el-button style="color: #1890ff" type="text">批量上传照片</el-button>
        </el-upload>

        <el-upload
          :http-request="uploadFileSingle"
          :before-upload="beforeUploadSingle"
          hidden
          :show-file-list="false"
        >
          <button ref="uploadAvatar" type="button">click</button>
        </el-upload>
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
        <div class="box-col">身份</div>
        <div class="box-col">角色</div>
        <div class="box-col">使用乐器</div>
        <div class="box-col">电子照片</div>
        <div class="box-col sticky-column">操作</div>
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
          <el-select v-model="item.type" placeholder="请选择">
            <el-option label="学生" :value="0" />
            <el-option label="教师" :value="1" />
          </el-select>
        </div>
        <div class="box-col">
          <el-select v-model="item.position" placeholder="请选择">
            <el-option label="正式队员" :value="0" />
            <el-option label="预备队员" :value="1" />
            <el-option label="指挥" :value="2" />
          </el-select>
        </div>
        <div class="box-col">
          <el-select v-model="item.instrument" placeholder="请选择">
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
          <el-button @click="upAvatar(index)">上传照片</el-button>
          <el-button type="danger" @click="remove(index)">删除</el-button>
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
 * 该模块被 14 个报名/修改页共用（dist 事实），在这些页面里 import 为 `Person`（模板中写作 <Person>）。
 * 取证方式同 TeacherTable：检索 `n("db6d")` 命中 14 个路由 chunk，模块体字节完全相同。
 * 本项目中由 OrchestraForm.vue 与 ProgramForm.vue 共用，覆盖 8 条路由：
 *   /city|school/elementary/{create, edit/:id}
 *   /city|school/teacher/{create, edit/:id}
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
 *    → 【第十二届改造·第二轮】`let filename` 已删除：它唯一的用途是给七牛上传的
 *      info.filename 赋值（见下方缺陷 f），改用 options.file.name 现取后失去意义。
 *      `let Arrayindex` 保留 —— upAvatar 写入、uploadFileSingle 读取，与上传通道无关。
 *
 * 3) 工具 / 接口来源（dist 是全局的，本项目改为显式 import）
 *    - this.$api.files.saveFileInfo   → `import { fileApi } from '@/api/misc'` → fileApi.saveFileInfo
 *    - this.$api.communal.getQiNiuToken → `import { qiniuApi } from '@/api/misc'` → qiniuApi.getToken
 *      （两处映射均已核对 src/api/misc.js 的实际导出名）
 *      → 【第十二届改造·第二轮】该映射连同 qiniuApi 导入一并删除，见下方 7)。
 *    - this.rename(...)               → `import { rename } from '@/utils/excel'`
 *      → 【第十二届改造·第二轮】该导入已删除：它只用于给七牛拼 ObjectKey。
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
 * 4) `size="mini"` 已移除
 *    【dist 已确认】Element Plus 只认 large/default/small，`mini` 不被识别、每次渲染告警一次；
 *    而 EP 中没有 `.el-input--mini` / `.el-select--mini` / `.el-button--mini` 任何规则，
 *    该属性本来就不产生样式，删掉是零视觉变化。**未**改成 small —— `.el-input--small` 等
 *    是真实尺寸规则，会把输入框/按钮压小。
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
 * 7) 【第十二届改造·第二轮】上传通道：七牛直传 → 阿里云 OSS（biz: image）
 *    小文件改由后端代传进 OSS，经 @/services/ossUpload 的 uploadToOss()。
 *    本组件共 3 个 el-upload，只动前两个（**外层那个是 Excel 导入，纯本机解析、
 *    不联网，保持原样**）：
 *      - 内层「批量上传头像」：`:action`/`:data`/`:on-success` → `:http-request="uploadFileBatch"`
 *      - 内层「单张上传头像」：同上 → `:http-request="uploadFileSingle"`
 *    脚本侧删除 QiniuData / domain / host / filename / getQiniuToken() / qiniuApi 导入 /
 *    rename 导入；`onMounted` 里那次 getQiniuToken() 预取随之去掉。
 *    ⚠️ 成功后的业务逻辑逐字保留，一步都没省：仍然调 fileApi.saveFileInfo(info)
 *      （info 的 filename/type/size/url 四个字段同名同义），仍然在 body.code===0 时
 *      回写 `data.value[...].head`；批量的匹配算法见 uploadFileBatch —— 第十二届已由
 *      「身份证后6位+姓名」改为师生两套命名，不再是原样。
 *    注意本组件的体积上限比后端规则更严（这里 100KB，后端 image 规则是 1MB），
 *    前面那道 beforeUpload 是主闸，biz: image 只作兜底。
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
 *      → 【第十二届改造·第二轮已消灭】单张上传改用 `file.name` 现取，
 *        这条串号风险不复存在（见下方 7)。
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

import { ref, onMounted, nextTick, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { fileApi } from '@/api/misc'
import { downloadStaticFile } from '@/utils/excel'
import { xlsx2json } from '@/utils/xlsx'
import { uploadToOss } from '@/services/ossUpload'
import { checkPersonBasics } from '@/config/personFields'
import { useDragScroll } from '@/composables/useDragScroll'

// 12 列下限合计 1376px，1366/1440 乃至 1600/1680 屏都放不下，只能横向滚。
// 横向滚动条贴在表格最下方、又只有十几像素高，很难拉 —— 于是支持按住空白处直接拖。
const boxRef = ref(null)
useDragScroll(boxRef)

const props = defineProps({
  /** 父组件传入的名单数组（通常是 form.person），可为 undefined / null */
  showdata: { default: undefined }
})

const data = ref([])
// 【第十二届改造·第二轮】QiniuData / domain / host / filename 已移除：
// 上传改走阿里云 OSS（biz: image，小文件由后端代传），key 由后端生成、
// url 由上传服务返回，前端不再硬编码七牛域名。

/** 部署前缀（dist 是写死的 "/ylbxt/"），用法见文件头「移植理由 3」最后一段 */
const BASE = import.meta.env.BASE_URL

/** 隐藏的单个头像上传 input 的触发按钮（dist: this.$refs.uploadAvatar） */
const uploadAvatar = ref(null)

/* dist 里这个是「挂在 this 上、未写进 data」的实例属性，见文件头「移植理由 2」。
   同组的 filename 已随七牛链路移除（原名改用 options.file.name 现取）。 */
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
  // 【第十二届改造·第二轮】此处原先预取七牛 uptoken（getQiniuToken()）。
  // 改走 OSS 后凭证由上传服务在真正要传时才取，不再需要挂载时预取。
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
  // 【第十二届·补格式校验】以上全是 dist 原判定 —— 它们只回答"填没填"，
  // 于是姓名填「123」、身份证少两位、年龄填 -5、学校填「12345」、电话填 10 位
  // 都能一路提交到后端（后端 card 是 CharField，也没有格式约束）。
  // 规则集中在 config/personFields.js，与 Excel 导入那条路径共用同一份。
  // 放在**最后**是为了不改动上面任何一条的优先级：先报"缺了什么"，再报"填错了什么"。
  const formatErr = checkPersonBasics(item)
  if (formatErr) return { flag: false, msg: formatErr }
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
  // 【第十二届·补格式校验】理由同 checkLine 末尾：导入路径是把单元格文本原样透传的，
  // 校验不在这里挡住，脏数据就直接进库了（乐器字段已经栽过一次，见 personRules.js）。
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
 *
 * 【第十二届改造】下面这两处的顺序**故意与 dist 不同，不要照 dist 还原**：
 *   a. dist 先 `this.data=[]` 再逐行校验 → 改成了先校验、通过后才清表（失败不清表）
 *   b. dist 重建行时不带 head → 改成按 card 把旧头像捞回来
 * 原因见函数体里的注释。
 */
function importExcel(file) {
  const ext = file.name.split('.')[1]
  const valid = ['xlsx', 'xlc', 'xlm', 'xls', 'xlt', 'xlw', 'csv'].some((e) => e === ext)
  if (!valid) return ElMessage.error('格式有误')

  xlsx2json(file).then((res) => {
    if (res && res.length > 0) {
      // 【第十二届】原为 `const sheet = res[0].sheet` —— 无条件取工作簿的第一张工作表。
      // xlsx2json 只把行数组放进 `sheet`、丢掉了表名（见 src/utils/xlsx.js 的返回结构），
      // 这里拿不到表名，故无法「优先找用户表」，只能取「第一张有数据的表」。
      // 原写法在数据不在第一张表时（如新建工作簿时 Excel 默认留一张空的 Sheet1 在前）
      // 会取到空表：下面两个 for 循环都不执行、一个提示都不弹，表却被 data.value = []
      // 清空 —— 表现为静默清空。此处改为明确报错。
      // 「有数据」的判据是 length > 1：sheet_to_json 把工作表第 1 行当表头，官方模板
      // 第 2 行的中文标签行成为下标 0，数据从下标 1 起，故只有标签行时 length === 1。
      // 官方模板只有一张名为「用户表」的工作表，故对官方模板行为完全不变。
      const sheet = res.map((item) => item.sheet).find((s) => s && s.length > 1)
      if (!sheet) {
        return ElMessage.error('导入失败！未找到可导入的数据，请确认使用官方模板、且未删除表头')
      }

      // 【第十二届】把校验挪到清表之前。dist 原实现是「先 data.value = [] 再逐行校验」，
      // 于是导入一个第 N 行有错的 Excel，会先把整张表（含已上传头像）清空再报「导入失败」
      // —— 用户以为什么都没发生，其实数据已经没了。
      for (let i = 1; i < sheet.length; i++) {
        // 【dist 已知缺陷】dist 遗留的调试输出，原样保留
        console.log(sheet[i])
        const result = exportCheck(sheet[i])
        if (!result.flag) {
          return ElMessage.error('导入失败！参演人员名单第' + i + '行' + result.msg)
        }
      }

      // 【第十二届】重建前按身份证号留一份旧头像。新行对象里没有 head 字段，不捞回来的话
      // 编辑页回填的照片、以及上一轮已经上传的头像，重新导入后会全部消失。
      // 用 card 而不是行序：改完 Excel 重导时行序经常变，按序会张冠李戴；card 也是
      // uploadFileBatch 匹配用的同一个键，口径一致。
      const oldHeads = {}
      data.value.forEach((item) => {
        if (item.head && item.card) oldHeads[item.card] = item.head
      })

      data.value = []
      for (let i = 1; i < sheet.length; i++) {
        const row = {
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
        }
        // 身份证号对得上才带回旧头像；不带这个 key 时行对象与原来完全同构
        if (row.card && oldHeads[row.card]) row.head = oldHeads[row.card]
        data.value.push(row)
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

/*
 * 【第十二届改造·第二轮】上传通道由七牛直传换成阿里云 OSS（biz: image）。
 * 原来是 `:on-success` 回调 uploadSuccess / uploadSuccessBatch，现在改为
 * `:http-request` 调统一上传服务，成功后的落库与回写逻辑逐字保留：
 *   - 单张：fileApi.saveFileInfo({filename,type,size,url}) → body.code===0 时写 head
 *   - 批量：同上，再按「学生=身份证后6位、教师=姓名+身份证后6位」匹配到行
 *
 * 【为什么处理器不返回 Promise】Element Plus 只在 httpRequest 返回 Promise 时才跑
 * 自己那套内部成功路径（往 fileList 里塞条目），本组件靠 :show-file-list="false"
 * 不显示列表，返回非 Promise 让行为完全由下面的 .then 控制。
 *
 * 【顺带修掉的缺陷】dist 的 uploadSuccess 用 `info.filename = this.filename`
 * （也就是 beforeUpload 里存下的那个模块级变量，见文件头「dist 已知缺陷 f」），
 * 并发上传时有串号风险；改用 options.file.name 现取，不再共享状态。
 */

/** dist 原文见 git 历史：uploadSuccess(e,t){ n.filename=this.filename, ... } */
function uploadFileSingle(options) {
  const file = options.file
  uploadToOss({ file, biz: 'image' })
    .then(({ url }) => {
      const info = {}
      info.filename = file.name
      info.type = file.type
      info.size = file.size
      info.url = url

      fileApi.saveFileInfo(info).then(({ data: body }) => {
        if (body.code === 0) data.value[Arrayindex].head = info.url
        else ElMessage.error('文件上传失败')
      })
    })
    .catch((err) => {
      if (!err.shown) ElMessage.error(err.message || '文件上传失败')
    })
}

/**
 * dist 原文见 git 历史：uploadSuccessBatch(e,t){ n.filename=t.name, ... }
 * 匹配规则（【第十二届】已由 dist 的「前 6 位=身份证后6位 且 剩余=姓名」改为师生两套）：
 *   - 学生照片：去扩展名后整段是 6 位数字 = 身份证后 6 位，且该行身份为「学生」
 *   - 教师照片：去扩展名后尾部 6 位 = 身份证后 6 位、前面 = 姓名，
 *               且该行身份为「教师」、姓名一致
 *   两种命名都不是的（如 7 位纯数字）报「文件名格式错误」，不猜。
 */
function uploadFileBatch(options) {
  const file = options.file
  uploadToOss({ file, biz: 'image' })
    .then(({ url }) => {
      const info = {}
      info.filename = file.name
      info.type = file.type
      info.size = file.size
      info.url = url

      fileApi.saveFileInfo(info).then(({ data: body }) => {
        if (body.code === 0) {
          // 【第十二届】师生两套命名：学生 = 身份证后6位；教师 = 姓名 + 身份证后6位
          const nameNoExt = file.name.substring(0, file.name.lastIndexOf('.'))
          const parsed = parsePhotoName(nameNoExt)
          if (!parsed) {
            // beforeUpload 已经拦过一次格式；这里留一道，防有人改绑定时漏掉
            ElMessage.error('文件名格式错误：' + file.name)
            return
          }
          const { cardTail, personName } = parsed

          // 【第十二届】收集全部命中再判，而不是 findIndex 取第一个：后 6 位重复时
          // 原来会静默把照片写到第一行并报成功，第二个人看起来是「没传上」。
          const hits = []
          data.value.forEach((item, i) => {
            if (!item.card) return
            const tail = item.card.length >= 6 ? item.card.substring(item.card.length - 6) : item.card
            if (tail !== cardTail) return
            // 学生照片只看身份证后6位、要求该行身份是「学生」；教师照片还要姓名一致
            const matched = personName ? item.type === 1 && item.name === personName : item.type === 0
            if (matched) hits.push(i)
          })

          if (hits.length === 0) {
            ElMessage.error((personName ? '未找到匹配的教师：' : '未找到匹配的学生：') + file.name)
          } else if (hits.length > 1) {
            ElMessage.error(
              '无法唯一匹配：' + file.name + ' —— 本表身份证号后6位为 ' + cardTail + ' 的有 ' +
                hits.length + ' 人（第 ' + hits.map((i) => i + 1).join('、') +
                ' 行），请改用「上传照片」按行单独传'
            )
          } else {
            const target = data.value[hits[0]]
            // 【第十二届】重传覆盖是正常路径（换照片），但要让「覆盖了别人」变得可见
            if (target.head) {
              ElMessage.success(
                '第 ' + (hits[0] + 1) + ' 行' + (target.name ? ' ' + target.name : '') + ' 的照片已替换'
              )
            }
            target.head = info.url
          }
        } else {
          ElMessage.error('文件上传失败')
        }
      })
    })
    .catch((err) => {
      if (!err.shown) ElMessage.error(err.message || '文件上传失败')
    })
}

/**
 * 【第十二届】从「去掉扩展名的文件名」里解析出身份证后 6 位 + 姓名（仅教师）。
 * 解析不出来返回 null。beforeUpload 与 uploadFileBatch 共用这一份判据，
 * 避免两处正则各写一遍后漂移。
 *   学生：`123456`      → { cardTail: '123456', personName: '' }
 *   教师：`张三123456`  → { cardTail: '123456', personName: '张三' }
 */
function parsePhotoName(nameNoExt) {
  if (/^\d{6}$/.test(nameNoExt)) {
    return { cardTail: nameNoExt, personName: '' }
  }
  if (/^\D.*\d{6}$/.test(nameNoExt)) {
    return { cardTail: nameNoExt.slice(-6), personName: nameNoExt.slice(0, -6) }
  }
  return null
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
 * 注意 dist 的顺序：先判体积、后判格式，下面逐字保留。
 *
 * 【第十二届改造·第二轮】删去写 QiniuData.key / filename 的两行（以及只服务于
 * 拼 key 的 rename 导入）：key 改由后端生成，文件名由处理器从 options.file 现取。
 */
function beforeUpload(file) {
  /*
   * 【第十二届改造】红头文件要求：
   *   - 师生电子照片：蓝底、免冠证件照、JPG、每张不超过 100KB
   *   - 学生照片命名：「身份证后6位.jpg」
   *   - 教师照片命名：「姓名+身份证后6位.jpg」
   * 客户端硬校验：JPG + ≤100KB + 命名格式；只有「蓝底」无法像素级校验，仅在前端提示。
   */
  const isJpg = file.type === 'image/jpeg'

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
  // 【第十二届】命名格式硬校验。原来只在 uploadFileBatch 里判，那时文件已经传上 OSS
  // 并写进 files 表 —— 格式错的照片就成了没人认领的孤儿文件。前移到 here：格式不对
  // 直接不发请求。批量直接绑本函数，单张经 beforeUploadSingle 调进来，两路都过这道。
  const nameNoExt = file.name.substring(0, file.name.lastIndexOf('.'))
  if (!parsePhotoName(nameNoExt)) {
    ElMessage.error(
      '文件名格式错误：' + file.name + '（学生照片：身份证号后6位；教师照片：姓名+身份证号后6位）'
    )
    return false
  }
  return isJpg && sizeOk
}

/**
 * 【第十二届】单独上传头像的校验器 —— **只给隐藏的那条单张 el-upload 用**
 * （模板里绑的是它，不是 beforeUpload）。
 *
 * 【为什么另起一个函数，而不是全塞进 beforeUpload】
 * beforeUpload 是两条路共用的「基础闸」：批量直接绑它，单张经本函数调它，所以它只能判
 * 格式/体积这类「与哪一行无关」的事。而「文件名对不对得上这一行的人」需要行下标与行内
 * 姓名/身份证号，只有单张路径拿得到 —— 这正是下面这段的职责。
 *
 * 【格式校验已在 beforeUpload 里做过一遍】
 * 所以对「格式就不合法」的文件（如 照片.jpg），用户看到的是 beforeUpload 那句格式提示；
 * 只有格式合法但写错人时，才落到下面这句「请改为 xxx.jpg」。单张不靠文件名定位（走
 * upAvatar 存下的行下标 Arrayindex），这里的校验只为让入库的 Files.filename 与批量
 * 上传同一口径（`info.filename = file.name` 会落库，后端只 setdefault 不校验）。
 *
 * 规则与 uploadFileBatch 完全一致：
 *   - 学生行：去扩展名后 === 该行身份证号后 6 位
 *   - 教师行：去扩展名后 === 该行姓名 + 该行身份证号后 6 位
 */
function beforeUploadSingle(file) {
  // 格式 / 体积沿用批量那套，逻辑一个字不重写
  if (!beforeUpload(file)) return false

  const item = data.value[Arrayindex]
  if (!item) {
    // Arrayindex 是模块级变量，正常路径下由 upAvatar 刚刚写入；这里是防哑雷
    ElMessage.error('未定位到人员行，请重新点击该行的「上传照片」')
    return false
  }
  if (item.type !== 0 && item.type !== 1) {
    ElMessage.error('请先选择该行的身份，再上传照片')
    return false
  }
  if (!item.card) {
    ElMessage.error('请先填写该行的身份证号，再上传照片')
    return false
  }
  const isTeacher = item.type === 1
  if (isTeacher && !item.name) {
    ElMessage.error('请先填写该行的姓名，再上传照片')
    return false
  }

  // 身份证短于 6 位时按整串比对，与 uploadFileBatch 的取法保持一致
  const tail = item.card.length >= 6 ? item.card.substring(item.card.length - 6) : item.card
  const expected = isTeacher ? item.name + tail : tail
  const actual = file.name.substring(0, file.name.lastIndexOf('.'))
  if (actual !== expected) {
    ElMessage.error('文件名不符合命名规则，请改为：' + expected + '.jpg 后再上传')
    return false
  }
  return true
}

/* 【第十二届改造·第二轮】getQiniuToken() 已删除。
   dist: getQiniuToken(){ $api.communal.getQiNiuToken().then(...) }
   它原来只在 onMounted 里被调用一次，用途是把七牛 uptoken 填进 QiniuData.token。
   改走阿里云 OSS 后凭证由 @/services/ossUpload 在真正要上传时才取，挂载时预取没有必要。 */

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

/* 【列宽依据 —— 与 TeacherTable.vue 总宽恒等，且任何宽度下都不截断文字】
 *
 * 用户要求：「指导老师和参展人员的框大小和宽度保持一致……
 * 里面的字（如 placeholder="请输入姓名"）要看得完整……现在是教师的要短一点」。
 *
 * 【先更正一条旧注释里的错误测量】上一版这里写「1440 屏下容器实测 1404px」，
 * 是错的：1440 视口下侧栏 200px、el-main 左右 padding 40px、.bg4 左右 padding 20px，
 * 留给 .box 的实宽只有 1180px（已在浏览器里按真实布局链重量过）。
 * 1404px 对应的是 1680 视口。旧值合计 1382px 在 1440 屏下其实**是横向滚动的**，
 * 操作列的 sticky 遮盖问题也并未真正消除。
 *
 * 现在改用 minmax(下限px, 权重fr)，两条要求各由一半保证：
 *   ① 全部轨道都是 fr → 永远把 .box 铺满；两表的 .box 同宽，
 *      所以任何分辨率下两表总宽都严格相等；
 *   ② 下限 = 该列内容一个不落所需的最小列宽，窗口再窄也不截断。
 *      旧值 96px 的姓名列留给输入框只有 61px，装不下 70px 宽的「请输入姓名」；
 *      72px 的性别列只剩 15px，连「请选择」都看不全。现在都不会了。
 *
 * 下限怎么来的（浏览器实测，不是估的）：
 *   列宽下限 = 文本宽 + .box-col 左右 padding 5×2 + 左边框 1 + 控件自身 chrome
 *   · 输入框 chrome：.el-input__wrapper 的 padding 1px 11px → 22px
 *   · 下拉框 chrome：.el-select__wrapper 的 padding 12×2 + gap 6 + 箭头 14 → 44px
 *   · 文本宽：14px 字号下中文一字 14px；18 位身份证约 145px；使用乐器「次中音萨克斯」84px
 *   12 列下限合计 1376px ≤ 旧值 1382px，窄屏不会比改动前更容易横向滚动。
 *
 * fr 权重怎么定：**数值 = 参照容器 1660px 时希望该列得到的像素宽 ÷ 100**。
 *   1660px 是目前最常见的 1920 屏下 .box 的实宽（1440 视口同式得 1180）。
 *   权重和 16.60 恰好 = 参照容器 ÷ 100，所以 1660px 下每条轨道就等于设计值。
 *   实测：1660px → 55/144/194/112/119/239/154/112/121/164/78/168；
 *   1180px（1440 屏）→ 30/105/178/99/105/136/99/99/113/141/72/168；
 *   3420px（4K）同样不截断。
 *
 * 【为什么不跟 TeacherTable 的前 7 列逐列对齐】
 *   两表列数不同（12 列 vs 8 列），「总宽相等」与「前 7 列逐列对齐」数学上不可兼得 ——
 *   若强行对齐，TeacherTable 凑满本表宽度后多出的 500 多 px 只能全塞进「操作」一列。
 *   用户这次明确要的是「两个表的长度宽度都要一致」，所以取等宽、放弃逐列对齐。
 *   改这里的任一个 fr 权重，必须同步改 TeacherTable.vue 的对应权重，
 *   否则两张表的总宽不再相等（这是本轮唯一需要两个文件同步的地方）。 */
.box-line-title,
.box-line {
  display: grid;
  /*                     序号        姓名         身份证号      性别        年龄         学校名称      联系电话      身份        角色         使用乐器      电子照片      操作 */
  grid-template-columns:
    minmax(30px, 1.00fr) minmax(105px, 1.45fr) minmax(178px, 1.95fr) minmax(99px, 1.12fr)
    minmax(105px, 1.20fr) minmax(133px, 2.40fr) minmax(133px, 1.55fr) minmax(99px, 1.12fr)
    minmax(113px, 1.22fr) minmax(141px, 1.65fr) minmax(72px, 0.78fr) minmax(168px, 1.61fr);
  justify-content: stretch;
}

/* padding 6px → 5px：每列给文字区让出 2px，12 列合计 24px 的下限余量（见上）。
 * display:flex + 居中与 TeacherTable 的 .box-col 保持一致。 */
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

.sticky-column {
  position: sticky;
  right: 0;
  background-color: #fff;
  z-index: 10;
  border-right: 1px solid #ddd;
}

/* 「下载模板 / 批量导入 / 添加一行 / 清空 / 批量上传头像」这一排按钮。
   它们分散在 Upload 根 / UploadContent / 内层 Upload 三种容器里，改前实测间距是
   0 / 8 / 8 / 10px，且「批量导入」「批量上传头像」比中间三个高 1.2px —— 前者因为在
   inline-flex 的 UploadContent 里，后者因为 el-button 的相邻 margin-left 只对相邻兄弟生效。
   现在由 .import-bar 的 flex + gap:8px 统一发间距、align-items:center 对齐基线，
   所以必须把 el-button 自带的相邻 margin-left:8px 清掉，否则会变成 8+8=16px。 */
.import-bar > .el-button {
  margin-left: 0;
}
</style>
