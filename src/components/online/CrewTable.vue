<template>
  <div class="container">
    <!-- 操作栏 -->
    <div class="options">
      <el-upload
        :action="domain"
        :data="QiniuData"
        :multiple="true"
        accept="image/jpeg,image/png"
        :show-file-list="false"
        :before-upload="beforeUpload"
        :on-success="uploadSuccessBatch"
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
      <span style="color:blue">身份证号码.png</span> 或者为 <span style="color:blue">身份证号码.jpg</span>
      <br>例如：<span style="color:blue">123456789.png</span> 则与身份证号码为
      <span style="color:blue">123456789</span> 的人员对应。
    </div>

    <!-- 表格 -->
    <div class="box">
      <!-- 表头 -->
      <div class="box-line-title">
        <div class="box-col">序号</div>
        <div class="box-col">姓名</div>
        <div class="box-col">身份证号</div>
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
          <el-input v-model="row.card" placeholder="请输入身份证号码" size="mini" />
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
      :action="domain"
      :data="QiniuData"
      :show-file-list="false"
      :hidden="true"
      :before-upload="beforeUpload"
      :on-success="(res, file) => uploadSuccess(res, file, uploadIndex)"
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
 */
import { ref, reactive, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { qiniuApi } from '@/api/misc'
import { fileApi } from '@/api/misc'

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

const QiniuData = reactive({ token: '', key: 'ylbxt/avatar/' })
const domain = 'https://upload.qiniup.com'
const host = 'https://img.atyth.com/'
let filename = ''

watch(() => props.showdata, (val) => {
  data.value = val && val.length > 0 ? JSON.parse(JSON.stringify(val)) : []
}, { immediate: true })

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
  filename = file.name
  QiniuData.key = 'ylbxt/avatar/' + rename(file.name)
  const isImg = file.type === 'image/jpeg' || file.type === 'image/png'
  const isSize = file.size / 1024 / 1024 < 1
  if (!isImg) { ElMessage.error('格式只能是jpg或者png'); return false }
  if (!isSize) { ElMessage.error('文件大小不能超过1M'); return false }
  qiniuApi.getToken().then((res) => {
    if (res.data.code === 0) QiniuData.token = res.data.uptoken
  })
  return true
}

function rename(name) { return name }

function uploadSuccess(res, file, index) {
  const info = { filename, url: host + res.key }
  fileApi.saveFileInfo({ filename, url: info.url }).then((r) => {
    if (r.data.code === 0) data.value[index].head = info.url
    else ElMessage.error('文件上传失败')
  })
}

function uploadSuccessBatch(res, file) {
  const info = { filename: file.name, url: host + res.key }
  fileApi.saveFileInfo({ filename: info.filename, url: info.url }).then((r) => {
    if (r.data.code === 0) {
      const card = info.filename.substring(0, info.filename.indexOf('.'))
      const idx = data.value.findIndex(row => row.card === card)
      if (idx >= 0) data.value[idx].head = info.url
    } else {
      ElMessage.error('文件上传失败')
    }
  })
}

function getData() {
  for (let i = 0; i < data.value.length; i++) {
    const row = data.value[i]
    if (!row.name) return { ok: false, msg: `姓名不能为空（行${i + 1}）` }
    if (!row.card) return { ok: false, msg: `身份证不能为空（行${i + 1}）` }
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
.box { overflow-x: auto; }
.box-line-title, .box-line { display: flex; align-items: center; min-width: 1600px; }
.box-line-title { background: #f5f7fa; font-weight: 600; font-size: 12px; border-bottom: 1px solid #ebeef5; }
.box-line { border-bottom: 1px solid #ebeef5; }
.box-line:hover { background: #f5f7fa; }
.box-col { width: 100px; min-width: 100px; padding: 4px 6px; text-align: center; font-size: 12px; overflow: hidden; text-overflow: ellipsis; }
.sticky-column { position: sticky; right: 0; background: #fff; z-index: 1; }
.box-line:hover .sticky-column { background: #f5f7fa; }
</style>
