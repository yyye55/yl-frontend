<template>
  <div>
    <el-button type="text" @click="dealWith">查看人员信息</el-button>
    <!--
      append-to-body —— 必须加，否则弹窗会被后面的列盖住。
      本组件渲染在 el-table 的单元格里，而 Element Plus 给 .el-table__cell 加了
      `position: relative; z-index: 1`，**每个 td 因此自成层叠上下文**。
      弹窗不 teleport 出去的话，el-overlay 的 z-index:2005 只能在所在 td 内部比拼；
      而状态列/操作列那些 td 同为 z=1、在 DOM 里又更靠后，于是「待审核」「查看详情」
      「编辑」「删除」整条盖在弹窗上面 —— 用户看到的就是「外面的白框出现在了里面，
      还可以看到待审核三个字」。
      实测（__debug__/probe-stack.cjs）：遮罩矩形本身是 0,0 1440x900、满视口，
      位置没问题，坏的只是层叠顺序。
    -->
    <!--
      width="60%" —— 把弹窗从 EP 默认的 50% 放宽到 60%。

      【机制】EP 把 width 写进 CSS 变量 --el-dialog-width（EP 源码 use-dialog.mjs:37-38，
      addUnit(props.width)：字符串原样透传，只有数字才补 px），
      再由 .el-dialog{ width: var(--el-dialog-width, 50%) } 生效。
      弹窗是 box-sizing:border-box、左右各 16px 内边距 → 内容可用宽度 = 弹窗宽度 − 32px。

      【为什么是 60%】实测数据见下（用真实的两张表 + 真实列定义量的）。

      先看两张表各自需要多少「内容可用宽度」才完全放得下
      （内容可用宽度 = 弹窗宽度 − 32px 内边距）：
          指导教师表  870px（7 列）
          参展人员表 1300px（11 列，瓶颈在这张）
      这两个数字在 1366 / 1440 / 1920 三个屏幕上分别测出来完全吻合。

      再看各档宽度下两张表还剩多少横向溢出（单位 px）：

        弹窗宽度     1366 屏                 1440 屏                 1920 屏
        50%(原默认)  651px 师滚219 展滚649    688px 师滚182 展滚612    928px 师滚  0 展滚372
        60%(现在)    788px 师滚 82 展滚512    832px 师滚 38 展滚468   1120px 师滚  0 展滚180
        80%         1061px 师滚  0 展滚239   1120px 师滚  0 展滚180   1504px 师滚  0 展滚  0
        95%         1266px 师滚  0 展滚 34   1336px 师滚  0 展滚  0   1792px 师滚  0 展滚  0

      （每格前面那个数（如 651px）是当时的内容可用宽度；
        「师」= 指导教师表，「展」= 参展人员表，「滚」= 还需要横向滚多少）

      选 60% 的理由：两张表的拥挤都明显缓解（1440 屏上参展人员表从 612px 降到 468px），
      又不会把小屏撑满 —— 1366 屏上弹窗 820px，左右还留有余地；
      同时保留了一定的横滚量，正好用得上「按住表格左右拖动」。
      95% 能让 1440 及以上完全不滚，但 1366 上会撑到 1298px（几乎满屏），观感太挤；
      而且一旦不溢出，拖动也就没得拖了 —— 功能还在，只是没有可滚的内容。

      【副作用】本组件被 5 个页面共用（ReportList / admin/report / CommitteeReportList /
      TeacherList / colleges），它们弹的是同一个框，所以会**一起变宽** —— 这是预期的，
      不会出现「有的页面宽、有的窄」。除此之外不改任何文件、任何逻辑。
      写法与项目里其它弹窗一致（ModifyUserInfo 用 40%、admin/user 用 50%）。
    -->
    <el-dialog v-model="dialogTableVisible" title="人员信息" width="60%" append-to-body>
      <!--
        指导教师表 —— 【本轮新增】多了 ref="teacherTableRef"：
        拖拽要拿它往下钻到表格内部真正滚动的节点（原因见 <script> 里的 DOM 图）。
        列定义与原件逐字一致，没有增删改。
      -->
      <div class="show-title">指导教师</div>
      <el-table
        ref="teacherTableRef"
        :data="teacher"
        border
        style="width:100%"
        :scrollbar-always-on="true"
      >
        <el-table-column type="index" label="序号" width="60" align="center" header-align="center" />
        <el-table-column prop="person_info.name" label="姓名" width="100" align="center" header-align="center" />
        <el-table-column prop="person_info.card" label="身份证号" width="200" align="center" header-align="center" />
        <el-table-column prop="person_info.gender" label="性别" align="center" header-align="center" />
        <el-table-column prop="person_info.age" label="年龄" align="center" header-align="center" />
        <el-table-column prop="person_info.school" label="学校名称" width="200" align="center" header-align="center" />
        <el-table-column prop="person_info.phone" label="联系电话" width="150" align="center" header-align="center" />
      </el-table>

      <!--
        参展人员表 —— 与上面那张的差别只在列：多了「身份/角色/使用乐器/头像」四列。
        两张表都挂了 ref（各自的拖拽靠它定位内部滚动节点），
        也都开了 :scrollbar-always-on（只加一张会显得像 bug）。
        列定义与原件逐字一致，没有增删改。
      -->
      <div class="show-title">参展人员</div>
      <el-table
        ref="personTableRef"
        :data="person"
        border
        style="width:100%"
        :scrollbar-always-on="true"
      >
        <el-table-column type="index" label="序号" width="60" align="center" header-align="center" />
        <el-table-column prop="person_info.name" label="姓名" width="100" align="center" header-align="center" />
        <el-table-column prop="person_info.card" label="身份证号" width="200" align="center" header-align="center" />
        <el-table-column prop="person_info.gender" label="性别" align="center" header-align="center" />
        <el-table-column prop="person_info.age" label="年龄" align="center" header-align="center" />
        <el-table-column prop="person_info.school" label="学校名称" width="200" align="center" header-align="center" />
        <el-table-column prop="person_info.phone" label="联系电话" width="150" align="center" header-align="center" />
        <el-table-column label="身份" align="center" header-align="center">
          <template #default="{ row }">
            <span v-if="row.type === 0">学生</span>
            <span v-else-if="row.type === 1">教师</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="角色" width="100" align="center" header-align="center">
          <template #default="{ row }">
            <span v-if="row.position === 0">正式队员</span>
            <span v-else-if="row.position === 1">预备队员</span>
            <span v-else-if="row.position === 2">指挥</span>
            <span v-else-if="row.position === 3">伴奏</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="person_info.instrument" label="使用乐器" width="150" align="center" header-align="center" />
        <el-table-column prop="person_info.head" label="头像" width="100" align="center" header-align="center">
          <template #default="{ row }">
            <img :src="row.person_info.head" style="width:59px;height:82px" />
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup>
/**
 * ShowPerson 报名人员信息弹窗（指导教师 / 参演人员两张表）
 *
 * 【可信度：A】逐行照搬 dist chunk-335604d9 的模块 064f（报名列表页的「人员信息」列共用）。
 * 原文组件选项：
 *
 *   name:"ShowPerson",
 *   props:{ data:{ default:[] } },
 *   mounted(){},
 *   data(){ return { dialogTableVisible:!1, teacher:[], person:[] } },
 *   methods:{
 *     dealWith(){
 *       this.dialogTableVisible = !0,
 *       this.data.length > 0 || (this.data = [this.data]),   // 规范化成数组
 *       this.person = [], this.teacher = []
 *       for (let e = 0; e < this.data.length; e++)
 *         4 === this.data[e].position ? this.teacher.push(this.data[e]) : this.person.push(this.data[e])
 *     }
 *   }
 *
 * 【取值依据（关键）】
 *   身份 row.type     ：0 学生 / 1 教师 / 其他 -
 *   角色 row.position ：0 正式队员 / 1 预备队员 / 2 指挥 / 3 伴奏 / 其他 -
 *                       （position === 4 不参与「角色」列，而是被拆到上方「指导教师」表）
 *   —— 与后端 ReportPerson 模型一致（apps/core/models.py: `position`、`type` 均为 IntegerField）。
 *   子字段 person_info.* 来自 report_dict 的
 *   `item["person_info"] = model_dict(Person.objects.filter(pk=link.person_id).first())`，
 *   Person 模型确有 name / card / gender / age / school / phone / instrument / head 字段。
 *
 * 【与 dist 的差异（两处，均为适配 Vue 3 或修正明显笔误）】
 *  1. 列属性用 `prop` 而非 dist 原文的 `property`。
 *     dist 是 Element UI 2.x 写法；`property` 在 Element Plus 中已是废弃别名，
 *     统一改用现行的 `prop`，渲染结果完全一致。
 *  2. dealWith 不再改写 props.data。
 *     原文 `this.data.length>0 || (this.data=[this.data])` 与 `this.person=[]` 都是直接改 prop。
 *     Vue 3 允许修改「传入对象自身的属性」，但这里改为用局部 ref 计算，
 *     结果数组与原版逐项相同，且不再产生对父组件的隐式副作用。
 *     规范化逻辑保持一致：数组且非空 -> 原样；否则（含空数组、非数组）-> 包成单元素数组。
 *
 * 【mounted 空钩子未迁移】原文 mounted(){} 为空实现。
 */
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { useDragScroll } from '@/composables/useDragScroll'

