<template>
  <el-header class="main-header">
    <!-- 点击昵称 -> 打开帮助弹窗（dist: on:{click:()=>{e.showHelp=!0}}） -->
    <div @click="$emit('help')">
      <span>{{ nickname }}</span>
    </div>
    <!-- 点击 -> 打开"修改信息"弹窗（dist: on:{click:()=>e.$refs.modify.show()}） -->
    <div @click="$emit('modify')">
      <el-icon><User /></el-icon>
      <span>修改信息</span>
    </div>
    <!-- 点击 -> 退出登录 -->
    <div @click="logout">
      <el-icon><Bottom /></el-icon>
      <span>退出登录</span>
    </div>
  </el-header>
</template>

<script setup>
/**
 * Header 顶部栏
 *
 * 【可信度：A】照搬 dist 中 6 个 layout 的 el-header 渲染函数，原文：
 *
 *   t("el-header",[
 *     t("div",{on:{click:()=>{e.showHelp=!0}}},[t("span",[e._v(e._s(e.user.nickname))])]),
 *     t("div",{on:{click:()=>{e.$refs.modify.show()}}},[i.el-icon-user, t("span",[e._v("修改信息")])]),
 *     t("div",{on:{click:e.logout}},[i.el-icon-bottom, t("span",[e._v("退出登录")])])
 *   ])
 *
 *   原文样式（dist/css/chunk-40286ec0.c29eca32.css）：
 *     .el-header{text-align:center;line-height:60px;display:flex;flex-direction:row;
 *                justify-content:flex-end;align-items:center;padding-right:0}
 *     .el-header,.el-header>div{background-color:#fff;color:#252930;border-bottom:1px solid #e7e9ed}
 *     .el-header>div{padding:0 20px;cursor:pointer}
 *     .el-header>div span{margin-left:10px}
 *
 *   原文 logout 方法：
 *     logout(){ this.$api.auth.logout().then(({data:e})=>{
 *       1===e.code ? ElMessage.error(e.msg)
 *                 : (this.$store.dispatch("clearAllTabs"), ElMessage.success("退出成功！"),
 *                    this.clearAllMsg(), this.$router.push("/login")) })}
 *
 * 【已移除的推测实现】原重建版这里是"折叠按钮 + Breadcrumb + el-dropdown 下拉菜单
 * （个人中心/退出登录）"，dist 中均不存在：
 *  - dist 的 isCollapse 只在 data 中初始化为 false，全文没有任何地方把它置为 true，
 *    即原版没有折叠开关；
 *  - 原版头部只有上面三个可点击 div，没有下拉菜单；
 *  - "个人中心"在原版不存在，且原实现跳转的 {layout}/user 在 /online 下是死链。
 */

import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/store/modules/user'
import { useTabsStore } from '@/store/modules/tabs'
import { clearAllMsg } from '@/utils/auth'
import { logout as apiLogout } from '@/api/auth'

defineEmits(['modify', 'help'])

const router = useRouter()
const userStore = useUserStore()
const tabsStore = useTabsStore()

// dist: data(){ user: this.getUser() }，模板里取 user.nickname
const nickname = computed(() => (userStore.user && userStore.user.nickname) || '')

function logout() {
  apiLogout().then(({ data: res }) => {
    // dist 的判据是「code === 1 视为失败」，其余情况一律走成功分支
    if (res.code === 1) {
      ElMessage.error(res.msg)
    } else {
      tabsStore.clearAllTabs()
      ElMessage.success('退出成功！')
      clearAllMsg()
      router.push('/login')
    }
  })
}
</script>

<style lang="scss" scoped>
.main-header {
  text-align: center;
  line-height: 60px;
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  align-items: center;
  padding-right: 0;
  height: 60px;
  background-color: #fff;
  color: #252930;
  border-bottom: 1px solid #e7e9ed;

  > div {
    padding: 0 20px;
    cursor: pointer;

    span {
      margin-left: 10px;
    }
  }
}
</style>
