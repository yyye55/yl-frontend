<template>
  <div class="bg">
    <div class="options">
      <!--
        【本次变更：一个框搜三个字段，placeholder 写全三个列名】
        「请输入内容」等于没说 —— 用户不知道这个框到底搜哪一列。
        后端 report_queryset（yilinbei hou/apps/api/views.py）里 keyword 原先的匹配范围
        **取决于调用方**：管理员这一支是 `Q(name) | Q(choir_name)`，
        而市州/学校/中小学端只匹配 name（见 components/elementary/ReportList.vue）——
        同一个框在不同身份的页面上搜的范围不一样，且谁也搜不到 school_name。
        本次后端把 keyword 统一扩成「name | choir_name | school_name」，
        三处对齐成同一套口径，所以 placeholder 也把三个列名一起写出来。
      -->
      <!--
        【本次变更：搜索框补上三个缺口】
        ① 文字被裁。placeholder 是「请输入节目/合唱团/学校名称」共 13 个字，约 182px；
           而 .options > .el-input 的宽度被样式钉在 220px，扣掉右侧后置按钮（约 40px）
           与输入框内边距（22px）只剩约 158px —— 右半句直接被裁掉。宽度已放宽到 300px。
        ② 放大镜按钮是死的。此前那个 el-button 没有任何点击事件；能搜出结果只是因为
           「点击会让输入框失焦、顺带触发 @change」，属于蒙对的。现在显式绑上 @click。
        ③ 不能一键清空。加了 clearable；点「×」是程序赋值，不会触发 change，
           所以必须另外接 @clear。
        @mousedown.prevent 见 ReportList.vue 同处的说明（避免失焦与点击各发一条请求）。
      -->
      <el-input
        v-model="keyword"
        class="input-with-select"
        :placeholder="KEYWORD_PLACEHOLDER"
        clearable
        @change="getData"
        @clear="getData"
      >
        <template #append>
          <el-button :icon="Search" @mousedown.prevent @click="getData" />
        </template>
      </el-input>

      <!--
        【本次变更：两个框收掉了】
        这里原先还有合唱团名、学校名两个独立输入框，走的是后端 report_queryset 的
        choir_name / school_name 参数。那两个参数与 keyword 是 **AND** 关系，
        解决的是「再叠一层筛选」，而不是「一个框搜更多字段」——
        本页的 keyword 当时能命中 name 与 choir_name、唯独搜不到 school_name，
        才需要单摆一个学校名框。
        现在后端已把 keyword 扩成「曲目名 | 乐团名 | 学校名」（见 report_queryset
        里 keyword 那段注释），再用单独的框去叠关键词只会越筛越少，故收回。
      -->

      <!--
        placeholder 写「全部」而不是「审核状态」：
        「全部」这一项的 value 是 null，对 el-select 来说就是空值，它会回头显示 placeholder。
        所以只有把 placeholder 本身写成「全部」，选中「全部」时框里才会出现「全部」两个字。
        这只是显示文案，status 仍然是 null，axios 会丢弃空值参数 —— 也就是「全部」= 不传 status。
      -->
      <el-select v-model="status" placeholder="全部" @change="getData">
        <el-option label="全部" :value="null" />
        <el-option label="待审核" :value="0" />
        <el-option label="未通过" :value="-1" />
        <el-option label="组委会通过" :value="1" />
      </el-select>

      <el-select v-model="group" placeholder="组别" @change="getData">
        <!--
          【第十二届改造】原 11 届下拉框为「中小学组/大学组/中小学教师组/高校教师组」，
          第十二届按红头文件调整为五个正式组别（管乐团小学/中学/大学 + 铜管乐团小学/中学）。
          后端 Report.group 为 CharField，存字符串（如 "管乐团-小学组"），
          filter 参数用字符串值以匹配 scoped_total / report_queryset 的字符串过滤逻辑。
        -->
        <el-option label="全部" :value="null" />
        <el-option label="管乐团-小学组" value="管乐团-小学组" />
        <el-option label="管乐团-中学组" value="管乐团-中学组" />
        <el-option label="管乐团-大学组" value="管乐团-大学组" />
        <el-option label="铜管乐团-小学组" value="铜管乐团-小学组" />
        <el-option label="铜管乐团-中学组" value="铜管乐团-中学组" />
      </el-select>

      <el-button class="menu-button" type="primary" @click="refresh"> 刷新</el-button>
    </div>

    <div class="content">
      <div class="bg-list">
        <p class="title">报名列表</p>
        <el-table :data="data" border style="width:100%">
          <!-- dist 原文同时写了 type="index" 与 prop="date"；type=index 时 prop 不生效，
               与 ShowScFile.vue 的处理保持一致，原样保留。 -->
          <el-table-column type="index" prop="date" label="序号" align="center" header-align="center" />
          <el-table-column prop="choir_name" label="合唱团名称" align="center" header-align="center" show-overflow-tooltip />
          <el-table-column prop="name" label="节目名称" align="center" header-align="center" show-overflow-tooltip />
          <el-table-column prop="user.nickname" label="提交单位" align="center" header-align="center" show-overflow-tooltip />
          <el-table-column prop="contact_name" label="联系人" align="center" header-align="center" />
          <el-table-column prop="contact_phone" label="联系电话" align="center" header-align="center" />
          <el-table-column prop="contact_way" label="联系地址" align="center" header-align="center" show-overflow-tooltip />
          <el-table-column label="人员信息" align="center" header-align="center">
            <template #default="{ row }">
              <ShowPerson :data="row.person" />
            </template>
          </el-table-column>
          <el-table-column label="状态" align="center" header-align="center">
            <template #default="{ row }">
              <Status :status="row.status" />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="500" align="center" header-align="center">
            <template #default="{ row }">
              <ShowContent :data="row" />
              <!-- dist 原文：status<1 时显示「审核通过」，其中 status===0 额外显示「驳回」，
                   status===-1 时改为显示「查看驳回信息」；status===1 时只显示「驳回」。 -->
              <template v-if="row.status < 1">
                <Remark v-if="row.status === -1" :data="row.remark" />
                <el-button @click="check(row.id, 1)">审核通过</el-button>
                <el-button v-if="row.status === 0" @click="returnBack(row.id)"> 驳回 </el-button>
              </template>
              <template v-if="row.status === 1">
                <el-button @click="returnBack(row.id)">驳回</el-button>
              </template>
            </template>
          </el-table-column>
        </el-table>

        <el-pagination
          v-model:current-page="page"
          v-model:page-size="limit"
          class="my-pagination"
          :page-sizes="[20, 50, 100, 200]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * 管理员 - 报名审核（dist 组件名 "elementary"）
 *
 * 【可信度：A】逐行照搬 dist chunk-335604d9 的模块 b855（路由 /admin/report，
 * 见 app.js: path:"/admin/report" -> chunk-335604d9 -> n.bind(null,"b855")）。
 *
 * 原文组件选项：
 *   name:"elementary",
 *   components:{ ShowPerson, Status, ShowContent, Remark, ...el 组件 },
 *   data(){ return { keyword:null, group:null, isDelete:null, status:null,
 *                    page:1, limit:20, total:0, data:[] } },
 *   mounted(){ this.getData() },
 *   methods:{ handleSizeChange, refresh, handleCurrentChange, getData, check, returnBack }
 *
 * ---------------------------------------------------------------------------
 * 【本次修复的核心：本页此前是「凭接口名推断」的虚构页面】
 * ---------------------------------------------------------------------------
 * 修复前本项目该页的字段与后端、dist 三者全部不符，逐项对照如下：
 *
 *   位置            修复前（虚构）        修复后（dist + 后端一致）
 *   分页参数        size                  limit
 *   搜索参数        school / status       keyword / group / status
 *   第 1 列         prop="id"             type="index"（序号）
 *   第 2 列         school  学校           choir_name   合唱团名称
 *   第 3 列         title   报名名称       name         节目名称
 *   第 4 列         group   组别           user.nickname 提交单位
 *   第 5~7 列       —                     contact_name / contact_phone / contact_way
 *   第 8 列         —                     ShowPerson（人员信息弹窗）
 *   状态列          自绘 el-tag            <Status> 组件
 *   状态值          2 = 已拒绝             未通过 = -1（另有 -2 未填写）
 *   操作列          查看/通过/拒绝         ShowContent + 审核通过 + 驳回（+ Remark）
 *
 * 依据：
 *   - 分页键 limit：后端 apps/core/services.py `list_page()` 读的是 request.GET.get("limit")，
 *     且 openapi.json 中 report 列表接口也用 limit；dist 的 getData 同样发送 limit。
 *   - 字段名：后端 report_dict()（apps/core/services.py:346）返回 Report 全部字段
 *     并附加 user / person / file / spectrum，其中 choir_name / name / contact_name /
 *     contact_phone / contact_way / status / remark / user.nickname / person 全部存在。
 *   - 状态值：后端 `status_label` 为 {0:待审核, 1:已通过, -1:未通过}，
 *     dist 的 <Status> 组件渲染 -2 未填写 / -1 已驳回 / 0 待审核 / 1 组委会通过。
 *   - 筛选参数：后端 report_queryset()（apps/api/views.py:95）读取 keyword / status / group，
 *     另有后来新增的 choir_name / school_name（:112-117）。其中 keyword 对超管匹配
 *     name 与 choir_name（:102-107）。与本页五个筛选控件一一对应。
 *
 * ---------------------------------------------------------------------------
 * 【与 dist 的差异（唯一一处，且是有依据地修正一个必然失败的调用）】
 * ---------------------------------------------------------------------------
 * dist 原文中 check() 与 returnBack() 调用的是 `this.$api.committee.report.check`
 * （chunk-335604d9 中 `api.committee.report.check` 出现 2 次），即**管理员页面却调用了组委会接口**。
 * 但后端对两个接口做了严格的角色校验（apps/api/views.py:76 role_error；行号随后端文件变动）：
 *     def role_error(request, expected):
 *         if not user or user.type != expected: return response({...}, 403)
 *   - PUT /api/admin/report/check     -> role_error(request, 3)  仅管理员
 *   - PUT /api/committee/report/check -> role_error(request, 2)  仅组委会
 * 而本页路由 meta.role = 3（管理员 type=3），type 是 **严格相等** 比较，
 * 因此管理员调用组委会接口必然返回 403「无该页面操作权限！」——
 * 即 dist 中本页的「审核通过 / 驳回」按钮在原线上就是点不通的。
 * （全 dist 共 8 个 chunk 都写着 committee.report.check，属于成批复制的笔误。）
 *
 * 故本页改用 adminApi.report.check。请求体、响应处理、提示文案与 dist 完全一致
 * （{id, status, remark} -> code===0 时 success('审核成功'/'驳回成功') 并刷新列表），
 * 仅把端点从必然 403 的组委会接口换成与之等价的、本角色可用的管理员接口。
 * 若后续确认组委会也需要访问本页，请改用 committeeApi 并同步路由 meta.role。
 *
 * ---------------------------------------------------------------------------
 * 【其他说明】
 *  - data 中的 isDelete 在 dist 里被声明但既未渲染也未随请求发送，属遗留字段，
 *    为保持与原文逐字一致而保留。
 *  - refresh() 不会把 page 重置为 1（与 scan.vue 的 reflush 行为不同），此处按 dist 原样。
 *  - size="mini"（Element UI 2.x 写法）已移除：Element Plus 的合法尺寸为 large/default/small，
 *    "mini" 每次渲染都会告警，而 EP 中没有对应的 `--mini` 样式规则，删除零视觉变化。
 *
 * ---------------------------------------------------------------------------
 * 【本次新增（纯增量，不动任何老参数）】
 * ---------------------------------------------------------------------------
 *  工具栏加了「合唱团名称 / 学校名称」两个输入框，keyword 的 placeholder 由「请输入内容」
 *  改为写出它实际能搜的列名。依据是后端 report_queryset 新增的 choir_name / school_name
 *  两个 icontains 参数（yilinbei hou/apps/api/views.py:112-117）。
 *  两个框为空时不发送该参数，因此不带新参数的请求与改动前完全等价。
 */
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import { adminApi } from '@/api'
import Status from '@/components/common/Status.vue'
import Remark from '@/components/common/Remark.vue'
import ShowContent from '@/components/common/ShowContent.vue'
import ShowPerson from '@/components/common/ShowPerson.vue'

