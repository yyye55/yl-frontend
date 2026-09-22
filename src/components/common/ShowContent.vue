<template>
  <div style="display:inline-block;margin-right:10px">
    <el-button @click="dialogTableVisible = true">查看详情</el-button>
    <el-dialog v-model="dialogTableVisible">
      <div class="detail-content">
        <h2>{{ data.name }}</h2>
        <div class="fall-info">
          <p>填报单位：{{ data.user.nickname }}</p>
          <p>乐团名称：{{ data.choir_name }}</p>
          <p>学校名称：{{ data.school_name }}</p>
        </div>
        <div class="fall-info">
          <p>类型：{{ data.establishment }}</p>
          <p>参演组别：{{ data.group }}</p>
          <p>自选曲目：{{ data.name }}</p>
        </div>
        <div class="fall-info">
          <p>指定曲目：{{ data.name1 || '未填写' }}</p>
          <p>领队姓名：{{ data.contact_name }}</p>
          <p>领队电话：{{ data.contact_phone }}</p>
        </div>
        <div class="fall-info">
          <p>联系地址：{{ data.contact_way }}</p>
          <p>作品总时长：{{ getM(data.time_length) }}分{{ getS(data.time_length) }}秒</p>
          <p>乐团简介：{{ data.desc || '未填写' }}</p>
        </div>
        <!-- 【本项目新增】style 末尾的 text-align:center 是本项目的改动，
             dist 原文只有前四个声明，详见 script 中的说明。 -->
        <div
          v-if="data.spectrum"
          style="padding:5px;margin:10px 0;border:1px solid rgba(242,247,252,0.69);font-size:15px;text-align:center"
        >
          乐团集体照片文件--------
          <a
            :href="data.spectrum.url"
            download="data.spectrum.filename"
            target="_blank"
            style="text-decoration:none;color:#1890FF"
          >下载</a>
        </div>
        <div
          v-if="data.file"
          style="padding:5px;margin:10px 0;border:1px solid rgba(242,247,252,0.69);font-size:15px;text-align:center"
        >
          视频文件--------
          <a
            :href="data.file.url"
            download="data.file.filename"
            target="_blank"
            style="text-decoration:none;color:#1890FF"
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
 * 【本项目改动 · 与 dist 的唯一差异】三处 text-align:center
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
 */
import { onMounted } from 'vue'
import Status from './Status.vue'
// dist 里这两个方法挂在 Vue.prototype；Vue3 的 <script setup> 没有 this，故具名导入。
// 语义与 dist 完全一致（见 utils/date.js 中的实现与出处）。
import { getM, getS } from '@/utils/date'

const props = defineProps({
  data: { default: () => [] }
})

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
  grid-template-columns: 33.3% 33.3% 33.3%;
  grid-template-rows: repeat(auto-fill, 100%);
  padding-top: 10px;
  text-align: center;
  color: #8c939d;
}
</style>