const props = defineProps({
  data: { default: () => [] }
})

const dialogTableVisible = ref(false)
const teacher = ref([])
const person = ref([])

function dealWith() {
  dialogTableVisible.value = true

  const raw = props.data
  // 等价于 dist 的 `this.data.length>0 || (this.data = [this.data])`
  const list = Array.isArray(raw) && raw.length > 0 ? raw : [raw]

  teacher.value = []
  person.value = []
  for (let i = 0; i < list.length; i++) {
    if (list[i] && list[i].position === 4) teacher.value.push(list[i])
    else person.value.push(list[i])
  }
}

/* ===========================================================================
 * 两张表：鼠标按住左右拖动横滚
 *
 * 效果本体是公共的 src/composables/useDragScroll.js（报名表单的
 * PersonTable / TeacherTable 也用它）。表格标签留在本文件里，
 * 通过各自的 ref 把「真正在滚的那个节点」交给它。
 *
 * 两张表用同一段逻辑（下面的 useTableDragScroll），只写一份、调用两次 ——
 * 不是复制粘贴两遍，避免以后改了一处忘了另一处。
 * =========================================================================== */

/** 指导教师表的组件实例 */
const teacherTableRef = ref(null)
/** 参展人员表的组件实例 */
const personTableRef = ref(null)

