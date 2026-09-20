/**
 * 抽签系统 API（旧前缀 /api/chouqian/*）
 *
 * 【可信度：A】直接照搬 dist 中 const te
 *
 * ===========================================================================
 * 状态：死代码（src 无调用方，对应后端路径不存在）
 * ---------------------------------------------------------------------------
 * 后端对应（admin/chouqian/ 4 条）：
 *   school.list / jiemu.all/{type} → GET  /api/admin/chouqian/{type}
 *   school.update / jiemu.update   → PUT  /api/admin/chouqian/update
 *   school.export / jiemu.export   → GET  /api/admin/chouqian/export/{type}
 *   jiemu.exportAll               → GET  /api/admin/chouqian/exportall
 *
 * 当前实际使用的是 adminApi.chouqian（见 ./admin.js），与本模块无关。
 * ===========================================================================
 */

import request, { HOST } from '@/utils/request'

export const chouqianApi = {
  school: {
    list:   ()      => request.get(HOST + '/api/chouqian/school/list'),
    update: (data)  => request.put(HOST + '/api/chouqian/school/update', data),
    export: ()      => request.get(HOST + '/api/chouqian/school/export/', { responseType: 'blob' })
  },
  JieMu: {
    all:        (type)  => request.get(HOST + '/api/chouqian/jiemu/all/' + type),
    update:     (data)  => request.put(HOST + '/api/chouqian/jiemu/update', data),
    exportOne:  (type)  => request.get(HOST + '/api/chouqian/jiemu/export/' + type, { responseType: 'blob' }),
    exportAll:  ()      => request.get(HOST + '/api/chouqian/jiemu/exportall', { responseType: 'blob' })
  }
}
