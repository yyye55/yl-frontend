<template>
  <div class="container">
    <!-- 操作栏 -->
    <div class="options">
      <el-upload
        :multiple="true"
        accept="image/jpeg,image/png"
        :show-file-list="false"
        :before-upload="beforeUpload"
        :http-request="uploadFileBatch"
      >
        <el-button type="text" style="color:#1890ff">批量上传头像</el-button>
      </el-upload>
      <el-button type="text" style="color:#1890ff" @click="addRow">添加一行</el-button>
      <el-button type="text" style="color:#1890FF" @click="clearAll">清空</el-button>
    </div>

    <!--
      【本轮新增】命名说明。本表**原先一个字都没有**：用户在带队教师这一页只能靠
      上传失败后的报错才知道该把文件叫什么。规则本身不是新的（批量上传一直是按
      身份证号后6位匹配），只是从没写出来过。
    -->
    <div class="batch-tip">
      <span style="color:red">注：</span>
      批量上传头像只能上传jpg/png格式的一寸照片，且大小不超过1M。文件名格式为
      <span style="color:blue">身份证号后6位.png</span> 或者为 <span style="color:blue">身份证号后6位.jpg</span>
      <br>例如：<span style="color:blue">123456.png</span> 则与身份证号后6位为
      <span style="color:blue">123456</span> 的人员对应。
      <br>若表内有两人身份证号后6位相同，可改用「姓名+身份证号后6位」命名（例如
      <span style="color:blue">张小明123456.png</span>）加以区分。
      <!--
        【上面这句必须**常驻**】下面那条撞号提示只在真的撞了之后才出现；光靠它，
        没撞号的用户读不到「后6位会重复」这条规则 —— 而恰恰是他们需要在命名文件之前就知道。
      -->
    </div>

    <!--
      【本轮新增】表内撞号提示，紧跟命名说明。内容由 photoCollisionText 生成，
      判据与批量上传那侧同源（都走共用模块的 expectedOnlinePhotoNames）。
      文案里会点名行号，理由见 formatPhotoCollisions 的注释。
    -->
    <div v-if="photoCollisionText" class="collision-tip">{{ photoCollisionText }}</div>

    <!-- 表格 -->
    <div class="box">
      <!-- 表头 -->
      <div class="box-line-title">
        <div class="box-col">序号</div>
        <div class="box-col">教师姓名</div>
        <div class="box-col">身份证后6位</div>
        <div class="box-col">年龄</div>
        <div class="box-col">性别</div>
        <div class="box-col">所在单位</div>
        <div class="box-col">手机号码</div>
        <div class="box-col">到达时间</div>
        <div class="box-col">离开时间</div>
        <div class="box-col">现场联系人</div>
        <div class="box-col">备注</div>
        <div class="box-col">头像</div>
        <div class="box-col sticky-column">操作</div>
      </div>

      <!-- 数据行 -->
      <div v-for="(row, index) in data" :key="index" class="box-line">
        <div class="box-col">{{ index + 1 }}</div>
        <div class="box-col">
          <el-input v-model="row.name" placeholder="请输入姓名" size="mini" />
        </div>
        <div class="box-col">
          <el-input v-model="row.card" placeholder="请输入后6位" size="mini" />
        </div>
        <div class="box-col">
          <el-input v-model.number="row.age" type="number" placeholder="年龄" size="mini" />
        </div>
        <div class="box-col">
          <el-select v-model="row.gender" placeholder="请选择" size="mini">
            <el-option :label="'男'" :value="0" />
            <el-option :label="'女'" :value="1" />
          </el-select>
        </div>
        <div class="box-col">
          <el-input v-model="row.unit" placeholder="单位" size="mini" />
        </div>
        <div class="box-col">
          <el-input v-model="row.phone" maxlength="30" placeholder="手机号码" size="mini" />
        </div>
        <div class="box-col">
          <el-date-picker
            v-model="row.arrival_time"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="到达时间"
            size="mini"
          />
        </div>
        <div class="box-col">
          <el-date-picker
            v-model="row.departure_time"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="离开时间"
            size="mini"
          />
        </div>
        <div class="box-col">
          <el-select v-model="row.linkman" placeholder="请选择" size="mini">
            <el-option :label="'否'" :value="0" />
            <el-option :label="'是'" :value="1" />
          </el-select>
        </div>
        <div class="box-col">
          <el-input v-model="row.remark" maxlength="30" placeholder="备注" size="mini" />
        </div>
        <div class="box-col">
          <img v-if="row.head" :src="row.head" style="width:59px;height:82px" />
        </div>
        <div class="box-col sticky-column">
          <el-button type="danger" size="mini" @click="upAvatar(index)">上传头像</el-button>
          <el-button type="danger" size="mini" @click="removeRow(index)">删除</el-button>
        </div>
      </div>
    </div>

    <!-- 隐藏的上传组件（供单个上传使用） -->
    <el-upload
      ref="uploadRef"
      :show-file-list="false"
      :hidden="true"
      :before-upload="beforeUpload"
      :http-request="uploadFileSingle"
      style="display:none"
    >
      <button ref="uploadBtn">click</button>
    </el-upload>
  </div>
