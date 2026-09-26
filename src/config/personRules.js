/**
 * 第十二届“意林杯”四川省管乐展示活动 - 人员编制规则配置
 * 
 * 【重要】此文件为前端配置层，用于：
 * 1. 前端人员数量校验
 * 2. 展示时长限制
 * 3. 视奏要求
 * 4. 资格类校验（指挥唯一 / 中小学不许学生指挥 / 指导教师人数上限）
 *    —— validatePeopleQualification / validatePeople，与人员数量校验共用一张规则表，
 *       口径对齐后端 apps/core/migrations/0009_...py 的触发器
 * 
 * 【官方明确 - 第十二届红头文件】
 * - 管乐团：正式成员35-65人，预备最多5人
 * - 铜管乐团：正式成员20-45人，预备最多3人，打击乐不超过8人
 * - 展示时长：管乐小学≤12分钟，管乐中学≤15分钟，管乐大学≤18分钟，铜管乐团≤10分钟
 * - 视奏：仅管乐团需要，铜管乐团不需要
 * 
 * 【乐器识别】
 * - 乐器字段：item.instrument === '打击乐'（比对前先 trim，见 isPercussion）
 *
 * 【后端字段 - 已验证】
 * Report.group / Report.establishment 均为 CharField，直接存中文字符串
 * （如 group="小学组"、establishment="管乐团"），不是数字枚举。
 *   证据1：apps/api/views.py scoped_total() / stats_admin() 按 group 字符串过滤。
 *   证据2：apps/api/export_services.py admin_data1_rows() 直接用 item.establishment。
 * 故 PERSON_RULES 里的 orchestraType / level 两个字段即可直接作为后端值提交，
 * 不需要再维护一张「前端 key → 后端值」的映射表。
 * （相关后端待办 BE-01：stats 尚未按 establishment+group 联合分组，见 BACKEND_ISSUES.md）
 */

/**
 * 人员编制规则
 * key: 规则键（wind_primary / wind_middle / wind_university / brass_primary / brass_middle）
 */
export const PERSON_RULES = {
  'wind_primary': {
    orchestraType: '管乐团',
    orchestraTypeDisplay: '管乐团',
    level: '小学组',
    levelDisplay: '小学组',
    formalMin: 35,
    formalMax: 65,
    reserveMax: 5,
    percussionMax: null, // 管乐团无特殊打击乐限制
    needSightReading: true, // 管乐团需要视奏
    durationLimit: 12, // 分钟
    durationLimitSeconds: 720 // 秒 (12*60)
  },
  'wind_middle': {
    orchestraType: '管乐团',
    orchestraTypeDisplay: '管乐团',
    level: '中学组',
    levelDisplay: '中学组',
    formalMin: 35,
    formalMax: 65,
    reserveMax: 5,
    percussionMax: null,
    needSightReading: true,
    durationLimit: 15, // 分钟
    durationLimitSeconds: 900 // 秒 (15*60)
  },
  'wind_university': {
    orchestraType: '管乐团',
    orchestraTypeDisplay: '管乐团',
    level: '大学组',
    levelDisplay: '大学组',
    formalMin: 35,
    formalMax: 65,
    reserveMax: 5,
    percussionMax: null,
    needSightReading: true,
    durationLimit: 18, // 分钟
    durationLimitSeconds: 1080 // 秒 (18*60)
  },
  'brass_primary': {
    orchestraType: '铜管乐团',
    orchestraTypeDisplay: '铜管乐团',
    level: '小学组',
    levelDisplay: '小学组',
    formalMin: 20,
    formalMax: 45,
    reserveMax: 3,
    percussionMax: 8, // 铜管乐团打击乐不超过8人
    needSightReading: false, // 铜管乐团不需要视奏
    durationLimit: 10, // 分钟
    durationLimitSeconds: 600 // 秒 (10*60)
  },
  'brass_middle': {
    orchestraType: '铜管乐团',
    orchestraTypeDisplay: '铜管乐团',
    level: '中学组',
    levelDisplay: '中学组',
    formalMin: 20,
    formalMax: 45,
    reserveMax: 3,
    percussionMax: 8,
    needSightReading: false,
    durationLimit: 10,
    durationLimitSeconds: 600
  }
}

