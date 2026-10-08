<!--
  /login 登录页
-->
<template>
  <div class="login_container">
    <div class="login_box">
      <p class="title">“意林杯”四川省第十二届<br/>管乐展示活动</p>

      <el-form
        ref="loginFormRef"
        :model="loginForm"
        :rules="loginFormRules"
        class="login_form"
        @submit.prevent="submit"
      >
        <el-form-item prop="username">
          <el-input v-model="loginForm.username" placeholder="账号" clearable />
        </el-form-item>

        <el-form-item prop="password">
          <el-input
            v-model="loginForm.password"
            type="password"
            placeholder="密码"
            show-password
            @change="submit"
          />
        </el-form-item>

        <el-form-item class="btns">
          <el-button type="primary" class="mybtn" :loading="loading" @click="submit">
            登录
          </el-button>
        </el-form-item>

        <!--
          登录表单里的说明文字。
          【文字从哪来】applyNotice.js 的 formContent —— 本文件里不再写文案字面量。
          【为什么写成一行不换行】虽然这里没有 white-space: pre-line（换行只会
          被折叠成一个空格，不会真的换行），但那个空格会跑到邮箱前面去，
          看起来像「邮箱 前面多了个空格」。写成一行最省心，两处也统一。
          【谁负责变红】.apply_email，和弹窗用的是同一个类、同一条 CSS。
        -->
        <p><span v-for="(seg, i) in formSegments" :key="i" :class="{ apply_email: seg.email }">{{ seg.text }}</span></p>

        <!--
          报名账号申请的入口 —— 点这行文字才打开弹窗（不再自动弹）。
          开与不开的取舍见 script 里 showApply 的注释。
          【为什么用 el-button type="text"】与全仓 25 处文字链接同一套写法
          （如 PersonTable.vue:63 的「下载模板」）；升 EP 3.0 时才统一改 link prop，
          现在不要单独改这一处。
          【放在 el-form 里也不会误触登录】el-button 的 native-type 默认是
          "button"，不是 "submit"。
          【为什么不用 el-form-item 包】包了就得挂 prop，会平白多出一条校验规则。
        -->
        <!-- 【2026-10-08 停用】入口整块注释（连外层 div 一起，否则空 div 会多出 4px 间距）；恢复时删掉这对标记。
        <div class="apply_entry">
          <el-button type="text" @click="showApply = true">报名账号申请</el-button>
        </div>
        -->
      </el-form>
    </div>

    <!--
      报名账号申请弹窗

      【位置】放在 .login_box 的**外面**，作为 .login_container 的直接子级。
      【append-to-body 是必须的】它让弹窗 teleport 到 <body> 下。理由有两条：
        1) 本项目另外 5 个 el-dialog（Remark / ShowContent / ShowPerson /
           ShowScFile / UploadScanDialog）全都带这个属性，属既有惯例；
        2) .login_box 上有 transform: translateX(150px)，而 CSS 规范里
           transform 不为 none 的元素会成为后代 position: fixed 的包含块。
           不加 append-to-body 又嵌进 .login_box 的话，遮罩就只盖得住那张
           .login_box 那张卡片，而不是整个屏幕。
      【右上角的 X】el-dialog 自带的（showClose 默认 true），不用写代码。
      【底部的按钮不会误触登录】整个弹窗在 el-form 的外面；且 el-button 的
      native-type 默认是 "button"，不是 "submit"。
      【width 为什么写成 min()】固定 620px 在手机上会溢出；min(620px, 100vw-32px)
      让窄屏自动收窄。EP 把 width 写进 CSS 变量 --el-dialog-width
      （element-plus/es/components/dialog/src/use-dialog.mjs:37-38），字符串原样
      透传，min()/calc() 是合法 CSS。
      【为什么宽度用属性而不是 CSS 规则】弹窗 teleport 到 body 之后，它已经不
      是 .login_container 的后代，scoped 的 `.login_container :deep(.el-dialog)`
      会编译成 `.login_container[data-v-x] .el-dialog` —— 前半段匹配不上，
      规则**不报错也不生效**。所以别顺手加那条规则。
      【align-center：上下左右居中】EP 内置的属性，不用自己写 CSS。它做了两件事
      （已在 node_modules 里核实）：
        1) use-dialog.mjs:47 —— 给遮罩层 .el-overlay-dialog 加内联
           `display: flex`（那个 div 本来就是 position:fixed 铺满全屏的，
           el-dialog.css 里写着 top/bottom/left/right 全 0）；
        2) dialog-content.vue...:34 —— 给 .el-dialog 挂上 is-align-center 类，
           对应 el-dialog.css 里的 `.el-dialog.is-align-center { margin: auto }`。
      flex 容器里的子项带 margin:auto，会把剩余空间在两个方向上都吃掉，
      效果就是水平垂直双双居中。
      【开了它之后 top 属性就失效了】EP 默认给 .el-dialog 加
      `margin: var(--el-dialog-margin-top, 15vh) auto 50px`，也就是平时那个
      「偏上、距顶 15vh」的位置；而 `.el-dialog.is-align-center` 是 (0,2,0)，
      压得过 `.el-dialog` 的 (0,1,0)，margin 被整个换成 auto。所以别再加 top。
      【已知边界：内容比屏幕还高时顶上会不会被切掉】不会。
      遮罩层是 overflow:auto，弹窗是 flex 子项，理论上「居中 + 溢出」有顶部
      滚不到的老问题。实测（Chromium，视口故意压到 1200×150，弹窗 195px 高于
      视口）：scrollHeight 195 > clientHeight 150 可滚动，scrollTop=0 时弹窗
      top=0（不是负数），滚到底 top=-45 —— 内容从头到尾都够得到。浏览器对
      滚动容器里的 flex 项做了 safe 对齐。另外正文 .apply_text 自己还限了
      max-height: 50vh 且内部滚动，双保险。
    -->
    <el-dialog
      v-model="showApply"
      :title="APPLY_NOTICE.title"
      width="min(620px, calc(100vw - 32px))"
      align-center
      append-to-body
    >
      <!--
        弹窗正文。
        【为什么写成一行不换行】父级 .apply_text 上有 white-space: pre-line，
        也就是说源码里的换行符会被当成真的换行渲染出来。这些 <span> 必须紧挨着，
        中间不能有换行/缩进，否则「指定邮箱」和邮箱之间会凭空多出一个空行。
        （Vue 编译器默认会吃掉纯空白的换行节点，但那是它的默认行为，
          写死成一行才不依赖这个默认值。）
        【谁负责变红】:class 绑定的 .apply_email 在下面的 <style> 里，不用行内样式。
        【v-for 的 key 用下标】这些片段只来自一个静态配置串，不会重新排序或增删，
        下标是稳定的，可以用。
      -->
      <p class="apply_text"><span v-for="(seg, i) in applySegments" :key="i" :class="{ apply_email: seg.email }">{{ seg.text }}</span></p>

      <!--
        弹窗底部。
        【为什么要多包一层 div】EP 给 .el-dialog__footer 写死了 text-align: right
        （el-dialog.css），按钮默认靠右。要让它居中就得改这个对齐方式。
        【为什么不用 :deep(.el-dialog__footer)】弹窗被 append-to-body teleport 到了
        <body> 下，已经不是 .login_container 的后代，scoped 的祖先选择器会编译成
        `.login_container[data-v-x] .el-dialog__footer` —— 前半段匹配不上，
        规则不报错也不生效（同 .el-dialog 那条的注释）。
        【为什么不用 EP 的 center 属性】它会把 .el-dialog--center 的
        text-align 改成 inherit（el-dialog.css），**标题「报名账号申请」也会跟着居中** ——
        本次只要求按钮居中，不动标题。
        【为什么这个 div 上的类能被 scoped 命中】它是我们模板里的元素
        （插槽内容算父组件的），自带 data-v 属性；和 .apply_text / .apply_email
        是同一个道理，与元素在 DOM 里被 teleport 到哪无关。
        【为什么用 text-align 而不是 flex】与本文件 .btns / .apply_entry 的居中
        写法一致，且按钮是 inline-block，text-align 正对症。
      -->
      <template #footer>
        <div class="apply_footer">
          <el-button type="primary" @click="downloadApply">下载《账号申请表（附件4）》</el-button>
        </div>
      </template>
    </el-dialog>

    <div class="footer">Copyright @2026 四川省教育厅版权所有</div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from "vue"
