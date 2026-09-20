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
