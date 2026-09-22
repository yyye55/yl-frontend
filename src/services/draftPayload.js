/**
 * 报名暂存：表单 ↔ 草稿 payload 的**唯一**转换层
 *
 * 【为什么必须集中在一处】规范 §三十：不要为了暂存另建一套报名数据结构。
 * 现有表单 form / fileList / fileList1 是唯一事实来源，本文件只做两个方向的搬运：
 *
 *      现有表单 ──buildDraftPayload()──→ 草稿 payload ──→ 后端
 *      后端 ──草稿 payload──restoreDraftPayload()──→ 现有表单
 *
 * 页面不得自己拼 payload（规范 §十六）。新增/编辑/驳回重编辑三个入口全部走这里。
 *
 * ===========================================================================
 * 【payload 形状为什么是这样：以现有后端为准，不照抄规范的示例字段】
 * ===========================================================================
 * 规范 §十六 自己写明了「实际字段必须以当前项目现有报名表单为准。不要机械复制示例字段」。
 * 规范 §十七 / §六 的示例（group:1、establishment:"第一中学"、file:"35"）来自另一个项目
 * （「第一中学合唱团」「黄河颂」，是教师组/合唱模型），与本项目模型**有三处实质冲突**，
 * 逐条对照后端 apps/core/models.py：
 *
 *  1) group / establishment 是 **CharField，存中文字符串**（"小学组" / "管乐团"）。
 *     ⚠️ 绝不能按 §十七 改成整数枚举：后端 apps/api/views.py 的 scoped_total() /
 *     stats_admin() 按 group 字符串过滤，写入 1 会让统计与导出全部失效。
 *     ⇒ 本文件按项目现状发中文。这是「以现有真实代码为准」压过示例的地方。
 *
 *  2) DB 主键是 **BigAutoField / IntegerField**（Report.spectrum / Report.file /
 *     ReportPerson.person_id）。§十七 要求 ID 一律 string，Django 存库时会自行
 *     把 "35" 强制转成 35，所以两边都能跑。本文件按 §十七 发 string（无损），
 *     **但这一条需要后端确认**，已记入「后端接口不一致问题」。
 *
 *  3) ⚠️ **time_length 绝不能发 null**。规范 §十七 写「没有填写 → null」，
 *     但后端 Report.time_length 是 `IntegerField(default=0)`，**没有 null=True**，
 *     发 null 会直接 IntegrityError。⇒ 本文件未填写时发 0（与后端默认值一致）。
 *     同理 choir_name / name / establishment / contact_name / contact_phone
 *     都是 `CharField(default=" ")` 且**不带 null=True**，故发 "" 而不是 null；
 *     只有 name1 / school_name / desc / contact_way 等 null=True 的字段才发 null。
 *
 * 【person 的形状】后端 apps/core/services.py:store_people() 收的是**扁平行**
 * （Person 的各字段 + position + type），它对未知键做了 Person 字段名白名单过滤
 * （services.py:186），所以多带一个 person_id 是安全的、会被忽略。
 * ⇒ 本文件同时给出规范 §十六 要求的 person_id/name/card/position/type，
 *   以及本项目真实表单独有的 age/gender/school/phone/instrument/head——
 *   后者是「字段一个都不能少」的硬要求，缺了人员的学校/乐器就丢了。
 *
 * 【顺序】后端 create 收到的 person 顺序在本项目里是**教师在前、人员在后**
 * （OrchestraForm.onSubmit 先 push teacher、再 push person），本文件沿用，
 * 以保证草稿提交后的结果与现在直接 create 的结果逐字节一致。
 */

import { getM, getS } from '@/utils/date'

/** 表单里的标量字段 → 原样往返（不含 time_length / 文件 / 人员，它们要转换） */
const SCALAR_KEYS = [
  'choir_name', 'name', 'name1', 'school_name', 'desc',
  'group', 'establishment',
  'contact_name', 'contact_phone', 'contact_way'
]

/** 后端模型里没有 null=True 的 CharField —— 这些**不能**发 null，只能发 "" */
const NOT_NULLABLE_STRINGS = ['choir_name', 'name', 'establishment', 'contact_name', 'contact_phone']

