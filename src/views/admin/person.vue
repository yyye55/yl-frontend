<!--
  /admin/person —— 人员管理

  【可信度：A】
    dist 证据：chunk-857e91e8 模块 1727
    父路由：/admin (meta.role = 3 → type=3 管理员)

  业务说明（基于 dist 模块 1727）：
    - 标题：人员管理
    - 表格 5 列：序号 / 姓名 / 身份证号码 / 学校名称 / 操作（修改按钮）
      ↑ 【2026-09-23 起本条不再逐字等于 dist】第 4 列列头「学校名称」已改为「填报单位」。
        只改 label，prop="school" 与取值一律未动 —— 改的是文案，不是数据。
        起因：该列的值是各校在人员表里手填的单位名（Person.school），大学组等场景下未必是学校。
        ✅ 本列**现在搜得到、也筛得了**（2026-09-23 起）：搜索框走 keyword、新增的筛选框走 school 参数，
           后端两条路都匹配到 Person.school。契约与实测见
           docs/后端协助问题清单-人员管理按填报单位搜索与筛选.md。
    - 修改 dialog：el-form（name + card），含验证规则
    - 无新增、无删除、无导出
    - 分页 page-sizes=[10,20,50,100]（limit 默认 10）
    - keyword 搜索（name 或 card 模糊匹配）

  API（来自 dist）：
    - GET  /api/admin/person/list  → adminApi.person.list({page,limit,keyword})
      后端：Person.objects.all().order_by("id") → filter(name__icontains|k | card__icontains|k)
    - PUT  /api/admin/person      → adminApi.person.update(editForm)
      后端：改 Person 字段（id 除外）

  【权限】后端 role_error(request, 3) 要求 type=3 管理员

  【Vue2 → Vue3 特殊迁移点】
    - this.$set(obj, key, val) → 直接赋值 obj[key] = val（Proxy 响应式自动追踪）
    - validator rules 直接用普通对象（dist 在 data() 里定义了 editRules）

  【无 Tabs】dist 不使用 tabsStore

    【本仓库新增功能，dist 无】填报单位筛选（2026-09-23）
    - .options 里 keyword 右侧新增一个 el-input，值以 `?school=` 发给
      /api/admin/person/list，后端做 icontains 模糊匹配，可与 keyword 叠加（取交集）。
    - 后端契约与遗留缺口见 docs/后端协助问题清单-人员管理按填报单位搜索与筛选.md。
      ✅ 参数确已就位（2026-09-23 核实）：后端提交 00afaa4 已并入 jy（合并提交 2168e6f），
         jy / origin/jy / master / origin/master 四个 ref 上都有该行（views.py:601），
         且 jy 与 master 分叉计数为 0:0 —— 即 `school` 在 jy 上是齐的，不是只在 master。
         **仍未核实的是服务器部署版本**：若线上没重新部署，表现是「输入单位名后结果毫无变化」
         （接口会静默忽略未知参数，不报错）。
      ✅ 需求 A 也已补上（2026-09-23，用户授权后由前端代改后端）：
         views.py:600 的 Q 加上了 `| Q(school__icontains=k)`，
         所以左边那个搜索框现在**也能按单位搜**，两个框都能用了。
         ⚠️ 该后端改动**目前只在后端的工作区，未提交、未推送**。
            若线上仍搜不到单位，先确认后端有没有发这一版 —— 接口会静默忽略未知参数，不报错。
    - 两个框的 change 都改成「先归页码再取数」，理由见 handleFilterChange 的注释。

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
        @change="handleFilterChange"
      >
        <template #append>
          <el-button :icon="Search" />
        </template>
      </el-input>

      <!-- 填报单位筛选 → 后端 /api/admin/person/list 的 school 参数（icontains 模糊匹配）。
           与左边搜索框的分工：搜索框是「一个词打 姓名/身份证」，
           本框只限定填报单位；两者同时有值时后端取交集。
           clearable 便于一键清空（清空也会触发 change）。 -->
      <el-input
        v-model="school"
        placeholder="按填报单位筛选"
        clearable
        @change="handleFilterChange"
      />

      <el-button type="primary" @click="reflush">
        刷新
      </el-button>
    </div>

    <div class="content">
      <div class="bg-list">
        <p class="title">人员管理</p>

        <el-table :data="data" border style="width: 100%">
          <el-table-column type="index" label="序号" width="60" align="center" />
          <el-table-column prop="name" label="姓名" align="center" />
          <el-table-column prop="card" label="身份证号码" align="center" />
          <!-- label 2026-09-23 由「学校名称」改「填报单位」；prop 不动，见文件头注释 -->
          <el-table-column prop="school" label="填报单位" align="center" />
          <el-table-column label="操作" align="center">
            <template #default="{ row }">
              <el-button type="primary" size="small" @click="modify(row)">修改</el-button>
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

    <!-- 修改 dialog -->
    <el-dialog v-model="showEditInfo" title="修改用户" width="40%">
      <el-form
        ref="ruleEditForm"
        :model="editForm"
        :rules="editRules"
        inline
        label-width="120px"
      >
        <el-form-item label="姓名" prop="name">
          <el-input v-model="editForm.name" />
        </el-form-item>
        <el-form-item label="身份证号码" prop="card">
          <el-input v-model="editForm.card" />
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
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Search } from '@element-plus/icons-vue'

