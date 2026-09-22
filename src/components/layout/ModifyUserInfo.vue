<template>
  <div v-if="user">
    <el-dialog v-model="showInfo" title="修改信息" width="40%">
      <p style="margin:10px;">提示：修改信息后，修改的账号需要重新登录</p>

      <el-form
        ref="ruleForm"
        class="demo-ruleForm"
        :model="form"
        :rules="rules"
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
        <el-form-item label="新密码" prop="password">
          <el-input v-model="form.password" type="password" />
        </el-form-item>
        <el-form-item label="确认密码">
          <el-input v-model="form.password1" type="password" />
        </el-form-item>

        <p style="margin:10px;">提示：如果输入密码，则会更新密码，不输入，则不会改变密码。</p>
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
 * 【文案出入说明】leader 的提示语写「长度在 2 到 10 个字符」，但规则其实是 max:20；
 * password 提示语写「长度在 8 到 10 个字符」，规则其实是 max:20。属原版笔误，原样保留。
 *
 * 【Vue 3 差异说明】dist 是 `this.form = this.user`（同一个对象引用，靠 $set 补字段）。
 * 这里改为按白名单拷贝，避免直接改写 props 传入的 user 对象。
 *
 * ==========================================================================
 * 【本次修复 · 问题与对策】
 *
 * 【问题 1：表单数据永远陈旧】原实现的唯一数据源是 props.user，而它一路追溯到
 *   localStorage 的 user —— 那个值只在登录时写过一次（login/index.vue:117,119），
 *   之后再没有任何地方更新。后果：数据库里明明已经改好了，重新进入系统、点开弹窗，
 *   看到的还是登录那一刻的旧值，而且永远不变。
 *   对策：打开弹窗时调 GET /api/user 拉取最新数据填入表单。
 *   该接口后端尚未实现（实测返回 405），因此必须**静默降级**：拉到就用，拉不到就
 *   退回 props.user，弹窗照常打开、不弹任何报错。
 *   【接口契约】见 docs/接口需求-GET-api-user.md
 *
 * 【问题 2：tel / leader 被静默清空】原实现照搬 dist 的 $set(form,"tel","")，
 *   每次打开都把这两项置空。而 submit 又不校验，于是"只想改个昵称，一按确定，
 *   数据库里的 tel 和 leader 就被空串覆盖了"—— 真实的数据丢失 Bug。
 *   dist 之所以要置空，是因为它的 form 就是 user 对象本身（改了 form 等于改了 user），
 *   本项目早已是拷贝，不存在这个约束，因此不再置空。
 *
 * 【问题 3：rules 是死代码】原 submit 从不调 validate()，nickname/leader/tel 的
 *   必填与长度规则全部不生效。对策：恢复校验（两次密码一致这条仍需手写判断，
 *   因为 password1 没有 prop，进不了 rules）。
 *
 * 【问题 4：保存成功后顶部昵称不更新】Header.vue:69 的昵称是
 *   computed(() => userStore.user.nickname)，而保存成功后没人写 store，
 *   所以昵称纹丝不动、刷新也不变。对策：保存成功后 userStore.setUser(...) 合并更新。
 *
 * 【本次明确不做的事】
 *   - 弹窗里「修改信息后，修改的账号需要重新登录」这句文案原样保留，且**不加任何强制登出**。
 *     后端 user_update 只调 set_password，不会使既有 PersonalAccessToken 失效，
 *     用户不会被踢出 —— 提示语与行为不符属于既知现状，不在本次范围内。
 *   - footer 里的两个 size="mini" 已移除：Element Plus 不认 "mini"、每次渲染都会告警，
 *     而 EP 中并不存在 `.el-button--mini` 规则，删掉是零视觉变化。**未**改成 small ——
 *     `.el-button--small` 会把按钮从 32px 压到 24px。
 *     （模板里的 label-width / size="default" 是用户自行调整的，予以保留。）
 * ==========================================================================
 */

