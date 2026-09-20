/**
 * 省级 API (type=4)
 *
 * 【可信度：A】直接照搬 dist 中 const C = {report, recommend, index}
 */

import request, { HOST } from '@/utils/request'

export const provinceApi = {
  report: {
    create:  (data)   => request.post(HOST + '/api/province/report/create', data),
    getList: (params) => request.get(HOST + '/api/province/report/list', { params }),
    delete:  (data)   => request.delete(HOST + '/api/province/report/delete/' + data.id),
    getById: (id)     => request.get(HOST + '/api/province/report/' + id),
    update:  (data)   => request.put(HOST + '/api/province/report/update', data)
  },
  recommend: {
    createAndUpdate: (data)   => request.post(HOST + '/api/province/recommend/cau', data),
    getList:         (params) => request.get(HOST + '/api/province/recommend/list', { params })
  },
  index: {
    getIndexTotal:   () => request.get(HOST + '/api/province/index/total'),
    getIndexPercent: () => request.get(HOST + '/api/province/index/percent')
  }
}
