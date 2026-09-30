<template>
  <div v-if="user">
    <el-dialog
      v-model="showInfo"
      title="修改信息"
      width="min(620px, calc(100vw - 32px))"
    >
      <!--
        【本次改版】整块视图重做，目标是「工整」。

        改版前的问题（对照旧模板）：
          1. el-form 上挂了 inline —— 在 40% 宽的弹窗里，字段会按容器宽度折行，
             各行长短不一、右边缘参差。**这是"不工整"的主因**，本次去掉 inline，
             改为 label-position="right" 的单栏表单，每个字段独占一行、输入框等宽。
          2. 提示语是三段 <p style="margin:10px">，夹在 el-form 中间，
             它们的左边缘是弹窗内边距，而输入框的左边缘是标签宽（130px）之后，
             两者错开一大截，看着像没对齐。
          3. 没有分区。账号、密码、其他信息平铺在一起，字段一多就分不清层次。

        改版后：
          · 顶部一条 el-alert 统一承载"改完要重新登录"这句总提示；
          · 正文分「基本信息 / 安全设置」两区，区标题带左侧竖条，区与区之间一条分隔线；
          · 每个字段的补充说明都放在该字段自己下面（密码强度条、重置密码行），
            贴着它说明的对象，不再堆在表单末尾。

        【width 为什么写成 min()】固定 620px 在窄屏会溢出。EP 把 width 原样写进
        --el-dialog-width，min()/calc() 是合法 CSS，字符串直接透传。
        这个写法抄的是 views/login/index.vue 里「报名账号申请」弹窗（同一套理由）。
      -->
      <div class="modify-info" :style="{ '--ml-label-width': LABEL_WIDTH }">
        <el-alert
          class="modify-info__tip"
          type="info"
          :closable="false"
          show-icon
          title="修改信息或密码后，本账号须重新登录。"
        />

        <el-form
          ref="ruleForm"
          class="modify-info__form"
          :model="form"
          :rules="rules"
          :label-width="LABEL_WIDTH"
          label-position="right"
          size="default"
        >
          <!-- ==================== 基本信息 ==================== -->
          <div class="form-section">
            <h4 class="form-section__title">基本信息</h4>

            <!-- 账号是登录凭证，不开放修改（后端 user_update 虽认 username，但不放开的理由见文件头） -->
            <el-form-item label="账号" prop="username">
              <el-input v-model="form.username" disabled />
            </el-form-item>

            <el-form-item label="名称" prop="nickname">
              <el-input v-model="form.nickname" maxlength="20" placeholder="请输入名称" />
            </el-form-item>

            <el-form-item label="修改人姓名" prop="leader">
              <el-input v-model="form.leader" maxlength="20" placeholder="请输入修改人姓名" />
            </el-form-item>

            <el-form-item label="修改人联系方式" prop="tel">
              <el-input v-model="form.tel" placeholder="请输入联系电话" />
            </el-form-item>

            <el-form-item label="其他信息" prop="description">
              <el-input
                v-model="form.description"
                type="textarea"
                :rows="3"
                maxlength="200"
                show-word-limit
                placeholder="可填写关于本账号的介绍"
              />
            </el-form-item>
          </div>

          <!-- ==================== 安全设置 ==================== -->
          <div class="form-section">
            <h4 class="form-section__title">安全设置</h4>

            <!--
              【本次新增】「修改密码」——即让使用者自己指定一个新口令。
              它解决的是旧版的一个死角：旧版本弹窗只有「重置密码」一个按钮，
              只能把密码恢复成 DEFAULT_PASSWORD，于是没被管理员单独设过密码的账号
              （admin 端「添加账号」时留空密码的）会**永远停在默认口令上**，
              而登录页那句「请登录系统后在右上角的[修改信息]中修改密码」
              照着做只会把它重置回同一个默认口令——那句话当时是失效的。
              加回自选密码后，那句话重新成立。

              【接口】走的仍是 PUT /api/user（后端 user_update，apps/api/views.py:325），
              它天然支持：`if data.get("password"): user.set_password(data["password"])`
              —— 发什么就设成什么，所以**这一处改密码今天就能生效，不需要后端配合**。
              （与 admin/committee 两处的「重置密码」不同：那两处走 user_update_admin，
                后端把值忽略掉、一律写成 RESET_PASSWORD_DEFAULT。）

              【原密码校验的现状——重要，别误读】下面「当前密码」这一项是**按市场标准
              加的二次确认**，但后端 user_update 目前**不校验** old_password，
              它只认 password。也就是说：后端改造上线前，这一项填错也照样能改成新密码，
              它是个"摆设"；改造上线后才真正拦得住。
              这是与使用者确认后**有意保留的中间状态**，交接需求见
              docs/后端协助问题清单-自助修改密码校验原密码.md。
              措辞上刻意没有在界面上写"待后端支持"之类的话——那对终端用户没有意义。
            -->
            <el-form-item label="当前密码" prop="oldPassword">
              <el-input
                v-model="form.oldPassword"
                type="password"
                show-password
                autocomplete="current-password"
                placeholder="不修改密码可留空"
              />
            </el-form-item>

            <el-form-item label="新密码" prop="newPassword">
              <el-input
                v-model="form.newPassword"
                type="password"
                show-password
                autocomplete="new-password"
                :placeholder="MSG_PASSWORD_LENGTH"
              />
              <!-- 强度条：挂在 el-form-item__content 里，靠 flex:0 0 100% 折到输入框下一行 -->
              <div
                v-if="pwdLevelMeta"
                class="pwd-meter"
                :class="`pwd-meter--${pwdLevelMeta.key}`"
              >
                <span class="pwd-meter__label">密码强度</span>
                <span class="pwd-meter__bars">
                  <i
                    v-for="i in 3"
                    :key="i"
                    class="pwd-meter__bar"
                    :class="{ 'is-on': i <= pwdLevel }"
                  />
                </span>
                <span class="pwd-meter__text">{{ pwdLevelMeta.text }}</span>
              </div>
            </el-form-item>

            <el-form-item label="确认新密码" prop="confirmPassword">
              <el-input
                v-model="form.confirmPassword"
                type="password"
                show-password
                autocomplete="new-password"
                placeholder="请再次输入新密码"
                @keyup.enter="submit"
              />
            </el-form-item>

            <!--
              「重置密码」保留，但降级成次要操作：按钮不做成主色，
              且与上面的输入区用一条虚线隔开——它和「修改密码」是两件事，
              不能让人误以为它是"清空上面填的密码"。
              文案用「重置为默认密码」而不是旧版的「重置密码」：
              上方紧挨着多了"修改密码"三个字段之后，"重置密码"单看会歧义
              （重置表单？还是重置口令？），带上"默认"二字才没有第二种读法。
              （admin/user.vue 与 committee/user.vue 那两处仍是「重置密码」，
                那两页是表格操作列，上下文里没有歧义，故未一并改。）
            -->
            <div class="pwd-reset">
              <el-button @click="resetPassword">重置为默认密码</el-button>
              <span class="pwd-reset__hint">
                将本账号密码恢复为默认密码 <b>{{ DEFAULT_PASSWORD }}</b>，重置后须重新登录。
              </span>
            </div>
          </div>
        </el-form>
      </div>

      <template #footer>
        <el-button @click="showInfo = false">取 消</el-button>
        <el-button type="primary" :loading="submitting" @click="submit">确 定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
