<template>
  <div class="bg">
    <p class="title">{{ cfg.title }}</p>

    <div class="my-form">
      <el-form
        ref="formRef"
        :model="form"
        label-position="left"
        :rules="rules"
        label-width="120px"
        size="mini"
      >
        <div class="bg1">
          <!-- ============ 第 1 行：乐团名称 / 类型 ============ -->
          <el-row :gutter="40">
            <el-col :span="12">
              <el-form-item label="乐团名称" prop="choir_name">
                <el-input v-model="form.choir_name" placeholder="请输入乐团名称" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="类型" prop="establishment">
                <el-select v-model="form.establishment" style="width: 100%" placeholder="请选择">
                  <el-option
                    v-for="opt in cfg.establishmentOptions"
                    :key="opt"
                    :label="opt"
                    :value="opt"
                  />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <!-- ============ 第 2 行：自选曲目 /（可选）指定曲目 ============ -->
          <el-row :gutter="40">
            <el-col :span="12">
              <el-form-item label="自选曲目" prop="name">
                <el-input v-model="form.name" placeholder="自选曲目" />
              </el-form-item>
            </el-col>
            <!--
              【变体】只有 5e02（/city/elementary/create）的「指定曲目」带
              `v-if="'管乐团'===form.establishment"`；3d27 / 30d4 / 0b72 三个模块里
              这个 el-col 是无条件渲染的（dist 渲染函数里没有 e._e() 分支）。
              由 cfg.name1VIf 控制。
            -->
            <el-col v-if="!cfg.name1VIf || form.establishment === '管乐团'" :span="12">
              <el-form-item label="指定曲目" prop="name1">
                <el-input v-model="form.name1" placeholder="指定曲目" />
              </el-form-item>
            </el-col>
          </el-row>

          <!-- ============ 第 3 行：参演组别 / 作品总时长 ============ -->
          <el-row :gutter="40">
            <el-col :span="12">
              <el-form-item label="参演组别" prop="group">
                <el-select v-model="form.group" style="width: 100%" placeholder="参赛组别选择">
                  <el-option
                    v-for="opt in groupOptionsForCurrent()"
                    :key="opt"
                    :label="opt"
                    :value="opt"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="作品总时长" prop="minute">
                <el-col :span="5" style="padding-left: 0; padding-right: 0">
                  <el-input
                    v-model="form.minute"
                    type="number"
                    oninput="value=value.replace(/\D|^-1/g,'')"
                  />
                </el-col>
                <el-col :span="1" style="padding-left: 10px; padding-right: 30px">
                  <span>分</span>
                </el-col>
                <el-col :span="5" style="padding-left: 0; padding-right: 0">
                  <el-input
                    ref="secondRef"
                    v-model="form.second"
                    type="number"
                    oninput="value=value.replace(/\D|^-1/g,'')"
                  />
                </el-col>
                <el-col :span="1" style="padding-left: 10px; padding-right: 30px">
                  <span>秒</span>
                </el-col>
              </el-form-item>
            </el-col>
          </el-row>

          <!-- ============ 第 4 行：参展学校名称 / 领队姓名 ============ -->
          <el-row :gutter="40">
            <el-col :span="12">
              <el-form-item label="参展学校名称" prop="school_name">
                <el-input v-model="form.school_name" placeholder="请填写学校全称" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="领队姓名" prop="contact_name">
                <el-input v-model="form.contact_name" placeholder="填写领队姓名即可" />
              </el-form-item>
            </el-col>
          </el-row>

          <!-- ============ 第 5 行：领队电话 / 联系地址 ============ -->
          <el-row :gutter="40">
            <el-col :span="12">
              <el-form-item label="领队电话" prop="contact_phone">
                <el-input v-model="form.contact_phone" placeholder="请输入手机号码" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="联系地址" prop="contact_way">
                <el-input v-model="form.contact_way" placeholder="请输入详细地址" />
              </el-form-item>
            </el-col>
          </el-row>
        </div>

        <!-- ============ 乐团简介 + 乐团集体电子照 ============ -->
        <div class="bg2">
          <el-row :gutter="40">
            <el-col :span="12">
              <el-form-item label="乐团简介" prop="desc">
                <el-input
                  v-model="form.desc"
                  type="textarea"
                  placeholder="请输入内容"
                  maxlength="300"
                  show-word-limit
                  rows="15"
                />
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="乐团集体电子照">
            <el-upload
              class="upload-demo"
              drag
              :limit="1"
              :data="QiniuData"
              v-model:file-list="fileList1"
              :before-upload="beforeUpload1"
              :on-remove="handleRemove1"
              :http-request="uploadFile1"
              :action="domain"
              :on-exceed="handleExceed"
              :on-success="uploadSuccess1"
            >
              <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
              <div class="el-upload__text">将文件拖到此处，或<em>点击上传</em></div>
              <template #tip>
                <div class="el-upload__tip">
                  <!--
                    【第十二届改造】红头文件要求：
                      - 分辨率不低于 600dpi
                      - JPEG 或 TIFF 格式
                      - 用于制作秩序册
                    原 dist 提示有 typo「JEPG」，已订正。
                    600dpi 检测由后端保证；前端无法检测 PDF/JPEG 的 DPI。
                  -->
                  电子照片要求分辨率不低于600dpi、JPEG或TIFF格式（用于制作秩序册）
                </div>
              </template>
            </el-upload>
          </el-form-item>
        </div>

        <!-- ============ 上传视频 ============ -->
        <div class="bg3">
          <el-form-item label="上传视频">
            <el-upload
              class="upload-demo"
              drag
              :limit="1"
              :data="QiniuData"
              v-model:file-list="fileList"
              :before-upload="beforeUpload"
              :on-remove="handleRemove"
              :http-request="uploadFile"
              :action="domain"
              :on-exceed="handleExceed"
              :on-success="uploadSuccess"
            >
              <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
              <div class="el-upload__text">将文件拖到此处，或<em>点击上传</em></div>
              <template #tip>
                <div class="el-upload__tip">
                  视频要求格式为MP4或MOV，大小不超过700M。
                </div>
              </template>
            </el-upload>
          </el-form-item>
        </div>

        <!-- ============ 指导教师 / 参展人员 ============ -->
        <div class="bg4">
          <div style="position: relative">
            <div style="font-size: 16px; font-weight: bold">指导教师</div>
            <p style="font-size: 14px; color: #ff0000">
              请各学校在报名时明确指导教师排名顺序，下方填报顺序将作为最终获奖证书指导教师排名顺序的署名依据，不接受后续调整，请各学校在提交前仔细核对。
            </p>
            <Teacher ref="teacherRef" :showdata="form.teacher" />
            <div style="font-size: 16px; font-weight: bold">参展人员</div>
            <p style="font-size: 14px; color: #ff0000">
              管乐团正式成员不少于35人，不超过65人（报名时可报预备队员5人）；铜管乐团正式成员不少于20人，不超过45人，其中打击乐不超过8人（在报名时可报预备队员3人）。
            </p>
            <Person ref="personRef" :showdata="form.person" />
          </div>
        </div>

        <p style="padding-bottom: 5px; padding-top: 5px; color: red">
          请仔细阅读报名须知，确认无误后勾选报名须知，即可进行报名。
        </p>

        <el-form-item label="报名须知">
          <el-checkbox v-model="form.read" />
          <HaveToRead />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :disabled="!form.read" @click="onSubmit">
            {{ cfg.mode === 'create' ? '立即报名' : '立即修改' }}
          </el-button>
          <el-button v-if="cfg.mode === 'create'" @click="tempSave(true)">暂存</el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>

  <FileCover ref="fileshowRef" />
