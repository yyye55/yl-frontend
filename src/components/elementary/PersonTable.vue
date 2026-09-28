<template>
  <div class="container">
    <!--
      【@change 为什么在这里，而不在下面那个 el-upload 上】
      el-upload 把 `onChange` 声明成了 prop（element-plus upload.mjs 里
      `onChange: { type: Function, default: NOOP }`），写在组件上的 @change 会被
      当成那个 prop 消化掉，**不会**有原生监听挂到根元素上；而 EP 内部只在「文件状态
      变化」时调用它 —— 选中空文件夹时 uploadFiles 在 `if (files.length === 0) return`
      就返回了，一次状态变化都没有，那个 prop 从头到尾不会被调用。
      原生 change 事件**本身是触发的**（只是被 EP 吞了），而它会冒泡，所以挂在
      这个普通 div 上就能收到，用来补「文件夹里没有照片」那条提示。
      三个文件 input（Excel 导入 / 批量照片 / 隐藏的单张）里只有批量照片那个开了
      目录选择，处理函数按 webkitdirectory 认人（见 onFileInputChange）。
    -->
    <div class="options" @change="onFileInputChange">
      <!--
        dist 原文（模块 db6d 渲染函数）：

          t("el-upload",{ref:"upload",staticStyle:{margin:"10px",display:"inline-block"},
            attrs:{action:"/","show-file-list":!1,"on-change":e.importExcel,"auto-upload":!1}},[
            t("el-button",{...on:{click:()=>e.downloadStaticFile("/ylbxt/static/参演人员导入模板.xlsx","参演人员导入模板.xlsx")}},[下载模板]),
            t("el-button",{...attrs:{slot:"trigger",type:"text"},slot:"trigger"},[批量导入]),
            t("el-button",{...on:{click:e.add}},[添加一行]),
            t("el-button",{...on:{click:e.flush}},[清空]),
            t("el-upload",{...批量上传头像}),          ← 内层
            t("el-upload",{...隐藏的单个头像上传}),     ← 内层
            t("p",{...},[注：电子照片要求...])
          ])

        关于 slot="trigger" → <template #trigger>（见文件头「移植理由 5」的完整论证）：
        这里把 `批量导入` 挪进 #trigger 后，Element Plus 的 el-upload 会把它渲染在
        uploadContent 内部（唯一可点开文件选择框的区域），其余默认插槽子节点渲染在其后 ——
        与 Element UI 2 的 index.vue 渲染函数 `this.$slots.trigger ? [o, this.$slots.default] : o`
        **产出完全相同的 DOM 顺序与点击行为**，不是行为变更。
      -->
              <!--
                【第九轮补的第二种写法】「姓名+后6位」是**新增**的消歧写法，不是替换：
                红头文件规定的纯后 6 位照旧有效（expectedPhotoNames 里两种都收）。
                写在这里是因为用户是照着这行红字命名文件的，而撞号在填表阶段就要能预防。
                措辞里特意不写「教师请用…」——本表两种身份混排，且教师本来就只收带姓名的
                那种（规则在 expectedPhotoNames 里，此处不重复解释，免得改一处漏一处）。

                【这句必须**常驻**，不能删】下面那条红字是撞号时才冒出来的，只靠它的话，
                没有撞号的用户从头到尾读不到「后6位会重复」这条规则 —— 而恰恰是他们需要
                在命名文件之前就知道。所以规则本身留在这里，红字只负责「你已经撞了」这一句。
              -->
              <p style="color: black; margin: 10px 0">注：电子照片要求为蓝底免冠证件照，JPG格式，每张不超过100KB；上传文件名格式为：学生照片以学生身份证号后6位命名，例如：<span style="font-weight: bold">123456.jpg</span>则与身份证号码后六位为 <span style="font-weight: bold">123456 </span>的人员对应。若表内有两人身份证后6位相同，可改用「姓名+身份证号后6位」命名（例如：<span style="font-weight: bold">张小明123456.jpg</span>）加以区分。</p>

              <!--
                撞号情形的常驻说明，紧接上面那条命名规则渲染（下一排）。

                上一条只交代了「两人后6位相同 → 改用姓名+后6位」，
                没有交代「带上姓名之后仍可能相同」——这一条把两种撞法都摆出来，
                并给出对两种撞法都成立的做法：改用行内按钮逐张上传。

                为什么也要常驻：下面那条红字只在真的撞号时才出现，
                没有撞号的用户读不到它；而「先知道规则、再取文件名」的顺序不能反过来。
                样式逐字沿用上一条（同为 inline style，color/margin 一致），两行才是一组。
              -->
              <p style="color: black; margin: 10px 0">另需注意：若表内有两行可命名为同一文件名（例如两行身份证后6位同为 123456，都要命名为 <span style="font-weight: bold">123456.jpg</span>；或两行姓名与身份证后6位均相同，都能命名为 <span style="font-weight: bold">张三123456.jpg</span>），则两份照片文件重名，批量上传时系统无法判定文件所属行次。请改用行内「上传照片」按钮逐张上传。</p>

              <!--
                【第九轮新增】撞号提示。位置紧跟上面那条命名规则：用户读到「怎么命名」
                的下一行就是「你这一份表里有两行会撞」，两句话在同一次视线里。
                内容由共用模块的 formatPhotoCollisions 生成（判据与上传路径同源，见其注释）。
                没有撞号时整段不渲染 —— 它是条件渲染的一行红字，不改变任何数据。
                文案里会点名行号（「第一行和第三行…」），因为撞号在界面上看不出来；
                但不报那两行实际会重名的文件名，理由见该函数注释。
              -->
              <p v-if="photoCollisionText" style="color: #d80e0e; margin: 10px 0; font-weight: bold">{{ photoCollisionText }}</p>
      <el-upload
        class="import-bar"
        style="display: inline-flex; align-items: center; flex-wrap: wrap; gap: 8px"
        action="/"
        :show-file-list="false"
        :on-change="importExcel"
        :auto-upload="false"
      >
        <el-button
          style="color: #1890ff"
          type="text"
          @click="downloadStaticFile(BASE + 'static/参演人员导入模板.xlsx', '参演人员导入模板.xlsx')"
        >
          下载模板
        </el-button>

        <template #trigger>
          <el-button style="color: #1890ff" type="text">批量导入</el-button>
        </template>

        <el-button style="color: #1890ff" type="text" @click="add">添加一行</el-button>
        <el-button style="color: #1890ff" type="text" @click="flush">清空</el-button>

        <!--
          【文件夹上传】本控件加了 directory —— Element Plus 的原生属性
          （upload.d.ts 的 `directory?: boolean`，注释即 "whether to support
          uploading directory"），它最终落成内层 input 上的 webkitdirectory，
          于是点击后弹出的不再是「选择文件」，而是「选择文件夹」。

          【一次能拿到什么】webkitdirectory 会让浏览器把所选文件夹**及其所有子文件夹**
          里的文件递归塞进 input.files。用户不必再 Ctrl+A 框选，对着一个文件夹点两下即可。
          子文件夹的结构不影响结果：照片归属只看**照片自己的文件名**。

          【为什么 before-upload 从 beforeUpload 换成 beforeUploadBatch】两个理由：
          ① accept="image/jpeg" 在选文件夹模式下会被浏览器忽略（选文件夹时无法按类型
             过滤），文件夹里的 .xlsx / .txt / .DS_Store / Thumbs.db 会**全部**进来并
             逐个触发 before-upload；共用的 beforeUpload 会为它们连着弹十几条红字。
             beforeUploadBatch 把这类杂项静默滤掉（只计数，最后在汇总里报个数）。
          ② 更关键的一条：beforeUploadBatch 把「文件名匹配到哪一行」从上传**之后**
             提到了**之前** —— 不合格的文件一个请求都不发，也不再留下孤儿文件。
             详见该函数上方的注释（含手机原图被误判成教师照片那个毛病的根治）。
          保留 accept 是给不支持 webkitdirectory 的老浏览器兜底。
        -->
        <el-upload
          style="display: inline-block"
          :http-request="uploadFileBatch"
          :before-upload="beforeUploadBatch"
          directory
          multiple
          accept="image/jpeg"
          :show-file-list="false"
        >
          <!--
            【文案说明了「文件夹」】点了这个按钮弹出的是「选择文件夹」对话框，
            不再是「选择文件」。文案明说，用户才不会以为是控件坏了 —— 这是加
            directory 之后唯一需要跟着改的对外文字，没有别的连带影响。
            顺带把「一次选一个文件夹、照片按文件名自动分发到各行」的意思点出来，
            否则用户会以为还要逐张指定是谁的。
          -->
          <el-button style="color: #1890ff" type="text">批量上传照片文件夹</el-button>
        </el-upload>

        <el-upload
          :http-request="uploadFileSingle"
          :before-upload="beforeUploadSingle"
          hidden
          :show-file-list="false"
        >
          <button ref="uploadAvatar" type="button">click</button>
        </el-upload>
      </el-upload>
    </div>

    <!-- ref 给 useDragScroll：按住表头行/序号列等空白处可鼠标拖动横滚 -->
    <div ref="boxRef" class="box">
      <!-- dist 里是编译期提升的静态子树 e._m(0) -->
      <div class="box-line-title">
        <div class="box-col">序号</div>
        <div class="box-col">姓名</div>
        <div class="box-col">身份证后6位</div>
        <div class="box-col">性别</div>
        <div class="box-col">年龄</div>
        <div class="box-col">学校名称</div>
        <div class="box-col">联系电话</div>
        <div class="box-col">身份</div>
        <div class="box-col">角色</div>
        <div class="box-col">使用乐器</div>
        <div class="box-col">电子照片</div>
        <div class="box-col sticky-column">操作</div>
      </div>

      <div v-for="(item, index) in data" :key="index" class="box-line">
        <div class="box-col">{{ index + 1 }}</div>
        <div class="box-col">
          <el-input v-model="item.name" placeholder="请输入姓名" />
        </div>
        <div class="box-col">
          <el-input v-model="item.card" placeholder="请输入身份证后6位" />
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
          <el-select v-model="item.type" placeholder="请选择">
            <el-option label="学生" :value="0" />
            <el-option label="教师" :value="1" />
          </el-select>
        </div>
        <div class="box-col">
          <el-select v-model="item.position" placeholder="请选择">
            <el-option label="正式队员" :value="0" />
            <el-option label="预备队员" :value="1" />
            <el-option label="指挥" :value="2" />
          </el-select>
        </div>
        <div class="box-col">
          <el-select v-model="item.instrument" placeholder="请选择">
            <el-option label="短笛" value="短笛" />
            <el-option label="长笛" value="长笛" />
            <el-option label="单簧管" value="单簧管" />
            <el-option label="低音单簧管" value="低音单簧管" />
            <el-option label="中音萨克斯" value="中音萨克斯" />
            <el-option label="次中音萨克斯" value="次中音萨克斯" />
            <el-option label="上低音萨克斯" value="上低音萨克斯" />
            <el-option label="双簧管" value="双簧管" />
            <el-option label="大管" value="大管" />
            <el-option label="小号" value="小号" />
            <el-option label="长号" value="长号" />
            <el-option label="圆号" value="圆号" />
            <el-option label="上低音号" value="上低音号" />
            <el-option label="大号" value="大号" />
            <el-option label="打击乐" value="打击乐" />
            <el-option label="低音大提琴" value="低音大提琴" />
            <el-option label="其他" value="其他" />
          </el-select>
        </div>
        <div class="box-col">
          <!--
            【第十二届·占位遮罩】dist 原文是无条件渲染 `<img :src="item.head">`。
            没上传照片时 item.head 是空串（添加一行推的是 {}、编辑页后端回填的是 ""），
            `src=""` 会被浏览器当成「这张图加载失败」，于是渲染出破碎图片的小图标 + alt 边框。
            改成二选一：有地址才渲染 <img>，没地址渲染同尺寸占位遮罩。

            ① 尺寸 59×82 必须与照片严格一致：本列没有固定行高，行高由这一格撑开
               （无照片的行，最高的一格就是这张图）。占位块只要矮 1px，整行就跟着矮 1px，
               表头行和它下面的行会错位。
            ② v-if 判的是「值真假」不是「!== undefined」：空串、null、undefined 三种
               都走占位分支。空串正是后端编辑页回填的形态，也是当前破碎图标的来源。
            ③ 只改渲染，不动数据：item.head 依旧不初始化，uploadSuccess 依旧在拿到
               url 时 `data.value[i].head = url`（见 PersonTable.vue:199 的注释），
               赋值后 v-if 立即为真、<img> 与占位块原位互换，无需额外 code。
          -->
          <img v-if="item.head" style="width: 59px; height: 82px" :src="item.head" />
          <div v-else class="head-placeholder">
            <span class="head-placeholder-icon">+</span>
            <span>待上传</span>
          </div>
        </div>
        <div class="box-col sticky-column">
          <el-button @click="upAvatar(index)">上传照片</el-button>
          <el-button type="danger" @click="remove(index)">删除</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * 参演人员名单表格（报名表单「参演人员」段）
 *
 * ===========================================================================
 * 【dist 已确认】来源：dist/chunk-0294a80a.165638130932c3751d03.js 模块 db6d
 * 该模块被 14 个报名/修改页共用（dist 事实），在这些页面里 import 为 `Person`（模板中写作 <Person>）。
 * 取证方式同 TeacherTable：检索 `n("db6d")` 命中 14 个路由 chunk，模块体字节完全相同。
 * 本项目中由 OrchestraForm.vue 与 ProgramForm.vue 共用，覆盖 8 条路由：
 *   /city|school/elementary/{create, edit/:id}
 *   /city|school/teacher/{create, edit/:id}
 *
 * dist 原文组件选项（关键部分逐字）：
 *
 *   name:"Student",                     // ← 与 TeacherTable 同名，复制粘贴笔误，见「未保留项 b」
 *   props:["showdata"],
 *   data(){ return {
 *     data:[], msg:[], number:0,
 *     QiniuData:{ token:"", key:"ylbxt/avatar/" },
 *     domain:"https://upload.qiniup.com",
 *     host:"https://img.atyth.com/"
 *   } },
 *   watch:{ showdata(e){ this.data = e } },
 *   mounted(){ this.$nextTick(()=>{ this.showdata?this.data=this.showdata:this.data=[] }),
 *              this.getQiniuToken() },
 *   methods:{ add, remove, upAvatar, flush, check, checkLine, exportCheck, getData,
 *              importExcel, getPosition, getCacheData, uploadSuccess, uploadSuccessBatch,
 *              beforeUpload, getQiniuToken }
 *
 * 父页面的调用方式（对 dist 检索 $refs.person.* 全量确认）：
 *   <Person ref="person" :showdata="form.person" />
 *   this.$refs.person.getData()        // 提交前校验
 *   this.$refs.person.getCacheData()   // 草稿缓存
 * 对外契约（prop showdata / 方法 getData、getCacheData）与 TeacherTable 完全相同。
 *
 * ===========================================================================
 * 逐条移植理由
 * ===========================================================================
 * 1) `props:["showdata"]`、`watch`、`mounted`+`$nextTick`、`$set` → Vue 3 写法
 *    与 TeacherTable.vue 完全相同的四条，理由见该文件（不重复展开）。此处补充一条：
 *    `this.$set(this.data[this.Arrayindex],"head",url)` 在 Vue 3 直接写成
 *    `data.value[Arrayindex].head = url` —— 数组元素本身是深响应代理，新增 head 字段同样是响应式，
 *    `<img :src="item.head">` 会照常更新（这正是要保留 `$set` 语义的地方）。
 *
 * 2) 两个「挂在 this 上但没写进 data」的实例属性
 *    dist 的 beforeUpload 里 `this.filename=e.name`、upAvatar 里 `this.Arrayindex=e`，
 *    二者都不在 data 中声明。`<script setup>` 没有 this，改用模块级
 *    `let filename` / `let Arrayindex`：setup() 每个组件实例各跑一遍，作用域与
 *    Vue 2 的「每实例一份、非响应式」完全一致；而且它们只在同步流程里被读，
 *    不需要响应式（dist 里也没有任何模板引用它们）。
 *    → 【第十二届改造·第二轮】`let filename` 已删除：它唯一的用途是给七牛上传的
 *      info.filename 赋值（见下方缺陷 f），改用 options.file.name 现取后失去意义。
 *    → 【第十二届·第三轮】`let Arrayindex` 也删了：upAvatar / uploadFileSingle 整体
 *      搬进 @/composables/usePhotoUpload，它在那边是 usePhotoUpload() 闭包里的一个
 *      局部变量 —— **每个组件实例各一份**，比原来「模块级、两个实例共享」更贴近
 *      dist 的 `this.Arrayindex`（实例属性）。本文件不再有它。
 *
 * 3) 工具 / 接口来源（dist 是全局的，本项目改为显式 import）
 *    - this.$api.files.saveFileInfo   → `import { fileApi } from '@/api/misc'` → fileApi.saveFileInfo
 *    - this.$api.communal.getQiNiuToken → `import { qiniuApi } from '@/api/misc'` → qiniuApi.getToken
 *      （两处映射均已核对 src/api/misc.js 的实际导出名）
 *      → 【第十二届改造·第二轮】该映射连同 qiniuApi 导入一并删除，见下方 7)。
 *    - this.rename(...)               → `import { rename } from '@/utils/excel'`
 *      → 【第十二届改造·第二轮】该导入已删除：它只用于给七牛拼 ObjectKey。
 *    - this.downloadStaticFile(...)   → `import { downloadStaticFile } from '@/utils/excel'`
 *      【dist 已确认】dist 的实现（app.js，Vue.prototype.downloadStaticFile）是
 *        const a=document.createElement("a"); a.href=路径; a.download=文件名;
 *        a.target="_blank"; a.click(); a.remove()
 *      src/utils/excel.js 里已有的 downloadStaticFile **逐字相同**，因此直接复用，
 *      没有新建第二份实现（本轮不允许改 excel.js，import 不是修改）。
 *      【部署前缀：唯一一处有意偏离 dist 字面量】「下载模板」的路径 dist 写死成
 *      "/ylbxt/static/参演人员导入模板.xlsx"（因为 dist 的 publicPath 就是 /ylbxt/）。
 *      本项目 vite.config.js 明确「部署前缀唯一来源是 base，代码里一律用
 *      import.meta.env.BASE_URL 读取」，且模板文件确实放在 frontend/public/static/
 *      （已比对 md5，与 dist/static/参演人员导入模板.xlsx 完全一致）。
 *      【2026-09-28 起 md5 不再一致，是有意为之】模板第 2 行「身份证」一格改为
 *      「身份证后6位」（字段语义由完整 18 位改成后 6 位）。改动方式是把包里
 *      xl/sharedStrings.xml 的那一处 <si><t>…</t></si> 换掉、其余条目按原压缩方式
 *      逐字节回写 —— styles.xml、冻结窗格 ySplit=2、列宽、phoneticPr 全部保留，
 *      已逐条目比对确认只有 sharedStrings.xml 不同（未压缩长度 +7 字节）。
 *      `参演人员导入模板1.xlsx`（PersonTableMajor 用）同步改了同一格。
 *      故改为 `BASE + 'static/参演人员导入模板.xlsx'`：生产环境 base='/ylbxt/' 拼出的
 *      字符串与 dist 逐字相同，开发环境 base='/' 才能命中 Vite 的 public 目录
 *      （否则开发时点「下载模板」必然 404）。做法与 src/views/test/index.vue 的
 *      MODEL_URL 一致。除该常量拼接外，downloadStaticFile 的第二个参数（下载文件名）
 *      与整个调用形式均保持 dist 原样。
 *    - this.xlsx2json(...)            → `import { xlsx2json } from '@/utils/xlsx'`（本轮新建的文件）
 *      dist 里它是 Vue.prototype 上的方法，返回 `[{ sheet: 行数组 }]`；新建的实现忠于该结构，
 *      原因与取证见 src/utils/xlsx.js 顶部注释。
 *
 * 4) `size="mini"` 已移除
 *    【dist 已确认】Element Plus 只认 large/default/small，`mini` 不被识别、每次渲染告警一次；
 *    而 EP 中没有 `.el-input--mini` / `.el-select--mini` / `.el-button--mini` 任何规则，
 *    该属性本来就不产生样式，删掉是零视觉变化。**未**改成 small —— `.el-input--small` 等
 *    是真实尺寸规则，会把输入框/按钮压小。
 *
 * 5) `slot="trigger"` → `<template #trigger>`（本组件唯一需要推敲的模板改动）
 *    【dist 已确认】Element UI 2 的 ElUpload(index.vue) 渲染函数：
 *        r = this.$slots.trigger || this.$slots.default
 *        o = e("upload", n, [r])
 *        return e("div", [..., this.$slots.trigger ? [o, this.$slots.default] : o, this.$slots.tip, ...])
 *      即：有 trigger 插槽时，**trigger 的内容**进 inner-upload（可点开选择框的区域），
 *      默认插槽的其余子节点作为兄弟节点跟在后面（不触发选择框）。
 *    【dist 已确认】Element Plus 的 ElUpload(upload.vue)：
 *        uploadContent 内 = $slots.trigger ? trigger : default
 *        key 2 = $slots.trigger ? renderSlot($slots,"default") : 无
 *      两者产出的 DOM 顺序（trigger 在前 → 其余默认插槽子节点 → tip → 列表）与点击行为一致。
 *    因此这一步是**等价翻译**，不是行为变更：在本项目下，
 *    「下载模板 / 添加一行 / 清空 / 批量上传头像」都不会弹文件选择框，只有「批量导入」会。
 *
 * 6) getData / getCacheData → defineExpose，签名与返回值逐字保留。
 *
 * 7) 【第十二届改造·第二轮】上传通道：七牛直传 → 阿里云 OSS（biz: image）
 *    小文件改由后端代传进 OSS，经 @/services/ossUpload 的 uploadToOss()。
 *    本组件共 3 个 el-upload，只动前两个（**外层那个是 Excel 导入，纯本机解析、
 *    不联网，保持原样**）：
 *      - 内层「批量上传头像」：`:action`/`:data`/`:on-success` → `:http-request="uploadFileBatch"`
 *      - 内层「单张上传头像」：同上 → `:http-request="uploadFileSingle"`
 *    脚本侧删除 QiniuData / domain / host / filename / getQiniuToken() / qiniuApi 导入 /
 *    rename 导入；`onMounted` 里那次 getQiniuToken() 预取随之去掉。
 *    ⚠️ 成功后的业务逻辑逐字保留，一步都没省：仍然调 fileApi.saveFileInfo(info)
 *      （info 的 filename/type/size/url 四个字段同名同义），仍然在 body.code===0 时
 *      回写 `data.value[...].head`；批量的匹配算法见 uploadFileBatch —— 第十二届已由
 *      「身份证后6位+姓名」改为师生两套命名，不再是原样。
 *    注意本组件的体积上限比后端规则更严（这里 100KB，后端 image 规则是 1MB），
 *    前面那道 beforeUpload 是主闸，biz: image 只作兜底。
 *
 * 【dist 已知缺陷（默认按原样保留，逐条注明处理结果）】
 *   a. `upAvatar(e){ event.preventDefault(), this.Arrayindex=e, this.$refs.uploadAvatar.click() }`
 *      —— 引用的是**全局 window.event**（浏览器非标准但普遍存在），而不是形参；
 *      dist 模板里传进 upAvatar 的其实是行下标 index，本来也拿不到事件对象。
 *      【第十四轮·已修】upAvatar 本体在 @/composables/usePhotoUpload，
 *      修法与破例的两条判据（零收益 + 有风险）写在该文件头的「dist 已知缺陷的处理记录」a。
 *      本文件不再有"含此缺陷"的引用。
 *   b. importExcel 第一个循环里遗留了 `console.log(t[e])`（每次导入都会把每行打印到控制台）。
 *      属于 dist 遗留的调试输出，按原样保留。
 *   c. importExcel 用 `e.name.split(".")[1]` 取扩展名：文件名含多个点时会取错段。
 *      原样保留。
 *   d. 校验失败提示里的行号用的是 sheet 数组下标（第一条数据报「第1行」），
 *      与 Excel 里的可见行号差 1，原样保留。
 *   e. beforeUpload 返回的是「先判体积、再判格式」的嵌套三元：体积超限时**优先**报体积错误，
 *      即使格式也不对。下面用同序的 if 链复现，未调整判定优先级。
 *   f. 【无法确认】`uploadSuccess` 里 `info.filename = this.filename` 取的是 beforeUpload
 *      最后一次写入的文件名。单文件上传时二者必然一致（一次 beforeUpload 对一个 on-success），
 *      批量上传走的是另一个方法（用 file.name），所以此处没有观察到不一致；
 *      但由于是「实例级可变变量」，理论上并发上传会串，dist 即如此。
 *      → 【第十二届改造·第二轮已消灭】单张上传改用 `file.name` 现取，
 *        这条串号风险不复存在（见下方 7)。
 *   g. 【无法确认】`getPosition` 有 `"伴奏" → 3` 分支，而界面上的「角色」下拉只提供
 *      0 正式队员 / 1 预备队员 / 2 指挥 三项；该分支只可能由导入的 Excel 命中
 *      （src/components/common/ShowPerson.vue 的注释也确认 position=3 表示「伴奏」）。
 *      原样保留。
 *
 * 【未保留项（非功能缺失，逐条说明）】
 *   a. dist 外层 el-upload 上的 `ref:"upload"` 未移植：全组件（以及全 dist）从未读取
 *      `this.$refs.upload`（只用到 $refs.uploadAvatar），保留它只会多一个无引用变量。
 *   b. 内部 name:"Student" 未保留（与 TeacherTable 同因：复制粘贴笔误，且父页面是按
 *      import 绑定名 <Person> 注册使用的，没有任何地方按组件内部 name 解析）。
 *   c. data 里的 `msg:[]`、`number:0` 未保留：dist 声明了但组件内从未读写，
 *      父组件只调用 getData/getCacheData（已全量检索 $refs.person.* 确认）。
 */

