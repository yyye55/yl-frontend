<template>
  <div class="inline">
    <p class="text" @click.stop="drawer = true">{{ text }}</p>

    <!--
      dist 原文：
        t("el-drawer",{attrs:{title:"报名须知",visible:e.drawer,"custom-class":"content","with-header":!1},
                       on:{"update:visible":function(t){e.drawer=t}}},[[t("p",{staticStyle:{"line-height":"30px"}},[...])]],2)

      `custom-class` 的替换理由见文件头「移植理由 3」。
    -->
    <el-drawer v-model="drawer" class="content" title="报名须知" :with-header="false">
      <p style="line-height: 30px"> （一）报名对象。面向参加过四川省乐团指导教师公益培训项目的学校，或愿意参加此次管乐展示活动的其他中小学、高校乐团。乐团须以学校为单位组建，中小学乐团指挥须为本校在职教师；高校乐团指挥可为本校在职教师或在校学生；乐团成员须为本校在校学生。管乐团分为小学组、中学组和大学组。铜管乐团分为小学组和中学组。 <br />（二）乐团要求。乐团须具有完整编制，其中管乐团应包含铜管（含圆号、小号、长号、次中音号和大号等）、木管（含长笛、单簧管、萨克斯管等）以及打击乐器，且具有一定的演奏水平。管乐团正式成员不少于35人，不超过65人（报名时可报预备队员5人）；铜管乐团正式成员不少于20人，不超过45人，其中打击乐不超过8人（报名时可报预备队员3人）。每所学校每个组别限报一支队伍，小学组、中学组可各报一支（最多两支），大学组限报一支。乐团名单报名确定后不得更改，如经资格审查有非本校师生的，则取消报名资格和成绩。 <br />（三）展示曲目。管乐团、铜管乐团现场展示曲目均为指定曲目和自选曲目各一首，指定曲目详见附件1。 <br />（四）视奏要求。管乐团各组别参展乐团须在现场展示时进行视奏，并在规定时间内完成。视奏成绩满分5分，计入展示总分；未参加视奏的乐团，视奏成绩计0分，并在展示总分中扣除2分。视奏乐曲于现场当场抽取；铜管乐团现场展示不进行视奏。 <br />（五）展示时长。管乐团指定曲目、自选曲目两首乐曲及视奏乐曲的总展示时间为：小学组不超过12分钟，中学组不超过15分钟，大学组不超过18分钟；铜管乐团指定曲目、自选曲目的总展示时长为：小学组、中学组均不超过10分钟。总展示时间从第一个学生上台开始，至最后一个学生下台结束；每超出1分钟扣1分，不足1分钟按1分钟计。 </p>
    </el-drawer>
  </div>
</template>