</template>

<script setup>
/**
 * OrchestraForm —— 「赛事报名 / 报名修改」表单（Create II / Edit II 共 4 条路由共用）
 *
 * ===========================================================================
 * 一、为什么是与 ProgramForm 分开的两个组件
 * ===========================================================================
 * 【dist 已确认】这两族不是同一份实现，是两组不同的 Vue 组件：
 *
 * | | ProgramForm 族（Create I / Edit I，12 路由） | OrchestraForm 族（本组件，4 路由） |
 * |---|---|---|
 * | dist 组件名 | name:"ElementaryCreate" / "ElementaryEdit"（另有 "Student" 等同名者） | **同样**是 name:"ElementaryCreate" / "ElementaryEdit" |
 * | 主字段 | 合唱团名称 / 曲目1 / 曲目2 + 原创·中国作品 radio + 表演人数 + 伴奏形式 | 乐团名称 / **类型** / 自选曲目 /（指定曲目）/ 参演组别 / 时长 / 参展学校名称 / 领队* |
 * | 曲目字段 | name1 + name2，origin1/2、territory1/2（radio） | **只有 name1**，无 name2 / origin / territory |
 * | 乐团简介 | 无 | 有（textarea，maxlength 300，rows 15） |
 * | 上传块 | 曲谱（PDF≤20M）+ 视频 | **乐团集体电子照（JPEG/TIFF≤20MB）** + 视频（MP4/MOV≤700M） |
 * | 红字提示 | 无（仅在视频 tip 里） | 指导教师/参展人员 各有一条 14px #ff0000 的 `<p>` |
 * | 院校/单位字段 | school_name 由「阶段/区县/高校名称」变体决定 | 固定 `参展学校名称` |
 *
 * 注意：**dist 组件名相同（都叫 ElementaryCreate）**，所以不能靠 name 区分；
 * 区分依据是模板结构 —— 本组件的模板里有 `类型`(establishment) / `参演组别`(group) /
 * `乐团简介`(desc) 三个 ProgramForm 完全没有的字段，且没有 曲目2 / 参演人数 / 伴奏形式。
 * 两者唯一的交集是都用 `Teacher`(1607) / `Person`(db6d) / `FileCover`(3aba) / `HaveToRead`。
 *
 * ===========================================================================
 * 二、逐路由差异表（全部来自 dist 原文，未做推断）
 * ===========================================================================
 * | 路由 | dist 模块 | 作用域 id | 标题 | 类型 选项 | 参演组别 选项 | 指定曲目 v-if | getById/update | 提交后 |
 * |---|---|---|---|---|---|---|---|---|
 * | /city/elementary/create   | 5e02 | c01ac1ca | 赛事报名 | 管乐团·铜管乐团 | 小学组·中学组        | **有** | -/city/create   | 跳 /city/elementary/list 报名汇总 |
 * | /school/elementary/create | 3d27 | 6517e16c | 赛事报名 | 管乐团          | 大学组              | 无     | -/school/create | 跳 /school/elementary/list 报名汇总 |
 * | /city/elementary/edit/:id   | 30d4 | 0ce6ffa5 | 报名修改 | 管乐团·铜管乐团 | 小学组·中学组·**大学组** | 无     | city/city   | 无（只提示） |
 * | /school/elementary/edit/:id | 0b72 | a05320c6 | 报名修改 | 管乐团          | 大学组              | 无     | school/school | 无（只提示） |
 *
 * 【注意·非对称】「参演组别」的选项，city 新增是 2 个（小学组/中学组），
 * city 编辑却是 **3 个**（小学组/中学组/大学组）。这是 dist 原文，照搬不改。
 *
 * 【注意·非对称】表单初值只有 **3d27** 带业务默认值：
 *   3d27: form:{read:!1,minute:0,second:0,**group:"大学组",establishment:"管乐团"**,dinner_reservation:[]}
 *   5e02/30d4/0b72: form:{read:!1,minute:0,second:0,dinner_reservation:[]}
 * 已逐模块 grep `form:{...}` 确认，不是推断。
 *
 * ===========================================================================
 * 三、dist 已知缺陷（保持原行为，仅记录，未擅自修复）
 * ===========================================================================
 * 【高·影响用户操作 / 数据】4 个模块的 onSuccess 判定都是 `1===e.code`：
 *     this.$api.<scope>.report.create(i).then(({data:e})=>{ 1===e.code ? Message.error(e.msg) : <成功分支> })
 *   即**只把 code===1 当失败，其余一切 code 都走成功分支**。后端约定是
 *   success→code:0 / failure→code:1（apps/core/services.py:14/:18），所以正常业务下
 *   行为正确；但若接口返回其它 code（例如权限中间件直接 403 并被 axios 放行为 200 时的
 *   非 0/1 code），页面会提示"成功"并清空表单/跳转，而数据其实没写进去。
 *   本组件按 dist 原样使用 `res.code === 1`，不改判据。
 *
 * 【中·影响用户操作】编辑页每打开一次就要重走「指导教师最多3人 / 乐团人数区间」两道人数校验，
 *   而这两个数值来自 `form.teacher` / `form.person`。回填逻辑（getMessage）只在
 *   `i.length>0` 时才写 `this.form.person` / `this.form.teacher`（见下），person 为空时
 *   两个字段保持编辑前的值；配合 `t.person = e`（e 由 teacher 先 push、person 后 push 组成），
 *   空名单提交会把 person 覆盖为空数组。属后端契约内的正常行为，但需知悉。
 *
 * 【中】【本轮已修复】`getMessage()` 里 `this.fileList.push({id:r.file.id,…})` 与
 *   `this.fileList1.push({id:r.spectrum.id,…})` **没有守卫**（不同于 ProgramForm 族
 *   `r.file && r.file.length>0` 的写法），file / spectrum 为 null 时会直接抛
 *   `TypeError: Cannot read properties of null`，整页白屏。已用双跑探针复现过同一处异常。
 *   本轮已加最小必要守卫：r.file && r.file.id != null 才 push，r.spectrum 同理；
 *   未伪造任何占位文件，未改动 onSubmit 提交逻辑，未改变 API 契约。
 *
 * 【低·不可达】4 个模块的 data() 里都声明了 `QiniuData.key:"ylbxt/"`，但
 *   beforeUpload/beforeUpload1 每次都会把它重置为 "ylbxt/" 再累加 rename(name)，
 *   与 ProgramForm 族是同一处「key 累加」写法，此处同样照搬。
 *
 * 【低·死代码】人数统计里的 `0===i.type && i.position` 是一个**求值后丢弃**的表达式
 *   （dist 原文如此，无任何副作用）。本组件按语义等价实现，不写这条空语句，
 *   其余三处副作用（预备队员计数 n++ / 学生计数 t++ / 打击乐计数 r++）逐条保留。
 *
 * 【低·UI】「乐团集体电子照」的提示文案 `电子照片要求解析度为600dpi、JEPG或TIFF格式）`
 *   结尾有一个**孤立的右括号**（「JEPG」也是 TIFF/JPEG 的拼写笔误）。dist 原文，照搬。
 *
 * 【低·UI】`uploadSuccess` / `uploadSuccess1` 是空函数（`(e,t){}`），照搬。
 *
 * 【低】`dinner_reservation:[]` 在表单初值里，但模板中没有任何控件绑定它；
 *   提交时它会随 `JSON.parse(JSON.stringify(this.form))` 一起进 payload，
 *   后端 create_report 会丢弃（不在 Report 的字段集合里）。照搬。
 *
 * ===========================================================================
 * 四、Vue 2 -> Vue 3 / Element UI -> Element Plus 的逐项迁移说明
 * ===========================================================================
 * 1) `this.$set(o,k,v)` -> `o[k]=v`（Vue 3 的 Proxy 响应式不需要 $set，语义等价）。
 * 2) `this.$refs.second.value` -> 直接读 `form.second`。理由与 ProgramForm 完全相同：
 *    Element UI 的 ElInput 用 `value` prop，Element Plus 改名为 `modelValue`，
 *    `$refs.second.value` 会变成 undefined；改读 v-model 绑定的值，取到的值与原版一致。
 * 3) `slot="tip"` -> `<template #tip>`；`:file-list` -> `v-model:file-list`（理由同 ProgramForm）。
 * 4) `<i class="el-icon-upload">` -> `<el-icon class="el-icon--upload"><UploadFilled /></el-icon>`。
 * 5) `beforeDestroy` -> `onBeforeUnmount`；`this.$route` -> `useRoute()`；
 *    `Message/MessageBox` -> `ElMessage/ElMessageBox`；`$refs.form.validate(cb)` -> `formRef.value.validate(cb)`。
 * 6) `getM/getS/getCache/addCache/clearCache` 在 dist 里挂在 Vue.prototype 上，
 *    这里从 @/utils/date、@/utils/auth 具名导入（与 ProgramForm / ShowContent.vue 一致）。
 * 7) dist 的 `openWindow/closeWindow` 是 layout 上的方法（走 vuex tabs 模块），
 *    这里复用项目已有的等价实现 @/composables/useTabs。
 *
 * 【保留未改】`size="mini"`：Element Plus 只认 large/default/small，"mini" 会静默回退，
 * 留到设计系统轮统一处理。
 * 【保留未改】`oninput="value=value.replace(...)"`：dist 原文（在原生 input 上过滤非数字），
 * 与 ProgramForm 保持同一写法，实际效果在浏览器中验证。
 */
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { UploadFilled } from '@element-plus/icons-vue'
import { upload } from 'qiniu-js'

