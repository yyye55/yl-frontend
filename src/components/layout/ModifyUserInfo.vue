<template>
  <div v-if="user">
    <el-dialog v-model="showInfo" title="修改信息" width="40%">
      <!--
        【本次变更】原为「提示：首次登录后请及时修改密码。修改信息后，修改的账号需要重新登录。」
        前半句已删除：本弹窗内不再能设置自选密码，只剩「重置为默认密码」，
        「请及时修改密码」在这里已无对应操作（详见 resetPassword() 上方注释）。
      -->
      <p style="margin:10px;">提示：修改信息后，修改的账号需要重新登录。</p>

      <el-form
        ref="ruleForm"
        class="demo-ruleForm"
        :model="form"
        :rules="rules"
        inline
        label-width="130px"
        size="default"
      >
        <el-form-item label="账号" prop="username">
          <el-input v-model="form.username" disabled />
        </el-form-item>
        <el-form-item label="名称" prop="nickname">
          <el-input v-model="form.nickname" />
        </el-form-item>
        <el-form-item label="修改人姓名" prop="leader">
          <el-input v-model="form.leader" />
        </el-form-item>
        <el-form-item label="修改人联系方式" prop="tel">
          <el-input v-model="form.tel" />
        </el-form-item>
        <!--
          【本次变更】原先这里是「新密码」+「确认密码」两个输入框，现已删除，
          换成下面这个不带输入框的「重置密码」按钮 —— 与 admin/user.vue、committee/user.vue 三处口径一致。
          【为什么不是"少了一个功能"】密码不再由使用者决定：本按钮发出去的 password 恒为
          DEFAULT_PASSWORD，点确定 = 把本账号密码恢复成默认口令。
          走的是同一个 PUT /api/user，后端 user_update 是 `if data.get("password"): set_password(...)`，
          发什么就设成什么，所以这一处**不需要后端改动**（不像管理员那两处要后端改白名单逻辑）。
        -->
        <el-form-item label="密码">
          <el-button @click="resetPassword">重置密码</el-button>
        </el-form-item>

        <p style="margin:10px;">
          提示：点「重置密码」后，本账号密码将恢复为默认密码：<b>{{ DEFAULT_PASSWORD }}</b>，重置后需重新登录。
        </p>
        <p style="margin:10px;">其他信息：（可以填写一些关于账号的介绍）</p>
        <el-input
          v-model="form.description"
          type="textarea"
          :rows="5"
          maxlength="200"
          show-word-limit
        />
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showInfo = false">取 消</el-button>
          <el-button type="primary" :loading="submitting" @click="submit">确 定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
