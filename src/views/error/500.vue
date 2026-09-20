<template>
  <div class="error-page">
    <div class="error-content">
      <h1>500</h1>
      <p>服务器开小差啦，请稍后再试</p>
      <el-button type="primary" @click="$router.push('/')">返回首页</el-button>
    </div>
  </div>
</template>

<script setup>
// 500 页 - 与 dist 中的跳转逻辑保持一致
</script>

<style lang="scss" scoped>
.error-page {
  min-height: 100vh;
  display: flex; align-items: center; justify-content: center;
  background: #f0f2f5;
}
.error-content {
  text-align: center;
  h1 { font-size: 120px; color: #F56C6C; margin: 0; }
  p { font-size: 18px; color: #606266; margin: 16px 0 32px; }
}
</style>
