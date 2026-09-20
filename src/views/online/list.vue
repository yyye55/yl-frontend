<template>
  <div class="bg">
    <!-- 搜索栏 -->
    <div class="options">
      <el-input
        v-model="keyword"
        placeholder="请输入内容"
        size="mini"
        class="input-with-select"
        @change="getData"
      >
        <template #append>
          <el-button icon="el-icon-search" @click="getData" />
        </template>
        <template #prepend>
          <el-select v-model="group" placeholder="组别" size="mini" clearable @change="getData">
            <el-option label="全部" :value="null" />
            <el-option label="大学生甲组（非专业组）" value="大学生甲组（非专业组）" />
            <el-option label="大学生乙组（专业组）" value="大学生乙组（专业组）" />
            <el-option label="高校教师组" value="高校教师组" />
            <el-option label="中小学教师组" value="中小学教师组" />
            <el-option label="中小学生组" value="中小学生组" />
          </el-select>
        </template>
      </el-input>
      <el-button type="primary" size="mini" class="menu-button" style="width:100px" @click="refresh">
        刷新
      </el-button>
    </div>

    <!-- 列表区 -->
    <div class="content">
      <div class="bg-list">
        <p class="title">展演节目列表</p>
        <el-table :data="data" border size="mini" style="width:100%">
          <!-- 序号 -->
          <el-table-column type="index" label="序号" align="center" header-align="center" prop="date" />
          <!-- 合唱团名称 -->
          <el-table-column prop="choir_name" label="合唱团名称" align="center" header-align="center"
            show-overflow-tooltip />
          <!-- 节目名称 -->
          <el-table-column prop="name" label="节目名称" align="center" header-align="center"
            show-overflow-tooltip />
          <!-- 组别 -->
          <el-table-column prop="group" label="组别" align="center" header-align="center"
            show-overflow-tooltip />
          <!-- 联系人 -->
          <el-table-column prop="contact_name" label="联系人" align="center" header-align="center" />
          <!-- 联系电话 -->
          <el-table-column prop="contact_phone" label="联系电话" align="center" header-align="center" />
          <!-- 人员信息 -->
          <el-table-column label="人员信息" align="center" header-align="center">
            <template #default="{ row }">
              <ShowOnlinePerson :crew="row.crew" :leader="row.leader" />
            </template>
          </el-table-column>
          <!-- 状态 -->
          <el-table-column label="状态" align="center" header-align="center">
            <template #default="{ row }">
              <OnlineStatus :status="row.status" />
            </template>
          </el-table-column>
          <!-- 操作列 -->
          <el-table-column label="操作" align="center" header-align="center" width="440">
            <template #default="{ row }">
              <!-- -2 未填写 → 补填信息 -->
              <template v-if="row.status === -2">
                <el-button size="mini" @click="edit(row)">补填信息</el-button>
              </template>
              <!-- -1 已驳回 → 驳回信息 + 修改 -->
              <template v-else-if="row.status === -1">
                <Remark :data="row.remark" />
                <el-button size="mini" @click="edit(row)">修改</el-button>
              </template>
              <!-- 0 已填写 → 修改 -->
              <template v-else-if="row.status === 0">
                <el-button size="mini" @click="edit(row)">修改</el-button>
              </template>
            </template>
          </el-table-column>
        </el-table>

        <!-- 分页 -->
        <el-pagination
          class="my-pagination"
          :current-page="page"
          :page-sizes="[20, 50, 100, 200]"
          :page-size="limit"
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>

    <!-- 上传审核图弹窗 -->
    <el-dialog
      v-model="dialogImageVisible"
      title="上传审核图"
      :close-on-click-modal="false"
      @closed="beforeClose"
    >
      <el-upload
        class="upload-demo"
        drag
        action="#"
        :limit="5"
        :auto-upload="false"
        :file-list="fileList"
        :http-request="customUpload"
        accept="application/pdf"
        :before-upload="beforeUpload"
        :on-exceed="handleExceed"
        :on-remove="removeSuccess"
      >
        <i class="el-icon-upload" />
        <div class="el-upload__text">将文件拖到此处，或<em>点击上传</em></div>
        <template #tip>
          <div class="el-upload__tip">
            请按顺序（报送表、人员信息采集表）上传加盖公章的扫描文件，格式为PDF，单个文件大小不超过20M
          </div>
        </template>
      </el-upload>
      <el-button type="primary" size="mini" class="enter-upload" style="margin-top:20px" @click="updateFile">
        确认上传
      </el-button>
      <el-button type="danger" size="mini" class="enter-upload" style="margin-top:20px" @click="dialogImageVisible = false">
        取消
      </el-button>
    </el-dialog>

    <!-- 图片预览弹窗 -->
    <el-dialog v-model="dialogVisible" :append-to-body="true">
      <img :src="dialogImageUrl" width="100%" alt="" />
    </el-dialog>
  </div>
</template>