/**
 * 修改信息弹窗
 *
 * 【可信度：A】逐项照搬 dist/chunk-40286ec0 中的 ModifyUserInfo 组件（name: "ModifyUserInfo"）。
 *
 * ==========================================================================
 * 【本次变更 · 密码：两个输入框 → 一个「重置密码」按钮，并且是本仓库改动最集中的一处】
 *
 * 模板里原先是「新密码」+「确认密码」两个输入框，选填，留空即不改密码。
 * 现改为一个不带输入框的「重置密码」按钮：点击 → 确认框「是否重置为默认密码？」→
 * 发 PUT /api/user，password 恒为 DEFAULT_PASSWORD（src/config/defaultPassword.js）。
 *
 * 【为什么密码不再由使用者决定】管理员端/组委会端的重置密码已统一为"恢复默认口令"，
 *   本弹窗若仍允许自选密码，就等于留了一条绕过口径的后门。
 *   （另一种做法是彻底删掉改密能力、让用户去找管理员重置，本次未采用 ——
 *   本按钮走的就是普通用户自己的 PUT /api/user，不需要动后端。）
 *
 * 【与管理员/组委会那两处的关键差异】这一处**不需要后端配合**。
 *   /admin/user、/committee/user 走后端 user_update_admin，那里被改成了
 *   `if "password" in data: set_password(RESET_PASSWORD_DEFAULT)`（发什么都重置为默认）；
 *   而 PUT /api/user 走 user_update，仍是 `if data.get("password"): set_password(data["password"])`
 *   —— 发什么就设成什么。所以这里发默认口令，效果就是"重置为默认密码"，今天即可生效。
 *
 * 【连带删除的东西】form.password / form.password1、rules.password（含 6-20 长度口径）、
 *   「两次密码不一致」判断、提交载荷里那个条件性的 password、fillForm 里清空密码的两行、
 *   以及 accountRules.js 的 import。密码框没了，"输入密码才改密码"这整套语义也就不存在了。
 *
 * 【顺带删掉的两句文案】
 *   ① 弹窗顶部「首次登录后请及时修改密码。」—— 本弹窗内已不能设置自选密码，这句没有对应操作；
 *   ② 表单里「如果输入密码，则会更新密码，不输入，则不会改变密码。」—— 输入框已不存在。
 *   两条都换成了如实描述新行为的提示。
 *
 * 【⚠️ 留给他人的一个已知后果】改完这一处之后，全站再没有任何界面能设置**自选**密码：
 *   密码只有两个来源 —— 管理员「添加账号」时填的初始密码，以及各处「重置密码」写死的默认口令。
 *   受影响的还有登录页那条「密码为初始密码，请登录系统后在右上角的[修改信息]中修改密码」——
 *   用户照做只会把它重置回同一个默认口令，该提醒已失去意义。本次未动登录页，需要时另行决定。
 * ==========================================================================
 *
 * 原文关键逻辑：
 *   data(){ return { showInfo:false, form:{}, rules:{
 *     nickname:[{required:true,message:"请输入名称",trigger:"blur"},{min:2,max:20,message:"长度在 2 到 20 个字符",trigger:"blur"}],
 *     leader:  [{required:true,message:"请输入负责人名称",trigger:"blur"},{min:2,max:20,message:"长度在 2 到 10 个字符",trigger:"blur"}],
 *     password:[{required:false},{min:8,max:20,message:"长度在 8 到 10 个字符",trigger:"blur"}],
 *     tel:     [{required:true,message:"电话号码必填",trigger:"blur"}]
 *   }}}
 *   mounted(){ this.form=this.user; this.$set(this.form,"tel",""); this.$set(this.form,"leader","");
 *              this.$set(this.form,"password",""); this.$set(this.form,"password1","") }
 *   show(){ this.showInfo=!0 }
 *   submit(){
 *     if(""!==this.form.password && this.form.password!==this.form.password1) return ElMessage.error("两次密码不一致")
 *     this.$api.communal.updateUserInfo(this.form).then(({data:e})=>{
 *       0===e.code ? (this.showInfo=!1, ElMessage.success("修改成功")) : ElMessage.warning(e.msg) })
 *   }
 *
 * 【文案出入说明 —— 本次已修正】（password 那半句已随输入框一并作废，见上一节）
 *  leader 原提示语写「长度在 2 到 10 个字符」，但规则其实是 2-20；
 *  password 原提示语写「长度在 8 到 10 个字符」，规则其实是 8-20。属原版笔误。
 *  本次只改文案，让它与实际区间一致。
 *
 * 【历史：password 曾并入统一口径】（该规则现已删除，保留记录以免被当成漏写补回来）
 *  这里一度是 8-20，而「添加账号」6-32、登录页 5-15 —— 管理员按 6 位建的密码，
 *  用户想自己改成同一个值会被这里拒（min:8）。后来改用 src/config/accountRules.js 的 6-20，
 *  与其余写入入口一致。现在整个 rules.password 连同输入框一起删除了。
 *
 * 【Vue 3 差异说明】dist 是 `this.form = this.user`（同一个对象引用，靠 $set 补字段）。
 * 这里改为按白名单拷贝，避免直接改写 props 传入的 user 对象。
 *
 * ==========================================================================
 * 【本次修复 · 问题与对策】
 *
 * 【问题 1：表单数据永远陈旧】原实现的唯一数据源是 props.user，而它一路追溯到
 *   localStorage 的 user —— 那个值只在登录时写过一次（login/index.vue:117,119）。
 *   一度以为对策是"打开弹窗时调 GET /api/user 拉最新值"，本文件曾照此实现过。
 *   现已整段删除，理由见下方「本次修复：整段删除了…」：GET 与登录返回的是同一个
 *   user_dict(user)，同源同字段，值不可能不同；而保存成功后强制重新登录，
 *   用户看到的永远是刚读到的权威值 —— 这条链路里没有需要"再拉一次"的位置。
 *   【接口契约】见 docs/接口需求-GET-api-user.md（该接口现已上线）
 *
 * 【问题 2：tel / leader 被静默清空】原实现照搬 dist 的 $set(form,"tel","")，
 *   每次打开都把这两项置空。而 submit 又不校验，于是"只想改个昵称，一按确定，
 *   数据库里的 tel 和 leader 就被空串覆盖了"—— 真实的数据丢失 Bug。
 *   dist 之所以要置空，是因为它的 form 就是 user 对象本身（改了 form 等于改了 user），
 *   本项目早已是拷贝，不存在这个约束，因此不再置空。
 *
 * 【问题 3：rules 是死代码】原 submit 从不调 validate()，nickname/leader/tel 的
 *   必填与长度规则全部不生效。对策：恢复校验。
 *   （原文后半句「两次密码一致这条仍需手写判断，因为 password1 没有 prop」已作废 ——
 *   两个密码框连同那条手写判断一并删除，见文件头【本次变更 · 密码】。）
 *
 * 【问题 4：保存成功后 store 不更新 → 已由「强制退出重新登录」取代】
 *   dist 里顶栏昵称取自 userStore，而保存成功后没人写 store，昵称纹丝不动、刷新也不变。
 *   本仓库原先的对策是保存成功后 userStore.setUser(...) 合并更新；
 *   第十二届按业务要求改为「保存成功后强制退出重新登录」（见下方「本次新增」与 submit()），
 *   登出会执行 localStorage.clear()，那段合并写进去立刻被抹掉、没有任何读取方，故已删除。
 *   【最新一次修复把"打开弹窗时拉取最新用户信息"整段也删了】连它里面那次 store 同步一起 ——
 *   把读到的值持久化进 localStorage 正是"刷新多次也不变"的成因。
 *   现在本组件**只读** props.user，不写 store、也不发 GET。
 *
 * 【本次新增：保存成功后强制退出重新登录】
 *   弹窗里那句「修改信息后，修改的账号需要重新登录」原先只是文案 —— 后端 user_update
 *   只调 set_password，不会使既有 PersonalAccessToken 失效，用户不会被踢出，
 *   提示语与行为不符。现按业务要求把行为补齐：
 *   保存成功 → POST /api/logout（后端删掉该 token）→ 清本地 → 关标签页 → 1 秒后跳登录。
 *   范围是「任何保存」：只改昵称也会登出 —— 与文案字面「修改信息后」一致。
 *   【注意】即使 logout 接口失败也必须继续退出：保存已经成功，
 *   「需重新登录」这个承诺不能因为一个清理接口失败而失效（该 catch 在 forceRelogin() 里）。
 *   【本次变更】这段流程原先内联在 submit() 中，现抽成 forceRelogin()，供
 *   submit() 与 resetPassword() 共用 —— 重置密码同样必须登出，理由见 forceRelogin()。
 *
 * 【本次明确不做的事】
 *   - footer 里的两个 size="mini" 已移除：Element Plus 不认 "mini"、每次渲染都会告警，
 *     而 EP 中并不存在 `.el-button--mini` 规则，删掉是零视觉变化。**未**改成 small ——
 *     `.el-button--small` 会把按钮从 32px 压到 24px。
 *     （模板里的 label-width / size="default" 是用户自行调整的，予以保留。）
 * ==========================================================================
 */

