<template>
  <div class="container">
    <div class="options">
      <el-button style="color: #1890ff" type="text" @click="add">添加一行</el-button>
      <el-button style="color: #1890ff" type="text" @click="flush">清空</el-button>
      <!--
        【第十二届·第三轮】隐藏的单张照片上传通道，与参展人员表同款同源。
        整条 el-upload 加 hidden 不显示；用户点某一行「上传照片」时，
        upAvatar(index) 先记下要写哪一行，再 .click() 下面这个按钮去弹文件选择框。
        里面那个 <button> 不能删 —— el-upload 的文件选择框是挂在它的点击上的，
        它就是这个通道的「扳机」，只是被 hidden 藏起来了。
      -->
      <el-upload
        :http-request="uploadFileSingle"
        :before-upload="beforeUploadSingle"
        hidden
        :show-file-list="false"
      >
        <button ref="uploadAvatar" type="button">click</button>
      </el-upload>
    </div>
    <!-- ref 给 useDragScroll：按住表头行/序号列等空白处可鼠标拖动横滚 -->
    <div ref="boxRef" class="box">
      <!-- dist 里是编译期提升的静态子树 e._m(0) -->
      <div class="box-line-title">
        <div class="box-col">序号</div>
        <div class="box-col">姓名</div>
        <!--
          【第十二届·第五轮】新增列「署名排序」，位置在 姓名 与 身份证号 之间
          （产品明确指定「署名排序在表中的位置改为在姓名 身份证号 之间」）。
          注意：这一列只插了表头与行体两格，其余 9 列的顺序、宽度、控件一个都没动，
          所以老列不会错位、老数据的渲染结果逐像素不变。
        -->
        <div class="box-col">署名排序</div>
        <div class="box-col">身份证号</div>
        <div class="box-col">性别</div>
        <div class="box-col">年龄</div>
        <div class="box-col">学校名称</div>
        <div class="box-col">联系电话</div>
        <!-- 【第十二届·第三轮】新增列，位置与参展人员表一致（联系电话之后、操作之前） -->
        <div class="box-col">电子照片</div>
        <div class="box-col">操作</div>
      </div>

      <!--
        ===================================================================
        【第十二届·第五轮】教师指挥「带入行」—— 只读，仅署名排序可改
        【第十二届·第九轮】位置不再写死，由 CSS order 决定（原来在 v-for 之后，
                          第八轮整块挪到 v-for 之前，本轮回滚成"按 slot 排序"）
        ===================================================================
        来源：参展人员表里那一行「身份=教师 且 角色=指挥」（position=2，type=1）。
        用户要求：「在参展人员里面填写的某个人物的身份为教师同时角色为指挥时，
        自动把这条数据渲染到指导老师的表格里面」+「指导教师表里面的信息都禁止改动，
        只有署名排序可以进行修改」+「电子照片也要进行渲染」+「操作栏的按钮改为无」。

        【为什么不放进 v-for 的 data 数组 —— 这是整个方案的关键，四条硬理由】
        1. 会被当成用户填的数据提交上去。data 就是 getData()/getCacheData() 的返回值，
           父页面拿它拼 payload。指挥本人已经在参展人员表里提交过一次（position=2），
           再从这里提交一次，同一个人就发了两条 person 项。
        2. 会被算进人数上限。父页面 personRules.js 的 teacherCount = teachers.length
           数的是本表的 data。教师指挥时上限是 1，带入行一进去就占满，
           用户**一个手动指导老师都填不了**、表也永远提交不了。
        3. 会被「清空」误删。flush() 是 data.value = []，带入行跟着消失，
           可指挥还在参展人员表里 → 下一帧又冒出来，界面闪烁。
        4. 会变回可编辑。v-for 里的格子全是输入框，要做成只读得逐格判断，
           与「新增一格不要碰老代码」的原则冲突。

        【那它的数据从哪来】不走 data，改走父组件下发的 prop `conductor` ——
        直接是 form.person 数组里那个指挥对象的**同一个引用**（不是复制一份）。
        于是：参展人员表改指挥姓名 → 这里立刻跟着变；这里改署名排序 →
        form.person 里那个对象也立刻跟着变。所谓「双向同步」不是两份数据在对账，
        而是**同一份数据被两处引用**，同步成本为零。

        【第十二届·第九轮：序号 = 「进表先后」，指挥进表那一刻排在第几就永远排第几】
        第八轮把它钉死在第一行，用户随后纠正：那只对「指挥先进表」成立。用户要的完整规则：
          · 进表时表里**没有**指导老师 → 指挥就是第 1 行；之后点「添加一行」，
            指挥仍是 1，新老师从 2 开始排。
          · 进表时表里**已有**指导老师 → 老师占 1，指挥进表落在第 2 行。
        也就是：指挥不是"永远第一"、也不是"永远最后"，而是**按进表那一刻的位置定死**，
        之后再加行也不会把它的序号顶走 —— 这正是第八轮被反馈的问题（序号乱跳）。

        【怎么实现：记一个 slot，再用 CSS order 给它"插队"的能力】
        「进表那一刻表里有几行」由 script 里的 conductorSlot 记着（见该处注释）。
        渲染上，灰行要能插到手填行**中间**，所以本轮把 .box 改成纵向 flex，
        用 order 排序：表头 -1、手填行 2×i+1、带入行 2×slot（详见 style 里的注释）。
        三者的 order 互不相等，也就不存在依赖 DOM 顺序的平局。

        【已知边界，写在明面上免得以后被当成 bug 报回来】
        1. 这个顺序**没有存在任何字段里**，也不该存：序号本来就是纯展示的"第几行"，
           不提交、不校验、不导出，后端一个字都不看（硬塞字段还会被后端 services.py
           的 Person 字段白名单静默丢掉）。所以刷新页面 / 重进编辑页后无从查起，
           只能退回默认：**指挥排最后**（编辑页回显时数据里本来就是"老师行在前、
           参展人员在后的排布"）。只要页面不刷新，指挥的序号就不会再变。
        2. 手填行被删到比 slot 还少时（例：指挥 slot=1，老师只剩 0 行），指挥顺位前移 ——
           与手填行"删一行就重编号"的行为一致，用户已确认要这个。
        3. 「序号」列始终是纯展示的第几行；决定导出顺序的只有「署名排序」那一列
           （必填，1 / 2 各只能选一次）。两列都在显示 1/2，看表时以后者为准。

        【为什么署名排序用 :model-value + @change，而不是 v-model】
        v-model="conductor.signature_order" 的实质是「改 prop 对象的属性」，
        会被 eslint-plugin-vue 的 vue/no-mutating-props 判为违规。
        改成事件回传（emit），由父组件去改那个对象：多两行代码，但不违反规则，
        而且父子之间的数据流方向是明确的。
      -->
      <!-- order 越大越靠后：带入行取 2×slot，正好卡在第 slot 个手填行之后
           （手填行是 2×i+1，表头是 -1）。slot 由 script 里的 conductorOrder 算。 -->
      <div v-if="conductor" class="box-line box-line-conductor" :style="{ order: conductorOrder }">
        <!-- 序号 = slot + 1，与它在表里的视觉位置严格一致（见上方长注释） -->
        <div class="box-col">{{ conductorNo }}</div>
        <div class="box-col">{{ conductor.name || '-' }}</div>
        <div class="box-col">
          <!-- 与手填行完全同一套（必填、无「不填」项、placeholder 同文案），
               唯一区别是读写走 :model-value + @change，理由见上方注释 -->
          <el-select
            :model-value="conductor.signature_order"
            placeholder="请选择"
            class="signature-select"
            @change="onConductorSignature"
          >
            <el-option label="1" :value="1" :disabled="isSignatureTaken(1, 'conductor')" />
            <el-option label="2" :value="2" :disabled="isSignatureTaken(2, 'conductor')" />
          </el-select>
        </div>
        <!-- 以下 6 格纯展示。`|| '-'` 是兜底：历史数据里这些字段可能是空串 -->
        <div class="box-col">{{ conductor.card || '-' }}</div>
        <div class="box-col">{{ conductor.gender || '-' }}</div>
        <div class="box-col">{{ conductor.age || '-' }}</div>
        <div class="box-col">{{ conductor.school || '-' }}</div>
        <div class="box-col">{{ conductor.phone || '-' }}</div>
        <div class="box-col">
          <!-- 与手填行的电子照片格同尺寸（59×82），有地址画图、没有画同尺寸占位块，
               两张表三种状态下的行高才一致（理由见本文件 script 里的既有说明） -->
          <img v-if="conductor.head" class="head-img" :src="conductor.head" />
          <div v-else class="head-placeholder">
            <span class="head-placeholder-icon">+</span>
            <span>待上传</span>
          </div>
        </div>
        <!-- 操作列：用户要求「操作栏的按钮改为无」。用一个灰色破折号占位，
             既保留了这一格（否则网格会少一格、整行错位），又明确表示不可操作。 -->
        <div class="box-col box-col-dash">—</div>
      </div>

      <!-- order = 2×index+1：手填行之间保持原顺序，取值全是奇数，
           带入行的偶数正好插进两道奇数之间的缝里 -->
      <div
        v-for="(item, index) in data"
        :key="index"
        class="box-line"
        :style="{ order: index * 2 + 1 }"
      >
        <!--
          序号 = 第几行，纯展示（不提交、不参与校验）。
          第九轮起带入行可能插在**中间**，所以不能只按自己的下标算；
          统一交给 rowNo(index)：带入行在它前面时整体后移一位。
          没有带入行时 rowNo(index) 退化成 index + 1 —— 仍是 1、2、3，与改动前一致。
        -->
        <div class="box-col">{{ rowNo(index) }}</div>
        <div class="box-col">
          <el-input v-model="item.name" placeholder="请输入姓名" />
        </div>
        <!--
          署名排序格（手填行）。

          【为什么是下拉框而不是输入框】可填值只有 1 / 2 两个，
          下拉框天然不可能填出第三个值 —— 用户想填错都没有入口。
          这是「用控件形状消灭错误」，不是「填完再报错」。

          【第十二届·第六轮：改成必填，删掉了「不填」这个选项】
          原来有一个 `label="不填" value=""` 的选项，本轮删除。理由：它给了用户一个
          「不表态」的出口，而后端导出**必须**靠这个号决定谁占第一署名槽 ——
          用户不表态，导出就只能猜（见后端方案 8.4）。去掉出口 = 逼出明确答案。
          placeholder 同时由「不填」改为「请选择」：原本「不填」一词
          既是选项文案、又是占位文案，删掉选项后它还留在框里就成了误导。
          （为什么不写「请选择署名排序」这么具体？因为它会把这一列的宽度下限
           从 85px 顶到 155px，代价是 1440 视口从「不滚」变成「滚 38px」。
           列头本来就写着「署名排序」，占位只写「请选择」没有歧义 ——
           这与同表「性别」列的 placeholder 写法也一致。）

          【空值必须是 ''，绝不能是 0】
          后端 apps/core/report_drafts.py 的 _person() 对 signature_order 的校验是
              _integer(value, ..., required=False, minimum=1)
          发 0 会被判「不能小于 1」直接 400，而 400 的文案用户完全看不懂。
          空串经 draftPayload.js 的 signatureOrderOrNull('') 变成 null（合法）（点此见该文件）。
          注意后端 required=False 只是「不强制」，不是「不校验」—— 发上去就按上面这条判。

          【必填为什么不在 el-form 的 rules 里】这张表是手写 CSS Grid
          （.box-line / .box-col），没有 el-form-item，el-form 的 :rules 管不到它。
          所以必填和其它列的必填走同一套判法：写在 signatureError() / checkLine() 里。

          【:disabled 的含义】isSignatureTaken(值, 'row-N') 回答「这个序号是不是已经被
          **别人**占了」——第二参数 selfKey 是「我自己是谁」，
          不传它的话自己已经选中的那个值会把自己置灰。
        -->
        <div class="box-col">
          <el-select v-model="item.signature_order" placeholder="请选择" class="signature-select">
            <el-option label="1" :value="1" :disabled="isSignatureTaken(1, 'row-' + index)" />
            <el-option label="2" :value="2" :disabled="isSignatureTaken(2, 'row-' + index)" />
          </el-select>
        </div>
        <div class="box-col">
          <el-input v-model="item.card" placeholder="请输入身份证号码" />
        </div>
        <div class="box-col">
          <el-select v-model="item.gender" placeholder="请选择">
            <el-option label="男" value="男" />
            <el-option label="女" value="女" />
          </el-select>
        </div>
        <div class="box-col">
          <el-input v-model="item.age" type="number" placeholder="请输入年龄" />
        </div>
        <div class="box-col">
          <el-input v-model="item.school" placeholder="请输入学校全称" />
        </div>
        <div class="box-col">
          <el-input v-model="item.phone" placeholder="请输入联系电话" />
        </div>
        <div class="box-col">
          <!--
            【第十二届·第三轮】电子照片格，与参展人员表逐字同款：
            有地址画 <img>，没有则画同尺寸（59×82）占位遮罩。
            教师行加行时推的是 {type:1, position:4}，没有 head 字段；后端草稿回填
            给的是 head:''（见 src/services/draftPayload.js 的 payloadToPerson）——
            两种情况 v-if 都为假，都走占位分支，不会再出现破碎图片图标。
            占位块的样式来自 @use 进来的共用文件，两表逐像素一致。
          -->
          <img v-if="item.head" style="width: 59px; height: 82px" :src="item.head" />
          <div v-else class="head-placeholder">
            <span class="head-placeholder-icon">+</span>
            <span>待上传</span>
          </div>
        </div>
        <div class="box-col">
          <!-- 「上传照片」与参展人员表同款：先记行号，再弹文件框（见 upAvatar）。 -->
          <el-button @click="upAvatar(index)">上传照片</el-button>
          <el-button type="danger" @click="remove(index)">删除</el-button>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