import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { fileApi } from '@/api/misc'
import { downloadStaticFile } from '@/utils/excel'
import { xlsx2json } from '@/utils/xlsx'
import { uploadToOss } from '@/services/ossUpload'
import { checkPersonBasics, isBlankCard } from '@/config/personFields'
import { useDragScroll } from '@/composables/useDragScroll'
/* 【第十二届·第三轮】照片上传的零件（parsePhotoName / beforeUpload /
   beforeUploadSingle / uploadFileSingle / upAvatar）已搬到共用模块，
   与指导教师表用同一份实现 —— 体积上限、命名规则、OSS 通道都不再有第二份副本。
   批量上传（uploadFileBatch）留在本文件：它写的是本表自己的 data，
   且「一文件匹配多行」的算法只有参展人员表用得上。

   【本轮改造】多引入两个导出，都是**新增**、不改共用模块里任何既有导出：
     · checkPhotoBasic  —— 体积/格式的「不弹提示」版，供批量汇总收集结论（原 beforeUpload 仍照旧使用）
     · matchPhotoToRows —— 「算每行期望名再全等比较」的匹配算法，把匹配从上传后提到上传前
   parsePhotoName 不再由本文件使用：批量路径改走 matchPhotoToRows 之后，
   「先按正则猜是学生还是教师」这一步被彻底去掉了（见 beforeUploadBatch 的说明）。

   【第九轮再引入两个】都服务于「撞号要在填表阶段就看得见」：
     · findPhotoNameCollisions —— 表内有几行会接受同一个文件名（判据同 matchPhotoToRows）
     · formatPhotoCollisions   —— 把上面的结果拼成给用户看的那句话（三张表共用一份说法）
   两者都是**纯函数**，不碰 usePhotoUpload 返回的那套状态。 */
