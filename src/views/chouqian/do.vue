<!--
  抽签执行页

  【可信度：A】
    dist 证据：chunk-86f040fe 中模块 b9ad

    render:
      <div class="content">
        <el-button class="return-button" size="small" @click="$router.push("/chouqian/index")">返回</el-button>
        <p class="title">{{ getTypeName(Number(type)) }}------现场展演顺序抽签</p>
        <div class="box">
          <div class="box-item" v-for="(i, n) in data" :key="n">
            <div class="index-number">{{ n + 1 }}</div>
            <div class="program-name">{{ i.name }}</div>
          </div>
          <div class="start">
            <div class="random-button" @click="random">{{ timer ? "停止抽取" : "开始抽取" }}</div>
            <el-button class="my-button" size="small" @click="exportResult">导出抽签结果</el-button>
          </div>
        </div>
      </div>

    data() { return {
      finished: false,
      timer: null,
      data: {},        // 实际类型是 Array，dist 写错初始值；运行后被 getData() 替换
      temp: [[...4个组的内嵌学校列表]],
      showname: false,
      type: this.$route.params.type
    }}

    mounted() { this.getData() }

    methods: {
      getData() {
        this.$api.admin.chouqian.getByType(this.type).then(({data:e}) => {
          0 === e.code ? this.data = e.data : s.a.error(e.msg)
        })
      },
      getTypeName(e) {
        switch (e) {
          case 1: return "大学组 (非专业组)";
          case 2: return "大学组（专业组）";
          case 3: return "教师组";
          case 4: return "中小学组";
        }
      },
      random() {
        if (this.timer) {
          this.finished = true;
          clearInterval(this.timer);
          this.timer = null;
          this.submit();
        } else {
          this.timer = setInterval(() => { this.data = this.shuffle(this.data) }, 100)
        }
      },
      submit() {
        const e = [];
        for (let t = 0; t < this.data.length; t++)
          e.push({ id: this.data[t].id, order_index: t + 1 });
        this.$api.admin.chouqian.update({ data: e }).then(({data:e}) => {
          0 === e.code ? s.a.success("抽取成功！") : s.a.error(e.msg);
        })
      },
      exportResult() {
        this.$api.admin.chouqian.export(this.type).then(e => {
          this.downloadExcelFile(e.data, getTypeName(Number(this.type)) + "------现场展演抽签顺序表")
        })
      },
      shuffle(e) { /* 标准 Fisher-Yates：保留 t[]，倒序两两交换 */ }
    }

  【样式证据：A】
    来源：css/chunk-86f040fe.574698d8.css（1727 字节，14 条规则）
    对应关系：本模块末尾 Object(x["a"])(v, n, o, !1, null, "2b31d9ea", null)
              的 scoped id "2b31d9ea" 与该 CSS 文件中 14 处 [data-v-2b31d9ea]
              完全一致，可确证为该组件专属样式，无其他组件规则混入。
    处置：14 条规则已全量搬运至下方 <style>（去掉 [data-v-*] 属性选择器，
          scoped 属性由 Vue SFC 编译期生成）。其中 3 条 dist 残留死规则见注释标记。

  【后端契约：A】
    GET    /admin/chouqian/{type}        -> { code: 0, msg, data: [Draw] }
    PUT    /admin/chouqian/update        body: { data: [{id, order_index}] }  -> { code: 0, msg, data: null }
    GET    /admin/chouqian/export/{type} -> Blob (xlsx)
    详见 yilinbei/apps/api/views.py draw_list/draw_update/draw_export
    与 adminApi.chouqian.{getByType, update, exportOne} 一致。
    注：本项目的 adminApi 把 dist 的 `export` 重命名为 `exportOne`
        （避免与 ES 模块关键字混淆），调用点已一致。

  【dist 已知缺陷·不擅自修复】
    1) data() 初始 data: {} 错误（应该是 []）。实测无影响：{ } 无自有键，
       v-for 遍历结果与 [] 完全相同；即便在接口返回前点击「开始抽取」，
       shuffle({}) 也因 e.length 为 undefined 而不进入循环，直接返回 []，
       不抛错。Vue3 中改为 ref([]) 以表达真实类型。
    2) temp 数组（4 个组共 66 个硬编码学校名）、showname 字段：
       b9ad 的 data() 中定义，但 getData/getTypeName/random/submit/exportResult/shuffle
       六个方法均未引用，模板亦未绑定，属于纯死代码。本项目不移植。
    3) b9ad 没有任何销毁钩子（无 beforeDestroy / destroyed / beforeUnmount /
       unmounted）。详见下方 onBeforeUnmount 处的【偏离 dist·已修正】。
    4) b9ad 没有 Tabs 相关代码。点击「返回」直接 $router.push("/chouqian/index"),
       没有 tabsStore.addTab —— 这是 dist 的真实行为，不补 tabs。
