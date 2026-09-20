/**
 * User Store
 *
 * 【说明】原 Vue 2 项目中 user/token 信息直接存 localStorage，
 * 通过 Vue.prototype 上的方法访问。本项目在保留 localStorage 的同时，
 * 增加 Pinia 响应式访问能力，方便组件内用 computed 实时感知变化。
 */

import { defineStore } from 'pinia'
import { getToken, setToken, getUser, setUser, clearToken, clearUser } from '@/utils/auth'

export const useUserStore = defineStore('user', {
  state: () => ({
    token: getToken(),
    user:  getUser()
  }),
  getters: {
    isLogin: (state) => !!state.token,
    userType: (state) => (state.user && state.user.type !== undefined ? state.user.type : -1)
  },
  actions: {
    setToken(token) {
      setToken(token)
      this.token = token
    },
    setUser(user) {
      setUser(user)
      this.user = user
    },
    logout() {
      clearToken()
      clearUser()
      this.token = ''
      this.user = null
    }
  }
})
