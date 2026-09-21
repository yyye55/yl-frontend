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
          <el-button><el-icon><Search /></el-icon></el-button>
        </template>
      </el-input>
      <el-button type="primary" @click="reflush"> 刷新 </el-button>
      <el-button type="primary" @click="add"> 添加账号 </el-button>
      <el-button type="primary" @click="download('账号列表')"> 导出所有账号 </el-button>
    </div>

    <div class="content">
      <div class="bg-list">
        <p class="title">账号列表</p>
        <el-table :data="data" border style="width:100%">
          <el-table-column type="index" label="序号" />
          <el-table-column prop="username" label="账号" />
          <el-table-column prop="nickname" label="名称" />
          <el-table-column prop="leader" label="修改人姓名" />
          <el-table-column prop="tel" label="修改人电话号码" />
          <el-table-column prop="description" show-overflow-tooltip label="其他信息" />
          <el-table-column label="操作">
            <template #default="{ row }">
              <el-button type="primary" size="small" @click="resetPassword(row.id)">重置密码</el-button>
              <el-button type="primary" size="small" @click="modify(row)">修改</el-button>
            </template>
          </el-table-column>
        </el-table>

        <el-pagination
          v-model:current-page="page"
          v-model:page-size="limit"
          class="my-pagination"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>

    <!-- 添加用户 -->
    <el-dialog v-model="showInfo" title="添加用户" width="40%">
      <el-form
        ref="ruleFormRef"
        class="demo-ruleForm"
        :model="form"
        :rules="rules"
        inline
        label-width="120px"
      >
        <el-form-item label="账号" prop="username">
          <el-input v-model="form.username" />
        </el-form-item>
        <el-form-item label="名称" prop="nickname">
          <el-input v-model="form.nickname" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="form.password" type="password" />
        </el-form-item>
        <el-form-item label="类型选择" prop="type">
          <el-select v-model="form.type" placeholder="请选择账号类型">
            <el-option label="组委会账号" :value="2" />
            <el-option label="市州账号" :value="1" />
            <el-option label="学校账号" :value="0" />
          </el-select>
        </el-form-item>
        <p style="margin:10px">提示：如果输入密码，则会更新密码，不输入，则不会改变密码</p>
        <p style="margin:10px">其他信息：（可以填写一些关于账号的介绍）</p>
        <el-input
          v-model="form.description"
          type="textarea"
          :rows="5"
          maxlength="200"
          show-word-limit
        />
      </el-form>
      <template #footer>
        <el-button @click="showInfo = false">取 消</el-button>
        <el-button type="primary" @click="submit">确 定</el-button>
      </template>
    </el-dialog>

    <!-- 修改用户 -->
    <el-dialog v-model="showEditInfo" title="修改用户" width="40%">
      <el-form
        ref="ruleEditFormRef"
        class="demo-ruleForm"
        :model="editForm"
        :rules="editRules"
        inline
        label-width="120px"
      >
        <el-form-item label="账号" prop="username">
          <el-input v-model="editForm.username" />
        </el-form-item>
        <el-form-item label="名称" prop="nickname">
          <el-input v-model="editForm.nickname" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="editForm.password" type="password" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditInfo = false">取 消</el-button>
        <el-button type="primary" @click="editSubmit">确 定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
