<template>
  <el-menu
    class="my-el-menu"
    :default-active="active"
    text-color="#252930"
    :active-text-color="menu.activeTextColor"
    :collapse="collapse"
    :collapse-transition="false"
    @open="handleOpen"
    @close="handleClose"
  >
    <!-- 品牌标题（dist 原文：div.head-title > p > 两行文字，含全角右引号） -->
    <div class="head-title">
      <p style="line-height:22px;">
        {{ menu.title[0] }}<br />{{ menu.title[1] }}
      </p>
    </div>

    <!--
      菜单项 —— 严格按 src/config/menus.js 的配置渲染。
      dist 用的是 index + @click，不是 el-menu 的 router 模式：
      点击时走 openWindow(index, label)，由它负责建标签页 + 跳路由。
    -->
    <template v-for="(item, i) in menu.items" :key="i">
      <div v-if="item.type === 'line'" class="line" :class="{ hidden: collapse }">
        <div>{{ item.text }}</div>
      </div>
      <el-menu-item
        v-else
        :index="item.index"
        @click="openWindow(item.index, item.label)"
      >
        <el-icon v-if="LEGACY_ICON_MAP[item.icon]">
          <component :is="LEGACY_ICON_MAP[item.icon]" />
        </el-icon>
        <span>{{ item.text }}</span>
      </el-menu-item>
    </template>
  </el-menu>
</template>

<script setup>
/**
 * Sidebar 侧边栏
 *
 * 【可信度：A】DOM 结构与交互照搬 dist 中 6 个 layout 的 el-menu 渲染函数，原文（以 admin 为例）：
 *
 *   t("el-menu",{staticClass:"my-el-menu",
 *     attrs:{"default-active":e.active,"text-color":"#252930","active-text-color":"#003366",
 *            collapse:e.isCollapse,"collapse-transition":""},
 *     on:{open:e.handleOpen,close:e.handleClose}},[
 *     t("div",{staticClass:"head-title"},[t("p",{staticStyle:{"line-height":"22px"}},
 *        [e._v("“意林杯”四川省第十二届"),t("br"),e._v("管乐展示活动")])]),
 *     t("el-menu-item",{attrs:{index:"/admin/index"},
 *        on:{click:()=>e.openWindow("/admin/index","首页")}},[...])
 *   ])
 *
 * 【与当前重建版的重要差异（已修正）】
 *  1. 菜单不是从 route.children 推导的，而是每个 layout 各自硬编码 —— 见 src/config/menus.js。
 *     原实现遍历 route.matched 取 children，会多出 dist 里根本没有的菜单项
 *     （如 /admin/report、/admin/recommend、各省市 layout 下的 edit 路由等）。
 *  2. 原实现用 el-menu 的 router 模式；dist 是 index + @click=openWindow()。
 *     差别在于：router 模式只跳路由、不建标签页。
 *  3. 原实现深色主题（#001529/#bfcbd9）是推测值；dist 实际是浅色 .my-el-menu，
 *     text-color=#252930，active-text-color 每个 layout 不同（见 config）。
 *  4. dist 的 el-menu 直接是 el-container 的子元素，外面没有 el-aside。
 */

import { computed } from 'vue'
import { useRoute } from 'vue-router'
import {
  HomeFilled, Picture, User, Opportunity, Tickets, InfoFilled,
  DataAnalysis, Grid, Flag, Shop, Star, QuestionFilled, Goods
} from '@element-plus/icons-vue'
import { useTabs } from '@/composables/useTabs'
import { getLayoutMenu } from '@/config/menus'

/**
 * Element UI 2.x 图标类名 -> Element Plus 图标组件
 *
 * 【为什么在这里而不是 config/menus.js】
 * 本映射必须持有组件引用本身，才能被 Vite 静态分析、按需打包；
 * 放在纯配置模块里会让配置文件和 UI 框架耦合，也不利于 tree-shaking。
 *
 * 【为什么不用全局注册 + 字符串名】
 * 模板里是 <component :is="LEGACY_ICON_MAP[item.icon]" />，属动态组件。
 * unplugin-vue-components 只能静态识别模板里字面出现的组件名，识别不了动态 :is，
 * 因此这里显式 import 全部用到的 13 个图标，避免为了动态解析而把 @element-plus/icons-vue
 * 整包全局注册（那会让入口体积增加约 1 MB）。
 */
