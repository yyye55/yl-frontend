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

    <!-- 表格 -->
    <div class="box">
      <!-- 表头 -->
      <div class="box-line-title">
        <div class="box-col">序号</div>
        <div class="box-col">教师姓名</div>
        <div class="box-col">身份证号</div>
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
 *
 * 功能：批量添加行、批量上传头像（按文件名=身份证号匹配）、
 * 单个上传头像、删除行、校验。
 */
import { ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { fileApi } from '@/api/misc'
import { uploadToOss } from '@/services/ossUpload'

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

function uploadFileBatch(options) {
  const file = options.file
  uploadToOss({ file, biz: 'image' })
    .then(({ url }) => {
      fileApi.saveFileInfo({ filename: file.name, url }).then((r) => {
        if (r.data.code === 0) {
          // 按文件名（身份证号）匹配
          const card = file.name.substring(0, file.name.indexOf('.'))
          const idx = data.value.findIndex(row => row.card === card)
          if (idx >= 0) data.value[idx].head = url
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
    if (!row.card) return { ok: false, msg: `身份证不能为空（行${i + 1}）` }
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
</style>
