/**
 * 认证 API
 *
 * 【可信度：A】直接照搬 dist 中 const A = {login, logout}
 */

import request, { HOST } from '@/utils/request'

export function login(data) {
  return request.post(HOST + '/api/login', data)
}

export function logout() {
  return request.post(HOST + '/api/logout')
}