import { ref, reactive, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { userApi } from '@/api'
import { DEFAULT_PASSWORD } from '@/config/defaultPassword'
import { showApiError } from '@/utils/request'
import { useUserStore } from '@/store/modules/user'
import { useTabsStore } from '@/store/modules/tabs'
import { clearAllMsg } from '@/utils/auth'
import { logout as apiLogout } from '@/api/auth'

const props = defineProps({
  user: { type: Object, default: null }
})

const router = useRouter()
const userStore = useUserStore()
const tabsStore = useTabsStore()

const showInfo = ref(false)
// 提交中：接口慢时防止连点「确定」发出两次 PUT（先例：login/index.vue:31 的 :loading）
const submitting = ref(false)
const ruleForm = ref(null)

/**
 * 表单里要读写的那几个字段
 *
 * 【来源】后端 PUT /api/user 认的字段（apps/api/views.py 的 user_update）：
 *   username / nickname / description / tel / leader，外加单独传的 id。
 *   接口返回的 type / parent_id 不在此列。
 *   【password 为什么不在这里】它已不属于"表单里可编辑的字段"——
 *   由 resetPassword() 单独发一次请求，不走本数组、也不随 submit() 提交。
 *
 * 【为什么显式声明而不用 reactive({}) 靠 v-model 动态加字段】
 *   字段名原本要在三处各写一遍（校验规则、提交载荷、接口回填），漏一处就是静默 Bug
 *   （比如回填漏了 leader，用户一保存 leader 就被清空）。这里收敛成一份白名单，三处共用。
 */
const USER_FIELDS = ['username', 'nickname', 'leader', 'tel', 'description']

const form = reactive({
  id: undefined,
  username: '',
  nickname: '',
  leader: '',
  tel: '',
  description: ''
})

/**
 * 【业务要求·不是 bug】leader / tel 必填是刻意为之，前端有意比后端严：
 *   后端 tel / leader 均为 null=True, blank=True, default=""（apps/core/models.py:81-82），
 *   且 user_update 只看键在不在、不看值是否为空；
 *   而 admin 页「添加账号」弹窗没有这两个输入框（admin/user.vue 的「添加用户」弹窗，
 *   只有 账号/名称/密码/类型/其他信息），user_create_admin 的 `if k in data`
 *   于是不写这两列 → 新建账号的 tel / leader 恒为空串。
 *   合起来的意图：**新账号第一次修改信息时，必须先补全「修改人姓名 / 修改人联系方式」**，
 *   保存成功后强制退出重新登录（见 submit()）。
 *   ⇒ 不要把这两条改成非必填：它们不是前后端不一致，是前端有意更严。
 */
const rules = {
  nickname: [
    { required: true, message: '请输入名称', trigger: 'blur' },
    { min: 2, max: 20, message: '长度在 2 到 20 个字符', trigger: 'blur' }
  ],
  leader: [
    { required: true, message: '请输入负责人名称', trigger: 'blur' },
    { min: 2, max: 20, message: '长度在 2 到 20 个字符', trigger: 'blur' }
  ],
  tel: [{ required: true, message: '电话号码必填', trigger: 'blur' }]
}

/**
 * 把一份 user 数据按白名单回填进 form
 *
 * 【为什么只遍历 USER_FIELDS】这样 form 的字段集合恒定，不会被外部数据"撑大"，
 * 天然挡住 type / parent_id 这类不该进表单的字段（改造前它们会被 Object.assign
 * 一起带进 form 并随 PUT 提交；后端白名单虽会忽略，但提交里混着角色字段是隐患）。
 *
 * 【为什么跳过 undefined / null】id 被置空会让后端 str(id) !== str(auth.id)，
 * 直接返回 code 1「无该用户修改权限！」。后端 user_dict 已把 None 归一成 ""，
 * 这里再挡一次是防止接口将来改成直接回传 null。
 *
 * 【本次变更】原先这里还有 `form.password = ''` / `form.password1 = ''` 两行，
 * 理由是"接口不返回密码，不输入则不改密码，所以每次打开都要清空"。
 * 两个密码字段已随输入框一起删除，密码改由「重置密码」按钮单独触发，故这两行删除。
 */
function fillForm(source) {
  if (!source) return
  if (source.id !== undefined && source.id !== null) form.id = source.id
  for (const key of USER_FIELDS) {
    const value = source[key]
    if (value !== undefined && value !== null) form[key] = value
  }
}

/**
 * 【watch 与"接口回填"的冲突 —— 判断与对策】
 *
 * 原实现是 watch(() => props.user, resetForm, { immediate:true })，props.user 引用一变就整表重置。
 * 改造后 props.user 曾多出一条变化路径：拉到服务端数据后组件自己调 userStore.setUser(...)，
 * 而 userStore.user 正是 MainLayout 传给本组件的 :user。
 *
 * 于是存在这个时序：GET 回填完成 → 用户开始编辑 → props.user 引用变化 → watch 触发 →
 * 用 props.user 把用户正在编辑的内容整个覆盖掉。
 *
 * 对策：给 watch 加「仅弹窗关闭时生效」的守卫，而不是删掉 watch 或维护两套 form。
 *   - 弹窗关闭期间：props.user 变化照旧跟随（保留原语义，immediate 首帧也会填好）；
 *   - 弹窗打开期间：props 变化一律不碰表单，表单的唯一数据源是"本次打开时拉到的那一份"。
 *
 * 【这条守卫现在还必要吗】那条自写路径已随本次修复删除（组件不再写 store），
 * 弹窗打开期间理论上已无人改动 props.user。但守卫零成本，且把"表单只在关闭时跟随 props"
 * 这条语义写死了，所以保留 —— 不依赖"上游恰好不会变"这个假设。
 * 保存成功的时序也安全：submit 里先置 showInfo=false，此时守卫已放行。
 */
watch(
  () => props.user,
  () => {
    if (!showInfo.value) fillForm(props.user)
  },
  { immediate: true }
)

/**
 * 【本次修复：整段删除了"打开弹窗时拉取最新用户信息"的实现】
 * 删掉的是原 loadLatest()、配套的请求序号 reqSeq、以及表单快照 snapshotOf()/isDirty()。
 *
 * 【直接原因】它唯一的产出是"把服务端值填进表单"，而这份值与弹窗已有的 props.user
 *   **同源同字段**：GET /api/user 返回 user_dict(user)（apps/api/views.py 的 user_info），
 *   登录接口返回的也是 user_dict(user)（apps/core/services.py:47）。同一行的同一次读取，
 *   值不可能不同。
 *
 * 【根本原因】它当初存在的理由是"顺手同步 store，让顶部昵称也跟着刷新"。
 *   而顶栏的昵称那一栏在第十二届已按要求移除（Header.vue:48-51，模板中只剩
 *   "修改信息 / 退出登录"两个 div），userStore.user 现在**唯一**的读取方是
 *   MainLayout.vue:115，也就是本组件自己的 props.user —— 写回 store 等于自己写给自己，
 *   是个自环。动机既然不存在，剩下的就只有成本。
 *
 * 【为什么"留着也无害"不成立】它有害，而且正是用户报的那个症状：GET 是异步的，
 *   回来时用户可能已经动过表单（快照比较挡得住这一种），也可能还没动（**挡不住**，
 *   此时整表被服务端值覆盖）。若那份响应恰好是旧的，用户接着点确定就把旧值写回了数据库，
 *   属于静默的数据回退。上一版它还把这个值写进 localStorage，于是"刷新多次也不变"。
 *
 * 【删掉后的数据来源】只有 props.user 一份，来自登录响应；保存成功后强制重新登录，
 *   登录响应又是刚读的权威值 —— 这条闭环里没有需要"再拉一次"的位置。
 *
 * 【代价（如实记录）】不重新登录时，刷不到"别人在用户管理页改的我的资料"
 *   （admin/committee 的 user_update_admin）。这是本次唯一的功能回退；
 *   判断是这个场景的收益远小于"过期回填把旧值静默写回库"的风险。
 *   若将来确实要做，别恢复快照比较这种写法，改成让后端在 user_dict 里返回 updated_at
 *   （models.py:90 有这个列，auto_now=True），前端比时间戳。
 */

/** 对外方法，与 dist 的 this.$refs.modify.show() 等价 */
function show() {
  // 回填：表单的**唯一**数据源就是 props.user（登录响应），不再发任何请求
  fillForm(props.user)
  // 首次打开时 el-dialog 内容尚未渲染，ruleForm 为 null，所以要判空；
  // 那一次也不可能存在残留的校验红字，跳过正好。
  if (ruleForm.value) ruleForm.value.clearValidate()

  showInfo.value = true
}

/**
 * 保存
 *
 * 【校验风格的选择 —— 用 await + try/catch，而不是仓库里那种回调】
 * 仓库现有 3 处 validate：
 *   - login/index.vue:130  `await formRef.value.validate(async (valid) => {...})`
 *   - OrchestraForm.vue:869 / ProgramForm.vue:867  `formRef.value.validate((valid) => {...})`
 * 后两处传回调是有原因的：它们在照搬 dist 的"请检查数据完整性！"这条全局提示，必须拿到 valid 自己弹。
 * 而 Element Plus 的 validate() 只有在「不传回调」时才返回真正会 reject 的 Promise
 * （源码里写死了 shouldThrow = !isFunction(callback)）；传了回调就把标准的 try/catch 能力关掉了。
 * 本组件改造后是「校验 → 提交 → 强制重新登录」三段线性流程，且 rules 里每条都自带 message、
 * 由 el-form-item 自己渲染在字段下方，不需要全局提示，所以用最直的写法：不传回调 + await + 显式 catch。
 * 【必须 catch】校验失败会让 validate() 按契约 reject（这是它的正常行为，不是异常），
 * 不 catch 就是 unhandled rejection —— 与 request.js 里那条 405 静默分支是同一类坑。
 * 【别写成 await validate(fn)】那样失败时既不 reject 也不返回值，这个 await 形同虚设。
 */
async function submit() {
  if (submitting.value) return
  if (!ruleForm.value) return

  try {
    await ruleForm.value.validate()
  } catch (_) {
    // 校验失败的提示已由 el-form-item 渲染在字段下方，这里不再补弹提示
    return
  }

  // 只挑后端白名单里的字段。
  // 【本次变更】原先这里还有一个 `if (form.password !== '') payload.password = ...`，
  // 与「两次密码不一致」的判重。密码输入框已删除，本请求不再携带 password ——
  // 后端 user_update 是 `if data.get("password")`，不带该键即不动密码，正是这里要的语义。
  const payload = { id: form.id }
  for (const key of USER_FIELDS) payload[key] = form[key]

  submitting.value = true
  try {
    // 【为什么这里用 await 而不是 .then】本函数为了 validate 已经是 async；
    // 同一段流程里混用 .then 会让 submitting 的收尾散落到 finally 之外。
    // login/index.vue 的 doLogin 就是 await + try/catch，属仓库已有写法。
    const { data: res } = await userApi.updateUserInfo(payload)

    if (res.code !== 0) {
      // 照仓库惯例：业务失败只提示、不关弹窗（例如后端返回「无该用户修改权限！」）
      ElMessage.warning(res.msg)
      return
    }

    // 先关弹窗：watch 的守卫在 showInfo 为 false 时放行
    showInfo.value = false
    ElMessage.success('修改成功，请重新登录')
    await forceRelogin()
  } catch (err) {
    /**
     * 【为什么这里也要 catch】改造前这个 PUT 没有 catch：一旦走到拦截器的 default 分支
     * （405/422 等静默状态码）就是一条 unhandled rejection，用户侧表现是"点了没反应"。
     * showApiError 正是为此存在的（见 request.js:174 的注释）：对 401/403/404/500/网络异常
     * 返回 null（拦截器已提示或已跳转），不会重复弹提示，只对静默状态码弹一句可读文案。
     */
    showApiError(err, '修改失败')
  } finally {
    submitting.value = false
  }
}

/**
 * 【第十二届·新】强制退出重新登录 —— submit() 与 resetPassword() 共用这一份
 *
 * 【为什么要做】弹窗里那句「修改信息后，修改的账号需要重新登录」原先只是文案：
 * 后端 user_update 只调 set_password，不会使既有 PersonalAccessToken 失效，用户不会被踢出。
 * 现按业务要求把行为补齐 —— 范围是「任何保存」，只改昵称也会登出（与文案字面一致）。
 * 「重置密码」同样要走它：重置完不登出的话，用户会拿着一个已经公开写在页面上的
 * 默认口令继续用旧 token 操作，且下次登录才会看到「密码为初始密码」那条提醒。
 *
 * 【为什么走 apiLogout 而不是只清本地】只清 localStorage 的话，后端那条 token 依然有效
 * （即便这次改过密码）。apiLogout()（POST /api/logout）会让后端删掉该 token，
 * 与顶栏「退出登录」（Header.vue:69）走的是同一条链路。
 *
 * 【为什么单独 try/catch】调用方的 catch 会调 showApiError(err, '修改失败')，
 * 而此时保存**已经成功**，绝不能再报「修改失败」。
 * 且 logout 失败也必须继续退出：「需重新登录」这个承诺不能因为一个清理接口失败而失效。
 *
 * 【原实现已删除】保存成功后 userStore.setUser(...) 合并更新。
 * 它在本仓库存在的理由是「问题 4：保存成功后 store 不更新」；现在保存成功即登出，
 * 而下面 clearAllMsg() 会 localStorage.clear()，那段合并写进去立刻被抹掉，已无读取方。
 * （弹窗打开期间那次 store 同步也已随「打开时拉取最新信息」整段删除。）
 *
 * 【为什么下面还要 userStore.logout()】见紧挨着它的那段注释 —— 登出必须连内存态一起清。
 *
 * 【为什么必须 await】（调用方原先是内联写的，没这个问题）新调用方 resetPassword()
 * 是 async 函数，若这里不 await，它的 finally 会在登出流程跑完前就把 submitting 放回 false。
 */
async function forceRelogin() {
  try {
    await apiLogout()
  } catch (_) {
    /* 忽略：下面照常清本地并跳登录 */
  }
  clearAllMsg() // utils/auth.js:54 = localStorage.clear()，token 与 user 一起清
  tabsStore.clearAllTabs()

  /**
   * 【为什么还要清一次 store】clearAllMsg() 只动 localStorage，而 userStore 是启动时
   * 把 localStorage 读进内存的副本（store/modules/user.js:13-16），三处内存状态
   * （token / user / getters）不会跟着变。当前它的读取方都在路由守卫之后
   * （守卫读 localStorage，MainLayout 由守卫放行才挂载），所以这一行**不是在修可见 Bug**，
   * 而是把"登出即清干净"这条语义补齐，免得 store 里长期挂着过期 user 等将来被误用。
   * 语义与 utils/auth.js:74 的 logout() 一致。
   */
  userStore.logout()

  /**
   * 【为什么延时 1 秒】照 request.js gotoLogin() 的节奏：先让用户看清提示再跳，
   * 否则「修改成功，请重新登录」还没读完页面就切走了。
   * （ElMessage 渲染在 body 上，即使不延时也不会因跳路由而消失，这里只是为了可读性。）
   */
  setTimeout(() => router.push('/login'), 1000)
}

/**
 * 「重置密码」—— 确认框，把本账号密码恢复为默认口令
 *
 * 【与管理员/组委会那两处的区别 —— 这一处不需要后端配合】
 *   /admin/user、/committee/user 的重置走 user_update_admin，后端把逻辑改成了
 *   `if "password" in data: set_password(RESET_PASSWORD_DEFAULT)`（值被忽略），
 *   所以那两处必须等后端上线。
 *   而这里是 PUT /api/user（user_update），后端仍是 `if data.get("password"): set_password(data["password"])`
 *   —— 发什么就设成什么。我们发 DEFAULT_PASSWORD，效果就是"重置为默认密码"，今天就能生效。
 *
 * 【为什么从"两个输入框"改成"一个按钮"】密码不再由使用者决定，一律是默认口令。
 *   留着输入框只会骗人：无论填什么，最终生效的都是 scylb@2026
 *   （这与 admin/user.vue 里删掉的那个「修改用户」密码框是同一类静默陷阱）。
 *   随之删除的还有 form.password / form.password1 / rules.password / 「两次密码不一致」判断，
 *   以及提交载荷里那个条件性的 password。
 *
 * 【为什么重置后也要强制重新登录】见 forceRelogin() 的注释第一段。
 *   另外登录页有一条「密码为初始密码」的提醒，登出后用户会立刻看到它。
 *
 * 【为什么确认框和请求分成两段写（而不是 .then().catch()）】
 *   若把 PUT 写在 .then() 里，紧跟着的 .catch() 会**同时**接住"用户点了取消"和
 *   "PUT 请求失败"两种情况，后者会被误报成「已取消」。
 *   所以：confirm 单独 try/catch（只为吃掉取消），请求放在它后面单独处理。
 */
async function resetPassword() {
  if (submitting.value) return

  try {
    await ElMessageBox.confirm('是否重置为默认密码？', '重置密码', {
      confirmButtonText: '确定',
      cancelButtonText: '取消'
    })
  } catch (_) {
    // 取消 / 右上角关闭都会 reject（'cancel' / 'close'），这不是错误
    ElMessage({ type: 'info', message: '已取消' })
    return
  }

  submitting.value = true
  try {
    const { data: res } = await userApi.updateUserInfo({
      id: form.id,
      password: DEFAULT_PASSWORD
    })

    if (res.code !== 0) {
      // 业务失败只提示、不关弹窗（例如后端返回「无该用户修改权限！」）
      ElMessage.warning(res.msg)
      return
    }

    showInfo.value = false
    ElMessage.success('重置成功，请重新登录')
    await forceRelogin()
  } catch (err) {
    showApiError(err, '重置失败')
  } finally {
    submitting.value = false
  }
}

defineExpose({ show })
</script>
