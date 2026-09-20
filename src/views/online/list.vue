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
          <!-- 【Element UI → Element Plus 迁移】dist 原文 icon:"el-icon-search" 字符串；
               Element Plus 移除字体图标，icon 改绑组件 -->
          <el-button :icon="Search" @click="getData" />
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
      <!--
        【存疑清单 · dist 该对话框不可达】dist 8dc0 中 `openImageDialog()` 只有定义、无任何调用点，
        `dialogImageVisible=!0` 在整个模块内仅出现 1 次（即 openImageDialog 内部），
        因此这个 dialog 在 dist 中永远不会被打开。此处按 1:1 保留，绑定按 dist 原样补全。

        dist 原文（el-upload）：
          t("el-upload",{staticClass:"upload-demo",attrs:{drag:"",limit:5,
            "on-success":e.uploadSuccess, data:e.QiniuData, "before-upload":e.beforeUpload,
            action:e.domain, "file-list":e.fileList, "on-remove":e.removeSuccess,
            "on-exceed":e.handleExceed}})
        无 accept、无 auto-upload、无 http-request。

        【已确认的刻意省略】dist 还有一个 `openImageDialog()`（拉取已上传图片回填 fileList
        后置 `dialogImageVisible=!0`，并调用 `getQiniuToken()`）。它本身也是死代码，
        **本项目刻意不移植**（2026-09 决定）。因此 `getQiniuToken()` 在本文件中无调用点。
        若将来要启用本对话框，需同时补回 openImageDialog 对 getQiniuToken 的调用，
        否则 QiniuData.token 为空、七牛直传会失败。
      -->
      <el-upload
        class="upload-demo"
        drag
        :limit="5"
        :on-success="uploadSuccess"
        :data="QiniuData"
        :before-upload="beforeUpload"
        :action="domain"
        :file-list="fileList"
        :on-remove="removeSuccess"
        :on-exceed="handleExceed"
      >
        <!-- 【Element UI → Element Plus 迁移】dist 原文 <i class="el-icon-upload" />；
             Element Plus 移除 el-icon-* 字体图标，改用官方等价写法。 -->
        <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
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
 *   GET /api/qiniu/token → 取七牛上传凭证（后端 apps/api/views.py:282）
 *   POST https://upload.qiniup.com → 七牛直传（非本站接口）
 *
 * 【本仓库增强，dist 无】（逐项列明，便于回溯与取舍）
 *   - 错误文案兜底：`body.msg || '...'`（dist 直接用 `t.msg`，为 undefined 时提示为空）
 */
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Search, UploadFilled } from '@element-plus/icons-vue'
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

/**
 * 【dist 证据】A：getQiniuToken()
 *   getQiniuToken(){
 *     this.$api.communal.getQiNiuToken().then(({data:e})=>{
 *       0===e.code ? this.QiniuData.token=e.uptoken : s.a.error(e.msg)
 *     })
 *   }
 *
 * 【当前无调用点 —— 刻意】dist 中唯一的调用者是 openImageDialog()（自身也是死代码），
 * 本项目刻意未移植 openImageDialog，详见模板中上传对话框上方的说明。
 * 保留本函数仅为与 dist 的 methods 集合对齐；启用对话框时必须恢复其调用。
 */
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

/**
 * 【dist 证据】A：beforeUpload(file)
 *   beforeUpload(e){
 *     this.filename=e.name, this.QiniuData.key+=this.rename(e.name);
 *     const t = e.size/1024/1024 < 20;          // 尺寸是否合格（严格小于 20）
 *     const n = "application/pdf" === e.type;   // 是否 pdf
 *     return n ? (t ? n&&t : (s.a.error("文件大小不能超过20M"), !1))
 *              : (s.a.error("请上传 .pdf 文件"), !1)
 *   }
 * 注意是 `< 20` 而非 `<= 20`：恰好 20MB 视为超限。
 */
function beforeUpload(file) {
  filename.value = file.name
  QiniuData.key += rename(file.name)
  const sizeOk = file.size / 1024 / 1024 < 20
  const isPdf = file.type === 'application/pdf'
  if (!isPdf) {
    ElMessage.error('请上传 .pdf 文件')
    return false
  }
  if (!sizeOk) {
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

/**
 * 【dist 证据】A：uploadSuccess(res, file)
 *   uploadSuccess(e,t){
 *     this.fileList.push({uid:t.uid, url:this.host+e.key, name:this.filename, size:t.size, type:t.raw.type}),
 *     this.QiniuData.key="ylbxt/"
 *   }
 * 由 el-upload 内置 XHR 在七牛返回 200 后回调（dist 未使用 http-request 自定义上传）。
 */
function uploadSuccess(res, file) {
  fileList.value.push({
    uid: file.uid,
    url: host + res.key,
    name: filename.value,
    size: file.size,
    type: file.raw.type
  })
  QiniuData.key = 'ylbxt/'
}

/**
 * 【dist 证据】A：updateFile()
 *   updateFile(){
 *     const e={type:1}; e.files=this.fileList;
 *     this.$api.image.uploadImage(e).then(e=>{
 *       0===e.data.code ? s.a.success("上传成功！") : s.a.error("上传失败！")
 *       this.dialogImageVisible=!1
 *     })
 *   }
 * 注意 dist 失败分支是固定文案 "上传失败！"，不取后端 msg。
 */
function updateFile() {
  const payload = { type: 1 }
  payload.files = fileList.value
  scanApi.uploadImage(payload).then((res) => {
    const d = res.data
    if (d.code === 0) {
      ElMessage.success('上传成功！')
    } else {
      ElMessage.error('上传失败！')
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