const has = (v) => v !== null && v !== undefined && v !== ''
const str = (v) => (has(v) ? String(v) : '')
/** 可空字段：空值统一发 null（规范 §十七「空值 → null / ""」） */
const nullStr = (v) => (has(v) ? String(v) : null)

/** 整数或 null；非数字一律 null，绝不产出 NaN（NaN 序列化成 null 但语义是脏数据） */
function intOrNull(v) {
  if (!has(v)) return null
  const n = Number(v)
  return Number.isFinite(n) ? Math.trunc(n) : null
}

/** 取文件列表里第一个的 id；没有则 null。只取 ID，绝不带二进制/路径/凭证（规范 §十八） */
function firstFileId(list) {
  const arr = Array.isArray(list) ? list : []
  const id = arr.length > 0 ? arr[0].id : null
  return id === null || id === undefined || id === '' ? null : String(id)
}

/** 一行参展人员 → payload 里的一条 person */
function personToPayload(row) {
  const r = row || {}
  return {
    // §十六 的键名。后端 store_people 有字段白名单，多带它会被安全忽略。
    person_id: has(r.id) ? String(r.id) : null,
    name: str(r.name),
    // 身份证号必须字符串：Number() 会丢掉 18 位里的有效精度（§十七）
    card: str(r.card),
    age: intOrNull(r.age),
    gender: nullStr(r.gender),
    school: nullStr(r.school),
    phone: nullStr(r.phone),
    instrument: nullStr(r.instrument),
    head: nullStr(r.head),
    // 枚举用整数，未选为 null（§十七）。注意 el-option 的 :value 本来就是 0/1/2 数字。
    type: has(r.type) ? Number(r.type) : null,
    position: has(r.position) ? Number(r.position) : null
  }
}

/** 一行 payload person → 表单里的一行 */
function payloadToPerson(row) {
  const r = row || {}
  return {
    // 表单行用 id 承载 person_id（PersonTable 的既有约定）
    id: has(r.person_id) ? r.person_id : undefined,
    name: r.name ?? '',
    card: r.card ?? '',
    age: r.age ?? '',
    gender: r.gender ?? '',
    school: r.school ?? '',
    phone: r.phone ?? '',
    instrument: r.instrument ?? '',
    head: r.head ?? '',
    type: has(r.type) ? Number(r.type) : undefined,
    position: has(r.position) ? Number(r.position) : undefined
  }
}

/**
 * 现有表单 → 草稿 payload（完整快照，规范 §十五）
 *
 * @param {{form: object, fileList?: Array, fileList1?: Array}} input
 *   form   —— OrchestraForm 的 form（含 person / teacher / minute / second）
 *   fileList  —— 视频文件列表（对应 Report.file）
 *   fileList1 —— 乐团集体电子照（对应 Report.spectrum）
 *
 * 【必须是完整快照】每次暂存都发全量，不做增量。人员列表的新增/修改/删除/排序，
 * 全部体现在这一份完整的 person 数组里（顺序即用户看到的顺序）。
 */
export function buildDraftPayload({ form, fileList, fileList1 }) {
  const f = form || {}
  const teachers = Array.isArray(f.teacher) ? f.teacher : []
  const students = Array.isArray(f.person) ? f.person : []

  // 未填写发 0 而不是 null —— 理由见文件头第 3 条（模型无 null=True）
  const timeLength = Number(f.minute || 0) * 60 + Number(f.second || 0)

  const payload = {
    choir_name: str(f.choir_name),
    name: str(f.name),
    name1: nullStr(f.name1),
    school_name: nullStr(f.school_name),
    desc: nullStr(f.desc),
    // 枚举：未选为 null。**保持中文字符串**，不转整数，理由见文件头第 1 条。
    group: has(f.group) ? f.group : null,
    establishment: str(f.establishment),
    contact_name: str(f.contact_name),
    contact_phone: str(f.contact_phone),
    contact_way: nullStr(f.contact_way),
    time_length: Number.isFinite(timeLength) ? timeLength : 0,
    spectrum: firstFileId(fileList1),
    file: firstFileId(fileList),
    dinner_reservation: Array.isArray(f.dinner_reservation) ? f.dinner_reservation : [],
    // 教师在前、人员在后 —— 与 OrchestraForm.onSubmit 拼 allPeople 的顺序一致
    person: [...teachers.map(personToPayload), ...students.map(personToPayload)]
  }

  return payload
}

