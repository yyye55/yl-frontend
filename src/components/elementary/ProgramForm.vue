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
          <!-- ============ 第 1 行：合唱团名称 / 作品总时长 ============ -->
          <el-row :gutter="40">
            <el-col :span="12">
              <el-form-item label="合唱团名称" prop="choir_name">
                <el-input v-model="form.choir_name" placeholder="请输入合唱团名称" />
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

          <!-- ============ 第 2 行：曲目1 ============ -->
          <el-row :gutter="40">
            <el-col :span="8">
              <el-form-item label="曲目1" prop="name1">
                <el-input v-model="form.name1" placeholder="例： 《曲目1》" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="是否为本届展演原创" label-width="140px" prop="origin1">
                <el-radio-group v-model="form.origin1">
                  <el-radio :label="0">是</el-radio>
                  <el-radio :label="1">否</el-radio>
                </el-radio-group>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="是否为中国作品" prop="territory1">
                <el-radio-group v-model="form.territory1">
                  <el-radio :label="0">是</el-radio>
                  <el-radio :label="1">否</el-radio>
                </el-radio-group>
              </el-form-item>
            </el-col>
          </el-row>

          <!-- ============ 第 3 行：曲目2 ============ -->
          <el-row :gutter="40">
            <el-col :span="8">
              <el-form-item label="曲目2(可不填)" prop="name2">
                <el-input v-model="form.name2" placeholder="例： 《曲目2》" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="是否为本届展演原创" label-width="140px" prop="origin2">
                <el-radio-group v-model="form.origin2">
                  <el-radio :label="2">是</el-radio>
                  <el-radio :label="4">否</el-radio>
                </el-radio-group>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="是否为中国作品" prop="territory2">
                <el-radio-group v-model="form.territory2">
                  <el-radio :label="2">是</el-radio>
                  <el-radio :label="4">否</el-radio>
                </el-radio-group>
              </el-form-item>
            </el-col>
          </el-row>

          <!-- ============ 第 4 行：联系人 ============ -->
          <el-row :gutter="40">
            <el-col :span="12">
              <el-form-item label="联系人姓名" prop="contact_name">
                <el-input v-model="form.contact_name" placeholder="填写填报人或者负责人姓名即可" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="联系人电话" prop="contact_phone">
                <el-input v-model="form.contact_phone" placeholder="请输入手机号码" />
              </el-form-item>
            </el-col>
          </el-row>

          <!-- ============ 第 5 行：联系地址 / 表演人数 ============ -->
          <el-row :gutter="40">
            <el-col :span="12">
              <el-form-item label="联系地址" prop="contact_way">
                <el-input v-model="form.contact_way" placeholder="请输入详细地址" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="表演人数" prop="show_number">
                <el-input
                  v-model="form.show_number"
                  type="number"
                  placeholder="表演人数为参展人数总和"
                  oninput="value=value.replace(/\D|^0/g,'')"
                />
              </el-form-item>
            </el-col>
          </el-row>

          <!-- ============ 第 6/7 行：三种形态（见 cfg.lastRow） ============ -->
          <!-- 形态 stage：仅 5382 / 6129。阶段 + 学校名称 同行，伴奏形式 单独一行 -->
          <template v-if="cfg.lastRow === 'stage'">
            <el-row :gutter="40">
              <el-col :span="12">
                <el-form-item label="阶段" prop="group_type">
                  <el-select v-model="form.group_type" placeholder="请选择">
                    <el-option label="小学" :value="0" />
                    <el-option label="中学" :value="1" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="学校名称" prop="school_name">
                  <el-input v-model="form.school_name" placeholder="请填写学校全称" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="40">
              <el-col :span="12">
                <el-form-item label="伴奏形式" prop="accompany">
                  <el-select v-model="form.accompany" placeholder="请选择伴奏形式">
                    <el-option label="无伴奏" :value="0" />
                    <el-option label="钢琴" :value="1" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
          </template>

          <!-- 形态 paired：fbce / 4924 / 60d5 / b202 / aedc / c384 / c589 / 3fb9。
               额外字段 + 伴奏形式 同行。
               【列序】dist 里只有 60d5 / c589（两个校级页）是「伴奏形式 在前、组别 在后」，
               其余 6 个都是「额外字段 在前、伴奏形式 在后」。由 cfg.extraFirst 控制，
               见逐模块位置实测：fbce 所在区县@4720 < 伴奏形式@4988；
               60d5 伴奏形式@4718 < 组别@5064。 -->
          <el-row v-else-if="cfg.lastRow === 'paired'" :gutter="40">
            <template
              v-for="col of cfg.extraFirst === false ? ['accompany', 'extra'] : ['extra', 'accompany']"
              :key="col"
            >
              <el-col v-if="col === 'extra'" :span="12">
                <el-form-item :label="cfg.extra.label" :prop="cfg.extra.prop">
                  <el-select
                    v-if="cfg.extra.kind === 'select'"
                    v-model="form[cfg.extra.prop]"
                    :placeholder="cfg.extra.placeholder"
                  >
                    <el-option
                      v-for="opt in cfg.extra.options"
                      :key="opt.value"
                      :label="opt.label"
                      :value="opt.value"
                    />
                  </el-select>
                  <el-input
                    v-else
                    v-model="form[cfg.extra.prop]"
                    :placeholder="cfg.extra.placeholder"
                  />
                </el-form-item>
              </el-col>
              <el-col v-else :span="12">
                <el-form-item label="伴奏形式" prop="accompany">
                  <el-select v-model="form.accompany" placeholder="请选择伴奏形式">
                    <el-option label="无伴奏" :value="0" />
                    <el-option label="钢琴" :value="1" />
                  </el-select>
                </el-form-item>
              </el-col>
            </template>
          </el-row>

          <!-- 形态 alone：仅 4be7 / 7fcd。伴奏形式 单独一行 -->
          <el-row v-else :gutter="40">
            <el-col :span="12">
              <el-form-item label="伴奏形式" prop="accompany">
                <el-select v-model="form.accompany" placeholder="请选择伴奏形式">
                  <el-option label="无伴奏" :value="0" />
                  <el-option label="钢琴" :value="1" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
        </div>

        <!-- ============ 上传曲谱 ============ -->
        <div class="bg2">
          <el-form-item label="上传曲谱">
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
                  请将曲谱文件整合在一个PDF文件中上传，每个曲谱文件不能超过20M。
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
                <div class="el-upload__tip">{{ videoTip }}</div>
              </template>
            </el-upload>
          </el-form-item>
        </div>

        <!-- ============ 指导教师 / 参展人员 ============ -->
        <div class="bg4">
          <div style="position: relative">
            <div style="font-size: 16px; font-weight: bold">指导教师</div>
            <Teacher ref="teacherRef" :showdata="form.teacher" />
            <div style="font-size: 16px; font-weight: bold">参展人员</div>
            <!--
              【变体选择】dist 里「参展人员」有**两个**不同的 Student 组件，由路由所在模块决定：
                5824（11 列，含「专业名称」，无头像上传）→ /province/school/create · /province/school/edit/:id
                db6d（12 列，含「使用乐器」「电子照片」，有头像上传）→ 其余 10 条路由
              依据：各 dist 模块的 `components:{…Person:<绑定>}` 反解 + 双跑探针实测（见 PersonTableMajor.vue 文件头）。
              用 v-if/v-else 而非 <component :is>：同一时刻只挂载一个，personRef 始终指向存活的那个实例，
              父组件的 getData()/getCacheData() 调用语义不变。
            -->
            <PersonMajor v-if="cfg.person === 'major'" ref="personRef" :showdata="form.person" />
            <Person v-else ref="personRef" :showdata="form.person" />
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
 * ProgramForm —— 「节目报名」表单（Create I / Edit I 共 12 条路由共用）
 *
 * ===========================================================================
 * 一、为什么是一个组件 + 变体表，而不是 12 个页面
 * ===========================================================================
 * 【dist 已确认】dist 里这 12 条路由各自是**一个独立的 chunk**，但把它们逐个 dump 出来
 * 对比后可以确认：12 个模块是**同一份实现**，差异全部收敛为少量「逐路由常量」。
 * 证据：
 *   1. 12 个模块的模板渲染函数结构逐节点一致（仅第 6/7 行与文案常量不同）；
 *   2. 12 个模块的 scoped 样式完全相同的 6 条规则：
 *        .bg / .title / .title:before{background-color:#036} / .title span / .request
 *        @media screen and (min-width:1500px){ .bg{width:70%;padding:10px 20px;margin:auto} }
 *      作用域 id 各不相同（5419c2d2 / 17ee1557 / 5569b027 / 46cab5de / d9af0b18 / 56759476 /
 *      c01ac1ca / 6517e16c / 08bfacac / 35715e31 / 40db777a / 0fd36fd0），但规则内容逐字节相同；
 *   3. rules 的**基础 10 个键**（choir_name / name / name1 / name2 / contact_name /
 *      contact_phone / contact_way / minute / show_number / accompany）在 12 个模块中逐字相同，
 *      连自定义 validator 的报错文案都一样。
 * 因此这里保留**唯一的模板实现**，逐路由差异集中到下方 VARIANTS 表。
 * 21 个路由文件与路由表本身保持不变（各自仍是一个独立的 .vue）。
 *
 * 本组件对应的是「节目报名 / 节目修改」这一形态（Create I / Edit I）。名字里不含 elementary
 * 只是因为这一族里首个被还原的是它；实际同时服务于 province/city/school 三个作用域。
 *
 * ===========================================================================
 * 二、逐路由差异表（全部来自 dist 原文，未做推断）
 * ===========================================================================
 * | 路由 | dist 模块 | 标题 | create/getById/update | lastRow | 额外字段 | 视频必填 | t.file 守卫 | 四川句 | 提交后跳转 |
 * |---|---|---|---|---|---|---|---|---|---|
 * | /province/elementary/create | 5382 | 中小学组节目报名 | province/-/- | stage | 阶段+学校名称 | N | Y | Y | /province/report/list 节目报名统计 |
 * | /province/teacher/create | fbce | 中小学教师组节目报名 | province/-/- | paired | 所在区县 district_name | N | Y | Y | 同上 |
 * | /province/teacher1/create | 4924 | 高校教师组节目报名 | province/-/- | paired | 高校名称 school_name | N | Y | Y | 同上 |
 * | /province/school/create | 60d5 | 大学组节目报名 | province/-/- | paired | 组别 tranches(专业组0/非专业组1) | Y | Y | Y | 同上 |
 * | /city/teacher/create | b202 | 教师组节目报名 | city/-/- | paired | 所在区县 district_name | Y | N | N | /city/teacher/list 教师组报名统计 |
 * | /school/teacher/create | 4be7 | 高校教师组节目报名 | school/-/- | alone | 无 | Y | N | N | /school/teacher/list 高校教师组报名统计 |
 * | /province/elementary/edit/:id | 6129 | 中小学组节目修改 | -/province/province | stage | 阶段+学校名称 | N | Y | N | 无 |
 * | /province/teacher/edit/:id | aedc | 中小学教师组节目修改 | -/province/**city** | paired | 所在区县 | N | Y | N | 无 |
 * | /province/teacher1/edit/:id | c384 | 高校教师组节目修改 | -/province/**city** | paired | 高校名称 | N | Y | N | 无 |
 * | /province/school/edit/:id | c589 | 大学组节目修改 | -/province/province | paired | 组别 tranches | N | Y | N | 无 |
 * | /city/teacher/edit/:id | 3fb9 | 中小学教师组节目修改 | -/city/city | paired | 所在区县 | Y | N | N | 无 |
 * | /school/teacher/edit/:id | 7fcd | 高校教师组节目修改 | -/school/school | alone | 无 | Y | N | N | 无 |
 *
 * 【注意】编辑页标题与对应的新增页标题**并不一致**，这是 dist 原文，照搬不改：
 *   fbce 新增=「中小学教师组节目报名」→ aedc 编辑=「中小学教师组节目修改」
 *   b202 新增=「教师组节目报名」    → 3fb9 编辑=「中小学教师组节目修改」
 *
 * 【注意】新增页与编辑页的「四川省以外的节目报送请联系技术支持人员。」只出现在**新增**页的
 * 视频提示里，编辑页没有这句（已对 12 个模块的两个 el-upload__tip 逐条比对）。
 *
 * ===========================================================================
 * 三、dist 已知缺陷 / 本轮已修复
 * ===========================================================================
 * 【高·影响用户操作】【本轮已修复】aedc / c384 的提交走的不是 province 而是 **city**：
 *     原 dist: aedc: this.$api.province.report.getById(...) + this.$api.city.report.update(t)
 *              c384: this.$api.province.report.getById(...) + this.$api.city.report.update(t)
 *   后端（yilinbei/apps/api/views.py:49 role_error）对角色做**严格相等**判定：
 *     register_scope_routes("/city",   1)   ->  /api/city/report/update   要求 user.type == 1
 *     register_scope_routes("/province", 4) ->  /api/province/report/update 要求 user.type == 4
 *   省级账号的 type 是 4，访问 /api/city/report/update 会得到 403
 *   {"error":"无该页面操作权限！"}，即**省级的「中小学教师组 / 高校教师组」编辑提交必然失败**。
 *   现象：页面能打开（getById 走 province，正常返回），表单能填，点「立即修改」后无成功提示。
 *
 *   【本轮修复】证据：
 *     - 后端 /api/province/report/update 接口在 dist 的 api/province.js 中已注册（PUT），是 dist 写错了。
 *     - 已在 VARIANTS 配置中将 aedc / c384 两条路由的 api.update 由 'city' 改为 'province'。
 *     - 仍按 dist 行为 getById 走 province。
 *
 * 【中·影响真实后端数据】3fb9 / 7fcd（city、school 的编辑页）的 name1/name2/origin1/origin2
 *   取不到值。原因：后端只有 province 分支会把 name 拆成 name1/name2 并映射 origin/territory
 *   （views.py:718 `if province:` + `_map_pair`），city/school 的 getById 返回的是 report_dict 原样。
 *   而 Report 模型**确实有 name1 列、没有 name2 列**，所以编辑页上「曲目2」必为空；
 *   若用户填了曲目2提交，onSubmit 会执行
 *       t.name = this.form.name1 + "+" + this.form.name2
 *   得到字面量 "undefined+曲目2" 并写库（name 是 NOT NULL 列，会被真正覆盖）。
 *   本组件不动这段逻辑。
 *
 * 【中】编辑页的「表演人数」永远需要重填：show_number 不是 Report 的列
 *   （models.py Report 的字段里没有 show_number），后端 create/update 都会把它丢弃
 *   （views.py:104 `payload = {k:v for k,v in data.items() if k in values}`），
 *   于是 getById 回来后 form.show_number 是 undefined，
 *   onSubmit 里 `Number(this.form.show_number) !== this.form.person.length` 恒为真，
 *   只要人员列表非空就会被「演出人数和填报人数不符!」拦下，必须手动再填一次。
 *
 * 【中】编辑页的视频文件永远回显不出来：
 *     getMessage(): r.file && r.file.length > 0 && this.fileList.push(...)
 *   后端 report_dict 把 file 序列化成**对象**（services.py:151
 *   `result["file"] = model_dict(Files.objects.filter(pk=report.file).first())`），
 *   对象的 .length 是 undefined，条件恒假 —— 已上传的视频不会进入 fileList。
 *   又因为编辑页的 t.file 带 `this.fileList && this.fileList.length > 0 &&` 守卫，
 *   不选新文件就不会覆盖后端已有的 file，所以**不会丢数据**，只是看不见、也删不掉。
 *
 * 【低】60d5 / c589 的 rules 里有一条 `group_type`、4be7 的 rules 里有一条 `district_name`，
 *   但这两个模块的模板里**没有对应的 el-form-item**（60d5 无「阶段」项，4be7 无「区县」项）。
 *   孤立规则不影响任何渲染或校验，本组件按原样保留键，不做删改。
 *
 * 【低】uploadFile / uploadFile1 里 qiniu.upload(...) 被调用了**两次**，第二次的返回值被丢弃、
 *   也没有 subscribe，因此不产生第二个请求。本组件按「一次上传」实现，可观测行为与原版一致。
 *
 * 【低】mounted 无缓存时把 this.form 整体替换为一个**不含 type 字段**的新对象
 *   （data() 里声明的是 form:{type:0,...}），所以 create 提交的 payload 里没有 type。
 *   因为 Report 模型本身没有 type 列，后端会忽略它，故无实际影响。本组件照搬该行为。
 *
 * ===========================================================================
 * 四、Vue 2 -> Vue 3 / Element UI -> Element Plus 的逐项迁移说明
 * ===========================================================================
 * 1) `this.$set(o,k,v)` -> `o[k]=v`
 *    Vue 3 的 Proxy 响应式不需要 $set。语义等价，非行为改变。
 *
 * 2) `this.$refs.second.value` -> 直接读 `form.second`
 *    Element UI 的 ElInput 有 `value` prop（v-model 绑的就是它），所以
 *    `this.$refs.second.value` 读到的其实是**组件绑定的值**。
 *    Element Plus 把该 prop 改名为 `modelValue`，`$refs.second.value` 会变成 undefined。
 *    因此改用 v-model 绑定的 `form.second`，取到的值与 dist 完全相同。
 *    （分钟/秒的校验函数 `minuteValidator` 就用它。）
 *
 * 3) `slot="tip"` -> `<template #tip>`；`:file-list` -> `v-model:file-list`
 *    前者是 Vue 3 的具名插槽语法；后者与项目已有的 UploadScanDialog.vue 同一处理：
 *    Element Plus 的 el-upload 会用 useVModel(props,"fileList",…,{passive:true}) 管理列表并在
 *    选择文件时整体替换数组，沿用单向 :file-list 会得到重复条目。
 *
 * 4) `<i class="el-icon-upload">` -> `<el-icon class="el-icon--upload"><UploadFilled /></el-icon>`
 *    Element Plus 移除了 el-icon-* 字体图标。`el-icon--upload` 样式类由 Element Plus 自身提供。
 *
 * 5) `beforeDestroy` -> `onBeforeUnmount`
 * 6) `this.$route.path` -> `useRoute().path`
 * 7) `Message/MessageBox` -> `ElMessage/ElMessageBox`
 * 8) `this.$refs.form.validate(cb)` -> `formRef.value.validate(cb)`
 *    Element Plus 的 validate 同样接受回调，回调签名 (valid, fields) 与原版 (valid) 的
 *    第一参数语义一致。
 * 9) `getM/getS` 原挂在 Vue.prototype 上，这里从 @/utils/date 具名导入（与 ShowContent.vue 一致）。
 *
 * 【保留未改】`size="mini"`：Element Plus 只认 large/default/small，"mini" 会静默回退到 default。
 * 本项目已决定本轮保持与 dist 逐字一致，留到设计系统轮统一处理。
 *
 * 【保留未改】`oninput="value=value.replace(...)"`：这是 dist 原文，作用是在**原生 input** 上
 * 过滤非数字字符。Vue 3 对字面量 `on*` 属性的编译行为与 Vue 2 不同，本组件保持原文，
 * 其实际效果在浏览器中验证（见本轮报告的验证小节）。
 */
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { UploadFilled } from '@element-plus/icons-vue'
import { upload } from 'qiniu-js'

import { provinceApi } from '@/api/province'
import { cityApi } from '@/api/city'
import { schoolApi } from '@/api/school'
import { fileApi, qiniuApi } from '@/api/misc'
import { addCache, getCache, clearCache } from '@/utils/auth'
import { getM, getS } from '@/utils/date'
import { rename } from '@/utils/excel'
import { useTabs } from '@/composables/useTabs'

import Teacher from './TeacherTable.vue'
import Person from './PersonTable.vue'
import PersonMajor from './PersonTableMajor.vue'
import FileCover from '@/components/common/FileCover.vue'
import HaveToRead from '@/components/common/HaveToRead.vue'

/** dist 里三个作用域各自一个 api 模块；dist 通过 this.$api.<scope>.report.* 访问 */
const MODULES = { province: provinceApi, city: cityApi, school: schoolApi }

/* =========================================================================
 * 逐路由变体表 —— 本组件的唯一事实来源，每一项都对应 dist 原文
 * ========================================================================= */
const VARIANTS = {
  /* ---------------- 新增（Create I） ---------------- */
  '/province/elementary/create': {
    mode: 'create', title: '中小学组节目报名',
    api: { create: 'province' },
    formInit: { group: 0, group_type: 0 },
    submitGroup: 0,
    lastRow: 'stage',
    rulesExtra: ['school_name', 'group_type'],
    requireVideo: false, guardFile: true, sichuan: true,
    redirect: { path: '/province/report/list', label: '节目报名统计' }
  },
  '/province/teacher/create': {
    mode: 'create', title: '中小学教师组节目报名',
    api: { create: 'province' },
    formInit: { group: 2, group_type: 3 },
    submitGroup: 2,
    lastRow: 'paired',
    extra: { label: '所在区县', prop: 'district_name', placeholder: '请填写区县全称', kind: 'input' },
    rulesExtra: ['district_name'],
    requireVideo: false, guardFile: true, sichuan: true,
    redirect: { path: '/province/report/list', label: '节目报名统计' }
  },
  '/province/teacher1/create': {
    mode: 'create', title: '高校教师组节目报名',
    api: { create: 'province' },
    formInit: { group: 3, group_type: 3 },
    // 【dist 原文】4924 在曲目2 分支里 $set(t,"group",2)，与其 form 初值 group:3 不同。
    // 属 dist 自身的不一致，按原样保留（见报告）。
    submitGroup: 2,
    lastRow: 'paired',
    extra: { label: '高校名称', prop: 'school_name', placeholder: '请填写高校全称', kind: 'input' },
    rulesExtra: ['school_name'],
    requireVideo: false, guardFile: true, sichuan: true,
    redirect: { path: '/province/report/list', label: '节目报名统计' }
  },
  '/province/school/create': {
    mode: 'create', title: '大学组节目报名',
    api: { create: 'province' },
    formInit: { group: 1, group_type: 2, tranches: 0 },
    submitGroup: 1,
    submitGroupType: 2,
    lastRow: 'paired',
    // 【列序】60d5 是 8 个 paired 变体里仅有的两个「伴奏形式 在前、组别 在后」之一（另一个是 c589）
    extraFirst: false,
    // 【参展人员表】60d5 绑的是 dist 模块 5824（11 列含「专业名称」），不是 db6d
    person: 'major',
    extra: {
      label: '组别', prop: 'tranches', placeholder: '请选择组别', kind: 'select',
      options: [{ label: '专业组', value: 0 }, { label: '非专业组', value: 1 }]
    },
    // 60d5 的 rules 里还有 school_name 与 group_type 两个**孤立键**（无对应表单项），按原样保留
    rulesExtra: ['school_name', 'tranches', 'group_type'],
    requireVideo: true, guardFile: true, sichuan: true,
    redirect: { path: '/province/report/list', label: '节目报名统计' }
  },
  '/city/teacher/create': {
    mode: 'create', title: '教师组节目报名',
    api: { create: 'city' },
    formInit: { group: 2, group_type: 3 },
    submitGroup: 2,
    lastRow: 'paired',
    extra: { label: '所在区县', prop: 'district_name', placeholder: '请填写区县全称', kind: 'input' },
    rulesExtra: ['district_name'],
    requireVideo: true, guardFile: false, sichuan: false,
    redirect: { path: '/city/teacher/list', label: '教师组报名统计' }
  },
  '/school/teacher/create': {
    mode: 'create', title: '高校教师组节目报名',
    api: { create: 'school' },
    formInit: { group: 3, group_type: 3 },
    submitGroup: 3,
    lastRow: 'alone',
    // 4be7 无额外字段，但 rules 里有一条孤立的 district_name，按原样保留
    rulesExtra: ['district_name'],
    requireVideo: true, guardFile: false, sichuan: false,
    redirect: { path: '/school/teacher/list', label: '高校教师组报名统计' }
  },

  /* ---------------- 编辑（Edit I） ---------------- */
  '/province/elementary/edit/:id': {
    mode: 'edit', title: '中小学组节目修改',
    api: { getById: 'province', update: 'province' },
    formInit: { group: 0, group_type: 0 },
    lastRow: 'stage',
    rulesExtra: [],
    requireVideo: false, guardFile: true, sichuan: false
  },
  '/province/teacher/edit/:id': {
    mode: 'edit', title: '中小学教师组节目修改',
    // 【重建阶段修复 / 业务缺陷】dist 原版 getById 走 province、update 却走 city，导致 type=4 的省级账号提交得到 403。
    //   - /api/province/report/update 接口在后端存在（dist/app.js 中已注册），是 dist 自己写错了。
    //   - 改为 province/province。
    api: { getById: 'province', update: 'province' },
    formInit: { group: 2, group_type: 3 },
    lastRow: 'paired',
    extra: { label: '所在区县', prop: 'district_name', placeholder: '请填写区县全称', kind: 'input' },
    rulesExtra: [],
    requireVideo: false, guardFile: true, sichuan: false
  },
  '/province/teacher1/edit/:id': {
    mode: 'edit', title: '高校教师组节目修改',
    // 【重建阶段修复 / 业务缺陷】同上，dist 写错了 city → 改回 province。
    api: { getById: 'province', update: 'province' },
    formInit: { group: 2, group_type: 3 },
    lastRow: 'paired',
    extra: { label: '高校名称', prop: 'school_name', placeholder: '请填写高校全称', kind: 'input' },
    rulesExtra: [],
    requireVideo: false, guardFile: true, sichuan: false
  },
  '/province/school/edit/:id': {
    mode: 'edit', title: '大学组节目修改',
    api: { getById: 'province', update: 'province' },
    formInit: { group: 1, group_type: 2 },
    lastRow: 'paired',
    // 同 60d5：c589 也是「伴奏形式 在前、组别 在后」，参展人员表也是 5824
    extraFirst: false,
    person: 'major',
    extra: {
      label: '组别', prop: 'tranches', placeholder: '请选择组别', kind: 'select',
      options: [{ label: '专业组', value: 0 }, { label: '非专业组', value: 1 }]
    },
    rulesExtra: [],
    requireVideo: false, guardFile: true, sichuan: false
  },
  '/city/teacher/edit/:id': {
    mode: 'edit', title: '中小学教师组节目修改',
    api: { getById: 'city', update: 'city' },
    formInit: { group: 2, group_type: 3 },
    lastRow: 'paired',
    extra: { label: '所在区县', prop: 'district_name', placeholder: '请填写区县全称', kind: 'input' },
    rulesExtra: [],
    requireVideo: true, guardFile: false, sichuan: false
  },
  '/school/teacher/edit/:id': {
    mode: 'edit', title: '高校教师组节目修改',
    api: { getById: 'school', update: 'school' },
    formInit: { group: 3, group_type: 3 },
    lastRow: 'alone',
    rulesExtra: [],
    requireVideo: true, guardFile: false, sichuan: false
  }
}

const props = defineProps({
  /**
   * 变体键。取值为路由 name（例如 '/province/elementary/create'）。
   * 由各路由的薄封装页显式传入，避免组件去猜自己的身份。
   */
  variant: { type: String, required: true }
})

const cfg = VARIANTS[props.variant]
if (!cfg) {
  // 早失败：拼错 variant 时立刻暴露，而不是渲染出一个空白表单
  throw new Error(`[ProgramForm] 未知变体：${props.variant}`)
}

const route = useRoute()

/* ------------------------- 上传相关（dist data） ------------------------- */
const QiniuData = reactive({ token: '', key: 'ylbxt/' })
const domain = 'https://upload.qiniup.com'
const host = 'https://img.atyth.com/'
const filename = ref('')
const fileList = ref([]) // 视频
const fileList1 = ref([]) // 曲谱

const formRef = ref(null)
const secondRef = ref(null)
const teacherRef = ref(null)
const personRef = ref(null)
const fileshowRef = ref(null)

/* ------------------------- 表单模型 ------------------------- */
/**
 * dist 的 data() 里 form 的声明值是 {type:0,read:!1,...}，但 mounted 会在无缓存时把整个
 * form 换成一个**不含 type** 的对象。这里让初值就等于「mounted 之后的值」，渲染结果一致，
 * 且避免出现一个永远不会被提交的 type 字段。
 */
function makeForm() {
  const base = {
    read: false,
    group: cfg.formInit.group,
    group_type: cfg.formInit.group_type,
    origin: 0,
    territory: 0,
    minute: 0,
    second: 0,
    origin1: 0,
    territory1: 0,
    accompany: 0
  }
  // 仅 60d5 的缓存初值里带 tranches:0
  if (cfg.formInit.tranches !== undefined) base.tranches = cfg.formInit.tranches
  return base
}

const form = ref(makeForm())

/* ------------------------- 校验规则 ------------------------- */
/**
 * dist 的三个自定义 validator，逐字照搬（含报错文案与判定顺序）。
 * 它们的差别只在读取「秒」的来源：dist 用 this.$refs.second.value，
 * 这里用 v-model 绑定的 form.second（见文件头迁移说明 2）。
 */
function nameValidator(rule, value, callback) {
  if (!(value.charAt(0) === '《' && value.charAt(value.length - 1) === '》')) {
    callback(new Error('名称需加《》'))
  }
  callback()
}

function minuteValidator(rule, value, callback) {
  const second = form.value.second
  if (value === '') callback(new Error('请输入分钟数'))
  if (second === '') callback(new Error('请输入秒数'))
  if (!/^[0-9]\d*$/.test(value)) callback(new Error('分钟数只能是正整数'))
  if (!/^[0-9]\d*$/.test(second)) callback(new Error('秒数只能是正整数'))
  if (value > 8 || (Number(value) === 8 && second > 0)) {
    callback(new Error('每支队伍展演总时长8分钟以内'))
  }
  if (second > 60 || second < 0) callback(new Error('秒数只能在0-60之间'))
  if (value > 60 || value < 0) callback(new Error('分钟数只能在0-60之间'))
  callback()
}

function numberValidator(rule, value, callback) {
  if (value > 60 || value < 40) {
    callback(new Error('每支队伍人数为40-60人，包含指挥与伴奏！'))
  }
  callback()
}

/** 12 个模块共有的基础 10 条（键名与内容逐字一致） */
function buildRules() {
  const base = {
    choir_name: [
      { required: true, message: '请输入合唱团名称名称', trigger: 'blur' },
      { min: 1, max: 100, message: '长度在 1 到 30 个字符', trigger: 'blur' }
    ],
    name: [
      { required: true, message: '请输入曲目名称', trigger: 'blur' },
      { min: 1, max: 100, message: '长度在 1 到 100 个字符', trigger: 'blur' },
      { required: true, validator: nameValidator, trigger: 'blur' }
    ],
    name1: [
      { required: true, message: '需填写一首曲目', trigger: 'blur' },
      { min: 1, max: 100, message: '长度在 1 到 100 个字符', trigger: 'blur' },
      { required: true, validator: nameValidator, trigger: 'blur' }
    ],
    name2: [{ min: 1, max: 100, message: '长度在 1 到 100 个字符', trigger: 'blur' }],
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
    show_number: [
      { required: true, message: '请输入参演人数 ', trigger: 'blur' },
      { required: true, validator: numberValidator, trigger: 'blur' }
    ],
    accompany: [{ required: true, message: '请选择伴奏类型', trigger: 'blur' }]
  }

  /** 各变体额外的（或孤立的）规则，文案逐字取自对应模块 */
  const extras = {
    school_name: [
      { required: true, message: '请输入学校名称 ', trigger: 'blur' },
      { min: 1, max: 100, message: '长度在 1 到 100 个字符', trigger: 'blur' }
    ],
    district_name: [
      { required: true, message: '请输入区县名称 ', trigger: 'blur' },
      { min: 1, max: 100, message: '长度在 1 到 100 个字符', trigger: 'blur' }
    ],
    tranches: [{ required: true, message: '请选择组别', trigger: 'blur' }],
    group_type: [{ required: true, message: '请选择学校类型 ', trigger: 'blur' }]
  }

  const rules = { ...base }
  for (const key of cfg.rulesExtra) rules[key] = extras[key]
  return rules
}

const rules = reactive(buildRules())

/** 视频提示文案：新增页（province）比其余多最后一句「四川省以外的节目报送…」 */
const videoTip = computed(() => {
  const base =
    '视频录制采用MPG2或MP4格式（压缩带宽不低于10M，分辨率1920×1080），使用固定机位正面全景录制，' +
    '声音和图像需同期录制，不得后期配音合成。每个节目视频文件大小不超过1G，' +
    '并以“节目名称-合唱团名称（组别）”命名。'
  return cfg.sichuan ? base + '四川省以外的节目报送请联系技术支持人员。' : base
})

/* ------------------------- 上传逻辑（逐行照搬 dist） ------------------------- */

/** dist: getQiniuToken(){ this.$api.communal.getQiNiuToken().then(({data:e})=>{0===e.code?…:…}) } */
function getQiniuToken() {
  qiniuApi.getToken().then(({ data: res }) => {
    if (res.code === 0) QiniuData.token = res.uptoken
    else ElMessage.error(res.msg)
  })
}

/**
 * dist:
 *   beforeUpload(e){
 *     this.QiniuData.token||this.getQiniuToken(), this.QiniuData.key="ylbxt/",
 *     this.filename=e.name, this.QiniuData.key+=this.rename(e.name);
 *     const t=e.size/1024/1024<1024, n="video/mpeg"===e.type||"video/mp4"===e.type;
 *     return n ? (t ? void 0 : (Message.error("文件大小不能超过1G"),!1))
 *              : (Message.error("请上传 MP4 或 MPG2 格式的视频文件"),!1)
 *   }
 * 【保留 dist 缺陷】QiniuData.key 是**累加**（只有 uploadSuccess 才把它重置回 "ylbxt/"），
 * 与 UploadScanDialog.vue 里记录的是同一处问题，此处照搬不改。
 */
function beforeUpload(file) {
  if (!QiniuData.token) getQiniuToken()
  QiniuData.key = 'ylbxt/'
  filename.value = file.name
  QiniuData.key += rename(file.name)

  const sizeOk = file.size / 1024 / 1024 < 1024
  const isVideo = file.type === 'video/mpeg' || file.type === 'video/mp4'

  if (!isVideo) {
    ElMessage.error('请上传 MP4 或 MPG2 格式的视频文件')
    return false
  }
  if (!sizeOk) {
    ElMessage.error('文件大小不能超过1G')
    return false
  }
  return undefined
}

/** dist beforeUpload1：曲谱，仅 pdf、<20M */
function beforeUpload1(file) {
  if (!QiniuData.token) getQiniuToken()
  QiniuData.key = 'ylbxt/'
  filename.value = file.name
  QiniuData.key += rename(file.name)

  const sizeOk = file.size / 1024 / 1024 < 20
  const isPdf = file.type === 'application/pdf'

  if (!isPdf) {
    ElMessage.error('请上传 PDF 文件')
    return false
  }
  if (!sizeOk) {
    ElMessage.error('文件大小不能超过20M')
    return false
  }
  return undefined
}

/** dist: uploadSuccess(e,t){} —— 空实现（Element Plus 下 el-upload 自行维护 fileList，同样无需处理） */
function uploadSuccess() {}
function uploadSuccess1() {}

/**
 * dist uploadFile / uploadFile1 的公共部分（两者除写入的 fileList 外逐字相同）。
 * dist 原文在末尾重复调用了第二次 qiniu.upload(...) 且未 subscribe，不产生额外请求，
 * 故这里只保留实际生效的那一次（可观测行为一致，见文件头第三节）。
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
          tempSave()
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
 *         r.file && r.file.length>0 && this.fileList.push({id:r.file.id,name:r.file.filename,url:r.file.url});
 *         this.fileList1.push({id:r.spectrum.id,name:r.spectrum.filename,url:r.spectrum.url});
 *         const i=r.person;
 *         i.length>0 && (i.forEach(e=>{ e.person_info={...e.person_info,type:e.type,position:e.position},
 *            1===e.type&&4===e.position ? n.push(e.person_info) : t.push(e.person_info)}),
 *           this.form.person=t, this.form.teacher=n)
 *       } else Message.error(...)
 *     })
 *   }
 * 【保留 dist 缺陷】`r.file.length>0` 中 file 是对象，条件恒假 —— 见文件头第三节。
 * 【保留 dist 缺陷】`r.spectrum.id` 无守卫，spectrum 为空时会抛错（新增时曲谱必填，正常数据不会触发）。
 */
function getMessage() {
  const mod = MODULES[cfg.api.getById]
  mod.report.getById(route.params.id).then((res) => {
    if (res.data.code === 0) {
      const teachers = []
      const persons = []
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
      if (r.file && r.file.length > 0) {
        fileList.value.push({ id: r.file.id, name: r.file.filename, url: r.file.url })
      }
      fileList1.value.push({ id: r.spectrum.id, name: r.spectrum.filename, url: r.spectrum.url })

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
    cacheName.value = route.path
    const cached = getCache(cacheName.value)
    if (cached) {
      // 【已知偏差】草稿里保存的是普通对象/数组；dist 直接 this.form=cached。
      // 这里同样整体替换，保留 cache 中的 fileList/fileList1 供上传组件回显。
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

// dist: beforeDestroy(){ clearInterval(this.timer) }
onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})

/* ------------------------- 提交 ------------------------- */

/**
 * dist onSubmit()，逐行照搬（新增页与编辑页只在三处不同，见下方注释）：
 *   create: $set(t,"group",N)（+ 60d5 的 $set(t,"group_type",2)）、成功后 clearCache + 重置 + 跳转
 *   edit  : 无 $set、成功后只 Message.success(e.msg)
 * 其余（校验顺序、三条自定义校验、曲目1/曲目2 分支、payload 组装）在 12 个模块中完全一致。
 */
function onSubmit() {
  formRef.value.validate((valid) => {
    if (!valid) return ElMessage.error('请检查数据完整性！')

    if (!personRef.value.getData() || !teacherRef.value.getData()) return false
    form.value.person = personRef.value.getData()
    form.value.teacher = teacherRef.value.getData()

    if (fileList1.value && fileList1.value.length === 0) return ElMessage.error('未上传曲谱')
    // 仅 60d5 / b202 / 4be7 / 3fb9 / 7fcd：视频必填
    if (cfg.requireVideo && fileList.value && fileList.value.length === 0) {
      return ElMessage.error('未上传视频')
    }

    const allPeople = []
    if (form.value.person && form.value.person.length > 0) {
      form.value.person.forEach((p) => allPeople.push(p))
    }
    if (form.value.teacher && form.value.teacher.length > 0) {
      if (form.value.teacher.length > 3) return ElMessage.error('指导教师最多3人！')
      form.value.teacher.forEach((t) => allPeople.push(t))
    }

    if (Number(form.value.show_number) !== form.value.person.length) {
      return ElMessage.error('演出人数和填报人数不符!'), false
    }

    if (form.value.person === undefined) form.value.person = []
    if (form.value.teacher === undefined) form.value.teacher = []

    const t = JSON.parse(JSON.stringify(form.value))
    t.person = allPeople
    t.spectrum = fileList1.value[0].id
    // province 系（guardFile=true）带守卫；city/school 系无守卫，但已由 requireVideo 保证非空
    if (cfg.guardFile) {
      if (fileList.value && fileList.value.length > 0) t.file = fileList.value[0].id
    } else {
      t.file = fileList.value[0].id
    }
    t.time_length = 60 * form.value.minute + parseInt(form.value.second)

    if (form.value.name2 === undefined || form.value.name2 === '') {
      // ---- 只有一首曲目 ----
      if (form.value.territory1 !== 0) return ElMessage.error('曲目中需含有一首中国作品!'), false
      t.name = form.value.name1
      t.origin = form.value.origin1
      t.territory = form.value.territory1
    } else {
      // ---- 两首曲目 ----
      if (
        form.value.name2.charAt(0) !== '《' ||
        form.value.name2.charAt(form.value.name2.length - 1) !== '》'
      ) {
        return ElMessage.error('曲目2名称需加《》'), false
      }
      if (form.value.origin2 === undefined || form.value.origin2 === '') {
        return ElMessage.error('曲目2是否为本届原创需选择!'), false
      }
      if (form.value.territory2 === undefined || form.value.territory2 === '') {
        return ElMessage.error('曲目2是否中国作品需选择!'), false
      }
      if (form.value.territory1 === 1 && form.value.territory2 === 4) {
        return ElMessage.error('曲目中需含有一首中国作品!'), false
      }
      t.name = form.value.name1 + '+' + form.value.name2
      t.origin = Number(form.value.origin1) + Number(form.value.origin2)
      t.territory = Number(form.value.territory1) + Number(form.value.territory2)
      // 仅新增页会在此处回写 group（60d5 还回写 group_type）；编辑页 12 个模块中均无此语句
      if (cfg.submitGroup !== undefined && cfg.submitGroup !== null) {
        t.group = cfg.submitGroup
      }
      if (cfg.submitGroupType !== undefined && cfg.submitGroupType !== null) {
        t.group_type = cfg.submitGroupType
      }
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
            //   this.openWindow("/province/report/list","节目报名统计")
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
/* 照搬 dist：12 个模块的 scoped 样式逐字节相同（作用域 id 各异），
   出处例如 chunk-2453c214 的 [data-v-5419c2d2] */
.bg {
  width: 100%;
  padding: 10px 0;
}

.title {
  font-size: 20px;
  font-weight: 700;
  padding-left: 10px;
  position: relative;
}

.title:before {
  content: '';
  display: inline-block;
  width: 4px;
  height: 20px;
  background-color: #036;
  margin-right: 10px;
  vertical-align: middle;
}

.title span {
  font-size: 14px;
  font-weight: 400;
  color: #999;
  margin-left: 10px;
}

.request {
  color: red;
}

@media screen and (min-width: 1500px) {
  .bg {
    width: 70%;
    padding: 10px 20px;
    margin: auto;
  }
}
</style>
