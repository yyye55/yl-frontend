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
        ✅ 本列**现在搜得到**（2026-09-24 起）：唯一的搜索框走 keyword，后端一个 Q 同时匹配
           name / card / school，命中任一即返回。契约与实测见
           docs/后端协助问题清单-人员管理按填报单位搜索与筛选.md。
    - 修改 dialog：el-form（name + card），含验证规则
    - 无新增、无删除、无导出
    - 分页 page-sizes=[10,20,50,100]（limit 默认 10）
    - keyword 搜索（name / card / school 三选一模糊匹配；"三选一"是本仓库的，见下）

  API（来自 dist）：
    - GET  /api/admin/person/list  → adminApi.person.list({page,limit,keyword})
      后端：Person.objects.all().order_by("id")
            → filter(Q(name__icontains=k) | Q(card__icontains=k) | Q(school__icontains=k))
            （三选一前的 dist 只有 name | card）
    - PUT  /api/admin/person      → adminApi.person.update(editForm)
      后端：改 Person 字段（id 除外）

  【权限】后端 role_error(request, 3) 要求 type=3 管理员

  【Vue2 → Vue3 特殊迁移点】
    - this.$set(obj, key, val) → 直接赋值 obj[key] = val（Proxy 响应式自动追踪）
    - validator rules 直接用普通对象（dist 在 data() 里定义了 editRules）

  【无 Tabs】dist 不使用 tabsStore

    【本仓库改造，dist 无】两框合一（2026-09-24）

    历史：2026-09-23 曾在 keyword 右侧另加过一个「按填报单位筛选」框，走独立的 `?school=` 参数，
      与 keyword 取交集。两个框并存时，用户得先想清楚「我要搜的东西算姓名还是算单位」，
      填错了就是零结果，且零结果和「确实没有这个人」长得一模一样 —— 这就是这次合并的动因。

    现状：只剩一个框，只发 keyword，三种输入（姓名 / 身份证 / 填报单位）由后端一个 Q 覆盖。
      - 触发点：放大镜按钮 click、回车或失焦（Element Plus 的 change）、clearable 的 ×，
        三个入口都收敛到 handleFilterChange（先归页码再取数，理由见其注释）。
      - `school` 参数**前端不再发送**。⚠️ 别再把 keyword 和 school 一起发：后端对两者是 AND，
        同一个词同时要求匹配姓名和匹配单位，只会搜出空列表。
      - 后端依赖（2026-09-24 实测，非转述）：
          views.py:600 = `if k: qs = qs.filter(Q(name__icontains=k) | Q(card__icontains=k) | Q(school__icontains=k))`
          由后端提交 0a421d0「筛选」引入，jy / origin/jy / master / origin/master 四个 ref 上
          `git show <ref>:apps/api/views.py` 逐字命中该行；后端工作区干净，与 master 分叉 0:0。
          ↑ 此条推翻了文件头旧版本「该改动未提交、未推送」的说法，已核实为已提交且已推送。
      - **仍未核实的是服务器部署版本**：若线上跑的是 0a421d0 之前的包，症状是
        「按单位搜毫无反应、按姓名搜正常」（未知参数被静默忽略，不报错），
        而不是报错。真要排查，先确认线上部署的 commit。
    - 后端契约与遗留缺口另见 docs/后端协助问题清单-人员管理按填报单位搜索与筛选.md。

    【本仓库增强，dist 无】（逐项列明，便于回溯与取舍）
    - 接口空响应守卫：`if (!body) { ElMessage.error('响应为空'); return }`（dist 直接 `.then(t => ...)`，无此判断）
    - 错误文案兜底：`body.msg || '...'`（dist 直接用 `t.msg`，为 undefined 时提示为空）
    - 搜索框 clearable（dist 无）+ 放大镜按钮绑定 @click（dist 里是个纯装饰按钮，不触发任何事）
-->
<template>
  <div class="bg">
    <div class="options">
      <!-- 【本仓库合并，2026-09-24】原先并排的两个框（搜索框 + 填报单位筛选框）合成一个：
           一个词同时匹配 姓名 / 身份证号码 / 填报单位，命中任一即返回（并集，不是交集）。
           只发 keyword 一个参数，`school` 参数不再使用 —— 依据是后端 views.py:600
             `Q(name__icontains=k) | Q(card__icontains=k) | Q(school__icontains=k)`

           三个入口都收敛到 handleFilterChange（先归页码再取数，理由见其注释）：
             · 点右侧放大镜按钮 —— 明说的「点击即可查询」
             · 按回车，或点别处失焦 —— Element Plus 的 change 覆盖这两种时机
             · 点 clearable 的 × —— 清空同样触发 change（与改造前 school 框一致） -->
      <el-input
        v-model="keyword"
        class="input-with-select is-person-search"
        placeholder="输入姓名 / 身份证号 / 填报单位查询"
        clearable
        @change="handleFilterChange"
      >
        <template #append>
          <el-button :icon="Search" @click="handleFilterChange" />
        </template>
      </el-input>

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

/** 唯一的搜索词 → 以 ?keyword= 发给后端，后端对它做 姓名/身份证/填报单位 三选一 icontains */
const keyword = ref(null)
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
 * 【本仓库修复，dist 无】搜索词变化时**先把页码归 1** 再取数。
 *
 * dist 原文是 keyword 的 @change 直接绑 getData，不重置页码。当时没暴露出来，
 * 是因为筛选词通常在第一页输入；曾经并存的填报单位筛选框把「在第 N 页改条件」
 * 变成了常规操作，踩中的概率显著变高。两个框现已合回一个，但这个函数保留 ——
 * 归位语义本身是对的，不该因为框少了就退回去。
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
  // 只发 keyword 一个参数：三选一的 OR 由后端一个 Q 完成（views.py:600），
  // 前端不再需要 school —— 把它和 keyword 一起发会变成交集，反而搜不到人。
  // keyword 为 null 时 axios 整个略掉该参数；清空后变成空串，后端 `if k:` 也不成立 ——
  // 两条路都等价于「不加筛选」，清空后能正常回到全量列表。
  const params = { page: page.value, limit: limit.value, keyword: keyword.value }
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

/*
 * 【本仓库新增，dist 无】搜索框加宽。
 * 加宽而非改上面的 220px，是为了让「全量搬运自 dist…逐字一致」这句继续成立 ——
 * 选择器多带一个 is-person-search，特异性压过 .options > .el-input，两个 !important 同源时按特异性决胜。
 * 起因：两框合一后，placeholder 要写全「姓名 / 身份证号 / 填报单位」才能被人发现，
 * 而 220px 装不下这串字，会被截断成「输入姓名 / 身份证号 / 填报…」，等于白写。
 */
.options > .el-input.is-person-search {
  width: 340px !important;
}
</style>
