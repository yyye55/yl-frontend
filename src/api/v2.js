/**
 * V2 系列 API（升级版）
 *
 * 【可信度：A】直接照搬 dist 中 const J / K / Y
 * V2 接口增加了 team / student / leader 等独立实体。
 *
 * ===========================================================================
 * 状态：死代码（src 无调用方，对应后端路径不存在）
 * ---------------------------------------------------------------------------
 * A 类（8 条）：去掉 /v2 即对应当前后端
 *   GET  /api/v2/admin/report/list     → /api/admin/report/list
 *   PUT  /api/v2/admin/report/check   → /api/admin/report/check
 *   GET  /api/v2/committee/report/list → /api/committee/report/list
 *   POST /api/v2/school/report/create  → /api/school/report/create
 *   GET  /api/v2/school/report/list   → /api/school/report/list
 *   DEL  /api/v2/school/report/delete/{id} → /api/school/report/delete/{id}
 *   GET  /api/v2/school/report/{id}  → /api/school/report/{id}
 *   PUT  /api/v2/school/report/update → /api/school/report/update
 *
 * B 类（21 条）：当前后端不存在，包括 team/student/leader 系列
 *   和 admin/committee 侧的 report/{id} / report/update
 *
 * 注：v2committeeApi.report.check 和 team.check 写的是
 *   /api/v2/committee/reportcheck 和 /api/v2/committee/teamcheck
 *   （少了斜杠），即便后端有 v2 也对不上。
 * ===========================================================================
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