import {
  usePhotoUpload,
  checkPhotoBasic,
  matchPhotoToRows,
  findPhotoNameCollisions,
  formatPhotoCollisions
} from '@/composables/usePhotoUpload'

// 12 列下限合计 1376px，1366/1440 乃至 1600/1680 屏都放不下，只能横向滚。
// 横向滚动条贴在表格最下方、又只有十几像素高，很难拉 —— 于是支持按住空白处直接拖。
const boxRef = ref(null)
useDragScroll(boxRef)

const props = defineProps({
  /** 父组件传入的名单数组（通常是 form.person），可为 undefined / null */
  showdata: { default: undefined }
})

/*
 * 【第十二届·第四轮】新增两个对外事件，只为「填错了立刻提示」这一个用途。
 *
 * 【背景】父页面（OrchestraForm / ProgramForm）要校验「指挥最多 1 人 / 中小学不许学生
 * 指挥 / 指导教师最多 1~2 人」，而这三条都依赖**本表已经填了什么**。本表对外原本只有
 * prop showdata 与 getData / getCacheData 两个方法，父页面只能在暂存 / 提交那一刻才拿到
 * 数据，于是用户填错了要一直等到点「立即报名」才被打回。新增：
 *   rows-change —— 「影响校验的字段变了」（行增删，或某行的身份 / 角色被改）
 *   imported    —— 「批量导入结束了」（成功重建数据之后，紧接着发一次）
 *
 * 【只增不改】prop showdata 与 getData / getCacheData 的签名、语义一字未动；
 * 不监听这两个事件的父页面（如果有）行为与改动前**完全相同**。
 */
const emit = defineEmits(['rows-change', 'imported'])

const data = ref([])
// 【第十二届改造·第二轮】QiniuData / domain / host / filename 已移除：
// 上传改走阿里云 OSS（biz: image，小文件由后端代传），key 由后端生成、
// url 由上传服务返回，前端不再硬编码七牛域名。

/** 部署前缀（dist 是写死的 "/ylbxt/"），用法见文件头「移植理由 3」最后一段 */
const BASE = import.meta.env.BASE_URL

/*
 * 【第十二届·第三轮】单张上传的全部零件改从共用模块取：
 *   uploadTrigger —— 改名成 uploadAvatar，模板里 ref="uploadAvatar" 一字不用改
 *   upAvatar      —— 「上传照片」按钮的点击处理（第十四轮已收口那个 window.event 裸引用，
 *                    判据见该文件头「dist 已知缺陷的处理记录」a）
 *   beforeUploadSingle / uploadFileSingle —— 单张路径绑它们
 * 传进去的回调负责回答「第 i 行是哪个对象」，公共模块不认识本表的数据结构。
 * 原文件里那个模块级 `let Arrayindex` 随之删除：它的作用域收进这个组件实例
 * （dist 原版是 this.Arrayindex，即实例属性，这样反而更贴近 dist）。
 *
 * 【本轮改造】不再解构 beforeUpload：批量路径已改为直接调 checkPhotoBasic +
 * matchPhotoToRows（见 beforeUploadBatch）—— 本表的判据升级成了"全等于某一行的
 * 期望文件名"，比它那条宽松正则更严更准，所以本表不再需要直接绑它。
 *
 * 【更正一句曾经写错的话】这里原来写的是「那条宽松命名正则只服务于教师表」。
 * 不准确：TeacherTable.vue 也**不**直接绑 beforeUpload（它的注释里写着"本表不用
 * beforeUpload，那是批量上传照片的基础闸，而批量按钮在参展人员表"）。实际是
 * **两张表都不再直接绑它**，而它并没有变成死代码 —— beforeUploadSingle 内部第一句
 * 就是 `if (!beforeUpload(file)) return false`，所以体积/格式/命名正则这三条
 * 仍然在**两条单张路径上**照常生效（也正是靠它，"格式就不合法"的文件才会在
 * 单张路径上报出与批量同口径的提示）。
 */
