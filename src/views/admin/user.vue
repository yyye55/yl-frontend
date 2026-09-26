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
          <el-table-column type="index" label="序号" width="60" />
          <el-table-column prop="username" label="账号" />
          <el-table-column prop="nickname" label="名称" />
          <!--
            类型列。
            【为什么不写 prop="type" 直接用】row.type 是数字（0/1/5…），
            直接渲染出来是一列裸数字，等于没加。所以用默认插槽过一层 TYPE_LABEL 映射。
            【?? row.type 的兜底不能删】列表接口按 type__in=(0,1,5) 过滤，
            正常只会出现 0/1/5；但万一后端以后放开过滤，遇到表里没有的值（如 2/3/4），
            只写 TYPE_LABEL[row.type] 会渲染成空白，还不如显示原始数字。
            【本列不引入任何样式】宽度和排版全部交给 Element Plus 默认单元格样式，
            和相邻几列完全一致；没有 align、没有 class、没有内联 style。
            宽度 110 是因为「中小学端」是本表里最长的类型名（5 个字），
            给足宽度避免表头/单元格折行。
          -->
          <el-table-column label="类型" width="110">
            <template #default="{ row }">{{ TYPE_LABEL[row.type] ?? row.type }}</template>
          </el-table-column>
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
    <el-dialog v-model="showInfo" title="添加用户" width="50%">
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
        <el-form-item label="类型选择" prop="type" >
          <el-select v-model="form.type" placeholder="请选择账号类型" style = "width: 200px">
            <el-option label="组委会账号" :value="2" />
            <el-option label="市州账号" :value="1" />
            <el-option label="学校账号" :value="0" />
            <!--
              中小学端账号。
              【:value 前面那个冒号不能省】它让 5 以**数字**绑定，而不是字符串 '5'。
              后端 type 是 IntegerField，传 '5' 也存得进去；但前端路由守卫不做类型转换
              （router/guard.js `user.type !== to.meta.role`），一边 '5' 一边 5 恒不相等，
              用户会被踢回 /middle 并看到「该账号类型无可用后台」。
              【为什么是 5 不是 4】5 = 后端 core/models.py 的 TYPE_PRIMARY_SECONDARY，
              4 = TYPE_PROVINCE（省级，已下线）。数字 4 被省级占过，不复用 ——
              见 config/roles.js 头部注释。
            -->
            <el-option label="中小学账号" :value="5" />
          </el-select>
        </el-form-item>
        <p style="margin:10px">提示：密码为必填项，长度需为 {{ PASSWORD_MIN }} 到 {{ PASSWORD_MAX }} 个字符</p>
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
        <el-button type="primary" :loading="submitting" @click="submit">确 定</el-button>
      </template>
    </el-dialog>

    <!-- 修改用户 -->
    <el-dialog v-model="showEditInfo" title="修改用户" width="50%">
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
 * 【本次修复：rules 从未被 validate() 调用过】
 *  迁移时漏了一个动作：模板里 ref="ruleFormRef" / ref="ruleEditFormRef" 一直写着，
 *  但 <script setup> 里从来没有这两个变量接住它们，submit() / editSubmit() 也从不调 validate()，
 *  于是 rules / editRules 两套规则全是死代码 —— 账号、名称留空，长度越界，类型不选，
 *  密码不填，一律照发请求。本次把这一步接上：补两个 ref，提交前先 validate()，失败直接 return。
 *  接线后真正变严的只有两处（rules 原本就是这么写的）：添加账号时「密码」「类型」变为必选。
 *
 *  【已知缺口·本次未修】接线只挡得住空值和超长，挡不住「账号重复」：
 *   username 在后端是 unique（apps/core/models.py:72），user_create_admin 未 catch
 *   IntegrityError，重复账号会返回 500；而 request.js 的响应拦截器对 500 执行整页跳转
 *   （window.location.href = BASE_URL + '500'）—— 整个页面会被替换掉。
 *   要彻底消掉这条路径需要后端把重复账号改成返回 failure（code 1），属后端改动，本次未做。
 *   前端这边只堵最粗的一条：给「添加账号」的确定按钮加 :loading 防连点
 *   （连点两次 = 发两次 POST = 第二次必然撞 unique）。
 *
 * 【本次修复：重置密码的空输入被当成「重置成功」】
 *  后端 user_update_admin 改密码的条件是 `if data.get("password")`，空串是 falsy，
 *  于是密码没改、接口却返回 success()，前端只能看到 code 0 —— 页面提示「重置成功」，
 *  密码其实纹丝不动；而 `'   '`（纯空格）是 truthy，会真的把密码改成一串空格。
 *  本次给 prompt 加 inputValidator（空串与纯空格都拦，红字 + 确定按钮不关弹窗，
 *  走 EP 原生行为）并顺带把 inputType 设成 'password'（EP 默认 'text'，原本明文显示）。
 *  细节与源码依据见 resetPassword() 上方注释。
 *
 * 【保留的原文瑕疵 —— 已按本次决定修正其中一处】
 *  rules 中 password 的提示文案原本写的是「长度在 2 到 32 个字符」，与实际区间不符。
 *  接线前这条规则永远不跑，错话没人看见；接线后它会真的弹给用户
 *  （输 3 位密码被提示「长度在 2 到 32」而卡住），故当时把文案改成了「长度在 6 到 32 个字符」。
 *
 * 【本次变更：数字收敛到 src/config/accountRules.js】
 *  上面那次只改了文案，区间还是本页自己写死的 6-32，与登录页、自助改密各说各话。
 *  现在账号 3-20、密码 6-20 全站一份常量，本页的 rules 与「重置密码」的 inputValidator
 *  都改成引用它。另外「添加用户」弹窗里那句「如果输入密码，则会更新密码，不输入，则不会改变密码」
 *  是从「修改信息」弹窗复制来的 —— 添加账号的密码是必填，照这句话不填会被拒，已改为如实说明。
 */

