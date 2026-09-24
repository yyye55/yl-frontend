/**
 * 角色权限（组件内使用）
 *
 * 【用法】
 *   const { canUploadSealScan } = usePermission()
 *   <el-button v-if="canUploadSealScan" ...>
 *
 * 返回的都是 computed，模板里当普通布尔用（`v-if="canUploadSealScan"` 即可，
 * Vue 模板会自动解包 ref），不要写 `.value`。
 *
 * 【为什么走 store 而不是直接读 localStorage】
 * 与 Header.vue / MainLayout.vue / ModifyUserInfo.vue 读当前用户的方式保持一致：
 * useUserStore().user 才是登录时写进内存的那份副本，且退出登录后会被 store.logout()
 * 同步清掉。localStorage 是它的来源，但两者在「登出」这一刻会短暂不一致。
 *
 * 【角色缺失（userType === -1）时是 fail-open 还是 fail-closed】
 * 判 false（即不隐藏）。这不构成缺口：任何 layout 页面都要先过 router/guard.js，
 * 而守卫在 user 缺失时直接清登录态并跳 /login —— userType 为 -1 的状态根本渲染不出
 * 这些页面。反之若在这里改判 true，反而会给「user 尚未写入」的登录瞬间
 * 多造一个与守卫不一致的状态。
 */

import { computed } from 'vue'
import { useUserStore } from '@/store/modules/user'
import { isViewOnlyScope } from '@/config/roles'

export function usePermission() {
  const userStore = useUserStore()

  /** 当前账号是否只读（市州端）*/
  const viewOnly = computed(() => isViewOnlyScope(userStore.userType))

  return {
    viewOnly,
    /** 能否进入赛事报名流程（菜单项 + 路由守卫用的都是这条）*/
    canCreateReport: computed(() => !viewOnly.value),
    /** 能否修改 / 删除已有报名（报名汇总的操作列）*/
    canEditReport: computed(() => !viewOnly.value),
    /** 能否上传报名信息表盖章扫描件（首页）*/
    canUploadSealScan: computed(() => !viewOnly.value)
  }
}

export default usePermission
