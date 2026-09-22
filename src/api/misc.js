/**
 * 文件 / 用户 / 七牛 API
 *
 * 【可信度：A】直接照搬 dist 中 const G / Z 中的 file/qiniu/user 部分
 */

import request, { HOST } from '@/utils/request'

export const fileApi = {
  saveFileInfo: (data)   => request.post(HOST + '/api/file/create', data),
  getFileList:  (params) => request.get(HOST + '/api/file/list', { params })
}

export const qiniuApi = {
  getToken: () => request.get(HOST + '/api/qiniu/token')
}

export const userApi = {
  updateUserInfo: (data) => request.put(HOST + '/api/user', data),

  /**
   * 获取当前登录用户信息
   *
   * 【路径必须是 /api/user，不要改成 /api/user/info 之类】与上面的 PUT 同路径。
   * 后端目前只注册了 PUT，没注册 GET，所以未部署时拿到的是 405 而不是 404。
   * 这个差异很关键：request.js 的响应拦截器对 404 执行整页跳转（window.location.href
   * = BASE_URL + '404'），对 405 只 console.log 然后 reject —— 调用方 catch 掉即可静默降级。
   * 换成新路径会让"接口没上线也能正常跑"这个保护失效，详见 docs/接口需求-GET-api-user.md 第 6 节。
   *
   * 【调用方】src/components/layout/ModifyUserInfo.vue 的 loadLatest()，
   * 失败必须静默降级（405 / 超时 / 断网都不弹提示）。
   */
  getUserInfo: () => request.get(HOST + '/api/user'),

  // 后端不存在，无调用方
  checkRules: () => request.get(HOST + '/api/rules')
}
