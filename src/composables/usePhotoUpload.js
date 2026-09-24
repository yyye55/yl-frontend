/**
 * 电子照片上传 —— 参展人员表 / 指导教师表 **共用的一份实现**
 *
 * ===========================================================================
 * 【为什么要有这个文件】
 * ===========================================================================
 * 两张表的照片功能是同一套规则，一个字都不该有第二份副本：
 *
 *   · 体积上限 100KB、格式 JPG、命名规则「学生=身份证后6位 / 教师=姓名+身份证后6位」
 *     来自红头文件；这三条**改一次就要两张表同时生效**，否则会出现
 *     「人员表收 100KB、教师表收 1MB」这种漂移。
 *   · 上传通道（OSS 代传 + /api/file/create 落库）两张表也完全相同。
 *
 * 这是本仓库既有的做法：校验规则收在 @/config/personFields.js、时长规则收在
 * personRules.js，都是「一份实现、多处引用」。本文件同理，只是这次连 UI 行为
 * （弹文件框、回写 head）也一起收进来。
 *
 * ===========================================================================
 * 【来源：从 PersonTable.vue 原样搬出，逻辑一个字符都没改】
 * ===========================================================================
 * 搬出的是 PersonTable 里这四个函数：parsePhotoName / beforeUpload /
 * beforeUploadSingle / uploadFileSingle，以及 upAvatar 与那个模块级 Arrayindex。
 * 搬动时只做了一件事：把「改哪一行」从模块级变量改成 makePhotoUpload 的入参 ——
 * 原来 `let Arrayindex = 0` 写在模块作用域，同一个模块被两个组件实例共用时会互相
 * 覆盖；现在它随每个组件实例各存一份（dist 原版是 `this.Arrayindex`，即实例属性，
 * 这个改动反而更贴近 dist）。
 *
 * ===========================================================================
 * 【dist 已知缺陷：原样保留，没有顺手修】
 * ===========================================================================
 * a. upAvatar 里 `event.preventDefault()` 引用的是**全局 window.event**
 *    （浏览器非标准但普遍存在），而不是形参 —— dist 模板里传进 upAvatar 的其实是
 *    行下标 index，本来也拿不到事件对象。保留原样。
 *    → 影响面：Chrome / Edge 下 window.event 在事件派发期间有值，可用；
 *      若哪天要支持 Firefox 老版本或 Safari，这里会抛 TypeError。
 * b. beforeUpload 返回的是「先判体积、再判格式」的顺序：体积超限时**优先**报体积错误，
 *    即使格式也不对。下面用同序的 if 链复现，未调整判定优先级。
 */

import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { fileApi } from '@/api/misc'
import { uploadToOss } from '@/services/ossUpload'

/**
 * 从「去掉扩展名的文件名」里解析出身份证后 6 位 + 姓名（仅教师）。
 * 解析不出来返回 null。beforeUpload 与 uploadFileBatch 共用这一份判据，
 * 避免两处正则各写一遍后漂移。
 *   学生：`123456`      → { cardTail: '123456', personName: '' }
 *   教师：`张三123456`  → { cardTail: '123456', personName: '张三' }
 */
export function parsePhotoName(nameNoExt) {
  if (/^\d{6}$/.test(nameNoExt)) {
    return { cardTail: nameNoExt, personName: '' }
  }
  if (/^\D.*\d{6}$/.test(nameNoExt)) {
    return { cardTail: nameNoExt.slice(-6), personName: nameNoExt.slice(0, -6) }
  }
  return null
}

