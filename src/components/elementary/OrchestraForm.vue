<template>
  <div class="bg">
    <p class="title">{{ cfg.title }}</p>

    <!--
      【§十 步骤 1-3】提交期间必须禁止再次点击提交、禁止继续改表单。
      v-loading 会铺一层遮罩，遮罩本身拦截所有指针事件 —— 一行就把整块表单锁住，
      不用逐控件加 :disabled（那样漏一个就等于没锁，且 20 多个控件容易漏）。
    -->
    <div
      v-loading="draftState.isSubmitting"
      element-loading-text="正在提交，请勿关闭页面……"
      class="my-form"
    >
      <el-form
        ref="formRef"
        :model="form"
        label-position="left"
        :rules="rules"
        label-width="120px"
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
                <el-select
                  v-model="form.establishment"
                  style="width: 100%"
                  placeholder="请选择"
                  @change="onScopeChange"
                >
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

          <!-- ============ 第 2 行：自选曲目 / 指定曲目 ============ -->
          <el-row :gutter="40">
            <el-col :span="12">
              <el-form-item label="自选曲目" prop="name">
                <el-input v-model="form.name" placeholder="自选曲目" />
              </el-form-item>
            </el-col>
            <!--
              【第十二届】管乐团、铜管乐团现场展示曲目均为指定曲目和自选曲目各一首，
              故「指定曲目」在 4 个变体里一律无条件渲染。
            -->
            <el-col :span="12">
              <el-form-item label="指定曲目" prop="name1">
                <el-select
                  v-model="form.name1"
                  style="width: 100%"
                  placeholder="请选择指定曲目"
                  :disabled="!form.establishment || !form.group"
                >
                  <el-option
                    v-for="opt in name1Options"
                    :key="opt"
                    :label="opt"
                    :value="opt"
                  />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <!-- ============ 第 3 行：参演组别 / 作品总时长 ============ -->
          <el-row :gutter="40">
            <el-col :span="12">
              <el-form-item label="参演组别" prop="group">
                <el-select
                  v-model="form.group"
                  style="width: 100%"
                  placeholder="参赛组别选择"
                  @change="onScopeChange"
                >
                  <el-option
                    v-for="opt in cfg.groupOptions"
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
                <el-input v-model="form.contact_phone" placeholder="请输入联系电话（手机号或固定电话）" />
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
              <el-form-item label="乐团集体电子照">
                <el-upload
                  class="upload-demo"
                  drag
                  :limit="1"
                  v-model:file-list="fileList1"
                  :before-upload="beforeUpload1"
                  :on-remove="handleRemove1"
                  :http-request="uploadFile1"
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
                      乐团集体电子照用于制作秩序册，分辨率不低于600dpi，格式为JPEG或TIFF。
                    </div>
                  </template>
                </el-upload>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="上传视频">
                <el-upload
                  class="upload-demo"
                  drag
                  :limit="1"
                  v-model:file-list="fileList"
                  :before-upload="beforeUpload"
                  :on-remove="handleRemove"
                  :http-request="uploadFile"
                  :on-exceed="handleExceed"
                  :on-success="uploadSuccess"
                >
                  <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
                  <div class="el-upload__text">将文件拖到此处，或<em>点击上传</em></div>
                  <template #tip>
                    <div class="el-upload__tip">
                      视频格式为MP4或MOV，大小不超过700MB。
                    </div>
                  </template>
                </el-upload>
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="40">
            <el-col :span="24">
              <el-form-item label="乐团简介" prop="desc">
                <el-input
                  v-model="form.desc"
                  type="textarea"
                  placeholder="请输入内容"
                  maxlength="300"
                  show-word-limit
                  :rows="8"
                />
              </el-form-item>
            </el-col>
          </el-row>
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
              管乐团正式成员不少于35人，不超过65人（报名时可报预备队员5人）；铜管乐团正式成员不少于20人，不超过45人，其中打击乐不超过8人（报名时可报预备队员3人）。
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

        <!--
          【第十二届·暂存】按钮区改动说明：
          1) 「暂存」落服务端草稿（规范 §六、§二十二）。dist 原版是「仅新增页可见
             + 只写 localStorage」，现在改成落服务端。
          2) 状态文案取 draftStatusText（未保存 / 正在暂存…… / 已暂存 /
             暂存失败，请重试 / 草稿已在其他页面修改 / 正在提交…… / 已正式提交）。
             「已暂存」**不带时刻** —— 用户要的是"存住了没有"，时分秒没用又占地方。
             切走再回来、刷新页面都还能认回自己那份草稿，见 resumeDraftSession。
             这段文案也**只在新增页显示**，理由与暂存按钮同源，见下面第 5 点。
          3) 提交中用 :loading + 按钮禁用双重收口；冲突未解决前禁止再暂存 ——
             这两个约束由 composable 的状态机保证，模板只如实反映。
          4) 提交成功后「暂存」按钮**也要禁用**（draftState.submitted）。新增页会重置
             表单（form.read 变 false）所以本来就灰着；这一条对编辑页已经没有意义 ——
             见下面第 5 点的原因，编辑页根本没有这个按钮了。

          【5) 编辑页**不显示**「暂存」按钮，也**不显示**状态文案 —— 2026-09-23 按产品要求改】
          两处的判据都是 cfg.mode === 'create'（按钮与 ProgramForm 的第 253 行一致）。
          编辑页上这一整块收干净后，只剩「立即修改」一个按钮。

          【订正 2026-09-23】本段原文写「后端 edit-draft 每次进入都用正式 Report 的内容
          重建草稿、无条件覆盖」，据此说这个按钮给的是「假保证」——**这个前提已经不成立**，
          后端同日的 07056da 已修：
            apps/api/views.py:875-881 —— 查出绑定在该 report 上的草稿后，
            若 state == STATE_EDITING 就直接返回它，**不覆盖**用户已暂存的修改；
            只有「没有草稿」和「已提交又被再次驳回」（:882-896）两条路才重新播种。
          所以当时那条「点暂存 → 以为存住了 → 再进来全变回旧内容」的链路已经走不通。

          **但按钮不因此放回来**：撤掉它现在只剩产品要求这一条依据
          （「被驳回的文件点编辑进入的『报名修改』页不需要暂存按键」），
          与后端修没修无关。别看到后端已修就顺手恢复，那不是订正、是回退需求。
          编辑页的提交路径没受任何影响：提交时仍按 §十 强制暂存一次再提交。

          为什么状态文案也要一起去掉：按钮没了之后它恒停在「未保存」——
          一个用户既无法消除、也无法照做的抱怨。编辑页本来就不缺反馈，
          收掉它不会少任何信息：
            · 提交中/提交成功 —— 按钮自身文案（「正在提交……」）+ toast（「修改成功」）；
            · 版本冲突 —— notifyDraftError 走的是确认框，本来就不读这段文案。
          换言之这段文案在编辑页只剩下「未保存」这一句有用，而那一句是错的信号：
          用户改的内容确实没上服务器，但他此刻也无事可做 —— 编辑页的出路是「立即修改」，
          不是「暂存」。文案留着只会把人往一个不存在的动作上引。
        -->
        <el-form-item>
          <el-button
            type="primary"
            :disabled="!form.read || draftState.isSubmitting || draftState.submitted"
            :loading="draftState.isSubmitting"
            @click="onSubmit"
          >
            {{ draftState.isSubmitting
              ? '正在提交……'
              : cfg.mode === 'create' ? '立即报名' : '立即修改' }}
          </el-button>
          <!-- 编辑页不提供「暂存」：产品要求「报名修改」页只留提交。
               注：原先此处给的技术理由（后端会覆盖草稿）已随 07056da 失效，
               但按钮仍按要求不放回，理由见上方注释第 5 点。 -->
          <el-button
            v-if="cfg.mode === 'create'"
            :disabled="draftState.isSaving || draftState.isSubmitting || draftState.hasVersionConflict"
            :loading="draftState.isSaving"
            @click="onTempSave"
          >
            暂存
          </el-button>
          <!-- 状态文案同样只在新增页显示：编辑页没有「暂存」，它会恒显示「未保存」，
               变成一个用户无法消除、也无法照做的抱怨。编辑页该有的反馈一样不少 ——
               提交中/成功：按钮自身文案（「正在提交……」）+ toast（「修改成功」）；
               版本冲突：notifyDraftError 弹的是一个确认框，本来就不看这里。 -->
          <span
            v-if="cfg.mode === 'create'"
            class="draft-status"
            :class="`draft-status--${draftStatusLevel}`"
          >
            {{ draftStatusText }}
          </span>
          <el-button
            v-if="draftState.hasVersionConflict"
            type="warning"
            link
            @click="onReloadDraft"
          >
            重新加载服务器草稿
          </el-button>
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
 * | 主字段 | 合唱团名称 / 曲目1 / 曲目2 + 原创·中国作品 radio + 表演人数 + 伴奏形式 | 乐团名称 / **类型** / 自选曲目 / 指定曲目 / 参演组别 / 时长 / 参展学校名称 / 领队* |
 * | 曲目字段 | name1 + name2，origin1/2、territory1/2（radio） | **只有 name1**，无 name2 / origin / territory |
 * | 乐团简介 | 无 | 有（textarea，maxlength 300，rows 8） |
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
 * | /city/elementary/create   | 5e02 | c01ac1ca | 赛事报名 | 管乐团·铜管乐团 | 小学组·中学组        | **有**（※已改，见第六节） | -/city/create   | 跳 /city/elementary/list 报名汇总 |
 * | /school/elementary/create | 3d27 | 6517e16c | 赛事报名 | 管乐团          | 大学组              | 无     | -/school/create | 跳 /school/elementary/list 报名汇总 |
 * | /city/elementary/edit/:id   | 30d4 | 0ce6ffa5 | 报名修改 | 管乐团·铜管乐团 | 小学组·中学组·**大学组**（※已改，见第五节） | 无     | city/city   | 无（只提示） |
 * | /school/elementary/edit/:id | 0b72 | a05320c6 | 报名修改 | 管乐团          | 大学组              | 无     | school/school | 无（只提示） |
 *
 * 【注意·非对称】「参演组别」的选项，city 新增是 2 个（小学组/中学组），
 * city 编辑却是 **3 个**（小学组/中学组/大学组）。这是 dist 原文。
 * **第十二届已把 city 编辑的「大学组」去掉，现与 city 新增一致** —— 见第五节。
 *
 * 【注意·非对称】「指定曲目」的 v-if，dist 里**只有 5e02 一个模块有**：
 *   5e02 (city 新增)  : `"管乐团"===form.establishment ? <el-col>[指定曲目] : 不渲染`
 *   3d27/30d4/0b72    : 无 v-if，无条件渲染
 *   同族四个模块两种写法 —— 逐 chunk grep dist 原文比对确认，非推断。
 * **第十二届已统一为 4 个变体一律无条件渲染** —— 见第六节。
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
 * 【已消失】dist 遗留的 `QiniuData.key:"ylbxt/"` 累加写法（beforeUpload 里先重置为
 *   "ylbxt/" 再 += rename(name)）随 OSS 改造一并删除：ObjectKey 现在由后端签发，
 *   前端不再拼 key。相关的 getQiniuToken / domain / host / filename 同样移除。
 *
 * 【已消失·死代码】dist 的 onSubmit 里有一段人数统计：一条 `0===i.type && i.position`
 *   的**求值后丢弃**的空表达式，外加 `studentCount++` / `reserveCount++` /
 *   `percussionCount++` 三个局部计数器。自本函数改用 validatePersonCount() 统一校验后，
 *   这三个变量在组件内**只写不读**（全量检索确认无第二种引用），已成死代码，本轮删除。
 *   注意别再照抄这段口径：它是「type===0 一律计正式」，与红头文件不符（见 personRules.js
 *   validatePersonCount 的注释），也正是本轮 H1 修掉的那个错。
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
 * 【已移除】`size="mini"`：Element Plus 的合法尺寸是 large/default/small，不含 "mini"，
 * 该 prop 每次渲染都会触发一次校验告警。EP 里并不存在 `.el-*--mini` 规则，这个属性
 * 本来就不产生任何样式，删掉是零视觉变化。**未**改成 small —— `--small` 是真实尺寸规则
 * （按钮 32→24px、表格单元格 padding 8px→4px、字号变小），会改动界面。
 * 【保留未改】`oninput="value=value.replace(...)"`：dist 原文（在原生 input 上过滤非数字），
 * 与 ProgramForm 保持同一写法，实际效果在浏览器中验证。
 *
 * ===========================================================================
 * 五、【第十二届偏离】参演组别为什么按「报送渠道」而不是按「乐团类型」联动
 * ===========================================================================
 * 【背景】dist 原文（上表 30d4 行）给 city 编辑页的「参演组别」写死了 3 个选项
 *   小学组/中学组/大学组，而 city 新增页（5e02）只有 2 个 小学组/中学组。
 *   同渠道、同类型、两个页面两套选项 —— 这一处非对称是 dist 自身的缺陷。
 *
 * 【判定依据】红头文件（《…第十二届管乐展示活动 - 系统需求》）
 *   （一）报名对象：「管乐团分为小学组、中学组和大学组。铜管乐团分为小学组和中学组。」
 *   （三）展示时长：小学组12分钟 / 中学组15分钟 / 大学组18分钟；铜管乐团（小学、中学）均10分钟。
 *   —— 即全场一共 5 个合法组合：管乐×3 + 铜管×2（BACKEND_ISSUES.md:80 的后端分组同此）。
 *
 *   红头文件这句话定义的是**全场的合法组合**，不等于**某个渠道页面上能选的组合**。
 *   报名主体在账号申请表（附件4）里是二选一：「市州 / 高校」，两类账号走不同渠道：
 *     · 高校渠道（school）—— 只报大学组。代码里 establishmentOptions 只有「管乐团」
 *       一项、groupOptions 只有「大学组」；**铜管乐团整体缺席高校端**，
 *       正是因为按红头文件铜管乐团压根没有大学组。两条互相印证。
 *     · 市州渠道（city ）—— 报中小学，即小学组/中学组。
 *
 * 【结论】city 渠道不该出现「大学组」，与乐团类型（管乐/铜管）无关：
 *   管乐团 × city → 小学组、中学组（大学组归高校渠道）
 *   铜管乐团 × city → 小学组、中学组
 *   管乐团 × school → 大学组
 *   故 dist 30d4 多出的「大学组」于第十二届**移除**，city 编辑页与新增页统一为 2 个选项。
 *
 * 【连带删除的实现】原先为按类型联动写的 `cfg.groupOptionsFor(establishment)` 函数、
 *   模板里的 `groupOptionsForCurrent()` 调用，以及「切换类型时清空非法 group」的
 *   `watch`，在本次改动后**全部成为死代码，已一并删除**。
 *   其中那个 watch 还有一处副作用必须记录：编辑页 `getMessage()` 是 `form.value = r`
 *   整体替换，会触发它；若后端存有历史数据「铜管乐团 + 大学组」，watch 会把 group
 *   静默清成空字符串，用户打开编辑页会看到组别栏是空的（校验能拦住提交，不会写坏数据）。
 *   删除该 watch 后此问题一并消失。
 *
 * 【未改动】`minuteValidator` 里按 establishment 判断时长的分支保持原样：
 *   大学组 18 分钟的判据仍然可达 —— 高校渠道（school）就是「管乐团 + 大学组」。
 *
 * ===========================================================================
 * 六、【第十二届偏离】指定曲目
 * ===========================================================================
 * 【背景】同族四个模块对「指定曲目」有两种写法（逐 chunk grep dist 原文比对）：
 *   · 5e02 (city 新增)：带条件
 *       `"管乐团"===form.establishment ? <el-col>[指定曲目] : 不渲染`
 *     即选中「铜管乐团」时，整个指定曲目输入框**不渲染**。
 *   · 3d27 / 30d4 / 0b72：`t("el-col",{attrs:{span:12}}` 前没有任何三元条件，
 *     无条件渲染。
 *
 * 【判定依据】红头文件原文（与代码同处一个 chunk，可直接对照）：
 *   「（三）展示曲目。管乐团、铜管乐团现场展示曲目均为指定曲目和自选曲目各一首，
 *     指定曲目详见附件1。」
 *   ——「管乐团、铜管乐团」并列，铜管乐团同样是指定 + 自选各一首。
 *   故 5e02 的条件把铜管乐团本该有的输入框藏掉，是 dist 自身的缺陷。
 *
 * 【实际后果】5e02 选中「铜管乐团」时，用户看不到也填不了指定曲目，
 *   而红头文件要求铜管乐团同样有指定曲目 —— 该字段被静默丢失。
 *   另：`rules.name1` 本身是 `required: true`（"需填写指定曲目"）。
 *
 * 【结论】**4 个变体一律无条件渲染「指定曲目」**（管乐团 / 铜管乐团都一样）。
 *   实现上就是去掉 5e02 那个三元条件，与其余三个模块原本的写法对齐。
 */
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { UploadFilled } from '@element-plus/icons-vue'

