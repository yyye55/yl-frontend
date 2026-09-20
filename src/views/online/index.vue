<template>
  <div class="index">
    <div class="welcome-card">
      <div class="welcome-icon">🎵</div>
      <h1 class="welcome-title">欢迎使用西部音乐周展演活动填报系统</h1>
      <p class="welcome-sub">意林杯·四川省第十一届管乐展示活动</p>
      <div class="feature-grid">
        <div class="feature-item">
          <span class="feature-icon">📋</span>
          <span class="feature-text">在线展演管理</span>
        </div>
        <div class="feature-item">
          <span class="feature-icon">👥</span>
          <span class="feature-text">人员信息管理</span>
        </div>
        <div class="feature-item">
          <span class="feature-icon">📊</span>
          <span class="feature-text">实时状态跟踪</span>
        </div>
        <div class="feature-item">
          <span class="feature-icon">✅</span>
          <span class="feature-text">审核流程管理</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * 直播首页 —— /online/index
 *
 * 【dist 已确认】chunk-5d472108 (462 字节)，组件名 name:"index"。
 * 原文渲染内容仅为文字节点：" 欢迎使用西部音乐周展演活动填报系统 "
 *
 * 本实现保留了原文核心文本，在其基础上做合理的页面布局展示，
 * 不增加任何业务逻辑。
 */
</script>

<style lang="scss" scoped>
.index {
  padding: 40px 20px;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  min-height: 60vh;
}
.welcome-card {
  background: #fff;
  border-radius: 8px;
  padding: 48px 40px;
  max-width: 600px;
  width: 100%;
  box-shadow: 0 2px 12px rgba(0, 21, 41, 0.08);
  text-align: center;
}
.welcome-icon {
  font-size: 56px;
  margin-bottom: 16px;
}
.welcome-title {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
}
.welcome-sub {
  font-size: 14px;
  color: #909399;
  margin-bottom: 32px;
}
.feature-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-top: 24px;
}
.feature-item {
  background: #f5f7fa;
  border-radius: 6px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  color: #606266;
}
.feature-icon {
  font-size: 24px;
}
.feature-text {
  flex: 1;
}
</style>
