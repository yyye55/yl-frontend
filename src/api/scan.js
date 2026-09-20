/**
 * 人脸识别/扫码 API
 *
 * 【可信度：A】直接照搬 dist 中 const V
 */

import request, { HOST } from '@/utils/request'

export const scanApi = {
  uploadImage: (data)   => request.post(HOST + '/api/scan/cau', data),
  getImages:   (params) => request.get(HOST + '/api/scan/files', { params }),
  getList:     (params) => request.get(HOST + '/api/scan/list', { params })
}
