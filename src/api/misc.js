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
   * 【当前后端不存在该接口，调用必然 404】
   * 已核对 ../yilinbei/openapi.json：没有 /api/rules 这条路径。
   * 但 dist/app.js 中确实存在 `host+"/api/rules"`，即原始前端就带着它
   * （同 v2.js、chouqian.js 的情况：dist 与后端版本不匹配，非本项目写错）。
   * 目前 src 下没有任何页面调用 checkRules。
   * 保留而不删除的理由见本文件顶部与 v2.js 的说明。
   */
  checkRules:     ()     => request.get(HOST + '/api/rules')
}