/**
 * 【本次变更】keyword 输入框的 placeholder 文本。
 * 本页 keyword 现在匹配 name / choir_name / school_name 三个字段（见模板中的说明），
 * 故三个列名都写出来 —— 不写全，用户会以为这个框还是只管节目名与合唱团名。
 */
const KEYWORD_PLACEHOLDER = '请输入节目/合唱团/学校名称'

const keyword = ref(null)
const group = ref(null)
// dist 原文声明但全程未使用的遗留字段，保留以对齐原文
const isDelete = ref(null)
const status = ref(null)
const page = ref(1)
const limit = ref(20)
const total = ref(0)
const data = ref([])

/** dist: getData(){ const e={page,limit,keyword,group,status}; this.$api.admin.report.getList(e).then(...) } */
function getData() {
  const params = {
    page: page.value,
    limit: limit.value,
    keyword: keyword.value,
    group: group.value,
    status: status.value
    // 【本次变更】原先这里还带 choir_name / school_name 两个参数（对应上面被收掉的两个框）。
    // 现在 keyword 一个就覆盖三个字段。值为 null 时无需剔除的写法保持不变
    // —— axios 的默认序列化器会丢弃 null/undefined，即「框里没填」= 不传该条件。
  }
  adminApi.report.getList(params).then(({ data: res }) => {
    // 分页契约：{ data:[...], count:N, code:0, msg:'' }
    if (res.code === 0) {
      total.value = res.count
      data.value = res.data
    } else {
      ElMessage.error(res.msg)
    }
  })
}

