<template>
  <div class="layout-root">
    <el-container class="layout-container">
      <!-- 左侧菜单（dist 中 el-menu 直接是 el-container 的子元素，没有 el-aside 包裹） -->
      <Sidebar :collapse="isCollapse" :active="active" />

      <el-container>
        <!-- 顶部：昵称已移除 / 修改信息 / 退出登录 -->
        <Header @modify="openModify" />

        <!-- 标签页栏：dist 中为 v-if="tabs.length>0" -->
        <div v-if="tabs.length > 0" class="indexs">
          <div
            v-for="(tab, i) in tabs"
            :key="i"
            class="index-item"
            :class="{ tabactive: tab.name === route.path }"
          >
            <span @click="router.push(tab.name)"> {{ tab.label }}</span>
            <el-icon @click.stop="closeWindow(tab.name)"><Close /></el-icon>
          </div>
        </div>

        <el-main class="layout-main">
          <template v-if="keepAlive">
            <keep-alive>
              <router-view v-if="route.meta && route.meta.keepAlive" />
            </keep-alive>
            <router-view v-if="!(route.meta && route.meta.keepAlive)" />
          </template>
          <router-view v-else />
        </el-main>

        <el-footer class="layout-footer">
          @copyright “意林杯”四川省第十二届管乐展示活动
        </el-footer>
      </el-container>
    </el-container>

    <!-- 修改信息 -->
    <ModifyUserInfo ref="modifyRef" :user="user" />

  </div>
</template>

<script setup>
/**
 * MainLayout 主布局
 *
 * 【可信度：A】DOM 结构照搬 dist 中 6 个 layout chunk（除菜单与品牌标题按各自配置外，
 * 其余结构完全一致）。原文骨架（以 admin 为例）：
 *
 *   t("div",{attrs:{id:"app"}},[
 *     t("el-container",[
 *       t("el-menu",{staticClass:"my-el-menu", ...}),          // ← 侧边栏
 *       t("el-container",[
 *         t("el-header",[ ...三个可点击 div... ]),
 *         e.tabs.length>0 ? t("div",{staticClass:"indexs"}, e._l(e.tabs,(n,o)=>
 *             t("div",{key:o,staticClass:"index-item",class:{tabactive:n.name===e.$route.path}},[
 *               t("span",{on:{click:()=>e.$router.push(n.name)}},[e._v(" "+e._s(n.label))]),
 *               t("i",{staticClass:"el-icon-close",on:{click:t=>{t.stopPropagation(),e.closeWindow(n.name)}}})
 *             ])),0) : e._e(),
 *         t("el-main",[t("router-view")],1),
 *         t("el-footer",[e._v(" @copyright “意林杯”四川省第十一届管乐展示活动")])
 *       ],1)
 *     ],1),
 *     t("ModifyUserInfo",{ref:"modify",attrs:{user:e.user}}),
 *     t("el-dialog",{attrs:{visible:e.showHelp},on:{"update:visible":t=>{e.showHelp=t}}},[ ...运维联系信息... ])
 *   ],1)
 *
 * data(){ return { isCollapse:false, showHelp:false, active:this.$route.path, user:this.getUser() } }
 * updated(){ this.active = this.$route.path }
 *
 * 【与原实现（本仓库旧版）的差异 —— 均为照证据修正】
 *  1. 原实现用 el-aside 包裹 Sidebar，dist 没有 el-aside，el-menu 是 el-container 的直接子元素。
 *  2. 原实现没有标签页栏（P1-7），这里按 dist 恢复。
 *  3. 原实现没有 el-footer，这里按 dist 恢复。
 *  4. 原实现给 router-view 加了 <transition name="fade" mode="out-in"> 和 :key="route.fullPath"，
 *     dist 的 el-main 里只有裸 router-view，因此移除（移除后行为才与 dist 一致）。
 *  5. 原实现的 Header 有折叠按钮 / 面包屑 / 下拉菜单，dist 均无 —— 见 Header.vue。
 *  6. 【第十二届】按要求移除顶栏昵称栏及其「帮助」弹窗触发，故上面第 81 行那条
 *     帮助 el-dialog 已从本组件**删除**；el-header 的三个可点击 div 现为两个
 *     （修改信息 / 退出登录）。上面第 80 行的 `ModifyUserInfo` **保留不动**，
 *     「修改信息」功能照常可用。dist 骨架原文保留作为凭据，勿据此恢复帮助弹窗。
 */

import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Close } from '@element-plus/icons-vue'
import Sidebar from './Sidebar.vue'
import Header from './Header.vue'
import ModifyUserInfo from './ModifyUserInfo.vue'
import { useTabs } from '@/composables/useTabs'
import { useUserStore } from '@/store/modules/user'
import { useTabsStore } from '@/store/modules/tabs'
import { getLayoutMenu } from '@/config/menus'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const tabsStore = useTabsStore()
const { closeWindow } = useTabs()

// dist: data.isCollapse 恒为 false —— 全文没有任何地方把它置为 true，原版没有折叠开关
const isCollapse = ref(false)
const modifyRef = ref(null)

// dist: updated(){ this.active = this.$route.path }。改用 computed，等价且更直接。
const active = computed(() => route.path)

// dist: computed: mapState(['tabsActive','tabs'])
const tabs = computed(() => tabsStore.tabs)

// dist: data(){ user: this.getUser() }
const user = computed(() => userStore.user)

// dist: city / school / online 的 el-main 包了 keep-alive，admin / committee 没有
const keepAlive = computed(() => {
  const m = getLayoutMenu(route.path)
  return !!(m && m.keepAlive)
})

// dist: 点击"修改信息" -> this.$refs.modify.show()
function openModify() {
  if (modifyRef.value) modifyRef.value.show()
}
</script>

<style lang="scss" scoped>
/**
 * 样式照搬 dist CSS 中该组件的作用域规则（[data-v-580db96a]）。
 * 来源：dist/css/chunk-40286ec0.c29eca32.css（6 个 layout 内容一致）
 *
 * 【未迁移项】原版还有以下规则，因对应的 DOM 在本项目不存在而未搬：
 *   .el-aside{...}                —— 原版模板里并没有 el-aside，属遗留样式
 *   .el-submenu / .el-menu-item-group —— 菜单只有一层，未使用
 *   [class^=el-icon-] 相关         —— Element Plus 图标是组件而非字体类名
 *   body > .el-container{margin-bottom:40px} —— 选择器在原版也不成立
 */

.layout-root {
  transition: all 0.3s;
  height: 100%;
}

.layout-container {
  height: 100%;
  overflow: hidden;
}

.layout-main {
  background-color: #f5f6fe;
}

.layout-footer {
  height: 40px !important;
  line-height: 40px;
  color: #ccc;
  text-align: center;
}

/* 标签页栏（dist: .indexs / .index-item / .tabactive） */
.indexs {
  position: relative;
  display: flex;
  justify-content: flex-start;
  align-items: center;
  padding: 10px 5px;
  background-color: #fff;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.1);

  * {
    cursor: pointer;
  }
}

.index-item {
  background-color: rgba(0, 51, 102, 0.412);
  border-radius: 3px;
  padding: 3px 6px;
  margin: 0 5px;
  color: #fff;
  display: flex;
  align-items: center;

  .el-icon {
    margin-left: 4px;
  }
}

.tabactive {
  background-color: #036;
}
</style>