import { ref, reactive, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { userApi } from '@/api'
import { showApiError } from '@/utils/request'
import { useUserStore } from '@/store/modules/user'

const props = defineProps({
  user: { type: Object, default: null }
})

const userStore = useUserStore()

const showInfo = ref(false)
// 提交中：接口慢时防止连点「确定」发出两次 PUT（先例：login/index.vue:31 的 :loading）
const submitting = ref(false)
const ruleForm = ref(null)

/**
 * 表单里要读写的那几个字段
 *
 * 【来源】后端 PUT /api/user 认的字段（apps/api/views.py 的 user_update）：
 *   username / nickname / description / tel / leader，外加条件性的 id 与 password。
 *   接口返回的 type / parent_id 不在此列。
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
  description: '',
  password: '',
  password1: ''
})

const rules = {
  nickname: [
    { required: true, message: '请输入名称', trigger: 'blur' },
    { min: 2, max: 20, message: '长度在 2 到 20 个字符', trigger: 'blur' }
  ],
  leader: [
    { required: true, message: '请输入负责人名称', trigger: 'blur' },
    { min: 2, max: 20, message: '长度在 2 到 10 个字符', trigger: 'blur' }
  ],
  password: [
    { required: false },
    { min: 8, max: 20, message: '长度在 8 到 10 个字符', trigger: 'blur' }
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
 * 【为什么密码恒清空】接口不返回密码；且"不输入则不改密码"要求每次打开都是空的，
 * 绝不能让上一次输入的密码留在框里被再次提交。
 */
function fillForm(source) {
  if (!source) return
  if (source.id !== undefined && source.id !== null) form.id = source.id
  for (const key of USER_FIELDS) {
    const value = source[key]
    if (value !== undefined && value !== null) form[key] = value
  }
  form.password = ''
  form.password1 = ''
}

/**
 * 【watch 与"接口回填"的冲突 —— 判断与对策】
 *
 * 原实现是 watch(() => props.user, resetForm, { immediate:true })，props.user 引用一变就整表重置。
 * 改造后 props.user 多了一条变化路径：拉到服务端数据后我们主动调 userStore.setUser(...)，
 * 而 userStore.user 正是 MainLayout 传给本组件的 :user。
 *
 * 于是存在这个时序：GET 回填完成 → 用户开始编辑 → props.user 引用变化 → watch 触发 →
 * 用 props.user 把用户正在编辑的内容整个覆盖掉。
 *
 * 对策：给 watch 加「仅弹窗关闭时生效」的守卫，而不是删掉 watch 或维护两套 form。
 *   - 弹窗关闭期间：props.user 变化照旧跟随（保留原语义，immediate 首帧也会填好）；
 *   - 弹窗打开期间：props 变化一律不碰表单，表单的唯一数据源是"本次打开时拉到的那一份"。
 * 保存成功的时序也安全：submit 里先 showInfo=false 再 setUser，此时守卫已放行，
 * 表单被刷成刚保存的值（密码被清空），与界面状态一致。
 */
watch(
  () => props.user,
  () => {
    if (!showInfo.value) fillForm(props.user)
  },
  { immediate: true }
)

/** 本次打开的请求序号：丢弃过期响应，防连续开关弹窗时旧的慢响应覆盖新数据 */
let reqSeq = 0

/**
 * 拉取最新用户信息，失败静默降级
 *
 * 【时序照仓库惯例】参照 src/components/common/UploadScanDialog.vue:222 的 open()：
 * 先发请求、同步置 visible、数据回来再回填。这里同样先由 show() 同步回填 props.user，
 * 保证弹窗一打开就有内容；接口数据回来后覆盖成本次拉到的最新值。
 *
 * 【为什么必须 catch】GET /api/user 后端尚未实现，django-ninja 对「路径存在、方法不允许」
 * 返回 405。而 request.js 的响应拦截器对 405 走 default 分支：只 console.log 然后
 * reject(response || error)，既没提示也没跳转。所以不 catch 就是一条 unhandled rejection
 * （控制台红字，在别人眼里就是"前端有 Bug"）。自己 catch 并吞掉，用户侧完全无感。
 * 注意 body.code===401 的响应也会被这里吞掉：那是拦截器的职责（它已经提示过"没有权限操作"），
 * 不需要、也不应该再补一条提示。
 */
function loadLatest() {
  const seq = ++reqSeq
  userApi
    .getUserInfo()
    .then(({ data: res }) => {
      // 过期响应（期间又开关过一次弹窗）直接丢弃
      if (seq !== reqSeq) return
      // 弹窗已关：不要再往里写数据
      if (!showInfo.value) return
      // 用户已点确定、PUT 正在飞：别在这时候刷表单，否则会覆盖用户刚改的内容
      if (submitting.value) return
      // 后端信封：成功 code===0、失败 code===1（apps/core/services.py 的 success/failure），全仓不存在 code 200
      // data 为空也一并降级，避免 fillForm(undefined) 把表单掏空
      if (!res || res.code !== 0 || !res.data) return

      fillForm(res.data)
      // 回填可能让某些字段由"非法"变"合法"，清掉上一次的校验红字
      if (ruleForm.value) ruleForm.value.clearValidate()

      /**
       * 顺手同步一次用户状态，让顶部昵称也跟着刷新
       *
       * 【为什么要做】只填表单不解决"重新进入系统后顶部昵称还是旧的"——
       * Header.vue:69 的昵称取自 userStore，而 store 只读 localStorage、从不回读服务端。
       * 既然这里已经拿到了服务端权威值，一并写回 store 才是完整的修复。
       *
       * 【为什么用合并而不是直接覆盖】res.data 含 id/username/nickname/description/
       * tel/leader/type/parent_id，直接覆盖也是安全的；用展开合并可以保留将来可能新增的
       * 本地字段，写法上也明确表达"用服务端值更新这几个字段"。password 不在 user_dict 里，
       * 不会、也绝不能进 localStorage（auth.js setUser 会 JSON 序列化落盘）。
       */
      userStore.setUser({ ...(userStore.user || {}), ...res.data })
    })
    .catch(() => {
      /* 静默降级：405（接口未上线）/ 超时 / 断网 / 业务 401 都走到这里，
         表单保持 props.user 那一份数据，不弹提示 —— 这正是"优雅降级"的要求。 */
    })
}

/** 对外方法，与 dist 的 this.$refs.modify.show() 等价 */
function show() {
  // 同步回填：接口没上线 / 超时 / 报错时，用户看到的就是登录时那份数据（= 改造前的行为）
  fillForm(props.user)
  // 首次打开时 el-dialog 内容尚未渲染，ruleForm 为 null，所以要判空；
  // 那一次也不可能存在残留的校验红字，跳过正好。
  if (ruleForm.value) ruleForm.value.clearValidate()

  /**
   * 【顺序不能反：必须先开弹窗，再发请求】
   *
   * 原先这里是 loadLatest() 在前、showInfo = true 在后，结果一旦 loadLatest()
   * 内部出现**同步**异常（真实发生过：userApi.getUserInfo 不存在时抛
   * "userApi.getUserInfo is not a function"），异常会直接掀掉整个 show()，
   * 下面这行 showInfo = true 永远执行不到 —— 用户表现就是「点修改信息毫无反应」。
   * 注意 loadLatest() 里的 .catch() 拦不住这种错误：它是同步抛出的，
   * 异常发生时 .catch() 还没挂上去。
   *
   * 放在前面之后，"弹窗能否打开"与"接口能否调通"彻底解耦，
   * 这才是接口文档里承诺的静默降级。时序上也正好是仓库惯例
   * （src/components/common/UploadScanDialog.vue:222 的 open()：先置 visible 再取数）。
   */
  showInfo.value = true
  loadLatest()
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
 * 本组件改造后是「校验 → 提交 → 成功后同步 store」三段线性流程，且 rules 里每条都自带 message、
 * 由 el-form-item 自己渲染在字段下方，不需要全局提示，所以用最直的写法：不传回调 + await + 显式 catch。
 * 【必须 catch】校验失败会让 validate() 按契约 reject（这是它的正常行为，不是异常），
 * 不 catch 就是 unhandled rejection —— 与上面 GET 的坑是同一个。
 * 【别写成 await validate(fn)】那样失败时既不 reject 也不返回值，这个 await 形同虚设。
 */
async function submit() {
  if (submitting.value) return
  if (!ruleForm.value) return

  // password1 没有 prop，进不了 rules，这条只能在业务里判（与 dist 一致）
  if (form.password !== '' && form.password !== form.password1) {
    return ElMessage.error('两次密码不一致')
  }

  try {
    await ruleForm.value.validate()
  } catch (_) {
    // 校验失败的提示已由 el-form-item 渲染在字段下方，这里不再补弹提示
    return
  }

  // 只挑后端白名单里的字段；password 为空时整条不发 —— 与弹窗里
  // 「如果输入密码，则会更新密码，不输入，则不会改变密码」的文案对齐
  // （后端是 `if data.get("password")`，发空串也不会改密码，这里更显式）
  const payload = { id: form.id }
  for (const key of USER_FIELDS) payload[key] = form[key]
  if (form.password !== '') payload.password = form.password

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

    // 本次打开期间可能还有 GET 在飞，先作废它，免得它回来又把表单刷一遍
    reqSeq++
    // 先关弹窗再 setUser：watch 的守卫在 showInfo 为 false 时放行，
    // 表单会被刷成刚保存的值（密码被清空），与"已保存"的状态一致
    showInfo.value = false
    ElMessage.success('修改成功')

    /**
     * 同步用户状态，让顶部昵称立即更新
     * （Header.vue:69 的昵称是 computed(() => userStore.user.nickname)）
     *
     * 【为什么是合并而不是 setUser(form)】
     *   1) form 里没有 type / parent_id，而 userStore.userType 这个 getter 依赖 type，
     *      直接覆盖会让依赖角色的菜单/跳转判断拿到 -1；
     *   2) form 里可能有 password，绝不能写进 localStorage（auth.js setUser 会 JSON 序列化落盘）；
     *   3) id 也要保留，其它模块可能读它。
     * 所以只把用户本次改过的几个展示字段合并进去。
     *
     * 【为什么是本地合并而不是保存后回读接口】后端 user_update 是原样 setattr、无任何加工
     * （不去空格、不做归一），所以本地值 == 服务端值。若将来后端加了加工逻辑，此处要改成保存后回读。
     */
    userStore.setUser({
      ...(userStore.user || {}),
      username: form.username,
      nickname: form.nickname,
      leader: form.leader,
      tel: form.tel,
      description: form.description
    })
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

defineExpose({ show })
</script>
