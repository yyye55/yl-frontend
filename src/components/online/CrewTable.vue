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
      <el-button type="text" style="color:#1890ff" @click="openBatchTimeDialog">批量设置到达和离开时间</el-button>
      <el-button type="text" style="color:#1890ff" @click="addRow">添加一行</el-button>
      <el-button type="text" style="color:#1890ff" @click="clearAll">清空</el-button>
    </div>

    <!-- 表头说明 -->
    <div class="batch-tip">
      <span style="color:red">注：</span>
      1、除大学组外的其他节目无须填写专业名称
      <br>2、批量上传头像只能上传jpg/png格式的一寸照片，且大小不超过1M。文件名格式为
      <span style="color:blue">身份证号后6位.png</span> 或者为 <span style="color:blue">身份证号后6位.jpg</span>
      <br>例如：<span style="color:blue">123456.png</span> 则与身份证号后6位为
      <span style="color:blue">123456</span> 的人员对应。
      <!--
        【本轮补的第 3 条，必须**常驻**】它是**新增**的写法，上面两条照旧有效（判据见
        expectedOnlinePhotoNames：本表原来认什么，改完还是认什么）。写在这里是因为
        用户是照着这段红字命名文件的，而撞号在拖文件之前就该能预防 —— 下面那条撞号
        提示只在真的撞了之后才出现，光靠它，没撞号的用户读不到这条规则。
      -->
      <br>3、若表内有两人身份证号后6位相同，可改用「姓名+身份证号后6位」命名（例如
      <span style="color:blue">张小明123456.png</span>）加以区分。
    </div>

    <!--
      【本轮新增】表内撞号提示。紧跟在命名说明下面：用户读完「怎么命名」的下一行
      就是「你这份表里有两行会撞」。内容由 photoCollisionText 生成 —— 它的判据与
      批量上传那侧是同一个函数，不会出现「这里说不会撞、上传却失败」。
      没有撞号时整段不渲染，不改变任何数据。文案里会点名行号，理由见该函数注释。
    -->
    <div v-if="photoCollisionText" class="collision-tip">{{ photoCollisionText }}</div>

    <!-- 表格 -->
    <div class="box">
      <!-- 表头 -->
      <div class="box-line-title">
        <div class="box-col">序号</div>
        <div class="box-col">姓名</div>
        <div class="box-col">身份证后6位</div>
        <div class="box-col">年龄</div>
        <div class="box-col">性别</div>
        <div class="box-col">学校或单位名称</div>
        <div class="box-col">专业</div>
        <div class="box-col">手机号码</div>
        <div class="box-col">身份</div>
        <div class="box-col">角色</div>
        <div class="box-col">乐器</div>
        <div class="box-col">到达时间</div>
        <div class="box-col">离开时间</div>
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
          <el-input v-model="row.school" placeholder="学校全称" size="mini" />
        </div>
        <div class="box-col">
          <el-input v-model="row.major" placeholder="专业名称" size="mini" />
        </div>
        <div class="box-col">
          <el-input v-model="row.phone" maxlength="30" placeholder="手机号码" size="mini" />
        </div>
        <div class="box-col">
          <el-select v-model="row.type" placeholder="身份" size="mini">
            <el-option :label="'学生'" :value="0" />
            <el-option :label="'教师'" :value="1" />
          </el-select>
        </div>
        <div class="box-col">
          <el-select v-model="row.position" placeholder="角色" size="mini">
            <el-option :label="'正式队员'" :value="0" />
            <el-option :label="'预备队员'" :value="1" />
            <el-option :label="'指挥'" :value="2" />
            <el-option :label="'伴奏'" :value="3" />
          </el-select>
        </div>
        <div class="box-col">
          <el-input v-model="row.musical_instruments" placeholder="乐器名称" size="mini" />
        </div>
        <div class="box-col">
          <el-date-picker v-model="row.arrival_time" type="date" value-format="YYYY-MM-DD" placeholder="到达时间" size="mini" />
        </div>
        <div class="box-col">
          <el-date-picker v-model="row.departure_time" type="date" value-format="YYYY-MM-DD" placeholder="离开时间" size="mini" />
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

    <!-- 隐藏上传 -->
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

    <!-- 批量设置时间弹窗 -->
    <el-dialog v-model="dialogTableVisible" title="批量设置到达和离开时间">
      <el-date-picker v-model="batchArrival" type="date" value-format="YYYY-MM-DD" placeholder="到达时间" style="width:100%;margin-bottom:10px" />
      <el-date-picker v-model="batchDeparture" type="date" value-format="YYYY-MM-DD" placeholder="离开时间" style="width:100%" />
      <template #footer>
        <el-button type="primary" @click="setAllTime">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