/**
 * 根据乐团类型和组别获取规则key
 * @param {string} establishment - 乐团类型 ('管乐团' / '铜管乐团')
 * @param {string} group - 组别 ('小学组' / '中学组' / '大学组')
 */
export function getRuleKey(establishment, group) {
  // 反查 PERSON_RULES：每条已带 orchestraType / level，无需再维护一份手写映射表。
  // 新增组别时只改 PERSON_RULES 一处，不会再出现「表加了、映射忘加」的漏改。
  return Object.keys(PERSON_RULES).find(
    k => PERSON_RULES[k].orchestraType === establishment && PERSON_RULES[k].level === group
  ) || null
}

/**
 * 获取指定组别的人员规则
 * @param {string} frontendGroupKey - 前端组别key (wind_primary / wind_middle / wind_university / brass_primary / brass_middle)
 */
export function getPersonRules(frontendGroupKey) {
  return PERSON_RULES[frontendGroupKey] || null
}

/**
 * 是否为打击乐
 *
 * 乐器字段有两个来源，且其中一个是脏的：
 *   1. 界面下拉（PersonTable.vue）—— 唯一取值 '打击乐'
 *   2. Excel 导入（PersonTable.importExcel 的 `instrument: sheet[i].instrument`）—— 原样透传。
 *      而 exportCheck 只校验 instrument 非空、**不校验取值**，故单元格里写「打击乐 」
 *      （尾随空格）也能通过导入，进而不被统计，绕过「不超过8人」这条红头文件明写的硬约束。
 * 故比对前先去掉首尾空白。JS 的 String.prototype.trim() 会去掉全部 WhiteSpace，
 * 其中已包含全角空格 U+3000 与不换行空格 U+00A0（二者属 Unicode Zs），无需额外正则。
 *
 * @param {*} instrument - 乐器值，理论上为字符串，实际可能为任意类型（导入未做类型校验）
 */
function isPercussion(instrument) {
  return typeof instrument === 'string' && instrument.trim() === '打击乐'
}

/**
 * 校验人员编制
 * @param {string} establishment - 乐团类型 ('管乐团' / '铜管乐团')
 * @param {string} group - 组别 ('小学组' / '中学组' / '大学组')
 * @param {Array} persons - 参演人员数组
 * @returns {{ valid: boolean, errors: Array, stats: Object }}
 */
