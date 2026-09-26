/**
 * 中小学端 API (type=5)
 *
 * 【这个文件从哪来】逐行照搬 src/api/city.js，只把路径里的 `/api/city/` 换成
 * `/api/primary/`。不是「参考」，是同一份契约换了前缀 —— 后端接口文档明确写了
 * 「中小学端报名功能与原市州端 /api/city/* 同构，前端组件可直接复用，只换前缀」。
 *
 * 【为什么不做成一个函数带参数】
 * 项目现有的写法就是「一个端一个文件 + 每条路径写全」：city.js / school.js /
 * admin.js / committee.js 四份都是这么并排放着的。这里跟随既有惯例 ——
 * 好处是任何一条接口出问题，grep 路径就能直接定位到唯一一处；
 * 代价是有重复，与 city.js / school.js 之间的重复性质完全一样。
 *
 * 【为什么比 city.js 少两组方法】
 *   · 没有 recommend：中小学端菜单里没有「优秀组织奖申报」这一项，
 *     后端文档也未提供 /api/primary/recommend/*。不预先写好没人调的死函数。
 *   · 没有 index.getIndexPercent：这一条是**对齐高校端的现状**得到的结论，不是漏写 ——
 *     src/views/school/index.vue 的 mounted 里只调了 getIndexTotal()，
 *     getPercent() 从原 dist 起就没有被调用过（见该文件第 47-52 行的说明）。
 *     既然大学组首页没接这个面板，中小学组也不接。
 *   · 没有 index.getIndexEstablishment：后端有这个接口（/api/primary/index/establishment
 *     乐团类别统计），但需求方明确说明中小学端首页不接这一块，故不写。
 *
 * 【路径写法为什么是 HOST + '/api/primary/...'】
 * 与 city.js / school.js 逐字一致。axios 实例的 baseURL 是兜底不是开关
 * （见 utils/request.js 第 41-44 行），真正的地址由每个调用点自己拼全。
 */

import request, { HOST } from '@/utils/request'

export const primaryApi = {
  report: {
    create:  (data)   => request.post(HOST + '/api/primary/report/create', data),
    getList: (params) => request.get(HOST + '/api/primary/report/list', { params }),
    delete:  (data)   => request.delete(HOST + '/api/primary/report/delete/' + data.id),
    getById: (id)     => request.get(HOST + '/api/primary/report/' + id),
    update:  (data)   => request.put(HOST + '/api/primary/report/update', data)
  },
  index: {
    getIndexTotal: () => request.get(HOST + '/api/primary/index/total')
  }
}
