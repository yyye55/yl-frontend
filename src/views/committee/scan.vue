<!--
  /committee/scan —— 扫描文件查看（学校层面）

  【可信度：A】
    dist 证据：chunk-5e98f976 模块 d3b0
    父路由：/committee (meta.role = 2 → type=2 组委会)

  业务说明（基于 dist data()）：
    - 标题：报名列表
    - 表格仅 3 列：序号 / 学校名称(user.nickname) / 操作（ShowScFile 预览或"没有扫描文件上传"）
    - 有 keyword 搜索 UI（el-input + #append 搜索按钮，@change 触发 getData）
    - 无 group select
    - 无 status select
    - 无审核/导出/上传
    - 无 Tabs
    - dialogFileVisible：el-image preview-src-list 多图预览
    - **scan 不是二维码扫描，而是"扫描文件"查看**

  API（来自 dist d3b0）：
    - GET  /api/scan/list → scanApi.getList({page,limit,keyword}) → {code,msg,data[],count}
      后端：User.objects.filter(type__in=[0,1,4]).order_by("id") + scanfile 附加
      返回每条记录含 user.nickname 和 scanfile 数组

  ShowScFile 组件：
    - scanfile.length > 0 → 渲染 ShowScFile（有预览按钮）
    - scanfile.length === 0 → "没有扫描文件上传" 禁用按钮

  【scan 的含义】这里的 scan 指的是"扫描件上传"（ScanFiles），不是扫码枪/二维码。
  用于 committee 查看各学校上报的盖章扫描文件（PDF/图片）。
  命名是 ScanFiles 扫描文件管理，不是 scan 扫描动作。

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

      <!-- dist 该页没有 menu-button 类，也没有对应 CSS 规则 -->
      <el-button type="primary" size="mini" @click="reflush">
        刷新
      </el-button>
    </div>

    <div class="content">
      <div class="bg-list">
        <p class="title">报名列表</p>

        <el-table :data="data" border size="mini" style="width: 100%">
          <!-- dist 三列均无 align / header-align（与 log.vue 不同，勿照抄） -->
          <el-table-column type="index" prop="date" label="序号" />
          <el-table-column prop="nickname" label="学校名称" />
          <el-table-column label="操作">
            <template #default="{ row }">
              <ShowScFile v-if="row.scanfile && row.scanfile.length > 0" :data="row.scanfile" :is-show="true" />
              <el-button
                v-else
                size="mini"
                type="danger"
                disabled
                style="margin-left: 10px"
              >
                没有扫描文件上传
              </el-button>
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

    <!-- 多图预览 dialog -->
    <el-dialog v-model="dialogFileVisible" width="700px">
      <div class="detail-content" style="margin: auto">
        <el-image
          v-for="(src, i) in srcList"
          :key="i"
          :src="src"
          :preview-src-list="srcList"
          style="width: 100px; height: 100px; margin: auto; display: block"
          fit="cover"
        />
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
/**
 * 【Vue2 → Vue3 迁移说明】
 * dist d3b0 原始代码：
 *   this.$api.image.getList        → scanApi.getList
 *   this.$hevueImgPreview(e.url)   → el-image :preview-src-list 替代（el-dialog + el-image）
 *   document.createElement('a').href / .download / .target / .click → download() 方法保留
 *   ref() 初始化: keyword=null, page=1, limit=20, total=0, data=[], ids=[],
 *     provinceId="", provinces=[], dialogFileVisible=false, srcList=[], type=null
 */
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Search } from '@element-plus/icons-vue'

import { scanApi } from '@/api/scan'
import ShowScFile from '@/components/common/ShowScFile.vue'

const keyword = ref(null)
const page = ref(1)
const limit = ref(20)
const total = ref(0)
const data = ref([])
const ids = ref([])
const provinceId = ref('')
const provinces = ref([])
const dialogFileVisible = ref(false)
const srcList = ref([])
const type = ref(null)

function handleSizeChange(size) { page.value = 1; limit.value = size; getData() }
function reflush() { page.value = 1; getData() }
function handleCurrentChange(current) { page.value = current; getData() }

function getData() {
  const params = { page: page.value, limit: limit.value, keyword: keyword.value }
  scanApi.getList(params).then((res) => {
    const body = res?.data
    if (!body) { ElMessage.error('响应为空'); return }
    if (body.code === 0) { total.value = body.count; data.value = body.data }
    else ElMessage.error(body.msg || '获取失败')
  })
}

function showFiles(files) {
  dialogFileVisible.value = true
  srcList.value = (files || []).map(f => f.url)
}

function download(url, name) {
  const a = document.createElement('a')
  a.href = url
  a.download = name
  // dist 原文即 '_black'（拼写错误）。浏览器视为无效值，行为等同未设置 target，
  // 但按规则7「保留常量」1:1 保留，不做"顺手修正"。
  a.target = '_black'
  a.click()
}

onMounted(() => { getData() })
</script>

<style lang="scss" scoped>
/*
 * 全量搬运自 css/chunk-5e98f976.b414b21d.css（9 条规则，scoped id 50989091）。
 * 仅去掉 [data-v-50989091] 属性选择器（由 Vue SFC 编译期生成等价的 scoped 属性）。
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
  width: calc(100% - 20px);
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

.detail-content {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr 1fr;
  grid-row-gap: 10px;
}
</style>