export function validatePersonCount(establishment, group, persons) {
  const ruleKey = getRuleKey(establishment, group)
  const rules = getPersonRules(ruleKey)
  
  if (!rules) {
    // 【第十二届】原文案「未找到对应组别的人员编制规则」既不说哪个组合、也不说改哪里。
    // 该路径只在编辑页回填到 PERSON_RULES 之外的历史组合时触发（新增页选项受 cfg 约束，
    // 实测 4 条路由都选不出非法组合）。此时组别栏会原值回显一个下拉里不存在的值
    // （实测：显示「大学组」而选项只有 小学组/中学组），若文案不点名，用户无从下手。
    // 故把实际组合念出来并指明动作。仅改文案，拦截行为不变。
    return { 
      valid: false, 
      errors: [`未找到「${establishment} + ${group}」的人员编制规则，请重新选择类型或参演组别`], 
      stats: { formal: 0, reserve: 0, percussion: 0 } 
    }
  }
  
  const errors = []
  let formalCount = 0
  let reserveCount = 0
  let percussionCount = 0
  /*
   * 指挥单独计数，**只**用于下面那行「构成明细」展示。
   *
   * 修的是 0305af3 引入的 ReferenceError：那轮给错误文案加上了
   * `（正式X / 预备Y / 指挥Z）` 明细，引用了 conductorCount，却忘了声明它 ——
   * 于是本函数**每次**调用都在那一行抛 `conductorCount is not defined`。
   * 唯一调用点是 OrchestraForm.onSubmit，异常发生在 el-form 的 validate 回调里，
   * 表现为「点『立即报名』毫无反应」（只有控制台一行红线），报名提交完全不可用。
   *
   * 它**不**参与 formalMin / formalMax / reserveMax / percussionMax 任何一条判断，
   * 与下方循环里 position===2 的注释（指挥不占正式、也不占预备名额）不矛盾。
   */
  let conductorCount = 0

  // 遍历所有人员统计
  //
  // 【第十二届口径】红头文件原文：
  //   「管乐团正式成员不少于35人，不超过65人（报名时可报预备队员5人）；
  //     铜管乐团正式成员不少于20人，不超过45人，其中打击乐不超过8人
  //     （报名时可报预备队员3人）。」
  // 由此定三条口径，缺一条就会误判：
  //   1) 括号里的预备队员是**另计**的，不并进正式人数。
  //      旧实现让每个 type===0 都 formalCount++，于是 30正式+5预备 被数成 35 人，
  //      刚够下限就放行；而 65正式+5预备 又被数成 70 人，合乎上限的满编乐团反而被拦。
  //   2) 打击乐上限是「其中」，即只数**正式成员**里的打击乐，预备里的不算。
  //   3) 指挥既不是正式队员也不是预备队员，两个数都不进。
  //      旁证（均已核对后端源码）：apps/api/registration_form.py:99 的 members(position)
  //      取 position==0 作正式队员；同文件 :132 打印的报名表「参展人数」写的是
  //      「正式队员 X 人，预备队员 Y 人」；附件2 里指挥另有独立栏目，不在正式队员名单内。
  //
  // position 语义与后端 ReportPerson.position 一致（见 registration_form.py:3）：
  //   0=正式队员  1=预备队员  2=指挥  4=指导老师
  persons.forEach(p => {
    /*
     * 指挥按「角色」计，不按「身份」计 —— 只加一次。
     *
     * 位置必须在下面那句 `type !== 0` 的提前返回**之前**：指挥既可能是教师（type=1），
     * 也可能是学生（type=0），而后半段只处理学生。挪到后面，教师指挥永远数不到、恒为 0。
     *
     * 后半段原有的 `else if (p.position === 2) conductorCount++` 已删除：学生指挥
     * 不会被提前返回拦住，会在那里被加第二次。原注释称「中小学指挥须为本校在职教师」，
     * 但这条约束在 checkLine / exportCheck / personFields.js 里都不存在，该假设不成立。
     *
     * 只用于下方 formalBreakdown 那行明细的数字，不并入正式/预备人数。
     */
    if (p.position === 2) conductorCount++
    // type=1 是教师。指导教师另表登记（TeacherTable，position 固定为 4），不算乐团编制。
    if (p.type !== 0) return
    if (p.position === 0) {
      formalCount++
      // 打击乐统计（只统计正式成员）。
      // 走 isPercussion 而不是裸 ===：Excel 导入的 instrument 是原样透传的，
      // 「打击乐 」（尾随空格）能通过导入，裸比对会漏计、绕过 percussionMax 这条硬约束。
      // 本行**改回**了 isPercussion —— 它自 0305af3 起就定义在文件上方、连同理由一起，
      // 但那一次只写了函数、没接上调用点，trim 修复实际没生效（函数是死代码）。
      if (isPercussion(p.instrument)) {
        percussionCount++
      }
    } else if (p.position === 1) {
      reserveCount++
    }
  })

  // 校验正式成员人数
  // 【第十二届】附上构成明细：口径改为按 position 分流后，只报一个总数会让用户看不出
  // 是哪个角色被算进去了/没被算进去（如 31 正式 + 5 预备：旧口径按 36 通过、新口径 31 不通过）。
  const formalBreakdown = `（正式${formalCount} / 预备${reserveCount} / 指挥${conductorCount}）`
  if (formalCount < rules.formalMin) {
    errors.push(`正式成员人数不能少于${rules.formalMin}人，当前${formalCount}人${formalBreakdown}`)
  }
  if (formalCount > rules.formalMax) {
    errors.push(`正式成员人数不能超过${rules.formalMax}人，当前${formalCount}人${formalBreakdown}`)
  }
  
  // 校验预备成员人数
  if (reserveCount > rules.reserveMax) {
    errors.push(`${rules.orchestraTypeDisplay}${rules.levelDisplay}预备成员人数不能超过${rules.reserveMax}人，当前${reserveCount}人`)
  }
  
  // 校验铜管乐团打击乐人数
  if (rules.percussionMax !== null && percussionCount > rules.percussionMax) {
    errors.push(`${rules.orchestraTypeDisplay}${rules.levelDisplay}打击乐人数不能超过${rules.percussionMax}人，当前${percussionCount}人`)
  }
  
  return {
    valid: errors.length === 0,
    errors,
    stats: {
      formal: formalCount,
      reserve: reserveCount,
      percussion: percussionCount,
      rules: rules
    }
  }
}