/**
 * 让一张 el-table 支持鼠标拖拽横滚。
 *
 * 【为什么必须钻到 el-table 内部去找滚动节点】
 * el-table 是**自己内部消化横向滚动**的 —— 给外层套 overflow-x:auto 永远不会溢出，
 * 真正在滚的节点埋在它内部（Element Plus 2.14.6 实测 DOM）：
 *
 *     div.el-table
 *      └ div.el-table__inner-wrapper
 *         ├ div.el-table__header-wrapper        ← 表头（overflow:hidden，可被程序化滚动）
 *         └ div.el-table__body-wrapper
 *            └ div.el-scrollbar
 *               └ div.el-scrollbar__wrap        ← 真正在滚的只有这一个（overflow:auto）
 *
 * 【为什么用 computed 包一层，而不是在 onMounted 里赋值】
 * computed 是惰性的：取值那一刻才执行 querySelector，
 * 而那一刻正是 useDragScroll 内部监听到 ref 有值时 ——
 * 于是不需要依赖「两个 onMounted 谁先谁后」这种脆弱假设。
 *
 * 【为什么这里能"原地"调用 useDragScroll】
 * 它现在会持续监听传入的 ref，元素晚一点出现也能自动挂上。
 * 这一点是必需的：el-dialog 默认懒渲染，本组件 setup 执行时两张表都还不存在。
 *
 * @param {import('vue').Ref} tableRef el-table 的模板 ref
 */
