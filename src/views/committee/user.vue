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
    - list:    GET  /api/committee/user/list   → 过滤 type ∈ {0, 1, 5}
                                                 （学校端 / 市州端 / 中小学端）
                                                 可再带 ?type= 在范围内收窄；
                                                 传 2/3/4 返回空表，不会越权
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
 * committee 用户看到所有 user；admin 用户只看到 type=0
 * （apps/api/views.py:596 user_export_admin；行号随后端文件变动，对不上时按函数名搜）
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