/**
 * CrewTable 参演人员表格（在线展演编辑页专用）
 *
 * 【dist 已确认】chunk-5ab90d77 模块 2cd7，组件名 name:"Student"（第二个内嵌子组件）
 *
 * 字段：name / card / age / gender(0/1) / school / major / phone /
 *       type(0=学生/1=教师) / position(0-3) / musical_instruments /
 *       arrival_time / departure_time / remark / head
 *
 * 【照片文件名：口径与三个入口】本表认两种写法（见 expectedOnlinePhotoNames）：
 * 红头文件那种「身份证号后6位」，以及撞号时用来消歧的「姓名+身份证号后6位」。
 * 三种情况都走同一个判据，不另写第二份：
 *   · 批量上传 —— uploadFileBatch 开头先匹配，命中唯一一行才发请求
 *   · 行内「上传头像」 —— upAvatar 按**行下标**定位（uploadIndex），与文件名无关，
 *     所以它本来就不受撞号影响，撞号提示里指的正是这条路
 *   · 填表阶段的撞号预警 —— photoCollisionText
 */
import { ref, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { fileApi } from '@/api/misc'
import { uploadToOss } from '@/services/ossUpload'
import { checkPersonCard, isBlankCard } from '@/config/personFields'
/* 【本轮新增】照片文件名的匹配与撞号判据，全部来自共用模块 —— 本表**不另写一份**。
   为什么不是 usePhotoUpload 那一整套：本表没有「按行上传」的共用实现
   （upAvatar 走的是隐藏的单个 el-upload，见下），只需要这几个纯函数。
   为什么口径传 expectedOnlinePhotoNames：线上展演的公开口径与报名端不同，
   见该函数的注释（两条已核实的理由：本表 type=1 的行现在也认纯后6位、
   带队教师表压根没有 type 字段）。 */
import {
  matchPhotoToRows,
  expectedOnlinePhotoNames,
  findPhotoNameCollisions,
  formatPhotoCollisions
} from '@/composables/usePhotoUpload'

const props = defineProps({
  showdata: { type: Array, default: () => [] }
})

const data = ref([])
const uploadIndex = ref(0)
const uploadRef = ref(null)
const uploadBtn = ref(null)
const dialogTableVisible = ref(false)
const batchArrival = ref('')
const batchDeparture = ref('')

// 【第十二届改造·第二轮】QiniuData / domain / host / filename 已移除：
// key 改由后端生成，url 由上传服务返回，前端不再硬编码七牛域名。

watch(() => props.showdata, (val) => {
  data.value = val && val.length > 0 ? JSON.parse(JSON.stringify(val)) : []
}, { immediate: true })

/*
 * 【本轮新增】表内撞号 —— 在填表阶段就指出「批量上传注定分不清」的那几行。
 *
 * 【为什么会撞】身份证只有后 6 位，不再唯一。批量上传是**按文件名找行**的，
 * 一个文件名同时命中两行时它没法决定给谁 —— 改造前的表现是「文件传上去了、
 * 表里的照片位却还是空的」，用户看不出发生过什么。
 *
 * 【判据同源】用共用模块的 findPhotoNameCollisions，口径传 expectedOnlinePhotoNames，
 * 与 uploadFileBatch 调的是同一个 —— 提示说会撞，上传时就一定会撞。
 *
 * 【本表口径】不分身份：type=0 和 type=1 的行都认「后6位」与「姓名+后6位」两种
 * （这是本表原来的公开口径，本次只增不减）。所以两个学生、两个教师、或一个学生
 * 一个教师，只要后 6 位相同，就都会撞 —— 这正是本表原本就会出现的场面。
 *
 * 【文案为什么要点名行号】撞号在界面上看不出来，不报行号用户得自己一行行比对后 6 位。
 * rows 因此要进文案，name 不进 —— 理由见 formatPhotoCollisions 的注释。
 */
const photoCollisions = computed(() =>
  findPhotoNameCollisions(data.value, expectedOnlinePhotoNames)
)

/** 撞号提示的整句文案；无撞号时为空串，模板直接 v-if。行内按钮在本表叫「上传头像」 */
const photoCollisionText = computed(() => formatPhotoCollisions(photoCollisions.value, '上传头像'))

/*
 * 批量上传的**失败汇总** —— 与本仓库报名端（PersonTable 的 flushBatchSummary）同一套做法：
 * 逐个失败先攒着、用一个 0 毫秒定时器收口，最后合成**一条**消息。
 *
 * 【为什么不逐张弹】一次拖进 60 张、其中 30 张对不上，逐张弹就是 30 条 ElMessage，
 * 互相覆盖还挡着表格，用户什么也读不到。
 *
 * 【为什么能批量攒】el-upload 在同一轮里同步地把每个文件交给 http-request，
 * 所以本批的判定都在同一个 tick 内完成，setTimeout(..., 0) 一定排在这批之后。
 */
let batchMatchRejected = []
let batchMatchTimer = null

/**
 * 多行提示用的 class —— 配合文件末尾那段**非 scoped** 的 CSS，让汇总文案里的 \n 真正换行。
 * 与 PersonTable 用**同一个类名、同一份规则**：两边样式一致，用户看到的是同一种提示。
 * 【为什么不能写在 scoped 块里】ElMessage 的节点被挂在 document.body 下，已经不在本组件的
 * DOM 子树里，scoped 生成的 [data-v-xxx] 选择器匹配不到它。
 */
const PHOTO_BATCH_TOAST_CLASS = 'photo-batch-toast'

/** 记一个「文件名没能唯一对上一行」的文件，并安排收口 */
function rejectBatchFile(file, m) {
  let reason
  if (m.status === 'none') {
    /* 报错时把「表里期望的文件名」举几个例子 —— 比一句"未找到匹配"有用得多。
       最多举 3 个：几十人的名单全列出来会把提示撑爆。
       一行期望名都算不出来时（名单还没填身份证），换一句更贴切的话，
       与报名端 flushBatchSummary 里的说法保持一致。 */
    const sample = m.expected.slice(0, 3).join('、')
    const hint = m.expected.length
      ? `表里期望的文件名如：${sample}${m.expected.length > 3 ? ' 等' : ''}`
      : '名单里还没有填好身份证号'
    reason = `文件名对不上任何人（${hint}）`
  } else {
    // multi：撞号。指出是哪几行，并给出去路 —— 行内那个按钮按行定位，不受撞号影响。
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

function addRow() { data.value.push({}) }

function clearAll() {
  ElMessageBox.confirm('确定清空数据, 是否继续?', '提示', {
    confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning'
  }).then(() => { data.value = [] }).catch(() => {})
}

function removeRow(index) {
  ElMessageBox.confirm('确定删除该数据, 是否继续?', '提示', {
    confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning'
  }).then(() => { data.value.splice(index, 1) }).catch(() => {})
}

function openBatchTimeDialog() { dialogTableVisible.value = true }

function setAllTime() {
  data.value.forEach(row => {
    if (batchArrival.value) row.arrival_time = batchArrival.value
    if (batchDeparture.value) row.departure_time = batchDeparture.value
  })
  dialogTableVisible.value = false
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
 *
 * 改动说明：
 *   - 原 `:action` + `:data="QiniuData"` 换成 `:http-request`，因为要走统一
 *     上传服务（小文件由后端代传进 OSS），并复用它的错误处理。
 *   - 【原先的缺陷已顺带消失】原 beforeUpload 里 `qiniuApi.getToken()` 是
 *     每次现取且不 await，首次上传时 QiniuData.token 还是空的，必然失败。
 *     现在凭证由服务内部处理，这段整个删掉了。
 *   - 原来拼 key 用的本地 `rename()`（就是 `return name`）与模块级 `filename`
 *     一并删除：key 改由后端生成，文件名直接用 options.file.name。
 *
 * 【为什么处理器不返回 Promise】Element Plus 只在 httpRequest 返回 Promise 时
 * 才跑自己那套内部成功路径（往 fileList 里塞条目），本项目不用它的 file-list，
 * 返回非 Promise 让行为完全由下面的 .then 控制。OrchestraForm.vue 同此约定。
 */
function uploadFileSingle(options) {
  const index = uploadIndex.value
  uploadToOss({ file: options.file, biz: 'image' })
    .then(({ url }) => {
      fileApi.saveFileInfo({ filename: options.file.name, url }).then((r) => {
        if (r.data.code === 0) data.value[index].head = url
        else ElMessage.error('文件上传失败')
      })
    })
    .catch((err) => {
      if (!err.shown) ElMessage.error(err.message || '文件上传失败')
    })
}

/**
 * 批量上传：**先按文件名找到唯一一行，再决定要不要传**。
 *
 * 【本轮改造，改掉的是什么】原来是「先上传、落库，再用
 * `data.value.findIndex(row => row.card === card)` 找行」：
 *   · 取的是**第一个**匹配的行，同 card 的其余行**静默丢弃** —— 用户以为都传了
 *   · 一行都没匹配上时**一声不吭** —— 文件已经在 OSS 里、也落了库，成了没人认领的孤儿
 * 现在换成 matchPhotoToRows：命中 0 行或命中多行都在**上传之前**得出结论，
 * 如实报给用户（见 rejectBatchFile），并且**不发请求**、不产生孤儿文件。
 *
 * 【顺带把「猜文件名属于谁」这件事彻底去掉】老实现只按 card 全等，于是
 * 「姓名+后6位」这种消歧写法根本不被识别；现在由 expectedOnlinePhotoNames
 * 统一给出每行可接受的文件名，两种写法都在内。
 *
 * 【为什么不用之前那个 findIndex 的写法去"消歧"】靠遍历顺序取第一个，等于让
 * 表格行序决定照片归谁 —— 用户改一行顺序，照片就换人了。宁可报错让他用行内按钮。
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
          /* 上传期间表格可能已经变了（用户删行、清空、或改了身份证号），
             所以落地时**重算一次**，而不是拿着上传前算出的下标硬写 ——
             下标失效时写进去的是别人的照片位，且看不出来。
             仍然是"找不到就明说"，不再静默丢弃。 */
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

/**
 * 【身份证这一列的两条规则，与后端的关系不同，别当成一回事】
 *   ① 必填 —— **前端独有的、比后端严**的规则。后端 `/live/` 的 `Crew.card` 允许为空
 *      （存 NULL，见 `models.py` 里 `Crew.card` 的注释：工作人员可以只填姓名）。
 *      本次沿用既有口径不改（改它会放宽而非收紧，不是这次要做的事），只在这里写明，
 *      免得下次核对时被当成"新的不一致"。
 *   ② 格式 —— 与后端同源。`/live/` 的写入路径同样调 `models.normalize_card`
 *      （后 6 位，`^[0-9]{5}[0-9Xx]$`），判据与文案都抄自 `config/personFields.js`。
 *      不在这里拦的话，一行填了 18 位会让整张表在后端被拒，且报错说不出是哪一行。
 */
function getData() {
  for (let i = 0; i < data.value.length; i++) {
    const row = data.value[i]
    if (!row.name) return { ok: false, msg: `姓名不能为空（行${i + 1}）` }
    if (isBlankCard(row.card)) return { ok: false, msg: `身份证后6位不能为空（行${i + 1}）` }
    const cardErr = checkPersonCard(row.card)
    if (cardErr) return { ok: false, msg: `${cardErr}（行${i + 1}）` }
    if (!row.age) return { ok: false, msg: `年龄不能为空（行${i + 1}）` }
    if (row.gender === undefined || row.gender === '') return { ok: false, msg: `性别需选择（行${i + 1}）` }
    if (!row.school) return { ok: false, msg: `学校名称不能为空（行${i + 1}）` }
  }
  return { ok: true, data: data.value }
}

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
.batch-tip {
  padding: 6px 12px;
  font-size: 12px;
  color: #606266;
  line-height: 1.8;
  background: #f5f7fa;
}
/*
 * 【本轮新增】撞号提示。
 * 与 .batch-tip 同样式但换成警示色 —— 它是"你这份表现在传不上去"，
 * 不是上面那种长期存在的说明文字，两者必须一眼能分开。
 * 字号跟 .batch-tip 走（12px），因为它俩上下相邻，一大一小会显得像两个区块。
 */
.collision-tip {
  padding: 6px 12px;
  font-size: 12px;
  line-height: 1.8;
  color: #d80e0e;
  font-weight: 600;
  background: #fef0f0;
}
.box { overflow-x: auto; }
.box-line-title, .box-line { display: flex; align-items: center; min-width: 1600px; }
.box-line-title { background: #f5f7fa; font-weight: 600; font-size: 12px; border-bottom: 1px solid #ebeef5; }
.box-line { border-bottom: 1px solid #ebeef5; }
.box-line:hover { background: #f5f7fa; }
.box-col { width: 100px; min-width: 100px; padding: 4px 6px; text-align: center; font-size: 12px; overflow: hidden; text-overflow: ellipsis; }
.sticky-column { position: sticky; right: 0; background: #fff; z-index: 1; }
.box-line:hover .sticky-column { background: #f5f7fa; }
</style>

<!--
  批量上传「整批汇总」提示的换行样式。
  【为什么故意不加 scoped】ElMessage 的节点由 Element Plus 挂到 document.body 下，
  已经不在本组件的 DOM 子树里，scoped 生成的 [data-v-xxx] 选择器匹配不到它。
  不加 scoped 但把选择器限定在这个专属类名下，作用范围就只有这条提示本身。
  【类名与规则同 PersonTable】报名端用的是同一个 .photo-batch-toast、同一份声明 ——
  两处若不一致，用户会在两个页面看到行距不同的同一种提示。重复声明是无害的：
  两边同时加载时规则逐字相同。
-->
<style lang="scss">
.photo-batch-toast .el-message__content {
  white-space: pre-line;
  line-height: 1.7; // 多条时给点行距，否则挤成一坨看不清是几条
}
</style>
