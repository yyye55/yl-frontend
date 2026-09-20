<template>
  <div class="bg">
    <div class="options">
      <el-button class="menu-button" style="width: 100px" type="primary" size="mini" @click="refresh">
        刷新
      </el-button>

      <!-- 仅省级/市级/校级变体有上传入口；管理员与组委会变体没有 -->
      <template v-if="uploadApi">
        <el-upload
          class="upload-demo"
          :data="QiniuData"
          :show-file-list="false"
          :before-upload="beforeUpload"
          :http-request="uploadFile"
          :action="domain"
        >
          <el-button size="small" type="primary">点击上传</el-button>
        </el-upload>
        <span> 只能上传PDF格式的文件，文件最大能上传20M! 请上传本地展演活动工作总结。 </span>
      </template>
    </div>

    <div class="content">
      <div class="bg-list">
        <p class="title">报名列表</p>
        <el-table :data="data" border size="mini" style="width: 100%">
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
              <el-button size="mini" type="primary" @click="downloadFile(fileNameOf(row), row.file)">
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
 *   /province/recommend/index     16bf  作用域 06219892   province.recommend
 *   /city/recommend/index         f479  作用域 8b0bXXXX   city.recommend
 *   /school/recommend/index       e791  作用域 XXXXXXXX   school.recommend
 * 五者仅两处不同 —— 接口模块，以及「有没有上传入口」，据此分成两个变体：
 *   变体 A（admin / committee）：只有「刷新」，方法名 reflush()，QiniuData.key 前缀 "scdyz/"
 *   变体 B（province / city / school）：多一个 el-upload「点击上传」+ 提示文案，
 *                                     方法名 refresh()，QiniuData.key 前缀 "ylbxt/"，
 *                                     mounted 里额外 getUser() 与 getQiNiuToken()
 *
 * ---------------------------------------------------------------------------
 * 【为什么抽成一个组件，而不是复制 5 份】
 * dist 是 5 份几乎相同的源码（作用域 id 各不相同即为证据）。本项目的既定原则是
 * 「功能、页面、路由、API、交互、视觉结构尽可能接近原始 dist」，并未要求文件结构一一对应；
 * 5 份复制粘贴会让今后任何一处改动都要改 5 遍，且极易漂移。
 * 因此这里保留**唯一的模板实现**，由 5 个路由文件各自传参调用，
 * 路由表与每个路由对应的 view 文件保持不变。
 * 两个变体的差异全部收敛到 props（uploadApi / qiniuKeyPrefix / center），无隐藏分支。
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
import { upload } from 'qiniu-js'
import { qiniuApi } from '@/api'
import { getUser } from '@/utils/auth'
import { rename } from '@/utils/excel'
import FileCover from './FileCover.vue'

const props = defineProps({
  /** 列表接口：(params) => Promise —— dist 里的 xxx.recommend.getList */
  listApi: { type: Function, required: true },
  /** 上传完成后回写接口；不传即为「管理员/组委会」变体（没有上传入口） */
  uploadApi: { type: Function, default: null },
  /** 七牛对象 key 前缀：变体 A 为 "scdyz/"，变体 B 为 "ylbxt/" */
  qiniuKeyPrefix: { type: String, default: 'ylbxt/' },
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
const QiniuData = ref({ token: '', key: props.qiniuKeyPrefix })

// dist 原文常量（两个变体一致）
const domain = 'https://upload.qiniup.com'
const host = 'https://img.atyth.com/'

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

/** dist: getQiNiuToken(){ ...code===0 ? this.QiniuData.token=e.uptoken : Message.error(e.msg) } */
function getQiNiuToken() {
  qiniuApi.getToken().then(({ data: res }) => {
    if (res.code === 0) {
      QiniuData.value.token = res.uptoken
    } else {
      ElMessage.error(res.msg)
    }
  })
}

/** dist: beforeUpload(e) —— 先确保有 token，再校验后缀与体积 */
function beforeUpload(file) {
  if (!QiniuData.value.token) getQiNiuToken()
  QiniuData.value.key = props.qiniuKeyPrefix
  QiniuData.value.key += rename(file.name)

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
 * dist: uploadFile(e){ $refs.fileshow.show(); upload(e.file, e.data.key, e.data.token).subscribe({...}) }
 * 完成后调 createAndUpdate({ file: host + key }) 回写，成功则刷新列表。
 */
function uploadFile(options) {
  fileshow.value.show()
  const observable = upload(options.file, options.data.key, options.data.token)
  observable.subscribe({
    next(res) {
      fileshow.value.setPro(res.total.percent.toFixed(2))
    },
    error(err) {
      fileshow.value.dishow()
      ElMessage.error(err)
    },
    complete(res) {
      fileshow.value.dishow()
      props
        .uploadApi({ file: host + res.key })
        .then(({ data: r }) => {
          if (r.code === 0) {
            getData()
            ElMessage.success('上传成功！')
          } else {
            fileshow.value.dishow()
            ElMessage.error('文件上传失败')
          }
        })
    }
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
  if (props.uploadApi) {
    user.value = getUser()
    getQiNiuToken()
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
</style>