/**
 * 指导教师名单表格（报名表单「指导教师」段）
 *
 * ===========================================================================
 * 【dist 已确认】来源：dist/chunk-0294a80a.165638130932c3751d03.js 模块 1607
 * 该模块被 16 个报名/修改页共用（dist 事实），在这些页面里 import 为 `Teacher`（模板中写作 <Teacher>）。
 * 取证方式：对 dist 全量检索 `n("1607")`，命中 16 个路由 chunk，逐一抽取模块体比对字节完全相同。
 * 本项目中由 OrchestraForm.vue 与 ProgramForm.vue 共用，覆盖 8 条路由：
 *   /city|school/elementary/{create, edit/:id}
 *   /city|school/teacher/{create, edit/:id}
 * ===========================================================================
 *
 * dist 原文组件选项（逐字）：
 *
 *   name:"Student",                       // ← 与 PersonTable 同名，见下方「未保留项」
 *   components:{[elButton.name]:elButton, [elInput.name]:elInput, [elSelect.name]:elSelect,
 *               [elOption.name]:elOption, ...},
 *   props:["showdata"],
 *   data(){ return { data:[], msg:[], number:0 } },
 *   watch:{ showdata(e){ this.data = e } },
 *   mounted(){ this.$nextTick(()=>{ this.showdata ? this.data = this.showdata : this.data = [] }) },
 *   methods:{ add, remove, flush, check, checkLine, getData, getCacheData }
 *
 * 父页面的调用方式（对 dist 检索 $refs.teacher.* 全量确认）：
 *   <Teacher ref="teacher" :showdata="form.teacher" />      // chunk-0294a80a 的 ElementaryEdit 渲染函数
 *   this.$refs.teacher.getData()        // 提交前校验，失败返回 false
 *   this.$refs.teacher.getCacheData()   // 直接取数组（草稿缓存用）
 * 因此本组件的对外契约（prop showdata / 方法 getData、getCacheData）必须保持原样。
 *
 * ===========================================================================
 * 【第十二届·第三轮 新增：电子照片列 + 逐行上传照片 —— dist 里没有这个功能】
 * ===========================================================================
 * 上面那份 dist 原文没有照片列、没有上传。本表这一列是**新加**的，为的是让指导教师
 * 也能交照片，且交互、校验、存储与参展人员表完全一致（用户要求「用的逻辑+设计与
 * 下方参展人员的电子照片设计+上传照片一样」）。新增内容只有三块：
 *   1) 表头/行体各多一格「电子照片」（联系电话 与 操作 之间），有地址画 <img>，
 *      没有则画 59×82 占位遮罩（与人员表逐字同款，样式来自 src/styles/photo-cell.css）；
 *   2) 操作列多一个「上传照片」按钮 + 一条 hidden 的 el-upload 通道；
 *   3) 脚本里 usePhotoUpload() 取回 upAvatar / beforeUploadSingle / uploadFileSingle。
 *
 * 【为什么不影响对外契约 / 不用改后端】
 *   head 是人员行本来就有的字段：草稿的 build/restore 走
 *   src/services/draftPayload.js 的 personToPayload / payloadToPerson，教师行与
 *   参展人员行走的是同一份映射（buildDraftPayload 把 form.teacher 一并放进 payload.person），
 *   head 已经在里面。所以照片写进 `item.head` 后，暂存、提交、编辑页回填自动带上，
 *   后端与接口一个都不用动。dist 的 check/checkLine 也不校验 head，无需改校验。
 *
 * 【本表**没有**批量上传照片】「批量上传照片」按钮在参展人员表的工具栏里，它只遍历
 *   参展人员表的数据（form.person），够不到本表的行（form.teacher）。本轮明确不做
 *   跨表批量，教师照片按行逐张上传。
 *
 * ===========================================================================
 * 逐条移植理由
 * ===========================================================================
 * 1) `props:["showdata"]` → `defineProps({ showdata: { default: undefined } })`
 *    dist 用的是数组写法，既无类型也无默认值。这里**刻意不声明 type: Array**：
 *    父组件传的是 `form.teacher`，在表单初始化/接口返回前可能是 undefined 甚至 null，
 *    而组件自身用 `this.showdata ? ... : []` 兜底（即把「假值」都视为空表）。
 *    若补上 type: Array，传 null 时会触发 Vue 的 prop 类型告警，属于新增噪音。
 *
 * 2) `watch:{ showdata(e){ this.data = e } }` → `watch(() => props.showdata, (e) => { data.value = e })`
 *    保留原语义：**不 immediate、不 deep**，只在父组件替换整个数组引用时同步。
 *
 * 3) `mounted(){ this.$nextTick(...) }` → `onMounted(() => nextTick(...))`
 *    逐行等价。$nextTick 的用途与 dist 一致：挂载完成后再用 props 覆盖一次初始空数组。
 *
 * 4) `this.$set(n,"name",t)` → `v-model="item.name"`（直接赋值）
 *    Vue 2 数组元素的新增属性需要 $set 才能响应；Vue 3 的 ref 数组是深响应代理，
 *    `item.name = v` 即可。编译产物与 dist 的 model 回调一一对应。
 *
 * 5) `e._m(0)` → 展开成普通模板里的表头 div
 *    静态提升只是编译期优化，渲染结果与 dist 的 staticRenderFns 完全一致。
 *
 * 6) `size="mini"` 已移除
 *    【dist 已确认】dist 全文用 size="mini"（Element UI 2 的尺寸档）。
 *    Element Plus 只认 large/default/small，`mini` 不被识别、每次渲染告警一次；
 *    EP 中没有 `.el-input--mini` / `.el-select--mini` / `.el-button--mini` 任何规则，
 *    所以 dist 里这个属性本来也是空转，删掉后渲染结果与 dist（及迁移后现状）一致。
 *    **未**改成 small —— `--small` 是真实尺寸规则，会把输入框/按钮压小。
 *
 * 7) `el-icon-*` 图标：本组件 dist 原文未使用任何图标；本组件也不需要
 *    @element-plus/icons-vue 的显式 import。
 *
 * 8) getData / getCacheData → defineExpose
 *    必须暴露给父组件（见上文父页面用法），签名与返回值逐字保留：
 *      getData()  : 先 check()，任一行不合法则 ElMessage.error 并返回 false；否则返回 data 数组
 *      getCacheData(): 不校验，直接返回 data 数组
 *
 * 9) Element 组件由 vite.config.js 的 unplugin-vue-components(ElementPlusResolver) 按需自动引入，
 *    所以模板里的 el-button/el-input/el-select/el-option 不需要手写 import（与 dist 里
 *    逐个注册 [elButton.name]:elButton 的写法等价，只是改成了编译期解析）。
 *    ElMessage 不在模板里，按项目惯例显式 import。
 *
 * 【未保留项（非功能缺失，逐条说明）】
 *   a. 内部 name:"Student" 未保留。
 *      dist 里 Teacher(1607) 与 Person(db6d) 的 name 都写着 "Student"，是复制粘贴留下的笔误。
 *      父页面是靠 import 绑定名注册的（渲染函数里写的是 _c("Teacher") / _c("Person")），
 *      没有任何地方按组件内部 name 解析它们；保留 "Student" 反而会让 Vue Devtools 里
 *      两个组件同名难以区分，故不声明 defineOptions({name})。
 *   b. data 里的 `msg:[]`、`number:0` 两个字段：dist 声明了但在本组件内**从未被读写**，
 *      父组件也只调用 getData/getCacheData（已对 dist 全量检索 $refs.teacher.
 *      getData|getCacheData，无第三种访问）。为避免死状态，这里不声明。
 *
 * 【dist 已知缺陷】无。本模块的逻辑（含 check/checkLine 的嵌套三元）是自洽的。
 * 注意 check() 的空表短路：`if (this.data && this.data.length > 0)`，即 data 为空数组时
 * 直接返回 true（视为校验通过），getData() 于是返回 `[]`（[] 是 truthy，父组件的
 * `if (!data) return` 不会拦住空表）—— 这是 dist 的既有行为，原样保留。
 */