import { useRouter } from "vue-router"
import { ElMessage, ElMessageBox } from "element-plus"
import { login as apiLogin } from "@/api/auth"
import { DEFAULT_PASSWORD } from "@/config/defaultPassword"
import { setToken, setUser } from "@/utils/auth"
import { useUserStore } from "@/store/modules/user"
import { APPLY_NOTICE } from "@/config/applyNotice"
import { downloadStaticFile } from "@/utils/excel"

const router = useRouter()
const userStore = useUserStore()
const loginFormRef = ref(null)
const loading = ref(false)

const loginForm = reactive({
  username: "",
  password: ""
})

/**
 * 「报名账号申请」弹窗自动弹出的一次性标记的键名。
 *
 * 【为什么必须是 sessionStorage，不能用 localStorage】
 * 本文件下面那个清缓存的 onMounted 每次挂载都会把 localStorage 里
 * 除 draft_session: 以外的 key **全部清掉**（它只操作 window.localStorage，
 * 见该函数里的 `const ls = window.localStorage`）。
 * 标记若写进 localStorage，会被它抹掉，于是「退出登录」回到本页时又弹一次 ——
 * 正是要避免的情况。
 * sessionStorage 不受那段代码影响，三个场景才能各归其位：
 *   · 冷启动 / 新开标签页打开登录页            → 弹（本次会话还没看过）
 *   · 退出登录（router.push，页面不刷新）      → 不弹（标记还在）
 *   · 登录态过期（window.location.href 整页跳转）→ 不弹（sessionStorage 跨刷新/跳转存活）
 *
 * 【为什么这里用布尔标记就够，而 guard.js 那个非要用时间戳】
 * guard.js:155 要的是「60 秒内只自愈一次」，窗口会随时间失效，所以必须存时刻；
 * 这里要的是「本标签页看过就不再弹」，语义本身就是一次性的，布尔标记正合适。
 *
 * 【已知边界】sessionStorage 随标签页的生命周期存在：用户关掉标签页再打开，
 * 会再弹一次。这是刻意的 —— 「部署/终端运行之后打开界面」时就应该弹出来。
 */