</template>

<script setup>
/**
 * LeaderTable 带队教师表格（在线展演编辑页专用）
 *
 * 【dist 已确认】chunk-5ab90d77 模块 2cd7，组件名 name:"Student"（内嵌子组件）
 *
 * 字段：name / card / age / gender(0=男/1=女) / unit / phone /
 *       arrival_time / departure_time / linkman(0/1) / remark / head
 *       ↑ **没有 type 字段**（本表全是带队教师）。这一点很关键：报名端那套按
 *         身份分流的命名判据（expectedPhotoNames）套到本表会让每一行都算不出
 *         期望文件名，照片一张都传不上去。本表走的是 expectedOnlinePhotoNames，
 *         它不看 type —— 换成报名端那套之前请先读那个函数的注释。
 *
 * 功能：批量添加行、批量上传头像（按文件名匹配到行）、
 * 单个上传头像、删除行、校验。
 *
 * 【本轮改造】批量上传由「先传完再 findIndex 找第一行」改成「先匹配、命中唯一
 * 一行才发请求」，命中 0 行 / 多行都如实报错。理由与 CrewTable.uploadFileBatch
 * 上方那段完全相同，此处不重复；本表另外多一层风险 —— 它是**带队教师**，
 * 同单位几位老师尾号相同的概率不比学生低。
 */