// 【第十二届·第五轮】新增 computed —— 用于「署名排序已占用」的互斥判定
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { checkPersonBasics } from '@/config/personFields'
import { useDragScroll } from '@/composables/useDragScroll'
/* 【第十二届·第三轮】单张上传照片的零件，与参展人员表共用同一份实现
   （@/composables/usePhotoUpload）：体积上限、JPG、命名规则、OSS 通道、
   占位块尺寸都不再有第二份副本。
   本表**不用** beforeUpload —— 那是「批量上传照片」的基础闸，而批量按钮在参展
   人员表上、只匹配 form.person，够不到本表的行（见本轮改造说明）。 */
import { usePhotoUpload } from '@/composables/usePhotoUpload'

// 8 列下限合计 855px，本项目常见分辨率下都放得下（1440 实测无横向滚动），
// 挂上是因为它跟参展人员表上下并排：只让一张表能拖、另一张拖不动会更奇怪，
// 且窗口被拖得很窄时这张表同样会溢出。
const boxRef = ref(null)
useDragScroll(boxRef)

const props = defineProps({
  /** 父组件传入的名单数组（通常是 form.teacher），可为 undefined / null */
  showdata: { default: undefined },
  /**
   * 【第十二届·第五轮】参展人员表里的「教师 + 指挥」那一行（同一个对象引用）。
   * 有值时表格末尾多渲染一行只读的「带入行」；没有则为 null。
   *
   * 【为什么刻意不声明 type: Object、不声明 required】
   * 与上面 showdata 的理由一致：父组件在表单初始化 / 接口返回前可能传 undefined。
   * 默认 null 让 `v-if="conductor"` 一票否决所有假值，不必再写 ?? 兜底。
   */
  conductor: { default: null },
  /**
   * 【第十二届·第十轮】带入行的「进表位置」——由**父组件**指定的版本。
   *
   * 含义与下面那个内部记的 slot 完全一样：指挥进表那一刻表里有几行手填行（0 起）。
   * 父组件有权威来源时用它的，没有则退回本组件自己 latch 出来的值。
   *
   * 【权威来源是什么】编辑页回显。这个位置后端已经存下来了
   * （report_person.display_order，见 payload 的 display_order），
   * 父组件从草稿 payload 读出来由本 prop 下发 —— 于是"点编辑之后灰行和手填行换位置"
   * 这个问题就没有了（之前只能退化成默认的"排最后"）。
   *
   * 【为什么默认 null、为什么判断用 ?? 而不是 ||】
   * null / undefined 都表示"父组件没有这个信息"，走兜底；
   * **0 是合法值**（指挥排第 1 行），用 || 会把 0 当成"没有"，那就永远还原不出情形①。
   */
  conductorSlot: { default: null }
})