/**
 * 取出「指挥」的数量与身份 —— 供下面两条资格类校验共用，也是与后端对齐的唯一口径。
 *
 * 返回 { count, type }：
 *   count —— 指挥行数（只数 position === 2，不看身份）
 *   type  —— null 无指挥 / 0 学生 / 1 教师
 *
 * 【为什么 type 取所有指挥行里的**最大值**，而不是取第一行】
 * 后端 0009 触发器用的就是 `max(CASE WHEN position = 2 THEN type END)`
 * （迁移文件 apps/core/migrations/0009_...py 的 PG 版第 50 行、SQLite 版第 97 行），
 * 只要出现一个教师指挥就按教师判。前端必须用同一个口径：否则「两个指挥，一教师一学生」
 * 时前端按学生判（放行 2 名指导教师）、后端按教师判（只许 1 名），同一份数据两边结论不同。
 * 注：这种数据本身已被「指挥最多 1 人」拦下（见下），max 只是让两边在**报出那条错之前**
 * 的判定也保持一致。
 *
 * 【为什么统一 Number() 转换】position / type 有三个来源，类型并不统一：
 *   · 界面下拉：type 由 :value="0|1" 绑成数字、position 走 getPosition() 返回数字；
 *   · Excel 导入：importExcel 里 `type: sheet[i].type === '学生' ? 0 : 1`，同样是数字；
 *   · 草稿回填：payloadToPerson 已过 Number()。
 * 但 '2' === 2 为假，字符串形式的历史数据会被漏掉，故统一转数字；
 * 并用 Number.isFinite 把 NaN / undefined / 空串挡掉，避免「角色还没选」的行被当成指挥。
 *
 * @param {Array} persons - 参展人员数组
 */
function conductorInfoOf(persons) {
  let count = 0
  let type = null
  ;(persons || []).forEach((p) => {
    if (!p) return
    if (Number(p.position) !== 2) return
    count++
    const current = Number(p.type)
    // 第一个指挥直接赋值，之后取最大值 —— 等价于后端的 max(type)
    if (Number.isFinite(current)) type = type === null ? current : Math.max(type, current)
  })
  return { count, type }
}

/**
 * 【资格类】只判「填了报名不该出现的内容」。
 *
 * 与 validatePersonCount 的分工（两条互补，不要互相取代）：
 *   · 本函数 —— 指挥唯一、中小学指挥身份、指导教师人数上限。**与「人数够不够」无关**，
 *     所以用户一边填就能一边提示（不会「刚加第 1 个人就喊不够 35 人」）。
 *   · validatePersonCount —— 正式/预备/打击乐的人数区间，只在提交时查。
 * 三条提示路径（填写时 / 批量导入后 / 提交时）全都调本函数，为的是
 * 「实时提示的文案」与「提交拦截的文案」不可能不一致。
 *
 * @param {string} establishment - 乐团类型；教师组渠道没有这个概念，传 undefined
 * @param {string} group - 组别
 * @param {Array} persons - 参展人员数组（PersonTable 的行）
 * @param {Array} teachers - 指导教师数组（TeacherTable 的行，position 恒为 4）
 * @returns {{ valid: boolean, errors: Array }}
 */
