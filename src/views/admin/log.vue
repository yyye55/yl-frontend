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

      <el-button type="primary" size="mini" @click="reflush">
        刷新
      </el-button>
    </div>

    <div class="content">
      <div class="bg-list">
        <p class="title">日志记录</p>

        <el-table :data="data" border size="mini" style="width: 100%">
          <el-table-column type="index" prop="name" label="序号" align="center" header-align="center" />
          <el-table-column prop="content" label="内容" align="center" header-align="center" show-overflow-tooltip />
          <el-table-column prop="user.nickname" label="操作账号" align="center" header-align="center" />
          <el-table-column prop="created_at" label="时间" align="center" header-align="center" />
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
function reflush() { page.value = 1; getData() }
function handleCurrentChange(current) { page.value = current; getData() }

function getData() {
  adminApi.log.list({ page: page.value, limit: limit.value, keyword: keyword.value }).then((res) => {
    const body = res?.data
    if (!body) { ElMessage.error('响应为空'); return }
    if (body.code === 0) { total.value = body.count; data.value = body.data }
    else ElMessage.error(body.msg || '获取失败')
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
</style>