/*
 * 【第十二届·第四轮】新增一个对外事件，只为「指导教师超员了立刻提示」这一个用途。
 *
 * 【背景】父页面要校验「指导教师最多 1 人（教师指挥）/ 2 人」这条上限，而它要跟参展人员
 * 表里的指挥身份**一起**看才知道用哪个上限，所以判定在父页面做、本表只负责通知
 * 「我这边行数变了」。本表原本没有任何事件，父页面只在暂存 / 提交时调 getCacheData()，
 * 于是加到第 3 行也不会有人吭声，要等提交才被打回。
 * 【只增不改】prop showdata 与 getData / getCacheData 的签名、语义一字未动。
 *
 * 【第十二届·第十轮】再加一个 conductor-slot-change：位置变了就通知父组件存起来，
 * 父组件写进 form.conductorSlot，下次 buildDraftPayload 时随 payload 发给后端。
 * 与 conductor-signature 是同一套模式（子表不直接改 prop，只发事件）。
 */
const emit = defineEmits(['rows-change', 'conductor-signature', 'conductor-slot-change'])

const data = ref([])

/*
 * 【第十二届·第三轮】接上单张上传照片的三个零件：
 *   uploadTrigger → 模板里 ref="uploadAvatar"，就是那个藏起来的「扳机」按钮
 *   upAvatar      → 「上传照片」按钮的点击处理：记下这一行的下标，再弹文件选择框
 *   beforeUploadSingle → 文件选中后的校验（体积/格式/文件名是否对上这一行的人）
 *   uploadFileSingle   → 通过校验后真正上传，成功后把 url 写回该行的 head
 * 传进去的回调回答「第 i 行是哪个对象」—— 公共模块不认识本表的数据结构。
 */
const { uploadTrigger: uploadAvatar, upAvatar, beforeUploadSingle, uploadFileSingle } =
  usePhotoUpload((i) => data.value[i])

/*
 * 【第十二届·第十三轮】给 watch 补上 `? : []` 兜底 —— 修一个会打断编辑页整份回填的既有崩溃。
 *
 * 【为什么会出现 undefined】父组件 OrchestraForm.vue:1489 是 `form.value = r`，
 * r 是后端 report_dict() 的原始返回对象，而它**永远没有 teacher 键**（后端不返回），
 * 所以那一刻 form.teacher === undefined；紧接着 `if (people.length > 0)`（同文件 :1538）
 * 只在 person 非空时才把数组补回去 —— person 为空时这个 undefined 会一路留着传进来。
 * 而 person 为空正是「参演人员被全部软删」那种报名表的常态（ReportPerson 走软删管理器）。
 *
 * 【不补会怎样】data.value 被写成 undefined → 本文件里所有读 `data.value.length`
 * 的地方一起遭殃，其中**最先被引爆**的是下面那句
 * `watch(() => data.value.length, () => emit('rows-change'))` ——
 * 它的取值函数会被重新执行，直接抛 TypeError，Vue 这一轮 flush 被这个异常打断，
 * 同批的渲染任务不再执行 → 接口其实成功返回了，页面上却是一张空表。
 * 实测：pageerror「Cannot read properties of undefined (reading 'length')」，
 * 且「乐团名称」框读不到已回填的值。
 *
 * 【同一次改动顺带解除的其它隐患（都是同一个 undefined 引起的）】
 *   · `watch(() => props.conductor, …)` 回调里的 `data.value.length`
 *     —— 指挥进表那一刻若 data.value 还是 undefined 就会抛；补上后它读到 0，
 *        而 0 正是「手填 0 行、指挥排第一」这个正确答案；
 *   · `conductorIndex` 里的 `Math.min(slot, data.value.length)`；
 *   · `flush()` / `check()` 等处的 `data.value.forEach` / `[...data.value]`。
 * 这些位置本文件都会写行号，此处不写 —— 行号会随改动平移，写死容易过期。
 *
 * 【为什么是这个写法】与紧邻的 onMounted 里
 * `data.value = props.showdata ? props.showdata : []` 逐字一致 ——
 * 本组件对 showdata 的既有约定就是「假值一律视为空表」（见前面「逐条移植理由」第 1 条），
 * 这里只是把同一个约定补到 watch 这条入口上，没有引入任何新语义。
 * 不用 `||` 也不用 `??`：与 onMounted 保持同一种写法，读起来是一处而不是两处规则。
 *
 * 【改的是哪一条入口】父组件有两个入口把 showdata 送进来（watch / onMounted），
 * onMounted 本来就有兜底，缺的一直只有 watch 这一条。
 */
watch(
  () => props.showdata,
  (val) => {
    data.value = val ? val : []
  }
)

onMounted(() => {
  nextTick(() => {
    data.value = props.showdata ? props.showdata : []
  })
})

/*
 * 【第十二届·第四轮】「影响校验的字段变了」的通知口。
 * 本表没有身份 / 角色两列（add() 推的行固定是 { type: 1, position: 4 }，见下），
 * 所以**行数就是唯一的变量**：加一行 / 删一行 / 清空。
 * 用 watch(data.length) 而不是 deep watch —— 用户打姓名、身份证时不该触发校验。
 * 父组件整体替换 showdata（编辑页回填、草稿恢复）同样会触发一次，这是故意保留的：
 * 一张按旧规则存下来的、有 3 名指导教师的表，一打开就该看见不合规提示。
 *
 * 【位置必须在 data 声明之后】watch 的取值函数会被**立即执行一次**（用来建立初始依赖），
 * 放在 const data 之前会撞上 TDZ，挂载时就抛 ReferenceError。
 */