<script setup>
/**
 * 「我已阅读报名须知」可点击文本 + 报名须知抽屉
 *
 * ===========================================================================
 * 【dist 已确认】来源：dist/chunk-0294a80a.165638130932c3751d03.js 模块 1c76
 * 该模块被 16 个报名页共用（对 dist 全量检索 `name:"HaveToRead"` 共 16 处命中，
 * 且逐个抽取比对过字节，16 份内容完全相同 —— 是 webpack 把它复制进了每个路由 chunk，
 * 不存在按 type 区分的多个变体）。在这些页面里 import 为 `HaveToRead`：
 *   t("el-form-item",{attrs:{label:"报名须知"}},[
 *     t("el-checkbox",{...勾选 form.read}),
 *     t("HaveToRead")            // ← 不带任何 props，type/text 都走默认值
 *   ])
 *
 * dist 原文组件选项（逐字）：
 *
 *   name:"HaveToRead",
 *   props:{ type:{type:Number,default:1}, text:{type:String,default:"我已阅读报名须知"} },
 *   components:{[ElDrawer.name]:ElDrawer},
 *   data(){ return { drawer:!1 } },
 *   // 无 watch / 无 computed / 无生命周期钩子 / 无对外方法
 *
 * ===========================================================================
 * 【重要】抽屉里的须知正文**不是** dist 原文
 * ===========================================================================
 * dist 那整段须知（报名对象 / 乐团要求 / 展示曲目 / 视奏要求 / 展示时长）
 * 已在提交 0da9b13「我已阅读报名须知核对修改」里**按第十二届红头文件重新录入**。
 * 因此上面「dist 原文组件选项（逐字）」一节只覆盖**组件结构与 props**，
 * 不覆盖正文文字 —— 不要拿它当正文的依据。
 *
 * 2026-09-22 用字符级 LCS 逐段比对过 dist 原文与本文正文，5 段结果如下
 * （〔- -〕= dist 有而本文没有，〔+ +〕= 本文有而 dist 没有）：
 *
 * · 段 3「展示曲目」：**逐字节完全相同**。
 * · 段 1「报名对象」：纯措辞书面化 —— 曾参与→参加过；需→须；可以为→可为；
 *   「中小学指挥」→「中小学乐团指挥」；三处逗号改分号。
 * · 段 2「乐团要求」：
 *   【语义修正】dist 写的是「木管（含长笛、单簧管、萨克斯管**以及打击乐器等**）」，
 *   把打击乐器归进了「木管」的括号内 —— 打击乐器不是木管，这是 dist 自身的
 *   排版错误。本文改为「木管（含长笛、单簧管、萨克斯管等）**以及打击乐器**」。
 *   其余：每个学校限一支队伍参加一个组别 →（见下方【2026-09-23 口径变更】，
 *   这一句现已**不按红头文件原文**）；（在报名时可报预备队员3人）→（报名时可报预备队员3人）。
 *
 *   【2026-09-23 口径变更 —— 这不是录入错误，不要照着红头文件改回去】
 *   红头文件原文是「每所学校限报一支队伍，且只能参加一个组别。」组委会后来放宽：
 *   有同时设小学和中学的学校，本就应当能各报一支。现口径为
 *   「每所学校每个组别限报一支队伍，小学组、中学组可各报一支（最多两支），大学组限报一支」。
 *   本节与后端额度校验（apps/core/report_drafts.py 的 assert_report_quota）必须同步，
 *   只改此处会让页面承诺的额度与系统实际放行的额度对不上。
 *   注：系统里该档取值是「中学组」，没有「初中组」。
 *
 *   【2026-09-23 补充口径 —— 组别与渠道的对应关系】
 *   · 市级渠道**不得出现「大学组」**，大学组只归高校渠道。这与乐团类型无关，
 *     管乐团、铜管乐团同规则。
 *   · 「最多两支」必然是一支小学 + 一支中学：渠道只放两个组别，配额又按组别各 1 支，
 *     两者相乘即上限 2，所以系统上不可能出现「两支小学组」。
 *   · 两支的乐团类型互相独立 —— 小学管乐团 + 中学铜管乐团是允许的，相同当然也可以。
 *   · 可以只报一支，不是必须报满两支。
 *   后端已落实为 REPORT_ALLOWED_GROUPS / assert_group_allowed
 *   （apps/core/report_drafts.py，经 assert_report_quota 生效）：市级报大学组会被拒，
 *   文案「市级渠道只能报送小学组或中学组，不能报送大学组」。
 *   ⚠️ **高校端（scope 0）本次刻意不加这条校验**，省级端（scope 4）同理不配表
 *   —— 未配表的 scope 一律放行。补全这张表时别顺手把高校端也圈进去。
 * · 段 4「视奏要求」：参演乐团→参展乐团；必须→须；
 *   「成绩为5分，**单独**计入展示总分」→「成绩满分5分，计入展示总分」；
 *   「没有视奏的乐团在总分里直接扣除2分」→「未参加视奏的乐团，视奏成绩计0分，
 *   并在展示总分中扣除2分」；将于当场抽取→于现场当场抽取；
 *   铜管乐团不视奏→铜管乐团现场展示不进行视奏。
 * · 段 5「展示时长」：总**展演**时间 / 总**展演**时长 / 总**表演**时间 三种说法
 *   统一为「总展示时间」；补「两首乐曲」；
 *   「每超出一分钟扣1分，超出不足1分钟扣一分」→「每超出1分钟扣1分，
 *   不足1分钟按1分钟计」。
 *
 * 【结论】除段 2 的「打击乐器」归属一条外，其余全是措辞书面化，
 * **不改变任何报名口径**。段 5 的数值 12/15/18/10 两版一致，
 * 与 OrchestraForm.vue 的 minuteValidator 也一致。
 * （上述结论截至 2026-09-22 的这次比对；2026-09-23 的限报口径变更是**有意为之**的
 *   修改，不是「措辞书面化」，见段 2 下的【2026-09-23 口径变更】。）
 * （2026-09-22 另修正两处录入笔误：`（一））报名对象`→`（一）报名对象`、
 *   补回丢失的 `（二）` 编号。）
 *
 * ===========================================================================
 * 逐条移植理由
 * ===========================================================================
 * 1) `:visible.sync`（dist 写的是 visible + update:visible 回调）→ `v-model="drawer"`
 *    Element Plus 的 el-drawer 用 modelValue / update:modelValue，语义与 dist 的
 *    visible / update:visible 一一对应。这是项目既定的 Element UI 2 → Element Plus 改法。
 *
 * 2) `slot="xxx"`：本组件 dist 原文没有具名插槽（只有一个默认插槽装那段须知正文），
 *    因此不涉及 slot → <template #xxx> 的改写。
 *
 * 3) 【Element Plus 差异】`custom-class="content"` → `class="content"`
 *    dist 依靠 custom-class 把 `content` 类挂到 el-drawer 的**根元素**上，
 *    而本组件的 scoped 样式里有两条规则要命中它：
 *        :deep(.content)  → padding:20px / display:block / line-height:20px / font-size:14px / color:#4b4b4b
 *        .el-drawer__body → height:100% / overflow-y:auto
 *    【dist 已确认】Element Plus 2.14.6 的 el-drawer **已没有 customClass 这个 prop**
 *    （node_modules/element-plus/es/components/drawer/src/drawer.mjs 的 drawerProps =
 *      dialogProps + direction/resizable/size/withHeader/modalFade/headerAriaLevel；
 *      drawer.vue...mjs 里 `inheritAttrs:!1` 且把 `_ctx.$attrs` 直接 merge 到内层抽屉 div 上）。
 *    也就是说：若继续写 custom-class，它只会变成内层抽屉 div 上一个名为 `custom-class` 的
 *    普通 DOM 属性，**不会**成为类名 —— 上面第 1 条 padding/字号规则会静默失效，
 *    抽屉正文将贴着边缘、用默认字号。
 *    改为 `class="content"` 后，Element Plus 会把 class 并入根元素的
 *    `class: [ns.b(), direction, ...]`，得到 `el-drawer rtl content`，视觉结果与 dist 一致。
 *    这是「同一意图的等价写法」，不是新增功能。
 *
 * 4) 作用域选择器 `.el-drawer__body[data-v-74479e2e]` 原样保留
 *    dist 的编译结果就是给 `.el-drawer__body` 追加了作用域属性（等于要求抽屉的 body
 *    自己带 data-v-74479e2e），而 el-drawer__body 是子组件内部节点、拿不到父组件的作用域属性，
 *    因此这条规则**在 dist 里本来就是不生效的**。这里写成同名的普通选择器，
 *    Vue 3 的 scoped 编译行为与 Vue 2 相同（同样追加属性、同样不生效），
 *    即保持与 dist 完全一致的（无效）结果，不做「顺手改成 :deep()」的修复。
 *
 * 5) 为什么 :deep(.content) 在本项目里能命中：
 *    el-drawer 默认把内容 Teleport 到 body（EP: `appendTo:"body"`），但只有当
 *    `appendToBody` 为真时 Teleport 才真正启用（`disabled: appendTo!=="body" ? false : !appendToBody`），
 *    而 appendToBody 默认 false → Teleport 被禁用 → 抽屉就地渲染在 div.inline 之内，
 *    于是 `[data-v-74479e2e] .content` 有祖先可匹配。Element UI 2 的 el-drawer 同样是
 *    append-to-body 默认 false、就地渲染，两边一致。
 *
 * 6) `with-header="false"` + `title="报名须知"` 两个属性都原样保留
 *    （标题因为 with-header=false 不会渲染，但 dist 就是这么写的，不删）。
 *
 * 7) `type` prop 原样保留（Number，默认 1）
 *    【dist 已确认】`type` 在 dist 的模板与脚本里**从未被读取**（本组件 16 份副本逐一确认），
 *    是声明了但没用的 prop。保留它是因为它是组件对外契约的一部分
 *    （默认值 1 属于 API 形状），且「不要删除 dist 里有的东西」。
 *    text prop 则是真正被用于渲染的（默认值 "我已阅读报名须知"）。
 *
 * 8) 无需要暴露给父组件的方法 → 不使用 defineExpose（dist 也没有）。
 *
 * 9) 图标：dist 未使用任何图标，故无需 import @element-plus/icons-vue。
 *    （el-drawer 自带的关闭按钮图标由 Element Plus 内部引入，
 *     本组件 with-header=false 时连它也不会渲染。）
 *
 * 【dist 已知缺陷】无。点击区域用 `.stop` 阻止冒泡（dist 是 t.stopPropagation()），
 * 这是必要的：本组件常被放在 el-form-item / el-checkbox 旁边，冒泡会误触外层。
 */

import { ref } from 'vue'

defineProps({
  /** 【dist 已确认】声明了但组件内从未使用，仅为保持 API 形状 */
  type: { type: Number, default: 1 },
  text: { type: String, default: '我已阅读报名须知' }
})

const drawer = ref(false)
</script>

<style lang="scss" scoped>
/* dist/css/chunk-0294a80a.260c9e35.css 中 [data-v-74479e2e] 的全部 4 条规则 */
.text {
  color: #1890ff;
}

.inline {
  display: inline-block;
  margin-left: 15px;
  cursor: pointer;
  height: 100%;
}

/* dist 编译结果： [data-v-74479e2e] .content{...} —— 即源码里的 /deep/ 或 ::v-deep .content */
:deep(.content) {
  padding: 20px;
  display: block;
  line-height: 20px;
  font-size: 14px;
  color: #4b4b4b;
}

/* dist 编译结果： .el-drawer__body[data-v-74479e2e],[data-v-74479e2e] .content{...}
   前半条在 dist 里就不生效（子组件内部节点没有父作用域属性），此处保持同名普通选择器 */
.el-drawer__body,
:deep(.content) {
  height: 100%;
  overflow-y: auto;
}
</style>
