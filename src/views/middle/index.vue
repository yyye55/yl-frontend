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
import { ElMessage } from 'element-plus'
import { getUser } from '@/utils/auth'
import { useUserStore } from '@/store/modules/user'

const router = useRouter()
const userStore = useUserStore()

/**
 * user.type -> 该角色的首页
 *
 * 【为什么 4 缺席】type=4 是省级，后端已下线，前端没有它的路由。
 * 查不到 target 时下面会走「清登录态 + 提示」分支，这是**预期**行为。
 *
 * 【为什么必须加 5】这张表和 views/login/index.vue 里那张是**两份**（没抽公共）。
 * 少加任何一个，该角色的用户登录后都会落到 !target 分支 —— 表现是
 * 「已经登录成功了，却被清掉登录态、报『该账号类型无可用后台』、回到登录页」，
 * 看起来像密码错，实际是这里漏了一行。
 */
const ROLE_HOME = {
  3: '/admin',
  2: '/committee',
  1: '/city',
  0: '/school',
  5: '/primary'
}

onMounted(() => {
  const user = getUser()
  if (!user) {
    // 未登录：静默跳回登录页，这是正常的守卫流程，不提示
    router.push('/login')
    return
  }
  const target = ROLE_HOME[user.type]
  // 已登录但该角色没有对应后台（例如已下线的省级 type=4）：
  // 清掉登录态并明确提示，不再静默弹回登录页让用户以为「登录没反应」
  if (!target) {
    userStore.logout()
    ElMessage.error('该账号类型无可用后台，请联系管理员')
    router.replace('/login')
    return
  }
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
  background: url("@/assets/login-bg2.png") center center / cover no-repeat;
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