// dist: handleSizeChange(e){ this.page=1, this.limit=e, this.getData() }
function handleSizeChange(size) {
  page.value = 1
  limit.value = size
  getData()
}

// dist: refresh(){ this.getData() }  —— 不重置 page
function refresh() {
  getData()
}

// dist: handleCurrentChange(e){ this.page=e, this.getData() }
function handleCurrentChange(current) {
  page.value = current
  getData()
}

/** dist: check(e,t){ const n={id:e,status:t}; this.$api.committee.report.check(n).then(...) } */
function check(id, nextStatus) {
  const payload = { id, status: nextStatus }
  adminApi.report.check(payload).then(({ data: res }) => {
    if (res.code === 0) {
      ElMessage.success('审核成功')
      getData()
    } else {
      ElMessage.error(res.msg)
    }
  })
}

/**
 * dist: returnBack(e){
 *   MessageBox.prompt("请输入驳回原因","驳回",{confirmButtonText:"确定",cancelButtonText:"取消"})
 *     .then(({value:t})=>{ const n={id:e,status:-1,remark:t}; ... })
 *     .catch(()=>{ Message({type:"info",message:"取消输入"}) })
 * }
 */
function returnBack(id) {
  ElMessageBox.prompt('请输入驳回原因', '驳回', {
    confirmButtonText: '确定',
    cancelButtonText: '取消'
  })
    .then(({ value }) => {
      const payload = { id, status: -1, remark: value }
      adminApi.report.check(payload).then(({ data: res }) => {
        if (res.code === 0) {
          ElMessage.success('驳回成功')
          getData()
        } else {
          ElMessage.error(res.msg)
        }
      })
    })
    .catch(() => {
      ElMessage({ type: 'info', message: '取消输入' })
    })
}

