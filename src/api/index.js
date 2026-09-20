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
import { provinceApi } from './province'
import { cityApi } from './city'
import { schoolApi } from './school'
import { v2adminApi, v2committeeApi, v2schoolApi } from './v2'
import { chouqianApi } from './chouqian'
import { scanApi } from './scan'
import { liveApi, exportApi } from './live'
import { fileApi, qiniuApi, userApi } from './misc'

export {
  login,
  logout,
  adminApi,
  committeeApi,
  provinceApi,
  cityApi,
  schoolApi,
  v2adminApi,
  v2committeeApi,
  v2schoolApi,
  chouqianApi,
  scanApi,
  liveApi,
  exportApi,
  fileApi,
  qiniuApi,
  userApi
}

export default {
  auth: { login, logout },
  admin: adminApi,
  committee: committeeApi,
  province: provinceApi,
  city: cityApi,
  school: schoolApi,
  v2admin: v2adminApi,
  v2committee: v2committeeApi,
  v2school: v2schoolApi,
  chouqian: chouqianApi,
  scan: scanApi,
  live: liveApi,
  export: exportApi,
  files: fileApi,
  qiniu: qiniuApi,
  user: userApi
}
