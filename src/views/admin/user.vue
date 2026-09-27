<template>
  <div class="bg">
    <div class="options">
      <el-input
        v-model="keyword"
        class="input-with-select"
        placeholder="请输入内容"
        @change="getData"
      >
        <template #append>
          <el-button><el-icon><Search /></el-icon></el-button>
        </template>
      </el-input>
      <!--
        类型筛选。
        【选项为什么只有 0/1/5 三个】后端 user_list 先卡死展示范围
        type__in=(0,1,5)（学校端 / 市州端 / 中小学端），再把 type 作为 AND 条件叠加上去
        （apps/api/views.py 的 user_list）。所以传 2/3/4 一定返回空表 ——
        下拉里摆组委会(2)/管理员(3)/省级(4)，等于给用户一个必然筛不出东西的按钮，
        他筛出空表只会当成 bug 报上来。干脆不给选项。
        【:value 前面那个冒号不能省】绑的是数字 0/1/5，不是字符串 '0'/'1'/'5'，
        与「添加账号」弹窗里选类型的写法一致（理由见那里）。
        后端拿到的是字符串，但它做了 int() 转换，所以这里数字字符串都筛得对。
        【"全部类型"绑空串】与 ref 初值 '' 保持同一种值，不会出现 null 和 '' 两种空值并存；
        空串属于"没选"，getData 里会整个 key 都不发出去。
        【宽度写在 <style> 里】不在标签上写 style="width:..."，
        与相邻的 .el-input 同一套写法。
        【为什么名字都带 filter —— 不叫 type / onTypeChange】本页已经有一个
        onTypeChange（在「添加用户」弹窗里给「可报两支」勾选框做联动，形参是一个对象）。
        重名会直接撞上：el-select 的 @change 传进来的是**选中的值**（0/1/5/''），
        而那个函数里有一句 `target.can_report_twice = false` —— 往数字上写属性，
        严格模式（ES module 恒为严格模式）必抛 TypeError（三种取值都验过）。
        症状不是白屏：Vue 3 把事件处理器包在 callWithAsyncErrorHandling 里，
        错误被 handleError 接住、走默认的 console.error（本项目 main.js 没配
        app.config.errorHandler），所以页面照常渲染 —— 只是 @change 里那句
        getData() 永远走不到，表现为「点了下拉列表没反应」。
        这比白屏更难查：用户会以为没点中，反复点几次然后放弃。
        同理 `type` 这个变量名也太泛，加 filter 前缀与业务里的 form.type / row.type 分开。
      -->
      <el-select v-model="filterType" placeholder="全部类型" @change="onFilterTypeChange">
        <el-option label="全部类型" :value="''" />
        <el-option label="学校端" :value="0" />
        <el-option label="市州端" :value="1" />
        <el-option label="中小学端" :value="5" />
      </el-select>
      <el-button type="primary" @click="reflush"> 刷新 </el-button>
      <el-button type="primary" @click="add"> 添加账号 </el-button>
      <el-button type="primary" @click="download('账号列表')"> 导出所有账号 </el-button>
    </div>

    <div class="content">
      <div class="bg-list">
        <p class="title">账号列表</p>

        <!--
          【本仓库新增，dist 无】重置密码的默认口径提示，与组委会端 /committee/user 同一句话。
          与组委会端不同的是：那边这句是「提醒操作者去填这个值」（后端当时不套用默认密码），
          这边这句现在**就是系统行为** —— user_update_admin 无条件重置为 DEFAULT_PASSWORD。
          值本身来自 src/config/defaultPassword.js，别在这里写死字面量：
          提示里显示的口令必须与实际生效的是同一个，否则用户拿着提示语登不进去。
        -->
        <p style="margin:10px;">提示：重置密码后恢复为默认密码：<b>{{ DEFAULT_PASSWORD }}</b></p>

        <el-table :data="data" border style="width:100%">
          <el-table-column type="index" label="序号" width="60" />
          <el-table-column prop="username" label="账号" />
          <el-table-column prop="nickname" label="名称" />
          <!--
            类型列。
            【为什么不写 prop="type" 直接用】row.type 是数字（0/1/5…），
            直接渲染出来是一列裸数字，等于没加。所以用默认插槽过一层 TYPE_LABEL 映射。
            【?? row.type 的兜底不能删】列表接口按 type__in=(0,1,5) 过滤，
            正常只会出现 0/1/5；但万一后端以后放开过滤，遇到表里没有的值（如 2/3/4），
            只写 TYPE_LABEL[row.type] 会渲染成空白，还不如显示原始数字。
            【本列不引入任何样式】宽度和排版全部交给 Element Plus 默认单元格样式，
            和相邻几列完全一致；没有 align、没有 class、没有内联 style。
            宽度 110 是因为「中小学端」是本表里最长的类型名（5 个字），
            给足宽度避免表头/单元格折行。
          -->
          <el-table-column label="类型" width="110">
            <template #default="{ row }">{{ TYPE_LABEL[row.type] ?? row.type }}</template>
          </el-table-column>
          <!--
            「可报两支」列（本次新增），紧跟在「类型」列后面。
            【数据从哪来】列表接口 GET /api/admin/user/list 走的是后端的 user_dict
            （apps/api/views.py:533），而 user_dict 里就有 can_report_twice
            （apps/core/services.py:62）—— 所以行数据里本来就有，不需要额外请求。
            【为什么 type!==5 要显示「—」而不是「否」】特许只对中小学端有意义，
            给学校端 / 市州端写「否」会让人以为"它本来可以，只是没给"，
            显示破折号表达的是"此项与它无关"。
            【宽度 90】表头「可报两支」4 个字 + 单元格「是/否」1 个字，
            90 足够不折行；不写 align，与相邻列统一用 Element Plus 默认左对齐。
          -->
          <el-table-column label="可报两支" width="90">
            <template #default="{ row }">
              {{ row.type === 5 ? (row.can_report_twice ? '是' : '否') : '—' }}
            </template>
          </el-table-column>
          <el-table-column prop="leader" label="修改人姓名" />
          <el-table-column prop="tel" label="修改人电话号码" />
          <el-table-column prop="description" show-overflow-tooltip label="其他信息" />
          <el-table-column label="操作">
            <template #default="{ row }">
              <el-button type="primary" size="small" @click="resetPassword(row.id)">重置密码</el-button>
              <el-button type="primary" size="small" @click="modify(row)">修改</el-button>
            </template>
          </el-table-column>
        </el-table>

        <el-pagination
          v-model:current-page="page"
          v-model:page-size="limit"
          class="my-pagination"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>

    <!-- 添加用户 -->
    <el-dialog v-model="showInfo" title="添加用户" width="50%">
      <el-form
        ref="ruleFormRef"
        class="demo-ruleForm"
        :model="form"
        :rules="rules"
        inline
        label-width="120px"
      >
        <el-form-item label="账号" prop="username">
          <el-input v-model="form.username" />
        </el-form-item>
        <el-form-item label="名称" prop="nickname">
          <el-input v-model="form.nickname" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="form.password" type="password" />
        </el-form-item>
        <el-form-item label="类型选择" prop="type" >
          <el-select v-model="form.type" placeholder="请选择账号类型" style = "width: 200px">
            <el-option label="组委会账号" :value="2" />
            <el-option label="市州账号" :value="1" />
            <el-option label="学校账号" :value="0" />
            <!--
              中小学端账号。
              【:value 前面那个冒号不能省】它让 5 以**数字**绑定，而不是字符串 '5'。
              后端 type 是 IntegerField，传 '5' 也存得进去；但前端路由守卫不做类型转换
              （router/guard.js `user.type !== to.meta.role`），一边 '5' 一边 5 恒不相等，
              用户会被踢回 /middle 并看到「该账号类型无可用后台」。
              【为什么是 5 不是 4】5 = 后端 core/models.py 的 TYPE_PRIMARY_SECONDARY，
              4 = TYPE_PROVINCE（省级，已下线）。数字 4 被省级占过，不复用 ——
              见 config/roles.js 头部注释。
            -->
            <el-option label="中小学账号" :value="5" />
          </el-select>
        </el-form-item>
        <!--
          「可报两支」特许勾选框（本次新增）。
          【为什么只在 type===5 时显示】后端把这份特许只发给中小学合并办学的学校
          （apps/core/report_drafts.py 的 ACCOUNT_QUOTA_SCOPES 同时含高校端与中小学端，
          但高校端表单的组别下拉只有「大学组」一项，第二支必然撞组别唯一、根本报不出来，
          勾了也没有意义）。所以约束在前端这一层：不是中小学账号就不给这个开关。
          【@change 必须挂】见下面 onTypeChange 的说明——类型改掉时要顺手把勾选清掉。
          【label 后面的小字】用独立的一行说明，不塞进 label 里，避免 label 过长挤坏 inline 布局。
        -->
        <el-form-item v-if="form.type === 5" label="可报两支">
          <div class="quota-box">
            <el-checkbox v-model="form.can_report_twice" @change="onTypeChange(form)">允许报送两支队伍（合并办学学校）</el-checkbox>
            <p class="quota-tip">仅合并办学学校适用；两支队伍须为不同组别（小学组、中学组各一支）。</p>
          </div>
        </el-form-item>
        <p style="margin:10px">提示：密码为必填项，长度需为 {{ PASSWORD_MIN }} 到 {{ PASSWORD_MAX }} 个字符</p>
        <p style="margin:10px">其他信息：（可以填写一些关于账号的介绍）</p>
        <el-input
          v-model="form.description"
          type="textarea"
          :rows="5"
          maxlength="200"
          show-word-limit
        />
      </el-form>
      <template #footer>
        <el-button @click="showInfo = false">取 消</el-button>
        <el-button type="primary" :loading="submitting" @click="submit">确 定</el-button>
      </template>
    </el-dialog>

    <!-- 修改用户 -->
    <el-dialog v-model="showEditInfo" title="修改用户" width="50%">
      <el-form
        ref="ruleEditFormRef"
        class="demo-ruleForm"
        :model="editForm"
        :rules="editRules"
        inline
        label-width="120px"
      >
        <el-form-item label="账号" prop="username">
          <el-input v-model="editForm.username" />
        </el-form-item>
        <el-form-item label="名称" prop="nickname">
          <el-input v-model="editForm.nickname" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="editForm.password" type="password" />
        </el-form-item>
        <!--
          与「添加用户」弹窗同一件事，位置按决定接在「密码」后面。
          本弹窗**不显示类型**，v-if 判的是 editForm.type —— 它由 modify(row)
          从列表行深拷贝而来，行数据里就带 type（user_dict 总带），所以判得准。

          【这里为什么没有 @change —— 因为本弹窗改不了类型，不是漏了】
          本弹窗的字段只有「账号 / 名称 / 密码」三个（照搬 dist 原文的设计，
          见文件头还原的 editSubmit：整个 editForm 直接发出）。没有「类型选择」，
          也就做不出"把 type=5 改成别的类型"这个动作，@change 无从触发，
          所以「添加用户」那边那个 onTypeChange 的防护在这里用不上。

          ⚠️ 将来若给本弹窗加上「类型选择」，必须一并做两件事：
            1) 给这个复选框补 @change="onTypeChange(editForm)"
               —— 否则把 type=5 改成别的类型时，editForm.can_report_twice 会
                  留着 true 被整个对象发出去，静默写库（同一个坑见「添加用户」
                  弹窗 onTypeChange 的说明）。
            2) 提示"改类型后该账号需重新登录" —— router/guard.js:52 是
               `user.type !== to.meta.role`，类型一改，那个人浏览器里存的 type
               立刻对不上，下次跳路由就被踢回 /middle 并看到「该账号类型无可用后台」。

          【另需知道】"只有中小学端才能有这个特许"这条规则**只由前端的
          v-if="type === 5" 保证**。后端 user_update_admin / user_create_admin
          读该字段时只做 _as_bool 归一化、不判 type（apps/api/views.py:554-577），
          所以直接打接口可以给任何类型的账号置上它，界面看不出来。
          后端唯一的守备是：学校自助改资料的接口白名单里没有这个字段。
        -->
        <el-form-item v-if="editForm.type === 5" label="可报两支">
          <div class="quota-box">
            <el-checkbox v-model="editForm.can_report_twice">允许报送两支队伍（合并办学学校）</el-checkbox>
            <p class="quota-tip">仅合并办学学校适用；两支须为不同组别（小学组、中学组各一支），同一组别仍限 1 支。</p>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditInfo = false">取 消</el-button>
        <el-button type="primary" @click="editSubmit">确 定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