const LEGACY_ICON_MAP = {
  'el-icon-s-home': HomeFilled,
  'el-icon-picture-outline': Picture,
  'el-icon-user': User,
  'el-icon-s-opportunity': Opportunity,
  'el-icon-s-order': Tickets,
  'el-icon-info': InfoFilled,
  'el-icon-s-data': DataAnalysis,
  'el-icon-s-grid': Grid,
  'el-icon-s-flag': Flag,
  'el-icon-s-shop': Shop,
  'el-icon-star-off': Star,
  'el-icon-help': QuestionFilled,
  'el-icon-s-goods': Goods
}

const props = defineProps({
  collapse: { type: Boolean, default: false },
  /** 对应 dist 的 data.active；由 layout 在 updated 钩子里同步为 $route.path */
  active: { type: String, default: '' }
})

const route = useRoute()
const { openWindow } = useTabs()

const menu = computed(() => getLayoutMenu(route.path) || { title: ['', ''], items: [] })

// dist: handleOpen(e,t){console.log(e,t)} / handleClose(e,t){console.log(e,t)}
function handleOpen(index, indexPath) {
  console.log(index, indexPath)
}
function handleClose(index, indexPath) {
  console.log(index, indexPath)
}
</script>

<style lang="scss" scoped>
/**
 * 以下样式照搬 dist CSS 中该组件的作用域规则（[data-v-580db96a]）。
 * 文件名：dist/css/chunk-40286ec0.c29eca32.css（6 个 layout 的内容一致）
 *
 * 【已知未还原项】
 *  - 字体：原版使用 "PangMenZhengDao Regular"（标题）、"Adobe Heiti Std R"（菜单项）、
 *    "SimHei Regular"（分组线），这三个字体文件未随 dist 提供，暂不引入。
 *  - .el-submenu 相关规则：本项目菜单层级只有一层，原版同样未使用 el-submenu，
 *    该组规则属于原版遗留，未迁移。
 */

.el-menu-item,
:deep(.el-sub-menu),
:deep(.el-submenu) {
  font-family: 'Adobe Heiti Std R', 'SimHei', sans-serif;
  font-weight: 700;
  text-align: left;
  color: #252930;
}

.el-menu-item {
  line-height: 40px;
  height: 40px;
}

/* 激活项：左侧 6px 竖条 + 半透明蓝底（dist 原文） */
:deep(.el-menu-item.is-active) {
  background-color: rgba(11, 54, 98, 0.239) !important;
  color: #036;
  &::before {
    content: '';
    background-color: #036;
    width: 6px;
    height: 100%;
    position: absolute;
    left: 0;
    top: 0;
  }
}

.el-menu-item:hover,
.el-menu-item:focus {
  outline: 0;
  background-color: rgba(0, 51, 102, 0.09);
}

.my-el-menu {
  background-color: rgba(233, 238, 243, 0);
  color: #333;
  text-align: center;
  height: 100%;
  min-width: 200px;
  border-right: none;

  :deep(.el-menu-item-group__title) {
    display: none;
  }
  :deep(.el-menu-item-group) {
    background-color: #fff;
  }
}

/* dist: [data-v-580db96a] .my-el-menu.el-menu{ background-color:#fff; box-shadow: 0 8px 15px rgba(0,0,0,.05) } */
:deep(.my-el-menu.el-menu) {
  background-color: #fff;
  background-repeat: no-repeat;
  background-size: 100% 100%;
  box-shadow: 0 8px 15px rgba(0, 0, 0, 0.05);
}

.head-title {
  height: 60px;
  background-color: #fff;
  display: flex;
  line-height: 30px;
  text-align: center;
  justify-content: center;
  align-items: center;
  font-family: 'PangMenZhengDao Regular', 'SimHei', sans-serif;
  font-weight: 800;
  padding: 0 !important;

  img {
    margin-right: 10px;
    height: 40px;
    width: 40px;
  }
}

/* 折叠时隐藏分组线（dist: .hidden{display:none}） */
.hidden {
  display: none;
}

/* 分组分隔线（dist: .line / .line > div） */
.line {
  height: 35px;
  cursor: pointer;
  padding: 5px 20px;

  > div {
    background-color: #fff;
    opacity: 0.3;
    border-radius: 3px;
    height: 100%;
    color: #303133;
    line-height: 35px;
    font-family: 'SimHei Regular', 'SimHei', sans-serif;
    font-weight: 700;
  }
}
</style>