watch(() => data.value.length, () => emit('rows-change'))

/* ===========================================================================
 * 【第十二届·第九轮】带入行的「进表位置」—— 序号不再乱跳的那块状态
 *
 * 用户要的规则：指挥进表那一刻表里有几个手填行，它就插在第几个**之后**，之后不再变。
 *   · 表里 0 行时进表 → 插在第 0 个之后 = 第一行，序号 1
 *   · 表里 1 行时进表 → 插在第 1 个之后 = 第二行，序号 2
 *
 * 【为什么用 watch 认「进表那一刻」】
 * 指挥不在本表的 data 里，它是父组件下发的 prop（同一个 form.person 对象的引用）。
 * 于是 `props.conductor` 从 null 变成对象的那一瞬间，就是"进表"。
 *
 * 【flush: 'post' 是必须的，不是随手写的】
 * 编辑页回显时，props.showdata（老师行）与 props.conductor 会在**同一轮**里一起到达。
 * 若按默认的 pre 触发顺序去读 data.value.length，读到的可能还是回填前的空数组 ——
 * 位置就不确定了。用 post（等本轮所有 watcher 与渲染都跑完再执行）保证读到的 data
 * 一定已经回填，于是回显时 latch 出来的 slot = 已回填的老师行数 → 指挥落在最后一行。
 *
 * 【第十二届·第十轮：上面这条"回显落在最后"不再是回显时的结果】
 * 第九轮遗留的问题正是它：用户手点出来的「灰行第 1 行 / 手填第 2 行」，
 * 点一次编辑就被这个 latch 抹成「灰行第 2 行 / 手填第 1 行」。
 * 现在编辑页回显时位置由 props.conductorSlot 指定（见下面的 computed），
 * latch 只在**父组件没有这个信息**时才起作用（新增页、老草稿）。
 *
 * 【什么时候重置】指挥没了（角色被改掉、或参展人员表被清空）→ 位置清零；
 * 下次再变成指挥时，按当时的位置重新记一次。
 * =========================================================================== */

/** 本组件自己 latch 出来的位置。null = 「没记过」（还没进表），此时看父组件有没有给 */
const latchSlot = ref(null)

watch(
  () => props.conductor,
  (now) => {
    // 刚进表：记下表里有几行手填行；指挥没了：位置一起清掉
    latchSlot.value = now ? data.value.length : null
  },
  { flush: 'post' }
)

/**
 * 【第十二届·第十轮】最终生效的「进表位置」，两级来源：
 *
 *   ① props.conductorSlot（父组件给的）—— 只在**编辑页回显**时有值：
 *      后端 report_person.display_order 里存着上次的位置，父组件从草稿 payload 读出来下发。
 *      **这一级是本次新增的**，它让"点编辑之前灰行排第 1、点完变第 2"不再发生。
 *   ② latchSlot（本组件自己记的）—— 新增页、或后端没存过（老数据 display_order 为 NULL）时用。
 *
 * 【为什么用 ?? 而不是 ||】0 是合法值（指挥排第 1 行）。用 || 会把 0 当成"没有"，
 * 于是情形①（指挥先进表）永远还原不出来 —— 这是本次最容易写错的一行。
 *
 * 【为什么父组件给了值还要保留 latch】
 * 新增页上父组件的 form.conductorSlot 是 undefined，必须靠 latch 认「进表那一刻」。
 * 两级不是替代关系，是"父组件知道就用它的，不知道就自己认"。
 */
const conductorSlot = computed(() => props.conductorSlot ?? latchSlot.value)

/**
 * 带入行插在第几个手填行之后（0 起算，即它的「第几行 - 1」）。
 *
 * · conductorSlot 为 null（没记过、父组件也没给）→ 取 data.length，也就是"排最后"（默认）。
 * · Math.min 是兜底：手填行被删到比 slot 还少时，带入行顺位前移、贴到最后一行 ——
 *   与手填行"删一行就重编号"的行为一致，用户已确认要这个。
 */
const conductorIndex = computed(() => {
  const slot = conductorSlot.value === null ? data.value.length : conductorSlot.value
  return Math.min(slot, data.value.length)
})

/**
 * 【第十二届·第十轮】位置变了就通知父组件（父组件写进 form.conductorSlot）。
 *
 * 【为什么要发而不是让父组件自己取】这个位置是本组件的内部状态
 * （何时 latch、latch 成多少只有本组件知道），父组件在暂存那一刻才去取是取不到的
 * （它只在提交时调 getData / getCacheData）。所以走事件，与 conductor-signature 同一套模式。
 *
 * 【发 null 也是对的】指挥没了 / 还没进表 → 父组件把 form.conductorSlot 置空，
 * buildDraftPayload 就不给任何一行写 display_order（什么都不发 = 什么都不改）。
 */
watch(conductorSlot, (v) => emit('conductor-slot-change', v))

/** 带入行的 CSS order：取偶数 2×slot，正好卡在两道奇数（手填行）之间 */
const conductorOrder = computed(() => conductorIndex.value * 2)

/** 带入行显示的序号：序号 = 第几行，与 conductorOrder 严格对应 */
const conductorNo = computed(() => conductorIndex.value + 1)

/**
 * 手填行显示的序号 = 第几行，纯展示。
 *
 * 【为什么不能直接用 index + 1】带入行可能插在中间：它插在某行前面时，
 * 那行以及它后面所有行都要整体后移一位，否则会和带入行撞号。
 * 判据就是「我的下标有没有越过带入行的位置」—— index >= conductorIndex。
 * 没有带入行时 props.conductor 为 null，表达式退化成 index + 1。
 */
function rowNo(index) {
  return index + 1 + (props.conductor && index >= conductorIndex.value ? 1 : 0)
}

/* ===========================================================================
 * 【第十二届·第五轮】署名排序：互斥判定 + 值域判定
 *
 * 业务口径（用户原话）：「不可以同时选择 1 或者 2，只能一个选择 1，另一个就要选择 2」。
 * 也就是本表最多 2 个可署名位（含带入行），1 与 2 各只能出现一次。
 *
 * 【判定为什么放在「选之前」而不是「提交时」】
 * 用户点开下拉框时，已经被别人占掉的序号就是灰的 —— 连点都点不下去。
 * 提交时的重复校验仍然保留（见 check()），因为置灰只挡得住界面操作：
 * 草稿回填、批量导入、控制台改数据都能绕过它。两道关，互补而不是二选一。
 * =========================================================================== */

/**
 * 「某个署名序号现在被谁占着」。
 *
 * @returns {Map<number, string>} 序号 → 占用者标识（'row-0' / 'row-1' / 'conductor'）
 *
 * 【为什么用 Map 而不是数组】既要知道「有没有被占」，也要知道「是谁占的」——
 * 后者是判断「是不是我自己占的」的唯一依据。
 */
const usedSignatures = computed(() => {
  const used = new Map()
  // 手填行：只有 1 / 2 才算「占位」，空串 / undefined / 0 / 非数字一律忽略
  data.value.forEach((row, i) => {
    const v = Number(row && row.signature_order)
    if (Number.isFinite(v) && v > 0) used.set(v, 'row-' + i)
  })
  // 带入行：它的值存在参展人员表那个指挥对象上
  const cv = Number(props.conductor && props.conductor.signature_order)
  if (Number.isFinite(cv) && cv > 0) used.set(cv, 'conductor')
  return used
})

