/**
 * 学校 API (type=0)
 *
 * 【可信度：A】直接照搬 dist 中 const F
 */

import request, { HOST } from '@/utils/request'

export const schoolApi = {
  report: {
    create:  (data)   => request.post(HOST + '/api/school/report/create', data),
    getList: (params) => request.get(HOST + '/api/school/report/list', { params }),
    delete:  (data)   => request.delete(HOST + '/api/school/report/delete/' + data.id),
    getById: (id)     => request.get(HOST + '/api/school/report/' + id),
    update:  (data)   => request.put(HOST + '/api/school/report/update', data)
  },
  recommend: {
    createAndUpdate: (data)   => request.post(HOST + '/api/school/recommend/cau', data),
    getList:         (params) => request.get(HOST + '/api/school/recommend/list', { params })
  },
  index: {
    getIndexTotal:   () => request.get(HOST + '/api/school/index/total'),
    getIndexPercent: () => request.get(HOST + '/api/school/index/percent')
  }
}
