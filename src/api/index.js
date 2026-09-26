/**
 * API 统一导出
 *
 * 【使用方式】
 * ```js
 * import { adminApi } from '@/api'
 * adminApi.user.list({ page: 1 })
 * ```
 *
 * 或者：
 * ```js
 * import api from '@/api'
 * api.admin.user.list({ page: 1 })
 * ```
 */

import { login, logout } from './auth'
import { adminApi } from './admin'
import { committeeApi } from './committee'
import { cityApi } from './city'
import { schoolApi } from './school'
// 中小学端（type=5）。与 city/school 并列的第三个端，见本文件 primary.js 说明
import { primaryApi } from './primary'
import { v2adminApi, v2committeeApi, v2schoolApi } from './v2'
import { chouqianApi } from './chouqian'
import { scanApi } from './scan'
import { liveApi, exportApi } from './live'
import { fileApi, qiniuApi, userApi } from './misc'
import { reportDraftApi } from './reportDraft'

export {
  login,
  logout,
  adminApi,
  committeeApi,
  cityApi,
  schoolApi,
  primaryApi,
  v2adminApi,
  v2committeeApi,
  v2schoolApi,
  chouqianApi,
  scanApi,
  liveApi,
  exportApi,
  fileApi,
  qiniuApi,
  userApi,
  reportDraftApi
}

export default {
  auth: { login, logout },
  admin: adminApi,
  committee: committeeApi,
  city: cityApi,
  school: schoolApi,
  primary: primaryApi,
  v2admin: v2adminApi,
  v2committee: v2committeeApi,
  v2school: v2schoolApi,
  chouqian: chouqianApi,
  scan: scanApi,
  live: liveApi,
  export: exportApi,
  files: fileApi,
  qiniu: qiniuApi,
  user: userApi,
  // 报名暂存（草稿）。scope 由调用方传 'school' | 'city' | 'primary'，见 api/reportDraft.js
  reportDraft: reportDraftApi
}
