<!--
  /committee/user —— 组委会账号列表

  【可信度：A】
    dist 证据：chunk-4a3bd144 模块 8456

  业务说明：
    - 父路由：/committee (meta.role = 2 → type=2 组委会)
    - 后端 apps/api/views.py committee_report_list / user_list / user_update_admin / user_export_admin
      ⚠️ 这四个函数与管理员侧 /admin/* 是**同一批函数**，但两侧的行为已经被
      **按账号类型分开了**（2026-09-28 两批改动的结果），不能默认对称：
                  管理员侧          组委会侧（本页）
        list      (0,1,2,5)         (0,1,5)
        export    (0,1,2,5)         (0,1,5)
        update    不限（含组委会）    只能 0/1/5
        create    支持 type=2       强制 type=0
      本文件下方凡涉及这几个接口的说明，一律以本表为最新口径。

  表格列（dist 原文）：
    序号 / 名称 / 账号 / 修改人姓名 / 修改人联系方式 / 其他信息 / 操作(重置密码)

  API:
    - list:    GET  /api/committee/user/list   → 过滤 type ∈ {0, 1, 5}
                                                 （学校端 / 市州端 / 中小学端）
                                                 可再带 ?type= 在范围内收窄；
                                                 传 2/3/4 返回空表，不会越权
    - update:  PUT  /api/committee/user/        body { id, password }
                                                 → 请求体里**只要出现 password 这个键**就重置为
                                                   默认密码（值是发来的什么都不看，见下方
                                                   resetPassword() 那段；原注释「仅当非空时改密码」
                                                   已不成立）
                                                 → 且**只能改 0/1/5 的账号**：id 指向管理员或其他
                                                   组委会账号时返回 {"code":1,"msg":"用户不存在"}
                                                 → 本页只用它做「重置密码」，见 resetPassword()
    - export:  GET  /api/committee/user/export  → Blob xlsx，导出范围 **(0,1,5)**
                                                 （2026-09-28 起收窄：此前是整表导出，连管理员
                                                   账号都会出现在导出的 Excel 里；管理员侧同期改为
                                                   (0,1,2,5)。详见下方 download() 那段）
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

    【本仓库增强，dist 无】（逐项列明，便于回溯与取舍）
    - 接口空响应守卫：`if (!body) { ElMessage.error('响应为空'); return }`（dist 直接 `.then(t => ...)`，无此判断）
    - 错误文案兜底：`body.msg || '...'`（dist 直接用 `t.msg`，为 undefined 时提示为空）
    - 导出按钮 loading：`:loading="exporting"` + 防重复点击（dist 的按钮无 loading 属性）
    - 重置密码从 prompt 改成 confirm：弹「是否重置为默认密码？」，没有输入框。
      原因：后端 user_update_admin 现在 `if "password" in data` 就无条件重置为默认口令
      （yilinbei hou/apps/api/views.py:559），请求体里 password 的值被忽略 ——
      留着输入框只会骗人。dist 时代的 inputValidator / inputType:'password' 随之删除。
    - 表格标题「账号列表」下方新增一行提示：重置密码后恢复为默认密码。
      值取自 src/config/defaultPassword.js；这句话现在描述的是系统实际行为 ——
      详见模板里那段注释。
    - 新增「所属市州」列（纯展示）。数据源与显示规则与管理员端 /admin/user 的同一列
      逐字一致：读列表接口本来就返回的 parent_id，再用本页额外一次 ?type=1
      查出的市州账号建对照表换成名称。不新增接口、不改后端、不新增样式。
      没有归属的账号显示「—」（两页统一）。
    - 与 admin/user.vue 的同名函数保持同步（两处一起改，见其文件头）。
-->
<template>
  <div class="bg">
    <div class="options">
      <!--
        【本次变更：placeholder 不再写「请输入内容」】
        「请输入内容」等于没说 —— 用户不知道这个框到底搜哪一列。后端 user_list
        （yilinbei hou/apps/api/views.py:526，与 admin/user 同一个函数）里 keyword
        是一个三选一的 OR：`Q(username__icontains) | Q(tel__icontains) | Q(nickname__icontains)`，
        所以把三个列名都写出来。本页表格里的「名称 / 账号 / 修改人联系方式」正是这三列。
      -->
      <el-input
        v-model="keyword"
        class="input-with-select"
        :placeholder="KEYWORD_PLACEHOLDER"
        @change="getData"
      >
        <template #append>
          <el-button :icon="Search" />
        </template>
      </el-input>

      <!--
        【本次新增】后端 user_list 新增的独立 nickname 参数（views.py:527-528，icontains）。
        【它和上面那个框的区别 —— 为什么不嫌重复】keyword 是三选一的 OR，
        搜「实验小学」时账号或电话里含这几个字的行也会被带出来；本框只匹配名称。
        【和 keyword / type 之间是 AND】后端几个条件都是 .filter() 叠加，
        「名称含实验小学 + 类型=学校端」是交集，不是并集。
        与 admin/user.vue 的同名改动保持一致（两处一起改，见其文件头）。
      -->
      <el-input v-model="nickname" placeholder="请输入名称" @change="getData" />

      <!--
        类型筛选。与 admin/user.vue 那页是同一个东西，选项、取值、注释口径都一致。
        【选项为什么只有 0/1/5 三个】后端 user_list 先卡死展示范围 type__in=(0,1,5)，
        再把 type 作为 AND 条件叠加上去。所以传 2/3/4 一定返回空表 ——
        下拉里摆组委会(2)/管理员(3)/省级(4)，等于给用户一个必然筛不出东西的按钮。
        【:value 前面那个冒号不能省】绑数字 0/1/5，不是字符串。
        后端拿到的是字符串，但它做了 int() 转换，所以数字字符串都筛得对。
        【"全部类型"绑空串】与 ref 初值 '' 保持同一种值；空串属于"没选"，
        getData 里会整个 key 都不发出去。
        【宽度写在 <style> 里】与相邻的 .el-input 同一套写法，不写内联 style。
      -->
      <el-select v-model="filterType" placeholder="全部类型" @change="onFilterTypeChange">
        <el-option label="全部类型" :value="''" />
        <el-option label="学校端" :value="0" />
        <el-option label="市州端" :value="1" />
        <el-option label="中小学端" :value="5" />
      </el-select>

      <el-button
        type="primary"
        @click="reflush"
      >刷新</el-button>

      <el-button
        type="primary"
        :loading="exporting"
        @click="download('账号列表')"
      >导出所有账号</el-button>
    </div>

    <div class="content">
      <div class="bg-list">
        <p class="title">账号列表</p>

        <!--
          【本仓库新增，dist 无】重置密码的默认口径提示。
          ⚠️ 这句话的性质变了：原先它是一条**操作约定**（后端当时不套用默认密码，
          靠操作者在弹窗里手填这个值，填了才生效），现在它**就是系统行为** ——
          user_update_admin 无条件重置为 RESET_PASSWORD_DEFAULT（yilinbei hou/apps/api/views.py:559）。
          值本身来自 src/config/defaultPassword.js，别在这里写死字面量：
          提示里显示的口令必须与实际生效的是同一个，否则用户拿着提示语登不进去。
        -->
        <p style="margin:10px;">提示：重置密码后恢复为默认密码：<b>{{ DEFAULT_PASSWORD }}</b></p>

        <el-table :data="data" border style="width: 100%">
          <el-table-column type="index" label="序号" width="60" />
          <el-table-column prop="nickname" label="名称" />
          <el-table-column prop="username" label="账号" />
          <!--
            类型列。与 admin/user.vue 那页是同一列。
            【数据从哪来】列表接口 GET /api/committee/user/list 与 /api/admin/user/list
            在后端是**同一个 user_list 函数**，走同一个 user_dict
            （apps/core/services.py:56-63 的返回值里就有 "type": user.type）——
            所以行数据里本来就有 type，不需要额外请求、不需要改接口、不需要改后端。
            【为什么不写 prop="type" 直接用】row.type 是数字（0/1/5…），
            直接渲染出来是一列裸数字，等于没加。所以用默认插槽过一层 TYPE_LABEL 映射。
            字典来自 src/config/accountTypes.js，与管理员端共用一份。
            【?? row.type 的兜底不能删】列表接口按 type__in=(0,1,5) 过滤，
            正常只会出现 0/1/5；万一后端以后放开过滤，遇到表里没有的值（如 2/3/4），
            只写 TYPE_LABEL[row.type] 会渲染成空白，还不如显示原始数字。
            【本列不引入任何样式】宽度和排版全部交给 Element Plus 默认单元格样式，
            和相邻几列完全一致；没有 align、没有 class、没有内联 style。
            宽度 110 是因为「中小学端」是本表里最长的类型名（5 个字），
            给足宽度避免表头/单元格折行 —— 与 admin/user.vue 取同一个值。
          -->
          <el-table-column label="类型" width="110">
            <template #default="{ row }">{{ TYPE_LABEL[row.type] ?? row.type }}</template>
          </el-table-column>
          <!--
            「所属市州」列（本次新增）。与管理员端 /admin/user 的同一列**逐字一致**，
            两页显示规则必须一样（改一处时记得对照另一处）。

            【数据从哪来】row.parent_id 本来就在列表接口的返回里
            （后端 user_dict 就带这个字段，apps/core/services.py:63），
            再用 cityMap 换成市州名称 —— **不需要任何行级的额外请求**。
            本页的列表接口 GET /api/committee/user/list 与 /api/admin/user/list
            在后端是**同一个 user_list 函数**，行数据结构完全相同。

            【为什么不是每个账号都有值】归属只对中小学账号（type=5）有意义：
            · 学校端（0）的 parent_id 没有业务含义；
            · 市州端（1）自己就是市州，谈不上"所属市州"。
            判据因此与管理员端完全一致：row.type === 5 ? ... : '—'。

            【没有归属时为什么是「—」而不是空白】空单元格和「—」在直觉上会被读成
            两种不同的东西。这里统一用「—」表达"没有值"，
            与本表其它列、以及管理员端同一列都一致。

            【为什么用 || 而不是 ??】parent_id 为 0 / null / undefined 时
            cityMap[...] 都是 undefined；市州名理论上也不会是空串。
            两者结果相同，这里用 || 更短。

            【宽度 120】与管理员端同一列取同一个值：表头「所属市州」4 个字 +
            单元格「攀枝花市」4 个字，120 足够不折行；不写 align，
            与相邻列统一用 Element Plus 默认左对齐。

            【为什么紧挨「类型」列放】管理员端那页是放在「可报两支」后面，
            因为插到「类型」和「可报两支」中间会让那段注释变成错的。
            本页**没有「可报两支」列**，「类型」后面直接就是「修改人姓名」，
            所以紧挨「类型」放 —— 两页的视觉顺序都是「类型 → 所属市州」。
          -->
          <el-table-column label="所属市州" width="120">
            <template #default="{ row }">
              {{ row.type === 5 ? (cityMap[row.parent_id] || '—') : '—' }}
            </template>
          </el-table-column>
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
// 【本次新增 computed】用于把市州账号数组推导成 {id: 名称} 的查找表，
// 供「所属市州」列在本页表格里 O(1) 查名。原有的 ref / onMounted 用法完全不变。
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search } from '@element-plus/icons-vue'

import { committeeApi } from '@/api/committee'
import { DEFAULT_PASSWORD } from '@/config/defaultPassword'
// 账号类型 -> 中文名。字典本体与管理员端 /admin/user 共用同一份，
// 说明（取值依据、为什么含 2/3/4、为什么不放 roles.js）全部在 src/config/accountTypes.js。
// 别把字典抄回本文件 —— 两份副本漏改一处，那一页的类型列会渲染成空白。
import { TYPE_LABEL } from '@/config/accountTypes'

/**
 * 【本次新增】keyword 输入框的 placeholder 文本。
 * 后端 keyword 同时匹配 username / tel / nickname（views.py:526），三个列名都写出来。
 * 与 admin/user.vue 用同一个字符串 —— 两页搜的是同一个接口，说法不该有出入。
 */
