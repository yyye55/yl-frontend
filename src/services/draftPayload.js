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

/**
 * 【服务端字段：界面上没有对应控件，只做「读回来 → 原样送回去」的往返】
 *
 * 这两个字段是**组委会/系统写的**，用户不填，本文件也不该改它们 ——
 * 但草稿链路是「整份 payload 覆盖写」的：
 *
 *   后端 edit-draft 把正式 Report 整份转成 payload（含 remark）→ 前端恢复 →
 *   用户改完重新提交 → 后端 update_rejected_report_from_submission **全量 setattr**
 *
 * 中间任何一环把字段丢掉，它就变成 null 写回库里。原先这两个键不在 SCALAR_KEYS 里，
 * 于是「驳回 → 修改 → 重新提交」之后，**组委会写的驳回原因被静默清空**：
 * 列表页「查看驳回信息」永远空白、导出表备注列也丢，用户根本不知道自己当初为什么被退。
 *
 * 旧实现不会丢（编辑页整份回传 report_dict、后端只写请求里出现的键），
 * 所以这是暂存改造引入的回归，不是历史缺陷。
 *
 * 【为什么不干脆不发送这两个键】后端 normalize_draft_payload 对 REPORT_FIELDS 里
 * **每一个**键都写值、缺失即 None，所以「不发」等于「发 null」，同样会清空。
 * 唯一的办法就是把读到的值原样带回去。
 */
const ECHO_KEYS = ['establishment_name', 'remark']

/** 后端模型里没有 null=True 的 CharField —— 这些**不能**发 null，只能发 "" */
const NOT_NULLABLE_STRINGS = [
  'choir_name', 'name', 'group', 'establishment', 'contact_name', 'contact_phone'
]

/**
 * 【第十二届·第十轮】是否把「指挥在指导教师表里的位置」随 payload 发给后端。
 *
 * 对应的后端字段是 report_person.display_order（迁移 0012）。它是前后端的**配套改动**：
 *   · 后端没有这一列时，payload 里多这个键会被 _person() 的 PERSON_FIELDS 精确白名单
 *     判成「person[N] 存在不允许字段」→ **保存草稿直接 400**（不是静默丢弃）。
 *   · 后端有这一列时，不发就是"不记录位置"，退回改动前的行为（编辑页指挥排最后）。
 *
 * 【这个开关存在的唯一理由】给"前端先上、后端还没上"这个窗口留一条一行回滚：
 * 真遇到保存 400，把这里改成 false 立刻恢复旧行为，不用回滚整个前端。
 *
 * 【当前值 true 的依据】后端 `d:/yl-all/yilinbei` 已完成并应用：
 *   models.py 的 ReportPerson.display_order、迁移 0012、
 *   report_drafts.py 的 PERSON_FIELDS / _person() / payload_from_report()、
 *   services.py 的 _display_order()。本地开发库 report_person 表已确认有该列。
 */
const SEND_DISPLAY_ORDER = true

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

/**
 * 【第十二届·第五轮】署名排序专用归一化：正整数或 null。
 *
 * 【为什么不能直接用 intOrNull】intOrNull(0) 会**原样返回 0**，
 * 而后端 report_drafts._person() 对 signature_order 的校验是 minimum=1 ——
 * 发 0 会得到「person[0].signature_order 不能小于 1」这样一个用户完全看不懂的 400。
 * 界面上填不出 0（下拉只有 不填 / 1 / 2），但草稿回填、批量导入、手工改数据都可能带进来。
 * 这里是发出去之前的最后一道关，成本一行，消掉一整类「暂存莫名 400」。
 *
 * 【为什么不写成 v === 1 || v === 2】那等于把「只有两个署名位」这条业务规则
 * 抄进传输层。后端认的是「≥1 的整数」，这里就照后端认——将来真要加到 3 个署名位，
 * 改下拉框的选项就够了，这个函数一行都不用动。
 * 口径与后端 services._signature_order()（宽松路径）一致：≤0 / 非数字 → null。
 */
function signatureOrderOrNull(v) {
  if (!has(v)) return null
  const n = Number(v)
  return Number.isInteger(n) && n > 0 ? n : null
}

