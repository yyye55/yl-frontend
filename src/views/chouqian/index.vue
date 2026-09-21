<!--
  抽签首页

  【可信度：A】
    dist 证据：chunk-7c130cac 中模块 d2ab
      var n = function () {
        var e = this, t = e._self._c;
        return t("div", {staticClass: "content"}, [
          t("p", {staticClass: "title"}, [e._v("“意林杯”四川省第十二届管乐展示活动顺序抽签")]),
          t("div", {staticClass: "box"}, [
            t("div", {staticClass: "box-item", on: {click: function (t) { return e.$router.push("/chouqian/do/1")}}},
              [t("div", {staticClass: "school-name"}, [e._v("大学组 (非专业组)")])]),
            t("div", {staticClass: "box-item", on: {click: function (t) { return e.$router.push("/chouqian/do/2")}}},
              [t("div", {staticClass: "school-name"}, [e._v("大学组（专业组）")])]),
            t("div", {staticClass: "box-item", on: {click: function (t) { return e.$router.push("/chouqian/do/3")}}},
              [t("div", {staticClass: "school-name"}, [e._v("教师组")])]),
            t("div", {staticClass: "box-item", on: {click: function (t) { return e.$router.push("/chouqian/do/4")}}},
              [t("div", {staticClass: "school-name"}, [e._v("中小学组")])]),
            t("div", {staticClass: "start"},
              [t("el-button", {staticClass: "my-button", attrs: {size: "small"}, on: {click: e.exportResult1}},
                [e._v("导出所有类别抽签结果")])], 1)
          ])
        ])
      };

      methods: {
        exportResult1() {
          this.$api.admin.chouqian.exportAll().then(e => {
            this.downloadExcelFile(e.data, "西部音乐周展演活动现场展演所有类别抽签顺序表")
          })
        }
      }

  【样式证据：A】
    来源：css/chunk-7c130cac.669ef5ed.css（1491 字节，12 条规则）
    对应关系：本模块末尾 Object(x["a"])(v, n, o, !1, null, "038caa55", null)
              的 scoped id "038caa55" 与该 CSS 文件中 12 处 [data-v-038caa55]
              完全一致，可确证为该组件专属样式，无其他组件规则混入。
    处置：12 条规则已全量搬运至下方 <style>（去掉 [data-v-*] 属性选择器，
          scoped 属性由 Vue SFC 编译期生成）。其中 4 条 dist 残留死规则见注释标记。

  【后端契约：A】
    GET /admin/chouqian/exportall  -> Blob (xlsx)  (auth: type=3)
    详细见 yilinbei/apps/api/views.py draw_export_all()
    与 adminApi.chouqian.exportAll() 一致。

  【dist 已知缺陷·不擅自修复】
    1) d2ab 的 data() 里有 getData/random/submit/exportResult/shuffle/_shuffle/_insertInBatches
       —— 这些是「保留学校随机」逻辑，本应在 /chouqian/do 上呈现（就是 b9ad 模块）。
       d2ab 这里定义了却没有被模板调用，纯属死代码，保留 dist 行为——不调用。
    2) d2ab 的 exportResult() 调用不存在的 this.$api.chouqian.school.export()，
       本页面不会触发它（模板未绑定），不会报错。
    3) d2ab 的 data() 里 data: [{id: 1, school_name: "专业组"}] 是硬编码假数据，
       但模板中没有任何 v-for 消费它，同样属于死代码。

  【字段名称·后端契约】
    "大学组 (非专业组)" / "大学组（专业组）" / "教师组" / "中小学组"
    分别对应 type=1/2/3/4
    与 yilinbei/apps/api/export_services.py 中 DRAW_TYPES 完全一致。
    注：dist 原文第一个分组用的是半角空格 + 半角括号「大学组 (非专业组)」，
        其余三个用全角，此处保持 dist 原样。
-->
<template>
  <div class="content">
    <p class="title">“意林杯”四川省第十二届管乐展示活动顺序抽签</p>
    <div class="box">
      <div class="box-item" @click="goDo(1)">
        <div class="school-name">大学组 (非专业组)</div>
      </div>
      <div class="box-item" @click="goDo(2)">
        <div class="school-name">大学组（专业组）</div>
      </div>
      <div class="box-item" @click="goDo(3)">
        <div class="school-name">教师组</div>
      </div>
      <div class="box-item" @click="goDo(4)">
        <div class="school-name">中小学组</div>
      </div>
      <div class="start">
        <el-button
          class="my-button"
          size="small"
          @click="exportResult1"
        >导出所有类别抽签结果</el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * 抽签首页（Vue3 实现）
 *
 * 【范围说明】
 *   - 本页面仅触发「跳转」和「导出全部」。
 *   - dist 中残留的 getData/random/submit 等逻辑是死代码（模板里没有任何绑定），
 *     Vue3 中不重新实现。
 *   - 抽签随机算法在 /chouqian/do（b9ad 模块）实现。
 *
 * 【与 dist 的偏离】
 *   1) goDo() 包装了 $router.push —— 与 dist 内联写法行为完全等价，仅为可读性。
 *   2) 【偏离·已修正】exportResult1() 补了 .catch 错误提示。dist 无任何错误处理，
 *      接口失败时页面静默无反馈；见该函数处注释。
 *   模板结构、文案、样式与 d2ab 保持 1:1 对齐。
 */