const KEYWORD_PLACEHOLDER = '请输入账号/电话/名称'

const keyword = ref(null)

/**
 * 【本次新增】对应后端 user_list 的独立 nickname 参数，只匹配名称这一列。
 * 初值 null = 不筛，见 getData()。
 */
const nickname = ref(null)

/**
 * 「类型」筛选选中的值。空串 = 全部（不筛类型）。
 * 【初值为什么是 ''】与下拉里「全部类型」那一项的 :value="''" 同一种值，
 * 免得出现 null 与 '' 两种"空"并存，判断时漏掉一种。
 * 【名字为什么带 filter 前缀】与 admin/user.vue 同步 —— 那边有一个同名的
 * onTypeChange 冲突（弹窗里「可报两支」勾选框用的），两页统一加 filter 前缀，
 * 函数名一致，将来改一处时好对照。
 */
const filterType = ref('')

const page = ref(1)
const limit = ref(10)
const total = ref(0)
const data = ref([])
const exporting = ref(false)

/* =========================================================================
 * 「所属市州」数据源（本次新增，与管理员端 /admin/user 同一套写法）
 * =========================================================================
 *
 * 【这个东西解决的是什么问题】
 * 后端 users 表用 parent_id 表示归属：**中小学账号（type=5）的 parent_id
 * 指向市州账号（type=1）的 id**（apps/core/services.py:66-70 的 subordinate_school_ids
 * 写得很明白："归属于该市州账号的中小学账号，parent_id 指向该市州账号"）。
 * 但列表接口返回的是 parent_id 这个**数字**，不是「成都市」。
 * 所以要显示市州名，前端必须自己建一张对照表。
 *
 * 【对照表从哪来】就用本页已经在用的那个接口，加一个 type=1 只要市州账号：
 *     GET /api/committee/user/list?page=1&limit=1000&type=1
 * 后端 user_list 的展示范围是 type__in=(0,1,5)，所以 type=1 筛出的就是全部市州账号，
 * 它们的 nickname 就是市州名。**不需要后端新增任何接口或字段。**
 *
 * 【这个请求本页本来就能发】页面上「市州端」那个筛选项（模板里的
 * <el-option label="市州端" :value="1" />）点一下发出去的就是 ?type=1 ——
 * 所以这里不引入任何新的失败模式、不涉及任何新的权限，只是提前多发一次。
 *
 * 【为什么不能从本页的 data 里找】data 是**分页 + 筛选**过的：
 * 停在第 2 页、或筛了「学校端」时，市州账号根本不在 data 里，翻不到。
 *
 * 【为什么不去改后端的 user_dict 加个 parent_name】
 * user_dict 是全局共用的序列化函数，有 9 处调用方（登录接口、获取当前用户、
 * 审核列表、参展扫描件列表、报名详情…）。改它会让**登录响应**都多出一个字段，
 * 影响面远超本页需求。所以这条路不走。
 */