import { adminApi } from '@/api/admin'

const keyword = ref(null)
/** 填报单位筛选值 → 以 ?school= 发给后端，后端做 icontains 模糊匹配 */
const school = ref(null)
const showInfo = ref(false)
const showEditInfo = ref(false)
const status = ref(0)
const page = ref(1)
const limit = ref(10)
const total = ref(0)
const data = ref([])
const ruleEditForm = ref(null)

// dist: data(){ ... editForm:{} } —— 初始为空对象，字段由 modify() 整行拷贝注入
const editForm = ref({})

// 【直接照搬 dist editRules】不做业务修改
const editRules = {
  name: [
    { required: true, message: '请输入姓名', trigger: 'blur' },
    { min: 2, max: 20, message: '长度在 2 到 20 个字符', trigger: 'blur' }
  ],
  card: [
    { required: true, message: '请输入身份证号码', trigger: 'blur' }
  ]
}

function handleSizeChange(size) { page.value = 1; limit.value = size; getData() }
// dist: reflush(){this.getData()} —— 不重置页码（刷新不是筛选，维持 dist 原样）
function reflush() { getData() }

/**
 * 【本仓库修复，dist 无】搜索/筛选值变化时**先把页码归 1** 再取数。
 *
 * dist 原文是 keyword 的 @change 直接绑 getData，不重置页码。当时没暴露出来，
 * 是因为只有一个搜索框；加了填报单位筛选后，两个框叠加，踩中的概率显著变高。
 *
 * 为什么必须归位：后端的 list_page 对**越界页码返回空数组**而不是夹到最后一页
 * （apps/core/services.py:73-76 有注释：为对齐 Laravel 的 skip+take 契约刻意如此）。
 * 于是在第 5 页输入筛选词、而结果只剩 3 条时，用户看到的是 total=3、表格全空 ——
 * 看起来像"没搜到"，其实是页码越界。两边都走这个函数，行为才一致。
 */
function handleFilterChange() {
  page.value = 1
  getData()
}
function handleCurrentChange(current) { page.value = current; getData() }

function getData() {
  // school 为 null 时 axios 会整个略掉该参数（与 keyword 一样），
  // 清空后若变成空串，后端 `if request.GET.get("school")` 也当没传 —— 两条路都安全。
  const params = { page: page.value, limit: limit.value, keyword: keyword.value, school: school.value }
  adminApi.person.list(params).then((res) => {
    const body = res?.data
    if (!body) { ElMessage.error('响应为空'); return }
    if (body.code === 0) { total.value = body.count; data.value = body.data }
    else ElMessage.error(body.msg || '获取失败')
  })
}

// dist: modify(e){this.editForm=JSON.parse(JSON.stringify(e)),this.showEditInfo=!0}
// 整行深拷贝，不做字段挑选 —— 保证 update 载荷与 dist 一致（含 school 等未渲染字段）
function modify(row) {
  editForm.value = JSON.parse(JSON.stringify(row))
  showEditInfo.value = true
}

// dist: editSubmit(){this.$api.admin.person.update(this.editForm).then(...)}
// dist 无 validate()（模块内 validate 出现 0 次），提交前不做前端校验
function editSubmit() {
  adminApi.person.update(editForm.value).then((res) => {
    const body = res?.data
    if (!body) { ElMessage.error('响应为空'); return }
    if (body.code === 0) { ElMessage.success('修改成功'); showEditInfo.value = false; getData() }
    else ElMessage.error(body.msg || '修改失败')
  })
}

onMounted(() => { getData() })
</script>

<style lang="scss" scoped>
/*
 * 全量搬运自 css/chunk-857e91e8.abe639fb.css（8 条规则，scoped id 1e064011）。
 * 仅去掉 [data-v-1e064011] 属性选择器（由 Vue SFC 编译期生成等价的 scoped 属性）。
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
  background-color: #d80e0e;
}

.my-pagination {
  margin-top: 10px;
}
</style>
