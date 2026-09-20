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
    <!-- ?????dist ???div.head-title > p > ???????????? -->
    <div class="head-title">
      <p style="line-height:22px;">
        {{ menu.title[0] }}<br />{{ menu.title[1] }}
      </p>
    </div>

    <!--
      ???????? src/config/menus.js ??????
      dist ??? index + @click??? el-menu ? router ???
      ???? openWindow(index, label)????????? + ?????
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
 * Sidebar ???
 *
 * ?????A?DOM ??????? dist ? 6 ? layout ? el-menu ????????? admin ????
 *
 *   t("el-menu",{staticClass:"my-el-menu",
 *     attrs:{"default-active":e.active,"text-color":"#252930","active-text-color":"#003366",
 *            collapse:e.isCollapse,"collapse-transition":""},
 *     on:{open:e.handleOpen,close:e.handleClose}},[
 *     t("div",{staticClass:"head-title"},[t("p",{staticStyle:{"line-height":"22px"}},
 *        [e._v(""???"???????"),t("br"),e._v("??????")])]),
 *     t("el-menu-item",{attrs:{index:"/admin/index"},
 *        on:{click:()=>e.openWindow("/admin/index","??")}},[...])
 *   ])
 *
 * ??????????????????
 *  1. ????? route.children ???????? layout ???? ?? ? src/config/menus.js?
 *     ????? route.matched ? children???? dist ?????????
 *     ?? /admin/report?admin/recommend???? layout ?? edit ?????
 *  2. ???? el-menu ? router ???dist ? index + @click=openWindow()?
 *     ?????router ??????????????
 *  3. ????????#001529/#bfcbd9??????dist ??????? .my-el-menu?
 *     text-color=#252930?active-text-color ?? layout ???? config??
 *  4. dist ? el-menu ??? el-container ????????? el-aside?
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
 * Element UI 2.x ???? -> Element Plus ????
 *
 * ?????????? config/menus.js?
 * ????????????????? Vite ??????????
 * ??????????????? UI ????????? tree-shaking?
 *
 * ????????? + ?????
 * ???? <component :is="LEGACY_ICON_MAP[item.icon]" />???????
 * unplugin-vue-components ???????????????????????? :is?
 * ?????? import ????? 13 ?????????????? @element-plus/icons-vue
 * ?????????????????? 1 MB??
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
  /** ?? dist ? data.active?? layout ? updated ?????? $route.path */
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
 * ?????? dist CSS ???????????[data-v-580db96a]??
 * ????dist/css/chunk-40286ec0.c29eca32.css?6 ? layout ??????
 *
 * ????????
 *  - ???????"PangMenZhengDao Regular"?????"Adobe Heiti Std R"?????
 *    "SimHei Regular"??????????????? dist ????????
 *  - .el-submenu ???????????????????????? el-submenu?
 *    ???????????????
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

/* ?????? 6px ?? + ??????dist ???*/
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

/* ?????????dist: .hidden{display:none}?*/
.hidden {
  display: none;
}

/* ??????dist: .line / .line > div?*/
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