/**
 * 管理员 - 用户管理（路由 /admin/user）
 *
 * 【可信度：A】逐行照搬 dist/chunk-5d7f0bd8 的模块 8ff7。原文关键内容：
 *
 *   模板：div.bg > div.options（搜索框 + 刷新 + 添加账号 + 导出所有账号）
 *                 > div.content > div.bg-list（p.title「账号列表」+ el-table + el-pagination）
 *         + el-dialog「添加用户」 + el-dialog「修改用户」
 *   表格列：序号(type=index) / 账号(username) / 名称(nickname) / 修改人姓名(leader)
 *           / 修改人电话号码(tel) / 其他信息(description, show-overflow-tooltip) / 操作
 *   操作列：重置密码 · 修改        ← 原文没有「删除」
 *
 *   data(){ return { keyword:null, showInfo:!1, showEditInfo:!1, status:0,
 *                    page:1, limit:10, total:0, data:[], user:{}, form:{}, editForm:{}, rules:{...} } }
 *
 *   getData(){ const e={page:this.page,limit:this.limit,keyword:this.keyword}
 *              this.$api.admin.user.list(e).then(({data:e})=>{
 *                0===e.code ? (this.total=e.count, this.data=e.data) : ElMessage.error(e.msg) }) }
 *   reflush(){ this.getData() }                    // ← 注意：不重置 page
 *   handleSizeChange(e){ this.page=1, this.limit=e, this.getData() }
 *   handleCurrentChange(e){ this.page=e, this.getData() }
 *   modify(e){ this.editForm=JSON.parse(JSON.stringify(e)), this.showEditInfo=!0 }
 *   resetPassword(e){ MessageBox.prompt("请输入新密码","重置密码",{confirmButtonText:"确定",cancelButtonText:"取消"})
 *       .then(({value:t})=>{ this.$api.admin.user.update({id:e,password:t}).then(({data:e})=>{
 *           0===e.code ? (ElMessage.success("重置成功"), this.getData()) : ElMessage.error(e.msg) }) })
 *       .catch(()=>{ ElMessage({type:"info",message:"取消输入"}) }) }
 *   editSubmit(){ this.$api.admin.user.update(this.editForm).then(({data:e})=>{
 *       0===e.code ? (ElMessage.success("修改成功"), this.showEditInfo=!1, this.getData()) : ElMessage.error(e.msg) }) }
 *   add(){ this.showInfo=!0 }
 *   download(e){ this.$api.admin.user.download().then(t=>{ ...Blob 下载，文件名用传入的 e... }) }
 *   submit(){ this.$api.admin.user.create(this.form).then(({data:e})=>{
 *       0===e.code ? (this.showInfo=!1, this.form={}, ElMessage.success("创建成功")) : ElMessage.warning(e.msg) }) }
 *
 * 【本页旧实现的问题（已整体重写）】
 *  1. 表格列全部对不上后端：旧版读 realName / school / phone / createdAt，
 *     而 apps/core/services.py 的 user_dict 只返回 id/username/nickname/description/tel/leader/type/parent_id，
 *     四个列恒为空白。
 *  2. 筛选条件对不上后端：旧版传 username，后端 user_list 只认 keyword；
 *     后端也不支持按 type 过滤（旧版的「角色」下拉是无效的）。
 *  3. 分页参数错误：旧版传 size，后端 list_page 读的是 limit，导致每页条数恒为默认 10。
 *  4. 删除功能是伪造的：旧版 onDelete 调用 admin.user.update({...row, deleted:true})，
 *     而后端 user_update_admin 只读取 username/nickname/description/tel/leader/type/parent_id，
 *     deleted 被静默忽略 —— 接口返回成功但用户根本没被删除。
 *     且 dist 的 admin.user 只有 list/update/create/download 四个方法，原文根本没有删除入口，
 *     因此这里按 dist 还原为「重置密码 · 修改」两个操作，不保留删除按钮。
 *
 * 【与后端契约的核对】
 *   请求：GET  /api/admin/user/list?page=&limit=&keyword=   ✓ 对应 user_list()
 *   响应：{data:[...], count:N, code:0, msg:''}             ✓ 对应 list_page()
 *   字段：username/nickname/leader/tel/description          ✓ 对应 user_dict()
 *
 * 【未迁移项】data() 里的 status / user 两项在原文模板与方法中均未被使用，属原版遗留字段。
 *
 * 【保留的原文瑕疵 —— 请勿「修正」】
 *  rules 中 password 的校验区间是 min:6 / max:32，但提示文案写的是「长度在 2 到 32 个字符」；
 *  这是 dist 原文如此，按「不擅自修改业务逻辑」保留。
 */