-->

<template>
  <div class="content">
    <el-button class="return-button" size="small" @click="goBack">返回</el-button>
    <p class="title">{{ getTypeName(Number(type)) }}------现场展演顺序抽签</p>

    <div class="box">
      <div
        v-for="(item, idx) in data"
        :key="idx"
        class="box-item"
      >
        <div class="index-number">{{ idx + 1 }}</div>
        <div class="program-name">{{ item.name }}</div>
      </div>

      <div class="start">
        <div class="random-button" @click="random">
          {{ timer ? '停止抽取' : '开始抽取' }}
        </div>
        <el-button
          class="my-button"
          size="small"
          @click="exportResult"
        >导出抽签结果</el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * 抽签执行页（Vue3 实现）
 *
 * 【dist 关键交互】
 *   - 进入页面：根据 :type 拉取该组数据
 *   - 「开始抽取」: 每 100ms 对 data 进行一次 Fisher-Yates 洗牌
 *   - 「停止抽取」: 停止洗牌并调用 update API 把当前顺序写回后端
 *   - 「导出抽签结果」: 下载该组 xlsx
 *
 * 【Vue 3 重构】
 *   - data() → ref([]) / reactive
 *   - mounted → onMounted
 *   - this.$router / this.$route → useRouter/useRoute
 *   - this.$api → adminApi
 *   - this.$message → ElMessage
 *   - this.downloadExcelFile → downloadExcelFile（utils/excel）
 *
 * 【与 dist 的偏离】
 *   0) 【偏离·已修正】getData / submit / exportResult 三处补了 .catch 错误提示。
 *      dist 三个接口调用都没有任何错误处理，接口失败时页面完全静默；见各函数处注释。
 *   1) 【有意偏离·已修正】增加了 onBeforeUnmount 清 timer，见该处注释。
 *   2) goBack() 包装了 $router.push —— 与 dist 内联写法行为完全等价，仅为可读性。
 *   3) type 用 computed 而非 dist 的一次性快照。dist 在 data() 中
 *      `type: this.$route.params.type` 只取一次；由于 /chouqian/do/:type 之间
 *      切换必然经过 /chouqian/index 导致组件重建，实际不可达，行为无差异。
 *   其余（模板结构、文案、样式、接口调用、洗牌算法、提交协议）均 1:1 对齐 b9ad。
 */
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { adminApi } from '@/api/admin'
import { downloadExcelFile } from '@/utils/excel'
import { showApiError } from '@/utils/request'

const route = useRoute()
const router = useRouter()

const data = ref([])

/* dist 残留·只写不读：b9ad 在 random() 停止分支赋值一次，全项目无任何读取点。
   原意应为「抽签已完成」，但从未实现相应逻辑。保留以对应 dist 的 data()。 */
const finished = ref(false)

/* dist 残留·从未使用：b9ad 声明后从未被触碰，用途不明。保留以对应 dist 的 data()。 */
const showname = ref(false)

const timer = ref(null)

const type = computed(() => String(route.params.type || ''))