import { useRouter } from 'vue-router'
import { adminApi } from '@/api/admin'
import { downloadExcelFile } from '@/utils/excel'
import { showApiError } from '@/utils/request'

const router = useRouter()

function goDo(type) {
  router.push('/chouqian/do/' + type)
}

/**
 * 导出所有类别抽签结果（Excel）
 * 【dist 证据】A：this.$api.admin.chouqian.exportAll().then(e => this.downloadExcelFile(e.data, "西部音乐周展演活动现场展演所有类别抽签顺序表"))
 * 【后端契约】A：GET /api/admin/chouqian/exportall -> Blob (xlsx)
 * 注：dist 此处没有任何错误处理（无 try/catch、无空响应判断）。
 * 【偏离 dist·已修正】补 .catch —— 该端点当前被后端路由遮蔽，实际返回 422，
 *   而拦截器对 422 只 console.log 不提示，缺了 .catch 时用户点了按钮毫无反应。
 */
function exportResult1() {
  adminApi.chouqian.exportAll().then(res => {
    downloadExcelFile(res.data, '西部音乐周展演活动现场展演所有类别抽签顺序表')
  }).catch(err => {
    showApiError(err, '导出失败')
  })
}
</script>

<style lang="scss" scoped>
/*
 * 全量搬运自 css/chunk-7c130cac.669ef5ed.css（12 条规则，scoped id 038caa55）。
 * 仅去掉 [data-v-038caa55] 属性选择器（由 Vue SFC 编译期生成等价的 scoped 属性）。
 * 声明顺序、属性值均与 dist 逐字一致，包括 rgba(244,180,208,.3607843137254902)
 * 这一未约简的写法。
 */

.content {
  position: absolute;
  width: 100%;
  height: 100%;
  overflow: auto;
  background-color: #fef0f0;
  background-size: 100% 100%;
}

.title {
  font-size: 40px;
  font-weight: 700;
  text-align: center;
  cursor: pointer;
  line-height: 80px;
  color: #e70c0c;
  background-color: rgba(244, 180, 208, 0.3607843137254902);
  background-size: cover;
  transition: all 0.7s;
}

.box {
  text-align: center;
  padding: 40px;
  width: 60%;
  display: grid;
  grid-template-columns: 1fr 1fr;
  margin: 20px auto 0;
}

/* ---- 以下 1 条为 dist 残留，d2ab 模板中无 .options 元素 ---- */
.options {
  position: relative;
  padding: 10px;
  background-color: #fff;
  box-shadow: 5px 5px 5px #ccc;
}
/* ---- dist 残留结束 ---- */

.box-item {
  border: 5px solid #f2b3b3;
  border-radius: 10px;
  margin: 30px auto;
  width: 300px;
  height: 280px;
  line-height: 224px;
  box-sizing: border-box;
  padding: 10px 5px;
  text-align: center;
  overflow: hidden;
  background-color: #f2b3b3;
}

.box-item:hover {
  cursor: pointer;
}

.start {
  position: fixed;
  right: 50px;
  top: 50%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.my-button {
  margin: 10px 0;
}

/* ---- 以下 1 条为 dist 残留，d2ab 模板中无 .school-index 元素 ---- */
.school-index {
  font-size: 30px;
  margin-bottom: 5px;
  color: #fff;
  border-bottom: 1px dashed #f4f4f5;
}
/* ---- dist 残留结束 ---- */

.school-name {
  padding-top: 4px;
  font-size: 30px;
  font-weight: 700;
  color: #fff;
}

/* ---- 以下 2 条为 dist 残留，抽签按钮只在 b9ad（/chouqian/do）中，d2ab 无此元素 ---- */
.random-button {
  margin-bottom: 5px;
  background-color: #fff;
  text-align: center;
  width: 100px;
  height: 100px;
  line-height: 100px;
  border-radius: 50%;
}

.random-button:hover {
  color: #d20080;
  border-color: #f2b3d9;
  background-color: #fbe6f2;
  cursor: pointer;
}
/* ---- dist 残留结束 ---- */
</style>