/**
 * 修改信息弹窗（自助改资料 + 自助改密码）
 *
 * 【可信度：A】逐项照搬 dist/chunk-40286ec0 中的 ModifyUserInfo 组件（name: "ModifyUserInfo"）。
 *
 * ==========================================================================
 * 【本文件的一句话现状】
 *   一个弹窗干两件事：改资料（基本信息）和改密码（安全设置）。
 *   两件事共用同一个「确定」按钮、同一次 PUT /api/user、同一次强制重新登录。
 *
 * ==========================================================================
 * 【本次变更 · 密码：从"只有重置"补齐为"能改也能重置"】
 *
 * 【上一版为什么把它删成只有一个按钮】当时的判断是"管理员端/组委会端的重置密码
 *   已统一为恢复默认口令，本弹窗若仍允许自选密码就等于留了一条绕过口径的后门"。
 *   这个判断只对了一半：口径统一指的是**管理员替他人重置**时的语义，
 *   而用户给自己设密码本来就不该受"只能恢复默认口令"的约束。
 *   结果是把自助改密能力整个删掉，密码只剩两个来源——建号时管理员填的初始密码，
 *   以及各处写死的默认口令 scylb@2026。
 *
 * 【本次把它加回来】新增「当前密码 / 新密码 / 确认新密码」三个字段，
 *   与「重置为默认密码」按钮并存。校验规则见 rules 与三个 validator。
 *
 * 【顺带修好的两处旧问题】
 *   ① 本文件顶部原有一句被删掉的文案「首次登录后请及时修改密码」，
 *      当时删它是因为"本弹窗已不能设置自选密码，这句没有对应操作"。
 *      现在能改了，但本次**没有**把它加回来 —— 理由是登录页已经有一条
 *      更强的同类提醒（views/login/index.vue 检测到密码等于默认口令时弹框），
 *      在弹窗里再写一遍是重复。若日后需要，加回来也无妨。
 *   ② 登录页那句「密码为初始密码，请登录系统后在右上角的[修改信息]中修改密码」
 *      自此重新成立（上一版照着做只会把它重置回同一个默认口令）。
 *
 * ==========================================================================
 * 【接口】PUT /api/user —— 后端 user_update（apps/api/views.py:325）
 *
 *   认的字段：username / nickname / description / tel / leader（挨个 setattr），
 *             外加单独传的 id；password 走 `if data.get("password"): set_password(...)`。
 *   **发什么就设成什么**，与 admin/committee 两处的重置（后端把值忽略、一律写默认口令）不同。
 *   所以自助改密**不需要后端配合就能生效**。
 *
 *   ⚠️ 唯一的缺口：后端**不校验 old_password**。本次仍按标准做法在界面上收了原密码
 *   并随请求发过去，但后端上线前它不产生任何拦截作用（payload 里多一个未知键，
 *   user_update 白名单式读取，直接忽略）。交接文档：
 *   docs/后端协助问题清单-自助修改密码校验原密码.md
 *
 * ==========================================================================
 * 【保留自上一版的关键修复，别当成多余代码删掉】
 *
 * 【问题 1：表单数据永远陈旧】原实现的唯一数据源是 props.user，它一路追溯到
 *   localStorage 的 user —— 那个值只在登录时写过一次（login/index.vue:117,119）。
 *   曾有过"打开弹窗时调 GET /api/user 拉最新值"的实现，现已整段删除：
 *   GET /api/user（user_info）返回的就是 user_dict(user)，与登录响应**同源同字段**，
 *   值不可能不同；而保存成功后强制重新登录，用户看到的永远是刚读到的权威值。
 *   这条链路里没有需要"再拉一次"的位置。
 *
 * 【问题 2：tel / leader 被静默清空】原实现照搬 dist 的 $set(form,"tel","")，
 *   每次打开都把这两项置空，submit 又不校验，于是"只想改个昵称，一按确定，
 *   库里的 tel 和 leader 就被空串覆盖了"—— 真实的数据丢失 Bug。
 *   本组件早已改为拷贝而非原地改写，不存在这个约束，因此不再置空。
 *
 * 【问题 3：rules 是死代码】dist 的 submit 从不调 validate()，
 *   nickname/leader/tel 的必填与长度规则全部不生效。本仓库已恢复校验。
 *
 * 【问题 4：保存成功后 store 不更新 → 由「强制退出重新登录」取代】
 *   保存成功即登出，登出会 localStorage.clear()，写 store 立刻被抹掉且没有读取方。
 *   现在本组件**只读** props.user，不写 store、也不发 GET。
 *
 * 【本次新增：保存成功后强制退出重新登录】见 forceRelogin()。
 *   范围是「任何保存」：只改昵称也会登出 —— 与提示语字面「修改信息或密码后，
 *   本账号须重新登录」一致。
 *
 * ==========================================================================
 * 【明确不做的事】
 *   - footer 里的两个 size="mini" 已移除：Element Plus 不认 "mini"、每次渲染都会告警，
 *     而 EP 中并不存在 .el-button--mini 规则，删掉是零视觉变化。**未**改成 small ——
 *     .el-button--small 会把按钮从 32px 压到 24px。
 *   - label-width 保持 130px：这是使用者自行调整过的值，予以保留。
 * ==========================================================================
 */

