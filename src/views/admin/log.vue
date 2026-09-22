<!--
  /admin/log —— 日志记录

  【可信度：A】
    dist 证据：chunk-9b9e14e0 模块 7f14
    父路由：/admin (meta.role = 3 → type=3 管理员)

  业务说明（基于 dist 模块 7f14）：
    - 标题：日志记录
    - 表格 4 列：序号 / 内容 / 操作账号(user.nickname) / 时间(created_at)
    - 无操作列，无新增/编辑/删除按钮
    - 无时间筛选，无 type 筛选，无导出
    - keyword 搜索（内容模糊匹配）
    - 分页 page-sizes=[20,50,100,200]

  API（来自 dist）：
    - GET /api/admin/log/list → adminApi.log.list({page,limit,keyword})
      后端：Logs.objects.all().order_by("-created_at") → filter(content__icontains=keyword)
    - 返回字段：id, content, user{nickname}, created_at

  【权限】后端 role_error(request, 3) 要求 type=3 管理员

  【无 Tabs】dist 不使用 tabsStore

  【无 Vue3 特殊迁移】结构简单，this.$message → ElMessage；this.$api.admin.log.list → adminApi.log.list

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
        @change="getData"
      >
        <template #append>
          <el-button :icon="Search" />
        </template>
      </el-input>

      <!-- dist 该按钮只有 {attrs:{type:"primary"}}，无 size -->
      <el-button type="primary" @click="reflush">
        刷新
      </el-button>
    </div>

    <div class="content">
      <div class="bg-list">
        <p class="title">日志记录</p>

        <el-table :data="data" border style="width: 100%">
          <!-- dist 原文即 label:"id"（疑为笔误，按规则7 保留常量 1:1 不动） -->
          <el-table-column type="index" prop="name" label="id" align="center" header-align="center" />
          <el-table-column prop="content" label="内容" align="center" header-align="center" show-overflow-tooltip />
          <el-table-column prop="user.nickname" label="操作账号" align="center" header-align="center" />
          <el-table-column prop="created_at" label="时间" align="center" header-align="center">
            <template #default="{ row }">{{ formatCreatedAt(row.created_at) }}</template>
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
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Search } from '@element-plus/icons-vue'

import { adminApi } from '@/api/admin'

const keyword = ref(null)
const status = ref(0)
const page = ref(1)
const limit = ref(20)
const total = ref(0)
const data = ref([])

function handleSizeChange(size) { page.value = 1; limit.value = size; getData() }
// dist: reflush(){this.getData()} —— 不重置页码
function reflush() { getData() }
function handleCurrentChange(current) { page.value = current; getData() }

function getData() {
  adminApi.log.list({ page: page.value, limit: limit.value, keyword: keyword.value }).then((res) => {
    const body = res?.data
    if (!body) { ElMessage.error('响应为空'); return }
    if (body.code === 0) { total.value = body.count; data.value = body.data }
    else ElMessage.error(body.msg || '获取失败')
  })
}

/**
 * 后端 created_at 返回 UTC 字符串（如 "2026-09-22 02:22:34.915124+00:00"），
 * 解析后按浏览器本地时区（北京时间）格式化为 yyyy-MM-dd HH:mm:ss。
 * 解析失败时原样返回，避免显示异常。
 */
function formatCreatedAt(date) {
  if (!date) return ''
  const s = String(date).replace(' ', 'T').replace(/\.(\d{3})\d+/, '.$1')
  const d = new Date(s)
  if (isNaN(d.getTime())) return String(date)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

onMounted(() => { getData() })
</script>

<style lang="scss" scoped>
/*
 * 全量搬运自 css/chunk-9b9e14e0.869b1786.css（6 条规则，scoped id 37597d4b）。
 * 仅去掉 [data-v-37597d4b] 属性选择器（由 Vue SFC 编译期生成等价的 scoped 属性）。
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
  height: 50px;
  box-shadow: 1px 1px 5px 1px #8c939d;
  padding: 0 20px;
  display: grid;
  grid-template-columns: 200px 150px 180px 100px 100px;
  justify-content: flex-start;
  gap: 20px;
  align-items: center;
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
  background-color: #d80e0e;
}

.my-pagination {
  margin-top: 10px;
}
</style>