/**
 * 【dist 证据】A：getTypeName(e)
 *   switch (e) {
 *     case 1: return "大学组 (非专业组)";
 *     case 2: return "大学组（专业组）";
 *     case 3: return "教师组";
 *     case 4: return "中小学组";
 *   }
 * 注：dist 没有 default 分支，非法 type 会返回 undefined 并被原样渲染，
 *     此处保持一致（不补「未知分组」兜底）。
 * 注：case 1 的文案 dist 原文是半角空格 + 半角括号，其余三个是全角，保持原样。
 */
function getTypeName(t) {
  switch (Number(t)) {
    case 1: return '大学组 (非专业组)'
    case 2: return '大学组（专业组）'
    case 3: return '教师组'
    case 4: return '中小学组'
  }
}

function goBack() {
  // 与 dist 一致：直接 router.push 到 index，不走 tabs
  router.push('/chouqian/index')
}

/**
 * 【dist 证据】A：getData()
 *   this.$api.admin.chouqian.getByType(this.type).then(({data:e}) => {
 *     0 === e.code ? this.data = e.data : ElMessage.error(e.msg)
 *   })
 * 注：dist 此处没有 try/catch，也没有空响应判断。
 * 【偏离 dist·已修正】补 .catch：本页拿不到列表就只是空页面，必须让用户知道原因。
 */
function getData() {
  adminApi.chouqian.getByType(type.value).then(res => {
    const body = res && res.data
    body.code === 0 ? (data.value = body.data) : ElMessage.error(body.msg)
  }).catch(err => {
    showApiError(err, '获取抽签数据失败')
  })
}

/**
 * Fisher-Yates 洗牌
 * 【dist 证据】A：shuffle(e) {
 *   const t = [];
 *   for (let i = 0; i < e.length; i++) t.push(e[i]);
 *   for (let i = t.length - 1; i >= 0; i--) {
 *     const e = Math.floor(Math.random() * (i + 1));
 *     const n = t[e];
 *     t[e] = t[i];
 *     t[i] = n;
 *   }
 *   return t;
 * }
 */
function shuffle(arr) {
  const t = []
  for (let i = 0; i < arr.length; i++) t.push(arr[i])
  for (let i = t.length - 1; i >= 0; i--) {
    const e = Math.floor(Math.random() * (i + 1))
    const n = t[e]
    t[e] = t[i]
    t[i] = n
  }
  return t
}

/**
 * 【dist 证据】A：random()
 *   if (this.timer) {
 *     this.finished = true; clearInterval(this.timer); this.timer = null; this.submit();
 *   } else {
 *     this.timer = setInterval(() => { this.data = this.shuffle(this.data) }, 100)
 *   }
 * 注：dist 在 else 分支没有「数据为空」的判断，此处保持一致。
 */
function random() {
  if (timer.value) {
    finished.value = true
    clearInterval(timer.value)
    timer.value = null
    submit()
  } else {
    timer.value = setInterval(() => {
      data.value = shuffle(data.value)
    }, 100)
  }
}

/**
 * 【dist 证据】A：submit()
 *   const e = [];
 *   for (let t = 0; t < this.data.length; t++)
 *     e.push({ id: this.data[t].id, order_index: t + 1 });
 *   this.$api.admin.chouqian.update({ data: e }).then(({data:e}) => {
 *     0 === e.code ? ElMessage.success("抽取成功！") : ElMessage.error(e.msg)
 *   })
 * 注：dist 此处没有并发保护，也没有 try/catch。
 * 【偏离 dist·已修正】补 .catch —— 该端点当前被后端路由遮蔽，实际返回 405，
 *   而拦截器对 405 只 console.log 不提示，缺了 .catch 时「停止抽取」看起来像没生效，
 *   但抽签顺序其实并未写入后端，现场会误以为已经保存。
 */
function submit() {
  const payload = {
    data: data.value.map((x, i) => ({ id: x.id, order_index: i + 1 }))
  }
  adminApi.chouqian.update(payload).then(res => {
    const body = res && res.data
    body.code === 0 ? ElMessage.success('抽取成功！') : ElMessage.error(body.msg)
  }).catch(err => {
    showApiError(err, '保存抽签顺序失败')
  })
}

