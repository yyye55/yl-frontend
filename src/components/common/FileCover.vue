<template>
  <div v-show="isshow" class="cover">
    <div class="progress">
      <el-progress type="circle" :percentage="pro" />
      <p>上传文件中，请稍后</p>
    </div>
  </div>
</template>

<script setup>
/**
 * FileCover 上传进度遮罩
 *
 * 【可信度：A】逐行照搬 dist chunk-0294a80a 的模块 3aba（653 字符）。
 * 原文组件选项：
 *   name:"FileCover",
 *   components:{ [ElProgress.name]: ElProgress },
 *   data(){ return { isshow:!1, pro:0 } },
 *   methods:{
 *     show(){ console.log("show"), this.isshow=!0 },
 *     dishow(){ this.isshow=!1 },
 *     setPro(e){ this.pro=parseFloat(e) }
 *   }
 * 模板：div.cover[v-show=isshow] > div.progress > (el-progress[type=circle][percentage=pro], p「上传文件中，请稍后」)
 * 作用域样式 id：59c71bb2
 *
 * ---------------------------------------------------------------------------
 * 【为什么必须补这个组件】
 * dist 把它作为**全局组件**注册（页面 `<FileCover ref="fileshow"/>` 直接使用，
 * 各页面模块里并不 import 它）。本项目此前完全没有移植它，导致所有带上传功能的
 * 页面（city|school 的 recommend/index、elementary|teacher 的 create/edit 等）
 * 一旦还原就会因 <FileCover> 未注册而渲染报错。
 * 调用方约定（dist 原文）：this.$refs.fileshow.show() / .dishow() / .setPro(pct)
 * ---------------------------------------------------------------------------
 *
 * 说明：
 *  - show() 里的 console.log("show") 是 dist 原文带的调试输出，原样保留以对齐行为。
 *  - 三个方法必须 defineExpose 出去：父组件是通过 ref 直接调用的，
 *    <script setup> 默认不暴露内部函数。
 */
import { ref } from 'vue'

const isshow = ref(false)
const pro = ref(0)

/** dist: show(){ console.log("show"), this.isshow=!0 } */
function show() {
  console.log('show')
  isshow.value = true
}

/** dist: dishow(){ this.isshow=!1 } */
function dishow() {
  isshow.value = false
}

/** dist: setPro(e){ this.pro=parseFloat(e) } */
function setPro(value) {
  pro.value = parseFloat(value)
}

defineExpose({ show, dishow, setPro })
</script>

<style lang="scss" scoped>
/* 照搬 dist/css/chunk-0294a80a.*.css 中 [data-v-59c71bb2] 作用域的规则 */
.cover {
  position: fixed;
  width: 100%;
  height: 100%;
  background-color: rgba(139, 45, 45, 0.16);
  left: 0;
  top: 0;
}

.progress {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
}
</style>
