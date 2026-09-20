<template>
  <div class="bg">
    <p class="title">现场展演节目修改</p>
    <div class="my-form">
      <!-- 基础信息 -->
      <div class="basic">
        <div class="basic-title">基础信息</div>

        <!-- 节目名称 -->
        <div class="basic-line">
          <span class="basic-line-title">节目名称：</span>
          <el-input v-model="form.name" style="margin-top:10px" />
        </div>
        <div class="basic-note">
          「《》+《》"+" 代表是两首曲目，曲目名称需加"《》"，如需修改节目名称，请按规范修改！
        </div>

        <!-- 只读字段 -->
        <div class="basic-line">
          <span class="basic-line-title">合唱团名称：</span>
          <span class="basic-value">{{ form.choir_name || '-' }}</span>
        </div>
        <div class="basic-line">
          <span class="basic-line-title">组别：</span>
          <span class="basic-value">{{ form.group || '-' }}</span>
        </div>
        <div class="basic-line">
          <span class="basic-line-title">联系人：</span>
          <span class="basic-value">{{ form.contact_name || '-' }}</span>
        </div>
        <div class="basic-line">
          <span class="basic-line-title">联系人电话：</span>
          <span class="basic-value">{{ form.contact_phone || '-' }}</span>
        </div>
        <div class="basic-line">
          <span class="basic-line-title">区县/学校名称：</span>
          <span class="basic-value">{{ form.district_or_school_name || '-' }}</span>
        </div>

        <!-- 是否参加过其他展演 -->
        <div class="basic-line">
          <span class="basic-line-title">该作品是否曾参加过其他展演：</span>
          <el-select v-model="form.is_other_show" style="width:200px">
            <el-option label="是" value="是" />
            <el-option label="否" value="否" />
          </el-select>
        </div>

        <!-- 曾参加过其他展演信息 -->
        <div v-if="form.is_other_show === '是'" class="basic-line">
          <span class="basic-line-title">曾参加过其他展演信息：</span>
          <div class="basic-note" style="margin-top:4px">
            格式为：活动名称-日期-奖项 例：西部音乐周展演活动-2021年10月10日-三等奖
          </div>
          <el-input
            v-model="form.other_show_message"
            type="textarea"
            :autosize="{ minRows: 6, maxRows: 8 }"
            placeholder="需要填写如下信息：
1.曾参与其他展演活动名称
2.曾参与其他展演活动时间
3.曾参与其他展演活动获得奖项
格式为：活动名称-日期-奖项 例：西部音乐周展演活动-2021年10月10日-三等奖"
            style="margin-top:10px"
          />
        </div>
      </div>

      <!-- 人员信息 -->
      <div class="person">
        <div class="section-title">带队教师</div>
        <LeaderTable ref="leaderRef" :showdata="form.leader" />

        <div class="section-title" style="margin-top:24px">参展人员</div>
        <CrewTable ref="crewRef" :showdata="form.crew" />
      </div>

      <!-- 提交按钮 -->
      <div class="submit-row">
        <el-button type="primary" @click="onSubmit">确认提交</el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * 在线展演编辑页 —— /online/edit/:id
 *
 * 【dist 已确认】chunk-5ab90d77 模块 2cd7（组件名 name:"ElementaryEdit"）。
 *
 * 功能：修改展演节目的基础信息、带队教师和参演人员。
 * 表单数据通过 GET /api/live/:id 获取，回填后用户可修改节目名称、
 * 是否参加过其他展演及其详细信息、带队教师和参展人员数据，
 * 点击「确认提交」时通过 PUT /api/live/ 更新。
 *
 * API：
 *   GET  /api/live/:id  → 回填（liveApi.getLiveReportById）
 *   PUT  /api/live/     → 更新（liveApi.updateLiveReport）
 *
 * 提交 payload 结构：
 *   { id, name, is_other_show, other_show_message, leader, crew }
 */
import { ref, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { liveApi } from '@/api/live'
import LeaderTable from '@/components/online/LeaderTable.vue'
import CrewTable from '@/components/online/CrewTable.vue'

const route = useRoute()
const router = useRouter()

// ===================== data =====================
const leaderRef = ref(null)
const crewRef = ref(null)

const form = reactive({
  id: null,
  name: '',
  choir_name: '',
  group: '',
  contact_name: '',
  contact_phone: '',
  district_or_school_name: '',
  is_other_show: '',
  other_show_message: '',
  leader: [],
  crew: []
})

// ===================== lifecycle =====================
import { onMounted } from 'vue'
onMounted(() => { getMessage() })

// ===================== methods =====================
function getMessage() {
  const id = route.params.id
  liveApi.getLiveReportById(id).then((res) => {
    const d = res.data
    if (d.code === 0) {
      const r = d.data
      Object.assign(form, {
        id: r.id,
        name: r.name,
        choir_name: r.choir_name,
        group: r.group,
        contact_name: r.contact_name,
        contact_phone: r.contact_phone,
        district_or_school_name: r.district_or_school_name,
        is_other_show: r.is_other_show,
        other_show_message: r.other_show_message,
        leader: r.leader || [],
        crew: r.crew || []
      })
    } else {
      ElMessage.error(d.msg || '加载失败')
    }
  })
}

function onSubmit() {
  // 校验节目名称
  if (!form.name) {
    ElMessage.error('节目名称需填写！')
    return
  }
  if (!form.is_other_show) {
    ElMessage.error('该作品是否曾参加过其他展演需选择！')
    return
  }
  if (form.is_other_show === '是' && !form.other_show_message) {
    ElMessage.error('参加过其他展演信息需填写！')
    return
  }
  // 带队教师校验
  if (leaderRef.value) {
    const leaderResult = leaderRef.value.getData()
    if (!leaderResult.ok) {
      ElMessage.error('带队教师：' + leaderResult.msg)
      return
    }
  }
  // 参展人员校验
  if (crewRef.value) {
    const crewResult = crewRef.value.getData()
    if (!crewResult.ok) {
      ElMessage.error('参展人员：' + crewResult.msg)
      return
    }
  }

  const payload = {
    id: form.id,
    name: form.name,
    is_other_show: form.is_other_show,
    other_show_message: form.other_show_message,
    leader: leaderRef.value ? leaderRef.value.getData().data : [],
    crew: crewRef.value ? crewRef.value.getData().data : []
  }

  liveApi.updateLiveReport(payload).then((res) => {
    const d = res.data
    if (d.code === 0) {
      ElMessage.success('提交成功')
      router.push({ path: '/online/list' })
    } else {
      ElMessage.error(d.msg || '提交失败')
    }
  })
}
</script>

<style lang="scss" scoped>
.bg {
  padding: 10px;
  position: relative;
}

.title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 16px;
}

.my-form {
  background: #fff;
  border-radius: 4px;
  padding: 20px;
}

.basic {
  margin-bottom: 24px;
}

.basic-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #ebeef5;
}

.basic-line {
  display: flex;
  align-items: flex-start;
  margin-bottom: 12px;
  min-height: 32px;
  line-height: 32px;
}

.basic-line-title {
  min-width: 180px;
  color: #606266;
  font-size: 14px;
}

.basic-value {
  color: #303133;
  font-size: 14px;
}

.basic-note {
  font-size: 12px;
  color: #f56c6c;
  line-height: 1.5;
  margin-bottom: 8px;
}

.section-title {
  font-size: 16px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 12px;
}

.person {
  padding: 16px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  margin-bottom: 16px;
}

.submit-row {
  text-align: center;
  padding-top: 20px;
}
</style>