/**
 * 【基础闸】只判「与哪一行无关」的事：体积 ≤100KB、格式 JPG、命名格式合法。
 *
 * 红头文件要求：师生电子照片为蓝底免冠证件照、JPG、每张不超过 100KB；
 * 学生照片命名「身份证后6位.jpg」、教师照片命名「姓名+身份证后6位.jpg」。
 * 客户端硬校验：JPG + ≤100KB + 命名格式；只有「蓝底」无法像素级校验，仅在前端提示。
 *
 * 两条上传路径都过这道闸：批量直接绑它，单张经 beforeUploadSingle 调进来。
 * 命名格式之所以放在这里（而不是只在批量里判）：格式不对的照片一旦传上 OSS 并写进
 * files 表，就成了没人认领的孤儿文件；前移到这道闸，格式不对**根本不发请求**。
 */
export function beforeUpload(file) {
  const isJpg = file.type === 'image/jpeg'

  // dist 原文顺序：先判体积、再判格式（保留）
  const sizeOk = file.size / 1024 < 100
  if (!sizeOk) {
    ElMessage.error('文件大小不能超过100KB')
    return false
  }
  if (!isJpg) {
    ElMessage.error('照片格式只能是JPG')
    return false
  }

  const nameNoExt = file.name.substring(0, file.name.lastIndexOf('.'))
  if (!parsePhotoName(nameNoExt)) {
    ElMessage.error(
      '文件名格式错误：' + file.name + '（学生照片：身份证号后6位；教师照片：姓名+身份证号后6位）'
    )
    return false
  }
  return isJpg && sizeOk
}

/**
 * 【行内闸】单张上传专用的校验器 —— 只给隐藏的那条单张 el-upload 用。
 *
 * 【为什么不在 beforeUpload 里判】beforeUpload 是两条路共用的基础闸，只能判
 * 「与哪一行无关」的事；而「文件名对不对得上这一行的人」需要行内姓名/身份证号，
 * 只有单张路径拿得到 —— 那正是本函数的职责。
 *
 * 【格式校验已在 beforeUpload 里做过一遍】所以对「格式就不合法」的文件
 * （如 照片.jpg），用户看到的是 beforeUpload 那句格式提示；只有格式合法但写错人时，
 * 才落到最后那句「请改为 xxx.jpg」。单张不靠文件名定位（靠 upAvatar 存下的行下标），
 * 这里的校验只为让入库的 Files.filename 与批量上传同一口径。
 *
 * 规则与批量的匹配算法完全一致：
 *   - 学生行：去扩展名后 === 该行身份证号后 6 位
 *   - 教师行：去扩展名后 === 该行姓名 + 该行身份证号后 6 位
 *
 * @param {File} file
 * @param {object|undefined} item 目标行；undefined 表示没定位到行
 */
export function beforeUploadSingle(file, item) {
  // 格式 / 体积沿用批量那套，逻辑一个字不重写
  if (!beforeUpload(file)) return false

  if (!item) {
    // 行下标正常路径下由 upAvatar 刚刚写入；这里是防哑雷
    ElMessage.error('未定位到人员行，请重新点击该行的「上传照片」')
    return false
  }
  if (item.type !== 0 && item.type !== 1) {
    ElMessage.error('请先选择该行的身份，再上传照片')
    return false
  }
  if (!item.card) {
    ElMessage.error('请先填写该行的身份证号，再上传照片')
    return false
  }
  const isTeacher = item.type === 1
  if (isTeacher && !item.name) {
    ElMessage.error('请先填写该行的姓名，再上传照片')
    return false
  }

  // 身份证短于 6 位时按整串比对，与 uploadFileBatch 的取法保持一致
  const tail = item.card.length >= 6 ? item.card.substring(item.card.length - 6) : item.card
  const expected = isTeacher ? item.name + tail : tail
  const actual = file.name.substring(0, file.name.lastIndexOf('.'))
  if (actual !== expected) {
    ElMessage.error('文件名不符合命名规则，请改为：' + expected + '.jpg 后再上传')
    return false
  }
  return true
}