import { cityApi } from '@/api/city'
import { schoolApi } from '@/api/school'
import { fileApi, qiniuApi } from '@/api/misc'
import { addCache, getCache, clearCache } from '@/utils/auth'
import { getM, getS } from '@/utils/date'
import { rename } from '@/utils/excel'
import { useTabs } from '@/composables/useTabs'

// 【第十二届改造】导入人员规则校验
import { validatePersonCount, validateDuration, getPersonStatusText, getDurationLimit } from '@/config/personRules'

import Teacher from './TeacherTable.vue'
import Person from './PersonTable.vue'
import FileCover from '@/components/common/FileCover.vue'
import HaveToRead from '@/components/common/HaveToRead.vue'

const props = defineProps({
  /** 路由路径，用于在 VARIANTS 里选变体；由各路由薄封装页传入 */
  variant: { type: String, required: true }
})

/** dist 里两个作用域各自一个 api 模块；dist 通过 this.$api.<scope>.report.* 访问 */
const MODULES = { city: cityApi, school: schoolApi }

/* =========================================================================
 * 逐路由变体表 —— 本组件的唯一事实来源，每一项都对应 dist 原文
 * ========================================================================= */
const VARIANTS = {
  /* ---------------- 新增（Create II）：5e02 ---------------- */
  '/city/elementary/create': {
    mode: 'create', title: '赛事报名',
    api: { create: 'city' },
    establishmentOptions: ['管乐团', '铜管乐团'],
    groupOptions: ['小学组', '中学组'],
    name1VIf: true,
    formDefaults: {},
    redirect: { path: '/city/elementary/list', label: '报名汇总' }
  },
  /* ---------------- 新增（Create II）：3d27 ---------------- */
  '/school/elementary/create': {
    mode: 'create', title: '赛事报名',
    api: { create: 'school' },
    establishmentOptions: ['管乐团'],
    groupOptions: ['大学组'],
    name1VIf: false,
    // 3d27 独有的业务默认值（5e02/30d4/0b72 都没有），见文件头第二节
    formDefaults: { group: '大学组', establishment: '管乐团' },
    redirect: { path: '/school/elementary/list', label: '报名汇总' }
  },

  /* ---------------- 编辑（Edit II）：30d4 ---------------- */
  '/city/elementary/edit/:id': {
    mode: 'edit', title: '报名修改',
    api: { getById: 'city', update: 'city' },
    establishmentOptions: ['管乐团', '铜管乐团'],
    /*
     * 【第十二届修正】dist 原文是 ['小学组', '中学组', '大学组']，但红头文件第十二届
     * 明确「铜管乐团分为小学组、中学组」（无大学组），因此这里需要按 establishment
     * 联动 group 选项。
     *
     * 实现策略：用函数 `groupOptionsFor(establishment)` 在运行时返回正确列表，
     * 模板调用方式 v-for="opt in groupOptionsFor(form.establishment)"。
     */
    groupOptions: ['小学组', '中学组', '大学组'], // 兼容旧 dist 默认值（实际不用）
    groupOptionsFor: (est) => (est === '铜管乐团' ? ['小学组', '中学组'] : ['小学组', '中学组', '大学组']),
    name1VIf: false,
    formDefaults: {}
  },
  /* ---------------- 编辑（Edit II）：0b72 ---------------- */
  '/school/elementary/edit/:id': {
    mode: 'edit', title: '报名修改',
    api: { getById: 'school', update: 'school' },
    establishmentOptions: ['管乐团'],
    groupOptions: ['大学组'],
    name1VIf: false,
    formDefaults: {}
  }
}