const {
  uploadTrigger: uploadAvatar,
  upAvatar,
  beforeUploadSingle,
  uploadFileSingle
} = usePhotoUpload(
  (i) => data.value[i],
  /* 【第二个入参】`() => data.value` 让单张上传在**传完之后**能按文件名重新确认
     「该写哪一行」，修掉「上传那两秒里用户删了一行 → 照片写到别人头上」。
     【两表都传了】TeacherTable.vue 在第十四轮补上了同一个回调，两表自此对称
     （改前只有本表有这层保护，同一个坑教师表照旧会踩）。
     公共模块仍把这个参数写成**可选**：不传，resolvePhotoTarget 就短路回
     `getRowAt(fallbackIndex)`，与改动前**逐字相同** —— 将来新增的表若不想要
     这层保护，不传即可，不会受本次修复的任何影响。
     那两个 getter 指向的是同一个数组和同一批元素（都是 data.value 的响应式代理），
     所以 resolvePhotoTarget 里用 rows[命中下标] 与 getRowAt(下标) 拿到的是同一个对象。 */
  () => data.value
)

/*
 * 【第十二届·第十三轮】与 TeacherTable.vue 同款、同日修的兜底（那条改动的完整因果链
 * 写在该文件的 watch 上方，此处不重复展开）。两表是孪生模块，父组件、
 * prop 契约、onMounted 写法都完全对称，所以两边的 watch 也必须对称。
 *
 * 【本表为什么当时没崩、现在也必须补】
 * 因为本表下面 watch 的是 `rowsSignature`，而那个函数第一行就写了
 * `if (!Array.isArray(data.value)) return ''` —— 相当于**意外**被兜住了，
 * 抛不出错。但 data.value = undefined 这个坏状态本身仍然成立了，只是没被引爆：
 *   · flush() 里的 `data.value.splice(0, data.value.length)`
 *   · 导入重建时那句同样的 splice
 *   · check() 之外仍然裸读 `data.value.length` 的地方
 * 一旦用户点「清空」或走导入，就会轮到它们抛。
 * 所以这里补的不是「修一个正在崩的地方」，而是**把坏状态从源头掐掉**。
 * （不写行号：本文件改动后行号会平移，写死容易过期。）
 *
 * 【写法】与 onMounted 的 `props.showdata ? props.showdata : []` 逐字一致，
 * 与 TeacherTable.vue 改后也逐字一致 —— 三处同一个约定，不留第二种写法。
 */
watch(
  () => props.showdata,
  (val) => {
    data.value = val ? val : []
  }
)

/**
 * 供下面的 watch 使用：把「影响校验的字段」压成一个字符串。
 * 不解回任何东西，只回答一个问题 —— 「跟上次比，变了没有」。
 *
 * 串里放的是什么（父页面那三条规则只依赖这两样）：
 *   data.length          —— 行数（加一行 / 删一行 / 清空）
 *   r.type | r.position  —— 每行的身份与角色（两列都是下拉，值变了就是用户改选了）
 * '#' 与 ',' 只是分隔符，取值本身不含它们，不会拼出相同的串。
 *
 * 非数组时返回空串：showdata 理论上恒为数组，但父组件在接口返回前可能传 null；
 * 那种情况下模板本来就渲染成空表，这里也不必再让 .map 抛异常。
 */
function rowsSignature() {
  if (!Array.isArray(data.value)) return ''
  return data.value.length + '#' + data.value.map((r) => (r ? `${r.type}|${r.position}` : '')).join(',')
}

/*
 * 【第十二届·第四轮】「影响校验的字段变了」的通知口。
 *
 * 【为什么 watch 特征串，而不是 watch(data, { deep: true })】
 * 父页面那三条规则只看「有几行、每行的身份与角色」，不看姓名 / 身份证 / 电话 / 乐器。
 * deep watch 会在用户打字的**每一个字符**上触发 —— 校验一次弹一次错误，表格直接没法用。
 * 特征串只在 行增删 / 身份变 / 角色变 这三种情况下才变，打字完全不会触发。
 *
 * 【什么情况会多触发一次】父组件整体替换 showdata（编辑页回填、草稿恢复）会一次性改变
 * 长度与所有行的角色 → 触发一次。这是**故意保留**的：一张按旧规则存下来的报名表
 * （例如 3 名指导教师）一打开就该看见不合规提示，而不是等用户点提交才被打回。
 */
watch(rowsSignature, () => emit('rows-change'))

/*
 * 【第十二届·第九轮】表内撞号 —— 在**填表阶段**就把批量上传注定失败的那几行指出来。
 *
 * 【为什么会撞】后端把 card 从 18 位改成后 6 位之后，后 6 位不再唯一：两个人恰好
 * 尾号相同（同校同届很常见），照片文件名就一模一样。而批量上传是**按文件名找行**的，
 * 一个名字同时命中两行，它就不知道该给谁 —— 在本次改造之前，这件事的表现是
 * 「文件传上去了、OSS 里也有、但表里的照片位还是空的」，用户根本看不出发生过什么。
 *
 * 【为什么不另写一份判据】用共用模块的 findPhotoNameCollisions，它和批量上传那侧的
 * matchPhotoToRows 建立在同一个 expectedPhotoNames 上，所以「这里提示会撞」与
 * 「上传时真的撞」不可能各说各话。同一句提醒在别处重算一遍，迟早会漂移。
 *
 * 【只在真的会撞时才报】学生收「后6位」和「姓名+后6位」两种，教师只收后者，于是
 * 「学生张三」与「教师李四」尾号相同时**不算撞**（两人文件名不会重名），两个同尾号的
 * 学生才算。这个分流是 expectedPhotoNames 按 type 做的，这里不再判第二遍。
 *
 * 【为什么它不用 watch 缓存】data.value 是父页面传进来的响应式数组，行内容一变
 * computed 自然重算；撞号本来就会随用户边填边出现/消失（填到第二行才出现），
 * 这正是我们要的时机。
 *
 * 【data.value 可能是 undefined 吗】理论上会（`props.showdata ? props.showdata : []`
 * 挡不住「真值但非数组」）—— 所以交给 findPhotoNameCollisions 内部的判型，
 * 那里对非数组按「一行都没有」处理，不在这里补第二道守卫。
 *
 * 【文案为什么要点名行号】撞号在界面上看不出来（两行长得完全不一样，只是后 6 位恰好相同），
 * 不报行号用户得自己一行行比对。所以 rows 是要进文案的，而 name 不进 —— 理由见
 * formatPhotoCollisions 的注释。
 */
const photoCollisions = computed(() => findPhotoNameCollisions(data.value))

/** 撞号提示的整句文案；没有撞号时是空串，模板直接 v-if。行内按钮在本表叫「上传照片」 */
const photoCollisionText = computed(() => formatPhotoCollisions(photoCollisions.value, '上传照片'))

onMounted(() => {
  nextTick(() => {
    data.value = props.showdata ? props.showdata : []
  })
  // 【第十二届改造·第二轮】此处原先预取七牛 uptoken（getQiniuToken()）。
  // 改走 OSS 后凭证由上传服务在真正要传时才取，不再需要挂载时预取。
})

/** dist: add(){ this.data.push({}) } —— 与 TeacherTable 不同，这里推的是空对象 */
function add() {
  data.value.push({})
}

/** dist: remove(e){ this.data.splice(e,1) } */
function remove(index) {
  data.value.splice(index, 1)
}

/** dist: upAvatar(...) / flush() —— upAvatar 已搬到 usePhotoUpload，这里只剩 flush */

/**
 * dist: flush(){ this.data=[] }
 *
 * 【第十二届·第七轮】改成原地清空，**不要**写回 `data.value = []`。
 *
 * 【为什么】`data.value` 正常情况下就是父页面传下来的 form.person（同一个数组引用，
 * 见 onMounted 的 `data.value = props.showdata ? props.showdata : []`）。
 * 赋一个 `[]` 上去是「换掉整个引用」，不是「清空里面的东西」：
 *   · 子表 data.value → 新空数组，表格看着是清了；
 *   · 父页面 form.person → 还是旧数组，一条没少。
 * 于是指导教师的「带入行」是 computed 自 form.person 的，点完清空**不会跟着消失**
 * —— 表格已空、带入行还杵在那儿。splice 原地删则父子两边同时清空。
 *
 * 【长度为什么现取】空数组时 splice(0, 0) 是 no-op，不报错、不需要额外判空。
 */
function flush() {
  data.value.splice(0, data.value.length)
}

/** dist: check(){ ... Message.error("参演人员名单第"+(e+1)+"行"+t.msg) ... } —— 与 TeacherTable 同构 */
function check() {
  if (data.value && data.value.length > 0) {
    for (let i = 0; i < data.value.length; i++) {
      const result = checkLine(data.value[i])
      if (!result.flag) {
        ElMessage.error('参演人员名单第' + (i + 1) + '行' + result.msg)
        return false
      }
    }
  }
  return true
}

/**
 * dist 的嵌套三元（界面校验）判定顺序：
 *   姓名 → 身份证 → 年龄 → 性别(空) → 学校 → 电话 → 身份(空) → 角色(空) → 使用乐器(空) → 通过
 * 注意：界面校验里 type/position 是**数字**（el-option 的 :value 是 0/1/2），
 * 所以只判 undefined/""，不做「值是否合法」的比对；值合法性比对在 exportCheck（字符串版）里。
 */
function checkLine(item) {
  if (!item.name) return { flag: false, msg: '姓名不能为空' }
  if (isBlankCard(item.card)) return { flag: false, msg: '身份证后6位不能为空' }
  if (!item.age) return { flag: false, msg: '年龄不能为空' }
  if (item.gender === undefined || item.gender === '') return { flag: false, msg: '性别需选择' }
  if (!item.school) return { flag: false, msg: '学校名称不能为空' }
  if (!item.phone) return { flag: false, msg: '电话号码不能为空' }
  if (item.type === undefined || item.type === '') return { flag: false, msg: '身份需选择' }
  if (item.position === undefined || item.position === '') return { flag: false, msg: '角色需选择' }
  if (item.instrument === undefined || item.instrument === '') {
    return { flag: false, msg: '使用乐器需选择' }
  }
  // 【第十二届·补格式校验】以上全是 dist 原判定 —— 它们只回答"填没填"，
  // 于是姓名填「123」、年龄填 -5、学校填「12345」、电话填 10 位都能一路提交到后端。
  // 规则集中在 config/personFields.js，与 Excel 导入那条路径共用同一份。
  // 放在**最后**是为了不改动上面任何一条的优先级：先报"缺了什么"，再报"填错了什么"。
  // 【2026-09-28】上面那条必填改用 isBlankCard：dist 的 `!item.card` 把纯空格当已填，
  // 与后端 normalize_card 的 strip 后判不一致，见 personFields.isBlankCard 的说明。
  const formatErr = checkPersonBasics(item)
  if (formatErr) return { flag: false, msg: formatErr }
  return { flag: true, msg: '验证成功' }
}

