<template>
  <div class="login_container">
    <div class="login_box" style="text-align:center;">
      <p>跳转中...</p>
    </div>
  </div>
</template>

<script setup>
/**
 * 中转页（/middle）
 *
 * 【可信度：A】基于 dist 中 chunk-0ebc648c 还原
 * - 页面挂载后立即根据 user.type 重定向到对应 layout
 * - 如果没有 user，直接跳回登录
 */

import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getUser } from '@/utils/auth'

const router = useRouter()

const ROLE_HOME = {
  4: '/province',
  3: '/admin',
  2: '/committee',
  1: '/city',
  0: '/school'
}

onMounted(() => {
  const user = getUser()
  if (!user) {
    router.push('/login')
    return
  }
  const target = ROLE_HOME[user.type] || '/login'
  router.replace(target)
})
</script>

<style lang="scss" scoped>
/**
 * 本页原本没有自己的样式，靠全局 styles/login.scss 的 .login_container / .login_box 撑起。
 * login.scss 已删除（它同时定义登录页背景，与登录页 scoped 样式冲突并叠出双遮罩），
 * 这里收回这页需要的容器与卡片规则；遮罩层已按需求去掉，背景图与登录页统一。
 */
.login_container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: url("@/assets/login-bg1.png") center center / cover no-repeat;
  position: relative;
}
.login_box {
  position: relative;
  z-index: 1;
  width: 420px;
  padding: 36px 32px 24px;
  background: rgba(255, 255, 255, 0.96);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}
</style>
