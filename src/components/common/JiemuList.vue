<template>
  <div class="bg">
    <div class="options">
      <el-button class="menu-button" style="width: 100px" type="primary" @click="refresh">
        刷新
      </el-button>

      <!--
        仅市级/校级变体有上传入口；管理员与组委会变体没有。
        【第十二届改造·第二轮】`:action="domain"` / `:data="QiniuData"` 已去掉：
        上传改走阿里云 OSS（biz: doc，小文件由后端代传），凭证与 ObjectKey 都不再由
        模板下发，`:http-request="uploadFile"` 内部直接调 @/services/ossUpload。
      -->
      <template v-if="uploadApi">
        <el-upload
          class="upload-demo"
          :show-file-list="false"
          :before-upload="beforeUpload"
          :http-request="uploadFile"
        >
          <el-button size="small" type="primary">点击上传</el-button>
        </el-upload>
        <span> 只能上传PDF格式的文件，文件最大能上传20M! 请上传本地展演活动工作总结。 </span>
      </template>
    </div>

    <div class="content">
      <div class="bg-list">
        <p class="title">报名列表</p>
        <el-table :data="data" border style="width: 100%">
          <el-table-column
            type="index"
            prop="date"
            label="序号"
            :header-align="center ? 'center' : ''"
            :align="center ? 'center' : ''"
          />
          <el-table-column
            label="名称"
            :header-align="center ? 'center' : ''"
            :align="center ? 'center' : ''"
          >
            <template #default="{ row }">
              <!-- dist 原文：row.user 存在时才输出文本 -->
              <template v-if="row.user">{{ row.user.nickname }}---优秀组织奖申请表</template>
            </template>
          </el-table-column>
          <el-table-column
            prop="created_at"
            label="创建时间"
            :header-align="center ? 'center' : ''"
            :align="center ? 'center' : ''"
          />
          <el-table-column
            label="操作"
            width="440"
            :header-align="center ? 'center' : ''"
            :align="center ? 'center' : ''"
          >
            <template #default="{ row }">
              <el-button type="primary" @click="downloadFile(fileNameOf(row), row.file)">
                下载
              </el-button>
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

    <FileCover ref="fileshow" />
  </div>
</template>

<script setup>
/**
 * 优秀组织奖申报列表（dist 组件名 "jiemu"）
 *
 * 【可信度：A】逐行照搬 dist 中 5 个模块，它们共用同一份源码、编译成 5 个页面：
 *   /admin/recommend              f7aa  作用域 43031bc6   admin.recommend
 *   /committee/recommend          fc73  作用域 8ec6982c   committee.recommend
 *   /city/recommend/index         f479  作用域 8b0bXXXX   city.recommend
 *   /school/recommend/index       e791  作用域 XXXXXXXX   school.recommend
 * （第 5 个是 /province/recommend/index，省级端已下线，不在本项目内。）
 * 五者仅两处不同 —— 接口模块，以及「有没有上传入口」，据此分成两个变体：
 *   变体 A（admin / committee）：只有「刷新」，方法名 reflush()，QiniuData.key 前缀 "scdyz/"
 *   变体 B（city / school）：多一个 el-upload「点击上传」+ 提示文案，
 *                                     方法名 refresh()，QiniuData.key 前缀 "ylbxt/"，
 *                                     mounted 里额外 getUser() 与 getQiNiuToken()
 *   → 【第十二届改造·第二轮】两个变体的「QiniuData.key 前缀」已随七牛链路整体移除，
 *     故 `qiniuKeyPrefix` prop 不再存在，变体差异只剩「有没有上传入口」(uploadApi)
 *     与「表格是否居中」(center)。详见下方 defineProps 处的说明与 uploadFile 的注释。
 *
 * ---------------------------------------------------------------------------
 * 【为什么抽成一个组件，而不是复制 5 份】
 * dist 是 5 份几乎相同的源码（作用域 id 各不相同即为证据）。本项目的既定原则是
 * 「功能、页面、路由、API、交互、视觉结构尽可能接近原始 dist」，并未要求文件结构一一对应；
 * 5 份复制粘贴会让今后任何一处改动都要改 5 遍，且极易漂移。
 * 因此这里保留**唯一的模板实现**，由 4 个路由文件各自传参调用，
 * 路由表与每个路由对应的 view 文件保持不变。
 * 两个变体的差异全部收敛到 props（uploadApi / center），无隐藏分支。
 * （原第三个 prop `qiniuKeyPrefix` 已于第十二届改造·第二轮随七牛链路删除。）
 *
 * ---------------------------------------------------------------------------
 * 【与 dist 的一处有意偏离：下载文件名】
 * dist 原文（两个变体都一样）：
 *     this.downloadFile(this.user.nickname + "优秀组织奖申请表", row.file)
 * 注意用的是 **this.user**（组件自己的 data.user），而不是 row.user。而：
 *   - 变体 B 的 mounted 里有 this.user = this.getUser()，取到的是**当前登录用户**；
 *     于是列表里每一行（可能是别的单位提交的）都会被存成「我单位名优秀组织奖申请表」；
 *   - 变体 A 的 mounted 只有 getData()，data.user 始终是初始值 ""，
 *     `"".nickname` 为 undefined，文件名会变成字面量「undefined优秀组织奖申请表」。
 * 佐证这是笔误而非有意设计：同一模板的「名称」列用的是 row.user.nickname，两者本应对应。
 * 本项目按「名称」列的同一语义取 row.user.nickname，即下载文件名与列表显示的单位一致。
 * 若后续确认必须与 dist 逐字一致，改回 props 注入的 userName 即可。
 *
 * 其余字段、分页参数（page/limit）、响应契约（code/count/data）、
 * 「操作失败！」提示文案、上传校验（仅 pdf、≤20M）均与 dist 完全一致。
 */
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getUser } from '@/utils/auth'
import { uploadToOss } from '@/services/ossUpload'
import FileCover from './FileCover.vue'

