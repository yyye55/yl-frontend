<template>
  <div class="bg">
    <div class="options">
      <el-input
        v-model="keyword"
        class="input-with-select"
        placeholder="请输入内容"
        @change="getData"
      >
        <template #append>
          <el-button><el-icon><Search /></el-icon></el-button>
        </template>
      </el-input>
      <el-button type="primary" @click="reflush"> 刷新</el-button>
    </div>

    <div class="content">
      <div class="bg-list">
        <p class="title">报名列表</p>
        <el-table :data="data" border style="width:100%">
          <!-- dist 原文为 prop="date" + type="index"；type=index 时 prop 不生效，保留原样 -->
          <el-table-column prop="date" type="index" label="序号" />
          <el-table-column prop="nickname" label="学校名称" />
          <el-table-column label="操作">
            <template #default="{ row }">
              <ShowScFile v-if="row.scanfile.length > 0" :data="row.scanfile" :is-show="true" />
              <el-button
                v-else
                disabled
                type="danger"
                style="margin-left:10px"
              > 没有扫描文件上传 </el-button>
            </template>
          </el-table-column>
        </el-table>

        <el-pagination
          v-model:current-page="page"
          v-model:page-size="limit"
          class="my-pagination"
          :page-sizes="[20, 50, 100, 200]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>

    <!-- dist 里这个 el-dialog 绑的是 dialogFileVisible / srcList，
         而唯一会写它们的 showFiles() 在原文模板中从未被调用，故对话框中恒为空。
         按原样保留结构与数据源，不额外接新的触发入口。 -->
    <el-dialog v-model="dialogFileVisible" width="700px">
      <div class="detail-content" style="margin:auto">
        <el-image
          v-for="(src, i) in srcList"
          :key="i"
          :src="src"
          :preview-src-list="srcList"
          style="width:100px;height:100px;margin:auto"
        />
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
/**
 * 管理员 - 参展扫描件列表（路由 /admin/scan）
 *
 * 【可信度：A】逐行照搬 dist/chunk-112ce133 的模块 114e。原文渲染函数与选项：
 *
 *   <div class="bg">
 *     <div class="options">
 *       <el-input class="input-with-select" placeholder="请输入内容" size="mini"
 *                 @change="getData" v-model="keyword">
 *         <el-button slot="append" icon="el-icon-search" />
 *       </el-input>
 *       <el-button type="primary" size="mini" @click="reflush"> 刷新</el-button>
 *     </div>
 *     <div class="content"><div class="bg-list">
 *       <p class="title">报名列表</p>
 *       <el-table :data="data" border size="mini">
 *         <el-table-column prop="date" type="index" label="序号" />
 *         <el-table-column prop="nickname" label="学校名称" />
 *         <el-table-column label="操作">
 *           row.scanfile.length>0 ? <ShowScFile :data="row.scanfile" :isShow="true" />
 *                                : <el-button disabled size="mini" type="danger">没有扫描文件上传</el-button>
 *       </el-table>
 *       <el-pagination class="my-pagination" :current-page="page" :page-sizes="[20,50,100,200]"
 *                      :page-size="limit" layout="total, sizes, prev, pager, next, jumper" :total="total" />
 *     </div></div>
 *     <el-dialog :visible="dialogFileVisible" width="700px"> <el-image v-for...> </el-dialog>
 *   </div>
 *
 *   name:"tuijian",
 *   data(){ return { keyword:null, page:1, limit:20, total:0, data:[], ids:[], provinceId:"",
 *                    provinces:[], dialogFileVisible:!1, srcList:[], type:null } },
 *   mounted(){ this.getData() },
 *   methods:{
 *     handleSizeChange(e){ this.page=1, this.limit=e, this.getData() },
 *     reflush(){ this.page=1, this.getData() },        // ← 与上面一行的 handleSizeChange 不同，
 *     handleCurrentChange(e){ this.page=e, this.getData() },   //   reflush 会先把 page 归 1
 *     getData(){ const e={page:this.page,limit:this.limit,keyword:this.keyword}
 *                this.$api.image.getList(e).then(({data:e})=>{
 *                  0===e.code ? (this.total=e.count, this.data=e.data) : ElMessage.error(e.msg) }) }
 *   }
 *
 * 【本页旧实现的问题（已整体重写）】
 * 旧版把 /admin/scan 做成了「摄像头 + face-api 人脸识别 + 签到列表」，页面标题写作「扫码签到」。
 * 但经全量检索 dist 的 78 个 chunk：
 *   - face-api.js 只出现在 chunk-7e023bd8 一个 chunk 里，而该 chunk 对应的是 /test 路由；
 *   - /admin/scan 对应的 chunk-112ce133 中不含任何 face-api 代码，也从不调用 /api/scan/cau。
 * 因此旧版的摄像头、人脸检测、签到列表全部是凭空捏造，与本页实际功能（查看各校上传的扫描件）无关。
 *
 * 【与后端契约的核对】
 *   请求：GET /api/scan/list?page=&limit=&keyword=   —— 与 apps/api/views.py 的 scan_list 一致
 *   响应：{data:[...], count:N, code:0, msg:''}      —— list_page() 的分页信封
 *   行字段：nickname（user_dict 提供）、scanfile（scan_list 为每个用户附加的扫描件数组）
 *
 * 【未迁移项】data() 里的 ids / provinceId / provinces / type 四项在原文模板与方法中均未被使用，
 * 属原版遗留字段，不移植。
 */