import { ref, reactive, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { userApi } from '@/api'
import { DEFAULT_PASSWORD } from '@/config/defaultPassword'
import {
  PASSWORD_MIN,
  PASSWORD_MAX,
  MSG_PASSWORD_LENGTH
} from '@/config/accountRules'
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
 * 标签宽度 —— JS 与 CSS 的唯一来源
 *
 * 绑定到 el-form 的 label-width，同时作为 CSS 变量 --ml-label-width 下发，
 * 供「左边缘要和输入框对齐」的两处复用（密码强度条、重置密码行）。
 * 若在 CSS 里再写一遍 130px，改的时候漏一处就会错位，而且是那种"看着别扭
 * 但说不上哪里错"的错位，最难查。
 */
const LABEL_WIDTH = '130px'

/**
 * 表单里要读写的那几个字段（**不含密码**）
 *
 * 【来源】后端 PUT /api/user 认的字段：username / nickname / description / tel / leader，
 *   外加单独传的 id。接口返回的 type / parent_id 不在此列。
 *
 * 【密码为什么不在这里】它的提交是**条件性**的（三个框全空就不发），
 *   与这几个"永远整体提交"的字段不是一套逻辑，混在一个数组里会让 submit()
 *   和 fillForm() 都要长判断。所以单独走 form.oldPassword / newPassword /
 *   confirmPassword，既不参与 fillForm 回填，也不进这个白名单。
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
  // 密码三件套：只在本次要改密码时才有值，见 changingPassword
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

/**
 * 【业务要求·不是 bug】leader / tel 必填是刻意为之，前端有意比后端严：
 *   后端 tel / leader 均为 null=True, blank=True, default=""（apps/core/models.py:81-82），
 *   且 user_update 只看键在不在、不看值是否为空；
 *   而 admin 页「添加账号」弹窗没有这两个输入框（user_create_admin 的 `if k in data`
 *   于是不写这两列 → 新建账号的 tel / leader 恒为空串）。
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
  tel: [{ required: true, message: '电话号码必填', trigger: 'blur' }],
  oldPassword: [{ validator: validateOldPassword, trigger: 'blur' }],
  newPassword: [{ validator: validateNewPassword, trigger: 'blur' }],
  confirmPassword: [{ validator: validateConfirmPassword, trigger: 'blur' }]
}

/* ==========================================================================
 * 密码：联动校验
 *
 * 【三个框是一个整体，不能各自为政】规则是「要改就三个都填，不改就三个都留空」。
 *   若逐框单独判必填，会出现"只填了新密码却没填原密码"这种提交到后端
 *   语义不明的中间态；而全部设成 required 又会让"这次只想改昵称"的用户
 *   被三个红字挡住——所以判据是 changingPassword（三个里任意一个非空）。
 *
 * 【为什么用自定义 validator 而不是给每个框写 required】
 *   required 是静态的，无法表达"取决于另外两个框"。EP 的 validator
 *   `(rule, value, callback)` 是唯一能拿到整个 form 的写法。
 *   注意：自定义 validator **必须调用 callback**，否则该字段的校验永远不会结束，
 *   validate() 返回的 Promise 既不 resolve 也不 reject（表现是点确定没反应、也不报错）。
 * ========================================================================== */

/** 本次是否要改密码：三个框里只要有一个非空，就按"要改"处理 */
const changingPassword = computed(
  () => !!(form.oldPassword || form.newPassword || form.confirmPassword)
)

function validateOldPassword(rule, value, callback) {
  if (!changingPassword.value) return callback()
  if (!value) return callback(new Error('请输入当前密码'))
  return callback()
}

function validateNewPassword(rule, value, callback) {
  if (!changingPassword.value) return callback()
  if (!value) return callback(new Error('请输入新密码'))
  if (value.length < PASSWORD_MIN || value.length > PASSWORD_MAX) {
    return callback(new Error(MSG_PASSWORD_LENGTH))
  }
  if (value === form.oldPassword) {
    return callback(new Error('新密码不能与当前密码相同'))
  }
  /**
   * 【为什么不准设成初始密码】本次新增的这条限制，直接服务于"当前密码一直是
   *   scylb@2026"这个原始问题：如果允许把新密码设回默认口令，
   *   用户点两下就能回到起点，登录页那条「密码为初始密码」的提醒也就白弹了。
   *   要的就是这个值时，用下面的「重置为默认密码」——那条路语义明确、还会登出。
   *   （后端不校验这一条，纯前端约定。）
   */
  if (value === DEFAULT_PASSWORD) {
    return callback(new Error('新密码不能与初始密码相同'))
  }
  return callback()
}

function validateConfirmPassword(rule, value, callback) {
  if (!changingPassword.value) return callback()
  if (!value) return callback(new Error('请再次输入新密码'))
  if (value !== form.newPassword) {
    return callback(new Error('两次输入的密码不一致'))
  }
  return callback()
}

/**
 * 密码强度（0 = 未填，1 弱 / 2 中 / 3 强）
 *
 * 【为什么是四档加分再归类，而不是直接按长度定档】
 *   "长度够 + 只由数字组成"的口令（例如 12 位纯数字）实际上很弱，
 *   单纯按长度判会给出"强"的误导。这里把长度和字符种类分开计分，
 *   再折叠成三档，判据写在界面上是可信的。
 *   只是**提示**，不参与 rules —— 强度弱的密码仍然允许提交，
 *   否则会出现"系统逼我设复杂密码、我又记不住"的反效果。
 */
function scorePassword(value) {
  const v = value || ''
  if (!v) return 0
  let score = 0
  if (v.length >= PASSWORD_MIN) score++
  if (v.length >= 10) score++
  if (/[A-Za-z]/.test(v) && /\d/.test(v)) score++
  if (/[^A-Za-z0-9]/.test(v)) score++
  if (score <= 1) return 1
  if (score <= 3) return 2
  return 3
}

const PWD_LEVELS = [
  { key: 'weak', text: '弱' },
  { key: 'medium', text: '中' },
  { key: 'strong', text: '强' }
]

const pwdLevel = computed(() => scorePassword(form.newPassword))
// 没填新密码时为 null，强度条整行不渲染（v-if）
const pwdLevelMeta = computed(() => PWD_LEVELS[pwdLevel.value - 1] || null)

/**
 * 把一份 user 数据按白名单回填进 form
 *
 * 【为什么只遍历 USER_FIELDS】这样 form 的字段集合恒定，不会被外部数据"撑大"，
 * 天然挡住 type / parent_id / password 这类不该进表单的字段。
 * （后端 user_dict 本来就永不回传 password，这里是第二道防线。）
 *
 * 【为什么跳过 undefined / null】id 被置空会让后端 str(id) !== str(auth.id)，
 * 直接返回 code 1「无该用户修改权限！」。后端 user_dict 已把 None 归一成 ""，
 * 这里再挡一次是防止接口将来改成直接回传 null。
 *
 * 【密码字段为什么不在这里回填】接口不返回密码，且每次打开都必须清空 ——
 * 见 clearPasswordFields()。
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
 * 清空密码三件套
 *
 * 【为什么必须每次打开都清】上一次打开时输入到一半的密码会残留在 form 里，
 *   下次打开直接点确定就会把它提交上去（改成一个用户当时并不想改的密码）。
 *   输入框本身是空的（v-model 绑的是 form），所以不清的话是"看不见的脏数据"，
 *   属于最难发现的一类。
 */
function clearPasswordFields() {
  form.oldPassword = ''
  form.newPassword = ''
  form.confirmPassword = ''
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
 *   - 弹窗打开期间：props 变化一律不碰表单，表单的唯一数据源是"本次打开时的那一份"。
 *
 * 【这条守卫现在还必要吗】那条自写路径已删除（组件不再写 store），
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
 * 联动重新校验 —— 只在"另一个框已经有值"时才触发
 *
 * 【为什么需要】「确认新密码」的对错取决于「新密码」，「新密码不能与当前密码相同」
 * 取决于「当前密码」。改了 A 之后 B 的红字如果不跟着重算，界面上就会挂着一条
 * 已经过期的错误提示（或者反之：错误已成立却不提示，用户点确定才被拦下）。
 *
 * 【为什么 validateField 要传一个空回调】EP 的 validateField 在**不传回调**时
 * 返回的 Promise 会在校验失败时 reject —— 而"校验失败"在这里是正常情况，
 * 不 catch 就是一条 unhandled rejection。传了回调即走回调式，不产生 rejected Promise。
 * （与 submit() 里 validate() 的处理是同一类坑，见那边的注释。）
 *
 * 【为什么加 guard】框还是空的时候不必触发，省掉一连串无意义的校验。
 */
watch(
  () => form.newPassword,
  () => {
    if (ruleForm.value && form.confirmPassword) {
      ruleForm.value.validateField('confirmPassword', () => {})
    }
  }
)

watch(
  () => form.oldPassword,
  () => {
    if (ruleForm.value && form.newPassword) {
      ruleForm.value.validateField('newPassword', () => {})
    }
  }
)

/**
 * 三个框被清空时，把这一组的红字一起抹掉
 *
 * 【为什么单独处理】上面的两个 watch 只在"另一个框非空"时才重算，
 * 所以"把三个框全部删空"这条路径没人管，会留下红字。
 * 用户在输入框里只能一个个删，删到最后一个才触发这里。
 */
watch(changingPassword, (now, before) => {
  if (before && !now && ruleForm.value) {
    ruleForm.value.clearValidate(['oldPassword', 'newPassword', 'confirmPassword'])
  }
})

/** 对外方法，与 dist 的 this.$refs.modify.show() 等价 */
function show() {
  // 回填：表单的**唯一**数据源就是 props.user（登录响应），不再发任何请求
  fillForm(props.user)
  // 密码必须每次重开都清空，理由见 clearPasswordFields()
  clearPasswordFields()
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
 * 本组件是「校验 → 提交 → 强制重新登录」三段线性流程，且 rules 里每条都自带 message、
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

  // 只挑后端白名单里的字段
  const payload = { id: form.id }
  for (const key of USER_FIELDS) payload[key] = form[key]

  /**
   * 改密码是**条件性**的：三个框全空就整个不发，后端 `if data.get("password")`
   * 不成立 ⇒ 不动密码。这正是"只改昵称不影响密码"要的语义。
   *
   * ⚠️ old_password 后端目前不认（见文件头）。发过去是"后端改造后立即生效"的预留，
   * 不影响当前行为 —— user_update 是按 key 逐个取的，多一个未知键会被忽略。
   */
  if (changingPassword.value) {
    payload.old_password = form.oldPassword
    payload.password = form.newPassword
  }

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
     * showApiError 正是为此存在的（见 request.js:220-235 的注释）：对 401/403/404/500/网络异常
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
 * 【为什么要做】弹窗里那句「修改信息或密码后，本账号须重新登录」原先只是文案：
 * 后端 user_update 只调 set_password，不会使既有 PersonalAccessToken 失效，用户不会被踢出。
 * 现按业务要求把行为补齐 —— 范围是「任何保存」，只改昵称也会登出（与文案字面一致）。
 * 「重置密码」同样要走它：重置完不登出的话，用户会拿着一个已经公开写在页面上的
 * 默认口令继续用旧 token 操作，且下次登录才会看到「密码为初始密码」那条提醒。
 * 【改密码更要走它】改了密码之后，旧 token 仍然是有效的 —— 若不登出，
 * 相当于"密码换了但会话还开着"，安全上等于没换。
 *
 * 【为什么走 apiLogout 而不是只清本地】只清 localStorage 的话，后端那条 token 依然有效
 * （即便这次改过密码）。apiLogout()（POST /api/logout）会让后端删掉该 token，
 * 与顶栏「退出登录」（Header.vue:69）走的是同一条链路。
 *
 * 【为什么单独 try/catch】调用方的 catch 会调 showApiError(err, '修改失败')，
 * 而此时保存**已经成功**，绝不能再报「修改失败」。
 * 且 logout 失败也必须继续退出：「须重新登录」这个承诺不能因为一个清理接口失败而失效。
 *
 * 【原实现已删除】保存成功后 userStore.setUser(...) 合并更新。
 * 它在本仓库存在的理由是「问题 4：保存成功后 store 不更新」；现在保存成功即登出，
 * 而下面 clearAllMsg() 会 localStorage.clear()，那段合并写进去立刻被抹掉，已无读取方。
 *
 * 【为什么必须 await】（调用方原先是内联写的，没这个问题）resetPassword()
 * 与 submit() 都是 async 函数，若这里不 await，它们的 finally 会在登出流程跑完前
 * 就把 submitting 放回 false。
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
 * 「重置为默认密码」—— 确认框，把本账号密码恢复为默认口令
 *
 * 【与管理员/组委会那两处的区别 —— 这一处不需要后端配合】
 *   /admin/user、/committee/user 的重置走 user_update_admin，后端把逻辑改成了
 *   `if "password" in data: set_password(RESET_PASSWORD_DEFAULT)`（值被忽略），
 *   所以那两处必须等后端上线。
 *   而这里是 PUT /api/user（user_update），后端仍是 `if data.get("password"): set_password(data["password"])`
 *   —— 发什么就设成什么。我们发 DEFAULT_PASSWORD，效果就是"重置为默认密码"。
 *
 * 【为什么保留它】用户的原始诉求是"要有修改密码，不然这个重置密码作用不大"——
 *   即两者互补，而不是二选一：
 *   · 改密码 = 用户自己记得住的口令（正常路径）；
 *   · 重置   = 用户忘了密码、或怀疑密码泄露时的兜底（走管理员那条路也行，
 *              但自助走这条路不用等人）。
 *   注意它是**降低**账号安全性的操作，所以界面上刻意做成次要按钮并加了说明文案。
 *
 * 【为什么重置后也要强制重新登录】见 forceRelogin() 的注释第一段。
 *   另外登录页有一条「密码为初始密码」的提醒，登出后用户会立刻看到它。
 *
 * 【为什么确认框和请求分成两段写（而不是 .then().catch()）】
 *   若把 PUT 写在 .then() 里，紧跟着的 .catch() 会**同时**接住"用户点了取消"和
 *   "PUT 请求失败"两种情况，后者会被误报成「已取消」。
 *   所以：confirm 单独 try/catch（只为吃掉取消），请求放在它后面单独处理。
 *
 * 【重置也必须清掉输入的密码】否则用户先填了新密码、又点了重置，
 *   表单里还挂着那串没用上的值；虽然请求只发 DEFAULT_PASSWORD，
 *   但下次打开前那串值一直留在内存里（show() 会清，这里清是为了当场就干净）。
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

    clearPasswordFields()
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

<style scoped>
/* ==========================================================================
 * 样式
 *
 * 【为什么全部写在 <style scoped> 里，且一行都不碰 .el-dialog / .el-dialog__body】
 *   两个理由：
 *   1) 结构类名全部交给 Element Plus 的默认值。本弹窗如果单独改标题/内边距，
 *      就会和 admin、committee 那些弹窗长得不一样 —— 那不叫美化，叫不一致。
 *   2) scoped 规则**够得着**的只有本组件模板里的元素。本弹窗没有 append-to-body，
 *      就地渲染，slot 内容天然带 data-v 属性，所以下面这些选择器都是生效的。
 *      （反面教材见 views/login/index.vue 的注释：那边弹窗 append-to-body 之后，
 *        scoped 的 `.login_container :deep(.el-dialog)` 会编译成祖先选择器，
 *        前半段匹配不上，规则不报错也不生效。所以真要改弹窗外形，
 *        得写不带 scoped 的全局块 —— 本次不需要。）
 * ========================================================================== */

/* ---------- 顶部总提示 ---------- */
.modify-info__tip {
  margin-bottom: 18px;
}

/* ---------- 分区 ----------
 * 两个分区之间用一条分隔线 + 上方留白来划分层次，而不是给每个分区加个卡片边框。
 * 卡片边框在弹窗这种本来就有背景色的容器里会显得很碎。
 */
.form-section + .form-section {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--border-lighter);
}

.form-section__title {
  position: relative;
  margin: 0 0 18px;
  padding-left: 10px;
  font-size: var(--font-size-base);
  font-weight: 600;
  line-height: 1;
  color: var(--text-primary);
}

/* 标题左侧的蓝色竖条。
 * 用 ::before 而不是 border-left：竖条高度可以独立于行高控制（14px），
 * 不随字号和 line-height 变化，也不会把标题盒子的高度撑开。 */
.form-section__title::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  width: 3px;
  height: 14px;
  margin-top: -7px;
  border-radius: 2px;
  background: var(--primary-color);
}

/* ---------- 密码强度条 ----------
 * 它在 el-form-item__content 内部（而不是 form-item 外面），是为了自动跟输入框对齐 ——
 * content 的左边缘就是输入框的左边缘，写在外面反而要手动补一个 label-width 的左边距。
 *
 * flex 0 0 100%：content 是 display:flex; flex-wrap:wrap，给个"不放大也不缩小、
 * 基准宽度占满一行"的项，它就折到输入框下面单独一行。
 *
 * 顺带解决了报错红字的位置问题：el-form-item__error 是 position:absolute; top:100%，
 * 基准是 content 自身；content 因为多了这一行而变高，红字自然落到强度条下方，
 * 不会压在它身上。
 */
.pwd-meter {
  display: flex;
  flex: 0 0 100%;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
  font-size: var(--font-size-extra-small);
  line-height: 1.4;
}

.pwd-meter__bars {
  display: inline-flex;
  gap: 4px;
}

.pwd-meter__bar {
  width: 28px;
  height: 4px;
  border-radius: 2px;
  background: var(--border-base);
  transition: background-color 0.2s;
}

/* 【颜色不是唯一判据】右边同时有「弱 / 中 / 强」文字，色觉障碍用户单看文字即可判断。
 * 只靠红黄绿三色表达强弱是典型的 color-only 反模式。 */
.pwd-meter--weak .pwd-meter__bar.is-on   { background: var(--danger-color); }
.pwd-meter--medium .pwd-meter__bar.is-on { background: var(--warning-color); }
.pwd-meter--strong .pwd-meter__bar.is-on { background: var(--success-color); }

.pwd-meter__label { color: var(--text-secondary); }

.pwd-meter__text { font-weight: 600; }
.pwd-meter--weak .pwd-meter__text   { color: var(--danger-color); }
.pwd-meter--medium .pwd-meter__text { color: var(--warning-color); }
.pwd-meter--strong .pwd-meter__text { color: var(--success-color); }

/* ---------- 重置密码行 ----------
 * margin-left 用 --ml-label-width 与输入框左边缘对齐（该变量的来源见 JS 的 LABEL_WIDTH）。
 *
 * 【为什么 padding-top 只有 8px、而不是用负 margin 去吃掉上面 form-item 的 18px 下边距】
 * 最后那个 form-item（确认新密码）的报错红字是绝对定位在 content 底部往下 2~14px 处的，
 * 正好落在那 18px 下边距里。如果用负 margin 把这一行往上提，虚线就会和红字叠在一起。
 * 留着那 18px 当红字的位置，虚线往下再推 8px，两者互不干扰。
 */
.pwd-reset {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 12px;
  margin: 0 0 0 var(--ml-label-width);
  padding-top: 8px;
  border-top: 1px dashed var(--border-base);
}

.pwd-reset__hint {
  flex: 1;
  min-width: 180px;
  font-size: var(--font-size-extra-small);
  line-height: 1.6;
  color: var(--text-secondary);
}
</style>