const cfg = VARIANTS[props.variant]

/**
 * 【第十二届改造】按当前 establishment 返回可选的 group 列表。
 *
 * 背景：dist 原文 30d4（city 编辑）的 cfg.groupOptions 是硬编码的
 * ['小学组', '中学组', '大学组']，与红头文件第十二届「铜管乐团无大学组」冲突。
 *
 * 优先级：
 *   1) 若 cfg.groupOptionsFor 存在（即 dist 30d4 这条），按 establishment 联动
 *   2) 否则用 cfg.groupOptions（其余三个变体都是 dist 原文定义死的，无需联动）
 */
function groupOptionsForCurrent() {
  if (typeof cfg.groupOptionsFor === 'function') {
    return cfg.groupOptionsFor(form.value.establishment)
  }
  return cfg.groupOptions
}

const route = useRoute()
const formRef = ref(null)
const teacherRef = ref(null)
const personRef = ref(null)
const fileshowRef = ref(null)
const secondRef = ref(null)

const QiniuData = reactive({ token: '', key: 'ylbxt/' })
const domain = 'https://upload.qiniup.com'
const host = 'https://img.atyth.com/'
const filename = ref('')
const fileList = ref([])
const fileList1 = ref([])

/**
 * dist 的表单初值。三个模块是 {read,minute,second,dinner_reservation}，
 * 只有 3d27 多 group/establishment 两个键（见文件头第二节）。
 * 注意：**没有** group_type / tranches / accompany —— 那些属于 ProgramForm 族。
 */
