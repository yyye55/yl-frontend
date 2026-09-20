<!--
  /committee/online —— 展演节目列表

  【可信度：A】
    dist 证据：chunk-30fc0b04 模块 c502
    父路由：/committee (meta.role = 2 → type=2 组委会)

  业务说明（基于 dist 模块 c502）：
    - 标题：展演节目列表
    - 表格：4 列（序号/合唱团名称/节目名称/组别/联系人/联系电话/人员信息/状态）
    - **无审核按钮**（只读列表，status 字段仅用于展示）
    - **无导出按钮**
    - **无 keyword 搜索**
    - 顶部筛选：group select（6 个字符串选项，均可为 null）
    - **七星云 PDF 上传 dialog**：dialogImageVisible，内含 el-upload（drag 拖拽，limit=5，
      格式=PDF，size≤20M，token+key 上传到七星云）
    - **edit 按钮**：调用 tabsStore.addTab 打开 /online/edit/:id 新 tab
    - **人员信息**：ShowOnlinePerson(crew, leader) — 与 ShowPerson 完全不同的数据结构
    - Tabs 存在：tabsStore.addTab / removeTab

  API（来自 dist c502）：
    - GET  /api/committee/online/list → {code, msg, data: LiveReport[], count}
      后端：live_page(request) → LiveReport.objects.all().order_by("id")
    - POST /api/scan/cau            → image/uploadImage(e)  body {type:1, files:[...]}
      后端：ScanFiles.objects.get_or_create(user_id=auth.id, type=type)
    - GET  /api/qiniu/token        → qiniuApi.getToken() 返回 uptoken
    - GET  /api/scan/files         → scanApi.getImages() 返回当前用户已上传的 ScanFiles

  【重要】这是**完全不同的业务模块**，不是 CommitteeReportList 的变体：
    - 数据源：LiveReport（现场展演） vs Report（节目报名）
    - 人员信息：ShowOnlinePerson(crew+leader) vs ShowPerson(person)
    - 无审核逻辑、无导出、无 keyword 搜索
    - 有七星云文件上传功能
    - 有 Tabs 联动
-->
<template>
  <div class="bg">
    <div class="options">
      <el-input
        v-model="keyword"
        class="input-with-select"
        placeholder="请输入内容"
        size="mini"
        @change="getData"
      >
        <template #append>
          <el-button :icon="Search" />
        </template>
      </el-input>

      <el-select v-model="group" placeholder="组别" size="mini" @change="getData">
        <el-option label="全部" :value="null" />
        <el-option label="大学生甲组（非专业组）" value="大学生甲组（非专业组）" />
        <el-option label="大学生乙组（专业组）" value="大学生乙组（专业组）" />
        <el-option label="高校教师组" value="高校教师组" />
        <el-option label="中小学教师组" value="中小学教师组" />
        <el-option label="中小学生组" value="中小学生组" />
      </el-select>

      <el-button class="menu-button" type="primary" size="mini" @click="refresh">
        刷新
      </el-button>
    </div>

    <div class="content">
      <div class="bg-list">
        <p class="title">展演节目列表</p>

        <el-table :data="data" border size="mini" style="width: 100%">
          <el-table-column type="index" prop="date" label="序号" header-align="center" align="center" />
          <el-table-column prop="choir_name" label="合唱团名称" header-align="center" align="center" show-overflow-tooltip />
          <el-table-column prop="name" label="节目名称" header-align="center" align="center" show-overflow-tooltip />
          <el-table-column prop="group" label="组别" header-align="center" align="center" show-overflow-tooltip />
          <el-table-column prop="contact_name" label="联系人" header-align="center" align="center" />
          <el-table-column prop="contact_phone" label="联系电话" header-align="center" align="center" />
          <el-table-column label="人员信息" header-align="center" align="center">
            <template #default="{ row }">
              <ShowOnlinePerson :crew="row.crew" :leader="row.leader" />
            </template>
          </el-table-column>
          <el-table-column label="状态" header-align="center" align="center">
            <template #default="{ row }">
              <Status :status="row.status" />
            </template>
          </el-table-column>
        </el-table>

        <el-pagination
          class="my-pagination"
          v-model:current-page="page"
          v-model:page-size="limit"
          :page-sizes="[20, 50, 100, 200]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>

    <!-- 七星云 PDF 上传 dialog -->
    <el-dialog
      v-model="dialogImageVisible"
      title="上传审核图"
      :close-on-click-modal="false"
      @closed="beforeClose"
    >
      <el-upload
        ref="uploadRef"
        class="upload-demo"
        drag
        :limit="5"
        :auto-upload="false"
        :file-list="fileList"
        :on-exceed="handleExceed"
        :on-remove="removeSuccess"
        :before-upload="beforeUpload"
      >
        <i class="el-icon-upload" />
        <div class="el-upload__text">将文件拖到此处，或<em>点击上传</em></div>
      </el-upload>
      <div class="el-upload__tip">
        请按顺序（报送表、人员信息采集表）上传加盖公章的扫描文件，格式为PDF，单个文件大小不超过20M
      </div>
      <el-button class="enter-upload" type="primary" size="mini" style="margin-top: 20px" @click="updateFile">
        确认上传
      </el-button>
      <el-button class="enter-upload" type="danger" size="mini" style="margin-top: 20px" @click="dialogImageVisible = false">
        取消
      </el-button>
    </el-dialog>

    <!-- 图片预览 dialog -->
    <el-dialog v-model="dialogVisible" :append-to-body="true">
      <img width="100%" :src="dialogImageUrl" alt="" />
    </el-dialog>
  </div>