import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import { scanApi } from '@/api'
import ShowScFile from '@/components/common/ShowScFile.vue'

const keyword = ref(null)
const page = ref(1)
const limit = ref(20)
const total = ref(0)
const data = ref([])
const dialogFileVisible = ref(false)
const srcList = ref([])

function getData() {
  const params = { page: page.value, limit: limit.value, keyword: keyword.value }
  scanApi.getList(params).then(({ data: res }) => {
    if (res.code === 0) {
      total.value = res.count
      data.value = res.data
    } else {
      ElMessage.error(res.msg)
    }
  })
}

// 注意：dist 中 reflush 与 handleSizeChange 并不相同 —— reflush 会先把 page 归 1。
// 二者看起来重复，但这是原文行为，保留不改。
function reflush() {
  page.value = 1
  getData()
}

function handleSizeChange(size) {
  page.value = 1
  limit.value = size
  getData()
}

function handleCurrentChange(current) {
  page.value = current
  getData()
}

getData()
</script>

<style lang="scss" scoped>
/* 照搬 dist/css/chunk-112ce133.e6329f5f.css 中 [data-v-5d031f3a] 作用域的规则 */
.bg {
  position: relative;
  background: #fff;
  padding: 10px;
  min-height: calc(100% - 20px);
  width: calc(100% - 20px);
}

.options {
  box-shadow: 1px 1px 5px 1px #8c939d;
  padding: 10px 20px 0 20px;
  display: flex;
  justify-content: flex-start;
  flex-wrap: wrap;
  align-items: center;

  > * {
    margin-bottom: 10px;
    margin-right: 10px;
  }

  > .el-input {
    width: 220px !important;
  }
}

.content {
  position: relative;
  background-color: #fff;
  padding: 10px;
  margin-top: 20px;
  box-shadow: 1px 1px 5px 1px #8c939d;
  min-height: calc(100% - 150px);
  width: calc(100% - 20px);
}

.title {
  position: relative;
  border-bottom: 1px solid #dcdcdc;
  line-height: 30px;
  padding-left: 20px;
  margin-bottom: 10px;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    bottom: 5px;
    width: 3px;
    height: 20px;
    background-color: #036;
  }
}

.my-pagination {
  margin-top: 10px;
}

.detail-content {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr 1fr;
  grid-row-gap: 10px;
}
</style>
