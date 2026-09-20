/**
 * 直播报道 API
 *
 * 【可信度：A】直接照搬 dist 中 const Z
 */

import request, { HOST } from '@/utils/request'

export const liveApi = {
  getLiveReportList: (params) => request.get(HOST + '/api/live/list', { params }),
  // 【修复·尾部斜杠】原为 '/api/live'（无尾斜杠），后端注册的是 '/api/live/'。
  // 依据：openapi.json 中该路径为 "/api/live/"，且同文件里 '/api/live/list'、'/api/live/{id}'
  // 都是完整路径 —— 唯独 PUT 这条少了尾斜杠，属于笔误而非设计。
  // 同 admin.js 的说明：Ninja 不过 APPEND_SLASH，缺失会直接 404。
  updateLiveReport:  (data)   => request.put(HOST + '/api/live/', data),
  getLiveReportById: (id)     => request.get(HOST + '/api/live/' + id)
}

export const exportApi = {
  exportReportData:       async () => await request.get(HOST + '/api/export/report', { responseType: 'blob' }),
  exportReportPersonData: async () => await request.get(HOST + '/api/export/person', { responseType: 'blob' }),
  exportGroupData:        (params) => request.get(HOST + '/api/export/data', { params, responseType: 'blob' })
}