/**
 * 【第十二届·第十轮】表内行下标（指挥在指导教师表里的位置）归一化：非负整数原样，其余一律 null。
 *
 * 【与上面 signatureOrderOrNull 的唯一区别】**0 是合法值**（下标从 0 起，
 * 0 = 指挥排第 1 行），所以最后那道判断是 `>= 0` 而不是 `> 0`。
 *
 * 【为什么不能直接写 Number(v)】`Number(null)` 与 `Number('')` 都是 0 ——
 * 一个"没填"会被悄悄变成"排第 1 行"，这是本次最容易踩的坑。
 * （`Number(undefined)` 是 NaN，会被 isInteger 挡掉，但 null / '' 挡不住。）
 * 所以必须先显式排掉 null / undefined / ''。
 *
 * 【这里没有用 has()，但并不是因为 has() 会把 0 判成"没有"】
 * has() 见第 103 行，是 `v !== null && v !== undefined && v !== ''` —— **has(0) 为真**，
 * 用它同样正确。这里写三个显式比较，只是为了让"0 是合法值、'' 不是"这件事
 * 在字面上看得见，不被 has() 这个抽象盖住。两种写法等价，别以为其中一个是必须的。
 */
function displayOrderOrNull(v) {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isInteger(n) && n >= 0 ? n : null
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
    /*
     * 【键名是 id，不是 person_id】后端 apps/core/report_drafts.py 的 PERSON_FIELDS
     * 是**精确白名单**，多一个键就 400：
     *     unknown = set(item) - PERSON_FIELDS
     *     if unknown: raise DraftError("person[%s] 存在不允许字段")
     * 而 PERSON_FIELDS 里叫 `id`（同一文件 payload_from_report() 回吐时也写 `id`）。
     * 原先发的是 person_id —— 于是**只要报名表里有一个人，暂存和提交就全部 400**，
     * 空表反而通过。已用真实后端复现，见 __debug__/emit-real-payload.mjs 的输出。
     */
    id: has(r.id) ? String(r.id) : null,
    name: str(r.name),
    // 身份证号必须字符串：Number() 会丢掉 18 位里的有效精度（§十七）
    card: str(r.card),
    age: intOrNull(r.age),
    gender: nullStr(r.gender),
    school: nullStr(r.school),
    phone: nullStr(r.phone),
    instrument: nullStr(r.instrument),
    head: nullStr(r.head),
    /*
     * 【专业 / 其他 / 备注：同样必须往返，理由与顶层 ECHO_KEYS 一致】
     * 后端 _person() 保证这三个键**总是存在**（缺失即 None），store_people 又按
     * Person 字段白名单全量 setattr —— 不发就是把它们写成 NULL。
     * 乐团报名页（本文件服务的主链路）没有这三个输入框，但"没有控件"不等于
     * "可以丢"：值可能是从导入/旧数据带过来的，静默抹掉是不可逆的。
     */
    major: nullStr(r.major),
    other: nullStr(r.other),
    remark: nullStr(r.remark),
    // 枚举用整数，未选为 null（§十七）。注意 el-option 的 :value 本来就是 0/1/2 数字。
    type: has(r.type) ? Number(r.type) : null,
    position: has(r.position) ? Number(r.position) : null,
    /*
     * 【第十二届·第五轮】署名排序。
     *
     * 【为什么后端已经准备好了】apps/core/report_drafts.py 的 PERSON_FIELDS 里
     * **已经有** "signature_order"（第 52 行），所以多带这个键**不会**触发
     * 「person[0] 存在不允许字段」的 400 —— 这一点是逐行确认过的，不是推测。
     * store_people() 也会把它写进 report_person.signature_order（services.py:238-239）。
     *
     * 【为什么必须是归一化函数，不能直接发原值】
     * 后端 _person() 对它的校验是 _integer(value, ..., required=False, minimum=1)：
     *   · 不填（对象里是 '' / undefined）→ null    ✅ 后端接受
     *   · 填了 1 / 2（数字）             → 1 / 2   ✅ 后端接受
     *   · 填了字符串 '1'                 → 1       ✅（后端只认 int，不认 str）
     *   · 填了 0 / 负数                  → 必须归成 null，否则被判「不能小于 1」→ 400 ❌
     * 这里用 signatureOrderOrNull 而不是通用的 intOrNull，正是因为 intOrNull(0) 会返回 0。
     * 另外 TeacherTable.vue 里那个下拉框的「不填」项绑的是空串 '' 而不是 0 ——
     * 两处是配套的，改任何一处都要同时看另一处。
     *
     * 【为什么对参展人员行也要带上】正常的带队行、队员行这个键恒为 null，看起来是多余的。
     * 但**指挥**恰恰是参展人员行（type=1, position=2），而「谁占第一指导老师署名位」
     * 现在由这个字段决定 —— 所以指挥那条 person 项必须带上它。
     * 而 buildDraftPayload 对教师表与参展人员表用的是同一个 personToPayload，
     * 无法只对其中一张表生效，故两边都带（对另一边的实际效果就是恒为 null，无副作用）。
     */
    signature_order: signatureOrderOrNull(r.signature_order)
  }
}

