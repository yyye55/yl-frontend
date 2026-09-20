/**
 * 市级 API (type=1)
 *
 * 【可信度：A】直接照搬 dist 中 const N
 */

import request, { HOST } from '@/utils/request'

export const cityApi = {
  report: {
    create:  (data)   => request.post(HOST + '/api/city/report/create', data),
    getList: (params) => request.get(HOST + '/api/city/report/list', { params }),
    delete:  (data)   => request.delete(HOST + '/api/city/report/delete/' + data.id),
    getById: (id)     => request.get(HOST + '/api/city/report/' + id),
    update:  (data)   => request.put(HOST + '/api/city/report/update', data)
  },
  recommend: {
    createAndUpdate: (data)   => request.post(HOST + '/api/city/recommend/cau', data),
    getList:         (params) => request.get(HOST + '/api/city/recommend/list', { params })
  },
  index: {
    getIndexTotal:   () => request.get(HOST + '/api/city/index/total'),
    getIndexPercent: () => request.get(HOST + '/api/city/index/percent')
  }
}