import { cityApi } from '@/api/city'
import { schoolApi } from '@/api/school'
import { fileApi } from '@/api/misc'
// 【第十二届改造】上传改走阿里云 OSS 直传，不再使用七牛
import { uploadToOss } from '@/services/ossUpload'
import { addCache, getCache, clearCache } from '@/utils/auth'
import { getM, getS, formatDateTime } from '@/utils/date'
import { useTabs } from '@/composables/useTabs'

// 【第十二届改造】导入人员规则校验
import { validatePersonCount, validateDuration, getDurationLimit } from '@/config/personRules'
import { validateName, validateSchool, validatePhone, validateAddress } from '@/config/formFields'

// 【第十二届·暂存】服务端草稿会话（串行队列 / version / 409 都在里面；不含任何定时器）
import { useDraftSession } from '@/composables/useDraftSession'

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
    formDefaults: {},
    redirect: { path: '/city/elementary/list', label: '报名汇总' }
  },
  /* ---------------- 新增（Create II）：3d27 ---------------- */
  '/school/elementary/create': {
    mode: 'create', title: '赛事报名',
    api: { create: 'school' },
    establishmentOptions: ['管乐团'],
    groupOptions: ['大学组'],
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
     * 【第十二届修正】dist 原文是 ['小学组', '中学组', '大学组']，
     * 现改为 ['小学组', '中学组']，与 city 新增页（5e02）一致。
     * 依据与理由见文件头第五节「参演组别为什么按渠道而不是按乐团类型联动」。
     */
    groupOptions: ['小学组', '中学组'],
    formDefaults: {}
  },
  /* ---------------- 编辑（Edit II）：0b72 ---------------- */
  '/school/elementary/edit/:id': {
    mode: 'edit', title: '报名修改',
    api: { getById: 'school', update: 'school' },
    establishmentOptions: ['管乐团'],
    groupOptions: ['大学组'],
    formDefaults: {}
  }
}