/**
 * 草稿 payload → 现有表单（完整恢复，规范 §八）
 *
 * 【与旧 getMessage() 的一处刻意差异】旧的编辑页回填在 `person.length > 0` 时才写
 * form.person / form.teacher（dist 遗留行为，已在其注释里标注为缺陷）。草稿恢复
 * 按规范 §八 要求「以服务端返回的完整 payload 恢复」，因此**无条件赋值**——
 * 否则「草稿里把人员全删光」这一动作无法被恢复出来。
 *
 * @returns {{form: object, fileList: Array, fileList1: Array}}
 */
export function restoreDraftPayload(payload, baseForm) {
  const p = payload || {}
  const form = { ...(baseForm || {}) }

  // 1) 标量字段：逐项覆盖。循环写法保证「新增字段忘了加」时不会静默丢数据——
  //    只要 SCALAR_KEYS 里有、payload 里有，就一定被恢复。
  for (const key of SCALAR_KEYS) {
    if (key in p) form[key] = p[key]
  }

  // 2) 时长：payload 存的是秒，表单用的是分/秒两个输入框
  const total = Number(p.time_length || 0)
  if (total > 60) {
    form.minute = getM(total)
    form.second = getS(total)
  } else {
    form.minute = 0
    form.second = total
  }

  /*
   * 2.5) 用餐预约：目前模板里**没有任何控件绑定它**（dist 遗留），所以 payload 里
   *      始终是 buildDraftPayload 兜底出来的 []，恢复与否在界面上看不出差别。
   *      仍然显式恢复，是为了让 build→restore→build 成为**幂等的往返**：
   *      不写这一行时，该键只能靠 `{...baseForm}` 撞运气活下来 —— 一旦调用方传入的
   *      baseForm 里没有这个键（例如编辑页刚进页面、form 还没初始化），它就会被
   *      build 的兜底 [] 覆盖掉。将来真要接上用餐预约控件时，这个静默丢数据
   *      的坑很难查。加这一行的成本是零。
   */
  if (Array.isArray(p.dinner_reservation)) form.dinner_reservation = p.dinner_reservation

  // 3) 人员：按 (type=1 且 position=4) 拆回「指导教师」与「参展人员」两张表
  const people = Array.isArray(p.person) ? p.person : []
  const students = []
  const teachers = []
  people.forEach((row) => {
    const item = payloadToPerson(row)
    if (item.type === 1 && item.position === 4) teachers.push(item)
    else students.push(item)
  })
  form.person = students
  form.teacher = teachers

  // 4) 文件：payload 里只有 ID（规范 §十八），没有文件名/地址
  return {
    form,
    fileList: fileSlot(p.file, '视频'),
    fileList1: fileSlot(p.spectrum, '乐团集体电子照')
  }
}

/**
 * 用文件 ID 还原一个 el-upload 列表项。
 *
 * 【已知缺口，需后端配合】规范 §十八 规定草稿 payload 只存文件 ID，所以恢复时
 * 拿不到 filename / url，预览与文件名会缺失（旧的编辑页是读正式 Report 的
 * report_dict，那里的 file/spectrum 是连表的完整对象，所以有名字和地址）。
 * 这里用一条**显式标注的占位名**而不是留空，避免用户以为文件丢了；
 * 提交用的仍然是 ID，数据不丢。
 *
 * 若要恢复出真实的文件名/预览，需要后端在草稿详情里一并返回文件元信息
 * （或允许 payload 多带一个 filenames 字段）—— 已记入待后端确认项。
 */
function fileSlot(id, label) {
  if (!has(id)) return []
  return [{ id, name: `${label}（已上传，ID ${id}）`, url: '' }]
}

/**
 * payload 的稳定签名，用于自动暂存的「没有变化就不发」判据（规范 §二十二）。
 * 直接 JSON.stringify：键序由对象字面量顺序决定，同一表单状态必然得到同一字符串。
 */
export function payloadSignature(payload) {
  try {
    return JSON.stringify(payload)
  } catch (_) {
    // 循环引用等异常情况：返回 null 表示"无法判定"，调用方按"有变化"处理（宁可多发一次）
    return null
  }
}

export { NOT_NULLABLE_STRINGS }