/**
 * 全部市州账号（type=1），形如 [{ id: 7, nickname: '成都市', ... }, ...]
 * 【失败时保持为初始值 []】这一列是纯展示的辅助信息，拿不到就整列显示「—」，
 * 不影响账号列表本身；弹错误提示反而会打断「我就想看看账号列表」的正常操作。
 */
const cityAccounts = ref([])

/**
 * 查找表：{ 市州账号id: 市州名称 }，例如 { 7: '成都市' }
 * 【为什么由 cityAccounts 推导而不是另存一份】两份数据就要手动同步，
 * 漏同步一次就是"筛选里有、列里没有"这种难查的漂移。推导则天然一致。
 */
const cityMap = computed(() =>
  cityAccounts.value.reduce((acc, u) => {
    acc[u.id] = u.nickname
    return acc
  }, {})
)

/**
 * 拉取全部市州账号，重建对照表。
 *
 * 【limit: 1000 的依据】后端 list_page 对 limit 只做 `max(1, int(...))`，没有上限，
 * 一次能取全（apps/core/services.py:78-90）。管理员端 /admin/user 用的是同一个值，
 * 两页保持一致。
 *
 * 【type 为什么直接写数字 1，不走 getData() 那套显式判空】
 * getData() 里那段「0 是 falsy 所以要显式判空」的注释针对的是**用户可选的筛选值**；
 * 这里写的是数字字面量 1，不存在那个坑，不需要绕。
 *
 * 【四川共 21 个市州】1000 的余量极大，实际不可能取不全。
 *
 * 【与 getData() 的写法差异】这里用 res && res.data 做空响应守卫，
 * 与本页 getData()/resetPassword() 的既有写法一致（不用 .catch 会留下
 * unhandled rejection，本页其余请求都带 catch）。
 */