const props = defineProps({
  /** 列表接口：(params) => Promise —— dist 里的 xxx.recommend.getList */
  listApi: { type: Function, required: true },
  /** 上传完成后回写接口；不传即为「管理员/组委会」变体（没有上传入口） */
  uploadApi: { type: Function, default: null },
  /*
   * 【第十二届改造·第二轮】七牛对象 key 前缀（qiniuKeyPrefix）prop 已删除。
   * dist 用它区分变体 A「scdyz/」与变体 B「ylbxt/」，只服务于拼七牛 ObjectKey；
   * 改走 OSS 后 key 由后端按 `{biz}/{YYYYMMDD}/{uuid}{ext}` 生成，前端不再参与。
   * 四个宿主视图（admin / committee / city / school 的 recommend 页）上的
   * `:qiniu-key-prefix` 属性已同步去掉。变体的其余差异（uploadApi / center）保持不变。
   */
  /** 变体 B 的表格列居中 */
  center: { type: Boolean, default: false }
})

// dist data()：
// keyword / dtype / isDelete / status / ids / province / fileList / filename 全部是
// 声明后从未使用的遗留字段（既不渲染也不随请求发送），保持一致而保留会稀释可读性，
// 这里只保留真正参与渲染与请求的字段，并在注释中记录被省略的项。
const page = ref(1)
const limit = ref(20)
const total = ref(0)
const data = ref([])
const user = ref('')
// 【第十二届改造·第二轮】QiniuData / domain / host 已移除：七牛直传链路整条下线，
// key 由后端生成、url 由上传服务返回，前端不再硬编码七牛上传域名与图片域名。

const fileshow = ref(null)

/** dist: getData(){ const e={page,limit}; this.$api.<mod>.recommend.getList(e).then(...) } */
function getData() {
  props.listApi({ page: page.value, limit: limit.value }).then(({ data: res }) => {
    if (res.code === 0) {
      total.value = res.count
      data.value = res.data
    } else {
      ElMessage.error('操作失败！')
    }
  })
}

/**
 * dist 变体 A 叫 reflush()、变体 B 叫 refresh()，但两者实现完全相同：
 *   this.page=1, this.limit=10, this.keyword=null, this.getData()
 * 注意它把 limit 改成了 **10**（初始值是 20），这是 dist 原文行为，照搬不改。
 */
function refresh() {
  page.value = 1
  limit.value = 10
  getData()
}

/** dist: handleSizeChange(e){ this.limit=e, this.getData() } —— 不重置 page */
function handleSizeChange(size) {
  limit.value = size
  getData()
}

/** dist: handleCurrentChange(e){ this.page=e, this.getData() } */
function handleCurrentChange(current) {
  page.value = current
  getData()
}

/*
 * 【第十二届改造·第二轮】getQiNiuToken() 已删除。
 * dist: getQiNiuToken(){ ...code===0 ? this.QiniuData.token=e.uptoken : Message.error(e.msg) }
 * 它原来由 mounted 与 beforeUpload 两处调用，只为把七牛 uptoken 填进 QiniuData.token。
 * 改走 OSS 后凭证（STS 临时凭证）由 @/services/ossUpload 在真正要上传时才取，
 * 调用点不需要、也拿不到任何凭证。
 */

/** dist: beforeUpload(e) —— 先确保有 token，再校验后缀与体积 */
function beforeUpload(file) {
  /*
   * 【第十二届改造·第二轮】删去写 QiniuData.key / 预取 token 的三行：
   *   if (!QiniuData.value.token) getQiNiuToken()
   *   QiniuData.value.key = props.qiniuKeyPrefix
   *   QiniuData.value.key += rename(file.name)
   * key 改由后端生成，rename 导入随之删除。下方两道校验（后缀、体积）
   * 与提示文案逐字保留，判定顺序也不变。
   */
  const sizeOk = file.size / 1024 / 1024 < 20
  const ext = file.name.substring(file.name.lastIndexOf('.') + 1)
  const allow = ['pdf']

  if (allow.indexOf(ext) === -1) {
    ElMessage.error('仅限于pdf格式上传！')
    return false
  }
  if (!sizeOk) {
    ElMessage.error('文件大小不能超过20M')
    return false
  }
  // 返回 undefined 即放行（dist 原文 `: t ? void 0 : (error, return false)`）
}

