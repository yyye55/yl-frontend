<!--
  抽签首页

  【可信度：A】
    dist 证据：chunk-7c130cac 中模块 d2ab
      var n = function () {
        var e = this, t = e._self._c;
        return t("div", {staticClass: "content"}, [
          t("p", {staticClass: "title"}, [e._v("意林杯四川省第十一届管乐展示活动顺序抽签")]),
          t("div", {staticClass: "box"}, [
            t("div", {staticClass: "box-item", on: {click: function (t) { return e.$router.push("/chouqian/do/1")}}},
              [t("div", {staticClass: "school-name"}, [e._v("大学组（非专业组）")])]),
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

  【字段名称·后端契约】
    "大学组（非专业组）" / "大学组（专业组）" / "教师组" / "中小学组"
    分别对应 type=1/2/3/4
    与 yilinbei/apps/api/export_services.py 中 DRAW_TYPES 完全一致
-->
<template>
  <div class="content">
    <p class="title">"意林杯"四川省第十一届管乐展示活动顺序抽签</p>
    <div class="box">
      <div class="box-item" @click="goDo(1)">
        <div class="school-name">大学组（非专业组）</div>
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
          :loading="exporting"
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
 */
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { adminApi } from '@/api/admin'
import { downloadExcelFile } from '@/utils/excel'

const router = useRouter()
const exporting = ref(false)

function goDo(type) {
  router.push('/chouqian/do/' + type)
}

/**
 * 导出所有类别抽签结果（Excel）
 * 【dist 证据】A：this.$api.admin.chouqian.exportAll().then(e => this.downloadExcelFile(e.data, "西部音乐周展演活动现场展演所有类别抽签顺序表"))
 * 【后端契约】A：GET /api/admin/chouqian/exportall -> Blob (xlsx)
 */
async function exportResult1() {
  if (exporting.value) return
  exporting.value = true
  try {
    const res = await adminApi.chouqian.exportAll()
    const blob = res && res.data
    if (!blob) {
      ElMessage.error('导出失败：响应为空')
      return
    }
    downloadExcelFile(blob, '西部音乐周展演活动现场展演所有类别抽签顺序表')
  } catch (e) {
    // 拦截器已经处理了 4xx/5xx；这里只兜底其它情况
    ElMessage.error('导出失败')
  } finally {
    exporting.value = false
  }
}
</script>

<style lang="scss" scoped>
/*
 * 页面布局：参考 dist 中 d2ab 模块的 staticClass 命名。
 * 布局尽量还原「中间一列的方块按钮组」原貌。
 * dist CSS 文件中未发现专属 .content/.box/.box-item 等样式（已 grep 全部 chunk-*.css），
 * 因此这里的样式属于「按 dist 命名 + 合理还原」，证据等级 B。
 */
.content {
  width: 100%;
  min-height: calc(100vh - 120px);
  padding: 30px 16px;
  box-sizing: border-box;
}

.title {
  text-align: center;
  font-size: 22px;
  font-weight: 600;
  color: #303133;
  margin: 10px auto 40px;
}

.box {
  max-width: 900px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  padding: 24px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.box-item {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 120px;
  background: linear-gradient(135deg, #4b6cb7 0%, #182848 100%);
  color: #fff;
  font-size: 20px;
  border-radius: 6px;
  cursor: pointer;
  user-select: none;
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.18);
  }
}

.school-name {
  letter-spacing: 2px;
}

.start {
  grid-column: 1 / -1;
  display: flex;
  justify-content: center;
  margin-top: 12px;
}

.my-button {
  min-width: 220px;
}
</style>