const APPLY_SEEN_KEY = 'applyNoticeSeen'

/**
 * 判断本次进入登录页要不要自动打开弹窗，并顺手记下「已看过」。
 *
 * 【为什么读和写必须挤在同一个函数里】拆成两个的话，中间只要有一处提前
 * return（比如读失败的分支），标记就写不进去，用户会被反复弹。
 *
 * 【为什么在 setup 里直接调用，而不是写个 onMounted】
 * ref(初值) 在 setup 阶段求值，弹窗第一次渲染出来就是开着的，不需要等挂载；
 * 更重要的是**不新增任何 onMounted** —— 于是和下面那个清缓存的 onMounted
 * 完全没有先后顺序上的耦合，谁先谁后都不影响。
 *
 * 【fail-closed：存储不可用时返回 false（不自动弹）】
 * 隐私模式、企业策略、跨源 iframe 的存储分区都可能让 sessionStorage 抛异常。
 * 拿不到标记时选择「不弹」：弹窗内容用户仍能用页面上那行「报名账号申请」
 * 手动打开，功能不会丢；反过来「拿不到就当没看过」会变成每次进来都被糊一脸。
 * 这与 guard.js:171-174 对存储不可用的取态一致。
 */
function shouldAutoOpenApply() {
  let seen
  try {
    seen = window.sessionStorage.getItem(APPLY_SEEN_KEY)
  } catch (_) {
    return false
  }
  if (seen) return false

  try {
    window.sessionStorage.setItem(APPLY_SEEN_KEY, '1')
  } catch (_) {
    // 写不进去不影响这一次的展示，只是下次可能还会再弹
  }
  return true
}