export function validatePeopleQualification(establishment, group, persons, teachers) {
  const errors = []
  const conductor = conductorInfoOf(persons)
  const rules = getPersonRules(getRuleKey(establishment, group))
  const teacherCount = (teachers || []).length

  // ① 指挥唯一 —— 对应后端 0009 规则 1（部分唯一索引 report_person_one_conductor_idx）。
  // 必须是第一条：指挥超过 1 人时「按 max(type) 判身份」本身就语义模糊，先拦下来，
  // 后面两条分层判断才有确定含义（后端也是先判这条）。
  // 文案用后端那句翻译后的原文（services._RULE_MESSAGE_HINTS），不用触发器的原始英文式报错。
  if (conductor.count > 1) errors.push('每张报名表只能有 1 名指挥。')

  // ② 中小学不许学生指挥 —— 对应后端 0009 规则 5。
  // conductor.type === 0 表示「有指挥、且所有指挥都是学生」（max 口径下没有教师指挥）。
  // rules 为 null（教师组渠道、或历史非法组合）时**跳过**：拿不到 level 就无从判断
  // 是不是中小学，宁可不报也不误报 —— 与后端「空值/未知值放行」的口径一致。
  // level 只有 小学组 / 中学组 / 大学组 三种，大学组是唯一允许学生当指挥的组别。
  if (rules && conductor.type === 0 && rules.level !== '大学组') {
    errors.push('中小学乐团指挥须为本校在职教师。')
  }

  // ③④ 指导教师人数上限（分层）—— 对应后端 0009 规则 2 / 3 / 4。
  // 分层同样是 max(type) 口径：教师指挥 → 最多 1 人；其余（无指挥 / 学生指挥）→ 最多 2 人。
  // 【与后端的一处刻意不同】后端只在「有指挥」时才查指导教师人数（它的分支全挂在 c_cnt = 1 上），
  // 前端在**无指挥**时也按 2 拦。这是本轮的产品要求（「现在指导教师最多2人」），比后端更严，
  // 不会出现「前端放行、后端打回」。
  //
  // 【第十二届·第五轮：口径没变，只换了说法 —— 以及为什么 teacherCount 正好是对的】
  // 用户确认：教师指挥时的上限仍然是 1，但这个「1」指的是**除指挥外**还能手动填几个。
  // 表格上看到的是 2 行（带入的指挥行 + 手动 1 行），数据里 position=4 只有 1 行，
  // 两件事说的是同一个上限，只是数的地方不同。
  //
  // teacherCount = (teachers || []).length，而 teachers 就是表单里的 form.teacher、
  // 也就是 TeacherTable 的 data 数组 —— **带入行不在 data 里**（它是由 :conductor
  // 这个 prop 单独渲染的，见 TeacherTable.vue 的注释），所以这里天然只数用户手填的行。
  // 换句话说：「灰行计入名单、不计入这个计数」不是我在这里额外做了一次减法，
  // 而是带入行从头到尾就没进过要数的那个数组。这一点如果被谁改成把带入行放进 data，
  // 这里就会立刻多算 1 人、教师指挥时永远超员 —— 是本轮最需要盯住的一处联动。
  //
  // 【文案带上了当前人数】用户要求把「当前已填 N 名」写进提示里，
  // 让用户不用自己去数。两个分支的句式刻意保持对称（都是「除指挥外…最多…（当前已填 N 名）」）。
  const teacherMax = conductor.type === 1 ? 1 : 2
  if (teacherCount > teacherMax) {
    errors.push(
      conductor.type === 1
        ? `指挥是教师时，除指挥外最多只能有 1 名指导老师（当前已填 ${teacherCount} 名）`
        : `除指挥外指导教师最多 2 人（当前已填 ${teacherCount} 名）`
    )
  }

  return { valid: errors.length === 0, errors }
}

