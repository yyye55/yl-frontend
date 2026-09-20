<template>
  <div class="page-header">
    <div class="left">
      <h3>{{ title }}</h3>
      <p v-if="subTitle" class="sub">{{ subTitle }}</p>
    </div>
    <div class="right">
      <slot />
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  subTitle: { type: String, default: '' }
})
</script>

<style lang="scss" scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #fff;
  border-bottom: 1px solid #ebeef5;
  margin-bottom: 12px;
  border-radius: 4px;
  h3 { margin: 0; font-size: 16px; color: #303133; }
  .sub { margin: 4px 0 0; font-size: 12px; color: #909399; }
}
</style>
