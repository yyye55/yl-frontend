<!--
  /committee/user —— 组委会账号列表

  【可信度：A】
    dist 证据：chunk-4a3bd144 模块 8456

  业务说明：
    - 父路由：/committee (meta.role = 2 → type=2 组委会)
    - 后端 apps/api/views.py committee_report_list / user_list / user_update_admin / user_export_admin

  表格列（dist 原文）：
    序号 / 名称 / 账号 / 修改人姓名 / 修改人联系方式 / 其他信息 / 操作(重置密码)

  API:
    - list:    GET  /api/committee/user/list   → 过滤 type ∈ {0, 4}（学校、省级）
    - update:  PUT  /api/committee/user/        body { id, password } → 仅当 password 非空时改密码
    - export:  GET  /api/committee/user/export  → Blob xlsx（committee 看到所有 user，admin 只看到 type=0）
                                                 后端会写 log (write_log action_type=6)

  dist 已知缺陷/死代码（保持原行为，不擅自修复）：
    1) 表格没有「操作」之外的功能键（无「修改信息」按钮）
    2) methods.modify(row) 与 $refs.modify.show() / ModifyUserInfo 组件 —— dist 写了完整实现
       但模板里**没有任何按钮调用 modify(row)**。ModifyUserInfo 组件也仅依赖 props.user，
       不会自动弹出。这是 dist 自身的死代码。
    3) data 中的 dtype / status / isDelete / ids 字段在 dist 源码里声明后从未使用；
       Vue3 中保留以便行为对齐（不会影响接口）。

  page-sizes：dist 原文是 [10,20,50,100]（与 teacher 的 [20,50,100,200] 不同），
  默认 limit=10 —— 这是 user 页独有的配置，按原样保留。
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

      <el-button
        type="primary"
        size="mini"
        @click="reflush"
      >刷新</el-button>

      <el-button
        type="primary"
        size="mini"
        :loading="exporting"
        @click="download('账号列表')"
      >导出所有账号</el-button>
    </div>

    <div class="content">
      <div class="bg-list">
        <p class="title">账号列表</p>

        <el-table :data="data" border size="mini" style="width: 100%">
          <el-table-column type="index" label="序号" />
          <el-table-column prop="nickname" label="名称" />
          <el-table-column prop="username" label="账号" />
          <el-table-column prop="leader" label="修改人姓名" />
          <el-table-column prop="tel" label="修改人联系方式" />
          <el-table-column prop="description" label="其他信息" show-overflow-tooltip />

          <el-table-column label="操作" header-align="center" align="center">
            <template #default="{ row }">
              <el-button type="text" size="small" @click="resetPassword(row.id)">重置密码</el-button>
            </template>
          </el-table-column>
        </el-table>

        <el-pagination
          class="my-pagination"
          v-model:current-page="page"
          v-model:page-size="limit"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>

    <!--
      【dist 死代码·保留】ModifyUserInfo 组件在 dist 中是引用了的，但没有任何按钮触发 modify(row)
      → show()。这里**不挂载**该组件，保持与 dist 行为一致（dist 也不会自动弹出）。
      如果未来需要「修改信息」功能，可在此处解注释并新增一个表格按钮调用 modify(row)。
    -->
    <!-- <ModifyUserInfo ref="modify" :user="user" /> -->
  </div>
</template>

<script setup>
/**
 * Committee User 列表（账号列表）
 */
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search } from '@element-plus/icons-vue'

import { committeeApi } from '@/api/committee'
import { downloadExcelFile } from '@/utils/excel'

const keyword = ref(null)
const page = ref(1)
const limit = ref(10)
const total = ref(0)
const data = ref([])
const exporting = ref(false)

// 以下字段在 dist 中声明但未使用 —— Vue3 中保留以保证 data 形状对齐
// const dtype = ref(0)
// const isDelete = ref(null)
// const status = ref(0)
// const ids = ref([])
// const user = ref({})
// const modifyRef = ref(null)

function handleSizeChange(size) {
  page.value = 1
  limit.value = size
  getData()
}

function reflush() {
  getData()
}

function handleCurrentChange(current) {
  page.value = current
  getData()
}

/**
 * 【dist 证据】A：getData()
 *   getData(){
 *     const e={page:this.page, limit:this.limit, keyword:this.keyword, parent_id:!0};
 *     this.$api.committee.user.list(e).then(({data:e})=>{
 *       0===e.code?(this.total=e.count, this.data=e.data):ElMessage.error(e.msg)
 *     })
 *   }
 *
 * 后端 apps/api/views.py user_list(committee=True) 的过滤：
 *   qs = qs.filter(type__in=(0, 4))   ← 仅列出学校(0) 和省级(4) 用户
 * 注意：dist 传的 parent_id: true 在后端 list_page 中**没有任何作用**（被忽略），
 * 但 axios 仍会把 true 作为查询参数发出去（"parent_id=true"）。
 * 这是 dist 的死字段，本项目保留以保证请求完全一致。
 */
