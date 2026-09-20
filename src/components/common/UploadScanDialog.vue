<template>
  <el-dialog
    v-model="visible"
    title="上传审核图"
    :close-on-click-modal="false"
    @closed="beforeClose"
  >
    <el-upload
      class="upload-demo"
      drag
      :action="domain"
      :data="QiniuData"
      v-model:file-list="fileList"
      :limit="limit"
      :before-upload="beforeUpload"
      :on-success="uploadSuccess"
      :on-remove="removeSuccess"
      :on-exceed="handleExceed"
    >
      <!--
        dist 原文是 <i class="el-icon-upload">。Element Plus 把图标整体迁到了
        @element-plus/icons-vue，不再保留 el-icon-* 字体图标，故改用官方等价写法
        <el-icon class="el-icon--upload"><UploadFilled /></el-icon>（拖拽区的图标样式类
        el-icon--upload 由 Element Plus 自身提供）。
      -->
      <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
      <div class="el-upload__text">将文件拖到此处，或<em>点击上传</em></div>
      <template #tip>
        <div class="el-upload__tip">{{ tip }}</div>
      </template>
    </el-upload>

    <el-button
      class="enter-upload"
      style="margin-top: 20px"
      type="primary"
      size="mini"
      @click="updateFile"
    >
      确认上传
    </el-button>
    <el-button
      class="enter-upload"
      style="margin-top: 20px"
      type="danger"
      size="mini"
      @click="visible = false"
    >
      取消
    </el-button>
  </el-dialog>
</template>

<script setup>
/**
 * 盖章扫描件上传弹窗
 *
 * 【可信度：A】dist 的 /province/index（bec3）、/city/index（044d）、/school/index（5d2b）
 * 三个模块里，「上传审核图」这段 el-dialog + el-upload + 两个按钮的渲染函数逐字节相同，
 * 唯一的差异是 `limit`（city 为 1，school/province 为 2）和 el-upload__tip 的提示文案。
 * 因此按 dist 的事实拆出一个共享组件，而不是把同一段代码抄三遍。
 *
 * 原文（以 5d2b 为例）：
 *   t("el-dialog",{attrs:{title:"上传审核图",visible:e.dialogImageVisible,"close-on-click-modal":!1},
 *     on:{"update:visible":function(t){e.dialogImageVisible=t},closed:e.beforeClose}},[
 *     t("el-upload",{staticClass:"upload-demo",attrs:{drag:"",limit:2,"on-success":e.uploadSuccess,
 *       data:e.QiniuData,"before-upload":e.beforeUpload,action:e.domain,"file-list":e.fileList,
 *       "on-remove":e.removeSuccess,"on-exceed":e.handleExceed}},[...]),
 *     t("el-button",{...type:"primary",size:"mini",on:{click:e.updateFile}},[e._v(" 确认上传 ")]),
 *     t("el-button",{...type:"danger",size:"mini",on:{click:...dialogImageVisible=!1}},[e._v(" 取消 ")])
 *   ],1)
 *
 * 以下逐项记录移植方式与理由。
 *
 * 1) `:file-list` → `v-model:file-list`
 *    Element Plus 的 el-upload 内部用 useVModel(props,"fileList",undefined,{passive:true})
 *    管理列表（见 element-plus/es/components/upload/src/use-handlers.mjs:12），选中文件时
 *    handleStart 会整体替换该数组并回写父组件。dist 写的是单向 `:file-list`，配合
 *    uploadSuccess 里手工 push，在 Element UI 2 下二者最终收敛为一份；在 Element Plus 下
 *    沿用会得到**重复条目**（EP 自己加的那条 + 我们 push 的那条）。
 *    因此改为 v-model:file-list，并把 uploadSuccess 的 push 改成「按 uid 替换」，
 *    最终列表内容与 dist 完全一致（每条记录只有一份，且带七牛返回的 url）。
 *
 * 2) `openImageDialog()` → defineExpose({ open })
 *    dist 里是父组件的方法，先清空 fileList、拉取已有图片、取七牛 token，最后置
 *    dialogImageVisible=true。弹窗自包含后改为由父组件通过 ref 调用 open()，
 *    调用时机与内部动作顺序与 dist 逐行一致。
 *
 * 3) 内层预览弹窗与 handlePictureCardPreview 未移植（dist 中为死代码）
 *    dist 在外层 el-dialog 内部还嵌了一个
 *      t("el-dialog",{attrs:{visible:e.dialogVisible,"append-to-body":""}},[t("img",{...src:e.dialogImageUrl})])
 *    但它只由 handlePictureCardPreview(e) 打开，而 handlePictureCardPreview 在模板中
 *    **没有任何事件绑定引用**（已对 5d2b / 044d / bec3 三个模块逐一确认），
 *    即该预览层在当前 dist 中永远不可达。故不移植，避免留下永远弹不出来的空弹窗。
 *
 * 4) 保留 dist 的一处缺陷（不擅自修改业务逻辑，仅标注）
 *    beforeUpload 里 `this.QiniuData.key += this.rename(e.name)` 是**累加**，而只有
 *    uploadSuccess 才会把 key 重置回 "ylbxt/"。当用户一次选中两个文件时，第二个文件的
 *    上传 key 会变成 "ylbxt/随机名1随机名2"（第一个文件名被拼了进去）。
 *    这里按原样保留，仅记录，交由使用者决定是否修复。
 */