import { ref, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { fileApi } from '@/api/misc'
import { uploadToOss } from '@/services/ossUpload'
import { checkPersonCard, isBlankCard } from '@/config/personFields'
/* 【本轮新增】匹配与撞号判据全部来自共用模块，本表不另写一份。
   为什么传 expectedOnlinePhotoNames 而不是默认的报名端口径：见上面「没有 type 字段」。 */
import {
  matchPhotoToRows,
  expectedOnlinePhotoNames,
  findPhotoNameCollisions,
  formatPhotoCollisions
} from '@/composables/usePhotoUpload'

const props = defineProps({
  showdata: { type: Array, default: () => [] }
})

const emit = defineEmits(['update:data'])

const data = ref([])
const uploadIndex = ref(0)
const uploadRef = ref(null)
const uploadBtn = ref(null)

// 【第十二届改造·第二轮】QiniuData / domain / host / filename 已移除：
// key 改由后端生成，url 由上传服务返回，前端不再硬编码七牛域名。

// 回填
watch(() => props.showdata, (val) => {
  data.value = val && val.length > 0 ? JSON.parse(JSON.stringify(val)) : []
}, { immediate: true })

/*
 * 【本轮新增】表内撞号 —— 填表阶段就指出「批量上传注定分不清」的那几行。
 * 判据与批量上传那侧同源（都走 findPhotoNameCollisions + expectedOnlinePhotoNames），
 * 所以「这里提示会撞」与「上传时真的撞」不可能各说各话。理由详见 CrewTable.vue 里
 * 同名 computed 的注释，此处不重复。文案要点名行号的理由见 formatPhotoCollisions 的注释。
 */
const photoCollisions = computed(() =>
  findPhotoNameCollisions(data.value, expectedOnlinePhotoNames)
)

/** 撞号提示的整句文案；无撞号时为空串，模板直接 v-if。行内按钮在本表叫「上传头像」 */
const photoCollisionText = computed(() => formatPhotoCollisions(photoCollisions.value, '上传头像'))

/*
 * 批量上传的**失败汇总** —— 与报名端（PersonTable）和本目录的 CrewTable 同一套做法：
 * 逐个失败先攒着、用一个 0 毫秒定时器收口，最后合成**一条**消息，不逐张弹。
 * 详述见 CrewTable.vue 里同名字段上方的注释。
 */
let batchMatchRejected = []
let batchMatchTimer = null

/** 多行提示用的 class（非 scoped，见文件末尾那段 CSS），与另两表同名同规则 */
const PHOTO_BATCH_TOAST_CLASS = 'photo-batch-toast'

/** 记一个「文件名没能唯一对上一行」的文件，并安排收口 */
function rejectBatchFile(file, m) {
  let reason
  if (m.status === 'none') {
    // 举几个「表里期望的文件名」比一句"未找到匹配"有用得多，最多 3 个免得撑爆提示
    const sample = m.expected.slice(0, 3).join('、')
    const hint = m.expected.length
      ? `表里期望的文件名如：${sample}${m.expected.length > 3 ? ' 等' : ''}`
      : '名单里还没有填好身份证号'
    reason = `文件名对不上任何人（${hint}）`
  } else {
    reason = `有 ${m.hits.length} 行都叫这个文件名（第 ${m.hits.map((i) => i + 1).join('、')} 行），请改用「上传头像」按行单独上传`
  }
  batchMatchRejected.push({ name: file.name, reason })
  if (batchMatchTimer) clearTimeout(batchMatchTimer)
  batchMatchTimer = setTimeout(flushBatchMatchSummary, 0)
}

/** 把本批"没能唯一对上"的文件合成一条提示。全对上时一声不吭（与改造前一样安静） */
function flushBatchMatchSummary() {
  batchMatchTimer = null
  const failed = batchMatchRejected
  // 先复位再组装：万一组装过程中又有新的失败进来，不会被这次清掉
  batchMatchRejected = []
  if (failed.length === 0) return

  const lines = [`有 ${failed.length} 张头像没有传上去`]
  failed.slice(0, 3).forEach((r) => lines.push(`· ${r.name} —— ${r.reason}`))
  if (failed.length > 3) lines.push(`· …另有 ${failed.length - 3} 张，请重试`)

  ElMessage.error({
    message: lines.join('\n'),
    customClass: PHOTO_BATCH_TOAST_CLASS,
    duration: 10000,
    showClose: true
  })
}

// ===== methods =====
function addRow() {
  data.value.push({})
}

function clearAll() {
  ElMessageBox.confirm('确定清空数据, 是否继续?', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => { data.value = [] }).catch(() => {})
}

function removeRow(index) {
  ElMessageBox.confirm('确定删除该数据, 是否继续?', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => { data.value.splice(index, 1) }).catch(() => {})
}

function upAvatar(index) {
  uploadIndex.value = index
  uploadBtn.value?.click()
}

function beforeUpload(file) {
  const isImg = file.type === 'image/jpeg' || file.type === 'image/png'
  const isSize = file.size / 1024 / 1024 < 1
  if (!isImg) { ElMessage.error('格式只能是jpg或者png'); return false }
  if (!isSize) { ElMessage.error('文件大小不能超过1M'); return false }
  return true
}

/*
 * 【第十二届改造】上传通道由七牛直传换成阿里云 OSS（biz: image）。
 * 与 CrewTable.vue 逐字对称，改动理由见该文件的同名注释。
 *
 * 【为什么处理器不返回 Promise】Element Plus 只在 httpRequest 返回 Promise
 * 时才跑自己那套内部成功路径，本项目不用它的 file-list，返回非 Promise
 * 让行为完全由下面的 .then 控制。
 */
function uploadFileSingle(options) {
  const index = uploadIndex.value
  uploadToOss({ file: options.file, biz: 'image' })
    .then(({ url }) => {
      fileApi.saveFileInfo({ filename: options.file.name, url }).then((r) => {
        if (r.data.code === 0) {
          data.value[index].head = url
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
 * 批量上传：**先按文件名找到唯一一行，再决定要不要传**。
 * 改掉的是「先上传落库、再 findIndex 取第一行」那套：同 card 的其余行静默丢弃，
 * 一行都没匹配上时一声不吭（文件留在 OSS 里成了孤儿）。现在命中 0 行 / 多行都在
 * 上传之前得出结论并如实报出，且不发请求。完整理由见 CrewTable.uploadFileBatch。
 */
function uploadFileBatch(options) {
  const file = options.file
  const nameNoExt = file.name.substring(0, file.name.lastIndexOf('.'))

  const m = matchPhotoToRows(nameNoExt, data.value, expectedOnlinePhotoNames)
  if (m.status !== 'ok') {
    rejectBatchFile(file, m)
    return
  }

  uploadToOss({ file, biz: 'image' })
    .then(({ url }) => {
      fileApi.saveFileInfo({ filename: file.name, url }).then((r) => {
        if (r.data.code === 0) {
          /* 上传期间表格可能已经变了（删行、清空、改了身份证号），
             所以落地时**重算一次**，而不是拿着上传前算出的下标硬写。 */
          const again = matchPhotoToRows(nameNoExt, data.value, expectedOnlinePhotoNames)
          if (again.status === 'ok') data.value[again.hits[0]].head = url
          else ElMessage.error(`${file.name} 已上传，但表格已变动，没能对应到行，请重新上传`)
        } else {
          ElMessage.error('文件上传失败')
        }
      })
    })
    .catch((err) => {
      if (!err.shown) ElMessage.error(err.message || '文件上传失败')
    })
}

function getData() {
  // 校验：逐行检查必填项
  for (let i = 0; i < data.value.length; i++) {
    const row = data.value[i]
    if (!row.name) return { ok: false, msg: `姓名不能为空（行${i + 1}）` }
    // 【身份证】必填是前端独有、比后端严的规则（后端 Leader.card 允许为空，存 NULL）；
    // 格式则与后端同源，见 CrewTable.vue 里 getData 上方那段说明，此处不重复。
    if (isBlankCard(row.card)) return { ok: false, msg: `身份证后6位不能为空（行${i + 1}）` }
    const cardErr = checkPersonCard(row.card)
    if (cardErr) return { ok: false, msg: `${cardErr}（行${i + 1}）` }
    if (!row.age) return { ok: false, msg: `年龄不能为空（行${i + 1}）` }
    if (row.gender === undefined || row.gender === '') return { ok: false, msg: `性别需选择（行${i + 1}）` }
    if (row.gender !== 0 && row.gender !== 1) return { ok: false, msg: `性别格式只能是0、1（行${i + 1}）` }
    if (!row.arrival_time) return { ok: false, msg: `到达时间需选择（行${i + 1}）` }
    if (!row.departure_time) return { ok: false, msg: `离开时间需选择（行${i + 1}）` }
    if (!row.phone) return { ok: false, msg: `电话号码不能为空（行${i + 1}）` }
    if (!/^1[3456789]\d{9}$/.test(row.phone)) return { ok: false, msg: `手机号码格式错误（行${i + 1}）` }
    if (row.linkman === undefined || row.linkman === '') return { ok: false, msg: `现场联系人需选择（行${i + 1}）` }
  }
  return { ok: true, data: data.value }
}

// 暴露给父组件
defineExpose({ getData })
</script>

<style lang="scss" scoped>
.container { background: #fff; padding: 0; }
.options {
  padding: 8px 10px;
  display: flex;
  align-items: center;
  gap: 12px;
}
.box { overflow-x: auto; }
.box-line-title, .box-line {
  display: flex;
  align-items: center;
  min-width: 1200px;
}
.box-line-title {
  background: #f5f7fa;
  font-weight: 600;
  font-size: 12px;
  border-bottom: 1px solid #ebeef5;
}
.box-line { border-bottom: 1px solid #ebeef5; }
.box-line:hover { background: #f5f7fa; }
.box-col {
  width: 100px;
  min-width: 100px;
  padding: 4px 6px;
  text-align: center;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sticky-column { position: sticky; right: 0; background: #fff; z-index: 1; }
.box-line:hover .sticky-column { background: #f5f7fa; }
/*
 * 【本轮新增】命名说明与撞号提示。
 * 两份声明与 CrewTable.vue 里逐字相同 —— 两个页面在用户眼里是同一套操作，
 * 长不一样会显得是两件事。撞号那条换成警示色：它是「你这份表现在传不上去」，
 * 与上面那种长期存在的说明文字必须一眼能分开。
 */
.batch-tip {
  padding: 6px 12px;
  font-size: 12px;
  color: #606266;
  line-height: 1.8;
  background: #f5f7fa;
}
.collision-tip {
  padding: 6px 12px;
  font-size: 12px;
  line-height: 1.8;
  color: #d80e0e;
  font-weight: 600;
  background: #fef0f0;
}
</style>

<!--
  批量上传「整批汇总」提示的换行样式。
  【为什么故意不加 scoped】ElMessage 的节点由 Element Plus 挂到 document.body 下，
  已经不在本组件的 DOM 子树里，scoped 生成的 [data-v-xxx] 选择器匹配不到它。
  【类名与规则同 CrewTable / PersonTable】三处同一个类名、同一份声明。
-->
<style lang="scss">
.photo-batch-toast .el-message__content {
  white-space: pre-line;
  line-height: 1.7; // 多条时给点行距，否则挤成一坨看不清是几条
}
</style>