const cfg = VARIANTS[props.variant]

const route = useRoute()
const formRef = ref(null)
const teacherRef = ref(null)
const personRef = ref(null)
const fileshowRef = ref(null)
const secondRef = ref(null)

// 【已移除】QiniuData / domain / host / filename：
//   OSS 的 ObjectKey 由后端签发（{biz}/{YYYYMMDD}/{uuid}），上传目标地址也由后端
//   在凭证响应里下发（data.host），前端不再需要自己拼 key、也不再硬编码上传域名。
//   filename 原本只是 beforeUpload 存入、doUpload 取出，等价于 options.file.name，一并去掉。
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

/* ------------------------- 指定曲目候选（第十二届） ------------------------- */

/**
 * 【第十二届】指定曲目候选，按「类型 × 组别」查。
 * 出处：第十二届红头文件附件1。
 *
 * 每个元素 = 红头文件该条的**前一部分**（曲名 + 演奏范围/别称），
 * 砍掉后面的「作曲：…」「改编：…」「选自：…」以及句末的「。」。
 * 切法是机械的：在第一个「，作曲」或「，选自」处切断。例：
 *   《挽歌》选段（从第40小节开始至结束），作曲：冼星海，改编：尼古拉斯·史密斯。
 *   → 《挽歌》选段（从第40小节开始至结束）
 *   《赞美诗与退场赞美诗》，选自《青少年管乐队训练曲集（基础1）》。
 *   → 《赞美诗与退场赞美诗》
 * 之所以这样切：前一部分是**选手必须知道、导出表里必须有的**演奏信息
 * （从第几小节开始、第几首、别称），后一部分只是出处/署名。
 *
 * 元素本身就是最终入库值，不加编号、不做映射：后端 name1 是
 * CharField(max_length=255)，导出（XLSX/PDF）与详情页（ShowContent.vue）
 * 都把它当人类可读文本原样输出，数字 ID 会被直接印出来。
 *
 * 拉丁曲名按通用写法补回被 PDF 抽取吞掉的空格（Poco Loco / March for Military Band）；
 * 拉丁词与后随的「（」之间不留空格。中文括号内一律全角。
 * 铜管乐团小学组、中学组共用同一份（红头文件里两组别的曲目相同，均三选一）。
 */
const NAME1_OPTIONS = {
  '管乐团|小学组': ['《挽歌》选段（从第40小节开始至结束）', '《赞美诗与退场赞美诗》'],
  '管乐团|中学组': ['《石榴青青》选段（从第56小节至结束）', '《号角音乐与赋格》'],
  '管乐团|大学组': ['《素描五首》第一首、第五首', '《黄河》选段（《黄河颂》+《保卫黄河》）'],
  '铜管乐团|小学组': [
    '《Poco Loco》（有一点点慵懒）',
    '《Rondeau》（回旋曲）',
    '《March for Military Band》（军乐队进行曲）'
  ],
  '铜管乐团|中学组': [
    '《Poco Loco》（有一点点慵懒）',
    '《Rondeau》（回旋曲）',
    '《March for Military Band》（军乐队进行曲）'
  ]
}

const name1Options = computed(
  () => NAME1_OPTIONS[`${form.value.establishment}|${form.value.group}`] || []
)

/**
 * 用户手动改「类型」或「参演组别」后，已选曲目若不在新组合的候选里就清空。
 * 【为何用 @change 而不是 watch】编辑页 getMessage() 是 `form.value = r` 整体回填，
 * watch 会在回填那一刻触发、把历史数据误清掉；@change 只在用户操作时触发。
 */
function onScopeChange() {
  if (form.value.name1 && !name1Options.value.includes(form.value.name1)) {
    form.value.name1 = ''
  }
}

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
 * 【第十二届·指定曲目（name1）专用】只判「包含《…》」，不判首尾。
 *
 * 【为什么不复用上面的 nameValidator】指定曲目改成下拉框后，入库值取自
 * NAME1_OPTIONS，形如 `《挽歌》选段（从第40小节开始至结束）`——结尾是「）」
 * 不是「》」，9 条候选里有 7 条过不了「首《》末《》」，会失焦报红并卡住提交。
 * 而自选曲目（name）是人手输入的，仍按老规矩要求首《》末《》，两者要求不同，
 * 故各自一个校验器；nameValidator 因此**逐字不动**。
 *
 * 放宽后 9 条候选全部通过，且往届自由文本（如《往届自由填写的指定曲目》）也通过，
 * 历史数据回填不会被新校验拦住。唯一收紧点：《》（括号内为空）现在被拦，
 * 原「首《》末《》」是放行的。
 *
 * 与 nameValidator 同样的写法：先 callback(Error) 再 callback()，
 * async-validator 的 callback 只认第一次调用，末尾那次在已报错时是空操作。
 */
function name1Validator(rule, value, callback) {
  if (!/《[^《》]+》/.test(value)) {
    callback(new Error('指定曲目需包含《曲名》'))
  }
  callback()
}

/**
 * 第十二届展示时长校验器
 * 【官方明确 - 第十二届红头文件】
 *   管乐团-小学组 ≤ 12分钟
 *   管乐团-中学组 ≤ 15分钟
 *   管乐团-大学组 ≤ 18分钟
 *   铜管乐团（小学组 / 中学组）≤ 10分钟
 *
 * 【第十二届改造】上限改查 getDurationLimit()，不写死在本函数里。
 *   原先铜管分支只判 establishment、不判 group，而提交时的 validateDuration()
 *   按 (类型, 组别) 二元组查表 —— 遇「铜管乐团 + 非小学/中学组」（新建页选不出，
 *   历史数据可能带出）会分叉成「失焦报红、提交却放行」。
 *   改为查表后两处同源，时长上限只剩 PERSON_RULES 一个来源。
 *   报错文案保持逐字不变（铜管那条**不带组别**）；查不到规则时不校验上限。
 *
 * 校验顺序：分钟数 → 秒数 → 格式 → 时长限制 → 范围
 */
