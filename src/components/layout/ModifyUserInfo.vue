<template>
  <div v-if="user">
    <el-dialog v-model="showInfo" title="修改信息" width="40%">
      <p style="margin:10px;">提示：修改信息后，修改的账号需要重新登录</p>

      <el-form
        ref="ruleForm"
        class="demo-ruleForm"
        :model="form"
        :rules="rules"
        label-width="120px"
        size="mini"
      >
        <el-form-item label="账号" prop="username">
          <el-input v-model="form.username" disabled />
        </el-form-item>
        <el-form-item label="名称" prop="nickname">
          <el-input v-model="form.nickname" />
        </el-form-item>
        <el-form-item label="修改人姓名" prop="leader">
          <el-input v-model="form.leader" />
        </el-form-item>
        <el-form-item label="修改人联系方式" prop="tel">
          <el-input v-model="form.tel" />
        </el-form-item>
        <el-form-item label="新密码" prop="password">
          <el-input v-model="form.password" type="password" />
        </el-form-item>
        <el-form-item label="确认密码">
          <el-input v-model="form.password1" type="password" />
        </el-form-item>

        <p style="margin:10px;">提示：如果输入密码，则会更新密码，不输入，则不会改变密码。</p>
        <p style="margin:10px;">其他信息：（可以填写一些关于账号的介绍）</p>
        <el-input
          v-model="form.description"
          type="textarea"
          :rows="5"
          maxlength="200"
          show-word-limit
        />
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button size="mini" @click="showInfo = false">取 消</el-button>
          <el-button type="primary" size="mini" @click="submit">确 定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
/**
 * 修改信息弹窗
 *
 * 【可信度：A】逐项照搬 dist/chunk-40286ec0 中的 ModifyUserInfo 组件（name: "ModifyUserInfo"）。
 *
 * 原文关键逻辑：
 *   data(){ return { showInfo:false, form:{}, rules:{
 *     nickname:[{required:true,message:"请输入名称",trigger:"blur"},{min:2,max:20,message:"长度在 2 到 20 个字符",trigger:"blur"}],
 *     leader:  [{required:true,message:"请输入负责人名称",trigger:"blur"},{min:2,max:20,message:"长度在 2 到 10 个字符",trigger:"blur"}],
 *     password:[{required:false},{min:8,max:20,message:"长度在 8 到 10 个字符",trigger:"blur"}],
 *     tel:     [{required:true,message:"电话号码必填",trigger:"blur"}]
 *   }}}
 *   mounted(){ this.form=this.user; this.$set(this.form,"tel",""); this.$set(this.form,"leader","");
 *              this.$set(this.form,"password",""); this.$set(this.form,"password1","") }
 *   show(){ this.showInfo=!0 }
 *   submit(){
 *     if(""!==this.form.password && this.form.password!==this.form.password1) return ElMessage.error("两次密码不一致")
 *     this.$api.communal.updateUserInfo(this.form).then(({data:e})=>{
 *       0===e.code ? (this.showInfo=!1, ElMessage.success("修改成功")) : ElMessage.warning(e.msg) })
 *   }
 *
 * 【文案出入说明】leader 的提示语写「长度在 2 到 10 个字符」，但规则其实是 max:20；
 * password 提示语写「长度在 8 到 10 个字符」，规则其实是 max:20。属原版笔误，原样保留。
 *
 * 【Vue 3 差异说明】dist 是 `this.form = this.user`（同一个对象引用，靠 $set 补字段）。
 * 这里改为浅拷贝后补默认值，避免直接改写 props 传入的 user 对象。
 * 行为保持一致：每次打开都会把 修改人姓名/联系方式/密码 重置为空。
 */

import { ref, reactive, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { userApi } from '@/api'

const props = defineProps({
  user: { type: Object, default: null }
})

const showInfo = ref(false)
const form = reactive({})

const rules = {
  nickname: [
    { required: true, message: '请输入名称', trigger: 'blur' },
    { min: 2, max: 20, message: '长度在 2 到 20 个字符', trigger: 'blur' }
  ],
  leader: [
    { required: true, message: '请输入负责人名称', trigger: 'blur' },
    { min: 2, max: 20, message: '长度在 2 到 10 个字符', trigger: 'blur' }
  ],
  password: [
    { required: false },
    { min: 8, max: 20, message: '长度在 8 到 10 个字符', trigger: 'blur' }
  ],
  tel: [{ required: true, message: '电话号码必填', trigger: 'blur' }]
}

/** 对应 dist 的 mounted 逻辑：以 user 为底，并把这几项重置为空 */
function resetForm() {
  if (!props.user) return
  Object.assign(form, props.user, {
    tel: '',
    leader: '',
    password: '',
    password1: ''
  })
}

watch(() => props.user, resetForm, { immediate: true })

/** 对外方法，与 dist 的 this.$refs.modify.show() 等价 */
function show() {
  showInfo.value = true
}

function submit() {
  if (form.password !== '' && form.password !== form.password1) {
    return ElMessage.error('两次密码不一致')
  }
  userApi.updateUserInfo(form).then(({ data: res }) => {
    if (res.code === 0) {
      showInfo.value = false
      ElMessage.success('修改成功')
    } else {
      ElMessage.warning(res.msg)
    }
  })
}

defineExpose({ show })
</script>