/**
 * 某个选项该不该对「我」这一行置灰。
 *
 * @param {number} value  候选序号（1 或 2）
 * @param {string} selfKey 「我自己是谁」——手填行传 'row-N'，带入行传 'conductor'
 * @returns {boolean} true = 已被**别人**占用，置灰
 *
 * 【selfKey 这个参数不能省】不传的话，自己已经选中的那个值会把自己置灰，
 * 用户再点开下拉框会发现「我刚选的那个选项变灰了」，像坏了。
 */
function isSignatureTaken(value, selfKey) {
  const owner = usedSignatures.value.get(value)
  return owner !== undefined && owner !== selfKey
}

/**
 * 单个署名排序值的合法性（含必填）。check() / checkLine() 都调它。
 * @returns {string|null} 错误文案；合法时返回 null
 *
 * 【第十二届·第六轮：空值从「合法」改成「必填报错」】
 * 上一轮这里对空值是 `return null`（不填算合法），本轮因为去掉了下拉框里的
 * 「不填」选项，空值只剩两种来源：新加的行没选过、或老草稿/导入数据本身没有值。
 * 两种都必须拦住 —— 提交上去后端导出只能猜谁排第一。
 *
 * 【为什么先判空、再判值域】顺序反过来的话，空值会落到最后一行，
 * 报出来的是「署名排序只能选 1 或 2」—— 用户明明什么都没填，
 * 却被告知「只能选1或2」，会以为是自己选错了值，而不是漏填了。
 *
 * 【为什么用 === 而不是 Number()】与上一轮保持一致：只认数字 1 / 2。
 * 值是 el-select 的 :value="1"（恒为数字）或后端 _integer 归一后的整数，
 * 不会出现字符串 '1'。真出现字符串属于数据异常，宁可拦下来。
 */
function signatureError(value) {
  if (value === '' || value === undefined || value === null) return '请选择署名排序'
  if (value === 1 || value === 2) return null // 只认数字 1 / 2
  return '署名排序只能选 1 或 2'
}

/**
 * 全表（手填行 + 带入行）的署名序号有没有重复。
 * @returns {number|null} 重复的那个序号；没有重复时返回 null
 */
function duplicatedSignature() {
  const seen = new Set()
  const all = [...data.value]
  if (props.conductor) all.push(props.conductor)
  for (const row of all) {
    const v = Number(row && row.signature_order)
    if (!Number.isFinite(v) || v <= 0) continue
    if (seen.has(v)) return v
    seen.add(v)
  }
  return null
}

/**
 * 带入行的署名排序变更 → 交给父组件写回那个指挥对象。
 *
 * 【为什么本组件不自己写】conductor 是 prop，直接改它的属性会被
 * eslint-plugin-vue 的 vue/no-mutating-props 判为违规。父组件持有真正的那份数据，
 * 由它来写既合规，数据流方向也更清楚。
 */
function onConductorSignature(val) {
  emit('conductor-signature', val)
}

/** dist: add(){ this.data.push({type:1,position:4}) } —— 指导教师固定 type=1（教师）、position=4（指导教师） */
function add() {
  // 【第十二届·第五轮】显式给出 signature_order:''。
  // 不写也能跑（el-select 显示 placeholder），但显式给出可以让
  // draftPayload.js 的 signatureOrderOrNull 稳定拿到空串 → null，不依赖 undefined 的隐式行为。
  // 【第六轮】仍是 ''，没有改成默认给个 1 或 2 —— 那样等于后端替用户选了署名顺序，
  // 而互斥置灰是「谁先占谁得」，预置值会让另一行永远点不到另一个号。
  data.value.push({ type: 1, position: 4, signature_order: '' })
}

/** dist: remove(e){ this.data.splice(e,1) } */
function remove(index) {
  data.value.splice(index, 1)
}

/** dist: flush(){ this.data=[] } */
function flush() {
  data.value = []
}

/**
 * dist: check(){
 *   if(this.data&&this.data.length>0)
 *     for(let e=0;e<this.data.length;e++){
 *       const t=this.checkLine(this.data[e])
 *       if(!t.flag) return Message.error("指导教师名单第"+(e+1)+"行"+t.msg), !1
 *     }
 *   return !0
 * }
 * 逗号运算符展开成两条语句，求值顺序与返回值一致。
 */
function check() {
  /*
   * 【第十二届·第五轮】下面两条「跨行」校验必须放在逐行循环**之前** ——
   * 它们的判定范围超出单行，逐行循环根本看不到。
   *
   * ① 带入行自己的署名排序值。它不在 data 里，下面的 checkLine() 够不着它。
   *    正常情况下下拉框只会产出 ''/1/2，本轮的必填规则把 '' 也判为不合法。
   *    这条同时也是「草稿回填 / 批量导入 / 手工改数据」的兜底 ——
   *    那种路径能带进 3 之类的非法值，发到后端会 400。
   *
   * ② 序号重复。界面靠「已被占用就置灰」保证，但置灰只挡得住鼠标点击这一条路径，
   *    草稿回填 / 导入 / 控制台改数据都能绕过去。两道关互补，不是二选一。
   *
   * 【顺序】「填重了」比「某一行姓名没填」更该先说：前者改一处就能提交，
   * 后者要用户自己去找是哪一行。
   */
  if (props.conductor) {
    const err = signatureError(props.conductor.signature_order)
    if (err) {
      ElMessage.error('带入的指挥行' + err)
      return false
    }
  }
  const dup = duplicatedSignature()
  if (dup !== null) {
    ElMessage.error('署名排序 ' + dup + ' 被填了两次，1 和 2 各只能选一次')
    return false
  }

  if (data.value && data.value.length > 0) {
    for (let i = 0; i < data.value.length; i++) {
      const result = checkLine(data.value[i])
      if (!result.flag) {
        /*
         * 【第十二届·第九轮修】行号必须用 rowNo(i)，**不能再写 i + 1**。
         *
         * dist 原文是 `"指导教师名单第"+(e+1)+"行"` —— e 是 data 数组的下标。
         * 在带入行还没有的时候，下标 + 1 正好等于屏幕上的序号，所以看不出问题。
         * 带入行一进来就不成立了：它**不在 data 里**（四条硬理由见模板顶部的长注释），
         * 却占着表里的一个序号。于是「灰行在第 1 行、手填行显示第 2 行」时，
         * 报错会说「第 1 行」—— 用户照着这个行号去找，找到的是灰色的指挥行，
         * 那行的电话明明是对的（用户实测反馈的就是这一条）。
         *
         * rowNo() 就是模板里给序号列用的**同一个函数**，两边永远同源、不会再错开。
         * 没有带入行时 rowNo(i) === i + 1，与 dist 逐字一致。
         */
        ElMessage.error('指导教师名单第' + rowNo(i) + '行' + result.msg)
        return false
      }
    }
  }
  return true
}

/**
 * dist 原文是一串嵌套三元：
 *   e.name ? (e.card ? (e.age ? (undefined===e.gender||""===e.gender ? {性别需选择}
 *            : e.school ? (e.phone ? (undefined===e.type||""===e.type ? {身份需选择}
 *            : (undefined===e.position||""===e.position ? {角色需选择} : {flag:!0,msg:"验证成功"}))
 *            : {电话号码不能为空}) : {学校名称不能为空})
 *            : {年龄不能为空}) : {身份证不能为空}) : {姓名不能为空}
 * 下面按同一判定顺序改写成 if 链，**判定顺序、判定条件、返回文案逐条对齐**，
 * 唯一区别是可读性（等价改写，不是简化：没有合并/删除任何分支）。
 */