/**
 * 提交时的完整校验 = 资格类 + 人数区间类。
 *
 * 顺序：资格类在前 —— 「填错了」比「还没填够」更该先修。
 * 【与后端 0009 报错顺序的差别（已知，且无害）】后端触发器的判定顺序是
 * ① 指挥 > 1 → ③④ 指导教师超限 → ② 中小学指挥身份；本函数是 ① → ② → ③④。
 * 差异只在「同时违反多条」时先看到哪一条（后端靠第一条 RAISE 中止事务，也只报一条），
 * 两条都是真错误，用户改掉先弹的那条之后就会看到另一条，不会漏报。
 * validatePersonCount 本体一字未改，stats 原样透出。
 *
 * @returns {{ valid: boolean, errors: Array, stats: Object }}
 */
export function validatePeople(establishment, group, persons, teachers) {
  const qualification = validatePeopleQualification(establishment, group, persons, teachers)
  const count = validatePersonCount(establishment, group, persons)
  return {
    valid: qualification.valid && count.valid,
    errors: [...qualification.errors, ...count.errors],
    stats: count.stats
  }
}

/**
 * 获取展示时长限制（分钟）
 */
export function getDurationLimit(establishment, group) {
  const ruleKey = getRuleKey(establishment, group)
  const rules = getPersonRules(ruleKey)
  return rules ? rules.durationLimit : null
}

/**
 * 获取展示时长限制（秒）
 */
export function getDurationLimitSeconds(establishment, group) {
  const ruleKey = getRuleKey(establishment, group)
  const rules = getPersonRules(ruleKey)
  return rules ? rules.durationLimitSeconds : null
}

/**
 * 判断是否需要视奏
 */
export function needSightReading(establishment, group) {
  const ruleKey = getRuleKey(establishment, group)
  const rules = getPersonRules(ruleKey)
  return rules ? rules.needSightReading : false
}

/**
 * 校验展示时长
 * @param {number} minutes - 分钟
 * @param {number} seconds - 秒
 * @param {string} establishment - 乐团类型
 * @param {string} group - 组别
 * @returns {{ valid: boolean, error: string }}
 */
export function validateDuration(minutes, seconds, establishment, group) {
  // 两个入参来自 el-input（无 .number 修饰符），是字符串；不转数字会变成字符串拼接（'600' + '0' = '6000'）
  const totalSeconds = Number(minutes) * 60 + Number(seconds)
  const limitSeconds = getDurationLimitSeconds(establishment, group)
  const limitMinutes = getDurationLimit(establishment, group)
  
  if (limitSeconds === null) {
    return { valid: true, error: null } // 未找到规则，不校验
  }
  
  if (totalSeconds > limitSeconds) {
    const overSeconds = totalSeconds - limitSeconds
    const overMinutes = Math.ceil(overSeconds / 60)
    return { 
      valid: false, 
      error: `${establishment}${group}展示时长不能超过${limitMinutes}分钟，超时${overMinutes}分钟将按规定扣分` 
    }
  }
  
  return { valid: true, error: null }
}

/**
 * 获取人员状态提示文本
 * @param {string} establishment - 乐团类型
 * @param {string} group - 组别
 * @param {Object} stats - 统计对象 { formal, reserve, percussion }
 */
export function getPersonStatusText(establishment, group, stats) {
  const ruleKey = getRuleKey(establishment, group)
  const rules = getPersonRules(ruleKey)
  
  if (!rules) return ''
  
  const parts = []
  
  // 正式成员
  parts.push(`正式成员：${stats.formal} / ${rules.formalMin}~${rules.formalMax}`)
  
  // 预备成员
  parts.push(`预备成员：${stats.reserve} / ≤${rules.reserveMax}`)
  
  // 打击乐（仅铜管乐团）
  if (rules.percussionMax !== null) {
    parts.push(`打击乐：${stats.percussion} / ≤${rules.percussionMax}`)
  }
  
  return parts.join(' | ')
}
