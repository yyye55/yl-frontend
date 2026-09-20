<!--
  /login 登录页
-->
<template>
  <div class="login_container">
    <div class="login_box">
      <p class="title">「意林杯」四川省第十二届管乐展示活动</p>

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
          「意林杯」四川省第十二届管乐展示活动报名系统已正式启用，各单位填报时请一定核对好信息后再进行填写，保证活动顺利进行。
        </p>
      </el-form>
    </div>

    <div class="footer">Copyright 2026 四川省教育厅版权所有</div>
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

const loginFormRules = {
  username: [
    { required: true, message: "请输入用户名", trigger: "blur" },
    { min: 3, max: 15, message: "长度在 3 到 15 个字符", trigger: "blur" }
  ],
  password: [
    { required: true, message: "请输入密码", trigger: "blur" },
    { min: 5, max: 15, message: "长度在 5 到 15 个字符", trigger: "blur" }
  ]
}

const INITIAL_PASSWORD = "scylb@2026"

const ROLE_HOME = {
  4: "/province",
  3: "/admin",
  2: "/committee",
  1: "/city",
  0: "/school"
}

onMounted(() => {
  try { window.localStorage.clear() } catch (_) {}
})

function resetLoginForm() {
  loginFormRef.value?.resetFields()
}

function gotoByRole(type) {
  const target = ROLE_HOME[type] || "/middle"
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
  background: url("/login-bg.png") center center / cover no-repeat;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
.login_container::after {
  content: "";
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.25);
}

.login_box {
  position: relative;
  z-index: 1;
  width: 400px;
  background-color: rgba(255, 255, 255, 0.96);
  border-radius: 15px;
  padding: 40px;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.3);
}

.title {
  text-align: center;
  font-size: 18px;
  font-weight: bold;
  color: #000;
  margin-bottom: 20px;
}

.login_form {
  .btns {
    text-align: center;
    .mybtn {
      width: 100%;
      background-color: #003366;
      border-color: #003366;
    }
  }
  p {
    font-size: 12px;
    color: #999;
    line-height: 20px;
    margin-top: 16px;
  }
  :deep(.el-input__inner) {
    height: 40px;
  }
  :deep(.el-form-item) {
    margin-bottom: 18px;
  }
}

.footer {
  position: absolute;
  bottom: 20px;
  width: 100%;
  text-align: center;
  color: #fff;
  font-size: 12px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  z-index: 1;
}
</style>