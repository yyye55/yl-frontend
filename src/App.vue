<template>
  <!--
    Element Plus 全局中文语言包。
    改为按需引入后不再有 app.use(ElementPlus, { locale }) 这一层，
    分页器 / 表格空数据 / MessageBox 按钮等文案靠这里的 ConfigProvider 提供。
  -->
  <el-config-provider :locale="zhCn">
    <!-- 路由出口：与原 dist 中 App.vue 保持一致的 keep-alive + meta.keepAlive 行为 -->
    <router-view v-slot="{ Component, route }">
      <keep-alive>
        <component :is="Component" v-if="route.meta && route.meta.keepAlive" :key="route.fullPath" />
      </keep-alive>
      <component :is="Component" v-if="!(route.meta && route.meta.keepAlive)" :key="route.fullPath" />
    </router-view>
  </el-config-provider>
</template>

<script setup>
// 原 App.vue 极简，只是一个 router-view + keep-alive 外壳
// 注释：
//   1. 整个项目只有一个 <router-view> 入口，由 router 决定显示 Login / Middle / 各 Layout
//   2. keep-alive 由 route.meta.keepAlive 控制；原项目所有页面都没启用 keepAlive（推测）
//   3. 【已知结构差异，未改】dist 的 App.vue 渲染函数是
//        div#app > [ keep-alive[ $route.meta.KeepAlive ? router-view : null ],
//                    $route.meta.KeepAlive ? null : router-view ]
//      注意它判的是 meta.KeepAlive（大写 K），而各 layout 判的是 meta.keepAlive（小写 k）。
//      本项目路由里两者都没有设置，因此这两个分支在 dist 和本项目中都恒为「不缓存」，
//      行为一致。此处保留本项目的等价写法，不为了逐字对应而引入一个恒 false 的大写键。
//   4. 本组件原先还有一个 <style>#app { height: 100% }</style>，已删除：
//      index.html 头部的内联 <style> 里已经写了 `html, body, #app { height: 100%; ... }`，
//      两处声明重复且取值相同，保留哪一条结果都一样，故只留 index.html 那一处。
import zhCn from 'element-plus/es/locale/lang/zh-cn'
</script>