function makeForm() {
  return {
    read: false,
    minute: 0,
    second: 0,
    dinner_reservation: [],
    ...cfg.formDefaults
  }
}

const form = ref(makeForm())

/* ------------------------- 校验规则 ------------------------- */

/**
 * dist 的曲目名称校验器 `e`，逐字照搬（与 ProgramForm 族的 nameValidator 相同）。
 * dist 原文：`"《"===t.charAt(0)&&"》"===t.charAt(t.length-1)||n(new Error("名称需加《》")), n()`
 * 先 callback(Error) 再 callback()：async-validator 的 callback 只认第一次调用，
 * 所以报错优先、末尾的 callback() 在已报错时是空操作。
 */
function nameValidator(rule, value, callback) {
  if (!(value.charAt(0) === '《' && value.charAt(value.length - 1) === '》')) {
    callback(new Error('名称需加《》'))
  }
  callback()
}

/**
 * 第十二届展示时长校验器
 * 【官方明确 - 第十二届红头文件】
 *   管乐团-小学组 ≤ 12分钟
 *   管乐团-中学组 ≤ 15分钟
 *   管乐团-大学组 ≤ 18分钟
 *   铜管乐团 ≤ 10分钟
 * 
 * 校验顺序：分钟数 → 秒数 → 格式 → 时长限制 → 范围
 */
function minuteValidator(rule, value, callback) {
  const second = form.value.second
  if (value === '') callback(new Error('请输入分钟数'))
  if (second === '') callback(new Error('请输入秒数'))
  if (!/(^[0-9]\d*$)/.test(value)) callback(new Error('分钟数只能是正整数'))
  if (!/(^[0-9]\d*$)/.test(second)) callback(new Error('秒数只能是正整数'))

  // 【第十二届改造】根据乐团类型和组别动态校验时长
  if (form.value.establishment === '管乐团') {
    if (form.value.group === '小学组' && (value > 12 || (12 === Number(value) && second > 0))) {
      callback(new Error('管乐团小学组展示时长须在12分钟以内'))
    }
    if (form.value.group === '中学组' && (value > 15 || (15 === Number(value) && second > 0))) {
      callback(new Error('管乐团中学组展示时长须在15分钟以内'))
    }
    if (form.value.group === '大学组' && (value > 18 || (18 === Number(value) && second > 0))) {
      callback(new Error('管乐团大学组展示时长须在18分钟以内'))
    }
  } else {
    // 铜管乐团 ≤ 10分钟
    if (value > 10 || (10 === Number(value) && second > 0)) {
      callback(new Error('铜管乐团展示时长须在10分钟以内'))
    }
  }

  if (second > 60 || second < 0) callback(new Error('秒数只能在0-60之间'))
  if (value > 60 || value < 0) callback(new Error('分钟数只能在0-60之间'))
  callback()
}

/** 4 个模块的 rules 逐字相同（已 diff 确认），故不需要逐路由变体 */
const rules = reactive({
  choir_name: [
    { required: true, message: '请输入乐团名称', trigger: 'blur' },
    { min: 1, max: 100, message: '长度在 1 到 50 个字符', trigger: 'blur' }
  ],
  group: [{ required: true, message: '请选择组别', trigger: 'blur' }],
  establishment: [{ required: true, message: '请选择类型', trigger: 'blur' }],
  name: [
    { required: true, message: '请输入曲目名称', trigger: 'blur' },
    { min: 1, max: 100, message: '长度在 1 到 100 个字符', trigger: 'blur' },
    { required: true, validator: nameValidator, trigger: 'blur' }
  ],
  name1: [
    { required: true, message: '需填写指定曲目', trigger: 'blur' },
    { min: 1, max: 100, message: '长度在 1 到 100 个字符', trigger: 'blur' },
    { required: true, validator: nameValidator, trigger: 'blur' }
  ],
  contact_name: [
    { required: true, message: '请输入联系人', trigger: 'blur' },
    { min: 1, max: 20, message: '长度在 1 到 20 个字符', trigger: 'blur' }
  ],
  contact_phone: [
    { required: true, message: '请输入联系人电话', trigger: 'blur' },
    { min: 1, max: 20, message: '长度在 1 到 20 个字符', trigger: 'blur' }
  ],
  contact_way: [
    { required: true, message: '请输入联系地址 ', trigger: 'blur' },
    { min: 1, max: 100, message: '长度在 1 到 100 个字符', trigger: 'blur' }
  ],
  minute: [
    { required: true, message: '请输入作品总时长 ', trigger: 'blur' },
    { validator: minuteValidator, trigger: 'blur' }
  ],
  school_name: [
    { required: true, message: '请输入学校名称 ', trigger: 'blur' },
    { min: 1, max: 100, message: '长度在 1 到 100 个字符', trigger: 'blur' }
  ]
})

/** 集体照缺失的提示文案：新增页是「未上传乐团集体照」，编辑页是「未上传集体照」（dist 原文） */
const photoMissingMsg = computed(() =>
  cfg.mode === 'create' ? '未上传乐团集体照' : '未上传集体照'
)

