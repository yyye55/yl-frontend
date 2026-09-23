<template>
  <div style="display:inline-block;margin-right:10px">
    <el-button @click="dialogTableVisible = true">查看详情</el-button>
    <!-- append-to-body：本组件渲染在 el-table 的单元格里，而 Element Plus 给
         .el-table__cell 加了 position:relative + z-index:1，每个 td 自成层叠上下文。
         弹窗留在原地的话，它的 z-index 只能在该 td 内部比拼，后面几列（状态列/操作列）
         同为 z=1 且在 DOM 里更靠后，会整片盖在弹窗上面。详见 ShowPerson.vue 的同类说明。 -->
    <el-dialog v-model="dialogTableVisible" append-to-body>
      <div class="detail-content">
        <h2>{{ data.name }}</h2>
        <div class="fall-info">
          <p><span class="label">填报单位：</span><span class="value">{{ data.user.nickname }}</span></p>
          <p><span class="label">乐团名称：</span><span class="value">{{ data.choir_name }}</span></p>
        </div>
        <div class="fall-info">
          <p><span class="label">参展学校：</span><span class="value">{{ data.school_name }}</span></p>
          <p><span class="label">乐团类别：</span><span class="value">{{ data.establishment }}</span></p>
        </div>
        <div class="fall-info">
          <p><span class="label">参展组别：</span><span class="value">{{ data.group }}</span></p>
          <p><span class="label">自选曲目：</span><span class="value">{{ data.name }}</span></p>
        </div>
        <div class="fall-info">
          <p><span class="label">指定曲目：</span><span class="value">{{ data.name1 || '未填写' }}</span></p>
          <p><span class="label">领队姓名：</span><span class="value">{{ data.contact_name }}</span></p>
        </div>
        <div class="fall-info">
          <p><span class="label">领队联系电话：</span><span class="value">{{ data.contact_phone }}</span></p>
          <p><span class="label">联系地址：</span><span class="value">{{ data.contact_way }}</span></p>
        </div>
        <div class="fall-info">
          <p><span class="label">展示时长：</span><span class="value">{{ getM(data.time_length) }}分{{ getS(data.time_length) }}秒</span></p>
          <p><span class="label">乐团简介：</span><span class="value">{{ data.desc || '未填写' }}</span></p>
        </div>
        <!-- 【本项目新增】style 末尾的 text-align:center 是本项目的改动，
             dist 原文只有前四个声明，详见 script 中的说明。 -->
        <div
          v-if="data.spectrum"
          style="padding:5px;margin:10px 0;border:1px solid rgba(242,247,252,0.69);font-size:15px;text-align:center"
        >
          乐团集体照片文件--------
          <!-- 【第十二届修复】原写法 download="data.spectrum.filename" 只是**静态字符串**
               （没有冒号，不是绑定），存盘名就是字面量 "data.spectrum.filename"。
               改为点击后走 blob 下载，详见 script 里 downloadFile 的说明。 -->
          <a
            href="javascript:;"
            style="text-decoration:none;color:#1890FF"
            @click="downloadFile(data.spectrum)"
          >下载</a>
        </div>
        <div
          v-if="data.file"
          style="padding:5px;margin:10px 0;border:1px solid rgba(242,247,252,0.69);font-size:15px;text-align:center"
        >
          视频文件--------
          <!-- 【第十二届修复】同上一处，原 download 是静态字符串，改为 blob 下载。 -->
          <a
            href="javascript:;"
            style="text-decoration:none;color:#1890FF"
            @click="downloadFile(data.file)"
          >下载</a>
        </div>
        <div class="options" style="font-size:16px;font-weight:bold;text-align:center">
          <Status :status="data.status" />
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
/**
 * ShowContent 报名详情弹窗
 *
 * 【可信度：A】逐行照搬 dist chunk-335604d9 的模块 84fd（报名列表页的操作列共用）。
 * 原文组件选项：
 *
 *   name:"ShowContent",
 *   components:{ Status },                      // 模块 3865，本项目已迁移为 ./Status.vue
 *   props:{ data:{ default:[] } },
 *   mounted(){ const e = this.data.person instanceof Array;
 *              if(!e){ const e=[]; e.push(this.data.person); this.data.person=e } },
 *   data(){ return { dialogTableVisible:!1 } }
 *
 * ---------------------------------------------------------------------------
 * 【更正·早期误判】原文的 getM / getS 在 dist 中**是存在的**，只是挂在 Vue.prototype 上
 * ---------------------------------------------------------------------------
 * 本文件此前写着「整个 dist 中没有定义这两个方法，点开详情必然抛
 * TypeError: this.getM is not a function」——该结论**错误**，现予更正。
 * 误判原因：检索时用的模式是 `getM(`，而 dist 中的定义写作
 *     e.prototype.getM=function(e){...}
 * 中间的 `.prototype.` 让该写法被排除在外，「没搜到」于是被当成了「不存在」。
 *
 * 实际证据（dist/app.js 模块 a7fe，Vue 插件的 install 内）：
 *     e.prototype.getM=function(e){let t=0;return t=parseInt(e/60),t},
 *     e.prototype.getS=function(e){let t=0;return t=parseInt(e)%60,t}
 * install 的入参 e 即 Vue；组件模板里的 getM(...) 会被编译成 _vm.getM(...)，
 * 因此原线上「查看详情」弹窗是**可以正常显示**的，并不存在前述 TypeError。
 *
 * 处理：撤销本组件内的本地实现，改为引用 utils/date.js 中忠实照搬 dist 的
 * getM / getS（沿用 parseInt 语义）。<script setup> 会把导入的绑定暴露给模板，
 * 故模板里原有的 {{ getM(data.time_length) }} 写法无需改动。
 *
 * 【高置信推断】time_length 的单位是**秒**。依据后端
 *   apps/api/export_services.py  seconds_to_human(item.time_length)
 * —— 同一个字段在导出 Excel 时被当作秒数格式化；apps/core/models.py 的
 *    time_length = models.IntegerField(default=0) 也印证是整数秒。
 *
 * ---------------------------------------------------------------------------
 * 【本项目改动 · 其一】三处 text-align:center
 * ---------------------------------------------------------------------------
 * dist 原文的「乐团集体照片文件 / 视频文件」两个块只有
 *   padding:5px;margin:10px 0;border:1px solid rgba(242,247,252,0.69);font-size:15px
 * 状态块的父元素 .options 只有 font-size:16px;font-weight:bold
 * 三者都是**块级占满整行、内部内容默认左对齐**，在弹窗里靠左。
 * 现按需求在**这三处 inline style 末尾各追加 text-align:center**（原文声明一字未改）。
 *
 * 为什么状态块只在父元素加、不动 Status.vue：
 *   Status 渲染的是 <div class="status-box"><div class="case3">组委会通过</div></div>，
 *   两层都是块级，只调父元素不会移动文本；但 text-align 是**继承属性**，
 *   写在 .options 上会一路继承到最内层文本。Status.vue 是各列表页共用的独立组件，
 *   改它风险更大，故不动。
 *
 * 影响面：ShowContent 被 5 个可访问页面的详情弹窗共用 ——
 *   /city/elementary/list、/school/elementary/list（ReportList.vue）
 *   /committee/elementary1|2|3（CommitteeReportList.vue）
 * 另有 3 处调用方（admin/report.vue、committee/colleges.vue、TeacherList.vue）
 * 对应路由已在第十二届摘除，无菜单入口。
 * .fall-info 的 3 列 grid、h2 居中、两个文件块的 border 均未改动。
 *
 * ---------------------------------------------------------------------------
 * 【本项目改动 · 其二】两个「下载」链接改走 blob（第十二届修复）
 * ---------------------------------------------------------------------------
 * dist 原文是 `<a :href="…url" download="…filename" target="_blank">下载</a>`。
 * 这里只动了「下载」这两个 <a> 的下载方式，块级容器、文案、border 等一律未改。
 * 具体症状、成因与修法写在下方 downloadFile() 的注释里。
 */
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import Status from './Status.vue'
import { downloadRemoteFile } from '@/utils/download'
// dist 里这两个方法挂在 Vue.prototype；Vue3 的 <script setup> 没有 this，故具名导入。
// 语义与 dist 完全一致（见 utils/date.js 中的实现与出处）。
import { getM, getS } from '@/utils/date'