/**
 * 报名账号申请弹窗的显示状态。
 *
 * 【初值】冷启动打开登录页 → true（自动弹）；从应用内回到登录页 → false。
 * 判断逻辑全在 shouldAutoOpenApply 里，见上面那段注释。
 * 入口还有登录表单最后那行「报名账号申请」，任何时候点它都能打开。
 */
// 【2026-10-08 停用自动弹出】原为 ref(shouldAutoOpenApply())，现写死 false；恢复时改回原写法。
const showApply = ref(false)

/**
 * 把一段纯文字切成一段段「文字 + 这段要不要标红」，给模板里的 v-for 用。
 *
 * 这是个纯函数（给什么切什么，不读组件状态），所以弹窗正文和下面登录表单里
 * 那段文字可以共用同一套切法 —— 两处的高亮规则永远一致，不会一处红一处不红。
 *
 * 【为什么要切而不直接 v-html】文字走的是 {{ }} 文本插值，HTML 标签不生效，
 * 塞 <span style="color:red"> 只会被原样显示出来；而改成 v-html 又会把这段文字
 * 变成 HTML 解析口子（将来文案里出现 < 就被吃掉，也是一个 XSS 面）。
 * 切成若干段普通文本、各自套一个 <span>，是纯结构做法，没有这些副作用。
 *
 * 【举例】text = 'A邮箱B'，key = '邮箱'
 *   → split 得到 ['A', 'B']，下面循环拼成
 *     [{ text:'A', email:false }, { text:'邮箱', email:true }, { text:'B', email:false }]
 *
 * 【三种降级情况都不会报错，只是不标红】
 *   1) key 没配（空串 / undefined）  —— 直接整段当普通文字；
 *   2) key 在 text 里找不到          —— split 结果长度为 1，走上面的分支；
 *      （「改了文案忘了改 highlight」就是这种，照常显示，不会白屏）
 *   3) text 为空                     —— 渲染出一个空 <p>，不崩。
 *   注意：key 在一段里出现多次时，**每一处都会被标红**，这是 split 的自然行为。
 */
function splitByHighlight(text, key) {
  const src = text || ''

  // 情况 1：没配 highlight。!key 同时挡住了空串（空串传给 split 会把整段炸成单字）。
  if (!key) return [{ text: src, email: false }]

  const parts = src.split(key)
  // 情况 2：文字里根本没有这个子串，split 原样返回一整段。
  if (parts.length === 1) return [{ text: src, email: false }]

  // 正常情况：把分隔符本身作为「要标红」的那一段插回去。
  const segments = []
  parts.forEach((part, i) => {
    if (i > 0) segments.push({ text: key, email: true })
    // 空字符串段直接跳过：省掉无意义的空 <span>（例如 highlight 正好在开头/结尾）
    if (part) segments.push({ text: part, email: false })
  })
  return segments
}

/**
 * 弹窗正文的分段结果。数据源：applyNotice.js 的 content + highlight。
 */
const applySegments = computed(() =>
  splitByHighlight(APPLY_NOTICE.content, APPLY_NOTICE.highlight)
)

/**
 * 登录表单里那段说明文字的分段结果。数据源：applyNotice.js 的 formContent + highlight。
 *
 * 【和上面共用同一个 highlight】所以「邮箱在表单里是红的、在弹窗里不是」这种
 * 不一致不可能发生 —— 两处要么都红，要么都不红。
 */
const formSegments = computed(() =>
  splitByHighlight(APPLY_NOTICE.formContent, APPLY_NOTICE.highlight)
)

