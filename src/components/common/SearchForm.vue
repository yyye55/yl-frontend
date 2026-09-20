<template>
  <div class="search-bar">
    <el-form :inline="true" :model="form" @submit.prevent="onSearch">
      <slot :form="form" />
      <el-form-item>
        <el-button type="primary" @click="onSearch"><el-icon><Search /></el-icon> 查询</el-button>
        <el-button @click="onReset"><el-icon><RefreshLeft /></el-icon> 重置</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup>
/**
 * 通用搜索栏
 *
 * 【可信度：C】基于 Element UI admin 通用布局推断
 * 使用方式：
 * <SearchForm v-model="query">
 *   <template #default="{ form }">
 *     <el-form-item label="姓名">
 *       <el-input v-model="form.name" />
 *     </el-form-item>
 *   </template>
 * </SearchForm>
 */

import { reactive } from 'vue'
import { ElMessage } from 'element-plus'

const props = defineProps({
  modelValue: { type: Object, default: () => ({}) }
})
const emit = defineEmits(['update:modelValue', 'search', 'reset'])

const form = reactive({ ...props.modelValue })

function onSearch() {
  emit('update:modelValue', { ...form })
  emit('search', { ...form })
}

function onReset() {
  Object.keys(form).forEach((k) => (form[k] = ''))
  emit('update:modelValue', { ...form })
  emit('reset')
}
</script>