</template>

<script setup>
/**
 * 【Vue2 → Vue3 迁移说明】
 * dist c502 原始代码：
 *   this.$api.committee.online.getList → committeeApi.online.getList
 *   this.$api.image.uploadImage        → scanApi.uploadImage
 *   this.$api.communal.getQiNiuToken  → qiniuApi.getToken
 *   this.$hevueImgPreview             → 原为插件调用，改为 el-image preview-src-list
 *   computed: ...Object(P["c"])(["tabsActive","tabs"])
 *     → import { storeToRefs } from 'pinia'
 *     → const { tabsActive, tabs } = storeToRefs(useTabsStore())
 *     → const { removeTab, addTab } = useTabsStore()
 *   this.addTab({name, label})         → addTab({name, label})
 *     .then(t => { if (t != null) this.$router.push(...) })
 *     → 同上逻辑
 *   dialogImageVisible: false (v-model)
 *   handlePictureCardPreview            → 预览
 */
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'

import { committeeApi } from '@/api/committee'
import { scanApi } from '@/api/scan'
import { qiniuApi } from '@/api/misc'
import { useTabsStore } from '@/store/modules/tabs'
import Status from '@/components/common/Status.vue'
import ShowOnlinePerson from '@/components/online/ShowOnlinePerson.vue'

const router = useRouter()
const tabsStore = useTabsStore()
const { tabs } = storeToRefs(tabsStore)

const keyword = ref(null)
const group = ref(null)
const status = ref(null)
const page = ref(1)
const limit = ref(20)
const total = ref(0)
const data = ref([])

// 上传相关
const dialogImageVisible = ref(false)
const dialogImageUrl = ref('')
const dialogVisible = ref(false)
const fileList = ref([])
const filename = ref('')
const QiniuData = ref({ token: '', key: 'ylbxt/' })
const domain = 'https://upload.qiniup.com'
const host = 'https://img.atyth.com/'

function handleSizeChange(size) { page.value = 1; limit.value = size; getData() }
function refresh() { getData() }
function handleCurrentChange(current) { page.value = current; getData() }

function getData() {
  const params = {
    page: page.value, limit: limit.value,
    keyword: keyword.value, group: group.value, status: status.value
  }
  committeeApi.online.getList(params).then((res) => {
    const body = res?.data
    if (!body) { ElMessage.error('响应为空'); return }
    if (body.code === 0) { total.value = body.count; data.value = body.data }
    else ElMessage.error(body.msg || '获取失败')
  })
}

function edit(row) {
  const target = '/online/edit/' + row.id
  const label = '现场展演修改'
  tabsStore.addTab({ name: target, label }).then(() => {
    router.push({ path: target })
  })
}

function getQiniuToken() {
  qiniuApi.getToken().then((res) => {
    const body = res?.data
    if (!body) return
    if (body.code === 0) QiniuData.value.token = body.uptoken
    else ElMessage.error(body.msg)
  })
}

function beforeUpload(rawFile) {
  filename.value = rawFile.name
  QiniuData.value.key += rename(rawFile.name)
  const overSize = rawFile.size / 1024 / 1024 > 20
  const isPdf = rawFile.type === 'application/pdf'
  if (!isPdf) {
    ElMessage.error('请上传 .pdf 文件')
    return false
  }
  if (overSize) {
    ElMessage.error('文件大小不能超过20M')
    return false
  }
  return true
}

function rename(name) {
  const dot = name.lastIndexOf('.')
  const ext = dot >= 0 ? name.substring(dot) : ''
  return Date.now() + '_' + Math.random().toString(36).substring(2) + ext
}

function handleExceed() { ElMessage.error('文件数量超过限制！') }

function uploadSuccess(response, file) {
  fileList.value.push({
    uid: file.uid,
    url: host + response.key,
    name: filename.value,
    size: file.size,
    type: file.raw.type
  })
  QiniuData.value.key = 'ylbxt/'
}

function removeSuccess(file) {
  fileList.value = fileList.value.filter(f => f.uid !== file.uid)
}

function beforeClose() {
  fileList.value = []
  dialogImageVisible.value = false
}

function updateFile() {
  scanApi.uploadImage({ type: 1, files: fileList.value }).then((res) => {
    const body = res?.data
    if (!body) { ElMessage.error('响应为空'); return }
    if (body.code === 0) { ElMessage.success('上传成功！'); dialogImageVisible.value = false }
    else ElMessage.error('上传失败！')
  })
}

onMounted(() => { getData() })
</script>

<style lang="scss" scoped>
.bg { padding: 10px; }
.options {
  display: flex; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 10px;
  > * { width: 220px !important; }
  > .el-button { width: auto !important; }
}
.content { display: flex; flex-direction: column; }
.title {
  font-size: 16px; font-weight: 600; margin: 10px 0; position: relative; padding-left: 12px;
  &::before { content: ""; position: absolute; left: 0; top: 50%; transform: translateY(-50%); width: 4px; height: 16px; background-color: #036; border-radius: 2px; }
}
.my-pagination { margin-top: 16px; display: flex; justify-content: flex-end; }
:deep(.enter-upload) { margin-left: 10px; }
</style>