function checkLine(item) {
  if (!item.name) return { flag: false, msg: '姓名不能为空' }
  if (!item.card) return { flag: false, msg: '身份证不能为空' }
  if (!item.age) return { flag: false, msg: '年龄不能为空' }
  if (item.gender === undefined || item.gender === '') return { flag: false, msg: '性别需选择' }
  if (!item.school) return { flag: false, msg: '学校名称不能为空' }
  if (!item.phone) return { flag: false, msg: '电话号码不能为空' }
  if (item.type === undefined || item.type === '') return { flag: false, msg: '身份需选择' }
  if (item.position === undefined || item.position === '') return { flag: false, msg: '角色需选择' }
  // 【第十二届·补格式校验】见 config/personFields.js。以上全是 dist 原判定，
  // 只判"填没填"；格式放在最后，不改动上面任何一条的优先级。
  const formatErr = checkPersonBasics(item)
  if (formatErr) return { flag: false, msg: formatErr }
  // 【第十二届·第五轮】署名排序值域。同样放在最后，不改动上面任何一条的优先级。
  const signErr = signatureError(item.signature_order)
  if (signErr) return { flag: false, msg: signErr }
  return { flag: true, msg: '验证成功' }
}

/** dist: getData(){ return !!this.check() && this.data } */
function getData() {
  return !!check() && data.value
}

/** dist: getCacheData(){ return this.data } */
function getCacheData() {
  return data.value
}

defineExpose({ getData, getCacheData })
</script>

<style lang="scss" scoped>
/* 【第十二届·第三轮】@use 必须是 style 块里的第一条语句（Sass 语法要求）。
   占位块样式与参展人员表共用同一份，两表逐像素一致。 */
@use '../../styles/photo-cell.css';

/* dist/css/chunk-0294a80a.260c9e35.css 中 [data-v-12e40084] 的全部 9 条规则 */
.container {
  margin-bottom: 10px;
}

.box {
  overflow-x: auto;
  text-align: center;
  /* 【第十二届·第九轮】纵向 flex + order：给带入行"插到手填行中间"的能力。
     只加这两条，其余不变：
       · 容器高度是自动的，flex 不会压扁任何一行（没有固定高度可供收缩）；
       · 横向滚动照旧由上面的 overflow-x 负责，与 flex 无关。
     排序号：表头 -1、手填行 2×下标+1、带入行 2×slot（见下方 .box-line-title 与本文件 script）。 */
  display: flex;
  flex-direction: column;
}

/* 【列宽依据 —— 与 PersonTable.vue 总宽恒等，且任何宽度下都不截断文字】
 *
 * 用户要求：「指导老师和参展人员的框大小和宽度保持一致……
 * 里面的字（如 placeholder="请输入姓名"）要看得完整……现在是教师的要短一点」。
 *
 * 旧值（dist 抄来的）是固定 px：教师表 38/96/182/72/78/184/128/80 合计 858px，
 * 而人员表合计 1382px —— 两表同页上下排布，教师表右侧空出 500 多 px，所以显「短」。
 * 而且 96px 的姓名列留给输入框只有 61px，装不下 70px 宽的「请输入姓名」，是截断的。
 *
 * 现在改用 minmax(下限px, 权重fr)，两条要求各由一半保证：
 *   ① 全部轨道都是 fr → 永远把 .box 铺满；两表的 .box 同宽，
 *      所以任何分辨率下两表总宽都严格相等；
 *   ② 下限 = 该列内容一个不落所需的最小列宽，窗口再窄也不截断。
 *
 * 下限怎么来的（浏览器实测，不是估的）：
 *   列宽下限 = 文本宽 + .box-col 左右 padding 5×2 + 左边框 1 + 控件自身 chrome
 *   · 输入框 chrome：.el-input__wrapper 的 padding 1px 11px → 22px
 *   · 下拉框 chrome：.el-select__wrapper 的 padding 12×2 + gap 6 + 箭头 14 → 44px
 *   · 文本宽：14px 字号下中文一字 14px；18 位身份证约 145px
 *   例：「请输入姓名」5 字 = 70px → 70 + 11 + 22 = 103，取 105 留 2px 余量。
 *
 * fr 权重怎么定：**数值 = 参照容器 1660px 时希望该列得到的像素宽 ÷ 100**。
 *   1660px 是目前最常见的 1920 屏下 .box 的实宽
 *   （1440 视口 − 侧栏 200 − el-main 左右 padding 40 − .bg4 左右 padding 20 = 1180，
 *     1920 视口同式得 1660）。
 *
 * 【为什么不跟 PersonTable 的前 7 列逐列对齐】
 *   两表列数不同（9 列 vs 12 列），「总宽相等」与「前 7 列逐列对齐」数学上不可兼得 ——
 *   教师表要凑满和人员表一样的宽度，多出来的像素只能全塞进「操作」一列。
 *   用户明确要的是「两个表的长度宽度都要一致」，所以取等宽、放弃逐列对齐。
 *
 * ===========================================================================
 * 【第十二届·第三轮：新增「电子照片」列后的列宽账】
 * ===========================================================================
 * 列数 8 → 9，新增的一列插在 联系电话 与 操作 之间。两处取值刻意与 PersonTable
 * 的对应列**完全相同**，理由不是对齐（两表列数不同，对不齐）而是「同样的内容给同样的宽度」：
 *   · 电子照片  minmax(72px, 0.78fr) —— 与人员表那一列逐字相同。
 *       下限 72px 的算法：占位块/照片 59px + padding 5×2 + 左边框 1 = 70，取 72 留 2px。
 *   · 操作      minmax(72px, 1.20fr) → minmax(168px, 1.61fr)。
 *       这一列现在要放下「上传照片 + 删除」两个按钮（和人员表一样），
 *       168px 是人员表实测值；不改成 168 的话两个按钮会被挤成两行、行高被撑高。
 * 下限合计：30+105+178+99+105+133+133+72+168 = 1023px。
 *   1440 视口下 .box 实宽 1180px ≥ 1023，不出现横向滚动（1366 视口是 1046，也够）。
 *
 * 【一句更正】上面「改这里的 fr 权重，必须同步改 PersonTable 的权重，否则总宽不等」
 *   是**不准确**的：总宽相等由「两张表的 .box 同宽 + 全部轨道都是 fr」两条保证，
 *   与权重取值无关（fr 永远把容器分完）。真正会让两表看起来不一样宽的是**下限之和
 *   超过容器**：那时该表出现横向滚动条、表体被裁切。所以改权重是自由的，
 *   改 minmax 的下限才要看这张账。本轮两表的下限之和都远小于常见容器宽度
 *
 * ===========================================================================
 * 【第十二届·第五轮：新增「署名排序」列后的列宽账】
 * ===========================================================================
 * 列数 9 → 10，新增的一列插在 姓名 与 身份证号 之间。下限 85px 的算法沿用本文件
 * 上面那套公式，一步不差：
 *   列宽下限 = 文本宽 + .box-col 左右 padding 5×2 + 左边框 1 + 控件自身 chrome
 *   · 文本宽：「不填」2 字 × 14px = 28px（这是该列能出现的**最宽**文本，
 *            因为 "1" / "2" 都只有 1 个字）
 *   · 下拉框 chrome：.el-select__wrapper 的 padding 12×2 + gap 6 + 箭头 14 = 44px
 *   ⇒ 28 + 11 + 44 = 83，取 85 留 2px 余量（与本文件既有的 +2 惯例一致）
 *
 * 下限合计：1023 + 85 = 1108px。
 *   实测 .box 实宽（Playwright，报名表单真页面）：1366 视口 1066px、1440 视口 1140px。
 *   ⇒ **1366 视口下本表会开始横向滚动（约 42px），1440 及以上不滚。**
 *   这是可以接受的：同一页面上的参展人员表下限合计 1376px，在这两个宽度下本来就在滚，
 *   而且本表挂了 useDragScroll（按住表头/空白处可拖动横滚），多出来的 42px 拖得到。
 *
 * 【fr 权重 0.85 的来处】沿用本文件的「数值 = 参照容器 1660px 时希望该列得到的像素宽
 *   ÷ 100」：希望它约 85px（够放下「不填」即可，不该比姓名列还宽）→ 0.85。
 *   权重只影响剩余空间怎么分，改它不会让两表不等宽（理由见上一段「一句更正」）。
 *
 * ===========================================================================
 * 【第十二届·第六轮：placeholder 改文案后，这一列的下限必须重算】
 * ===========================================================================
 * 本轮删掉了「不填」那个选项、placeholder 由「不填」改成「请选择」。
 * 这个改动看起来只在模板里，但它把该列**能出现的最宽文本**从 2 字变成 3 字，
 * 而下限的定义就是「按最宽文本算」，所以 CSS 必须跟着改，公式本身一个字不改：
 *   · 旧：文本宽「不填」  2 字 × 14px = 28px → 28 + 11 + 44 = 83，取 85
 *   · 新：文本宽「请选择」3 字 × 14px = 42px → 42 + 11 + 44 = 97，取 99
 * （公式里的 11 = padding 5×2 + 左边框 1，44 = .el-select__wrapper chrome，
 *   两项都与文案无关，所以不动；字号仍 14px，控件仍是 el-select。）
 *
 * 下限合计：1108 − 85 + 99 = 1122px。
 *   ✅ 本轮的实测值：1440 视口 .box 实宽 1140px ≥ 1122 ⇒ **1440 仍不横滚**；
 *      1366 视口实宽 1066px ⇒ 滚约 56px（第五轮该值是 42px，只多 14px）；
 *      1920 不滚。
 *
 * 【为什么占位文案不写「请选择署名排序」那么具体】
 *   那个文案是 7 字 98px，会把这一列的下限顶到 155px、合计 1178px，
 *   于是 **1440 视口从「不滚」变成「滚 38px」**（已实测确认）。
 *   整张表的宽度预算是零和的 —— 其它 9 列的下限都是按「恰好放下 + 2px 余量」
 *   算出来的，没有一列有余量可让。列头本来就写着「署名排序」，
 *   占位写「请选择」不产生歧义，而且与本表「性别」列的 placeholder 写法一致。
 *
 * 【fr 权重仍留 0.85，没有跟着放大】下限 99px 已经恒大于
 *   0.85/19.94 分到的份额，实际宽度由下限决定，权重在这里已经不生效；
 *   放大权重只会去抢别的列在宽屏下的余量，属于「顺手多改」，不做。 */