/**
 * 下载账号申请表。
 *
 * 【本次改动：从 downloadRemoteFile 换成 downloadStaticFile】
 * 申请表是一份固定文件，随前端一起部署，没必要为它单独开一个后端接口
 * （原先约定的 GET /api/apply/form 未上线）。文件实体在
 * public/static/账号申请表（附件4）.docx，地址拼装见 applyNotice.js 的 url。
 *
 * 注意旧注释里那条「为什么不用 downloadStaticFile」的理由已经作废 ——
 * 它当年拒绝静态文件，是因为「文件不存在，点了会 404 把 JSON 甩到新标签页」；
 * 现在文件真的放进了 public/static/，这个前提不存在了。
 *
 * 【函数契约】downloadStaticFile 无返回值、不抛异常（utils/excel.js:194），
 * 只负责点一个同源的 <a href download>，所以这里不需要 try/catch，也不需要 .catch()。
 * 与 PersonTable.vue:63 / PersonTableMajor.vue:32 是同一套写法。
 */
function downloadApply() {
  downloadStaticFile(APPLY_NOTICE.url, APPLY_NOTICE.fileName)
}

/**
 * 【登录页只判必填，刻意不判长度 —— 别"顺手补上"】
 *
 * 原先这里是 username 3-15 / password 5-15，而账号是历史上按「添加账号」的
 * 2-20 / 6-32 建出来的。两套数一撞，就出现「管理员建得出、用户登不进」：
 * 输入完全正确的 20 位密码，被这里的 max:15 拦下，doLogin() 连请求都发不出，
 * 用户只会一遍遍重输，管理员那边看列表一切正常。
 *
 * 登录页是"读"（校验存量凭证），写规则在 src/config/accountRules.js。
 * 读的口子判长度不提供任何安全性（攻击者不走 UI），只提供锁定风险，
 * 所以这里只留 required，长度判断交给后端（用户名不存在 / 账号或密码错误）。
 */
const loginFormRules = {
  username: [{ required: true, message: "请输入用户名", trigger: "blur" }],
  password: [{ required: true, message: "请输入密码", trigger: "blur" }]
}

/**
 * 初始/默认口令 —— 值来自 src/config/defaultPassword.js，不要在这里写死字面量。
 * 它必须与「重置密码」实际写进库里的那个口令一致（后端 apps/api/views.py 的
 * RESET_PASSWORD_DEFAULT），否则下面那条提醒永远不弹，且不会报任何错。
 */
const INITIAL_PASSWORD = DEFAULT_PASSWORD

/**
 * user.type -> 登录成功后跳哪个首页
 *
 * 【注意这是一张独立的表】views/middle/index.vue 里还有一张同名同内容的
 * ROLE_HOME（两处没抽公共，历史上就是各写各的）。新增端时**两处都要加**，
 * 只加一处的表现不一样：
 *   · 只加这里 —— 登录那一刻跳得对，但一旦走到 /middle（例如角色不符被守卫转发过来），
 *     会被判 !target 清掉登录态；
 *   · 只加 /middle —— 登录后直接弹「该账号类型无可用后台」。
 * 两者都会让人以为是登录接口的问题。
 */
const ROLE_HOME = {
  3: "/admin",
  2: "/committee",
  1: "/city",
  0: "/school",
  5: "/primary"
}

/**
 * 登录页清缓存。
 *
 * 【原来是 `localStorage.clear()` —— 一刀切，把草稿指针也清了】
 *
 * 登录页会被**整页跳转**过来：request.js 的 401/403 分支走 gotoLogin()，
 * 用的是 `window.location.href`。也就是说「登录态过期」这一个很常见的场景，
 * 会让用户正在填的报名表发生：
 *
 *   跳到 /login → localStorage 被清空 → draft_session:* 指针没了
 *   → 重新登录后回到报名页，手里没有任何线索 → 从零开始填
 *
 * 而用户点过「暂存」的内容其实**存在服务器上**。他丢的不是数据，是门牌号。
 * 更糟的是原本还有一层兜底 —— OrchestraForm.detectExistingDraft() 会去列草稿 ——
 * 但那个函数因为信封解析错误恒返回空数组（已单独修掉）。两处叠加，
 * 「重新登录后草稿找不回」就成了必然。
 *
 * 【现在的做法】只清**登录态**与**表单内容缓存**，保留 `draft_session:` 指针。
 *
 * 为什么分开对待：
 *   · token / user  —— 登录页的职责，必须清，否则带着旧登录态进不去；
 *   · 表单内容缓存（键名是路由 path）—— 可能残留上一位使用者的填报内容，
 *     共用电脑时有隐私问题，**继续清**；
 *   · draft_session:* —— 只有一个门牌号，不含任何填报内容；留着它，
 *     重新登录后 resumeDraftSession 就能把服务端那份草稿认回来。
 *
 * 注意：这样处理只保住了「服务端已存下的」内容 —— 也就是用户**亲手点过「暂存」**的那些。
 *
 * 【自动暂存删除后，这条取舍变重了】以前还有 45 秒的服务端定时器兜底，用户没点暂存也
 * 可能已经上去了；现在没点过暂存的改动**只**活在本地缓存里，缓存一清就真没了。
 * 本地那支 60 秒的镜像定时器后来也一并删除（不点就不写），所以本地缓存只在
 * **关页/切走**那一刻落一次 —— 换句话说，用户敲完最后一个字就拔电源，
 * 这份内容两边都没有。这不是本文件的决定，本文件只是把代价说清楚。
 * 「缓存要不要清」这个决定本身没变（共用电脑的隐私考虑），但代价比从前大。
 */