function loadCityAccounts() {
  committeeApi.user.list({ page: 1, limit: 1000, type: 1 }).then((res) => {
    const body = res && res.data
    if (!body || body.code !== 0 || !Array.isArray(body.data)) return
    cityAccounts.value = body.data
  }).catch(() => {
    // 拦截器已处理。这一列拿不到就整列显示「—」，不影响账号列表本身。
  })
}

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

/**
 * 切换类型筛选：先回到第 1 页再查。
 * 【为什么必须把 page 归 1】后端 list_page 对超出范围的页码按 Laravel 语义返回
 * **空数组**（apps/core/services.py 特意没用 Django 的 Paginator.get_page）。
 * 停在第 5 页时切到只剩 2 页数据的类型，你会看到一张空表，
 * 很容易误判成「这个类型一个账号都没有」。
 * 注意：搜索框 keyword 走的是 @change="getData"，**不重置 page**（原文如此），
 * 这里不跟着学。与 admin/user.vue 的同名函数保持一致。
 */
function onFilterTypeChange() {
  page.value = 1
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
 * 后端 apps/api/views.py user_list 的展示范围（admin 与 committee 走同一个函数）：
 *   qs = User.objects.filter(type__in=(0, 1, User.TYPE_PRIMARY_SECONDARY))
 *   ← 学校端(0) / 市州端(1) / 中小学端(5)
 * 【这段以前写的是 (0, 4)，早就不对了】0/4 是更早的版本（学校 + 省级），
 * 后来改成 0/1/5 而注释没跟上；`user_list(committee=True)` 那个签名也是
 * 另一条分支上的旧写法，当前 master 上是 user_list(request)。
 * 注意：dist 传的 parent_id: true 在后端 list_page 中**没有任何作用**（被忽略），
 * 但 axios 仍会把 true 作为查询参数发出去（"parent_id=true"）。
 * 这是 dist 的死字段，本项目保留以保证请求完全一致 —— 别把它和下面新加的 type 混起来。
 */
function getData() {
  const params = {
    page: page.value,
    limit: limit.value,
    keyword: keyword.value,
    // 【本次新增】后端 user_list 的独立 nickname 参数（icontains）。
    // 值为 null 时无需剔除：axios 的默认序列化器会丢弃 null/undefined 的参数，
    // 也就是「框里没填」= 不传该条件 —— 与上面 keyword 的处理一致。
    nickname: nickname.value,
    parent_id: true  // 【dist 原样】后端忽略，但 dist 原文确实发了这个参数
  }

  // ── 类型筛选：只有选了具体类型才把 type 塞进请求 ──────────────────────
  // 【为什么不能写 if (filterType.value)】0（学校端）在 JS 里是 falsy。
  //   那样一选「学校端」参数就被丢掉、列表显示全部，而 1 和 5 都正常 ——
  //   用户报障时只会说「学校端筛不出来」，很难往这上面想。必须显式判空。
  // 【没选时为什么整个 key 都不发】后端 user_list 读的是 request.GET.get("type")，
  //   它对空串是安全的（`account_type not in (None, "")`），所以传 '' 也不会错。
  //   这里仍然不发，是为了不依赖后端那一句实现 —— 后端哪天真改成「按 key 是否存在」
  //   来判断，前端不用跟着动。
  // 【后端怎么用这个值】先卡死展示范围 type__in=(0,1,5)，再 filter(type=int(值))，
  //   两个条件是 AND。所以传 2/3/4 只会得到空表，越不了权。
  // 【和 keyword 的关系也是 AND】后端几个条件都是 .filter() 叠加，
  //   「选市州端 + 搜张三」= 只在市州端账号里搜张三，不是并集。
  if (filterType.value !== '' && filterType.value !== null && filterType.value !== undefined) {
    params.type = filterType.value
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

  /*
   * 【本次新增，放在 getData 末尾，不是 onMounted】
   * getData 已经被「首次进入 / 翻页 / 换类型筛选 / 点刷新 / 重置密码成功」
   * 五处调用。挂在这里 = 这五种情况市州对照表都会自动跟着刷新，
   * 不需要为本页再补任何接线（列表刷新 ⇄ 对照表刷新，永远同步）。
   *
   * 【代价】每次翻页/筛选多一个小请求。市州只有 21 个账号，可以忽略。
   * 【与上面那次请求的关系】两次请求各写各自的 ref（data / cityAccounts），互不干扰，
   * 也不存在先后依赖 —— 谁先回来都不影响结果。
   * 注意 cityAccounts 与 data 是两个不同的 ref，这里没有名字冲突。
   */
  loadCityAccounts()
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
 * 调用的是 user_update_admin —— 与 /api/user（只能改自己）不同，它能改**别人**的账号，
 * 这是 committee 域特有的管理能力。
 *
 * 【2026-09-28 收窄：不再是"任意 user_id"】组委会侧的 user_update_admin 现在只认
 * 0/1/5 的账号；id 指向管理员(3) 或别的组委会(2) 账号时，返回
 * {"code": 1, "msg": "用户不存在"}。管理员侧仍是"不限"，含组委会账号。
 *   · 本页**不受影响**：row 来自本页列表，而列表只有 0/1/5，界面上点不到越界的行。
 *   · 但别再把上面那句旧说法当依据 —— 将来若给本页加"按 id 操作"的功能
 *     （例如启用 dist 那套死代码 modify(row)，见文件头第 2 条），前端不能假设
 *     "后端什么都能改"：越界的 id 会静默变成一句「用户不存在」，
 *     看着像账号被删了，极难查。
 *
 * 【本次变更：prompt → confirm，重置为默认密码】
 *  后端不再接受调用方指定的新密码：user_update_admin 里
 *    `if "password" in data: user.set_password(RESET_PASSWORD_DEFAULT)`
 *  （yilinbei hou/apps/api/views.py:559，常量在同文件 :537）——
 *  只要请求体里出现 password 键，它的值被忽略，一律重置为 scylb@2026。
 *  于是 dist 时代的「请输入新密码」输入框成了骗人的控件：填什么都会被丢弃，
 *  用户按自己填的去登录必然失败。改用 confirm 后弹窗里问的就是将要发生的事。
 *
 *  同时删除 dist 之后本仓库加过的 inputValidator（checkPasswordInput）与
 *  inputType:'password' —— 没有输入框可校验、也没有明文可遮了。
 *  它们当初防的是「空输入被当成重置成功」，而那个问题现在从根上消失：
 *  password 由本函数写死成 DEFAULT_PASSWORD，不可能为空。
 *  checkPasswordInput 失去全部调用方，已从 src/config/accountRules.js 移除。
 *
 *  与 admin/user.vue 的同名函数保持一致（两处一起改，见其文件头）。
 */
function resetPassword(id) {
  ElMessageBox.confirm('是否重置为默认密码？', '重置密码', {
    confirmButtonText: '确定',
    cancelButtonText: '取消'
  }).then(() => {
    committeeApi.user.update({ id, password: DEFAULT_PASSWORD }).then((res) => {
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
    // confirm 的取消/关闭都走这里（reject 'cancel' / 'close'），不再有「取消输入」这回事
    ElMessage.info('已取消')
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
 * 【本页不使用 downloadExcelFile】dist 该页是内联实现（本 chunk 内 downloadExcelFile
 * 引用 0 次），且文件名不加扩展名（r.download=e）。utils/excel.js 的 downloadExcelFile
 * 是 dist app.js 里另一个共享 helper（c.download=t+".xlsx"），供 colleges / elementary /
 * teacher 等页使用 —— 两者不可互替，故此处按 dist 原样内联。
 *
 * 【本仓库增强，dist 无】exporting 防重复点击 + 按钮 :loading。
 *
 * 后端：GET /api/committee/user/export → xlsx
 * 导出范围 **(0,1,5)**：只有学校端 / 市州端 / 中小学端。
 * 【2026-09-28 收窄 —— 这句以前写的是「committee 看到所有 user，admin 只看到 type=0」，
 *   两侧的口径**都**过期了】
 *   · 组委会侧：以前是**整表导出**（连管理员账号都会出现在导出的 Excel 里），
 *     现在收窄到 0/1/5；
 *   · 管理员侧：同期改为 (0,1,2,5) —— 含组委会账号，但**不含市州端(1)**。
 *     旧说法「admin 只看到 type=0」连市州端都没提到。
 * （apps/api/views.py user_export_admin，两侧共用这一个函数；
 *   行号随后端文件变动，对不上时按函数名搜）
 */
function download(name) {
  if (exporting.value) return
  exporting.value = true
  committeeApi.user.download().then((res) => {
    const blob = new Blob([res.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=utf-8'
    })
    const a = document.createElement('a')
    const url = window.URL.createObjectURL(blob)
    a.href = url
    a.download = name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
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
 * 全量搬运自 css/chunk-4a3bd144.de966eed.css（8 条规则，scoped id ad1cba42）。
 * 仅去掉 [data-v-ad1cba42] 属性选择器（由 Vue SFC 编译期生成等价的 scoped 属性）。
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

/* 类型下拉：与相邻的搜索框排成一档。
   高度不用管 —— 两个组件都是默认 size，el-input 与 el-select 默认高度一致，
   上面那条 align-items: center 负责垂直对齐。 */
.options > .el-select {
  width: 160px !important;
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