import { ref, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import { adminApi } from '@/api'
import { downloadExcelFile } from '@/utils/excel'
import {
  ACCOUNT_MIN,
  ACCOUNT_MAX,
  MSG_ACCOUNT_LENGTH,
  PASSWORD_MIN,
  PASSWORD_MAX,
  MSG_PASSWORD_LENGTH,
  checkPasswordInput
} from '@/config/accountRules'

/**
 * 账号类型 -> 中文名。只给「账号列表」那一列做显示用，不参与任何判断。
 *
 * 【取值依据】后端 apps/core/models.py:76-82 的常量定义，
 * 以及同目录 migrations/0010_update_type_comments.py 里同步的数据库列注释：
 *   0=学校 1=市州（只读，报名功能已移出） 2=组委会 3=管理员 4=省级 5=中小学端
 *
 * 【为什么 2/3/4 也写进来，明明列表接口看不到它们】
 * 列表接口的过滤条件是 type__in=(0, 1, 5)，所以这行本该只出现 0/1/5。
 * 但兜底值一旦渲染出来（见模板里 `?? row.type` 的说明），
 * 有中文名总比显示裸数字强；而且这三行是"照抄数据库注释"，
 * 少写反而会让后来的人以为是漏了。属于**只读的展示字典**，改动它不会影响任何逻辑。
 *
 * 【为什么不从 config/roles.js 引】那里只有数字常量 ROLE.SCHOOL/CITY/…，
 * 没有中文名，而且**故意没有 4**（省级已下线）—— 硬引过来会漏掉 4 这一档。
 * 这里要的是"把可能出现的值都显示成人话"，和 roles.js「谁有权限」的目标不同，故各留一份。
 */
const TYPE_LABEL = {
  0: '学校端',
  1: '市州端',
  2: '组委会',
  3: '管理员',
  4: '省级',
  5: '中小学端'
}

const keyword = ref(null)
const showInfo = ref(false)
const showEditInfo = ref(false)
const page = ref(1)
const limit = ref(10)
const total = ref(0)
const data = ref([])
const form = ref({})
const editForm = ref({})

/**
 * 【本次修复】两个 el-form 的 ref。
 * 模板里的 ref="ruleFormRef" / ref="ruleEditFormRef" 从迁移起就挂着，但 <script setup>
 * 里一直没有同名变量接住它们 —— 两个没接线的开关，详见文件头「本次修复」。
 */
const ruleFormRef = ref()
const ruleEditFormRef = ref()

/**
 * 添加账号的提交中标志，只服务于防连点。
 * 连点两次 = 发两次 POST = 第二次撞 username unique → 500 → 拦截器整页跳 /500。
 * 「修改用户」不加：PUT 是幂等的，连点第二次结果相同，无害。
 */
const submitting = ref(false)

const rules = {
  nickname: [
    { required: true, message: '请输入名称', trigger: 'blur' },
    { min: 2, max: 20, message: '长度在 2 到 20 个字符', trigger: 'blur' }
  ],
  username: [
    { required: true, message: '请输入账号', trigger: 'blur' },
    { min: ACCOUNT_MIN, max: ACCOUNT_MAX, message: MSG_ACCOUNT_LENGTH, trigger: 'blur' }
  ],
  leader: [
    { required: false, message: '请输入负责人名称', trigger: 'blur' },
    { min: 2, max: 20, message: '长度在 2 到 20 个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入登录密码', trigger: 'blur' },
    { min: PASSWORD_MIN, max: PASSWORD_MAX, message: MSG_PASSWORD_LENGTH, trigger: 'blur' }
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
    { min: ACCOUNT_MIN, max: ACCOUNT_MAX, message: MSG_ACCOUNT_LENGTH, trigger: 'blur' }
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

/**
 * 【本次修复：空输入被当成「重置成功」】
 *
 * 【症状】弹窗里什么都不输（或只打空格）就点「确定」，页面提示「重置成功」，
 * 但密码根本没变 —— 而且列表还会刷一次，看起来完全正常。
 *
 * 【原因】后端 user_update_admin（apps/api/views.py，以函数名定位）改密码的条件是
 * `if data.get("password")`：空串是 falsy，这一句不成立，于是密码字段被跳过、
 * 接口仍然返回 success() → 前端只能看到 code 0。
 *
 * 【为什么连纯空格也要挡】`'   '` 是 truthy，它会**穿过**上面那个判断，
 * set_password('   ') 会把密码真的改成一串空格 —— 只判空串挡不住它。
 *
 * 【为什么用 inputValidator 而不是在 .then 里手写判断】
 * 查看本机 element-plus@2.14.6 的 message-box 源码：
 *   handleAction()  第 187 行 `if (props.boxType === 'prompt' && action === 'confirm' && !validate()) return`
 *   validate()      第 200-214 行：inputValidator 返回字符串即作为红字提示，且不放行
 * 即「校验不过 → 确定按钮点了也不关弹窗、输入框下方出红字」是 EP 原生行为，
 * 不用自己写；且校验不过时 promise 既不 resolve 也不 reject，
 * 下面那个 `.catch(() => ElMessage '取消输入')` 不会被误触发。
 *
 * 【inputType: 'password' 是本次一并加的】EP 的 prompt 默认 inputType 是 'text'，
 * 新密码原本是明文显示在屏幕上的。
 *
 * 【本次变更：长度也一并按统一口径拦（原先只拦空串与纯空格）】
 * 原先不判长度，管理员可以把密码重置成 `a` 这种 1 位 —— 接口照样返回成功，
 * 而用户拿着它去登录会被前端拦下（或干脆记不住），管理员侧看不到任何异常。
 * 现在改用 src/config/accountRules.js 的 checkPasswordInput，与「添加账号」「自助改密」
 * 同一组数（6-20），不再是这一处说了算。
 */
function resetPassword(id) {
  ElMessageBox.prompt('请输入新密码', '重置密码', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    // 空串 / 纯空格 / 长度越界都拦下，口径见 src/config/accountRules.js
    inputValidator: checkPasswordInput,
    inputType: 'password'
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

/**
 * 【本次修复】同 submit()，提交前先过 editRules（账号 / 名称）。
 * editRules 里没有 password 规则，所以「输入密码才改密码、不输入不改」的原行为不变。
 * 这里不加 loading：PUT 幂等，连点第二次结果相同，不会像 create 那样撞唯一约束。
 */
async function editSubmit() {
  const valid = await ruleEditFormRef.value.validate().catch(() => false)
  if (!valid) return

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

/**
 * 【本次修复】提交前先过 rules —— 原先这里直接发请求，rules 从未生效。
 * 用 .catch(() => false) 而不是 try/catch 包住整段：校验失败只 return，
 * 接口报错仍走原来的分支（若把接口调用一并包进 try，接口错误会被静默吞掉）。
 * submitting 只为防连点，见它的声明处。
 */
/**
 * 建号前查重：这个账号名是不是已经被占了。
 *
 * 【为什么需要这一步】后端 user_create_admin（apps/api/views.py）**没有** catch
 * IntegrityError，而 users.username 是 unique —— 撞名会返回 **HTTP 500**。
 * 前端的 utils/request.js 对 500 执行 `window.location.href = BASE_URL + '500'`，
 * 那是**整页跳转**：弹窗、已填的其他字段、列表的分页位置全部丢失。
 * 这里在发 POST 之前先问一次列表接口，撞名就地提示，绕开那条整页跳转的路径。
 *
 * 【为什么用列表接口查】管理员能调到的账号类接口里只有它带 keyword 搜索
 * （/api/admin/user/list）。传 limit: 1000 是尽量一次把命中项取全 ——
 * 后端 list_page 对 limit 没有上限，只做了 max(1, …) 的下限保护。
 *
 * 【为什么拿到结果还要再精确比对一次 username】keyword 走的是 icontains，
 * 而且同时匹配 username / tel / nickname 三个字段。搜「张三」时返回的行里，
 * 完全可能只是**电话或名称**含「张三」、账号名并不是它。
 * 所以必须 `u.username === username` 精确比对，否则会误拦一个本来能建的账号。
 *
 * 【为什么出错时放行（fail-open）】网络抖动、响应结构异常等一律 return false，
 * 让流程落回原来的「直接 POST」。宁可偶尔走到那个 500，
 * 也不要因为查重这一步自己出问题就**拦住一次合法的建号操作**。
 *
 * 【覆盖不到的情况，已知】列表接口的过滤条件是 type__in=(0, 1, 5)，
 * 所以撞上 type=2/3/4 的存量账号（组委会 / 管理员 / 省级）时查不出来，仍会 500。
 * 前端拿不到这些账号的清单（/committee/*、/admin/* 都按角色隔离），
 * 这一条只能靠后端修 —— 方案见文档末尾给后端的那段代码。
 */
function isUsernameTaken(username) {
  if (!username) return Promise.resolve(false)
  return adminApi.user.list({ keyword: username, limit: 1000, page: 1 })
    .then(({ data: res }) => {
      if (res.code !== 0 || !Array.isArray(res.data)) return false
      return res.data.some((u) => u.username === username)
    })
    .catch(() => false)
}

async function submit() {
  const valid = await ruleFormRef.value.validate().catch(() => false)
  if (!valid) return

  submitting.value = true

  // 查重。注意撞名这条分支**必须先把 submitting 复位再 return** ——
  // 否则用户撞一次名之后，确定按钮会一直停在 loading 态、再也点不动。
  if (await isUsernameTaken(form.value.username)) {
    submitting.value = false
    ElMessage.warning(`账号「${form.value.username}」已存在，请换一个账号名`)
    return
  }

  adminApi.user.create(form.value).then(({ data: res }) => {
    if (res.code === 0) {
      showInfo.value = false
      form.value = {}
      ElMessage.success('创建成功')
      // 建完刷一次列表。原实现漏了这一步，要手动点「刷新」才看得到新账号；
      // 加了「类型」列之后更需要它 —— 否则没法立刻确认建出来的是哪种类型。
      getData()
    } else {
      ElMessage.warning(res.msg)
    }
  }).finally(() => {
    submitting.value = false
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
