<template>
  <div style="display:inline-block;margin:5px">
    <el-button @click="showFile">文件下载</el-button>

    <!-- append-to-body：本组件在 el-table 的操作列单元格里，不加会被后面的列盖住。
         原因见 ShowPerson.vue 顶部关于 .el-table__cell{z-index:1} 的说明。 -->
    <el-dialog v-model="dialogTableVisible" append-to-body>
      <div class="detail-content">
        <h2>文件列表</h2>
        <div class="files">
          <el-table :data="files" border style="width:100%">
            <!-- dist 原文：type="index" 与 prop="date" 同时存在；type=index 时 prop 不生效，
                 Element UI 与 Element Plus 行为一致，保留原样不改。 -->
            <el-table-column type="index" prop="date" label="序号" width="60" />
            <el-table-column prop="type" label="文件类型" width="100px">
              <template #default="{ row }">
                <p v-if="row.type === 0">单位扫描件</p>
                <p v-else-if="row.type === 1">大学组节目</p>
                <p v-else-if="row.type === 2">教师组节目</p>
                <p v-else>未知</p>
              </template>
            </el-table-column>
            <el-table-column label="文件">
              <template #default="{ row }">
                <a
                  v-for="f in row.files"
                  :key="f.id"
                  :href="f.url"
                  target="_blank"
                  style="text-decoration:none;color:#1890FF;margin:5px"
                  @click.prevent="download(f)"
                >{{ f.name }}</a>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
/**
 * ShowScFile 扫描件展示组件
 *
 * 【可信度：A】逐行照搬 dist 中 chunk-112ce133 的模块 f993（被 /admin/scan 与 /committee/scan 共用）。
 * 原文组件选项：
 *
 *   name:"ShowScFile",
 *   props:{ data:{default:[]}, isShow:{default:!1} },
 *   data(){ return { dialogTableVisible:!1, files:[], player:null, show:!1 } },
 *   methods:{
 *     showFile(){
 *       this.dialogTableVisible = !0
 *       this.isShow
 *         ? this.files = this.data
 *         : this.data.file
 *           ? this.$api.files.getFileList({ids:JSON.parse(this.data.file)}).then(({data:e})=>{ 0===e.code&&(this.files=e.data) })
 *           : this.$api.files.getFileList({ids:JSON.parse(this.data.files)}).then(({data:e})=>{ 0===e.code&&(this.files=e.data) })
 *     },
 *     showMoive(e){ this.show=!0, this.player.load("http://chimee.org/vod/1.mp4") },
 *     showImg(e){ this.$hevueImgPreview(e.url) },
 *     download(e,t){ ... }
 *   }
 *
 * 原文模板里 rows[i].files 是「数组套数组」：每个 scanfile 记录的 files 字段本身是一个
 * 文件对象数组（形如 [{id,name,url}]），所以列内用 v-for 展开成多个 <a>。
 *
 * 【未迁移项 —— 均为 dist 中的死代码，理由同 MainLayout 未移植 openNew/handleClick】
 *  1. showMoive / showImg / download 三个方法在原文模板中从未被调用；
 *     （注意：见下方 download(f) 的【第十二届修复】说明 —— 该处新加的 download
 *      与 dist 这笔死方法同名，但不是同一段代码，原文那笔仍未被移植。）
 *  2. 原文末尾的 <div id="wrapper" v-show="show"> 只有一个「关闭」按钮，而
 *     show 仅由死方法 showMoive 置为 true，即该节点在 dist 中恒不可见，故未移植。
 *
 * 【依赖说明】原文用全局插件 this.$hevueImgPreview 做图片预览，该插件未随 dist 提供；
 * 仅被死方法 showImg 使用，因此本项目未引入替代实现。
 *
 * 后端对应接口：GET /api/file/list?ids[]=...（见 apps/api/views.py 的 file_list，
 * request_ids 同时兼容 ids[] 与 ids 两种写法）。ids 由 JSON 字符串解析而来，
 * axios 默认序列化为 ids[]=a&ids[]=b，与后端 getlist("ids[]") 对应。
 */

import { ref } from 'vue'
import { fileApi } from '@/api'
import { downloadRemoteFile } from '@/utils/download'

const props = defineProps({
  data: { type: Array, default: () => [] },
  isShow: { type: Boolean, default: false }
})

const dialogTableVisible = ref(false)
const files = ref([])

function showFile() {
  dialogTableVisible.value = true
  if (props.isShow) {
    files.value = props.data
    return
  }
  // 原文用 this.data.file / this.data.files 两个分支，且都走 JSON.parse；
  // 这里保持同样的取值顺序与解析方式。
  const raw = props.data && (props.data.file || props.data.files)
  if (!raw) return
  fileApi.getFileList({ ids: JSON.parse(raw) }).then(({ data: res }) => {
    if (res.code === 0) files.value = res.data
  })
}

/**
 * 【第十二届修复】扫描件下载：改用原始文件名存盘
 *
 * 原文模板（dist chunk-112ce133 模块 f993）是
 *     <a :href="f.url" :download="row.filename">
 * 两个问题叠加，导致存盘名变成 OSS 的 ObjectKey（一串 UUID）：
 *
 *   1) **字段取错**：这里的 row 是 scan_files 记录
 *      {id,user_id,type,files,status,remark,created_at,updated_at}，**根本没有
 *      filename 字段**，row.filename 恒为 undefined；而 Vue 3 对 undefined 的
 *      动态属性绑定会把这个属性整个**移除**（不是写成 "undefined"）。真正的原始
 *      文件名在 row.files[i].name —— 见本组件头部说明与 UploadScanDialog.vue 里
 *      push 的 {uid,url,name,size,type}。
 *   2) **跨域下 download 属性本就无效**：f.url 是 OSS 绝对地址，与本站不同源，
 *      HTML 规范规定这种情况下浏览器忽略 download，退回用 URL 最后一段命名。
 *
 * 只修 1) 没用，所以改为自己取 Blob 再用同源的 blob: URL 触发下载，
 * 具体见 @/utils/download.js 的说明。`f.name || f.filename` 是为了同时兼容
 * isShow=false 那条分支（走 /api/file/list，返回的是 Files 记录，字段名是 filename）。
 */
function download(f) {
  downloadRemoteFile(f.url, f.name || f.filename)
}
</script>

<style lang="scss" scoped>
/* 照搬 dist/css/chunk-112ce133.e6329f5f.css 中 [data-v-2be81698] 作用域的规则 */
.detail-content {
  position: relative;
  height: 100%;
}

.files {
  text-align: left;
  margin: 10px 0;

  p {
    color: #8c939d;
    margin: 10px 0;
    text-align: center;
  }

  div {
    font-weight: 700;
  }
}
</style>
