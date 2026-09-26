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

        <p>
          “意林杯”四川省第十二届管乐展示活动报名系统已正式启用，各单位填报时请一定核对好信息后再进行填写，保证活动顺利进行。
        </p>
      </el-form>
    </div>

    <div class="footer">Copyright @2026 四川省教育厅版权所有</div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from "vue"
import { useRouter } from "vue-router"
import { ElMessage, ElMessageBox } from "element-plus"
import { login as apiLogin } from "@/api/auth"
import { setToken, setUser } from "@/utils/auth"
import { useUserStore } from "@/store/modules/user"

const router = useRouter()
const userStore = useUserStore()
const loginFormRef = ref(null)
const loading = ref(false)

const loginForm = reactive({
  username: "",
  password: ""
})

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

const INITIAL_PASSWORD = "scylb@2026"

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
  width: 520px;
  background-color: rgba(255, 255, 255, 0.96);
  border-radius: 12px;
  padding: 48px 52px;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.3);
  transform: translateX(150px);
}

.title {
  text-align: center;
  font-size: 32px;
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
</style>
