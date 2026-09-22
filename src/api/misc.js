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
   * 获取当前登录用户信息 —— **当前无调用方，保留定义备用**
   *
   * 【路径必须是 /api/user，不要改成 /api/user/info 之类】与上面的 PUT 同路径。
   * 后端已注册 GET（apps/api/views.py 的 user_info），线上实测可达；
   * 但在它还没部署的那段时间里，请求拿到的是 405 而不是 404。
   * 这个差异当时很关键：request.js 的响应拦截器对 404 执行整页跳转
   * （window.location.href = BASE_URL + '404'），对 405 只 console.log 然后 reject。
   * 换成新路径会让"接口没上线也能正常跑"这个保护失效，详见 docs/接口需求-GET-api-user.md 第 6 节。
   *
   * 【为什么现在没人调】原调用方是 ModifyUserInfo.vue 的 loadLatest()，已在
   * 「弹窗只认 props.user 一份数据源」那次修复中整段删除（理由见该文件的
   * 「本次修复：整段删除了…」）。保留这个定义是因为接口真实存在、将来若要做
   * "不重新登录也能刷新资料"还会用到 —— 届时请让后端在 user_dict 里返回 updated_at
   * 供前端比较时间戳，不要再依赖请求时序。
   *
   * 【调用方若恢复，失败必须静默降级】（超时 / 断网 / 405 都不弹提示）。
   */
  getUserInfo: () => request.get(HOST + '/api/user'),

  // 后端不存在，无调用方
  checkRules: () => request.get(HOST + '/api/rules')
}