import { ref, reactive, computed } from 'vue'
import { UploadFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { scanApi } from '@/api/scan'
import { qiniuApi } from '@/api/misc'
import { rename } from '@/utils/excel'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** 最多可上传的文件数：city 为 1，school / province 为 2（dist 事实） */
  limit: { type: Number, default: 2 },
  /** el-upload__tip 文案，三个页面各不相同，由调用方给出 */
  tip: { type: String, required: true }
})

const emit = defineEmits(['update:modelValue'])

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

const fileList = ref([])
const filename = ref('')
const QiniuData = reactive({ token: '', key: 'ylbxt/' })
const domain = 'https://upload.qiniup.com'
const host = 'https://img.atyth.com/'

/** dist: getQiniuToken(){ this.$api.communal.getQiNiuToken().then(({data:e})=>{ 0===e.code ? this.QiniuData.token=e.uptoken : Message.error(e.msg) }) } */
function getQiNiuToken() {
  qiniuApi.getToken().then(({ data: res }) => {
    if (res.code === 0) QiniuData.token = res.uptoken
    else ElMessage.error(res.msg)
  })
}

/**
 * dist:
 *   beforeUpload(e){
 *     this.filename=e.name, this.QiniuData.key+=this.rename(e.name);
 *     const t=e.size/1024/1024<20, n="application/pdf"===e.type;
 *     return n ? (t ? (n&&t) : (Message.error("文件大小不能超过20M"),!1))
 *              : (Message.error("请上传 .pdf 文件"),!1)
 *   }
 * 三层嵌套三元与下面两个 if 完全等价，只是把「先判类型、再判体积」的求值顺序写清楚。
 */
function beforeUpload(file) {
  filename.value = file.name
  QiniuData.key += rename(file.name)

  const sizeOk = file.size / 1024 / 1024 < 20
  const isPdf = file.type === 'application/pdf'

  if (!isPdf) {
    ElMessage.error('请上传 .pdf 文件')
    return false
  }
  if (!sizeOk) {
    ElMessage.error('文件大小不能超过20M')
    return false
  }
  return true
}

/**
 * dist: uploadSuccess(e,t){ this.fileList.push({uid:t.uid,url:this.host+e.key,
 *        name:this.filename,size:t.size,type:t.raw.type}), this.QiniuData.key="ylbxt/" }
 * 改为「按 uid 替换 EP 已写入的那条」，避免 Element Plus 下出现重复条目（见文件头说明 1)。
 */
function uploadSuccess(res, file) {
  const item = {
    uid: file.uid,
    url: host + res.key,
    name: filename.value,
    size: file.size,
    type: file.raw.type
  }
  const list = fileList.value.slice()
  const i = list.findIndex((f) => f.uid === file.uid)
  if (i >= 0) list[i] = item
  else list.push(item)
  fileList.value = list

  QiniuData.key = 'ylbxt/'
}

/** dist: removeSuccess(e){ for(let t=0;t<this.fileList.length;t++) this.fileList[t].uid===e.uid && this.fileList.splice(t,1) } —— 语义相同，改为非原地过滤 */
function removeSuccess(file) {
  fileList.value = fileList.value.filter((f) => f.uid !== file.uid)
}

/** dist: handleExceed(e,t){ Message.error("文件数量超过限制！") } */
function handleExceed() {
  ElMessage.error('文件数量超过限制！')
}

/** dist: beforeClose(){ this.fileList=[] } */
function beforeClose() {
  fileList.value = []
}

/**
 * dist: updateFile(){ const e={type:0}; e.files=this.fileList;
 *        this.$api.image.uploadImage(e).then(e=>{ 0===e.data.code
 *          ? Message.success("上传成功！") : Message.error("上传失败！"), this.dialogImageVisible=!1 }) }
 * 注意 dist 用逗号运算符，所以无论成功失败都会关闭弹窗——这里保留同样的行为。
 */
function updateFile() {
  const data = { type: 0 }
  data.files = fileList.value

  scanApi.uploadImage(data).then((res) => {
    if (res.data.code === 0) ElMessage.success('上传成功！')
    else ElMessage.error('上传失败！')
    visible.value = false
  })
}

/** dist: openImageDialog(){ this.fileList=[]; $api.image.getImages({type:0}).then(...); this.dialogImageVisible=!0; this.getQiNiuToken() } */
function open() {
  fileList.value = []
  scanApi.getImages({ type: 0 }).then((res) => {
    if (res.data.code === 0 && res.data.data !== null) {
      for (let i = 0; i < res.data.data.files.length; i++) {
        fileList.value.push({
          uid: res.data.data.files[i].uid,
          name: res.data.data.files[i].name,
          url: res.data.data.files[i].url
        })
      }
    }
  })
  visible.value = true
  getQiNiuToken()
}

defineExpose({ open })
</script>
