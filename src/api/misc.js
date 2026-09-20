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
  // 后端不存在，无调用方
  checkRules: () => request.get(HOST + '/api/rules')
}