const props = defineProps({
  data: { default: () => [] }
})

/**
 * dialogTableVisible —— dist 原文在 data() 里：`data(){ return { dialogTableVisible:!1 } }`
 * （见本文件头部摘录的组件选项）。迁移到 <script setup> 时**漏掉了这一行**，
 * 后果不是「少了个默认值」而是整个弹窗失效：
 *
 *   模板里的 `@click="dialogTableVisible = true"` 与 `v-model="dialogTableVisible"`，
 *   只有在编译器把该标识符识别为 setup 里的 ref 时才会编成 `dialogTableVisible.value`。
 *   没有声明 -> 这个标识符不在 bindingMetadata 里 -> 编译成 `_ctx.dialogTableVisible`。
 *   于是 v-model 拿到的永远是 undefined（假值），**「查看详情」点了没有任何反应**。
 *
 * 判据可用 @vue/compiler-sfc 复现：
 *   compileScript(descriptor,{id,inlineTemplate:true}).bindings 里没有 dialogTableVisible，
 *   而 render 里是 `onClick: $event => (_ctx.dialogTableVisible = true)`。
 * 已用 __debug__/audit-bindings.cjs 全量扫过 src，**全仓库仅此一处**。
 */
const dialogTableVisible = ref(false)

/**
 * 原文 mounted：把单个 person 对象规范化为数组。
 * 【说明】本组件模板并不读取 data.person，因此这一步对渲染没有影响；
 * 但原文确实会修改父组件的 row（props.data 就是同一对象引用），故保留该副作用以对齐行为。
 * Vue 3 中 props 对象本身只读，但修改「传入对象自身的属性」是允许的，因此写法与原版等价。
 */