.box-line-title,
.box-line {
  display: grid;
  /*                     序号        姓名         署名排序      身份证号      性别        年龄         学校名称      联系电话      电子照片      操作 */
  grid-template-columns:
    minmax(30px, 1.00fr) minmax(105px, 2.40fr) minmax(99px, 0.85fr) minmax(178px, 3.00fr)
    minmax(99px, 1.60fr) minmax(105px, 1.70fr) minmax(133px, 3.40fr) minmax(133px, 2.60fr)
    minmax(72px, 0.78fr) minmax(168px, 1.61fr);
  justify-content: stretch;
}

/* padding 6px → 5px：每列给文字区让出 2px，12 列合计 24px 的下限余量
 * （人员表 12 列下限合计因此从 1400px 降到 1376px，仍在旧值 1382px 以内，
 *  窄屏不会比改动前更容易出现横向滚动）。
 * display:flex + 居中与 PersonTable 的 .box-col 保持一致，两表上下排布的垂直对齐才齐。 */
.box-col {
  border-left: 1px solid #8c939d;
  border-bottom: 1px solid #8c939d;
  padding: 5px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.box-line-title {
  line-height: 35px;
  /* 【第十二届·第九轮】.box 变成 flex 容器后，表头要靠 order 才永远排在第一个
     （行们的 order 都是 0 以上的正数，-1 一定在它们前面） */
  order: -1;
}

.box-line-title > .box-col {
  border-top: 1px solid #8c939d;
}

.box-line-title > .box-col:last-child,
.box-line > .box-col:last-child {
  border-right: 1px solid #8c939d;
}

.box-line > .box-col:first-child {
  line-height: 30px;
}

.box-line-title > .box-col:first-child,
.box-line > .box-col:first-child {
  background-color: #dcdcdc;
}

/* ===========================================================================
 * 【第十二届·第五轮】教师指挥「带入行」+ 署名排序格
 *
 * 本段**全部是新增规则**，上面任何一条都没有被改动、覆盖或删除 ——
 * 所以手填行的渲染结果与改动前逐像素一致。
 * =========================================================================== */

/* 署名排序那一格里的下拉框。
   不设 width 让它按 .box-col 的宽度自适应（本项目其它下拉框都是这个写法，
   与本表的「性别」下拉框一致 —— 多写一个 width 反而会和列宽打架）。 */
.signature-select {
  width: 100%;
}

/* 带入行：整行压暗 + 文字变灰，一眼看出「这一行不是我能随便填的」。
   .box-line 已有的边框/内边距/网格定位全部继承，这里只覆盖配色。 */
.box-line-conductor > .box-col {
  background-color: #f5f5f5;
  color: #909399;
}

/*
 * 带入行里唯一可编辑的那一格（第 3 格 = 署名排序）。
 *
 * 【为什么必须单独把底色改回白色】整行压成灰的之后，如果署名排序那一格也是灰底，
 * 用户会认为它和别的格子一样是禁用的、根本不会去点它 —— 功能就白做了。
 * 白底 + 深色文字 = 唯一的「这里能操作」的信号。
 *
 * 【为什么用 nth-child(3) 而不是加一个 class】行体的 10 个格子是按顺序写的，
 * 位置就是序号/姓名/署名排序/…；写成 nth-child(3) 与模板顺序一一对应，
 * 不需要在模板里多挂一个只用于配色的 class。若将来这一列换位置，
 * 这里要同步改 —— 已在模板的注释里标注了该列的位置约定。
 */
.box-line-conductor > .box-col:nth-child(3) {
  background-color: #fff;
  color: #303133;
}

/*
 * 【序号那一格为什么不用管】上面已有的
 *     .box-line-title > .box-col:first-child,
 *     .box-line > .box-col:first-child { background-color: #dcdcdc }
 * 选择器权重（0,3,0）高于本段的 `.box-line-conductor > .box-col`（0,2,0），
 * 所以带入行的序号格会**自动**沿用全表统一的 #dcdcdc —— 与手填行一致，
 * 正是想要的效果，不需要在这里再补一条。
 * 边框同理：.box-col 的 border-left / border-bottom 已被带入行继承，一条都没丢。
 */

/* 操作列的「—」：明确表示「没有按钮可用」。
   用颜色和字重表达，不加 cursor:not-allowed —— 它不是禁用按钮，是「本来就没有操作」。 */
.box-col-dash {
  color: #c0c4cc;
  font-weight: 700;
  font-size: 18px;
}

/* 带入行的电子照片。尺寸 59×82 与手填行、与参展人员表三者**逐字相同**，
   行高才会一致（理由见本文件模板里电子照片格的注释）。 */
.head-img {
  width: 59px;
  height: 82px;
}
</style>