function minuteValidator(rule, value, callback) {
  const second = form.value.second
  if (value === '') callback(new Error('请输入分钟数'))
  if (second === '') callback(new Error('请输入秒数'))
  if (!/(^[0-9]\d*$)/.test(value)) callback(new Error('分钟数只能是正整数'))
  if (!/(^[0-9]\d*$)/.test(second)) callback(new Error('秒数只能是正整数'))

  // 【第十二届改造】上限查 personRules.js，不在本函数内硬编码
  const limit = getDurationLimit(form.value.establishment, form.value.group)
  if (limit !== null && (value > limit || (limit === Number(value) && second > 0))) {
    // 铜管乐团的提示文案不带组别（改造前如此，保持不变）
    const who =
      form.value.establishment === '铜管乐团'
        ? '铜管乐团'
        : `${form.value.establishment}${form.value.group}`
    callback(new Error(`${who}展示时长须在${limit}分钟以内`))
  }

  if (second > 60 || second < 0) callback(new Error('秒数只能在0-60之间'))
  if (value > 60 || value < 0) callback(new Error('分钟数只能在0-60之间'))
  callback()
}

/** 4 个模块的 rules 逐字相同（已 diff 确认），故不需要逐路由变体 */
const rules = reactive({
  choir_name: [
    { required: true, message: '请输入乐团名称', trigger: 'blur' },
    /*
     * 【第十二届·文案对齐规则】原文案写「长度在 1 到 50 个字符」，规则却是 max: 100 ——
     * 文案比实际执行的上限严了一倍，用户按提示删到 50 字以内纯属白费功夫。
     * 红头文件对「乐团名称」的长度**没有任何规定**（全篇只规定了乐团简介 300 字以内、
     * 照片 100KB、视频 700MB），故这里没有文件依据可改规则，只把文案改成与实际一致。
     * 若确需收紧到 50，改 max 并同步这行文案即可。
     */
    { min: 1, max: 100, message: '长度在 1 到 100 个字符', trigger: 'blur' }
  ],
  group: [{ required: true, message: '请选择组别', trigger: 'blur' }],
  establishment: [{ required: true, message: '请选择类型', trigger: 'blur' }],
  name: [
    { required: true, message: '请输入曲目名称', trigger: 'blur' },
    { min: 1, max: 100, message: '长度在 1 到 100 个字符', trigger: 'blur' },
    { required: true, validator: nameValidator, trigger: 'blur' }
  ],
  name1: [
    { required: true, message: '需选择指定曲目', trigger: 'blur' },
    { min: 1, max: 100, message: '长度在 1 到 100 个字符', trigger: 'blur' },
    { required: true, validator: name1Validator, trigger: 'blur' }
  ],
  /*
   * 【第十二届·补格式校验】下面四条原先只有 required + 长度区间，于是：
   *   领队姓名「123」、领队电话「abc」、参展学校名称「12345」、联系地址「1」
   * 都能通过校验并报到后端。长度管得住「太长」，管不住「填错了」。
   * 格式规则与人员表**共用同一份**（config/formFields.js → config/personFields.js），
   * 否则同一个「联系电话」在两张表里判据不同，早晚被当成两个 bug 报上来。
   * 原长度区间逐条保留不动，新增的 validator 只补格式这一层。
   */
  contact_name: [
    { required: true, message: '请输入领队姓名', trigger: 'blur' },
    { min: 1, max: 20, message: '长度在 1 到 20 个字符', trigger: 'blur' },
    { validator: validateName, trigger: 'blur' }
  ],
  contact_phone: [
    { required: true, message: '请输入领队电话', trigger: 'blur' },
    { min: 1, max: 20, message: '长度在 1 到 20 个字符', trigger: 'blur' },
    { validator: validatePhone, trigger: 'blur' }
  ],
  contact_way: [
    { required: true, message: '请输入联系地址 ', trigger: 'blur' },
    { min: 1, max: 100, message: '长度在 1 到 100 个字符', trigger: 'blur' },
    { validator: validateAddress, trigger: 'blur' }
  ],
  minute: [
    { required: true, message: '请输入作品总时长 ', trigger: 'blur' },
    { validator: minuteValidator, trigger: 'blur' }
  ],
  school_name: [
    { required: true, message: '请输入学校名称 ', trigger: 'blur' },
    { min: 1, max: 100, message: '长度在 1 到 100 个字符', trigger: 'blur' },
    { validator: validateSchool, trigger: 'blur' }
  ]
})

/** 集体照缺失的提示文案：新增页是「未上传乐团集体照」，编辑页是「未上传集体照」（dist 原文） */
const photoMissingMsg = computed(() =>
  cfg.mode === 'create' ? '未上传乐团集体照' : '未上传集体照'
)

/* ------------------------- 上传逻辑（逐行照搬 dist） ------------------------- */

/**
 * 【第十二届改造】dist 的 getQiniuToken() 已移除。
 * 七牛的 uptoken 是「一次取好、反复用」的；OSS 的 STS 凭证必须**按次签发**
 * （后端要拿 biz / fileSize / contentType 去判规则并收敛会话策略到本次的 key 前缀），
 * 所以没有可预取的东西 —— 连 onMounted 里的那次预取也一并删掉了。
 * 凭证的获取时机现在完全收在 services/ossUpload.js 的 uploadToOss() 内部。
 */

/**
 * beforeUpload（视频）：MP4/MOV，<700M。
 *
 * 【第十二届改造】原来这里还负责拼七牛的 ObjectKey（`QiniuData.key = 'ylbxt/'`
 * 再 `+= rename(name)`），现在 key 由后端签发，那三行随之删除。
 * 校验本身（格式、大小、报错文案）逐字保留，与 ProgramForm 族保持同一判据。
 */