function getData() {
  const params = {
    page: page.value,
    limit: limit.value,
    keyword: keyword.value,
    parent_id: true  // 【dist 原样】后端忽略，但 dist 原文确实发了这个参数
  }
  committeeApi.user.list(params).then((res) => {
    const body = res && res.data
    if (!body) {
      ElMessage.error('响应为空')
      return
    }
    if (body.code === 0) {
      total.value = body.count
      data.value = body.data
    } else {
      ElMessage.error(body.msg || '获取失败')
    }
  }).catch(() => {
    // 拦截器已处理
  })
}

/**
 * 【dist 证据】A：resetPassword(id)
 *   ElMessageBox.prompt("请输入新密码","重置密码",{confirmButtonText:"确定",cancelButtonText:"取消"})
 *     .then(({value})=>{
 *       const n={id:e, password:t};
 *       this.$api.committee.user.update(n).then(({data:e})=>{
 *         0===e.code?(ElMessage.success("重置成功"), this.getData()):ElMessage.error(e.msg)
 *       })
 *     })
 *     .catch(()=>{ ElMessage({type:"info", message:"取消输入"}) })
 *
 * 注意：dist 这里是直接调用 committee.user.update 而不是 admin 路由。
 * 后端 apps/api/views.py register_user_routes("/committee", 2) 的 PUT /api/committee/user/
 * 调用的是 user_update_admin —— 它会接受任意 user_id 修改（不像 /api/user 那样限制自己），
 * 这是 committee 域特有的管理能力。
 */
function resetPassword(id) {
  ElMessageBox.prompt('请输入新密码', '重置密码', {
    confirmButtonText: '确定',
    cancelButtonText: '取消'
  }).then(({ value }) => {
    committeeApi.user.update({ id, password: value }).then((res) => {
      const body = res && res.data
      if (!body) {
        ElMessage.error('响应为空')
        return
      }
      if (body.code === 0) {
        ElMessage.success('重置成功')
        getData()
      } else {
        ElMessage.error(body.msg || '重置失败')
      }
    })
  }).catch(() => {
    ElMessage.info('取消输入')
  })
}

/**
 * 【dist 证据】A：download(name)
 *   download(e){
 *     this.$api.committee.user.download().then(t=>{
 *       const n=new Blob([t.data],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=utf-8"});
 *       const r=document.createElement("a");
 *       const i=window.URL.createObjectURL(n);
 *       r.href=i; r.download=e;
 *       document.body.appendChild(r); r.click();
 *       document.body.removeChild(r);
 *       window.URL.revokeObjectURL(i);
 *     })
 *   }
 *
 * 注意 dist 这里手写了 Blob + <a download> 流程，但项目内已有 utils/excel.js 的 downloadExcelFile
 * 实现同样的功能（且 dist 原始 utils 里也暴露了 downloadExcelFile）。这里用项目内的统一实现。
 *
 * 后端：GET /api/committee/user/export → xlsx
 * committee 用户看到所有 user；admin 用户只看到 type=0（apps/api/views.py:482 user_export_admin）
 */
function download(name) {
  if (exporting.value) return
  exporting.value = true
  committeeApi.user.download().then((res) => {
    const blob = res && res.data
    if (!blob) {
      ElMessage.error('响应为空')
      return
    }
    downloadExcelFile(blob, name)
  }).catch(() => {
    // 拦截器已处理
  }).finally(() => {
    exporting.value = false
  })
}

onMounted(() => {
  getData()
})
</script>

<style lang="scss" scoped>
/*
 * 【CSS 证据等级：B】
 * dist CSS 文件未发现本页面专属样式（已 grep 全部 chunk-*.css）。
 * 与 teacher.vue 共用同一份布局样式以保持视觉一致。
 */
.bg {
  padding: 10px;
  position: relative;
}

.options {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 10px;

  > * {
    width: 220px !important;
  }
  > .el-button {
    width: auto !important;
  }
}

.content {
  display: flex;
  flex-direction: column;
}

.title {
  font-size: 16px;
  font-weight: 600;
  margin: 10px 0;
  position: relative;
  padding-left: 12px;

  &::before {
    content: "";
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 4px;
    height: 16px;
    background-color: #036;
    border-radius: 2px;
  }
}

.my-pagination {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