/**
 * 【第十二届改造】当 establishment 变化时，若当前 group 不在新可选列表中，
 * 自动清空 group，让用户重新选择。
 *
 * 例：用户选「铜管乐团」，当前 group=「大学组」 → 清空 group 并触发校验提示。
 * 反之：用户从「铜管乐团」切回「管乐团」时，若 group 是「小学组/中学组」，保留即可。
 */
watch(
  () => form.value.establishment,
  (newEst) => {
    if (!newEst || typeof cfg.groupOptionsFor !== 'function') return
    const allowed = cfg.groupOptionsFor(newEst)
    if (!allowed.includes(form.value.group)) {
      form.value.group = ''
    }
  }
)

/* ------------------------- 上传逻辑（逐行照搬 dist） ------------------------- */

/** dist: getQiniuToken(){ this.$api.communal.getQiNiuToken().then(({data:e})=>{0===e.code?…:…}) } */
function getQiniuToken() {
  qiniuApi.getToken().then(({ data: res }) => {
    if (res.code === 0) QiniuData.token = res.uptoken
    else ElMessage.error(res.msg)
  })
}

/**
 * dist beforeUpload（视频）：MP4/MOV，<700M。
 * 【保留 dist 缺陷】QiniuData.key 是**累加**（先重置为 "ylbxt/" 再 += rename(name)），
 * 与 ProgramForm 族同一处写法，照搬不改。
 */
function beforeUpload(file) {
  if (!QiniuData.token) getQiniuToken()
  QiniuData.key = 'ylbxt/'
  filename.value = file.name
  QiniuData.key += rename(file.name)

  const sizeOk = file.size / 1024 / 1024 < 700
  // 【修复】'video/mov' 不是合法 MIME 类型，浏览器对 .mov 一律上报 video/quicktime，
  // 原写法导致 MOV 视频被无条件拒绝。与 ProgramForm 族保持同一判据。
  const isVideo = file.type === 'video/quicktime' || file.type === 'video/mp4'

  if (!isVideo) {
    ElMessage.error('请上传 MP4 或 MOV 格式的视频文件')
    return false
  }
  if (!sizeOk) {
    ElMessage.error('文件大小不能超过700M')
    return false
  }
  return undefined
}

/** dist beforeUpload1（乐团集体电子照）：JPEG/TIFF，<20MB */
function beforeUpload1(file) {
  if (!QiniuData.token) getQiniuToken()
  QiniuData.key = 'ylbxt/'
  filename.value = file.name
  QiniuData.key += rename(file.name)

  const sizeOk = file.size / 1024 / 1024 < 20
  const isImage = file.type === 'image/jpeg' || file.type === 'image/tiff'

  if (!isImage) {
    ElMessage.error('请上传 JPEG 或 TIFF 文件')
    return false
  }
  if (!sizeOk) {
    ElMessage.error('文件大小不能超过20MB')
    return false
  }
  return undefined
}

/** dist: uploadSuccess(e,t){} / uploadSuccess1(e,t){} —— 空实现，照搬 */
function uploadSuccess() {}
function uploadSuccess1() {}

/**
 * dist uploadFile / uploadFile1 的公共部分（两者除写入的 fileList 外逐字相同）。
 *
 * 【新增页 vs 编辑页的唯一差别】上传成功后是否调用 tempSave()：
 *   5e02 / 3d27（create）：`t.fileList.push(o), t.tempSave(), Message.success("文件上传成功！")`
 *   30d4 / 0b72（edit  ）：`t.fileList.push(o),                   Message.success("文件上传成功！")`
 *   —— 编辑页没有 tempSave 方法（无草稿缓存），故用 cfg.mode 区分。
 *
 * dist 原文在末尾重复调用了第二次 qiniu.upload(...) 且未 subscribe，不产生额外请求，
 * 故这里只保留实际生效的那一次（可观测行为一致，与 ProgramForm 同一处理）。
 */
function doUpload(options, listRef) {
  const file = options.file
  const rawName = options.file.name

  fileshowRef.value.show()

  const observable = upload(file, options.data.key, options.data.token)
  observable.subscribe({
    next(res) {
      fileshowRef.value.setPro(res.total.percent.toFixed(2))
    },
    error(err) {
      ElMessage.error(err)
    },
    complete(res) {
      fileshowRef.value.dishow()
      const info = {}
      const item = {}
      info.filename = filename.value
      info.type = file.type
      info.size = file.size
      info.url = host + res.key
      fileApi.saveFileInfo(info).then(({ data: r }) => {
        if (r.code === 0) {
          item.id = r.data.id
          item.name = rawName
          listRef.value.push(item)
          if (cfg.mode === 'create') tempSave()
          ElMessage.success('文件上传成功！')
        } else {
          ElMessage.error('文件上传失败！')
        }
      })
    }
  })
}

function uploadFile(options) {
  doUpload(options, fileList)
}
function uploadFile1(options) {
  doUpload(options, fileList1)
}

/** dist: handleRemove(e,t){ 按 uid 从 fileList 中 splice 掉 } —— 语义相同，改为非原地过滤 */
function handleRemove(file) {
  fileList.value = fileList.value.filter((f) => f.uid !== file.uid)
}
function handleRemove1(file) {
  fileList1.value = fileList1.value.filter((f) => f.uid !== file.uid)
}

/** dist: handleExceed(e,t){ Message.error("文件数量超过限制！") } */
function handleExceed() {
  ElMessage.error('文件数量超过限制！')
}

/* ------------------------- 草稿缓存（仅新增页） ------------------------- */