import { ref, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import { adminApi } from '@/api'
import { downloadExcelFile } from '@/utils/excel'

const keyword = ref(null)
const showInfo = ref(false)
const showEditInfo = ref(false)
const page = ref(1)
const limit = ref(10)
const total = ref(0)
const data = ref([])
const form = ref({})
const editForm = ref({})

const rules = {
  nickname: [
    { required: true, message: '请输入名称', trigger: 'blur' },
    { min: 2, max: 20, message: '长度在 2 到 20 个字符', trigger: 'blur' }
  ],
  username: [
    { required: true, message: '请输入账号', trigger: 'blur' },
    { min: 2, max: 20, message: '长度在 2 到 20 个字符', trigger: 'blur' }
  ],
  leader: [
    { required: false, message: '请输入负责人名称', trigger: 'blur' },
    { min: 2, max: 20, message: '长度在 2 到 20 个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入登录密码', trigger: 'blur' },
    { min: 6, max: 32, message: '长度在 2 到 32 个字符', trigger: 'blur' }
  ],
  type: [{ required: true, message: '请选择类型', trigger: 'blur' }]
}

const editRules = {
  nickname: [
    { required: true, message: '请输入名称', trigger: 'blur' },
    { min: 2, max: 20, message: '长度在 2 到 20 个字符', trigger: 'blur' }
  ],
  username: [
    { required: true, message: '请输入账号', trigger: 'blur' },
    { min: 2, max: 20, message: '长度在 2 到 20 个字符', trigger: 'blur' }
  ]
}

function getData() {
  const params = { page: page.value, limit: limit.value, keyword: keyword.value }
  adminApi.user.list(params).then(({ data: res }) => {
    if (res.code === 0) {
      total.value = res.count
      data.value = res.data
    } else {
      ElMessage.error(res.msg)
    }
  })
}

// 注意：与 /admin/scan 的 reflush 不同，这里的原文实现不重置 page
function reflush() {
  getData()
}

function handleSizeChange(size) {
  page.value = 1
  limit.value = size
  getData()
}

function handleCurrentChange(current) {
  page.value = current
  getData()
}

function modify(row) {
  editForm.value = JSON.parse(JSON.stringify(row))
  showEditInfo.value = true
}

function resetPassword(id) {
  ElMessageBox.prompt('请输入新密码', '重置密码', {
    confirmButtonText: '确定',
    cancelButtonText: '取消'
  })
    .then(({ value }) => {
      adminApi.user.update({ id, password: value }).then(({ data: res }) => {
        if (res.code === 0) {
          ElMessage.success('重置成功')
          getData()
        } else {
          ElMessage.error(res.msg)
        }
      })
    })
    .catch(() => {
      ElMessage({ type: 'info', message: '取消输入' })
    })
}

function editSubmit() {
  adminApi.user.update(editForm.value).then(({ data: res }) => {
    if (res.code === 0) {
      ElMessage.success('修改成功')
      showEditInfo.value = false
      getData()
    } else {
      ElMessage.error(res.msg)
    }
  })
}

function add() {
  showInfo.value = true
}

function download(fileName) {
  adminApi.user.download().then((res) => {
    downloadExcelFile(res.data, fileName)
  })
}

function submit() {
  adminApi.user.create(form.value).then(({ data: res }) => {
    if (res.code === 0) {
      showInfo.value = false
      form.value = {}
      ElMessage.success('创建成功')
    } else {
      ElMessage.warning(res.msg)
    }
  })
}

getData()
</script>

<style lang="scss" scoped>
/**
 * 照搬 dist/css/chunk-5d7f0bd8.1374f2e3.css 中 [data-v-2cd602cf] 作用域的规则。
 * 注意：本页 .title::before 的竖条颜色是 #d80e0e（红），
 * 与 /admin/index、/admin/scan 的 #036 / #1890ff 不同 —— 原文各页确实不一致，勿统一。
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

  > * {
    margin-bottom: 10px;
    margin-right: 10px;
  }

  > .el-input {
    width: 220px !important;
  }
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

  &::before {
    content: '';
    position: absolute;
    left: 0;
    bottom: 5px;
    width: 3px;
    height: 20px;
    background-color: #d80e0e;
  }
}

.my-pagination {
  margin-top: 10px;
}
</style>