/**
 * dist 原文（两个变体一致）：
 *   uploadFile(e){
 *     this.$refs.fileshow.show();
 *     upload(e.file, e.data.key, e.data.token).subscribe({
 *       next:t=>{ this.$refs.fileshow.setPro(t.total.percent.toFixed(2)) },
 *       error:t=>{ this.$refs.fileshow.dishow(), Message.error(t) },
 *       complete:t=>{ this.$refs.fileshow.dishow(),
 *         <uploadApi>({file:this.host+t.key}).then(({data:t})=>{
 *           0===t.code ? (this.getData(), Message.success("上传成功！"))
 *                      : (this.$refs.fileshow.dishow(), Message.error("文件上传失败")) }) }
 *     })
 *   }
 *
 * 【第十二届改造·第二轮】七牛的 Observable（next/error/complete）换成 Promise 的
 * .then/.catch，三段语义一一对应：
 *   next     → onProgress（进度条 FileCover 的 show/setPro/dishow 三步一个不落）
 *   error    → .catch（先 dishow 再报错）
 *   complete → .then（先 dishow，再用返回的 url 调 uploadApi 回写，成功才刷新列表）
 *
 * ⚠️ 进度语义的变化：七牛是浏览器直传，next 报的百分比就是真实上传进度；
 * 改成后端代传后，onUploadProgress 量的是「浏览器 → 本后端」这一段，
 * 「本后端 → OSS」那段不在内。所以进度到 100% 后可能还要停顿片刻才出「上传成功！」。
 * ≤20MB 的 PDF 可接受；这是双通道架构的固有取舍，不是缺陷。
 *
 * 【为什么 processors 不返回 Promise】Element Plus 只在 httpRequest 返回 Promise 时
 * 才跑它自己那套内部成功路径；本组件用 :show-file-list="false"，行为完全由下面的
 * .then/.catch 控制，所以这里不 return。
 */
function uploadFile(options) {
  fileshow.value.show()
  uploadToOss({
    file: options.file,
    biz: 'doc',
    onProgress: (percent) => fileshow.value.setPro(percent)
  })
    .then(({ url }) => {
      fileshow.value.dishow()
      props
        .uploadApi({ file: url })
        .then(({ data: r }) => {
          if (r.code === 0) {
            getData()
            ElMessage.success('上传成功！')
          } else {
            fileshow.value.dishow()
            ElMessage.error('文件上传失败')
          }
        })
    })
    .catch((err) => {
      // dist 的 error 分支是无条件 Message.error(t)。这里保留「先收进度圈、再报错」
      // 的顺序，只按本仓库既有约定加一道 shown 守卫（shown=true 表示已被弹过）。
      // 本组件走 biz:'doc'（代传通道，无拦截器），实际不会出现 shown=true，
      // 留着是为了与其余 6 个上传点写法一致。
      fileshow.value.dishow()
      if (!err.shown) ElMessage.error(err.message || '文件上传失败')
    })
}

/** dist: downloadFile(e,t){ const n=document.createElement("a"); n.download=e; n.href=t; n.target="_blank"; n.click() } */
function downloadFile(name, file) {
  const a = document.createElement('a')
  a.download = name
  a.href = file
  a.target = '_blank'
  a.click()
}

/** 见顶部说明：取该行提交单位的名称，与「名称」列同源 */
function fileNameOf(row) {
  return (row.user && row.user.nickname ? row.user.nickname : '') + '优秀组织奖申请表'
}

onMounted(() => {
  getData()
  // 仅变体 B（有上传入口）才有这两步，与 dist 的 mounted 一一对应
  // 【第十二届改造·第二轮】其中的 getQiNiuToken() 已删除：改走 OSS 后
  // 挂载时不再需要预取任何上传凭证，凭证由上传服务在真正要传时才去取。
  // getUser() / user 保留 —— 与上传通道无关，去掉会偏离 dist 的 data()。
  if (props.uploadApi) {
    user.value = getUser()
  }
})
</script>

<style lang="scss" scoped>
/* 照搬 dist/css/chunk-278da94c.*.css 与 chunk-26b9c31f.*.css 中
   [data-v-43031bc6] / [data-v-06219892] 作用域的规则（两个变体完全一致） */
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
}

.content {
  position: relative;
  background-color: #fff;
  padding: 10px;
  margin-top: 20px;
  box-shadow: 1px 1px 5px 1px #8c939d;
  min-height: calc(100% - 150px);
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
</style>
