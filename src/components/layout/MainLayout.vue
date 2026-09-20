<template>
  <div class="layout-root">
    <el-container class="layout-container">
      <!-- ?????dist ? el-menu ??? el-container ??????? el-aside ??? -->
      <Sidebar :collapse="isCollapse" :active="active" />

      <el-container>
        <!-- ????? / ???? / ???? -->
        <Header @modify="openModify" @help="showHelp = true" />

        <!-- ?????dist ?? v-if="tabs.length>0" -->
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
          @copyright "???"?????????????
        </el-footer>
      </el-container>
    </el-container>

    <!-- ???? -->
    <ModifyUserInfo ref="modifyRef" :user="user" />

    <!-- ??????????????? -->
    <el-dialog v-model="showHelp">
      <p style="line-height:25px;">
        ??????????????????????????????????????????????<br />
        ?????????XXXXXXXX?XXXXXXXX??????<br />
        ??????QQ?XXXXXXXX??????????+???<br />
        ???XXXXXXXX@qq.com<br />
      </p>
      <p style="padding:5px 0;">
        ???
        <el-button size="mini" type="primary"> ???? </el-button>
      </p>
    </el-dialog>
  </div>
</template>

<script setup>
/**
 * MainLayout ???
 *
 * ?????A?DOM ???? dist ? 6 ? layout chunk????????????????
 * ???????????????? admin ????
 *
 *   t("div",{attrs:{id:"app"}},[
 *     t("el-container",[
 *       t("el-menu",{staticClass:"my-el-menu", ...}),          // ? ???
 *       t("el-container",[
 *         t("el-header",[ ...????? div... ]),
 *         e.tabs.length>0 ? t("div",{staticClass:"indexs"}, e._l(e.tabs,(n,o)=>
 *             t("div",{key:o,staticClass:"index-item",class:{tabactive:n.name===e.$route.path}},[
 *               t("span",{on:{click:()=>e.$router.push(n.name)}},[e._v(" "+e._s(n.label))]),
 *               t("i",{staticClass:"el-icon-close",on:{click:t=>{t.stopPropagation(),e.closeWindow(n.name)}}})
 *             ])),0) : e._e(),
 *         t("el-main",[t("router-view")],1),
 *         t("el-footer",[e._v(" @copyright "???"?????????????")])
 *       ],1)
 *     ],1),
 *     t("ModifyUserInfo",{ref:"modify",attrs:{user:e.user}}),
 *     t("el-dialog",{attrs:{visible:e.showHelp},on:{"update:visible":t=>{e.showHelp=t}}},[ ...??????... ])
 *   ],1)
 *
 * data(){ return { isCollapse:false, showHelp:false, active:this.$route.path, user:this.getUser() } }
 * updated(){ this.active = this.$route.path }
 *
 * ??????????????? ?? ????????
 *  1. ???? el-aside ?? Sidebar?dist ?? el-aside?el-menu ? el-container ???????
 *  2. ??????????P1-7????? dist ???
 *  3. ????? el-footer???? dist ???
 *  4. ???? router-view ?? <transition name="fade" mode="out-in"> ? :key="route.fullPath"?
 *     dist ? el-main ???? router-view????????????? dist ????
 *  5. ???? Header ????? / ??? / ?????dist ?? ?? ? Header.vue?
 */

import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
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

// dist: data.isCollapse ?? false ?? ???????????? true?????????
const isCollapse = ref(false)
const showHelp = ref(false)
const modifyRef = ref(null)

// dist: updated(){ this.active = this.$route.path }??? computed????????
const active = computed(() => route.path)

// dist: computed: mapState(['tabsActive','tabs'])
const tabs = computed(() => tabsStore.tabs)

// dist: data(){ user: this.getUser() }
const user = computed(() => userStore.user)

// dist: province / city / school / online ? el-main ?? keep-alive?admin / committee ??
const keepAlive = computed(() => {
  const m = getLayoutMenu(route.path)
  return !!(m && m.keepAlive)
})

// dist: ??"????" -> this.$refs.modify.show()
function openModify() {
  if (modifyRef.value) modifyRef.value.show()
}
</script>

<style lang="scss" scoped>
/**
 * ???? dist CSS ???????????[data-v-580db96a]??
 * ???dist/css/chunk-40286ec0.c29eca32.css?6 ? layout ?????
 *
 * ??????????????????? DOM ???????????
 *   .el-aside{...}                ?? ???????? el-aside??????
 *   .el-submenu / .el-menu-item-group ?? ??????????
 *   [class^=el-icon-] ??         ?? Element Plus ???????????
 *   body > .el-container{margin-bottom:40px} ?? ??????????
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

/* ?????dist: .indexs / .index-item / .tabactive? */
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

  .el-icon {
    margin-left: 4px;
  }
}

.tabactive {
  background-color: #036;
}
</style>