function beforeUpload(file) {
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

/** beforeUpload1（乐团集体电子照）：JPEG/TIFF，<20MB。key 改由后端签发，拼 key 的三行删除 */
function beforeUpload1(file) {
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
 * uploadFile / uploadFile1 的公共部分（两者除写入的 fileList 与 biz 外逐字相同）。
 *
 * 【第十二届改造】上传通道由七牛 qiniu-js 换成阿里云 OSS 直传。取凭证、分片、
 * 进度、弱网下刷新凭证这些事全部收在 services/ossUpload.js 的 uploadToOss() 里，
 * 这里只负责「进度圈 + 落库 + 写 fileList」这段业务编排。两者差别只剩 biz 一个参数。
 *
 * 【新增页 vs 编辑页的唯一差别】上传成功后是否调用 tempSave()：
 *   5e02 / 3d27（create）：`t.fileList.push(o), t.tempSave(), Message.success("文件上传成功！")`
 *   30d4 / 0b72（edit  ）：`t.fileList.push(o),                   Message.success("文件上传成功！")`
 *   —— 编辑页没有 tempSave 方法（无草稿缓存），故用 cfg.mode 区分。
 *
 * 【为什么用 .then 而**不是** async/await】本函数有意不返回 Promise。
 *   返回 Promise 的话，Element Plus 会在 upload-content 里替我们再跑一遍自己的成功路径
 *   （见 element-plus/es/components/upload/src/upload-content…mjs 的
 *   `if (request instanceof Promise) request.then(options.onSuccess, options.onError)`），
 *   属于本次改造不该引入的行为变化，故维持返回 undefined。
 *
 * 【为什么不能再 push 一条列表项（2026-09 修复的重复条目缺陷）】
 *   listRef 就是绑给 el-upload 的 v-model:file-list 的那个数组 —— 选中文件时，
 *   el-upload 的 handleStart 已经往里放过一条
 *   `{name, percentage, status:'ready', size, raw, uid}`。
 *   上传完成后再 push 一条 `{id, name}`，同一个文件就会同时存在两条：
 *     - el-upload 那条：status 一直是 'ready' -> 显示为「无对勾」
 *     - push 那条：没有 status，而 Element Plus 的 use-handlers 里有
 *       `file.status ||= 'success'` 的深监听 -> 被自动补成 'success' -> 显示为「有对勾」
 *   两条同名并排，就是用户看到的「一次上传出现两个一样的文件」。
 *
 *   附带（也是同源的）第二个缺陷：提交时读的是 `listRef.value[0].id`
 *   （见下方 onSubmit 的 `t.spectrum = fileList1.value[0].id`），而 push 进去的那条
 *   排在 [1]，[0] 恰是 el-upload 那条、**没有 id** —— 于是照片/视频的 id 根本提交不上去。
 *   若只把 push 删掉了事，列表只剩 el-upload 那条，id 依然是丢的。
 *
 *   正确做法：不新增、而是**按 uid 原地替换**那一条 —— 与 UploadScanDialog.vue 的
 *   uploadFile() 已确立的写法一致（那里也是同一个坑，注释见该文件第 1 条）。
 *   替换后的对象不带 status，由上面那个 `status ||= 'success'` 补成成功态（显示对勾），
 *   于是「列表显示」与「提交读的 id」由同一条记录承担。
 */
function doUpload(options, listRef, biz) {
  const file = options.file
  const rawName = file.name

  fileshowRef.value.show()

  uploadToOss({
    file,
    biz,
    // FileCover 的 setPro() 内部是 parseFloat，传数字即可
    onProgress: (percent) => fileshowRef.value.setPro(percent)
  })
    .then((result) => {
      fileshowRef.value.dishow()
      const info = {}
      info.filename = rawName
      info.type = file.type
      info.size = file.size
      // url 用凭证响应里后端下发的 host 拼出，前端不再硬编码文件域名
      info.url = result.url
      fileApi.saveFileInfo(info).then(({ data: r }) => {
        if (r.code === 0) {
          // 按 uid 找 el-upload 已写入的那条（判据与 Element Plus use-handlers 的
          // getFile() 相同），命中就原地替换（找不到的情形见下方说明）。
          const i = listRef.value.findIndex((f) => f.uid === file.uid)
          if (i > -1) {
            // 不带 status：交给 use-handlers 的 `file.status ||= 'success'` 补成成功态
            listRef.value[i] = { id: r.data.id, uid: file.uid, name: rawName, url: result.url }
          }
          // 【i === -1 时什么都不做，刻意不 push】只有一种情况会走到这里：用户在
          //   等待上传的这段时间里点了删除，handleRemove 已按 uid 把它移出列表。
          //   此时再 push 等于把用户刚删掉的文件复活。而列表本就只剩这一条，
          //   删掉后为空，提交时会被 onSubmit 开头的「请上传…」拦住，不会静默丢数据。
          if (cfg.mode === 'create') tempSave()
          ElMessage.success('文件上传成功！')
        } else {
          ElMessage.error('文件上传失败！')
        }
      })
    })
    .catch((err) => {
      fileshowRef.value.dishow()
      // err.shown 为 true 表示拦截器/网络层已经提示过，不重复弹
      if (!err.shown) ElMessage.error(err.message || '文件上传失败！')
    })
}

function uploadFile(options) {
  // 演出视频：MP4/MOV ≤700MB，对应后端 OSS_BIZ_RULES.video
  doUpload(options, fileList, 'video')
}
function uploadFile1(options) {
  // 乐团集体电子照片：JPEG/TIFF <20MB，对应后端 OSS_BIZ_RULES.photo
  doUpload(options, fileList1, 'photo')
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

/* ------------------------- 草稿缓存（新增页 + 编辑页） ------------------------- */

/**
 * dist:
 *   tempSave(e=!1){
 *     this.form.person=this.$refs.person.getCacheData(), this.form.teacher=this.$refs.teacher.getCacheData(),
 *     this.form.fileList=this.fileList, this.form.fileList1=this.fileList1,
 *     this.addCache(this.cacheName,this.form), e && Message.success("本地保存成功")
 *   }
 *
 * 【第十二届改动：编辑页也用上了】
 * dist 的编辑页两个模块里**没有** tempSave（也没有 cacheName / timer），后果是：
 *   · 编辑页没有任何本地镜像；
 *   · 编辑页只有「手点暂存」和「提交」两个落盘点，改完就切走 = 全丢；
 *     （【2026-09-23】「手点暂存」在编辑页已按产品要求拿掉，见模板里的注释第 5 点，
 *      所以编辑页现在只剩「提交」。本地镜像比以前更要紧了。）
 *   · 而服务端那条路也救不了它 —— 编辑页**没有**任何途径把改动写进服务端草稿：
 *     「暂存」按钮已按产品要求拿掉，剩下的「提交」本身就是终点。编辑页的草稿只由
 *     正式报名播种（views.py:882-886），用户改了不提交，服务端那份始终是旧的。
 *     （订正：原文把原因写成「后端 edit-draft 每次进入都覆盖草稿」，该缺陷已随
 *       07056da 修复 —— views.py:875-881 遇到 STATE_EDITING 草稿会直接返回。
 *       但上面这条结论不受影响，因为编辑页根本没有写草稿的入口了。）
 * 所以本地缓存是编辑页**唯一**能挺过「改了没提交就离开」的容器。
 *
 * 【谁在什么时候调它 —— 只有两处，别再往上加】
 *   1. flushLocalCache()：beforeunload（关页/刷新）与 onBeforeUnmount（路由切走）
 *   2. 上传成功（见上面 uploadFile）与**新增页**的「暂存」按钮，那是用户的明确动作
 *      （编辑页已无「暂存」按钮，所以编辑页只剩第 1 条这一个调用者）
 * dist 原来还有第三个调用者：每 60 秒的 setInterval。**已按产品要求删除**，
 * 所以现在浏览器崩溃/被强杀（拿不到 unload 事件）时，上一次落盘之后敲的内容会丢。
 * 这是有意的取舍：不点就不写。
 *
 * 【必须先判 cacheName】两个模式都会给 cacheName 赋值（见 onMounted），
 * 但 onBeforeUnmount 的收尾可能在赋值前被调用；不判的话会以
 * `addCache(null, ...)` 往 localStorage 写一个键名为 "null" 的垃圾条目。
 */
function tempSave(showTip = false) {
  if (!cacheName.value) return
  // 子表 ref 在挂载完成前是 null；这里是卸载钩子调用的，不能假定已就绪
  if (personRef.value) form.value.person = personRef.value.getCacheData()
  if (teacherRef.value) form.value.teacher = teacherRef.value.getCacheData()
  form.value.fileList = fileList.value
  form.value.fileList1 = fileList1.value
  addCache(cacheName.value, form.value)
  if (showTip) ElMessage.success('本地保存成功')
}

/* ------------------------- 服务端草稿（暂存） ------------------------- */

/**
 * scope 由「报送渠道」决定，**只用于拼 URL**（/api/school/... 或 /api/city/...），
 * 绝不写进请求体 —— 后端从登录态推导 user_id / 权限（规范 §五、§二十八）。
 * 4 个变体恰好各自对应一个渠道，复用 VARIANTS 里已有的 api 键，不新增配置项。
 */
const draftScope = cfg.mode === 'create' ? cfg.api.create : cfg.api.update

/**
 * 草稿指针的落脚点。
 *
 * draftId / version 原本只活在 useDraftSession 的 reactive state 里，而路由一切换
 * 本组件就被卸载 —— 于是「填着填着切到报名汇总再切回来」会得到一份全新 state，
 * 界面从「已暂存」掉回「未保存」（内容其实一直在服务器上）。
 *
 * 【只存指针，不存内容】页面已经有一份表单缓存了（下面 tempSave 在关页/切走时写一次），
 * 再存一份内容只会多一个可能不一致的来源。指针里就一个门牌号，内容回服务器拉。
 * 至于拉到之后要不要覆盖本地 —— 见 onMounted 里传给 resumeDraftSession 的
 * restoreContent，那里是「不弄丢用户刚敲的字」的底线。
 *
 * 键里带 scope 与 route.path：不同报送渠道、不同乐团各存各的，互不串门。
 * 用 route.path 而非 route.name —— 与上面 cacheName 的取法保持一致。
 */
const draftSessionKey = `draft_session:${draftScope}:${route.path}`
const draftSessionStore = {
  load: () => getCache(draftSessionKey),
  save: (meta) => addCache(draftSessionKey, meta),
  clear: () => clearCache(draftSessionKey)
}

const {
  state: draftState,
  statusText: draftStatusText,
  statusLevel: draftStatusLevel,
  save: saveDraft,
  submit: submitDraft,
  listDrafts,
  loadDraft,
  resumeSession: resumeDraftSession,
  enterEditFromRejected,
  reloadFromServer: reloadDraftFromServer,
  markDirty,
  DRAFT_ERR: DRAFT_ERR_CODE
} = useDraftSession({
  scope: draftScope,

  // 取表单：草稿 payload 由 src/services/draftPayload.js 统一构建，页面不自己拼（§十六）
  getForm: () => form.value,
  getFiles: () => ({ fileList: fileList.value, fileList1: fileList1.value }),

  // 恢复：写回 form 与两个文件列表。Teacher/Person 两张子表都有
  // `watch(() => props.showdata)`，赋值即自动同步，无需另外调它们的 setter。
  applyRestored: (restored) => {
    form.value = restored.form
    fileList.value = restored.fileList
    fileList1.value = restored.fileList1
  },

  onSubmitted: (data) => {
    if (cfg.mode === 'create') {
      // 与 dist 原成功分支一致：清缓存 → 重置 → 关当前页 → 开报名汇总
      // （草稿指针由 useDraftSession.submit 自己清，见那里的 clearSession 调用）
      // 原先这里还要 clearInterval(timer) 把 60 秒本地镜像停掉；定时器已删除，
      // 于是只剩清缓存这一步。注意 clearCache 之后**不能**再让表单落盘：
      // onSubmitted 紧接着把 form 重置成空表，随后 closeWindow 会触发 onBeforeUnmount，
      // 那里的 flushLocalCache 靠 draftState.submitted 判断并跳过 —— 别改成无条件落盘。
      clearCache(route.path)
      form.value = makeForm()
      fileList.value = []
      fileList1.value = []
      ElMessage.success('报名成功')
      closeWindow(route.path)
      openWindow(cfg.redirect.path, cfg.redirect.label)
    } else {
      ElMessage.success('修改成功')
    }
    // report_id 是本次提交产生的正式报名 ID（§十一），目前无后续跳转需求，先记日志便于排查
    console.info('[draft] 正式提交完成 report_id=', data && data.reportId)
  },

  /** 草稿不存在（§二十六 DRAFT_NOT_FOUND）：composable 已清掉草稿身份，这里只提示 */
  onFatal: (e) => {
    ElMessage.warning((e && e.msg) || '草稿不存在或已被删除')
  },

  // 草稿指针的落脚点：让「切走再回来」还认得自己的草稿（见上方 draftSessionStore）
  sessionStore: draftSessionStore
})

/**
 * 统一的草稿错误提示。
 *
 * 【409 的关键约定（§二十一）】只提示 + 提供「重新加载服务器草稿」这一条出路：
 * 绝不自动用本地旧数据覆盖服务器，也绝不自动把 version 改成 server_version 再强存。
 * 恢复动作必须由用户明确点击；页面任何一处都不许在用户没点的情况下拿本地旧内容去 PUT。
 */
function notifyDraftError(err) {
  const e = err || {}
  if (e.kind === DRAFT_ERR_CODE.CONFLICT) {
    /*
     * 【为什么先落一次本地镜像】
     * 「重新加载服务器草稿」是**不可逆**的：它会用服务端内容整体盖掉用户此刻
     * 屏幕上的表单，而用户点确认之前没有任何撤销机会。原先这条路上连个备份都没有，
     * 冲突一旦被误判（或用户没看清就点了），刚敲的内容直接没了。
     * 加载前先把当前内容写进本地镜像 —— 至少还留在浏览器里，可人工找回。
     */
    flushLocalCache()
    return ElMessageBox.confirm(
      '该草稿已在其他页面或设备更新。为避免覆盖最新内容，需要重新加载草稿。\n' +
        '（重新加载会丢弃您当前页面上未保存的修改，已自动备份在本机）',
      '暂存冲突',
      {
        confirmButtonText: '重新加载服务器草稿',
        cancelButtonText: '先不加载',
        type: 'warning'
      }
    )
      .then(() => onReloadDraft())
      .catch(() => {
        // 用户选了「先不加载」：保持冲突状态（保存仍被拦着），不做任何覆盖
        ElMessage.warning('已保留您当前页面上的内容；冲突解决前暂存仍会失败')
      })
  }
  if (e.kind === DRAFT_ERR_CODE.QUOTA) {
    /*
     * 【额度不是冲突，绝不能复用上面那段「重新加载服务器草稿」】
     *
     * 「重新加载」解决的是"本地这份副本旧了"，而额度是服务端的业务规则
     * （现口径：「每所学校每个组别限报一支队伍，小学组、中学组可各报一支，
     *   大学组限报一支」—— 这是 2026-09-23 组委会放宽后的口径，
     *   **已不是红头文件正文一(二)的原文**，见 HaveToRead.vue 段 2 下的变更说明）——
     * 重新加载多少次，那份正式报名还是占着名额，按钮点了等于没点。
     *
     * 所以这里**只如实说明 + 指向真正走得通的那条路**，不给假出路。
     * 两条出路分别对应两种真实情形：
     *   · 该组别的报名是「已驳回」→ 走「编辑」在原报名上改。口径核过：
     *     ReportList.vue:135 确认列表里**只有 status === -1** 才摆「编辑」按钮，
     *     故只对这一种状态给出这条指引，不诱导用户去删已有报名。
     *   · 想报的是**另一个**组别 → 直接新增即可，新口径本来就允许
     *     （小学组 1 + 中学组 1）。这句只在有多个组别可选的渠道才出现，
     *     高校渠道 groupOptions 只有「大学组」一项，说了反而让人去找不存在的组别。
     *
     * e.msg 来自后端（report_drafts.py 的 ReportQuotaExceeded），应当点名是哪个组别，
     * 也是用户**唯一**能知道真实原因的渠道 —— 上面 CONFLICT 那段的文案是硬编码的，
     * 绝不能让它落到那里。
     */
    return ElMessageBox.alert(
      (e.msg || '超出报送名额限制') +
        '\n若该组别的报名是「已驳回」状态，请回到报名列表点「编辑」，在原报名上修改后重新提交。' +
        (cfg.groupOptions.length > 1 ? '\n若您要报的是另一个组别，可直接新增报名。' : ''),
      '无法提交',
      { confirmButtonText: '知道了', type: 'warning' }
    )
  }
  if (e.kind === DRAFT_ERR_CODE.NETWORK) {
    return ElMessage.error('网络中断，暂存失败，已保存内容不会丢失，请稍后重试')
  }
  ElMessage.error(e.msg || '暂存失败，请重试')
}

/** 手动暂存：先把两张子表的当前值同步进 form，再走服务端草稿 */
async function onTempSave() {
  if (!personRef.value || !teacherRef.value) return
  // 不调 getData()：那个方法会跑完整校验，用户在填写中途点暂存不该被拦下。
  // 用 getCacheData()，与 dist 的 tempSave 取的是同一份数据。
  form.value.person = personRef.value.getCacheData()
  form.value.teacher = teacherRef.value.getCacheData()

  try {
    const res = await saveDraft()
    /*
     * 本地镜像一并刷新。
     *
     * 【必须判 cacheName】cacheName 只在**新增页**的 onMounted 里赋值（dist 的
     * `this.cacheName = this.$route.path`），编辑页从来是 null —— 【勘误】这句已不成立：第十二届给编辑页补本地镜像后，onMounted 开头的 `cacheName.value = route.path` 对两个模式都执行，编辑页不再是 null。下面这个守卫仍要留，但理由是**时序**（赋值发生在挂载后，本函数可能更早被调到），不是模式。暂存按钮现在两个模式
     * 都显示，若不判就会在编辑页以 `addCache(null, ...)` 往 localStorage 里写一个
     * 键名为 "null" 的垃圾条目 —— 既没用，又会一直残留在用户浏览器里。
     */
    if (cacheName.value) tempSave()
    if (res && res.skipped && res.reason === 'unchanged') {
      ElMessage.info('内容没有变化，无需重复暂存')
    } else {
      ElMessage.success('暂存成功')
    }
  } catch (err) {
    notifyDraftError(err)
  }
}

/** 冲突后由用户点击触发的重新加载 */
async function onReloadDraft() {
  try {
    await reloadDraftFromServer()
    ElMessage.success('已重新加载服务器上的草稿')
  } catch (err) {
    // 这里刻意不走 notifyDraftError：若重新加载本身又失败，不该再弹一次冲突框形成死循环
    ElMessage.error((err && err.msg) || '重新加载失败，请稍后重试')
  }
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
  // 返回 Promise 供 enterEdit 的降级分支 await：它后面的 applyLocalCache 必须
  // 等这份服务端内容填完再盖，否则本地镜像会被它冲掉。
  return mod.report.getById(route.params.id).then((res) => {
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
// 【没有 timer 变量了】原先这里有一个 `let timer`，挂着 dist 那支
// `setInterval(()=>{this.tempSave()},6e4)`（每 60 秒写一次 localStorage 的本地镜像）。
// 已按产品要求删除：**不点就不写**。详见 tempSave 与 flushLocalCache 的注释。

// dist 的 openWindow / closeWindow 是 layout 上的方法（走 vuex 的 tabs 模块）。
// 本项目已有等价实现 @/composables/useTabs，语义逐行对齐，直接复用而不另造一套。
const { openWindow, closeWindow } = useTabs()

/**
 * 【§二十四】进入新增页时检测是否已有未提交的草稿。
 *
 * 【为什么是「询问」而不是「静默自动恢复」】草稿里是**上一次**填的内容。
 * 用户这次可能是来报另一支乐团的，静默恢复会让他以为自己在填新表，
 * 实际却混进了旧数据。所以只在确实检测到草稿时弹一次，由用户选。
 *
 * 后端草稿接口未部署时 listDrafts() 会走网络异常分支，这里整体吞掉：
 * 检测不到就按全新表单走，不打扰用户、也不弹错。
 *
 * @param {{preserveLocal?: boolean}} [opt]
 *        preserveLocal=true：本地缓存里握着用户最后看到的内容，**不要**让服务端
 *        草稿盖上来（只借身份与 version）。这与 onMounted 传给 resumeDraftSession
 *        的 restoreContent 是同一条底线 —— 两条路径的判据必须一致，
 *        否则「指针丢了但本地有缓存」这种情况下，用户点一次「继续填写」
 *        就会被一份可能更旧的草稿冲掉刚敲的字。
 */
async function detectExistingDraft({ preserveLocal = false } = {}) {
  try {
    const drafts = await listDrafts()
    if (!Array.isArray(drafts) || drafts.length === 0) return
    // 取最近保存的一条（只依赖 updated_at，不假设后端返回顺序）
    const latest = drafts
      .slice()
      .sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')))[0]
    if (!latest || latest.draft_id == null) return

    /*
     * 【时间为什么要过 formatDateTime，而不是直接插 updated_at】
     *
     * 后端给的是 UTC 带微秒的字符串，原样插进弹窗是这样的：
     *     检测到您有一份未提交的草稿（最后保存：2026-09-23T02:02:00.246712+00:00）
     * 两个毛病：
     *   · 普通人看不懂（T、六位小数、+00:00 都是给机器看的）；
     *   · **时间还差 8 小时** —— 上面这个时刻的北京时间是 10:02，不是 02:02。
     * 只把格式改好看、不转时区，等于把一个读不出来的错数变成读得出来的错数。
     *
     * formatDateTime 解析出绝对时刻后按**浏览器本地时区**取数，
     * 两件事一起解决；解析不出来时返回空串，退化成不带时间的问句，不会甩一行乱码。
     */
    const savedAt = formatDateTime(latest.updated_at, 'yyyy年M月d日 HH:mm')
    const when = savedAt ? `（最后保存：${savedAt}）` : ''
    await ElMessageBox.confirm(
      `检测到您有一份未提交的草稿${when}，是否继续填写？`,
      '发现草稿',
      { confirmButtonText: '继续填写', cancelButtonText: '重新开始', type: 'info' }
    )
    await loadDraft(latest.draft_id, { restoreContent: !preserveLocal })
    ElMessage.success(preserveLocal ? '已接上草稿，页面内容保持为您本机这份' : '已恢复草稿内容')
  } catch (err) {
    // 用户选「重新开始」→ ElMessageBox 以 'cancel' reject，保持空白表单即可，其余静默
    if (err === 'cancel' || err === 'close') return
  }
}

/**
 * 编辑页入口。
 *
 * 【§十三】「修改报名」必须走 edit-draft 把正式 Report 换出一份草稿来改，
 * 而不是直接 PUT 正式 Report —— 否则「驳回 → 修改 → 再提交」这条链路里，
 * 用户改到一半的内容会直接写进正式数据。
 */
async function enterEdit(localCache) {
  try {
    await enterEditFromRejected(route.params.id)
    /*
     * 【服务端回填完了，再把本地镜像盖回去】
     * 顺序不能反：enterEditFromRejected 内部会 applyRestored，先盖就会被冲掉。
     *
     * 为什么需要这一步 —— edit-draft 拿回来的是**正式 Report 的内容**，
     * 它不含用户上次在修改页改了却没提交的部分。编辑页没有「暂存」按钮，
     * 改动写不进服务端草稿（草稿只由正式报名播种，views.py:882-886），
     * 所以"切走再回来发现改的全没了"是必然的，本地镜像是唯一的解法。
     * 见 tempSave 的注释。
     */
    applyLocalCache(localCache)
    // 【编辑页的落盘点】服务端自动暂存已整体删除，编辑页现在只剩两条路：
    // 「提交」，以及**不联网**的本地镜像（beforeunload + 路由切走，已无定时器）。
    // 「暂存」按钮在编辑页已被拿掉（产品要求「报名修改」页只留提交）—— 见模板注释第 5 点。
    // 它是「改了没提交就离开」唯一的兜底，详见 tempSave 的注释。
  } catch (err) {
    const e = err || {}
    if (e.kind === DRAFT_ERR_CODE.NOT_REJECTED) {
      // 非驳回状态本就不允许修改：列表页已按 §十三 只对「已驳回」放开编辑入口，
      // 直接输 URL 进来的情况给明确提示，**不提供任何绕过路径**
      ElMessage.error(e.msg || '该报名不是驳回状态，无法修改')
      return
    }
    // 草稿接口不可用（后端尚未部署）→ 退回旧的正式 Report 回填，
    // 保证「查看/核对已提交内容」不受影响；此时暂存与提交会失败并明确提示，
    // 绝不会静默写坏正式数据。
    ElMessage.warning('草稿服务暂时不可用，当前仅回填显示，暂存与提交会失败')
    // getMessage 是异步的：等它填完再盖本地镜像，否则本地内容会被它冲掉
    await getMessage()
    applyLocalCache(localCache)
  }
}

/** 把本地镜像盖回表单（若有），并让脏标记如实反映"内容已变" */
function applyLocalCache(cached) {
  if (!cached) return
  form.value = cached
  fileList.value = Array.isArray(cached.fileList) ? cached.fileList : []
  fileList1.value = Array.isArray(cached.fileList1) ? cached.fileList1 : []
  // 只影响 draftState.isDirty 的显示（没有任何自动保存会读它，保存是手点触发的）
  markDirty()
}

/**
 * 关页 / 刷新 / 组件卸载前的最后一道本地落盘。
 *
 * 【为什么只能写 localStorage】beforeunload 里发不出异步请求 ——
 * 任何 fetch / await 都会在页面卸载时被浏览器直接掐掉。所以这里不调暂存接口，
 * 只把"用户此刻看到的内容"写进本地镜像，下次进来由上面的本地缓存逻辑认回来。
 *
 * 【它现在是主力，不是补丁】dist 原版还有一支每 60 秒的定时器在背后兜底，这个钩子
 * 只负责补「最后 60 秒」那一小段。**那支定时器已按产品要求删除**，于是本函数成了
 * 「用户没点任何按钮就离开」时唯一的落盘机会 —— 关页、刷新、路由切走全靠它。
 *
 * 服务端**从来不会有**这类兜底：往服务器写的只有用户点「暂存」和提交两条路，
 * 页面自己不会替你存。所以别把这里也一并删掉，除非产品明确接受
 * 「填到一半关掉浏览器 = 全丢」。
 */
function flushLocalCache() {
  // 已提交：onSubmitted 刚清过缓存并把表单重置成空，别把空表单又写回缓存里
  if (draftState.submitted) return
  try {
    tempSave()
  } catch (_) {
    // 隐私模式 / 配额满：落盘失败不该在卸载路径上抛异常
  }
}

onMounted(() => {
  /*
   * 【两个模式都要有 cacheName 与本地镜像（只写 localStorage）】
   *
   * dist 只在新增页做（`this.cacheName = this.$route.path`），编辑页什么都没有 ——
   * 于是编辑页改到一半切走 = 全丢，连本地缓存都没有。现在编辑页也有，
   * 理由见 tempSave 的长注释（后端 edit-draft 会覆盖草稿，本地镜像是唯一退路）。
   *
   * 【dist 的 60 秒定时器已删除】两个模式现在都不挂任何定时器，所以本函数之外
   * 只剩 beforeunload / onBeforeUnmount 两个落盘时刻。写缓存的时机见 tempSave。
   *
   * 键用 route.path：编辑页的 path 含具体 id（/school/elementary/edit/5），
   * 所以不同报名各存各的，不会互相覆盖。
   */
  cacheName.value = route.path
  const cached = getCache(cacheName.value)
  // 本地缓存里是**用户最后看到的**那份内容（不再有定时器，它是上次离开页面时落的那份）。
  // 它可能比服务端草稿新（刚敲完就切走）——下面据此决定要不要让服务端内容盖上来。
  const hadLocalCache = !!cached

  // 关页 / 刷新前的最后一道本地落盘（见 flushLocalCache 的注释）
  window.addEventListener('beforeunload', flushLocalCache)

  if (cfg.mode === 'create') {
    // dist: this.form=this.getCache(this.cacheName);
    //       this.form ? (取回 fileList/fileList1) : (重置 form 与 fileList)
    if (cached) {
      form.value = cached
      fileList.value = cached.fileList ? cached.fileList : []
      fileList1.value = cached.fileList1 ? cached.fileList1 : []
    } else {
      form.value = makeForm()
      fileList.value = []
    }

    // 【dist 的 60 秒本地镜像定时器已删除】原文 this.timer=setInterval(()=>{this.tempSave()},6e4)
    // 现在两个模式都不挂任何定时器，本地镜像只在两个时刻写：关页/切走（见 flushLocalCache
    // 与 onBeforeUnmount），以及用户手点。理由见 tempSave 的注释。

    /*
     * 先认领上一轮留下的草稿指针（切走再回来、刷新页面都算），认领成功就不弹
     * 「检测到您有一份未提交的草稿」—— 那份本来就是用户自己正在填的，弹窗只会打断。
     * 认领失败（从没存过 / 指针已失效 / 这次没拉到）才退回原来的「检测已有草稿」。
     *
     * preserveLocal 与 restoreContent 用的是**同一个判据**：本地有缓存时，
     * 两条路都不能让服务端内容盖掉它，否则「指针丢了但本地有缓存」这种情况下，
     * 用户点一次「继续填写」就会丢掉刚敲的字。
     *
     * 认领是网络请求，所以不 await：它内部已把失败全部吃掉，不会抛到 onMounted 外面。
     */
    resumeDraftSession({ restoreContent: !hadLocalCache }).then((resumed) => {
      if (!resumed) detectExistingDraft({ preserveLocal: hadLocalCache })
    })
  } else {
    /*
     * 编辑页：服务端内容由 enterEdit 负责回填，本地镜像在它**之后**才盖上
     * （顺序反了会被冲掉）。
     *
     * 【原先这里有个 .finally 起 60 秒定时器，已删】当时的顾虑是「表单还是空的时候
     * 先把空表写进缓存」。现在没有任何定时器会自己写缓存，那个顾虑随之消失，所以
     * .finally 整个拿掉 —— 空表只可能被 flushLocalCache / onBeforeUnmount 写进去，
     * 而那两个时刻表单一定已经回填过了。
     */
    enterEdit(hadLocalCache ? cached : null)
  }

  // 【第十二届改造】原 dist 在这里预取七牛 uptoken（getQiniuToken()）。
  // OSS 的 STS 凭证必须按次签发，没有可预取的东西，故删除。
})

// dist: beforeDestroy(){ clearInterval(this.timer) } —— 仅新增页有 beforeDestroy。
// 【第十二届改造】dist 那个 timer 已整体删除，这里只剩 beforeunload 与落盘。
onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', flushLocalCache)
  /*
   * 走 Vue Router 切换页面**不会**触发 beforeunload，所以这里要再补一次落盘 ——
   * 「填着填着切到报名汇总看一眼」走的正是这条路径，不补就等于关了页面才保得住。
   * 放在最末尾：前面的清理都已经做完，此刻落盘拿到的仍是卸载前的内容。
   */
  flushLocalCache()
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

    /*
     * 【合并说明 2026-09-23】这一段曾与 origin/main 冲突，两侧都动了它：
     *   · origin/main 只改了 allPeople 循环里的**注释**，代码一字未动；
     *   · 本分支把整个 allPeople 数组删了（提交体改由 buildDraftPayload 产出，见下方长注释）。
     * 故取本分支版本。origin/main 那段注释的结论（三个计数器是死代码）已被下方
     * 「【第十二届·暂存改造】」长注释与 config/personRules.js 覆盖，信息未丢失。
     */
    if (form.value.teacher && form.value.teacher.length > 3) {
      return ElMessage.error('指导教师最多3人！')
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

    /*
     * 【第十二届·暂存改造】这里原本要手工拼一份提交体 t：
     *     const t = JSON.parse(JSON.stringify(form.value))
     *     t.person = allPeople                    // 教师在前、人员在后
     *     t.spectrum = fileList1.value[0].id
     *     t.file     = fileList.value[0].id
     *     t.time_length = 60*minute + parseInt(second)
     * 现在提交体统一由 src/services/draftPayload.js 的 buildDraftPayload() 产出
     * （规范 §十五/§十六：payload 的组装必须集中在一处），所以 t 及其专用的
     * allPeople 数组已成死代码，连同上面那段 push 循环一并删除。
     *
     * 三者语义逐条对齐，删除不改变任何提交内容：
     *   t.person       ← buildDraftPayload 里 [...teacher.map(), ...person.map()]，同样是教师在前
     *   t.spectrum     ← firstFileId(fileList1)，同样取列表第一项，且**只取 ID**（§十八）
     *   t.file         ← firstFileId(fileList)，同样取列表第一项
     *   t.time_length  ← Number(minute||0)*60 + Number(second||0)，换掉 parseInt 是为了
     *                     second 为空时得到 0 而不是 NaN（NaN 会让后端写库报错）
     * 两个文件列表在 onSubmit 开头已经校验过非空，firstFileId 在这里必然拿到 ID。
     *
     * 【注意】buildDraftPayload 只认 form.teacher / form.person / fileList / fileList1，
     * 因此上面那几行「把子表值同步进 form」的赋值是**必需**的，不能删。
     */

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
      .then(async () => {
        /*
         * 【§十 正式提交】不再直接调 report.create / report.update，改为：
         *     强制最后一次暂存（拿到最新 version）→ 用该 version 提交草稿
         * 这两个动作都在 composable 的 submit() 里按顺序完成，且**排在同一条串行队列上**，
         * 所以不会出现「一次暂存还在飞、提交又发一版」的竞态。
         *
         * 成功分支移动到 onSubmitted（见上面的 useDraftSession 配置），
         * 保证「报名成功 → 清缓存 → 跳报名汇总」这条既有动线一字不变。
         */
        try {
          await submitDraft()
        } catch (err) {
          notifyDraftError(err)
        }
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

/* 上传区（乐团集体电子照 / 上传视频）宽度原本由 #tip 文案长度撑出（shrink-to-fit），
   导致「乐团集体电子照」比「上传视频」宽 13px。撑满内容列后两者完全一致。
   必须用 :deep()：.el-upload 根节点上没有 data-v 属性，裸选择器命中不了。 */
:deep(.upload-demo) {
  width: 100%;
}

/* 【第十二届·暂存】草稿状态文案。四档配色与 statusLevel 一一对应。
   注意"颜色不能是唯一的信息载体"：文案本身（已暂存 / 暂存失败…）已经说明状态，
   颜色只是强化，色盲用户读文字同样能分辨。 */
.draft-status {
  margin-left: 12px;
  font-size: 13px;
  line-height: 32px;
  vertical-align: middle;
}

.draft-status--info {
  color: #909399;
}

.draft-status--success {
  color: #67c23a;
}

.draft-status--warning {
  color: #e6a23c;
}

.draft-status--danger {
  color: #f56c6c;
}
</style>
