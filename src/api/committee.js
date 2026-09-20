/**
 * 委员会 API (type=2)
 *
 * 【可信度：A】直接照搬 dist 中 const q = {...}
 *
 * 【与 dist 的差异】deletedUser 的 URL 已修正（原版 '/committee/api/user' 缺前缀与尾斜杠），
 * 另 update/create 补齐了尾斜杠；两者都是路径笔误修正，详见各方法上方的注释。
 */

import request, { HOST } from '@/utils/request'

export const committeeApi = {
  recommend: {
    getList: (params) => request.get(HOST + '/api/committee/recommend/list', { params })
  },
  report: {
    getList: (params) => request.get(HOST + '/api/committee/report/list', { params }),
    check:   (data)   => request.put(HOST + '/api/committee/report/check', data)
  },
  online: {
    getList: (params) => request.get(HOST + '/api/committee/online/list', { params })
  },
  user: {
    list:     (params) => request.get(HOST + '/api/committee/user/list', { params }),
    // 【修复·尾部斜杠】同 admin.js，后端注册的是 '/api/committee/user/'（带尾斜杠）
    update:   (data)   => request.put(HOST + '/api/committee/user/', data),
    create:   (data)   => request.post(HOST + '/api/committee/user/', data),
    download: ()       => request.get(HOST + '/api/committee/user/export', { responseType: 'blob' }),
    // 【修复·路径笔误】dist 原文为 w.host+"/committee/api/user" —— 少了两样东西：
    //   1) 开头的 /api 前缀  2) 结尾的斜杠
    // 证据（dist/app.js 原文）：
    //   deletedUser(e){return O.delete(w.host+"/committee/api/user",{data:e})}
    // 后端实际注册的是 DELETE /api/committee/user/（见 openapi.json，
    // 与 apps/api/views.py 中 register_user_routes("committee", ...) 的 {prefix}/user/）。
    // 按 dist 原样请求会打到 /ylbxt/committee/api/user，无论后端如何实现都必然 404。
    // 因此这里判定为【原版笔误】而非【业务逻辑】，予以修正 —— 方法、参数、语义完全不变。
    // 说明：该接口在本项目当前代码中没有任何调用方（委员会用户页 /committee/user 仍是占位页），
    // 修正它是为了后续还原该页面时不至于踩到同一个坑。
    deletedUser: (data) => request.delete(HOST + '/api/committee/user/', { data }),
    restoreUser: (data) => request.put(HOST + '/api/committee/user/restore', data)
  },
  index: {
    getIndexTotal: () => request.get(HOST + '/api/committee/index/total')
  }
}