/**
 * 管理员 - 用户管理（路由 /admin/user）
 *
 * 【可信度：A】逐行照搬 dist/chunk-5d7f0bd8 的模块 8ff7。原文关键内容：
 *
 *   模板：div.bg > div.options（搜索框 + 刷新 + 添加账号 + 导出所有账号）
 *                 > div.content > div.bg-list（p.title「账号列表」+ el-table + el-pagination）
 *         + el-dialog「添加用户」 + el-dialog「修改用户」
 *   表格列：序号(type=index) / 账号(username) / 名称(nickname) / 修改人姓名(leader)
 *           / 修改人电话号码(tel) / 其他信息(description, show-overflow-tooltip) / 操作
 *   操作列：重置密码 · 修改        ← 原文没有「删除」
 *
 *   data(){ return { keyword:null, showInfo:!1, showEditInfo:!1, status:0,
 *                    page:1, limit:10, total:0, data:[], user:{}, form:{}, editForm:{}, rules:{...} } }
 *
 *   getData(){ const e={page:this.page,limit:this.limit,keyword:this.keyword}
 *              this.$api.admin.user.list(e).then(({data:e})=>{
 *                0===e.code ? (this.total=e.count, this.data=e.data) : ElMessage.error(e.msg) }) }
 *   reflush(){ this.getData() }                    // ← 注意：不重置 page
 *   handleSizeChange(e){ this.page=1, this.limit=e, this.getData() }
 *   handleCurrentChange(e){ this.page=e, this.getData() }
 *   modify(e){ this.editForm=JSON.parse(JSON.stringify(e)), this.showEditInfo=!0 }
 *   resetPassword(e){ MessageBox.prompt("请输入新密码","重置密码",{confirmButtonText:"确定",cancelButtonText:"取消"})
 *       .then(({value:t})=>{ this.$api.admin.user.update({id:e,password:t}).then(({data:e})=>{
 *           0===e.code ? (ElMessage.success("重置成功"), this.getData()) : ElMessage.error(e.msg) }) })
 *       .catch(()=>{ ElMessage({type:"info",message:"取消输入"}) }) }
 *   editSubmit(){ this.$api.admin.user.update(this.editForm).then(({data:e})=>{
 *       0===e.code ? (ElMessage.success("修改成功"), this.showEditInfo=!1, this.getData()) : ElMessage.error(e.msg) }) }
 *   add(){ this.showInfo=!0 }
 *   download(e){ this.$api.admin.user.download().then(t=>{ ...Blob 下载，文件名用传入的 e... }) }
 *   submit(){ this.$api.admin.user.create(this.form).then(({data:e})=>{
 *       0===e.code ? (this.showInfo=!1, this.form={}, ElMessage.success("创建成功")) : ElMessage.warning(e.msg) }) }
 *
 * 【本页旧实现的问题（已整体重写）】
 *  1. 表格列全部对不上后端：旧版读 realName / school / phone / createdAt，
 *     而 apps/core/services.py 的 user_dict 只返回 id/username/nickname/description/tel/leader/type/parent_id，
 *     四个列恒为空白。
 *  2. 筛选条件对不上后端：旧版传 username，后端 user_list 只认 keyword。
 *     旧版的「角色」下拉在当时确实是无效的 —— 那时后端还不支持按 type 过滤。
 *     【已不是现状】后端后来给 user_list 加了 type 参数（值只能在展示范围 0/1/5 内），
 *     本页搜索栏那个「类型」下拉就是接它，见 getData 与 onFilterTypeChange。
 *  3. 分页参数错误：旧版传 size，后端 list_page 读的是 limit，导致每页条数恒为默认 10。
 *  4. 删除功能是伪造的：旧版 onDelete 调用 admin.user.update({...row, deleted:true})，
 *     而后端 user_update_admin 只读取 username/nickname/description/tel/leader/type/parent_id，
 *     deleted 被静默忽略 —— 接口返回成功但用户根本没被删除。
 *     且 dist 的 admin.user 只有 list/update/create/download 四个方法，原文根本没有删除入口，
 *     因此这里按 dist 还原为「重置密码 · 修改」两个操作，不保留删除按钮。
 *
 * 【与后端契约的核对】
 *   请求：GET  /api/admin/user/list?page=&limit=&keyword=   ✓ 对应 user_list()
 *   响应：{data:[...], count:N, code:0, msg:''}             ✓ 对应 list_page()
 *   字段：username/nickname/leader/tel/description          ✓ 对应 user_dict()
 *
 * 【未迁移项】data() 里的 status / user 两项在原文模板与方法中均未被使用，属原版遗留字段。
 *
 * 【本次修复：rules 从未被 validate() 调用过】
 *  迁移时漏了一个动作：模板里 ref="ruleFormRef" / ref="ruleEditFormRef" 一直写着，
 *  但 <script setup> 里从来没有这两个变量接住它们，submit() / editSubmit() 也从不调 validate()，
 *  于是 rules / editRules 两套规则全是死代码 —— 账号、名称留空，长度越界，类型不选，
 *  密码不填，一律照发请求。本次把这一步接上：补两个 ref，提交前先 validate()，失败直接 return。
 *  接线后真正变严的只有两处（rules 原本就是这么写的）：添加账号时「密码」「类型」变为必选。
 *
 *  【已知缺口·本次未修】接线只挡得住空值和超长，挡不住「账号重复」：
 *   username 在后端是 unique（apps/core/models.py:72），user_create_admin 未 catch
 *   IntegrityError，重复账号会返回 500；而 request.js 的响应拦截器对 500 执行整页跳转
 *   （window.location.href = BASE_URL + '500'）—— 整个页面会被替换掉。
 *   要彻底消掉这条路径需要后端把重复账号改成返回 failure（code 1），属后端改动，本次未做。
 *   前端这边只堵最粗的一条：给「添加账号」的确定按钮加 :loading 防连点
 *   （连点两次 = 发两次 POST = 第二次必然撞 unique）。
 *
 * 【本次变更：重置密码 = 重置为默认密码，弹窗从「输入新密码」改成「确认」】
 *
 *  1) 后端不再接受调用方指定的新密码。user_update_admin 现在是
 *     `if "password" in data: user.set_password(RESET_PASSWORD_DEFAULT)`
 *     （yilinbei hou/apps/api/views.py:543，常量在同文件 :521）——
 *     请求体里只要出现 password 这个键，**值被忽略**，一律重置为 scylb@2026。
 *     于是原先那个「请输入新密码」的输入框只会骗人：填什么都进不了库。
 *     现改为 ElMessageBox.confirm('是否重置为默认密码？')，没有输入框。
 *     随之删掉的还有 inputValidator / inputType:'password' —— 没有输入框可校验了。
 *
 *  2) 表格上方新增提示语「重置密码后恢复为默认密码：…」，与组委会端 /committee/user 同一句话。
 *     注意这条提示的性质变了：它现在是**如实的系统行为**，不再是「提醒操作者自己填那个值」的约定。
 *
 *  3) 默认口令收敛到 src/config/defaultPassword.js（原先 login/index.vue 里另有一份硬编码）。
 *     后端那份在 apps/api/views.py:521，改一处要连它一起改。
 *
 *  4) 「修改用户」弹窗里的密码框已删除 —— 它与「重置密码」走同一个接口
 *     （PUT /api/admin/user/，见 adminApi.user.update），留着的话，
 *     管理员输入 abc123456 实际生效的是默认密码，属新引入的静默陷阱。
 *     改密码此后只剩「重置密码」一个入口，语义唯一。详见模板里那段注释。
 *
 *  【上一轮的两处改动仍然有效，别回退】
 *   · rules / editRules 接线（补 ruleFormRef / ruleEditFormRef 并真的调 validate()）；
 *   · 账号 3-20、密码 6-20 全站收敛到 src/config/accountRules.js，
 *     本页 rules 的文案与「添加用户」弹窗里的那句提示都引用它。
 */

