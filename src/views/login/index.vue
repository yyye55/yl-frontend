<!--
  /login —— 登录页

    【本仓库增强，dist 无】（逐项列明，便于回溯与取舍）
    - 错误文案兜底：`body.msg || '...'`（dist 直接用 `t.msg`，为 undefined 时提示为空）
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

    <div class="footer">Copyright ©2026 四川省教育厅版权所有</div>
  </div>
</template>

<script setup>
/**
 * 登录页
 *
 * 【可信度：A】基于 dist 中 chunk-a46a18bc 反推
 * 关键行为（与原版一致）：
 *   1. mounted: window.localStorage.clear()  // 登录前清掉所有本地缓存
 *   2. 用户名 === "xbyy@2024" → 弹窗提示初始密码警告
 *   3. 登录成功后根据 user.type 跳转到不同 layout：
 *      - 4 → /province
 *      - 3 → /admin
 *      - 2 → /committee
 *      - 1 → /city
 *      - 0 → /school
 *
 * 【Vue 3 重构】
 *   - Composition API + <script setup>
 *   - 表单校验使用 Element Plus 的 rules
 *   - 弹窗使用 ElMessageBox
 */

import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { login as apiLogin } from '@/api/auth'
import { setToken, setUser } from '@/utils/auth'
import { useUserStore } from '@/store/modules/user'

const router = useRouter()
const userStore = useUserStore()
const loginFormRef = ref(null)
const loading = ref(false)

const loginForm = reactive({
  username: '',
  password: ''
})

const loginFormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 15, message: '长度在 3 到 15 个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 5, max: 15, message: '长度在 5 到 15 个字符', trigger: 'blur' }
  ]
}

const INITIAL_PASSWORD = 'scylb@2026' // 【第十二届】初始密码

// 不同角色登录后跳转路径
const ROLE_HOME = {
  4: '/province',
  3: '/admin',
  2: '/committee',
  1: '/city',
  0: '/school'
}

onMounted(() => {
  // 与 dist 一致：登录页挂载时清空 localStorage
  try { window.localStorage.clear() } catch (_) {}
})

function resetLoginForm() {
  loginFormRef.value?.resetFields()
}

function gotoByRole(type) {
  const target = ROLE_HOME[type] || '/middle'
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
      ElMessage.error(body.msg || '登录失败')
      return
    }
    // 成功：data 中应有 { token, user }
    setToken(body.data.token)
    setUser(body.data.user)
    userStore.setToken(body.data.token)
    userStore.setUser(body.data.user)
    gotoByRole(body.data.user.type)
  } catch (e) {
    // 拦截器已处理
    console.error('[Login Error]', e)
  } finally {
    loading.value = false
  }
}

async function submit() {
  if (!loginFormRef.value) return
  await loginFormRef.value.validate(async (valid) => {
    if (!valid) return
    // 初始密码提示
    if (loginForm.username === INITIAL_PASSWORD) {
      try {
        await ElMessageBox.confirm(
          '系统监测到，密码为初始密码，请登录系统后在 <br><i>右上角的[修改信息]</i>中修改密码',
          '系统提示',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            dangerouslyUseHTMLString: true,
            type: 'warning'
          }
        )
        await doLogin()
      } catch (_) {
        ElMessage.info('取消登录')
      }
    } else {
      await doLogin()
    }
  })
}
</script>