/**
 * dist:
 *   tempSave(e=!1){
 *     this.form.person=this.$refs.person.getCacheData(), this.form.teacher=this.$refs.teacher.getCacheData(),
 *     this.form.fileList=this.fileList, this.form.fileList1=this.fileList1,
 *     this.addCache(this.cacheName,this.form), e && Message.success("本地保存成功")
 *   }
 * 编辑页的两个模块里**没有** tempSave 方法（也没有 cacheName / timer）。
 */
function tempSave(showTip = false) {
  form.value.person = personRef.value.getCacheData()
  form.value.teacher = teacherRef.value.getCacheData()
  form.value.fileList = fileList.value
  form.value.fileList1 = fileList1.value
  addCache(cacheName.value, form.value)
  if (showTip) ElMessage.success('本地保存成功')
}

/* ------------------------- 编辑页回填 ------------------------- */

/**
 * dist getMessage()（编辑页专用，逐行照搬）：
 *   getMessage(){
 *     this.$api.<scope>.report.getById(this.$route.params.id).then(e=>{
 *       if(0===e.data.code){
 *         const t=[],n=[],r=e.data.data; this.form=r;
 *         r.time_length>60 ? ($set(form,"minute",getM(r.time_length)), $set(form,"second",getS(r.time_length)))
 *                          : ($set(form,"minute",0), $set(form,"second",r.time_length));
 *         this.fileList=[], this.fileList1=[];
 *         this.fileList.push({id:r.file.id,name:r.file.filename,url:r.file.url});
 *         this.fileList1.push({id:r.spectrum.id,name:r.spectrum.filename,url:r.spectrum.url});
 *         const i=r.person;
 *         i.length>0 && (i.forEach(e=>{ e.person_info={...e.person_info,type:e.type,position:e.position},
 *            1===e.type&&4===e.position ? n.push(e.person_info) : t.push(e.person_info)}),
 *           this.form.person=t, this.form.teacher=n)
 *       } else Message.error(e.data.msg)
 *     })
 *   }
 * 【保留 dist 缺陷】`r.file.id` / `r.spectrum.id` **无守卫**（ProgramForm 族对 file 有守卫），
 *   file / spectrum 为 null 时抛 TypeError 并白屏。见文件头第三节。
 * 【保留 dist 缺陷】person 为空数组时不写 form.person / form.teacher。
 */
function getMessage() {
  const mod = MODULES[cfg.api.getById]
  mod.report.getById(route.params.id).then((res) => {
    if (res.data.code === 0) {
      const persons = []
      const teachers = []
      const r = res.data.data
      form.value = r

      if (r.time_length > 60) {
        form.value.minute = getM(r.time_length)
        form.value.second = getS(r.time_length)
      } else {
        form.value.minute = 0
        form.value.second = r.time_length
      }

      fileList.value = []
      fileList1.value = []
      // 【重建阶段修复 / 防御性修复】dist 原版无守卫：r.file / r.spectrum 为 null 时 r.file.id 直接抛 TypeError 并白屏。
      //   - 保持正常数据下的原行为：有文件就 push、文件列表原样回填。
      //   - 仅当对象缺失时跳过 push，不构造任何伪造的占位文件。
      //   - 不改变 API 契约、不修改 onSubmit 提交逻辑。
      if (r.file && r.file.id != null) {
        fileList.value.push({ id: r.file.id, name: r.file.filename, url: r.file.url })
      }
      if (r.spectrum && r.spectrum.id != null) {
        fileList1.value.push({ id: r.spectrum.id, name: r.spectrum.filename, url: r.spectrum.url })
      }

      const people = r.person
      if (people.length > 0) {
        people.forEach((p) => {
          p.person_info = { ...p.person_info, type: p.type, position: p.position }
          if (p.type === 1 && p.position === 4) teachers.push(p.person_info)
          else persons.push(p.person_info)
        })
        form.value.person = persons
        form.value.teacher = teachers
      }
    } else {
      ElMessage.error(res.data.msg)
    }
  })
}

/* ------------------------- 生命周期 ------------------------- */
const cacheName = ref(null)
let timer = null

// dist 的 openWindow / closeWindow 是 layout 上的方法（走 vuex 的 tabs 模块）。
// 本项目已有等价实现 @/composables/useTabs，语义逐行对齐，直接复用而不另造一套。
const { openWindow, closeWindow } = useTabs()

onMounted(() => {
  if (cfg.mode === 'create') {
    // dist: this.cacheName=this.$route.path; this.form=this.getCache(this.cacheName);
    //       this.form ? (取回 fileList/fileList1) : (重置 form 与 fileList)
    // 注意 dist 传的是 $route.path（不含 :id），编辑页无此逻辑
    cacheName.value = route.path
    const cached = getCache(cacheName.value)
    if (cached) {
      form.value = cached
      fileList.value = cached.fileList ? cached.fileList : []
      fileList1.value = cached.fileList1 ? cached.fileList1 : []
    } else {
      form.value = makeForm()
      fileList.value = []
    }

    if (timer) clearInterval(timer)
    // dist: this.timer=setInterval(()=>{this.tempSave()},6e4) —— 每 60 秒自动暂存
    timer = setInterval(() => {
      tempSave()
    }, 6e4)
  } else {
    getMessage()
  }

  getQiniuToken()
})

// dist: beforeDestroy(){ clearInterval(this.timer) } —— 仅新增页有 beforeDestroy
onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})

/* ------------------------- 提交 ------------------------- */