import { ref, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import { adminApi } from '@/api'
import { downloadExcelFile } from '@/utils/excel'
import { DEFAULT_PASSWORD } from '@/config/defaultPassword'
import {
  ACCOUNT_MIN,
  ACCOUNT_MAX,
  MSG_ACCOUNT_LENGTH,
  PASSWORD_MIN,
  PASSWORD_MAX,
  MSG_PASSWORD_LENGTH
} from '@/config/accountRules'
// 账号类型 -> 中文名。字典本体与组委会端 /committee/user 共用同一份，
// 说明（取值依据、为什么含 2/3/4、为什么不放 roles.js）全部在 src/config/accountTypes.js。
// 别把字典抄回本文件 —— 两份副本漏改一处，那一页的类型列会渲染成空白。
import { TYPE_LABEL } from '@/config/accountTypes'

const keyword = ref(null)

/**
 * 「类型」筛选选中的值。空串 = 全部（不筛类型）。
 * 【初值为什么是 '' 而不是 null】与下拉里「全部类型」那一项的 :value="''" 保持同一种值，
 * 免得出现 null 与 '' 两种"空"并存，判断时漏掉一种。
 * 【名字为什么带 filter 前缀】见模板里那段说明 —— 本页已有一个 onTypeChange。
 */
const filterType = ref('')

const showInfo = ref(false)
const showEditInfo = ref(false)
const page = ref(1)
const limit = ref(10)
const total = ref(0)
const data = ref([])
const form = ref({})
const editForm = ref({})

/**
 * 【本次修复】两个 el-form 的 ref。
 * 模板里的 ref="ruleFormRef" / ref="ruleEditFormRef" 从迁移起就挂着，但 <script setup>
 * 里一直没有同名变量接住它们 —— 两个没接线的开关，详见文件头「本次修复」。
 */
const ruleFormRef = ref()
const ruleEditFormRef = ref()

/**
 * 添加账号的提交中标志，只服务于防连点。
 * 连点两次 = 发两次 POST = 第二次撞 username unique → 500 → 拦截器整页跳 /500。
 * 「修改用户」不加：PUT 是幂等的，连点第二次结果相同，无害。
 */
const submitting = ref(false)

const rules = {
  nickname: [
    { required: true, message: '请输入名称', trigger: 'blur' },
    { min: 2, max: 20, message: '长度在 2 到 20 个字符', trigger: 'blur' }
  ],
  username: [
    { required: true, message: '请输入账号', trigger: 'blur' },
    { min: ACCOUNT_MIN, max: ACCOUNT_MAX, message: MSG_ACCOUNT_LENGTH, trigger: 'blur' }
  ],
  leader: [
    { required: false, message: '请输入负责人名称', trigger: 'blur' },
    { min: 2, max: 20, message: '长度在 2 到 20 个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入登录密码', trigger: 'blur' },
    { min: PASSWORD_MIN, max: PASSWORD_MAX, message: MSG_PASSWORD_LENGTH, trigger: 'blur' }
  ],
  type: [{ required: true, message: '请选择类型', trigger: 'blur' }]
}

const editRules = {
  nickname: [
    { required: true, message: '请输入名称', trigger: 'blur' },
    { min: 2, max: 20, message: '长度在 2 到 20 个字符', trigger: 'blur' }
  ],
  username: [
    { required: true, message: '请输入账号', trigger: 'blur' },
    { min: ACCOUNT_MIN, max: ACCOUNT_MAX, message: MSG_ACCOUNT_LENGTH, trigger: 'blur' }
  ]
}

function getData() {
  const params = { page: page.value, limit: limit.value, keyword: keyword.value }

  // ── 类型筛选：只有选了具体类型才把 type 塞进请求 ──────────────────────
  // 【为什么不能写 if (filterType.value)】0（学校端）在 JS 里是 falsy。
  //   那样一选「学校端」参数就被丢掉、列表显示全部，而 1 和 5 都正常 ——
  //   用户报障时只会说「学校端筛不出来」，很难往这上面想。必须显式判空。
  // 【没选时为什么整个 key 都不发】后端 user_list 读的是 request.GET.get("type")，
  //   它对空串是安全的（`account_type not in (None, "")`），所以传 '' 也不会错。
  //   这里仍然不发，是为了不依赖后端那一句实现 —— 后端哪天真改成「按 key 是否存在」
  //   来判断，前端不用跟着动。
  // 【后端怎么用这个值】先卡死展示范围 type__in=(0,1,5)，再 filter(type=int(值))，
  //   两个条件是 AND。所以传 2/3/4 只会得到空表，越不了权
  //   （apps/api/views.py 的 user_list，以及它上面那条"不能借 type 越权"的注释）。
  // 【和 keyword 的关系也是 AND】后端三个条件都是 .filter() 叠加，
  //   「选学校端 + 搜张三」= 只在学校端账号里搜张三，不是并集。
  if (filterType.value !== '' && filterType.value !== null && filterType.value !== undefined) {
    params.type = filterType.value
  }

  adminApi.user.list(params).then(({ data: res }) => {
    if (res.code === 0) {
      total.value = res.count
      data.value = res.data
    } else {
      ElMessage.error(res.msg)
    }
  })
}

/**
 * 切换类型筛选：先回到第 1 页再查。
 * 【为什么必须把 page 归 1】后端 list_page 对超出范围的页码按 Laravel 语义返回
 * **空数组**（apps/core/services.py 特意没用 Django 的 Paginator.get_page）。
 * 停在第 5 页时切到只剩 2 页数据的类型，你会看到一张空表，
 * 很容易误判成「这个类型一个账号都没有」。
 * 注意：搜索框 keyword 走的是 @change="getData"，**不重置 page**（原文如此），
 * 这里不跟着学。
 */
function onFilterTypeChange() {
  page.value = 1
  getData()
}

// 注意：与 /admin/scan 的 reflush 不同，这里的原文实现不重置 page
function reflush() {
  getData()
}

function handleSizeChange(size) {
  page.value = 1
  limit.value = size
  getData()
}

function handleCurrentChange(current) {
  page.value = current
  getData()
}

function modify(row) {
  editForm.value = JSON.parse(JSON.stringify(row))
  showEditInfo.value = true
}

/**
 * 「类型选择」变化时，把不适用的特许勾选清掉（本次新增）。
 *
 * 【为什么必须有这一步】勾选框是 v-if="form.type === 5"，一旦类型从「中小学账号」
 * 改成别的，**勾选框会从界面上消失，但 form.can_report_twice 这个值还留在对象里**。
 * 提交时发的是整个 form（submit() 里 adminApi.user.create(form.value)），
 * 于是这次建出来的账号虽然类型是「学校账号」，数据库里却被写上了 can_report_twice=true。
 * 这是**静默的脏数据**：界面上完全看不出来，只有等这个账号去报名时才会发现它多了一支额度。
 * 所以类型一变就归零，让"界面上看不见"和"数据里没有"保持一致。
 *
 * 【为什么用 @change 而不是 watch】el-select 的 @change 只在**用户真的改了选择**时触发，
 * 打开弹窗、程序赋值都不会触发 —— 这正是我们要的语义（只在用户操作时清）。
 * 用 watch(form.type) 反而会在弹窗初始赋值那一下误触发。
 *
 * 【为什么形参是 form 而不是不用参数】这个方法将来也可能挂到「修改用户」弹窗上，
 * 传对象进来比写死 form 更好复用；当前只有「添加用户」弹窗调它。
 */
function onTypeChange(target) {
  if (target.type !== 5) target.can_report_twice = false
}

/**
 * 【本次修复：空输入被当成「重置成功」】
 *
 * 【为什么从 prompt 改成 confirm】
 * 这一处历史上是 ElMessageBox.prompt('请输入新密码')，让操作者把口令打进去。
 * 后端现在不再接受调用方指定的新密码：user_update_admin 里
 * `if "password" in data: user.set_password(RESET_PASSWORD_DEFAULT)`
 * （yilinbei hou/apps/api/views.py:543）—— 带不带值、带什么值都一样。
 * 于是输入框成了一个纯骗人的控件：填进去的任何东西都被丢弃，用户按自己填的去登录必然失败。
 * 换成 confirm 后，弹窗里问的就是将要发生的事，不再有可填的地方。
 *
 * 【随之删掉的东西】prompt 时代的 inputValidator（checkPasswordInput，
 * 拦空串 / 纯空格 / 长度越界）与 inputType:'password' 都没有存在意义了，
 * 一并删除；checkPasswordInput 因此失去全部调用方，已从 src/config/accountRules.js 移除。
 * 上面那些校验原本防的是「空输入被当成重置成功」—— 那个问题现在从根上没有了，
 * 因为请求体里的 password 由本函数写死成 DEFAULT_PASSWORD。
 *
 * 【password 为什么仍然发真值】见 src/config/defaultPassword.js 头部：
 * 不依赖后端「值被忽略」这条约定，万一后端退回旧写法，发真值的行为完全一致。
 */
function resetPassword(id) {
  ElMessageBox.confirm('是否重置为默认密码？', '重置密码', {
    confirmButtonText: '确定',
    cancelButtonText: '取消'
  })
    .then(() => {
      adminApi.user.update({ id, password: DEFAULT_PASSWORD }).then(({ data: res }) => {
        if (res.code === 0) {
          ElMessage.success('重置成功')
          getData()
        } else {
          ElMessage.error(res.msg)
        }
      })
    })
    .catch(() => {
      // confirm 的取消/关闭都走这里（reject 'cancel' / 'close'），不再有「取消输入」这回事
      ElMessage({ type: 'info', message: '已取消' })
    })
}

/**
 * 同 submit()，提交前先过 editRules（账号 / 名称）。
 * 这里不加 loading：PUT 幂等，连点第二次结果相同，不会像 create 那样撞唯一约束。
 *
 * 【本次变更】原注释里那句「editRules 里没有 password 规则，所以输入密码才改密码」已失效 ——
 * 弹窗里的密码输入框整个删掉了（原因见模板中那段注释），editForm 里不会再出现 password 键，
 * 这条 PUT 也就永远走不到 user_update_admin 的重置分支。
 * 注意 editForm 是整行深拷贝（见 modify()），而 user_dict 不回传 password，
 * 所以「不漏传」是靠数据形状保证的，不是靠这里挑字段。
 */
async function editSubmit() {
  const valid = await ruleEditFormRef.value.validate().catch(() => false)
  if (!valid) return

  adminApi.user.update(editForm.value).then(({ data: res }) => {
    if (res.code === 0) {
      ElMessage.success('修改成功')
      showEditInfo.value = false
      getData()
    } else {
      ElMessage.error(res.msg)
    }
  })
}

function add() {
  showInfo.value = true
}

function download(fileName) {
  adminApi.user.download().then((res) => {
    downloadExcelFile(res.data, fileName)
  })
}

/**
 * 【本次修复】提交前先过 rules —— 原先这里直接发请求，rules 从未生效。
 * 用 .catch(() => false) 而不是 try/catch 包住整段：校验失败只 return，
 * 接口报错仍走原来的分支（若把接口调用一并包进 try，接口错误会被静默吞掉）。
 * submitting 只为防连点，见它的声明处。
 */
/**
 * 建号前查重：这个账号名是不是已经被占了。
 *
 * 【为什么需要这一步】后端 user_create_admin（apps/api/views.py）**没有** catch
 * IntegrityError，而 users.username 是 unique —— 撞名会返回 **HTTP 500**。
 * 前端的 utils/request.js 对 500 执行 `window.location.href = BASE_URL + '500'`，
 * 那是**整页跳转**：弹窗、已填的其他字段、列表的分页位置全部丢失。
 * 这里在发 POST 之前先问一次列表接口，撞名就地提示，绕开那条整页跳转的路径。
 *
 * 【为什么用列表接口查】管理员能调到的账号类接口里只有它带 keyword 搜索
 * （/api/admin/user/list）。传 limit: 1000 是尽量一次把命中项取全 ——
 * 后端 list_page 对 limit 没有上限，只做了 max(1, …) 的下限保护。
 *
 * 【为什么拿到结果还要再精确比对一次 username】keyword 走的是 icontains，
 * 而且同时匹配 username / tel / nickname 三个字段。搜「张三」时返回的行里，
 * 完全可能只是**电话或名称**含「张三」、账号名并不是它。
 * 所以必须 `u.username === username` 精确比对，否则会误拦一个本来能建的账号。
 *
 * 【为什么出错时放行（fail-open）】网络抖动、响应结构异常等一律 return false，
 * 让流程落回原来的「直接 POST」。宁可偶尔走到那个 500，
 * 也不要因为查重这一步自己出问题就**拦住一次合法的建号操作**。
 *
 * 【覆盖不到的情况，已知】列表接口的过滤条件是 type__in=(0, 1, 5)，
 * 所以撞上 type=2/3/4 的存量账号（组委会 / 管理员 / 省级）时查不出来，仍会 500。
 * 前端拿不到这些账号的清单（/committee/*、/admin/* 都按角色隔离），
 * 这一条只能靠后端修 —— 方案见文档末尾给后端的那段代码。
 */
function isUsernameTaken(username) {
  if (!username) return Promise.resolve(false)
  return adminApi.user.list({ keyword: username, limit: 1000, page: 1 })
    .then(({ data: res }) => {
      if (res.code !== 0 || !Array.isArray(res.data)) return false
      return res.data.some((u) => u.username === username)
    })
    .catch(() => false)
}

async function submit() {
  const valid = await ruleFormRef.value.validate().catch(() => false)
  if (!valid) return

  submitting.value = true

  // 查重。注意撞名这条分支**必须先把 submitting 复位再 return** ——
  // 否则用户撞一次名之后，确定按钮会一直停在 loading 态、再也点不动。
  if (await isUsernameTaken(form.value.username)) {
    submitting.value = false
    ElMessage.warning(`账号「${form.value.username}」已存在，请换一个账号名`)
    return
  }

  adminApi.user.create(form.value).then(({ data: res }) => {
    if (res.code === 0) {
      showInfo.value = false
      form.value = {}
      ElMessage.success('创建成功')
      // 建完刷一次列表。原实现漏了这一步，要手动点「刷新」才看得到新账号；
      // 加了「类型」列之后更需要它 —— 否则没法立刻确认建出来的是哪种类型。
      getData()
    } else {
      ElMessage.warning(res.msg)
    }
  }).finally(() => {
    submitting.value = false
  })
}

getData()
</script>

<style lang="scss" scoped>
/**
 * 照搬 dist/css/chunk-5d7f0bd8.1374f2e3.css 中 [data-v-2cd602cf] 作用域的规则。
 * 注意：本页 .title::before 的竖条颜色是 #d80e0e（红），
 * 与 /admin/index、/admin/scan 的 #036 / #1890ff 不同 —— 原文各页确实不一致，勿统一。
 */
.bg {
  position: relative;
  background: #fff;
  padding: 10px;
  min-height: calc(100% - 20px);
  width: calc(100% - 20px);
}

/**
 * 「可报两支」勾选框 + 下方小字说明（本次新增）。
 * 【只用 CSS 类，不写内联样式】与模板里那句「提示：密码为必填项…」的内联写法不同，
 * 这里用类名是因为小字要限宽换行，属性不止一条，写成内联会难读也难改。
 * 【为什么要限宽】两个弹窗的 el-form 都带 inline，表单项会按内容宽度排。
 * 那句小字有约 50 个字，不限宽会把这个表单项撑得极宽、把整行布局顶乱；
 * 限到 420px 后它自然地折成两行，恰好压在勾选框下面。
 * 【为什么字号是 12px】Element Plus 的表单帮助文字（如 el-form-item__error）
 * 就是这个量级，保持一致，不喧宾夺主。
 * 【为什么是 scoped】本页样式全部是 scoped，加在这里不会外溢到别的页面。
 */
.quota-box {
  max-width: 420px;
}
.quota-tip {
  margin: 2px 0 0;
  font-size: 12px;
  line-height: 18px;
  color: #909399;
}

.options {
  box-shadow: 1px 1px 5px 1px #8c939d;
  padding: 10px 20px 0 20px;
  display: flex;
  justify-content: flex-start;
  flex-wrap: wrap;
  align-items: center;

  > * {
    margin-bottom: 10px;
    margin-right: 10px;
  }

  > .el-input {
    width: 220px !important;
  }

  /* 类型下拉：与相邻的搜索框排成一档。
     高度不用管 —— 两个组件都是默认 size，el-input 与 el-select 默认高度一致，
     上面那条 align-items: center 负责垂直对齐。 */
  > .el-select {
    width: 160px !important;
  }
}

.content {
  position: relative;
  background-color: #fff;
  padding: 10px;
  margin-top: 20px;
  box-shadow: 1px 1px 5px 1px #8c939d;
  min-height: calc(100% - 150px);
}

.title {
  position: relative;
  border-bottom: 1px solid #dcdcdc;
  line-height: 30px;
  padding-left: 20px;
  margin-bottom: 10px;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    bottom: 5px;
    width: 3px;
    height: 20px;
    background-color: #d80e0e;
  }
}

.my-pagination {
  margin-top: 10px;
}
</style>
