/**
 * 委员会 API (type=2)
 *
 * 【可信度：A】直接照搬 dist 中 const q = {...}
 *
 * 【与 dist 的差异】
 *   1) update 的 URL 补齐了尾斜杠（原为 '/api/committee/user'），属路径笔误修正，
 *      详见方法上方的注释。
 *   2) 删除了 dist 里有、但本项目组委会侧不使用的三个方法：
 *        create       POST   /api/committee/user/
 *        deletedUser  DELETE /api/committee/user/       （dist 原文写作 "/committee/api/user"，缺前缀与尾斜杠）
 *        restoreUser  PUT    /api/committee/user/restore
 *      依据：组委会页面 /committee/user 上能点的只有 搜索/刷新/分页(list)、
 *      操作列「重置密码」(update)、「导出所有账号」(download)，模板里没有任何
 *      「新增账号 / 删除账号 / 恢复账号」按钮；全仓 grep 这三个方法名 0 个调用方
 *      （也无 api.user[...] 这类动态取用）。
 *      后端这三条路由仍在（apps/api/views.py register_user_routes("/committee", 2)，
 *      见 openapi.json），删除的只是前端未使用的定义；将来若要做这三个功能需一并还原。
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
    download: ()       => request.get(HOST + '/api/committee/user/export', { responseType: 'blob' })
  },
  index: {
    getIndexTotal: () => request.get(HOST + '/api/committee/index/total'),
    // 【第十二届新增】同 admin.js，只换权限前缀。组委会与管理员看到的是同一份全国数据。
    getIndexEstablishment: () => request.get(HOST + '/api/committee/index/establishment')
  },
  // 【新增·组委会整组导出】原 dist 里组委会页面借 communal.exportGroupData
  // （GET /api/export/data）做整组导出；后端为修 P1-2 跨校数据泄漏给那条接口加了
  // user_id 过滤，组委会名下没有报名，导出只剩表头。现改走组委会专属入口：
  // 后端 role_error(request, 2) 门禁 + 只按 group 过滤（无 user_id），
  // 数据范围与 Excel 格式均对齐原版 ExportController::exportReportData。
  exportData: {
    data: (params) => request.get(HOST + '/api/committee/export/data', { params, responseType: 'blob' })
  }
}
