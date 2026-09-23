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
      【第十二届改造·第二轮已废弃】上传改走阿里云 OSS：小文件（biz: doc）由后端代传，
      经 @/services/ossUpload 的 uploadToOss()。该接口不再被本页调用，
      /api/qiniu/token 本身保留至全部上传点验证通过后再下线。
    - GET  /api/scan/files         → scanApi.getImages() 返回当前用户已上传的 ScanFiles

  【重要】这是**完全不同的业务模块**，不是 CommitteeReportList 的变体：
    - 数据源：LiveReport（现场展演） vs Report（节目报名）
    - 人员信息：ShowOnlinePerson(crew+leader) vs ShowPerson(person)
    - 无审核逻辑、无导出、无 keyword 搜索
    - 有七星云文件上传功能
    - 有 Tabs 联动

    【本仓库增强，dist 无】（逐项列明，便于回溯与取舍）
    - 接口空响应守卫：`if (!body) { ElMessage.error('响应为空'); return }`（dist 直接 `.then(t => ...)`，无此判断）
    - 错误文案兜底：`body.msg || '...'`（dist 直接用 `t.msg`，为 undefined 时提示为空）
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

      <!--
        【第十二届改造】同 /online/list，红头文件仅设 5 个组别。
        【BE-02 必须后端确认】实际后端 group 字段存储值待与后端对齐。
      -->
      <el-select v-model="group" placeholder="组别" size="mini" @change="getData">
        <el-option label="全部" :value="null" />
        <el-option label="管乐团-小学组" value="管乐团-小学组" />
        <el-option label="管乐团-中学组" value="管乐团-中学组" />
        <el-option label="管乐团-大学组" value="管乐团-大学组" />
        <el-option label="铜管乐团-小学组" value="铜管乐团-小学组" />
        <el-option label="铜管乐团-中学组" value="铜管乐团-中学组" />
      </el-select>

      <!-- dist 该页的按钮宽度走内联 style，本页 CSS 中没有 .menu-button 规则 -->
      <el-button
        class="menu-button"
        style="width: 100px"
        type="primary"
        size="mini"
        @click="refresh"
      >
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

    <!--
      七星云 PDF 上传 dialog

      【存疑清单 · dist 该对话框不可达】dist c502 中 `openImageDialog()` 只有定义、无任何调用点，
      `dialogImageVisible=!0` 在整个模块内仅出现 1 次（即 openImageDialog 内部），
      因此这个 dialog 在 dist 中永远不会被打开。此处按 1:1 保留，绑定按 dist 原样补全。

      dist 原文（el-upload）：
        t("el-upload",{staticClass:"upload-demo",attrs:{drag:"",limit:5,
          "on-success":e.uploadSuccess, data:e.QiniuData, "before-upload":e.beforeUpload,
          action:e.domain, "file-list":e.fileList, "on-remove":e.removeSuccess,
          "on-exceed":e.handleExceed}})
      无 ref，无 auto-upload。
    -->
    <el-dialog
      v-model="dialogImageVisible"
      title="上传审核图"
      :close-on-click-modal="false"
      @closed="beforeClose"
    >
      <el-upload
        class="upload-demo"
        drag
        :limit="5"
        :http-request="uploadFile"
        :before-upload="beforeUpload"
        :file-list="fileList"
        :on-remove="removeSuccess"
        :on-exceed="handleExceed"
      >
        <!-- 【Element UI → Element Plus 迁移】dist 原文 <i class="el-icon-upload" />。
             Element Plus 移除了 el-icon-* 字体图标，改用官方等价写法；
             拖拽区样式类 el-icon--upload 由 Element Plus 自身提供。
             与 @/components/common/UploadScanDialog.vue 保持同一写法。 -->
        <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
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
import { Search, UploadFilled } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'

import { committeeApi } from '@/api/committee'
import { scanApi } from '@/api/scan'
import { uploadToOss } from '@/services/ossUpload'
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
// 【第十二届改造·第二轮】filename / QiniuData / domain / host 已移除：
// key 改由后端生成，url 由上传服务返回，前端不再硬编码七牛域名。

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

/*
 * 【第十二届改造】上传通道由七牛直传换成阿里云 OSS（biz: doc）。
 *
 * 改动说明：
 *   - `:action` + `:data="QiniuData"` + `:on-success` 换成 `:http-request`，
 *     因为小文件现在由后端代传进 OSS，并复用统一上传服务的错误处理。
 *   - getQiniuToken() / QiniuData / domain / host / 本地 rename() 一并移除：
 *     凭证由服务内部处理，key 改由后端生成，url 由服务返回。
 *   - 【顺带修掉的缺陷】原 beforeUpload 里 `QiniuData.value.key +=` 是累加，
 *     一次选多个文件时第二个文件的 key 会变成「随机名1随机名2」。
 *
 * 【为什么处理器不返回 Promise】Element Plus 只在 httpRequest 返回 Promise 时
 * 才跑自己那套内部成功路径（往 fileList 里塞条目），本页的 fileList 是手工
 * push 的，返回非 Promise 让行为完全由下面的 .then 控制。
 */
function beforeUpload(rawFile) {
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

function uploadFile(options) {
  const file = options.file
  uploadToOss({ file, biz: 'doc' })
    .then(({ url }) => {
      fileList.value.push({
        uid: options.file.uid,
        url,
        name: file.name,
        size: file.size,
        type: file.type
      })
    })
    .catch((err) => {
      if (!err.shown) ElMessage.error(err.message || '文件上传失败')
    })
}

function handleExceed() { ElMessage.error('文件数量超过限制！') }

function removeSuccess(file) {
  fileList.value = fileList.value.filter(f => f.uid !== file.uid)
}

function beforeClose() {
  fileList.value = []
  dialogImageVisible.value = false
}

/** 【第十二届改造·空文件守卫】理由同 UploadScanDialog.updateFile —— 后端
 *  /api/scan/cau 对 files 不校验且无条件覆盖，空数组会把已有审核图清空并
 *  照样返回「修改成功!」。空列表直接挡在前端，不发请求。 */
function updateFile() {
  if (fileList.value.length === 0) {
    ElMessage.error('请先上传文件')
    return
  }

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
/*
 * 全量搬运自 css/chunk-30fc0b04.adf88d60.css（8 条规则，scoped id 73e737b9）。
 * 仅去掉 [data-v-73e737b9] 属性选择器（由 Vue SFC 编译期生成等价的 scoped 属性）。
 * 声明顺序、属性值均与 dist 逐字一致。
 */
.bg {
  position: relative;
  background: #fff;
  padding: 10px;
  min-height: calc(100% - 20px);
  width: calc(100% - 20px);
}

.options {
  box-shadow: 1px 1px 5px 1px #8c939d;
  padding: 10px 20px 0 20px;
  display: flex;
  justify-content: flex-start;
  flex-wrap: wrap;
  align-items: center;
}

.options > * {
  margin-bottom: 10px;
  margin-right: 10px;
}

.options > .el-input {
  width: 220px !important;
}

.content {
  position: relative;
  background-color: #fff;
  padding: 10px;
  margin-top: 20px;
  box-shadow: 1px 1px 5px 1px #8c939d;
  min-height: calc(100% - 150px);
}

.title {
  position: relative;
  border-bottom: 1px solid #dcdcdc;
  line-height: 30px;
  padding-left: 20px;
  margin-bottom: 10px;
}

.title:before {
  content: "";
  position: absolute;
  left: 0;
  bottom: 5px;
  width: 3px;
  height: 20px;
  background-color: #036;
}

.my-pagination {
  margin-top: 10px;
}
</style>