function useTableDragScroll(tableRef) {
  /** 真正在滚的节点：表格内容区 */
  const bodyRef = computed(
    () => tableRef.value?.$el?.querySelector('.el-scrollbar__wrap') ?? null
  )

  /**
   * 表头节点。为什么要单独挂一份：上面那张 DOM 图里，表头是 body-wrapper 的
   * **兄弟**、不在 .el-scrollbar__wrap 里面。只挂内容区的话，用户按在表头那一行
   * 是拖不动的（PersonTable 里表头能拖，因为它的表头在 .box 内部）。
   *
   * 它自身 overflow:hidden，但 overflow:hidden 的盒子**仍然是滚动容器**，
   * 程序化赋值 scrollLeft 有效（只是不显示滚动条）。其内部 table 的宽度与内容区
   * 完全相等（EP 给两者套的是同一个 tableBodyStyles），所以两边可滚范围一致。
   */
  const headRef = computed(
    () => tableRef.value?.$el?.querySelector('.el-table__header-wrapper') ?? null
  )

  /*
   * 两个节点各挂一份拖拽。useDragScroll 是幂等的通用件，直接调两次即可；
   * 它内部的状态（phase / pointerId / startX ...）是每次调用各自的闭包变量，
   * 两张表 × 两个节点共 4 份互不干扰，同时拖两处的极端情况也不会串状态。
   */
  useDragScroll(bodyRef)
  useDragScroll(headRef)

  /*
   * 表头 → 内容区 的反向同步。
   *
   * 【为什么必须有这一步】EP 的 syncPosition 只做**单向**同步：内容区 → 表头。
   * 我们拖表头时改的是 headerWrapper.scrollLeft，内容区不会自己跟上，
   * 结果就是「表头滑走了、下面的数据没动」。这里补上反向的那一半。
   *
   * 【为什么不会来回打架成死循环】
   *   拖表头 → headEl.scrollLeft = X → 触发 scroll → 本函数把 bodyEl.scrollLeft 设为 X
   *          → 触发 EP 的 syncPosition → 把 headEl.scrollLeft 再设为 X
   *          → **值没变，浏览器不派发 scroll 事件** → 到此为止。
   *   拖内容区 → bodyEl.scrollLeft = Y → EP syncPosition 把 headEl 设为 Y
   *          → 触发 scroll → 本函数要把 bodyEl 设为 Y → 值没变，不派发 → 到此为止。
   * 两条链路都靠「赋相同的值不触发事件」自然收敛。
   * 下面这个 !== 判断是双保险：即便某些浏览器在边界处有 ±1px 抖动，
   * 也不会把抖动放大成循环。
   *
   * 【状态为什么放在函数内部的闭包里】每张表各有一套 bodyEl / headEl，
   * 天然隔离，不需要用 Map 之类的结构按表去存。
   */
  let bodyEl = null
  let headEl = null

  function syncFromHeader() {
    if (bodyEl && headEl && bodyEl.scrollLeft !== headEl.scrollLeft) {
      bodyEl.scrollLeft = headEl.scrollLeft
    }
  }

  /*
   * 【为什么用 watch，而不是在 onMounted 里取一次】
   * 弹窗第一次打开前，headRef / bodyRef 都是 null（el-dialog 懒渲染，
   * 表格压根不在 DOM 里）。若在 onMounted 里取一次，取到的就是 null，
   * 监听器永远挂不上，表头就不跟着走。
   * 用 watch 盯住这两个 computed：弹窗一打开、表格一挂载，值变成真节点，监听器随即挂上。
   *
   * 元素被销毁重建时（本组件没走 destroy-on-close，正常不会发生）也能自愈：
   * 先摘旧的、再挂新的。
   *
   * passive: true —— 本监听器只读 scrollLeft、不回滚默认行为，
   * 声明成被动监听不会阻塞滚动线程（与 EP 自己在 style-helper.mjs 里的写法一致）。
   */
  watch(
    [headRef, bodyRef],
    ([head, body]) => {
      if (headEl) headEl.removeEventListener('scroll', syncFromHeader)
      headEl = head
      bodyEl = body
      if (head) head.addEventListener('scroll', syncFromHeader, { passive: true })
    },
    { immediate: true }
  )

  /*
   * 卸载清理。
   * 【什么时候会走到这里】弹窗**不是** destroy-on-close，所以关掉弹窗只会隐藏内容、
   * 组件一直活着，监听器不会重复挂。会卸载的是「父页面整个被销毁」—— 路由切走。
   * 那时必须把监听摘掉，否则这个 DOM 节点被回收后，监听里的 bodyEl 还指着旧节点。
   */
  onBeforeUnmount(() => {
    if (headEl) headEl.removeEventListener('scroll', syncFromHeader)
    headEl = null
    bodyEl = null
  })
}

/* 两张表各来一份。顺序无所谓，互不依赖。 */
useTableDragScroll(teacherTableRef)
useTableDragScroll(personTableRef)
</script>

<style lang="scss" scoped>
/* 两个小标题（「指导教师」「参展人员」）。元素在本组件模板里，所以样式也留在本组件。 */
.show-title {
  font-size: 16px;
  font-weight: 700;
  margin-top: 10px;
  margin-bottom: 10px;
}
</style>
