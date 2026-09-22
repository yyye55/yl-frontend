<template>
  <div class="container">
    <div class="options">
      <!--
        dist 原文（模块 5824）：
          t("el-upload",{ref:"upload",attrs:{action:"/","show-file-list":!1,"on-change":e.importExcel,"auto-upload":!1}},[
            下载模板(el-button type="text" color:#1890FF, click → downloadStaticFile("/ylbxt/static/参演人员导入模板1.xlsx","参演人员导入模板.xlsx")),
            批量导入(el-button type="text" slot="trigger"),
            添加一行(el-button type="text" click:add),
            清空(el-button type="text" click:flush)
          ])

        【Element Plus 适配】`slot="trigger"` → `<template #trigger>`：
        与 @/components/elementary/PersonTable.vue 里的同款适配一致 —— Element Plus 把 trigger
        放进 uploadContent 内部（唯一可点开文件选择框的区域），其余默认插槽子节点渲染在其后，
        与 Element UI 2 的 `this.$slots.trigger ? [o, this.$slots.default] : o` 产出相同的 DOM 顺序。

        【为什么没有「批量上传头像」】本变体（5824）**整块没有** qiniu 上传：既没有上传组件，
        也没有 getQiniuToken / QiniuData / beforeUpload。这与 db6d（PersonTable.vue）不同，
        是本变体被单独拆出来的主要原因。
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
          @click="downloadStaticFile(BASE + 'static/参演人员导入模板1.xlsx', '参演人员导入模板.xlsx')"
        >
          下载模板
        </el-button>

        <template #trigger>
          <el-button style="color: #1890ff" type="text">批量导入</el-button>
        </template>

        <el-button style="color: #1890ff" type="text" @click="add">添加一行</el-button>
        <el-button style="color: #1890ff" type="text" @click="flush">清空</el-button>
      </el-upload>
    </div>

    <div class="box">
      <!-- dist 里是编译期提升的静态子树 e._m(0)；11 列，与 CSS 的 grid-template-columns 一一对应 -->
      <div class="box-line-title">
        <div class="box-col">序号</div>
        <div class="box-col">姓名</div>
        <div class="box-col">身份证号</div>
        <div class="box-col">性别</div>
        <div class="box-col">年龄</div>
        <div class="box-col">学校名称</div>
        <div class="box-col">专业名称</div>
        <div class="box-col">联系电话</div>
        <div class="box-col">身份</div>
        <div class="box-col">角色</div>
        <div class="box-col">操作</div>
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
            <el-option label="男" :value="0" />
            <el-option label="女" :value="1" />
          </el-select>
        </div>
        <div class="box-col">
          <el-input v-model="item.age" type="number" placeholder="请输入年龄" size="mini" />
        </div>
        <div class="box-col">
          <el-input v-model="item.school" placeholder="请输入学校全称" size="mini" />
        </div>
        <div class="box-col">
          <el-input v-model="item.major" placeholder="请输入专业名称" size="mini" />
        </div>
        <div class="box-col">
          <el-input v-model="item.phone" placeholder="请输入联系电话" size="mini" />
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
            <el-option label="伴奏" :value="3" />
          </el-select>
        </div>
        <div class="box-col">
          <el-button type="danger" size="mini" @click="remove(index)">删除</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * PersonTableMajor —— 「参展人员」名单表格（dist 模块 5824，组件名 name:"Student"）
 *
 * ===========================================================================
 * 一、它和 PersonTable.vue（dist 模块 db6d）是什么关系
 * ===========================================================================
 * dist 里存在**两个**同名 `name:"Student"` 的参演人员表格，差别很大：
 *
 * | 轴 | db6d（→ PersonTable.vue） | 5824（→ 本文件） |
 * |---|---|---|
 * | 列数 / CSS grid | 12 列 | **11 列** |
 * | 乐器/照片列 | 有「使用乐器」「电子照片」 | **无**（取而代之的是「专业名称」） |
 * | 批量上传头像 | 有（2 个 qiniu el-upload） | **没有**，整块无 qiniu |
 * | onMounted 取七牛 token | 有 | **没有** |
 * | 顶部按钮 | 下载模板/批量导入/添加一行/清空/批量上传头像 | 下载模板/批量导入/添加一行/清空 |
 * | 额外说明红字 | 有（电子照片要求…） | 无 |
 * | scope 样式 id | — | `52fa82de` |
 *
 * **谁用哪一个**（已用脚本从各模块的 `components:{…Person:X["a"]}` 反解 import 绑定得到）：
 *   60d5 = /province/school/create      → Teacher:1607, Person:**5824**
 *   c589 = /province/school/edit/:id    → Teacher:1607, Person:**5824**
 *   5382 / 5e02 / 其余                    → Teacher:1607, Person:**db6d**
 * 即**只有两个校级「大学组」页面**用本变体。这不是推断：先由双跑探针对照发现
 * 重建产物在这两个路由上多渲染了「使用乐器/电子照片/批量上传头像」、
 * 且多发了一次 `/api/qiniu/token`，再回到 dist 原文反解注册表确认的。
 *
 * ===========================================================================
 * 二、字段名（逐字照搬 dist，未做规范化）
 * ===========================================================================
 * 行对象字段为 `name / card / age / gender / school / major / phone / type / position`
 * （注意是 `card` 不是 `idcard`，是 `major` 不是 `speciality`）。
 * gender: 0=男 1=女；type: 0=学生 1=教师；position: 0=正式队员 1=预备队员 2=指挥 3=伴奏。
 *
 * ===========================================================================
 * 三、dist 已知缺陷（保持原行为，仅记录）
 * ===========================================================================
 * 【低】`importExcel` 里对每一行都执行 `console.log(row)`（dist 原文），会往控制台刷数据。
 *   与 PersonTable.vue 的处理一致，原样保留并在此标注。
 * 【低】扩展名判定用 `name.split('.')[1]`：多后缀文件名（如 `a.b.xlsx`）会取到 `b` 而误报「格式有误」。
 * 【低】导入报错里的行号用的是 sheet 内下标（从 1 起），与用户在 Excel 里看到的行号差 1 行。
 * 【低】`exportCheck` 只在 `type === '学生'` 时才要求「专业名称」，而 `checkLine`（手动填表）
 *   对所有行都要求「专业名称」—— 两条校验路径对同一字段的严格程度不一致，原样保留。
 * 【低】`data()` 里的 `msg` / `number` 声明后从未被读取（`number` 只在 importExcel 里被写入），
 *   属冗余字段，不迁移。
 * 【低】外层 el-upload 上的 `ref:"upload"` 从未被读取，不迁移（与 PersonTable.vue 同处理）。
 *
 * ===========================================================================
 * 四、Vue 2 → Vue 3 迁移点
 * ===========================================================================
 * 1) 全局插件 `Vue.prototype.xlsx2json` → `import { xlsx2json } from '@/utils/xlsx'`
 *    （该文件同时记录了它与 `@/utils/excel.js` 里同名函数返回结构不同这件事）。
 * 2) 全局插件 `Vue.prototype.downloadStaticFile` → `import { downloadStaticFile } from '@/utils/excel'`
 *    （该项目内实现与 dist 逐字节相同，故直接复用而非另写一份）。
 * 3) 模板里写死的 `"/ylbxt/static/…"` → `BASE + 'static/…'`（BASE = import.meta.env.BASE_URL）。
 *    这是本文件对 dist 常量的**唯一**有意改动：文件实体在 `frontend/public/static/`，
 *    生产环境下 BASE 就是 `/ylbxt/`，解析结果与 dist 完全一致；写死则开发环境会 404。
 *    与 PersonTable.vue 的处理保持一致，遵循项目「部署前缀单一来源」的既有约定。
 * 4) `this.$set(item,"k",v)` → 直接赋值（`data` 是 ref 数组，其元素在 Vue 3 中已是深层响应式）。
 * 5) `watch:{showdata(e){this.data=e}}` + `mounted(){this.$nextTick(...)}` → 同构的 watch + onMounted(nextTick)。
 * 6) `Message.error` → `ElMessage.error`（经 ElementPlusResolver 自动引入）。
 * 7) `props:["showdata"]` → `defineProps({ showdata: { default: undefined } })`。
 * 8) `defineExpose({ getData, getCacheData })`：对应 dist 里父组件通过 `this.$refs.person.getData()`
 *    / `getCacheData()` 的调用（ProgramForm 依赖于这两个方法，见其 onSubmit / tempSave）。
 *
 * 【保留未改】`size="mini"`：Element Plus 只认 large/default/small，留到设计系统轮统一处理。
 */