onMounted(() => {
  if (!(props.data.person instanceof Array)) {
    const list = []
    list.push(props.data.person)
    props.data.person = list
  }
})

/**
 * 下载报名详情里的「乐团集体照片 / 视频」（第十二届新增）
 *
 * 入参是后端 report_dict 里 `spectrum` / `file` 两个字段的对象
 * （apps/core/services.py：`model_dict(Files.objects.filter(pk=report.spectrum).first())`），
 * 即一条 Files 记录：{ id, user_id, filename, type, size, url, created_at, updated_at }。
 *   · url      → OSS 的随机 UUID 地址
 *   · filename → 原始文件名（「乐团集体照片.jpg」「演出视频.mp4」）
 *
 * 【第十二届修复：文件名】模板原写作
 *     :href="data.spectrum.url" download="data.spectrum.filename" target="_blank"
 * 注意 download 这里**没有冒号**，是静态 HTML 字符串而非 Vue 绑定 —— 浏览器把它当作
 * 字面量文件名，存盘名直接变成 "data.spectrum.filename"。
 * 而即便补上冒号变成 `:download="data.spectrum.filename"`，只要还是跨源直链，
 * download 属性仍会被浏览器忽略，退回用 UUID 命名。两种写法都必须改成 blob，
 * 理由与 CORS 前提见 utils/download.js。
 */
function downloadFile(file) {
  downloadRemoteFile(file.url, file.filename).catch((err) => {
    ElMessage.error(err.message || '下载失败')
  })
}
</script>

<style lang="scss" scoped>
/* 照搬 dist/css/chunk-335604d9.9c29b119.css 中 [data-v-3f6fe48c] 作用域的规则 */
.detail-content {
  position: relative;
  height: 100%;

  h2 {
    text-align: center;
  }
}

.fall-info {
  display: grid;
  grid-template-columns: 50% 50%;
  grid-template-rows: repeat(auto-fill, 100%);
  padding-top: 10px;
  text-align: center;
  color: #8c939d;
}

.fall-info p {
  display: flex;
  justify-content: flex-start;
  align-items: baseline;
  padding: 2px 10px;
  margin: 0;
  white-space: normal;
}

.fall-info .label {
  flex-shrink: 0;
  white-space: nowrap;
}

.fall-info .value {
  flex: 1 1 auto;
  min-width: 0;
  text-align: left;
  padding-left: 8px;
}
</style>