/** 一行 payload person → 表单里的一行 */
function payloadToPerson(row) {
  const r = row || {}
  return {
    // 表单行用 id 承载人员 ID（PersonTable 的既有约定）。
    // payload 里这个键也叫 id —— 与后端 PERSON_FIELDS 一致，见 personToPayload 的说明。
    id: has(r.id) ? r.id : undefined,
    name: r.name ?? '',
    card: r.card ?? '',
    age: r.age ?? '',
    gender: r.gender ?? '',
    school: r.school ?? '',
    phone: r.phone ?? '',
    instrument: r.instrument ?? '',
    head: r.head ?? '',
    // 与 personToPayload 的 major/other/remark 成对：读回来才送得回去
    major: r.major ?? '',
    other: r.other ?? '',
    remark: r.remark ?? '',
    type: has(r.type) ? Number(r.type) : undefined,
    position: has(r.position) ? Number(r.position) : undefined,
    /*
     * 【第十二届·第五轮】署名排序，与上面 personToPayload 的同名字段成对 ——
     * 只 build 不 restore 的话，form 里永远是 undefined，下一次 build 仍旧发 null，
     * 等于没修（与上面 major / other / remark 三条注释讲的是同一件事）。
     *
     * 【空值统一成 '' 而不是 undefined】表单里这个值的消费者是 el-select，
     * 它的「不填」选项绑的是空串 ''；给 null / undefined 虽然也能显示成 placeholder，
     * 但「已选中不填」和「还没碰过」两种状态在下拉框里长得一样、内部值却不同，
     * 排查问题时容易误判。统一成 '' 让表单里的状态是确定的。
     */
    signature_order: r.signature_order ?? ''
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

  /*
   * 未填写发 0 而不是 null —— 理由见文件头第 3 条（模型无 null=True）。
   * 【必须取整】后端 _integer() 只认真整数，`600.0` 和 `"600"` 都直接 400。
   * 分钟/秒两个输入框靠模板的 oninput 过滤非数字，那是**界面层的约束**；
   * 一旦哪天换了控件、或程序化赋值塞进一个小数，整条暂存链路会每次 400，
   * 而 400 的文案是「time_length 必须是整数」——用户完全看不懂。
   * 契约不该靠 UI 的输入过滤来保证，故在这里兜住。
   */
  const rawTimeLength = Number(f.minute || 0) * 60 + Number(f.second || 0)
  const timeLength = Number.isFinite(rawTimeLength) ? Math.trunc(rawTimeLength) : 0

  const payload = {
    choir_name: str(f.choir_name),
    name: str(f.name),
    name1: nullStr(f.name1),
    school_name: nullStr(f.school_name),
    desc: nullStr(f.desc),
    /*
     * 枚举：**保持中文字符串**，不转整数，理由见文件头第 1 条。
     * 空值发 "" 而不是 null —— Report.group 与 establishment 都是 NOT NULL 的
     * CharField（models.py:179-180），两处口径必须一致；发 null 时后端报的是
     * 「group 必须是字符串」，发 "" 报的才是「group 不能为空」，后者才对用户有意义。
     */
    group: str(f.group),
    establishment: str(f.establishment),
    contact_name: str(f.contact_name),
    contact_phone: str(f.contact_phone),
    contact_way: nullStr(f.contact_way),
    time_length: timeLength,
    spectrum: firstFileId(fileList1),
    file: firstFileId(fileList),
    dinner_reservation: Array.isArray(f.dinner_reservation) ? f.dinner_reservation : [],
    // 教师在前、人员在后 —— 与 OrchestraForm.onSubmit 拼 allPeople 的顺序一致
    person: [...teachers.map(personToPayload), ...students.map(personToPayload)]
  }

  /*
   * 【第十二届·第十轮】给「教师+指挥」那一行回填 display_order（他进表时的行下标）。
   *
   * 【为什么单独在这里补，而不是写进 personToPayload】
   * 这个值对**整张表里只有一行**有意义（教师指挥），其余行发 null 只是噪声；
   * 而且它不属于那一行人员本身，属于"那一行在指导教师表里的位置"，
   * 来源是 form.conductorSlot（由 TeacherTable 通过 conductor-slot-change 事件同步过来）。
   * 另外 personToPayload 是被 `students.map(personToPayload)` 直接当回调用的，
   * map 会把下标当第二个实参传进去 —— 给它加参数会**静默收到一个下标**，故不动它的签名。
   *
   * 【为什么由 form.conductorSlot 为空就整个不发】为空 = 父组件不知道位置
   * （新增页还没进表 / 老草稿没有这个字段）→ 什么都不发，后端那一列保持原样，
   * 下次点编辑仍按默认的"排最后"处理，行为与改动前一致。
   *
   * 【为什么 break】后端有部分唯一索引 report_person_one_conductor_idx，
   * 一张报名表最多 1 名有效指挥；真出现 2 条也是脏数据，不在这里处理。
   */
  if (SEND_DISPLAY_ORDER) {
    const slot = displayOrderOrNull(f.conductorSlot)
    if (slot !== null) {
      for (let i = 0; i < students.length; i++) {
        const row = students[i] || {}
        // 与 TeacherTable / OrchestraForm 的「教师+指挥」判定同源（Number 转换，见 personRules.js）
        if (Number(row.type) === 1 && Number(row.position) === 2) {
          payload.person[teachers.length + i].display_order = slot
          break
        }
      }
    }
  }

  // 服务端字段原样送回（理由见 ECHO_KEYS）。循环写保证「忘了加进 payload 字面量」
  // 这类疏漏不会发生 —— 只要在 ECHO_KEYS 里，就一定会被带上去。
  for (const key of ECHO_KEYS) {
    payload[key] = nullStr(f[key])
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

  // 1) 标量字段 + 服务端字段：逐项覆盖。循环写法保证「新增字段忘了加」时不会静默
  //    丢数据 —— 只要在 SCALAR_KEYS / ECHO_KEYS 里有、payload 里有，就一定被恢复。
  //
  //    ECHO_KEYS 必须一起恢复：它们是「读回来才送得回去」的字段，只 build 不 restore
  //    的话，form 里永远是 undefined，下一次 build 仍旧发 null —— 等于没修。
  for (const key of SCALAR_KEYS.concat(ECHO_KEYS)) {
    if (key in p) form[key] = p[key]
  }

  // 2) 时长：payload 存的是秒，表单用的是分/秒两个输入框
  const total = Number(p.time_length || 0)
  /*
   * 【判据是 > 60，不是 >= 60 —— 别"顺手修好"】
   *
   * 看着像瑕疵：total=60 会恢复成「0 分 60 秒」。但那是**这个表单认的值**：
   * OrchestraForm.minuteValidator 的末行原文是
   *     if (second > 60 || second < 0) callback(new Error('秒数只能在0-60之间'))
   * 即 60 秒合法（这也正是 dist 用 > 的分支留下的口径）。
   * 且它往返无损：0 分 60 秒 → 0*60+60 = 60，与 1 分 0 秒完全等价。
   * 改成 >= 只会让恢复出来的值偏离 dist / 偏离界面自己的校验区间，不解决任何问题。
   */
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
  /*
   * 【第十二届·第十轮】顺带把「指挥在指导教师表里的位置」读回来，交给 form.conductorSlot。
   *
   * 这个位置是后端 report_person.display_order（迁移 0012），buildDraftPayload 写上去的。
   * 它决定编辑页上灰行和手填行的先后 —— 不读回来的话，TeacherTable 只能退化到
   * "指挥排最后"，于是用户手点出来的「灰行1 / 手填2」进一次编辑就翻成「灰行2 / 手填1」。
   *
   * 【为什么在这里读、而不是塞进 payloadToPerson】
   * 它是**表位置**、不是那一行人员本身的属性：塞进 payloadToPerson 会让 form.person 里
   * 多一个没有消费者的键，下次 personToPayload 还要再判断一次要不要带。
   * 在这里读一次、交给 form.conductorSlot（TeacherTable 的 prop 来源）更直接。
   *
   * 【初值 null 而不是 undefined】null 表示"这次没有这个信息"，
   * TeacherTable 的 computed 用 `props.conductorSlot ?? latch` 判断，
   * null 会正确地走它自己的 latch（与改动前一致）。
   */
  let conductorSlot = null
  people.forEach((row) => {
    const item = payloadToPerson(row)
    if (item.type === 1 && item.position === 4) {
      teachers.push(item)
    } else {
      // 「教师+指挥」（type=1 且 position=2）—— 与 TeacherTable / OrchestraForm 同源判定。
      // displayOrderOrNull 保证只有非负整数才被采纳，null / 老草稿的缺字段都归 null。
      if (item.type === 1 && item.position === 2) {
        const slot = displayOrderOrNull(row && row.display_order)
        if (slot !== null) conductorSlot = slot
      }
      students.push(item)
    }
  })
  form.person = students
  form.teacher = teachers
  form.conductorSlot = conductorSlot

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
 * payload 的稳定签名，用于 saveOnce 的「没有变化就不发」判据（规范 §二十二）。
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