<script setup>
/**
 * 在线展演列表页 —— /online/list
 *
 * 【dist 已确认】chunk-104e4496 模块 8dc0（组件名 name:"ElementaryList"）。
 *
 * 功能：展示所有展演节目列表，支持按组别/关键词筛选，
 * 查看人员信息，查看状态（-2 未填写 / -1 已驳回 / 0 已填写 / 1 组委会通过），
 * 以及操作按钮（补填信息 / 修改）。
 *
 * 表格字段：choir_name / name / group / contact_name / contact_phone / crew / leader / status
 *
 * API：
 *   GET /api/live/list → 列表数据
 *   GET /api/scan/files?type=1 → 已上传审核图
 *   POST /api/scan/upload → 上传审核图（走七牛）
 */
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { liveApi } from '@/api/live'
import { scanApi } from '@/api/scan'
import { qiniuApi } from '@/api/misc'
import ShowOnlinePerson from '@/components/online/ShowOnlinePerson.vue'
import OnlineStatus from '@/components/online/OnlineStatus.vue'
import Remark from '@/components/common/Remark.vue'

const router = useRouter()

// ===================== data =====================
const keyword = ref(null)
const group = ref(null)
const page = ref(1)
const limit = ref(20)
const total = ref(0)
const data = ref([])

const dialogImageVisible = ref(false)
const dialogImageUrl = ref('')
const dialogVisible = ref(false)
const fileList = ref([])
const filename = ref('')
const QiniuData = reactive({ token: '', key: 'ylbxt/' })
const domain = 'https://upload.qiniup.com'
const host = 'https://img.atyth.com/'

// ===================== lifecycle =====================
import { useTabsStore } from '@/store'
const tabsStore = useTabsStore()

import { onMounted } from 'vue'
onMounted(() => { getData() })

// ===================== methods =====================
function handleSizeChange(val) {
  page.value = 1
  limit.value = val
  getData()
}

function refresh() { getData() }

function handleCurrentChange(val) {
  page.value = val
  getData()
}

function getData() {
  const params = {
    page: page.value,
    limit: limit.value,
    keyword: keyword.value,
    group: group.value
  }
  liveApi.getLiveReportList({ params }).then((res) => {
    const d = res.data
    if (d.code === 0) {
      total.value = d.count
      data.value = d.data
    } else {
      ElMessage.error(d.msg)
    }
  })
}

function edit(row) {
  const targetPath = '/online/edit/' + row.id
  const label = '现场展演修改'
  // 与 dist 原版完全一致：addTab → router.push
  tabsStore.addTab({ name: targetPath, label }).then(() => {
    router.push({ path: targetPath })
  })
}

function getQiniuToken() {
  qiniuApi.getToken().then((res) => {
    const d = res.data
    if (d.code === 0) {
      QiniuData.token = d.uptoken
    } else {
      ElMessage.error(d.msg)
    }
  })
}

function beforeUpload(file) {
  filename.value = file.name
  QiniuData.key += rename(file.name)
  const sizeMB = file.size / 1024 / 1024
  const isPdf = file.type === 'application/pdf'
  if (!isPdf) {
    ElMessage.error('请上传 .pdf 文件')
    return false
  }
  if (sizeMB > 20) {
    ElMessage.error('文件大小不能超过20M')
    return false
  }
  return true
}

function rename(name) {
  return name
}

function handleExceed() {
  ElMessage.error('文件数量超过限制！')
}

function removeSuccess(file) {
  const idx = fileList.value.findIndex(f => f.uid === file.uid)
  if (idx >= 0) fileList.value.splice(idx, 1)
}

function beforeClose() {
  fileList.value = []
}

function customUpload(option) {
  qiniuApi.getToken().then((res) => {
    const d = res.data
    if (d.code !== 0) { ElMessage.error(d.msg); return }
    QiniuData.token = d.uptoken

    const formData = new FormData()
    formData.append('file', option.file)
    formData.append('token', QiniuData.token)
    formData.append('key', QiniuData.key + rename(option.file.name))

    const xhr = new XMLHttpRequest()
    xhr.open('POST', domain)
    xhr.onload = () => {
      if (xhr.status === 200) {
        try {
          const result = JSON.parse(xhr.responseText)
          const key = result.key || (QiniuData.key + rename(option.file.name))
          fileList.value.push({
            uid: option.file.uid,
            url: host + key,
            name: filename.value,
            size: option.file.size,
            type: option.file.raw?.type || option.file.type
          })
          QiniuData.key = 'ylbxt/'
          ElMessage.success('上传成功')
        } catch {
          ElMessage.error('上传失败')
        }
      } else {
        ElMessage.error('上传失败')
      }
    }
    xhr.onerror = () => ElMessage.error('上传失败')
    xhr.send(formData)
  })
}

function updateFile() {
  // 确认上传 → 调用 scanApi 上传审核图
  const payload = { type: 1, files: fileList.value }
  scanApi.uploadImage(payload).then((res) => {
    const d = res.data
    if (d.code === 0) {
      ElMessage.success('上传成功！')
    } else {
      ElMessage.error(d.msg || '上传失败！')
    }
    dialogImageVisible.value = false
  })
}
</script>

<style lang="scss" scoped>
.bg {
  padding: 10px;
  position: relative;
}
.options {
  padding: 10px;
  position: relative;
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}
.menu-button { width: 100px; }
.content {
  padding: 10px;
  position: relative;
}
.bg-list {
  background: #fff;
  padding: 16px;
  border-radius: 4px;
}
.title {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 12px;
}
.my-pagination {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
.enter-upload {
  display: block;
}
</style>