/**
 * dist onSubmit()，逐行照搬。新增页与编辑页只有两处不同：
 *   1) 集体照缺失文案：「未上传乐团集体照」(create) / 「未上传集体照」(edit)
 *   2) 成功分支：create 清缓存 + 重置 + closeWindow + openWindow；edit 只 Message.success(e.msg)
 *
 * 【与 ProgramForm 族的关键差别】本族的 allPeople 顺序是 **教师在前、人员在后**
 *   （dist：先 `this.form.teacher.forEach(t=>{e.push(t)})`，再 `this.form.person.forEach(...)`），
 *   ProgramForm 族则相反。已按 dist 原样实现。
 */
function onSubmit() {
  formRef.value.validate((valid) => {
    if (!valid) return ElMessage.error('请检查数据完整性！')

    if (!personRef.value.getData() || !teacherRef.value.getData()) return false
    form.value.person = personRef.value.getData()
    form.value.teacher = teacherRef.value.getData()

    if (fileList1.value && fileList1.value.length === 0) {
      return ElMessage.error(photoMissingMsg.value)
    }
    if (fileList.value && fileList.value.length === 0) return ElMessage.error('未上传视频')

    const allPeople = []
    let studentCount = 0
    let reserveCount = 0
    let percussionCount = 0

    if (form.value.teacher && form.value.teacher.length > 0) {
      if (form.value.teacher.length > 3) return ElMessage.error('指导教师最多3人！')
      form.value.teacher.forEach((t) => {
        allPeople.push(t)
      })
    }

    if (form.value.person && form.value.person.length > 0) {
      form.value.person.forEach((p) => {
        allPeople.push(p)
        // dist 原文此处还有一条 `0===i.type && i.position` 的空语句（求值后丢弃），
        // 无副作用，故不实现；其余三处副作用逐条保留：
        if (p.type === 0) {
          if (p.position === 1) reserveCount++
          studentCount++
          if (p.instrument === '打击乐') percussionCount++
        }
      })
    }

    // 【第十二届改造】使用统一的人员规则校验
    const personValidation = validatePersonCount(
      form.value.establishment,
      form.value.group,
      form.value.person || []
    )
    
    if (!personValidation.valid) {
      // 返回第一个错误
      return ElMessage.error(personValidation.errors[0])
    }

    if (form.value.person === undefined) form.value.person = []
    if (form.value.teacher === undefined) form.value.teacher = []

    const t = JSON.parse(JSON.stringify(form.value))
    t.person = allPeople
    t.spectrum = fileList1.value[0].id
    // 【dist 原文】本族**没有** ProgramForm 族那样的 t.file 守卫，直接取 [0].id
    t.file = fileList.value[0].id
    t.time_length = 60 * form.value.minute + parseInt(form.value.second)

    // 【第十二届改造】使用统一的时长校验规则
    const durationValidation = validateDuration(
      form.value.minute,
      form.value.second,
      form.value.establishment,
      form.value.group
    )
    if (!durationValidation.valid) {
      return ElMessage.error(durationValidation.error)
    }

    ElMessageBox.confirm('请仔细核对填写内容，审核通过后将不可修改!', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
      .then(() => {
        const mod = MODULES[cfg.mode === 'create' ? cfg.api.create : cfg.api.update]
        const call = cfg.mode === 'create' ? mod.report.create(t) : mod.report.update(t)

        call.then(({ data: res }) => {
          // 【dist 原文】判据是 `1===e.code`（只把 1 当失败），不是 `0!==code`。见文件头第三节。
          if (res.code === 1) {
            ElMessage.error(res.msg)
          } else if (cfg.mode === 'create') {
            fileList.value = []
            fileList1.value = []
            form.value = {}
            clearCache(route.path)
            form.value.person = []
            form.value.teacher = []
            form.value = makeForm()
            ElMessage.success(res.msg)
            // dist 原文：
            //   this.closeWindow(this.$route.path),
            //   this.openWindow("/<scope>/elementary/list","报名汇总")
            // 两个调用的顺序与目标（路径 + 标签文案）完全一致。
            closeWindow(route.path)
            openWindow(cfg.redirect.path, cfg.redirect.label)
          } else {
            ElMessage.success(res.msg)
          }
        })
      })
      .catch(() => ElMessage.info('已取消'))
  })
}
</script>

<style lang="scss" scoped>
/* 照搬 dist：4 个模块的 scoped 样式逐字节相同（作用域 id 各异：
   c01ac1ca / 6517e16c / 0ce6ffa5 / a05320c6），共 6 条。
   出处例如 chunk-88b4e6f8.9e39c5d5.css 的 [data-v-c01ac1ca]。 */
.bg {
  position: relative;
  background: #fff;
  padding: 10px;
  width: calc(100% - 20px);
  box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
}

@media screen and (min-width: 1500px) {
  .bg {
    width: 70%;
    padding: 10px 20px;
    margin: auto;
  }
}

.title {
  position: relative;
  border-bottom: 1px solid #dcdcdc;
  line-height: 30px;
  padding-left: 20px;
  margin-bottom: 10px;
}

.title:before {
  content: '';
  position: absolute;
  left: 0;
  bottom: 5px;
  width: 3px;
  height: 20px;
  background-color: #036;
}

/* dist 原文有这两条，但本族模板里没有 .request / .title span 节点。
   与 ProgramForm 族的做法一致：原样保留，不做删改。 */
.title span {
  margin-left: 20px;
  color: #8c939d;
}

.request {
  color: #8c939d;
  margin-bottom: 20px;
}
</style>