/**
 * dist 的嵌套三元（导入校验，判定的是**中文字符串**，因为 Excel 里填的是「学生」「正式队员」这种文本）。
 * 判定顺序：姓名 → 身份证 → 年龄 → 性别(空) → 性别(格式) → 学校 → 电话 → 身份(空) → 身份(格式)
 *          → 角色(空) → 使用乐器(空) → 角色(格式) → 通过
 * 注意 dist 的顺序就是「先判空、再判格式」，且**乐器为空**排在**角色格式**之前，下面逐条对齐。
 */
function exportCheck(item) {
  if (!item.name) return { flag: false, msg: '姓名不能为空' }
  if (isBlankCard(item.card)) return { flag: false, msg: '身份证后6位不能为空' }
  if (!item.age) return { flag: false, msg: '年龄不能为空' }
  if (item.gender === undefined || item.gender === '') return { flag: false, msg: '性别需填写' }
  if (item.gender !== '男' && item.gender !== '女') {
    return { flag: false, msg: '性别格式只能是男、女' }
  }
  if (!item.school) return { flag: false, msg: '学校名称不能为空' }
  if (!item.phone) return { flag: false, msg: '电话号码不能为空' }
  if (item.type === undefined || item.type === '') return { flag: false, msg: '身份不能为空' }
  if (item.type !== '学生' && item.type !== '教师') {
    return { flag: false, msg: '身份格式只能是学生、教师' }
  }
  if (item.position === undefined || item.position === '') {
    return { flag: false, msg: '角色不能为空' }
  }
  if (item.instrument === undefined || item.instrument === '') {
    return { flag: false, msg: '使用乐器需选择' }
  }
  if (item.position !== '正式队员' && item.position !== '预备队员' && item.position !== '指挥') {
    return { flag: false, msg: '角色格式只能是正式队员、预备队员、指挥' }
  }
  // 【第十二届·补格式校验】理由同 checkLine 末尾：导入路径是把单元格文本原样透传的，
  // 校验不在这里挡住，脏数据就直接进库了（乐器字段已经栽过一次，见 personRules.js）。
  const formatErr = checkPersonBasics(item)
  if (formatErr) return { flag: false, msg: formatErr }
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

/**
 * dist:
 *   importExcel(e){
 *     const t=e.name.split(".")[1], n=["xlsx","xlc","xlm","xls","xlt","xlw","csv"].some(t=>t===e)
 *     if(!n) return Message.error("格式有误")
 *     this.xlsx2json(e).then(e=>{
 *       if(e&&e.length>0){
 *         this.data=[]
 *         const t=e[0].sheet
 *         for(let e=1;e<t.length;e++){ console.log(t[e]); const n=this.exportCheck(t[e]);
 *           if(!n.flag) return Message.error("导入失败！参演人员名单第"+e+"行"+n.msg),!1 }
 *         for(let e=1;e<t.length;e++) this.data.push({ name:t[e].name, ... })
 *       }
 *     })
 *   }
 * 行下标从 1 开始（跳过表头），两个循环必须都跳过表头，故 i 均从 1 起。
 * 注意 xlsx2json 的 sheet 元素存储行数组，所以 `res[0].sheet` 是行数组。
 *
 * 【第十二届改造】下面这两处的顺序**故意与 dist 不同，不要照 dist 还原**：
 *   a. dist 先 `this.data=[]` 再逐行校验 → 改成了先校验、通过后才清表（失败不清表）
 *   b. dist 重建行时不带 head → 改成按 card 把旧头像捞回来
 * 原因见函数体里的注释。
 */
function importExcel(file) {
  const ext = file.name.split('.')[1]
  const valid = ['xlsx', 'xlc', 'xlm', 'xls', 'xlt', 'xlw', 'csv'].some((e) => e === ext)
  if (!valid) return ElMessage.error('格式有误')

  xlsx2json(file).then((res) => {
    if (res && res.length > 0) {
      // 【第十二届】原为 `const sheet = res[0].sheet` —— 无条件取工作簿的第一张工作表。
      // xlsx2json 只把行数组放进 `sheet`、丢掉了表名（见 src/utils/xlsx.js 的返回结构），
      // 这里拿不到表名，故无法「优先找用户表」，只能取「第一张有数据的表」。
      // 原写法在数据不在第一张表时（如新建工作簿时 Excel 默认留一张空的 Sheet1 在前）
      // 会取到空表：下面两个 for 循环都不执行、一个提示都不弹，表却被 data.value = []
      // 清空 —— 表现为静默清空。此处改为明确报错。
      // 「有数据」的判据是 length > 1：sheet_to_json 把工作表第 1 行当表头，官方模板
      // 第 2 行的中文标签行成为下标 0，数据从下标 1 起，故只有标签行时 length === 1。
      // 官方模板只有一张名为「用户表」的工作表，故对官方模板行为完全不变。
      const sheet = res.map((item) => item.sheet).find((s) => s && s.length > 1)
      if (!sheet) {
        return ElMessage.error('导入失败！未找到可导入的数据，请确认使用官方模板、且未删除表头')
      }

      // 【第十二届】把校验挪到清表之前。dist 原实现是「先 data.value = [] 再逐行校验」，
      // 于是导入一个第 N 行有错的 Excel，会先把整张表（含已上传头像）清空再报「导入失败」
      // —— 用户以为什么都没发生，其实数据已经没了。
      for (let i = 1; i < sheet.length; i++) {
        // 【dist 已知缺陷】dist 遗留的调试输出，原样保留
        console.log(sheet[i])
        const result = exportCheck(sheet[i])
        if (!result.flag) {
          return ElMessage.error('导入失败！参演人员名单第' + i + '行' + result.msg)
        }
      }

      // 【第十二届】重建前按身份证号留一份旧头像。新行对象里没有 head 字段，不捞回来的话
      // 编辑页回填的照片、以及上一轮已经上传的头像，重新导入后会全部消失。
      // 用 card 而不是行序：改完 Excel 重导时行序经常变，按序会张冠李戴；card 也是
      // uploadFileBatch 匹配用的同一个键，口径一致。
      //
      // 【第十二届·第九轮】加一道「唯一性」闸：card 改成后 6 位之后它**不再唯一**，
      // 而这里是拿 card 当对象键存的 —— 同 card 的两行后写覆盖先写，重建时两行都会被
      // 回填成**同一个** head，也就是把甲的照片挂到了乙的头上。
      //
      // 【为什么宁可两边都留空，也不要错挂】照片位空着是**看得见**的，用户会重新传；
      // 挂错了是**看不见**的，只会一路提交上去。两者不等价，所以取舍很明确：
      // 只要 card 在**旧表**或**新表**里不是恰好出现一次，就不带这张照片。
      //
      // 同 card 的行仍然可以走行内「上传照片」逐张传 —— 那条路按行定位，不经过 card。
      const oldCardCount = {}
      data.value.forEach((item) => {
        if (item.card) oldCardCount[item.card] = (oldCardCount[item.card] || 0) + 1
      })
      const oldHeads = {}
      data.value.forEach((item) => {
        if (item.head && item.card && oldCardCount[item.card] === 1) oldHeads[item.card] = item.head
      })

      // 新表这侧同样统计一次：旧表里唯一、但新表里出现了两行，仍然不该带（回填哪一行都不对）。
      // 统计的是 sheet 里的原始值，与下面建 row 时取的 sheet[i].card 是同一个来源，
      // 所以不会出现「统计用的键」与「回填时查的键」对不上的情况。
      const newCardCount = {}
      for (let i = 1; i < sheet.length; i++) {
        const c = sheet[i].card
        if (c) newCardCount[c] = (newCardCount[c] || 0) + 1
      }

      /*
       * 【第十二届·第七轮】原地清空，**不要**写回 `data.value = []`。
       *
       * 理由与 flush() 完全相同（`data.value` 就是父页面的 form.person，赋值 = 换引用），
       * 但这里的表现更隐蔽、更容易被误判成「功能没做」：
       *   · 导入重建后，子表 data.value 指向新数组，参展人员表里**看得见**导入的人；
       *   · 父页面 form.person 仍是导入前那份，指导教师的带入行 computed 拿不到指挥
       *     → 表格里明明有「教师 + 指挥」，指导教师表却一条带入行都不出。
       * 已用真浏览器复现：导入前 form.person=[原有同学]，导入后表格 2 行、
       * form.person 依旧只有 [原有同学]，带入行 0 行。
       */
      data.value.splice(0, data.value.length)
      for (let i = 1; i < sheet.length; i++) {
        const row = {
          name: sheet[i].name,
          card: sheet[i].card,
          age: sheet[i].age,
          gender: sheet[i].gender,
          school: sheet[i].school,
          number: sheet[i].number,
          phone: sheet[i].phone,
          instrument: sheet[i].instrument,
          type: sheet[i].type === '学生' ? 0 : 1,
          position: getPosition(sheet[i].position)
        }
        // 身份证号对得上、且**两侧都唯一**才带回旧头像；不带这个 key 时行对象与原来完全同构
        // （新表这侧的条件 = newCardCount[row.card] === 1，理由见上面那段注释）
        if (row.card && oldHeads[row.card] && newCardCount[row.card] === 1) {
          row.head = oldHeads[row.card]
        }
        data.value.push(row)
      }

      // 【第十二届·第四轮】导入成功（数据已重建完）→ 通知父页面立刻校验一次。
      // 位置在重建循环**之后**：父页面拿到的必须是导入后的完整数据。
      // 上面两条提前 return 的失败路径都走不到这里，符合预期 ——
      // 那两条路径按设计不改动任何数据（先校验、通过后才清表），没什么可校验的。
      emit('imported')
    }
  }).catch(() => ElMessage.error('导入失败，请刷新页面后重试'))
}

/** dist: switch(e){ case "正式队员":0; case "预备队员":1; case "指挥":2; case "伴奏":3; default:0 } */
function getPosition(position) {
  switch (position) {
    case '正式队员':
      return 0
    case '预备队员':
      return 1
    case '指挥':
      return 2
    case '伴奏':
      return 3
    default:
      return 0
  }
}

/* ═══════════════════ 批量上传照片：整批收集器 ═══════════════════
   el-upload 的 before-upload 是**逐个文件**调用的；同一批文件在**同一个 tick** 内
   依次进来（已核对 element-plus 的 uploadFiles：一个同步 for 循环，循环体里没有 await）。
   所以「本批结束了」这件事没有官方事件可用，用 setTimeout(…, 0) 在下一个宏任务里收口 ——
   那时整批的结论已经收集齐了。

   计数口径：只统计「进了 el-upload 的文件」，分三类，
     accepted 通过全部校验、已交给上传
     rejected 被拦下（体积 / 格式 / 匹配不上），要逐条列给用户
     ignored  明显不是照片的杂项（.DS_Store / Thumbs.db / .xlsx / .txt…），只报个数
   三者之和就是本次选中的文件数，所以汇总里能报出「本次共 N 个文件」。 */
let batchAccepted = 0
let batchRejected = []
let batchIgnored = 0
/* 收口的定时器句柄。刻意「先清再设」：即便将来 element-plus 改成异步调用 before-upload，
   也只会把收口推迟到最后一个文件之后，不会重复弹多条。 */
let batchFlushTimer = null

/* ─────────── 第二批收集器：**上传阶段**的失败（网络 / OSS / 落库） ───────────
   【为什么校验的汇总覆盖不了它】上面的收集器在 before-upload 期间就收口了，
   而那时一个字节都还没发出去；上传的成败要等网络回来才知道，是**几秒之后**的事。
   于是它单独一组计数、单独一次收口。

   【不做的后果】批量 50 张遇到断网，.catch 会逐张弹 —— 50 条「上传失败：网络中断」
   糊满屏幕。这与改造前"校验错误刷屏"是同一个毛病，只是发生在后半段。

   计数口径：
     batchUploading  还在飞的张数（`before-upload` 放行一张就 +1，成功或失败都 -1）
     batchUploadFailed 已经失败的那些，等最后一张落地后一次性报出来 */
let batchUploading = 0
let batchUploadFailed = []
/* 覆盖重传的行号（1 起，给用户看的）。**为什么也要收**：重传一整个文件夹时
   每一行都已经有照片了，逐张弹「第 N 行 xxx 的照片已替换」同样是几十条刷屏 ——
   它与「上传失败」是同一个毛病的两种表现，所以一起攒、一起报。 */
let batchUploadReplaced = []
/* 同样「先清再设」。用下标里最后一个完成的那张来触发收口 —— 不必知道整批有几张。 */
let batchSettleTimer = null

/**
 * 多行提示用的 class —— 配合文件末尾那段**非 scoped** 的 CSS，让汇总文案里的 \n 真正换行。
 * 【为什么不能写在 scoped 块里】ElMessage 的节点由 Element Plus 挂到 document.body 下，
 * 已经不在本组件的 DOM 子树里，scoped 生成的 [data-v-xxx] 选择器匹配不到它。
 * 这与 ProgramForm / OrchestraForm 里 qual-error-toast 的处理方式完全一致。
 */
const PHOTO_BATCH_TOAST_CLASS = 'photo-batch-toast'

/** 安排一次收口（先清再设，保证同一批只收口一次） */
function scheduleBatchFlush() {
  if (batchFlushTimer) clearTimeout(batchFlushTimer)
  batchFlushTimer = setTimeout(flushBatchSummary, 0)
}

/** 记一个被拦下的文件：原因要展示给用户，所以逐条留着 */
function rejectInBatch(file, reason) {
  batchRejected.push({ name: file.name, reason })
  scheduleBatchFlush()
}

/**
 * 把本批的结论合成**一条**提示 —— 这是「不再刷屏」的实现点。
 *
 * 【改造前】每个文件各自 ElMessage.error 一次：50 个不合格 = 50 条红字同时堆叠，
 * 每条停留 3 秒且内容各不相同（Element Plus 默认 grouping:false、不限条数），
 * 屏幕被铺满，用户既看不清也来不及看。
 * 【改造后】无论多少个文件被拦，都只有这一条。
 *
 * 【全绿时也给一句】批量上传没有任何进度反馈，点完按钮若一个字都不冒，用户会以为
 * 没点到；给一条 success 是最低成本的确认。
 *
 * 【最多列 3 条】提示太长会超出屏幕高度、也没人读；剩下的用"另有 N 个"带过，
 * 关键信息（数量 + 原因种类）已经给到了。
 */
function flushBatchSummary() {
  batchFlushTimer = null

  const accepted = batchAccepted
  const ignored = batchIgnored
  const rejected = batchRejected
  // 【先复位再组装】下面会 return 或弹提示，复位放晚了会污染下一批的计数
  batchAccepted = 0
  batchIgnored = 0
  batchRejected = []

  const total = accepted + ignored + rejected.length
  // 空文件夹走不到这里（一个文件都没进 el-upload，before-upload 一次都不调），只是兜底
  if (total === 0) return

  // 全绿：只报一句，够确认"点了有反应"就行
  if (rejected.length === 0 && ignored === 0) {
    return ElMessage.success(`已开始上传 ${accepted} 张照片`)
  }

  const lines = [`本次共 ${total} 个文件，${accepted} 张已开始上传`]
  rejected.slice(0, 3).forEach((r) => lines.push(`· ${r.name} —— ${r.reason}`))
  if (rejected.length > 3) lines.push(`· …另有 ${rejected.length - 3} 个文件未通过校验`)
  if (ignored > 0) lines.push(`· 另有 ${ignored} 个非照片文件已跳过（如 .DS_Store、.xlsx）`)

  ElMessage.warning({
    message: lines.join('\n'),
    customClass: PHOTO_BATCH_TOAST_CLASS,
    duration: 8000, // 比默认 3 秒长：多行内容需要时间读
    showClose: true // 给一个手动关掉的出口，不挡着看表格
  })
}

/**
 * 一张照片的**上传阶段**结束了（成功或失败都会走到这里）。
 *
 * 【为什么要 -1 到 0 才算完】上传是并发的，无法预知"最后一张"是哪一张，
 * 所以用一个计数器：放行时 +1，落地时 -1，归零即整批结束。
 * 失败的原因先攒着，等到 0 才一次性报 —— 这就是「不再逐张弹」的实现点。
 *
 * 【为什么记账放在 .finally 之外、由调用方调】见 uploadFileBatch 的说明：
 * 那里用 .finally() 保证**成功、失败、代码抛异常**三条路径都恰好调一次，
 * 计数不会漏减也不会双减（漏减 = 汇总永远不出；双减 = 提前出、数量不对）。
 */
function settleUpload() {
  batchUploading -= 1
  if (batchUploading > 0) return

  /* 归零。同样「先清再设」—— 若同一刻有多张同时落地，
     后到的那次会把定时器重置，最终只在 0 毫秒后收一次口。 */
  if (batchSettleTimer) clearTimeout(batchSettleTimer)
  batchSettleTimer = setTimeout(flushUploadSettle, 0)
}

/**
 * 把本批**上传阶段**的结果合成提示（失败 + 覆盖重传）。
 *
 * 【与上面 flushBatchSummary 的关系】那条报的是「哪些文件没通过校验、根本没开始传」，
 * 这条报的是「已经开传的那些结果如何」。两条互斥、不重复：
 * 一条消息里的名字，不会在另一条里再出现。
 *
 * 【全成功且没有覆盖时一声不吭】校验那条已经报过「已开始上传 N 张照片」了，
 * 成功再报一遍是噪音 —— 所以这里没有"值得说的事"就直接返回。
 *
 * 【为什么失败用 error、覆盖用 success】两件事性质相反，混在一条里会让人以为
 * 覆盖也是错的。分成两条最坏情况也只有 2 条，不会刷屏。
 */
function flushUploadSettle() {
  batchSettleTimer = null

  const failed = batchUploadFailed
  const replaced = batchUploadReplaced
  // 先复位再组装，理由同 flushBatchSummary
  batchUploadFailed = []
  batchUploadReplaced = []

  if (failed.length === 0 && replaced.length === 0) return

  /* 有失败 → 一条 error。覆盖重传不再单独弹，只在末尾带一句数量，
     否则一次重传几十张又是几十条。 */
  if (failed.length > 0) {
    const lines = [`有 ${failed.length} 张照片上传失败`]
    // 与校验汇总同一个节流口径：最多列 3 条，剩下的报个数。太多没人读、也超出屏高。
    failed.slice(0, 3).forEach((r) => lines.push(`· ${r.name} —— ${r.reason}`))
    if (failed.length > 3) lines.push(`· …另有 ${failed.length - 3} 张失败，请重试`)
    if (replaced.length > 0) lines.push(`· 另有 ${replaced.length} 张是覆盖重传，已替换原照片`)

    return ElMessage.error({
      message: lines.join('\n'),
      // 复用同一个 class：非 scoped 的换行样式是通用的，不必再加一条 CSS
      customClass: PHOTO_BATCH_TOAST_CLASS,
      // 报错比警告更要紧，给更长的停留时间
      duration: 10000,
      showClose: true
    })
  }

  /* 没有失败、只有覆盖 → 一条 success。
     这件事必须让用户看见：重传整个文件夹时可能**覆盖掉别人已有的照片**，
     一声不吭的话他没机会发现传错了。行号最多列 3 个，60 人的队伍全列会把提示撑爆。 */
  const shown = replaced.slice(0, 3).join('、')
  /* 「行」字只能出现一次，所以它放在 tail 里、不在模板里 —— 否则 >3 时会拼成
     「第 1、2、3 等 50 行 行」。（这个重复是拿真值跑出来才看见的，不是推理出来的。） */
  const tail = replaced.length > 3 ? ` 等 ${replaced.length} 行` : ' 行'
  ElMessage.success({
    message: `已覆盖重传 ${replaced.length} 张照片（第 ${shown}${tail}）`,
    customClass: PHOTO_BATCH_TOAST_CLASS,
    duration: 8000,
    showClose: true
  })
}

/** 照片扩展名白名单（只用于把"明显不是照片"的杂项挡在门外，见 beforeUploadBatch ①） */
const PHOTO_EXT = ['jpg', 'jpeg', 'png', 'heic', 'heif', 'tif', 'tiff', 'bmp', 'webp']

/**
 * 【批量上传照片】的前置校验 —— el-upload 对**每个**选中的文件调一次，
 * 返回 false 就把该文件丢掉（不发请求、不落库）。
 *
 * 【本轮改造的核心：把「匹配」从上传后提到上传前】
 *   老流程：文件名 ──宽松正则猜类别──▶ [上传 + 落库] ──再按 card/name 找人──▶ 报错
 *   新流程：文件名 ──与每一行的期望名全等比较──▶ 命中唯一一行 ──▶ [上传 + 落库]
 *                                          └─ 0 个 / ≥2 个 ──▶ 在这里就拦下
 *
 * 一步之差，四个毛病一起没了：
 *   · `IMG_20240927_113045.jpg` 不再被误判成教师照片 —— 它不会全等于任何一行的
 *     期望名，报错文案准确，而且**不会被上传**（老流程里它会被传上去再报
 *     「未找到匹配的教师」）
 *   · 「表里没这个人」不再产生孤儿文件 —— 上传前就知道了，一个请求都不发
 *   · 「身份证后6位重复」「该行身份证没填」同样在上传前拦下
 *   · 与单张路径用的是同一份匹配算法（matchPhotoToRows），口径不会再漂移
 *
 * 【为什么不能改共用的 beforeUpload】usePhotoUpload.js 里那个 beforeUpload 是
 * 参演人员表与指导教师表**共用的一份实现**（该文件头说明了理由：100KB / JPG /
 * 命名规则「改一次要两张表同时生效」）。教师表没开文件夹上传，也没有按行匹配的能力，
 * 那边维持原样就好。所以这一层只包在本文件里。
 *
 * @param {File} file el-upload 逐个递进来的原始文件（不是 uploadFile 包装对象）
 * @returns {boolean} true = 放行去上传；false = 丢弃
 */
function beforeUploadBatch(file) {
  /* ① 杂项过滤：文件夹里的 .DS_Store / Thumbs.db / .xlsx / .txt 等。
     加了 directory 之后 accept="image/jpeg" 会被浏览器忽略（选文件夹时无法按类型
     过滤），这些杂项会全部进来。
     处理方式是「静默丢弃 + 只计数」：它们不是"错误"，弹红字反而让人以为出问题了；
     但完全不提又让人怀疑"是不是压根没读到"。折中 —— 汇总里报一个数。
     【判据：宁可漏放、不可错杀】只要**有可能是照片**就放进去让基础闸给准确结论：
       · 123456.JPG    → type 是 image/jpeg  → 放行
       · IMG_1234.HEIC → type 是 image/heic  → 放行 → 由基础闸报「照片格式只能是JPG」。
         **必须让用户看到**：静默跳掉的话，用户会以为 HEIC 已经传上去了
       · 报名表.xlsx    → 非 image/*，扩展名不在白名单 → 跳过
       · .DS_Store     → type 是空串，扩展名不在白名单 → 跳过 */
  const dot = file.name.lastIndexOf('.')
  const ext = dot === -1 ? '' : file.name.substring(dot + 1).toLowerCase()
  const isImageMime = !!file.type && file.type.indexOf('image/') === 0
  if (!isImageMime && !PHOTO_EXT.includes(ext)) {
    batchIgnored += 1
    scheduleBatchFlush()
    return false
  }

  /* ② 基础闸：体积 + 格式。用共用模块里的 checkPhotoBasic —— 规则只有一份，
     区别只是它不弹提示、把结论交回给我们统一汇总。 */
  const basic = checkPhotoBasic(file)
  if (!basic.ok) {
    rejectInBatch(file, basic.reason)
    return false
  }

  /* ③ 匹配闸：文件名必须**全等**于某一行的期望文件名。
     这一步以前在上传落库之后才做，是误判和孤儿文件的共同来源，现在提到这里。 */
  const nameNoExt = file.name.substring(0, file.name.lastIndexOf('.'))
  const m = matchPhotoToRows(nameNoExt, data.value)

  if (m.status === 'none') {
    // 报错时把"表里期望的文件名"举几个例子 —— 比一句"未找到匹配"有用得多。
    // 最多举 3 个：60 人的队伍全列出来会把提示撑爆。
    const sample = m.expected.slice(0, 3).join('、')
    const hint = m.expected.length
      ? `表里期望的文件名如：${sample}${m.expected.length > 3 ? ' 等' : ''}`
      : '名单里还没有填好身份证号'
    rejectInBatch(file, `文件名对不上任何人（${hint}）`)
    return false
  }

  if (m.status === 'multi') {
    rejectInBatch(
      file,
      `有 ${m.hits.length} 行都匹配到（第 ${m.hits.map((i) => i + 1).join('、')} 行），请改用「上传照片」按行单独上传`
    )
    return false
  }

  // ④ 通过 —— 交给 el-upload 走 :http-request="uploadFileBatch"
  batchAccepted += 1
  scheduleBatchFlush()
  return true
}

/**
 * 【空文件夹提示】挂在模板里 <div class="options"> 上的原生 change 监听。
 *
 * 【为什么不能挂在 el-upload 上】el-upload 把 `onChange` 声明成了 **prop**
 * （element-plus upload.mjs 的 `onChange: { type: Function, default: NOOP }`），
 * 所以写在组件上的 @change 会被当成那个 prop 消化掉，**不会**有原生监听挂到根元素上；
 * 而 EP 内部只在「文件状态变化」时调用它 —— 空文件夹时 uploadFiles 在
 * `if (files.length === 0) return` 就返回了，一次状态变化都没有，那个 prop
 * 从头到尾不会被调用。结论：靠 el-upload 的 @change 拿不到"选了空文件夹"这个事实
 * （但这个原生 change 事件**是触发的**，只是被 EP 吞了，所以从祖先上监听能收到）。
 *
 * 【怎么认出是哪一个 input】.options 里有三个文件 input（Excel 导入、批量照片、
 * 隐藏的单张上传），只有「批量上传照片」那个开了目录选择，所以用 webkitdirectory 判别。
 * 属性与 DOM 属性两种写法都判，是因为 Vue 在浏览器认识这个属性时把它设成 DOM 属性
 * （此时 hasAttribute 可能为 false），不认识时退化成设 HTML 属性。
 *
 * 【触发时机】空文件夹 → 只有这一条提示；非空 → 直接返回，走上面的正常批量流程。
 */
function onFileInputChange(e) {
  const input = e.target
  if (!input || input.type !== 'file') return
  if (input.webkitdirectory !== true && !input.hasAttribute('webkitdirectory')) return
  if (input.files && input.files.length > 0) return
  ElMessage.warning('文件夹里没有找到照片，请确认选中的文件夹里有照片')
}

/*
 * 【第十二届改造·第二轮】上传通道由七牛直传换成阿里云 OSS（biz: image）。
 * 原来是 `:on-success` 回调 uploadSuccess / uploadSuccessBatch，现在改为
 * `:http-request` 调统一上传服务，成功后的落库与回写逻辑逐字保留：
 *   - 单张：fileApi.saveFileInfo({filename,type,size,url}) → body.code===0 时写 head
 *   - 批量：同上，再按「学生=身份证后6位、教师=姓名+身份证后6位」匹配到行
 *
 * 【为什么处理器不返回 Promise】Element Plus 只在 httpRequest 返回 Promise 时才跑
 * 自己那套内部成功路径（往 fileList 里塞条目），本组件靠 :show-file-list="false"
 * 不显示列表，返回非 Promise 让行为完全由 .then 控制。
 *
 * 【第十二届·第三轮】单张的 uploadFileSingle 已搬到 usePhotoUpload（与教师表共用）；
 * 下面只留批量这一路 —— 它唯一被这张表用到。
 */

/**
 * dist 原文见 git 历史：uploadSuccessBatch(e,t){ n.filename=t.name, ... }
 *
 * 【本轮改造】匹配改走 matchPhotoToRows —— 与上传前那道校验用的是**同一个函数**，
 * 于是这里只剩「上传 → 落库 → 写字」三件事，匹配规则不再有第二份实现，不会漂移。
 *
 * 【为什么落库之后还要再匹配一次】上传是异步的，从"选中文件夹"到"这一张传完"之间，
 * 用户完全可能改了表（删行、改身份证、改身份）。以**此刻**的表为准，才不会把照片
 * 写到一行已经变了意思的行上。
 * 正常情况下这一步必然命中唯一一行 —— 上传前的 beforeUploadBatch 已经确认过它唯一；
 * 走到 none / multi 只可能是上传期间表被改动了，按"匹配失败"如实报告，不猜。
 *
 * 【本轮新增：不再逐张弹】以前这里是逐张 ElMessage.error / success ——
 * 批量 50 张遇到断网就是 50 条红字，重传一整个文件夹就是 50 条绿字，
 * 与"校验错误刷屏"是同一个毛病，只是发生在后半段。现在改成：
 * 失败 push 进 batchUploadFailed、覆盖 push 进 batchUploadReplaced，
 * 由 settleUpload 在**最后一张落地后**各合成一条（见 flushUploadSettle）。
 *
 * 【.finally(settleUpload) 为什么必须放最后】它保证「传成功、传失败、代码抛异常」
 * 三条路径都恰好调一次 settleUpload：少调 = 计数减不到 0、汇总永远不出；
 * 多调 = 提前归零、条数不对。
 * 配套的一处必要改动：里面那个 fileApi.saveFileInfo(...) 前面**补了 return**。
 * 原因是原来没 return，内层 Promise 游离在链外 —— 它在 .finally 跑完之后才结束，
 * 计数会提前归零；而且它 reject 时外层的 .catch 根本收不到，属于静默失败。
 */
function uploadFileBatch(options) {
  const file = options.file

  // 放行一张就 +1，与下面的 .finally 里的 -1 成对（before-upload 通过 ⇒ 这里必被调用）
  batchUploading += 1

  uploadToOss({ file, biz: 'image' })
    .then(({ url }) => {
      const info = {}
      info.filename = file.name
      info.type = file.type
      info.size = file.size
      info.url = url

      // 【return 不能省】把内层链交给外层：这样它的失败会走到下面的 .catch，
      // 也会被 .finally 正确等待（理由见函数头上那一段）。
      return fileApi.saveFileInfo(info).then(({ data: body }) => {
        /* 落库失败。以前这里是 ElMessage.error('文件上传失败') 逐张弹；
           改成 throw 交给统一的 .catch 收进汇总 —— 文案不变，只是不再刷屏。 */
        if (body.code !== 0) throw new Error('文件上传失败（落库未通过）')

        const nameNoExt = file.name.substring(0, file.name.lastIndexOf('.'))
        const m = matchPhotoToRows(nameNoExt, data.value)

        /* 唯一命中才写。走到这里说明表在上传期间被改动了：
           报出来、**不写**（写进"大概是对的那行"就是传错人，比不写更糟）。 */
        if (m.status !== 'ok') {
          throw new Error(
            m.status === 'multi'
              ? '已上传但表里有多行与它同名，请改用「上传照片」按行单独上传'
              : '已上传但表里没有与它对应的行了（可能被删除或改过姓名/身份证）'
          )
        }

        const i = m.hits[0]
        const target = data.value[i]
        /* 【为什么 target 一定存在】i 是 matchPhotoToRows 对**同一个** data.value
           同步遍历得出的下标，两条语句之间没有 await，数组不可能变。 */
        /* 重传覆盖是正常路径（换照片），但要让「覆盖了别人」变得可见 ——
           以前这里逐张 ElMessage.success，重传整个文件夹就是几十条；
           现在只记下行号（1 起，给用户看的），由 flushUploadSettle 合成一条。 */
        if (target.head) batchUploadReplaced.push(i + 1)
        target.head = info.url
      })
    })
    .catch((err) => {
      /* 只记账，不弹。err.shown === true 表示"这条错误已经被全局拦截器弹过了"，
         那种情况下连账都不用记（用户已经看到过一次，再汇总一遍是重复）。
         本仓库 img 走的是后端代传通道（无拦截器），所以实际几乎总是 shown:false。 */
      if (err && err.shown) return
      batchUploadFailed.push({
        name: file.name,
        reason: (err && err.message) || '文件上传失败'
      })
    })
    // 无论成功、失败还是抛异常，都恰好结算一次（见函数头对该顺序的说明）
    .finally(settleUpload)
}

/* 【第十二届改造·第二轮】getQiniuToken() 已删除。
   dist: getQiniuToken(){ $api.communal.getQiNiuToken().then(...) }
   它原来只在 onMounted 里被调用一次，用途是把七牛 uptoken 填进 QiniuData.token。
   改走阿里云 OSS 后凭证由 @/services/ossUpload 在真正要上传时才取，挂载时预取没有必要。 */

defineExpose({ getData, getCacheData })
</script>

<style lang="scss" scoped>
/* 【第十二届·第三轮】@use 必须是 style 块里的第一条语句（Sass 语法要求），
   所以它排在下面那条 dist 注释之前。引用的是与指导教师表共用的占位块样式。 */
@use '../../styles/photo-cell.css';

/* dist/css/chunk-0294a80a.260c9e35.css 中 [data-v-5568d648] 的全部 10 条规则 */
.container {
  margin-bottom: 10px;
}

.box {
  overflow-x: auto;
  text-align: center;
}

/* 【列宽依据 —— 与 TeacherTable.vue 总宽恒等，且任何宽度下都不截断文字】
 *
 * 用户要求：「指导老师和参展人员的框大小和宽度保持一致……
 * 里面的字（如 placeholder="请输入姓名"）要看得完整……现在是教师的要短一点」。
 *
 * 【先更正一条旧注释里的错误测量】上一版这里写「1440 屏下容器实测 1404px」，
 * 是错的：1440 视口下侧栏 200px、el-main 左右 padding 40px、.bg4 左右 padding 20px，
 * 留给 .box 的实宽只有 1180px（已在浏览器里按真实布局链重量过）。
 * 1404px 对应的是 1680 视口。旧值合计 1382px 在 1440 屏下其实**是横向滚动的**，
 * 操作列的 sticky 遮盖问题也并未真正消除。
 *
 * 现在改用 minmax(下限px, 权重fr)，两条要求各由一半保证：
 *   ① 全部轨道都是 fr → 永远把 .box 铺满；两表的 .box 同宽，
 *      所以任何分辨率下两表总宽都严格相等；
 *   ② 下限 = 该列内容一个不落所需的最小列宽，窗口再窄也不截断。
 *      旧值 96px 的姓名列留给输入框只有 61px，装不下 70px 宽的「请输入姓名」；
 *      72px 的性别列只剩 15px，连「请选择」都看不全。现在都不会了。
 *
 * 下限怎么来的（浏览器实测，不是估的）：
 *   列宽下限 = 文本宽 + .box-col 左右 padding 5×2 + 左边框 1 + 控件自身 chrome
 *   · 输入框 chrome：.el-input__wrapper 的 padding 1px 11px → 22px
 *   · 下拉框 chrome：.el-select__wrapper 的 padding 12×2 + gap 6 + 箭头 14 → 44px
 *   · 文本宽：14px 字号下中文一字 14px；使用乐器「次中音萨克斯」84px
 *     【2026-09-28】身份证列原按「18 位号码约 145px」定 178px；现字段改为后 6 位，
 *     内容与表头（「身份证后6位」84px）都远低于该下限，本列留白变多。
 *     【2026-09-28 第二次】这份留白本次借给年龄列 14px，见下一段「年龄列为什么加宽」。
 *   12 列下限合计 1376px ≤ 旧值 1382px，窄屏不会比改动前更容易横向滚动。
 *
 * 【年龄列为什么加宽：105 → 119px】
 *   按上面的公式，年龄列下限 = 「请输入年龄」5 字 70px + 11 + 22 = 103，取 105 ——
 *   与姓名列同值，理论上恰好放下（该列留 2px 余量）。但年龄这一格是
 *   `<el-input type="number">`：Chrome 在获得焦点/悬停时会画出原生数字微调箭头，
 *   那约 15px 是**从输入框内容区里扣的**，于是聚焦时留给 placeholder 的只剩
 *   72 − 15 ≈ 57px，装不下 70px，右半截被裁 —— 用户报的就是「点进去输入年龄，
 *   里面的字看不全」。姓名列同为 105px 却没有箭头，所以不受影响。
 *   加宽到 119px 后，聚焦时仍有 86 − 15 = 71px ≥ 70px。
 *   这 14px 从身份证列借（178 → 164），身份证列仍远超它实际需要的 117px（84 + 11 + 22）。
 *   **12 列下限合计仍是 1376px**，窄屏横向滚动范围与改动前完全一致。
 *   TeacherTable.vue 有一列同名、同值、同症状，两表必须同步改，否则总宽不再相等。
 *
 * fr 权重怎么定：**数值 = 参照容器 1660px 时希望该列得到的像素宽 ÷ 100**。
 *   1660px 是目前最常见的 1920 屏下 .box 的实宽（1440 视口同式得 1180）。
 *   权重和 16.60 恰好 = 参照容器 ÷ 100，所以 1660px 下每条轨道就等于设计值。
 *   实测：1660px → 55/144/194/112/119/239/154/112/121/164/78/168；
 *   1180px（1440 屏）→ 30/105/178/99/105/136/99/99/113/141/72/168；
 *   3420px（4K）同样不截断。
 *
 * 【为什么不跟 TeacherTable 的前 7 列逐列对齐】
 *   两表列数不同（12 列 vs 8 列），「总宽相等」与「前 7 列逐列对齐」数学上不可兼得 ——
 *   若强行对齐，TeacherTable 凑满本表宽度后多出的 500 多 px 只能全塞进「操作」一列。
 *   用户这次明确要的是「两个表的长度宽度都要一致」，所以取等宽、放弃逐列对齐。
 *   改这里的任一个 fr 权重，必须同步改 TeacherTable.vue 的对应权重，
 *   否则两张表的总宽不再相等（这是本轮唯一需要两个文件同步的地方）。 */
.box-line-title,
.box-line {
  display: grid;
  /*                     序号        姓名         身份证号      性别        年龄         学校名称      联系电话      身份        角色         使用乐器      电子照片      操作 */
  /* 身份证 178 → 164、年龄 105 → 119：借 14px，合计仍是 1376px。见上方「年龄列为什么加宽」 */
  grid-template-columns:
    minmax(30px, 1.00fr) minmax(105px, 1.45fr) minmax(164px, 1.95fr) minmax(99px, 1.12fr)
    minmax(119px, 1.20fr) minmax(133px, 2.40fr) minmax(133px, 1.55fr) minmax(99px, 1.12fr)
    minmax(113px, 1.22fr) minmax(141px, 1.65fr) minmax(72px, 0.78fr) minmax(168px, 1.61fr);
  justify-content: stretch;
}

/* padding 6px → 5px：每列给文字区让出 2px，12 列合计 24px 的下限余量（见上）。
 * display:flex + 居中与 TeacherTable 的 .box-col 保持一致。 */
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

.sticky-column {
  position: sticky;
  right: 0;
  background-color: #fff;
  z-index: 10;
  border-right: 1px solid #ddd;
}

/* 【电子照片占位遮罩】的样式已抽到 src/styles/photo-cell.css，与指导教师表共用一份。
   引入方式见本 style 块第 2 行（@use 必须在其它规则之前）。 */

/* 「下载模板 / 批量导入 / 添加一行 / 清空 / 批量上传头像」这一排按钮。
   它们分散在 Upload 根 / UploadContent / 内层 Upload 三种容器里，改前实测间距是
   0 / 8 / 8 / 10px，且「批量导入」「批量上传头像」比中间三个高 1.2px —— 前者因为在
   inline-flex 的 UploadContent 里，后者因为 el-button 的相邻 margin-left 只对相邻兄弟生效。
   现在由 .import-bar 的 flex + gap:8px 统一发间距、align-items:center 对齐基线，
   所以必须把 el-button 自带的相邻 margin-left:8px 清掉，否则会变成 8+8=16px。 */
.import-bar > .el-button {
  margin-left: 0;
}
</style>

<!--
  批量上传照片「整批汇总」提示的换行样式。
  【为什么故意不加 scoped】ElMessage 的节点由 Element Plus 挂到 document.body 下，
  已经不在本组件的 DOM 子树里，scoped 生成的 [data-v-xxx] 选择器匹配不到它。
  不加 scoped 但把选择器限定在这个专属类名下，作用范围就只有这条提示本身，
  不会波及页面上的其他元素（这与 ProgramForm / OrchestraForm 里 qual-error-toast
  那段完全同名同类，是仓库里已有的做法）。
  【white-space: pre-line】汇总文案是用 \n 拼的多行，HTML 默认会把 \n 渲染成空格，
  pre-line 保留换行、同时折叠多余空格，正是需要的效果。
-->
<style lang="scss">
.photo-batch-toast .el-message__content {
  white-space: pre-line;
  line-height: 1.7; // 多条时给点行距，否则挤成一坨看不清是几条
}
</style>
