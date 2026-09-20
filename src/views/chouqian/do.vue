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
          case 1: return "大学组（非专业组）";
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

  【后端契约：A】
    GET    /admin/chouqian/{type}        -> { code: 0, msg, data: [Draw] }
    PUT    /admin/chouqian/update        body: { data: [{id, order_index}] }  -> { code: 0, msg, data: null }
    GET    /admin/chouqian/export/{type} -> Blob (xlsx)
    详见 yilinbei/apps/api/views.py draw_list/draw_update/draw_export
    与 adminApi.chouqian.{getByType, update, exportOne} 一致。

  【dist 已知缺陷·不擅自修复】
    1) data() 初始 data: {} 错误（应该是 []）；运行中 mounted 时会被 API 返回覆盖，故无影响。
       Vue3 中改为 ref([]) 保持视觉一致。
    2) temp 数组存放的是「每类别的固定学校名（4 个组）」，dist 中只在 data 尚未加载时
       可能被消费（这里它的实际作用是后端初始化/导出兜底数据？不确定）。保留为 data 兜底
       —— 但 Vue3 中不让它显示给前端用户，只作为「后端返回为空时的占位」。
    3) b9ad 没有 Tabs 相关代码。点击「返回」直接 $router.push("/chouqian/index"),
       没有 tabsStore.addTab —— 这是 dist 的真实行为，不补 tabs。
-->
<template>
  <div class="content">
    <el-button class="return-button" size="small" @click="goBack">返回</el-button>
    <p class="title">{{ typeName }}------现场展演顺序抽签</p>

    <div class="box">
      <div
        v-for="(item, idx) in data"
        :key="item.id != null ? item.id : idx"
        class="box-item"
      >
        <div class="index-number">{{ idx + 1 }}</div>
        <div class="program-name">{{ item.name }}</div>
      </div>

      <div v-if="loading" class="empty-tip">加载中...</div>
      <div v-else-if="data.length === 0" class="empty-tip">暂无抽签数据</div>

      <div class="start">
        <div
          class="random-button"
          :class="{ running: !!timer }"
          @click="random"
        >{{ timer ? '停止抽取' : '开始抽取' }}</div>
        <el-button
          class="my-button"
          size="small"
          :loading="exporting"
          :disabled="data.length === 0"
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
 *   - 销毁前需要清掉 setInterval（防止离开页面后 timer 仍在跑）
 */
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { adminApi } from '@/api/admin'
import { downloadExcelFile } from '@/utils/excel'

const route = useRoute()
const router = useRouter()

const data = ref([])
const loading = ref(false)
const exporting = ref(false)
const timer = ref(null)
const finished = ref(false)
const showname = ref(false)

const type = computed(() => String(route.params.type || ''))

const typeName = computed(() => {
  switch (Number(type.value)) {
    case 1: return '大学组（非专业组）'
    case 2: return '大学组（专业组）'
    case 3: return '教师组'
    case 4: return '中小学组'
    default: return '未知分组'
  }
})

function getTypeName(t) {
  switch (Number(t)) {
    case 1: return '大学组（非专业组）'
    case 2: return '大学组（专业组）'
    case 3: return '教师组'
    case 4: return '中小学组'
    default: return '未知分组'
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
 */
async function getData() {
  if (!type.value) {
    ElMessage.error('缺少分组参数 type')
    return
  }
  loading.value = true
  try {
    const res = await adminApi.chouqian.getByType(type.value)
    const body = res && res.data
    if (!body) {
      ElMessage.error('响应为空')
      return
    }
    if (body.code === 0) {
      data.value = Array.isArray(body.data) ? body.data : []
    } else {
      ElMessage.error(body.msg || '获取抽签数据失败')
    }
  } catch (e) {
    // axios 拦截器已处理 4xx/5xx，这里只兜底网络错误
    ElMessage.error('获取抽签数据失败')
  } finally {
    loading.value = false
  }
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
 */
function random() {
  if (timer.value) {
    finished.value = true
    clearInterval(timer.value)
    timer.value = null
    submit()
  } else {
    if (data.value.length === 0) {
      ElMessage.warning('暂无抽签数据')
      return
    }
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
 */
async function submit() {
  const payload = {
    data: data.value.map((x, i) => ({ id: x.id, order_index: i + 1 }))
  }
  // 防止并发提交（dist 没有处理；Vue3 显式加一层保护）
  if (submitting.value) return
  submitting.value = true
  try {
    const res = await adminApi.chouqian.update(payload)
    const body = res && res.data
    if (!body) {
      ElMessage.error('提交失败：响应为空')
      return
    }
    if (body.code === 0) {
      ElMessage.success('抽取成功！')
    } else {
      ElMessage.error(body.msg || '抽取失败')
    }
  } catch (e) {
    ElMessage.error('抽取失败')
  } finally {
    submitting.value = false
  }
}

const submitting = ref(false)

/**
 * 【dist 证据】A：exportResult()
 *   this.$api.admin.chouqian.export(this.type).then(e => {
 *     this.downloadExcelFile(e.data, getTypeName(Number(this.type)) + "------现场展演抽签顺序表")
 *   })
 */
async function exportResult() {
  if (exporting.value) return
  exporting.value = true
  try {
    const res = await adminApi.chouqian.exportOne(type.value)
    const blob = res && res.data
    if (!blob) {
      ElMessage.error('导出失败：响应为空')
      return
    }
    downloadExcelFile(blob, getTypeName(type.value) + '------现场展演抽签顺序表')
  } catch (e) {
    ElMessage.error('导出失败')
  } finally {
    exporting.value = false
  }
}

onMounted(() => {
  getData()
})

onBeforeUnmount(() => {
  // 防止切走页面后 setInterval 仍在跑
  if (timer.value) {
    clearInterval(timer.value)
    timer.value = null
  }
})
</script>

<style lang="scss" scoped>
/*
 * 布局尽量按 dist 命名还原。dist CSS 中没有 .content/.box/.random-button 等样式
 * （已 grep 全部 chunk-*.css 确认），故这里的样式属于「按 dist 命名 + 合理还原」，
 * 证据等级 B。
 */
.content {
  width: 100%;
  min-height: calc(100vh - 120px);
  padding: 30px 16px;
  box-sizing: border-box;
}

.return-button {
  margin-bottom: 12px;
}

.title {
  text-align: center;
  font-size: 22px;
  font-weight: 600;
  color: #303133;
  margin: 10px auto 30px;
}

.box {
  max-width: 900px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  padding: 30px 24px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  min-height: 360px;
}

.box-item {
  display: flex;
  align-items: center;
  background: #f7f8fa;
  padding: 12px 16px;
  border-radius: 4px;
  border: 1px solid #ebeef5;
}

.index-number {
  flex: 0 0 60px;
  font-size: 18px;
  font-weight: 700;
  color: #4b6cb7;
  text-align: center;
}

.program-name {
  flex: 1;
  font-size: 15px;
  color: #303133;
  word-break: break-all;
}

.empty-tip {
  text-align: center;
  color: #909399;
  padding: 30px 0;
}

.start {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  padding: 20px 0 4px;
  border-top: 1px dashed #ebeef5;
  margin-top: 16px;
}

.random-button {
  display: inline-block;
  min-width: 120px;
  padding: 9px 20px;
  background: #4b6cb7;
  color: #fff;
  text-align: center;
  border-radius: 4px;
  cursor: pointer;
  user-select: none;
  font-size: 14px;
  transition: background 0.2s ease;

  &:hover { background: #3a579e; }
  &.running { background: #f56c6c; }
  &.running:hover { background: #e35555; }
}

.my-button { min-width: 160px; }
</style>