/**
 * 传一张照片到 OSS 并落库，返回可写进 `head` 的 URL。
 *
 * 【顺序不能反】先 uploadToOss 拿到 url，再用这个 url 调 /api/file/create 落库，
 * 最后才把 url 写进行数据 —— dist 就是这个顺序，后端 Files 表也要有这条记录。
 *
 * 【为什么返回 Promise 而 http-request 不返回】Element Plus 只在 httpRequest
 * 返回 Promise 时才跑它自己那套内部成功路径（往 fileList 里塞条目）；本组件靠
 * :show-file-list="false" 不显示列表，所以由下面的 uploadFileSingle 吞掉 Promise，
 * 让行为完全由 .then 控制。
 *
 * 【顺带修掉的缺陷】dist 的 uploadSuccess 用 `info.filename = this.filename`
 * （beforeUpload 里存下的模块级变量），并发上传时有串号风险；这里改用
 * options.file.name 现取，不再共享状态。
 */
export function uploadPhoto(file) {
  return uploadToOss({ file, biz: 'image' }).then(({ url }) => {
    const info = {}
    info.filename = file.name
    info.type = file.type
    info.size = file.size
    info.url = url

    return fileApi.saveFileInfo(info).then(({ data: body }) => {
      if (body.code !== 0) {
        ElMessage.error('文件上传失败')
        return null
      }
      return info.url
    })
  })
}

/**
 * 给一个表格组件接上「单张上传照片」的全部零件。
 *
 * @param {(index: number) => object|undefined} getRowAt
 *        按行下标取当前组件的行对象，例如 `(i) => data.value[i]`。
 *        写成回调是为了让本文件不认识调用方的数据结构（两张表用的是各自的 ref 数组）。
 * @returns {{
 *   uploadTrigger: import('vue').Ref,   // 绑到隐藏 el-upload 内部那个触发按钮上（模板 ref）
 *   upAvatar: (index: number) => void,  // 「上传照片」按钮的点击处理
 *   beforeUpload: (file: File) => boolean,        // 批量路径直接绑它
 *   beforeUploadSingle: (file: File) => boolean,  // 单张路径绑它（已闭包了行下标）
 *   uploadFileSingle: (options: object) => void   // 绑 :http-request
 * }}
 */
export function usePhotoUpload(getRowAt) {
  /** 隐藏的单张上传 input 的触发按钮（dist: this.$refs.uploadAvatar） */
  const uploadTrigger = ref(null)

  /* dist 里这个下标是「挂在 this 上、未写进 data」的实例属性（this.Arrayindex）。
     放进闭包 = 每个组件实例各一份，与 dist 的实例属性语义一致。 */
  let targetIndex = 0

  /** dist: upAvatar(e){ event.preventDefault(), this.Arrayindex=e, this.$refs.uploadAvatar.click() } */
  function upAvatar(index) {
    // 【dist 已知缺陷】引用全局 window.event 而非形参，原样保留（见文件头 a）
    event.preventDefault()
    targetIndex = index
    uploadTrigger.value.click()
  }

  /** 单张路径的校验：把「当前该写哪一行」喂给共用的行内闸 */
  function beforeUploadSingleForRow(file) {
    return beforeUploadSingle(file, getRowAt(targetIndex))
  }

  /** dist 原文见 git 历史：uploadSuccess(e,t){ n.filename=this.filename, ... } */
  function uploadFileSingle(options) {
    const file = options.file
    uploadPhoto(file)
      .then((url) => {
        // 上传失败时 uploadPhoto 已经弹过提示并回 null，这里不重复弹、也不写 head
        if (!url) return
        const row = getRowAt(targetIndex)
        // 行可能在上传期间被删掉（用户点了「删除」），此时静默丢弃即可
        if (row) row.head = url
      })
      .catch((err) => {
        if (!err.shown) ElMessage.error(err.message || '文件上传失败')
      })
  }

  return {
    uploadTrigger,
    upAvatar,
    beforeUpload,
    beforeUploadSingle: beforeUploadSingleForRow,
    uploadFileSingle
  }
}