onMounted(() => {
  try {
    const ls = window.localStorage
    // 先收集再删除：边遍历边删会让索引错位
    const keys = []
    for (let i = 0; i < ls.length; i += 1) {
      const k = ls.key(i)
      if (k && !k.startsWith('draft_session:')) keys.push(k)
    }
    keys.forEach((k) => ls.removeItem(k))
  } catch (_) {}
})

function resetLoginForm() {
  loginFormRef.value?.resetFields()
}

function gotoByRole(type) {
  const target = ROLE_HOME[type]
  // 登录成功但该角色没有对应后台（例如已下线的省级 type=4）。
  // 此时 token 已在上方写入，必须先清掉，否则用户停在登录页却带着一个进不去的登录态。
  if (!target) {
    userStore.logout()
    ElMessage.error("该账号类型无可用后台，请联系管理员")
    return
  }
  router.push(target)
}

async function doLogin() {
  loading.value = true
  try {
    const res = await apiLogin({
      username: loginForm.username,
      password: loginForm.password
    })
    const body = res.data || res
    if (body.code === 1) {
      ElMessage.error(body.msg || "登录失败")
      return
    }
    setToken(body.data.token)
    setUser(body.data.user)
    userStore.setToken(body.data.token)
    userStore.setUser(body.data.user)
    gotoByRole(body.data.user.type)
  } catch (e) {
    console.error("[Login Error]", e)
  } finally {
    loading.value = false
  }
}

async function submit() {
  if (!loginFormRef.value) return
  await loginFormRef.value.validate(async (valid) => {
    if (!valid) return
    if (loginForm.username === INITIAL_PASSWORD) {
      try {
        await ElMessageBox.confirm(
          "系统监测到，密码为初始密码，请登录系统后在<br><i>右上角的[修改信息]</i>中修改密码。",
          "系统提示",
          {
            confirmButtonText: "确定",
            cancelButtonText: "取消",
            dangerouslyUseHTMLString: true,
            type: "warning"
          }
        )
        await doLogin()
      } catch (_) {
        ElMessage.info("取消登录")
      }
    } else {
      await doLogin()
    }
  })
}
</script>

<style lang="scss" scoped>
.login_container {
  background: url("@/assets/login-bg2.png") center center / cover no-repeat;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.login_box {
  position: relative;
  z-index: 1;
  width: 600px;
  background-color: rgba(255, 255, 255, 0.96);
  border-radius: 12px;
  padding: 48px 52px;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.3);
  transform: translateX(150px);
}

.title {
  text-align: center;
  font-size: 36px;
  font-weight: bold;
  color: #1a1a1a;
  margin-bottom: 32px;
}

