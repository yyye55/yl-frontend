/**
 * V2 系列 API（升级版）
 *
 * 【可信度：A】直接照搬 dist 中 const J / K / Y
 * V2 接口增加了 team / student / leader 等独立实体。
 *
 * ===========================================================================
 * 【重要：本模块的 29 个接口在当前后端全部不存在】
 * ===========================================================================
 * 已逐条核对 ../yilinbei/openapi.json（后端共 74 条路径）：
 *   - 不存在任何 /api/v2/** 路径。
 * 因此本模块任何一个方法调用都会得到 404。
 *
 * 【但这**不是**本项目重构时编造的】：
 * 已全量检索 dist/app.js，`/api/v2/...` 字符串确实存在且与下方逐条一致
 * （dist 原文形如 `O.get(w.host+"/api/v2/admin/report/list",{params:e})`）。
 * 结论：这是**原始前端就带着、而当前后端未实现**的一组接口，
 * 猜测属于原始系统后续版本或另一分支的功能。
 *
 * 【当前状态】src 下没有任何页面引用本模块（全量检索确认）。
 *
 * 【处理决定：保留，不删除】
 * 依据工程原则「原始 dist 证据 > 当前源码证据」以及「禁止删除已有功能」：
 * 本模块是 dist 的忠实组成部分，删除它等于抹掉原项目存在过的事实。
 * 故保留原样，仅在此标注其不可用，避免后续有人误用后发现 404 却找不到原因。
 * 若确认这些接口已废弃，应由项目负责人决定删除，而不是在审查中擅自移除。
 */

import request, { HOST } from '@/utils/request'

/* ============ V2 管理员 ============ */
export const v2adminApi = {
  report: {
    getList: (params) => request.get(HOST + '/api/v2/admin/report/list', { params }),
    check:   (data)   => request.put(HOST + '/api/v2/admin/report/check', data),
    getById: (id)     => request.get(HOST + '/api/v2/admin/report/' + id),
    update:  (data)   => request.put(HOST + '/api/v2/admin/report/update', data)
  },
  team: {
    getList: (params) => request.get(HOST + '/api/v2/admin/team/list', { params }),
    getById: (id)     => request.get(HOST + '/api/v2/admin/team/' + id),
    check:   (data)   => request.put(HOST + '/api/v2/admin/team/check', data)
  },
  student: {
    getList: (params) => request.get(HOST + '/api/v2/admin/student/list', { params }),
    update:  (data)   => request.put(HOST + '/api/v2/admin/student', data)
  },
  leader: {
    getList: (params) => request.get(HOST + '/api/v2/admin/leader/list', { params }),
    update:  (data)   => request.put(HOST + '/api/v2/admin/leader', data)
  }
}

/* ============ V2 委员会 ============ */
export const v2committeeApi = {
  report: {
    getList: (params) => request.get(HOST + '/api/v2/committee/report/list', { params }),
    getById: (id)     => request.get(HOST + '/api/v2/committee/report/' + id),
    check:   (data)   => request.put(HOST + '/api/v2/committee/reportcheck', data)
  },
  team: {
    getList: (params) => request.get(HOST + '/api/v2/committee/team/list', { params }),
    getById: (id)     => request.get(HOST + '/api/v2/committee/team/' + id),
    check:   (data)   => request.put(HOST + '/api/v2/committee/teamcheck', data)
  }
}

/* ============ V2 学校 ============ */
export const v2schoolApi = {
  report: {
    create:  (data)   => request.post(HOST + '/api/v2/school/report/create', data),
    getList: (params) => request.get(HOST + '/api/v2/school/report/list', { params }),
    delete:  (data)   => request.delete(HOST + '/api/v2/school/report/delete/' + data.id),
    getById: (id)     => request.get(HOST + '/api/v2/school/report/' + id),
    update:  (data)   => request.put(HOST + '/api/v2/school/report/update', data)
  },
  team: {
    create:   (data)   => request.post(HOST + '/api/v2/school/team/create', data),
    getList:  (params) => request.get(HOST + '/api/v2/school/team/list', { params }),
    delete:   (data)   => request.delete(HOST + '/api/v2/school/team/delete/' + data.id),
    getById:  (id)     => request.get(HOST + '/api/v2/school/team/' + id),
    getStatus:()       => request.get(HOST + '/api/v2/school/team/status'),
    update:   (data)   => request.put(HOST + '/api/v2/school/team/update', data),
    check:    (data)   => request.put(HOST + '/api/v2/school/team/check', data)
  }
}