/**
 * 【dist 证据】A：exportResult()
 *   this.$api.admin.chouqian.export(this.type).then(e => {
 *     this.downloadExcelFile(e.data, getTypeName(Number(this.type)) + "------现场展演抽签顺序表")
 *   })
 * 注：dist 此处没有 try/catch，也没有空响应判断。
 * 【偏离 dist·已修正】补 .catch：导不出来时必须有反馈，否则用户会以为文件已下载。
 */
function exportResult() {
  adminApi.chouqian.exportOne(type.value).then(res => {
    downloadExcelFile(res.data, getTypeName(type.value) + '------现场展演抽签顺序表')
  }).catch(err => {
    showApiError(err, '导出失败')
  })
}

onMounted(() => {
  getData()
})

/**
 * 【偏离 dist·已修正】
 *   dist 的 b9ad 模块没有任何销毁钩子（已确认 beforeDestroy / destroyed /
 *   beforeUnmount / unmounted 在其产物中命中 0 次）。后果是：用户点击
 *   「开始抽取」后直接点「返回」，那个 100ms 的 setInterval 会永久留在后台 ——
 *   闭包持有组件实例导致内存无法回收，且每遗弃一次抽签页就多累加一个定时器
 *   （在已销毁实例上持续执行 this.data = this.shuffle(this.data)）。
 *   已销毁实例无法触发 submit()，因此不会写坏数据，但资源泄漏是真实的。
 *   此处主动修复：组件卸载时清除定时器。这是本项目唯一一处有意偏离 dist 的行为。
 */
onBeforeUnmount(() => {
  if (timer.value) {
    clearInterval(timer.value)
    timer.value = null
  }
})
</script>

<style lang="scss" scoped>
/*
 * 全量搬运自 css/chunk-86f040fe.574698d8.css（14 条规则，scoped id 2b31d9ea）。
 * 仅去掉 [data-v-2b31d9ea] 属性选择器（由 Vue SFC 编译期生成等价的 scoped 属性）。
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

.return-button {
  position: absolute;
  left: 100px;
  top: 25px;
}

.title {
  font-size: 40px;
  font-weight: 700;
  text-align: center;
  line-height: 80px;
  color: #e70c0c;
  background-color: rgba(244, 180, 208, 0.3607843137254902);
  background-size: cover;
  transition: all 0.7s;
}

.box {
  position: relative;
  padding: 40px;
  width: 60%;
  left: 20%;
  margin-top: 20px;
}

/* ---- 以下 2 条为 dist 残留，b9ad 模板中无 .box-all / .box-title 元素 ---- */
.box-all {
  color: #fff;
}

.box-title {
  margin-bottom: 10px;
  margin-left: 4px;
  margin-top: 20px;
  padding-bottom: 10px;
  font-weight: 700;
  font-size: 19px;
  border-bottom: 1px dashed #fff;
}
/* ---- dist 残留结束 ---- */

/* ---- 以下 1 条为 dist 残留，b9ad 模板中无 .options 元素 ---- */
.options {
  position: relative;
  padding: 10px;
  background-color: #fff;
  box-shadow: 5px 5px 5px #ccc;
}
/* ---- dist 残留结束 ---- */

.box-item {
  vertical-align: top;
  display: inline-flex;
  flex-direction: column;
  border: 5px solid #f2b3b3;
  border-radius: 10px;
  margin: 5px;
  width: 170px;
  height: 200px;
  box-sizing: border-box;
  padding: 10px 5px;
  text-align: center;
  overflow: hidden;
  background-color: #f2b3b3;
}

.index-number {
  font-weight: bolder;
  font-size: 33px;
  margin-bottom: 10px;
  margin-left: 4px;
  margin-top: 20px;
  padding-bottom: 10px;
  border-bottom: 1px dashed #fff;
}

.program-name {
  font-size: 20px;
  font-weight: 700;
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
  margin: 20px 0;
}

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
</style>
