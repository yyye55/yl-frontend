<template>
  <el-header class="main-header">
    <!--
      【当前账号「名称」】常驻显示，让用户一眼看清登的是哪个账号 ——
      各端（管理/组委会/市州/学校/中小学）共用这一个 Header，改这里即全端生效。
      它不是可点区域（没有 @click），样式上也要把继承来的 cursor:pointer 改掉，
      否则用户会以为点了能展开什么。数据来源与兜底见下面 accountName 的注释。
    -->
    <div v-if="accountName" class="account-name" :title="accountName">{{ accountName }}</div>

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
 *
 * 【第十二届改动】按要求移除昵称那一栏，故 dist 原文中的**第 1 个 div**
 * （上面第 23 行那条 `t("div",{on:{click:()=>{e.showHelp=!0}}},[…nickname…])`）
 * 及其 `showHelp` 触发**已不再实现**。
 *
 * 【第十二届·后续】按新要求补回「当前账号名称」，位置在“修改信息”左侧，
 * el-header 下现为三个元素：账号名称（只读标签）/ 修改信息 / 退出登录。
 * **它不是上面那个 div 的复活**，两处区别是实质性的，别把它们混为一谈：
 *   · 上面那个是**可点击**的，点开「帮助」弹窗（`showHelp`）—— 那个弹窗连同
 *     `showHelp` 状态**仍然不存在**，本次没有恢复；
 *   · 现在这个是纯标签（无 @click、cursor:default），只负责显示名称。
 * 上面那段 dist 原文记录予以保留，作为「照证据修正」的凭据；
 * **勿据此把帮助弹窗或昵称的点击行为恢复回来**。
 */

import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, Bottom } from '@element-plus/icons-vue'
import { useTabsStore } from '@/store/modules/tabs'
import { useUserStore } from '@/store/modules/user'
import { clearAllMsg } from '@/utils/auth'
import { logout as apiLogout } from '@/api/auth'

defineEmits(['modify'])

const router = useRouter()
const tabsStore = useTabsStore()
const userStore = useUserStore()

/**
 * 顶栏左侧显示的「当前账号名称」。
 *
 * 【字段来源】后端 User.nickname（"yilinbei hou/apps/core/models.py:119），
 * 也就是「修改信息」弹窗里标签写作「名称」的那一栏 —— 学校账号即校名（如「希望小学」）。
 * 顶栏与「修改信息」读的是同一个字段，所以不存在"两处显示不一致"。
 *
 * 【为什么要兜底到 username】该字段模型里 `default=" "`（一个空格），
 * 建号后从没填过「名称」的账号 trim 完就是空串。那时退到「账号」：
 * 顶栏显示一个账号名仍然能起到"这是哪个账号"的作用，比这一格空着强。
 * 两者都为空则整格不渲染（模板上的 v-if），不留一个空白占位把顶栏顶歪。
 *
 * 【为什么不会出现"改完名字顶栏没变"】保存「修改信息」会强制重新登录
 * （ModifyUserInfo.forceRelogin），重新登录后拿到的 user 自然带新名称；
 * 会话期间这个值不会变，也就不需要额外的同步逻辑。
 */
const accountName = computed(() => {
  const u = userStore.user
  if (!u) return ''
  return (u.nickname || '').trim() || (u.username || '').trim()
})

function logout() {
  apiLogout().then(({ data: res }) => {
    // dist 的判据是「code === 1 视为失败」，其余情况一律走成功分支
    if (res.code === 1) {
      ElMessage.error(res.msg)
    } else {
      tabsStore.clearAllTabs()
      ElMessage.success('退出成功！')
      clearAllMsg()
      /**
       * 【为什么还要清一次 store】clearAllMsg() 只清 localStorage，而 userStore 是启动时
       * 把 localStorage 读进内存的副本（store/modules/user.js:13-16），内存里的 token/user
       * 不会跟着变。其读取方都在路由守卫之后（守卫读 localStorage，MainLayout 由守卫放行
       * 才挂载），所以这一行**不是在修可见 Bug**，而是把"登出即清干净"这条语义补齐。
       * 语义与 utils/auth.js:74 的 logout() 一致（ModifyUserInfo 的强制登出同样有这一行）。
       */
      userStore.logout()
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
    display: flex;
    align-items: center;

    span {
      margin-left: 10px;
    }

    /* 当前账号「名称」：是个标签，不是按钮 —— 覆盖上面继承来的 pointer，
       否则鼠标移上去会显示手型，用户会以为点了能展开（模板里那段注释有说明）。 */
    &.account-name {
      cursor: default;
      /* 覆盖上面的 flex：text-overflow 只在块级盒子里对文本生效 */
      display: block;
      font-weight: 600;
      font-size: 15px;
      /* 【为什么要截断】后端 nickname 放宽到 255 字符（apps/core/models.py:119），
         超长名称会把右侧的「修改信息 / 退出登录」整个顶出屏幕。
         全名挂在 title 上，悬停仍能看到完整内容。 */
      max-width: 240px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
}
</style>