onMounted(getData)
</script>

<style lang="scss" scoped>
/* 照搬 dist/css/chunk-335604d9.9c29b119.css 中 [data-v-2d559894] 作用域的规则 */
.bg {
  position: relative;
  background: #fff;
  padding: 10px;
  min-height: calc(100% - 20px);
  width: calc(100% - 20px);
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
}

/* 【本次变更：220px → 300px】220px 是 dist 的值，当时 placeholder 只有「请输入内容」4 个字；
   现在框里写的是「请输入节目/合唱团/学校名称」13 个字（约 182px），220px 扣掉后置按钮（约 40px）
   与输入框内边距（22px）只剩约 158px，右半句会被裁掉。300px 下留给文字约 238px。
   四个页面（ReportList / committee 两个 / 本文件）共用同一个值，要改一起改。 */
.options > .el-input {
  width: 300px !important;
}

.content {
  position: relative;
  background-color: #fff;
  padding: 10px;
  margin-top: 20px;
  box-shadow: 1px 1px 5px 1px #8c939d;
  min-height: calc(100% - 150px);
  width: calc(100% - 20px);
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
    background-color: #036;
  }
}

.my-pagination {
  margin-top: 10px;
}

.menu-button {
  width: 100px;
}

/* dist 的 scoped 块中存在该规则，但本页模板无对应元素（原版遗留），
   保留以保持与 dist CSS 逐条对应 */
.enter-upload {
  margin-top: 20px;
}
</style>
