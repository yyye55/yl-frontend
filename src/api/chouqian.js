/**
 * 抽签系统 API（旧前缀 /api/chouqian/*）
 *
 * 【可信度：A】直接照搬 dist 中 const te
 *
 * ===========================================================================
 * 【重要：本模块 7 个接口的路径前缀与当前后端不一致，调用必然 404】
 * ===========================================================================
 * 已逐条核对 ../yilinbei/openapi.json：不存在任何以 /api/chouqian/ 开头的路径。
 * 当前后端的抽签接口统一挂在 /api/admin/chouqian/ 前缀之下：
 *     GET  /api/admin/chouqian/{type}
 *     PUT  /api/admin/chouqian/update
 *     GET  /api/admin/chouqian/export/{type}
 *     GET  /api/admin/chouqian/exportall
 *
 * 【但本模块并非重构时编造】：dist/app.js 中确实存在
 *   host+"/api/chouqian/school/list" / "/api/chouqian/jiemu/all/" 等 7 条，
 * 即原始前端用的是旧前缀，属于**dist 与后端版本不匹配**，
 * 而非本项目写错。
 *
 * 【可用的等价接口】adminApi.chouqian（见 ./admin.js）的 4 个方法
 * 与上述后端路径**逐条吻合**，是当前后端下抽签功能的正确入口：
 *     adminApi.chouqian.getByType / update / exportOne / exportAll
 *
 * 【当前状态】src 下没有页面引用本模块；而 /chouqian/index、/chouqian/do
 * 两个视图目前仍是占位页（el-empty）。也就是说抽签功能是「前端页面未还原」，
 * 而不是「接口不可用」——后续还原时应走 adminApi.chouqian，不要用本模块。
 *
 * 【处理决定：保留，不删除】理由同 v2.js —— 它是 dist 的忠实组成部分。
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