.login_form {
  .btns {
    text-align: center;
    .mybtn {
      width: 100%;
      height: 40px;
      background-color: #004088;
      border-color: #004088;
      font-size: 17px;
      font-weight: bold;
    }
  }
  p {
    font-size: 14px;
    color: #333333;
    line-height: 1.6;
    margin-top: 18px;
    white-space: pre-line; /* 让 formContent 里的 \n 真的换行 */
  }
  :deep(.el-input__wrapper) {
    box-shadow: 0 0 0 1px #dde0e8 !important;
    padding: 0 !important;
    border-radius: 6px;
  }
  :deep(.el-input__inner) {
    height: 40px;
    border: none !important;
    border-radius: 6px;
    padding-left: 16px;
    padding-right: 16px;
    font-size: 15px;
    box-shadow: none !important;
  }
  :deep(.el-input__suffix) {
    padding-right: 12px;
  }
  :deep(.el-input__wrapper.is-focus) {
    box-shadow: 0 0 0 1px #004088 !important;
  }
  :deep(.el-input__wrapper.is-focus:hover) {
    box-shadow: 0 0 0 1px #004088 !important;
  }
  :deep(.el-input__wrapper:hover) {
    box-shadow: 0 0 0 1px #c0c4cc !important;
  }
  :deep(.el-form-item) {
    margin-bottom: 24px;
  }
}

.footer {
  position: absolute;
  bottom: 20px;
  width: 100%;
  text-align: center;
  color: #000;
  font-size: 12px;
  z-index: 1;
}

/*
  报名账号申请的入口（登录表单的最后一行）。
  【为什么用 <div> 包一层】只是为了居中。若直接写成 <p>，会被上面那条
  `.login_form p { margin-top: 18px }` 命中，间距会莫名其妙地变大。
  【颜色为什么不用 EP 默认的 #409eff】与上面「登录」按钮的 #004088 统一。
  这里不用 !important：`.apply_entry[data-v-x] .el-button` 是 (0,3,0)，
  已经压过 EP 自己的 `.el-button.is-text` (0,2,0)。
*/
.apply_entry {
  margin-top: 4px;
  text-align: center;

  :deep(.el-button) {
    color: #004088;
    font-size: 14px;
  }

  :deep(.el-button:hover) {
    color: #1a5fa8;
  }
}

/*
  弹窗正文。
  【为什么必须单独写一条】现有的 .login_form p { ... } 命中不到它 ——
  这个 <p> 在 el-form 的外面，不是它的后代。
  【scoped 能不能命中】能。弹窗虽然被 teleport 到了 <body>，但这个 <p> 是
  我们模板里的元素，身上自带组件的 data-v 属性；`.apply_text[data-v-x]`
  与它所在的 DOM 位置无关，照样生效。（失效的只会是「锚在祖先身上」的选择器，
  比如 .login_container :deep(.el-dialog)。）
  【white-space: pre-line】以后往原文里加换行符时，能真的换行而不是被折叠成空格。
  【max-height + overflow-y】正文将来变长时弹窗内部滚动，不会把弹窗顶出屏幕。
*/
.apply_text {
  margin: 0;
  max-height: 50vh;
  overflow-y: auto;
  font-size: 14px;
  color: #333333;
  line-height: 1.8;
  white-space: pre-line;
}

/*
  强调片段（当前是日期）的样式：只加粗。
  用在两处 —— ① 弹窗正文的 <span>；② 登录表单那段 <p> 的 <span>，共用这条 CSS，改样式只改这里。
  不用行内 style / !important：行内权重高不好改；这条编译为 `.apply_email[data-v-x]`（权重 0,2,0），
  压得住从父级 <p> 继承来的样式。
*/
.apply_email {
  font-weight: bold;
}

/*
  弹窗底部的「下载《账号申请表（附件4）》」按钮，居中。
  【为什么要写这条】EP 的 .el-dialog__footer 自带 text-align: right，
  不加这条按钮就贴着右下角。
  【权重够不够】够。这条编译出来是 `.apply_footer[data-v-x]`，
  而 footer 上的 text-align 只是被继承下去的（继承的东西权重最低），
  所以不需要 !important。
  【为什么只影响按钮不影响标题】这个 div 只包了页脚里的按钮；
  标题在 .el-dialog__header 里，完全在另一棵子树上。
*/
.apply_footer {
  text-align: center;
}
</style>