import { ref, onMounted, nextTick, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { downloadStaticFile } from '@/utils/excel'
import { xlsx2json } from '@/utils/xlsx'
import { checkPersonBasics } from '@/config/personFields'

const props = defineProps({
  /** 父组件传入的名单数组（通常是 form.person），可为 undefined / null */
  showdata: { default: undefined }
})

const data = ref([])

/** 部署前缀（dist 里写死 "/ylbxt/"，见文件头「迁移点 3」） */
const BASE = import.meta.env.BASE_URL

/* dist: watch:{ showdata(e){ this.data=e } } */
watch(
  () => props.showdata,
  (val) => {
    data.value = val
  }
)

/* dist: mounted(){ this.$nextTick(()=>{ this.showdata ? this.data=this.showdata : this.data=[] }) }
   —— 注意本变体**没有** getQiniuToken()（整块无 qiniu 上传） */
onMounted(() => {
  nextTick(() => {
    data.value = props.showdata ? props.showdata : []
  })
})

/** dist: add(){ this.data.push({}) } —— 推的是空对象，与 TeacherTable 的 {type:1,position:4} 不同 */
function add() {
  data.value.push({})
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
 * dist:
 *   check(){
 *     if(this.data && this.data.length>0)
 *       for(let e=0;e<this.data.length;e++){
 *         const t=this.checkLine(this.data[e]);
 *         if(!t.flag) return Message.error("参演人员名单第"+(e+1)+"行"+t.msg),!1
 *       }
 *     return !0
 *   }
 */
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
 * dist 的 checkLine 是一串嵌套三元表达式。这里改写成**顺序完全一致**的 if 链
 * （没有任何分支被合并或调换），逐项对应：
 *   姓名不能为空 → 身份证不能为空 → 年龄不能为空 → 性别需选择 → 性别格式只能是0、1
 *   → 学校名称不能为空 → 专业名称不能为空 → 电话号码不能为空
 *   → 身份需选择 → 角色需选择 → 验证成功
 * 注意「专业名称」在「电话」之前，这与 exportCheck 的顺序不同（dist 原文即如此）。
 */
function checkLine(item) {
  if (!item.name) return { flag: false, msg: '姓名不能为空' }
  if (!item.card) return { flag: false, msg: '身份证不能为空' }
  if (!item.age) return { flag: false, msg: '年龄不能为空' }
  if (item.gender === undefined || item.gender === '') return { flag: false, msg: '性别需选择' }
  if (item.gender !== 0 && item.gender !== 1) return { flag: false, msg: '性别格式只能是0、1' }
  if (!item.school) return { flag: false, msg: '学校名称不能为空' }
  if (!item.major) return { flag: false, msg: '专业名称不能为空' }
  if (!item.phone) return { flag: false, msg: '电话号码不能为空' }
  if (item.type === undefined || item.type === '') return { flag: false, msg: '身份需选择' }
  if (item.position === undefined || item.position === '') return { flag: false, msg: '角色需选择' }
  // 【第十二届·补格式校验】见 config/personFields.js。以上全是 dist 原判定，
  // 只判"填没填"；格式放在最后，不改动上面任何一条的优先级。
  const formatErr = checkPersonBasics(item)
  if (formatErr) return { flag: false, msg: formatErr }
  return { flag: true, msg: '验证成功' }
}

/**
 * dist 的 exportCheck：Excel 导入专用校验，取值是**中文字符串**（因为读的是表格单元格文本）。
 * 同样改写成顺序一致的 if 链，保留原顺序：
 *   姓名→身份证→年龄→性别→学校名称→电话→身份(空/格式)→（学生才要求）专业名称→角色(空/格式)
 * 注意「专业名称」在 exportCheck 里位于**身份之后**，且只对 `type === '学生'` 生效 ——
 * 与 checkLine 的位置和严格度都不同，这是 dist 原文的差异，不改。
 */
function exportCheck(item) {
  if (!item.name) return { flag: false, msg: '姓名不能为空' }
  if (!item.card) return { flag: false, msg: '身份证不能为空' }
  if (!item.age) return { flag: false, msg: '年龄不能为空' }
  if (item.gender === undefined || item.gender === '') return { flag: false, msg: '性别需填写' }
  if (item.gender !== '男' && item.gender !== '女') return { flag: false, msg: '性别格式只能是男、女' }
  if (!item.school) return { flag: false, msg: '学校名称不能为空' }
  if (!item.phone) return { flag: false, msg: '电话号码不能为空' }
  if (item.type === undefined || item.type === '') return { flag: false, msg: '身份不能为空' }
  if (item.type !== '学生' && item.type !== '教师') return { flag: false, msg: '身份格式只能是学生、教师' }
  // dist: "学生"!==e.type||e.major ? (角色校验) : {专业名称不能为空}
  if (item.type === '学生' && !item.major) return { flag: false, msg: '专业名称不能为空' }
  if (item.position === undefined || item.position === '') return { flag: false, msg: '角色不能为空' }
  if (
    item.position !== '正式队员' &&
    item.position !== '预备队员' &&
    item.position !== '指挥' &&
    item.position !== '伴奏'
  ) {
    return { flag: false, msg: '角色格式只能是正式队员、预备队员、指挥、伴奏' }
  }
  // 【第十二届·补格式校验】理由同 checkLine 末尾：导入是原样透传单元格文本的。
  const formatErr = checkPersonBasics(item)
  if (formatErr) return { flag: false, msg: formatErr }
  return { flag: true, msg: '验证成功' }
}

/** dist: getData(){ return !!this.check() && this.data } */
function getData() {
  return !!check() && data.value
}

/**
 * dist:
 *   importExcel(e){
 *     const t=e.name.split(".")[1],
 *           n=["xlsx","xlc","xlm","xls","xlt","xlw","csv"].some(e=>e===t);
 *     if(!n) return Message.error("格式有误");
 *     this.xlsx2json(e).then(e=>{
 *       if(e&&e.length>0){
 *         this.data=[]; const t=e[0].sheet;
 *         for(let e=1;e<t.length;e++){ console.log(t[e]); const n=this.exportCheck(t[e]);
 *           if(!n.flag) return Message.error("导入失败！参演人员名单第"+e+"行"+n.msg),!1 }
 *         for(let e=1;e<t.length;e++) this.data.push({ name:t[e].name, card:t[e].card, age:t[e].age,
 *           gender:"男"===t[e].gender?0:1, school:t[e].school, major:t[e].major, number:t[e].number,
 *           phone:t[e].phone, type:"学生"===t[e].type?0:1, position:this.getPosition(t[e].position) })
 *       }
 *     })
 *   }
 * 【保留 dist 缺陷】第一行是表头，所以两轮循环都从 1 开始；报错行号因此比 Excel 实际行号小 1。
 * 【保留 dist 缺陷】console.log(row) 原样保留。
 */
function importExcel(file) {
  const ext = file.name.split('.')[1]
  const okExt = ['xlsx', 'xlc', 'xlm', 'xls', 'xlt', 'xlw', 'csv'].some((e) => e === ext)
  if (!okExt) {
    ElMessage.error('格式有误')
    return
  }

  xlsx2json(file).then((sheets) => {
    if (sheets && sheets.length > 0) {
      data.value = []
      const rows = sheets[0].sheet
      for (let i = 1; i < rows.length; i++) {
        console.log(rows[i]) // 【dist 已知缺陷】原样保留
        const result = exportCheck(rows[i])
        if (!result.flag) {
          ElMessage.error('导入失败！参演人员名单第' + i + '行' + result.msg)
          return
        }
      }
      for (let i = 1; i < rows.length; i++) {
        data.value.push({
          name: rows[i].name,
          card: rows[i].card,
          age: rows[i].age,
          gender: rows[i].gender === '男' ? 0 : 1,
          school: rows[i].school,
          major: rows[i].major,
          number: rows[i].number,
          phone: rows[i].phone,
          type: rows[i].type === '学生' ? 0 : 1,
          position: getPosition(rows[i].position)
        })
      }
    }
  })
}

/** dist: getPosition(e){ switch(e){ case"正式队员":return 0; case"预备队员":return 1; case"指挥":return 2; case"伴奏":return 3; default:return 0 } } */
function getPosition(value) {
  switch (value) {
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

/** dist: getCacheData(){ return this.data } —— 不校验，直接返回（暂存用） */
function getCacheData() {
  return data.value
}

defineExpose({ getData, getCacheData })
</script>

<style lang="scss" scoped>
/* 照搬 dist 模块 5824 的 scoped 样式（data-v-52fa82de，共 9 条，
   出现在 chunk-587f2dad.ca9709a6.css 与 chunk-648d890f.72a36274.css，内容逐字节相同）。
   注意 grid-template-columns 是 **11 列**，与 db6d 的 12 列不同。 */
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
  grid-template-columns: 50px 120px 180px 120px 130px 160px 160px 150px 120px 150px 80px;
  justify-content: stretch;
}

.box-col {
  border-left: 1px solid #8c939d;
  border-bottom: 1px solid #8c939d;
  padding: 5px 10px;
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
