/**
 * 管理员 API (type=3)
 *
 * 【可信度：A】直接照搬 dist 中 const E = {recommend, report, user, index, log, person, chouqian, exportData}
 */

import request, { HOST } from '@/utils/request'

export const adminApi = {
  recommend: {
    getList: (params) => request.get(HOST + '/api/admin/recommend/list', { params })
  },
  report: {
    getList: (params) => request.get(HOST + '/api/admin/report/list', { params }),
    check:   (data)   => request.put(HOST + '/api/admin/report/check', data)
  },
  user: {
    list:     (params) => request.get(HOST + '/api/admin/user/list', { params }),
    // 【修复·尾部斜杠】原为 '/api/admin/user'（无尾斜杠），后端注册的是 '/api/admin/user/'。
    // 依据：yilinbei/apps/api/views.py 的 register_user_routes() 使用
    //   router.put/post/delete("{prefix}/user/")   ← 路径字面量自带尾斜杠
    // 且 Django Ninja 在 api/ 上内部路由，不经过 Django 的 APPEND_SLASH 重定向，
    // 因此少一个斜杠不会被 301 补上，而是直接 404 —— 管理员的新增/修改用户会静默失败。
    // 这是「修复」而非「改变业务逻辑」：接口语义与字段完全不变，只补齐路径。
    update:   (data)   => request.put(HOST + '/api/admin/user/', data),
    create:   (data)   => request.post(HOST + '/api/admin/user/', data),
    download: ()       => request.get(HOST + '/api/admin/user/export', { responseType: 'blob' })
  },
  index: {
    getIndexTotal: () => request.get(HOST + '/api/admin/index/total')
  },
  log: {
    list: (params) => request.get(HOST + '/api/admin/log/list', { params })
  },
  person: {
    list:   (params) => request.get(HOST + '/api/admin/person/list', { params }),
    update: (data)   => request.put(HOST + '/api/admin/person', data)
  },
  chouqian: {
    getByType:  (type)  => request.get(HOST + '/api/admin/chouqian/' + type),
    update:     (data)  => request.put(HOST + '/api/admin/chouqian/update', data),
    exportOne:  (type)  => request.get(HOST + '/api/admin/chouqian/export/' + type, { responseType: 'blob' }),
    exportAll:  ()      => request.get(HOST + '/api/admin/chouqian/exportall', { responseType: 'blob' })
  },
  exportData: {
    data1: () => request.get(HOST + '/api/admin/export/data1', { responseType: 'blob' }),
    data2: () => request.get(HOST + '/api/admin/export/data2', { responseType: 'blob' })
  }
}
