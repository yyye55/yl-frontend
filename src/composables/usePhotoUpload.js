/**
 * 电子照片上传 —— 参展人员表 / 指导教师表 **共用的一份实现**
 *
 * ===========================================================================
 * 【为什么要有这个文件】
 * ===========================================================================
 * 两张表的照片功能是同一套规则，一个字都不该有第二份副本：
 *
 *   · 体积上限 100KB、格式 JPG、命名规则「学生=身份证后6位 / 教师=姓名+身份证后6位」
 *     来自红头文件（原文：「学生照片以学生身份证号后6位命名，教师照片命名规则由
 *     系统另行要求」）。注意这两半的授权不同 —— 学生的写法是文件**规定**的，
 *     教师的写法是文件**授权系统自定**的。所以 2026-09-28 加消歧写法时，
 *     学生只能**增**不能改：红头文件那种纯 6 位写法继续有效，另加「姓名+后6位」。
 *     详见 expectedPhotoNames。
 *     这几条**改一次就要两张表同时生效**，否则会出现「人员表收 100KB、教师表收 1MB」这种漂移。
 *   · 上传通道（OSS 代传 + /api/file/create 落库）两张表也完全相同。
 *
 * 【线上展演两表也来取命名判据】CrewTable / LeaderTable（`/live/`）虽有自己的上传实现，
 * 但命名规则收在本文件的 expectedOnlinePhotoNames —— 它们与报名端**口径确实不同**
 * （原因写在该函数里），放在一起是为了让"两端口径不同"这件事看得见，
 * 而不是各自藏一份、下次核对时才发现分叉。
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
 * 【dist 已知缺陷的处理记录】
 * ===========================================================================
 * 【本段的约定】搬 dist 时**默认原样保留**，不顺手改 —— 改动要有单独的理由，
 * 而不是"看着不顺眼"。所以每一条都注明「保留了」还是「修了、为什么修」。
 * 下面 (a) 是本文件里唯一被破例修掉的一条，判据写在它自己那一段里。
 *
 * a. upAvatar 里 `event.preventDefault()` 引用的是**全局 window.event**
 *    （浏览器非标准但普遍存在），而不是形参 —— dist 模板里传进 upAvatar 的其实是
 *    行下标 index，本来也拿不到事件对象。
 *
 *    【第十四轮·已修，破例的理由是「零收益 + 有风险」，两条缺一不可】
 *      · 零收益：它拦的是**不存在的默认行为**。el-button 渲染出来的就是
 *        `<button type="button">`（element-plus 的 button.mjs 里 nativeType
 *        默认值即 'button'），点它既不提交表单、也没有任何默认动作 ——
 *        所以这一行**本来就没拦到任何东西**，去掉它行为不变。
 *      · 有风险：window.event 在「不在事件派发期间」或个别浏览器里是 undefined，
 *        那时 `undefined.preventDefault()` 直接 TypeError，「上传照片」按钮整个废掉。
 *    修法见下面的 upAvatar：取得到就调、取不到就跳过。Chrome / Edge 下窗口事件
 *    对象存在，preventDefault 照调，效果与 dist **逐字相同**。
 *    （原先这里写的是"保留原样"，已于第十四轮作废。）
 *
 * b. beforeUpload 返回的是「先判体积、再判格式」的顺序：体积超限时**优先**报体积错误，
 *    即使格式也不对。下面用同序的 if 链复现，未调整判定优先级。
 *    【保留】这不是缺陷、是**有意的优先级**：一张又大又不是 JPG 的图，
 *    先告诉用户"太大了"比先说"格式不对"更贴近他的下一步动作（先去压体积）。
 *    它也没有 (a) 那种崩溃风险 —— 三条都是同序的 if 判断，不依赖任何全局对象。
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
 * 一行**可以接受的照片文件名**（去扩展名）—— 报名端的唯一命名判据。
 *
 * 【为什么要有这个函数】在它之前，「这一行期望什么文件名」写在两处
 * （matchPhotoToRows 与 beforeUploadSingle），各带一份「取后 6 位」的算法，
 * 靠注释互相提醒"改动必须同步"。本次要新增一种可接受的写法，正是那种容易漂移的时刻，
 * 所以先把它收成一份，其余全部调它。
 *
 * 【口径来自红头文件，注意它两半的授权不同】原文：
 *   「学生照片以学生身份证号后6位命名，教师照片命名规则由系统另行要求」
 * 学生的写法是文件**规定**的；教师的写法是文件**授权系统自定**的（本系统定为「姓名+后6位」）。
 * 所以下面两条分支不是随手写的：
 *
 *   · 学生（type 0）：**两种都收**。红头文件那种（纯后 6 位）必须继续有效 ——
 *     不能因为本次改动就让它失效；「姓名+后6位」是**新增的消歧写法**：
 *     同表两行后 6 位相同时，纯 6 位的文件名会同时命中两行，带上姓名才能区分。
 *   · 教师（type 1）：**只收带姓名的那种**。教师若也收纯 6 位，同队里一个学生和一个
 *     教师尾号相同时，`123456.jpg` 会同时命中两行变成撞号 —— 反而比现在更容易失败。
 *     教师名称本来就由系统自定，收窄不违背红头文件。
 *
 * 【身份没选的行不参与匹配】返回空数组，语义与改动前的 `return` 逐字一致。
 *
 * @param {{name?: string, card?: string, type?: number}} item
 * @returns {string[]} 可接受的文件名（去扩展名），可能为空。**顺序有意义**：
 *   报错时先举红头文件那种写法，用户更容易对上他手里的文件
 */
export function expectedPhotoNames(item) {
  if (!item || !item.card) return []
  // 取后 6 位；历史数据短于 6 位时按整串 —— 与改动前同一处口径
  const card = String(item.card)
  const tail = card.length >= 6 ? card.substring(card.length - 6) : card
  const named = item.name ? [item.name + tail] : []
  if (item.type === 0) return [tail, ...named]
  if (item.type === 1) return named
  return []
}

/**
 * 一行可以接受的照片文件名 —— **线上展演**（`/live/`）的口径，与报名端**确实不同**。
 *
 * 【为什么不复用 expectedPhotoNames】两条都是核实过的事实，任一条都足以否决复用：
 *   ① LeaderTable（带队教师）的行**没有 `type` 字段**（该文件里没有任何 `row.type`）。
 *      套报名端那套，每行都会因 type 不是 0/1 而算不出期望名 → 照片**一张都传不上去**。
 *   ② CrewTable 的行**有** `type`（0=学生/1=教师），但它现在的公开口径是
 *      **所有人一视同仁按「后6位」**。照搬报名端规则会让 type=1 的行突然只认
 *      带姓名的写法，把用户手里现在能用的文件名全部打哑。
 *
 * 所以这里是**只增不减**：原来认的「后6位」一个不少，另外多认一种「姓名+后6位」
 * 作为撞号时的消歧写法。两端口径本就不同，写在同一文件里、各自注明理由，
 * 好过为了让它们"看起来统一"而把某一端打哑。
 *
 * @param {{name?: string, card?: string}} item
 * @returns {string[]}
 */
export function expectedOnlinePhotoNames(item) {
  if (!item || !item.card) return []
  const card = String(item.card)
  const tail = card.length >= 6 ? card.substring(card.length - 6) : card
  return item.name ? [tail, item.name + tail] : [tail]
}

/**
 * 找出「同一张表里有多行会接受同一个文件名」的情况 —— 也就是撞号。
 *
 * 【为什么要提前算】撞号以前只在拖照片那一刻、以「匹配到多行」的形式暴露，
 * 那时用户已经在批量上传了，只能停下来一个个改。填表阶段就能算出来，不必等到那一步。
 *
 * 【与 matchPhotoToRows 同源】两者建立在同一个 `namesOf` 上，所以「提示说会撞」
 * 与「上传时真的撞」不可能各说各话 —— 这正是把它放进同一个文件的理由。
 *
 * @param {Array<object>} rows
 * @param {(item: object) => string[]} [namesOf] 默认报名端口径；线上端传 expectedOnlinePhotoNames
 * @returns {Array<{name: string, rows: number[]}>} name = 撞到的文件名，rows = 行下标（升序）
 */
export function findPhotoNameCollisions(rows, namesOf = expectedPhotoNames) {
  const byName = new Map()
  const list = Array.isArray(rows) ? rows : []
  list.forEach((item, i) => {
    namesOf(item).forEach((name) => {
      const hit = byName.get(name)
      if (hit) hit.push(i)
      else byName.set(name, [i])
    })
  })
  const out = []
  byName.forEach((indices, name) => {
    if (indices.length > 1) out.push({ name, rows: indices })
  })
  return out
}

/** 行号要用的中文数字。表格不会有三位数行，真到了就退回阿拉伯数字，不硬凑「一百零一行」 */
const CN_DIGIT = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九']

/**
 * 行号 → 「第一行」这样的说法（入参是 1 起的行号，不是下标）。
 *
 * 只处理到 99：`第十一`、`第二十`、`第二十一` 这些写法在这里都是对的（十位为 1 时不写「一十」），
 * 但上百行在报名表里不现实，与其写一套通用转换，不如退回阿拉伯数字。
 */
function rowLabel(n) {
  if (n > 99) return `第 ${n} 行`
  const tens = Math.floor(n / 10)
  const ones = n % 10
  if (tens === 0) return `第${CN_DIGIT[ones]}行`
  if (tens === 1) return `第十${ones ? CN_DIGIT[ones] : ''}行`
  return `第${CN_DIGIT[tens]}十${ones ? CN_DIGIT[ones] : ''}行`
}

/**
 * 把一组行号连成中文里顺口的一句：两行是「第一行和第三行」，
 * 三行及以上是「第一行、第二行和第三行」—— 末项用「和」，不用一串顿号收尾。
 */
function joinRowLabels(rowNumbers) {
  const labels = rowNumbers.map(rowLabel)
  if (labels.length <= 1) return labels[0] || ''
  return labels.slice(0, -1).join('、') + '和' + labels[labels.length - 1]
}

/**
 * 把 findPhotoNameCollisions 的结果拼成**给用户看的一句话** —— 三张表共用同一份说法
 * （报名端 PersonTable、线上 CrewTable 与 LeaderTable）。
 *
 * 【为什么连文案也收进来】判据收成一份、文案却各写各的，仍会分叉：A 表说「按姓名+身份证号后6位命名」，
 * B 表说「请重命名文件」，用户在两页之间来回切就得重新理解一遍。更糟的是三处提示会
 * 各自跟着判据漂移，而后改的那两处没人会回头对齐。
 *
 * 【为什么把按钮名当参数】三张表的行内按钮本来就不叫同一个名字（报名端是「上传照片」、
 * 线上两表是「上传头像」）。这是既有的界面事实，不改；只把它作为参数传进来。
 *
 * 【为什么必须报行号】撞号这件事在界面上**看不出来** —— 那两行长得完全不一样，
 * 只是后 6 位恰好相同。不报行号，用户得自己一行行去比对身份证后 6 位。
 *
 * 【行号用中文数字，字段名用阿拉伯数字】正文是给人读的一句话，写成「第一行和第三行」；
 * 而「身份证后6位」保留阿拉伯数字 —— 它在本系统里是**字段名**（列头、校验报错、黑字说明
 * 全都写「后6位」），换成「后六位」会和用户眼前的表头对不上。
 *
 * 【为什么不报那两行实际会重名的文件名】行号是要用户去定位的，文件名不是 ——
 * 报出来只是把系统内部的判定过程摆给用户看，而用户并不能拿它做什么。
 *
 * @param {Array<{name: string, rows: number[]}>} collisions findPhotoNameCollisions 的返回值；
 *        用到 rows 拼行号，name 不进文案
 * @param {string} perRowButton 行内那个「传单张」按钮的文字，如 '上传照片'
 * @returns {string} 没有撞号时返回空串，调用方直接 v-if 即可
 */
export function formatPhotoCollisions(collisions, perRowButton) {
  const list = Array.isArray(collisions) ? collisions : []
  if (!list.length) return ''
  const parts = list.map(
    (c) => joinRowLabels(c.rows.map((i) => i + 1)) + '身份证后6位相同'
  )
  return (
    '注意：' +
    parts.join('；') +
    '。其照片文件将重名，批量上传时系统无法判定文件所属行次。' +
    `请改用行内「${perRowButton}」按钮逐张上传，` +
    '或将文件按「姓名+身份证号后6位」命名（例如 张小明123456.jpg）加以区分。'
  )
}

/**
 * 【批量路径专用】把「去掉扩展名的文件名」匹配到表格的某一行 —— **全等比较，不做分类猜测**。
 *
 * 【为什么是"算期望名再比"，而不是"先判断像学生还是像教师"】
 * 老做法（dist 继承来的）先用两个正则给文件名分类，再拿身份证后6位 / 姓名去查表。
 * 但那条教师正则 `/^\D.*\d{6}$/` 太宽松：手机原图 `IMG_20240927_113045.jpg` 的末尾
 * 恰好是 6 位数字、首字符又不是数字，于是被判成「教师照片」，报出误导的
 * 「未找到匹配的教师」—— 而那时文件**已经被上传并落库了**，成了孤儿文件。
 *
 * 反过来做这两个毛病一起消失：既然最终目的就是"找到那一行"，那就算出**每一行的
 * 期望文件名**，拿实际文件名去逐一全等比较。于是
 *   · 不必猜文件属于哪一类 → 误判从根上没有了
 *   · 「找不到人」「找到多个人」都能在**上传之前**得出结论，不必等文件传完 → 不发请求
 *   · 与单张上传的判据完全一致（beforeUploadSingle 本来就是"算期望名再比"）
 *   · 将来只维护这一处规则，不会再出现两份口径漂移
 *
 * 【期望名的算法**只有一份**】就是上面的 expectedPhotoNames —— 本函数与
 * beforeUploadSingle、与各表的撞号提示都调它。原先这里写着「与 beforeUploadSingle
 * 逐字一致，改动必须同步」，那种靠注释维系的约定正是本次要消灭的东西：
 * 2026-09-28 新增「姓名+后6位」这一种写法时，若还按老办法，就得记得同时改三处。
 * 下列行算不出期望名，**直接不参与匹配**（保持与老逻辑「匹配不上」的语义一致）：
 *   · 没填身份证的行
 *   · 身份没选的行（type 既不是 0 也不是 1）—— 但线上端走 expectedOnlinePhotoNames，不分身份
 *   · 教师行但姓名没填
 *
 * @param {string} nameNoExt 去掉扩展名的文件名（取法与调用方一致）
 * @param {Array<{name?: string, card?: string, type?: number}>} rows 当前表格的行数组
 * @param {(item: object) => string[]} [namesOf] 命名口径。默认报名端；
 *   线上展演两表传 expectedOnlinePhotoNames（原因见该函数）
 * @returns {{status: 'ok'|'none'|'multi', hits: number[], expected: string[]}}
 *   ok    → 恰好命中一行，`hits[0]` 即行下标
 *   none  → 一行都没命中
 *   multi → 命中多行（通常是两行身份证后6位相同），`hits` 是全部行下标。
 *           此时用户可以用「姓名+后6位」这种消歧写法让文件名只命中一行
 *   expected → 本次参与比较的全部期望名（去重），供报错时告诉用户"表里期望的是什么名"
 */
export function matchPhotoToRows(nameNoExt, rows, namesOf = expectedPhotoNames) {
  const hits = []
  const expected = []

  /* 【防御「真值但非数组」】调用方传进来的通常是组件的行数组，正常恒为数组。
     但 PersonTable 的 data.value 是用 `props.showdata ? props.showdata : []` 赋的，
     一个**真值但非数组**（后端异常返回 {} / 字符串）能钻过那个守卫，一路传到这里，
     然后在 .forEach 上抛 TypeError —— 用户看到的是「界面卡住/控制台报错」，
     而不是一条能看懂的提示。

     换成显式判型：非数组按「一行都没有」处理，于是每张照片都会得到
     「文件名对不上任何人（名单里还没有填好身份证号）」，可读、不崩。
     数组走的仍是同一个 .forEach，行为逐字未变。 */
  const list = Array.isArray(rows) ? rows : []
  list.forEach((item, i) => {
    const wants = namesOf(item)

    // expected 收集**全部**期望名（含没命中的）：报错时能告诉用户"表里期望的是这些"
    wants.forEach((w) => {
      if (expected.indexOf(w) === -1) expected.push(w)
    })

    // 一行最多命中一次：tail 是 6 位、「姓名+tail」必然更长，两者不可能同时等于同一个
    // 文件名（姓名为空时只产出 tail，也不会重复），所以这里不用去重
    if (wants.indexOf(nameNoExt) !== -1) hits.push(i)
  })

  const status = hits.length === 0 ? 'none' : hits.length > 1 ? 'multi' : 'ok'
  return { status, hits, expected }
}

/**
 * 【基础闸·不弹提示版】只判「与哪一行无关」的两件事：体积 ≤100KB、格式 JPG。
 *
 * 红头文件要求：师生电子照片为蓝底免冠证件照、JPG、每张不超过 100KB。
 * 客户端硬校验 JPG + ≤100KB；只有「蓝底」无法像素级校验，仅在前端提示。
 *
 * 【为什么要多出这一份「不弹提示」的版本】
 * 参演人员表的批量上传会一次收进一整个文件夹（几十个文件）。「整批汇总」要求先把
 * 整批的结论收集起来、最后合成**一条**提示；若每个文件各自 ElMessage.error 一次，
 * 50 个不合格就是 50 条红字同时堆叠（Element Plus 的 ElMessage 默认 grouping:false、
 * 不限条数，不会自动合并）。所以需要一份「只出结论、没有副作用」的版本。
 *
 * 【规则仍然只有一份】下面的 beforeUpload 就是「调本函数 + 自己弹提示」，
 * 所以 100KB / JPG 这两条依旧是全仓库唯一一处实现，不会出现
 * 「教师表改了、人员表没改」这种漂移。
 *
 * 【命名规则为什么不在这里】判据是「算出期望名、再全等比较」，而期望名要用到「行」的
 * 信息（该行的 card / name / type），本函数只看得到文件、看不到行：
 *   · 单张路径：必须命中「该行」的可接受名之一 → beforeUploadSingle（调 expectedPhotoNames）
 *   · 批量路径：必须命中「某一行」的可接受名 → matchPhotoToRows
 * 所以本函数里的 parsePhotoName 只剩**形状闸**：它不找人，只判文件名长得像不像照片名。
 * （原先这里写着它「只服务于**教师表的批量路径** —— 教师表没有『按行匹配』的能力」，
 *  两半都已不成立：TeacherTable 根本没有批量上传（见其 293-295 行），且它传了 getRows、
 *  resolvePhotoTarget 是有按行匹配能力的。PersonTable.vue 那边的同源注释已先改过一轮，
 *  这里跟着更正。）
 *
 * @param {File} file
 * @returns {{ok: true} | {ok: false, reason: string}} reason 可直接展示给用户
 */
export function checkPhotoBasic(file) {
  // dist 原文顺序：先判体积、再判格式（保留 —— 体积超限时优先报体积错）
  const sizeOk = file.size / 1024 < 100
  if (!sizeOk) return { ok: false, reason: '文件大小不能超过100KB' }

  const isJpg = file.type === 'image/jpeg'
  if (!isJpg) return { ok: false, reason: '照片格式只能是JPG' }

  return { ok: true }
}

/**
 * 【基础闸】只判「与哪一行无关」的事：体积 ≤100KB、格式 JPG、命名格式合法。
 *
 * 两条上传路径都过这道闸：批量直接绑它，单张经 beforeUploadSingle 调进来。
 * 命名格式之所以也放在这里（而不是只在批量里判）：格式不对的照片一旦传上 OSS 并写进
 * files 表，就成了没人认领的孤儿文件；前移到这道闸，格式不对**根本不发请求**。
 *
 * 【本轮改造】体积/格式两条抽去了 checkPhotoBasic（参演人员表的批量汇总要用不弹提示的
 * 版本），本函数的**对外行为与改造前逐字相同**：同样的三条、同样的顺序、同样的文案。
 */
export function beforeUpload(file) {
  const basic = checkPhotoBasic(file)
  if (!basic.ok) {
    ElMessage.error(basic.reason)
    return false
  }

  const nameNoExt = file.name.substring(0, file.name.lastIndexOf('.'))
  if (!parsePhotoName(nameNoExt)) {
    ElMessage.error(
      '文件名格式错误：' + file.name +
        '（学生照片：身份证号后6位，或姓名+身份证号后6位；教师照片：姓名+身份证号后6位）'
    )
    return false
  }
  return true
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
 * 规则与批量的匹配算法**同一份**：两者都调 expectedPhotoNames（见该函数）。
 * 学生因此有两种可接受写法（红头文件的纯后 6 位 + 消歧用的「姓名+后6位」），
 * 教师只有一种。
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

  const accepts = expectedPhotoNames(item)
  const actual = file.name.substring(0, file.name.lastIndexOf('.'))
  if (accepts.indexOf(actual) === -1) {
    /* 把**全部**可接受名都举出来（学生有两种）。只举一种的话，撞号那张表里的用户
       照着改完还是对不上 —— 而撞号正是他来点单张上传的原因。上面的三个前置判断
       已保证 accepts 非空，这里不用再兜底。 */
    ElMessage.error(
      '文件名不符合命名规则，请改为：' +
        accepts.map((n) => n + '.jpg').join(' 或 ') +
        ' 后再上传'
    )
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
 * @param {() => Array<object>} [getRows]
 *        **可选**：返回「当前全部行」的回调，例如 `() => data.value`。
 *        传了它，单张上传就会在**传完之后按文件名重新确认该写哪一行**（见
 *        resolvePhotoTarget）—— 修的是「上传那两秒里用户删了一行，照片写到别人头上」。
 *        不传它，单张路径**与改动前逐字相同**（按下标记下的下标取行）。
 *        写成可选参数，是为了让改动只落在需要它的调用方身上 ——
 *        目前 PersonTable.vue 与 TeacherTable.vue 都传了它（第十四轮把教师表补齐，
 *        两表自此对称）；将来若有新表暂不想要这个保护，不传即可，零回归风险。
 * @returns {{
 *   uploadTrigger: import('vue').Ref,   // 绑到隐藏 el-upload 内部那个触发按钮上（模板 ref）
 *   upAvatar: (index: number) => void,  // 「上传照片」按钮的点击处理
 *   beforeUpload: (file: File) => boolean,        // 批量路径直接绑它
 *   beforeUploadSingle: (file: File) => boolean,  // 单张路径绑它（已闭包了行下标）
 *   uploadFileSingle: (options: object) => void   // 绑 :http-request
 * }}
 */
export function usePhotoUpload(getRowAt, getRows) {
  /** 隐藏的单张上传 input 的触发按钮（dist: this.$refs.uploadAvatar） */
  const uploadTrigger = ref(null)

  /* dist 里这个下标是「挂在 this 上、未写进 data」的实例属性（this.Arrayindex）。
     放进闭包 = 每个组件实例各一份，与 dist 的实例属性语义一致。 */
  let targetIndex = 0

  /* 【第十四轮新增】点击那一刻**那一行的对象本身**（不只是它的下标）。
     下标是「位置」，插一行删一行就移位；对象是「身份」，移位了也还是同一个人。
     它是 resolvePhotoTarget 的最后一道兜底，见那里的 ③。 */
  let targetRow = null

  /** dist: upAvatar(e){ event.preventDefault(), this.Arrayindex=e, this.$refs.uploadAvatar.click() } */
  function upAvatar(index) {
    /* 【收口 dist 的一处纯风险】dist 这行 `event.preventDefault()` 引的是**全局
       window.event**，而不是形参（模板传进来的其实是行下标，本来也拿不到事件对象）。
       两件事分开说：

         ① 它拦的其实是「不存在的默认行为」。el-button 最终渲染的是
            `<button type="button">`（element-plus 的 button.mjs 里 nativeType 默认值
            就是 'button'），点它既不提交表单、也没有任何默认动作 —— 所以这一行
            **什么都没拦到**，去掉它行为一模一样。

         ② 但它**会抛异常**。window.event 在「不在事件派发期间」或个别浏览器里是
            undefined，那时 `undefined.preventDefault()` 直接 TypeError，整个
            「上传照片」按钮就废了。收益为零、风险不为零。

       所以改成「取得到就调、取不到就跳过」：Chrome / Edge 下窗口事件对象存在，
       preventDefault 照调，效果与 dist **逐字相同**；取不到时静默跳过，不再抛。 */
    const ev = typeof window === 'undefined' ? null : window.event
    if (ev && typeof ev.preventDefault === 'function') ev.preventDefault()
    targetIndex = index
    // 记下标的同时记下对象（+1 行）。下标给 beforeUploadSingle 用（它只需要"这一刻"），
    // 对象给上传完成后的 resolvePhotoTarget 兜底用（那时下标可能已经不可靠了）。
    targetRow = getRowAt(index)
    uploadTrigger.value.click()
  }

  /** 单张路径的校验：把「当前该写哪一行」喂给共用的行内闸 */
  function beforeUploadSingleForRow(file) {
    return beforeUploadSingle(file, getRowAt(targetIndex))
  }

  /**
   * 【单张路径·上传完成后重新确认目标行】—— 防「下标漂移」。
   *
   * 【修的是什么】老写法在 .then 里用 `getRowAt(targetIndex)` 取行，而 targetIndex 是
   * **点击那一刻**记下的下标。从点按钮到照片传完要经过 2 次网络往返（OSS 代传 +
   * 落库），这期间用户完全可以删掉上面一行 —— 于是 data.value[targetIndex] 已经是
   * **另一个人**，照片就写到别人头上了。批量路径早就改成了「按文件名重新匹配」
   * （uploadFileBatch 里那次再匹配），单张路径一直还信任下标，两边不对称。
   *
   * 【为什么「按文件名」比「按下标」可靠】下标是**位置**，插入/删除就会移位；
   * 文件名里的身份证后 6 位（教师再加姓名）是**身份**，跟位置无关。
   * beforeUploadSingle 在选文件那一刻已经确认过「文件名 == 那一行的期望名」，
   * 所以表没变动时两种取法必然指向同一行 —— 这正是「改了也不会变差」的依据。
   *
   * 【三种情况的取法，逐条都有理由】
   *   ok    （唯一命中）→ 就用它。这是正常路径；表被改过时也仍然指向对的人。
   *   multi （多行同名）→ 退回点击时的下标，且**要求那一行确实在同名行里**。
   *        多行同名时（如两行身份证后 6 位相同）只有用户点的意图能区分，
   *        退回下标反而比"随便挑一个"更准 —— 这也是 dist 的老行为。
   *   none  （一行都对不上）→ 先看点击时那一行的**对象**还在不在表里（见下），
   *        还在就用它；真的没了才返回 null，让调用方报错、**不写**。
   *        老代码这里会把照片写进 data.value[targetIndex] —— 那可能是**另一个人**，必须拦。
   *
   * @param {string} fileName 原始文件名（含扩展名，与 uploadPhoto 收到的一致）
   * @param {number} fallbackIndex 点击那一刻记下的行下标
   * @returns {object|null} 该写 head 的行对象；null = 找不到，调用方应报错
   */
  function resolvePhotoTarget(fileName, fallbackIndex) {
    /* 调用方没接 getRows → 一行不改地走 dist 的老行为。
       这是「零外溢」的开关：不想要这个保护的表，传参时不传它就自动免疫。
       （两张表目前都传了；保留这个分支是为了让公共模块对"不传"也是安全的。） */
    const rows = typeof getRows === 'function' ? getRows() : null
    if (!Array.isArray(rows)) return getRowAt(fallbackIndex)

    const nameNoExt = fileName.substring(0, fileName.lastIndexOf('.'))
    const m = matchPhotoToRows(nameNoExt, rows)

    if (m.status === 'ok') return rows[m.hits[0]]

    if (m.status === 'multi') {
      const fallback = getRowAt(fallbackIndex)
      // hits 里的下标与 getRowAt 用的是同一个数组，所以可以直接比
      return fallback && m.hits.indexOf(fallbackIndex) !== -1 ? fallback : null
    }

    /* 【none 的三种成因，只有第三种真的该报错】
       ① 用户在上传那两秒里把这一行的**姓名或身份证号改了** → 按名字再也匹配不上，
          但**行还在**，而且就是用户当初点的那一行。此时报「没有对应行了」是误报，
          照片还会变成没人认领的孤儿文件。
       ② 用户把这一行**删了** → 对象不在表里，照片**确实**没有归宿，报错是对的。
       ③ 整张表被**重新导入 / 替换**（data.value 换了新数组）→ 对象不在表里，
          同上，报错是对的。

       区分 ① 和 ②③ 的办法：拿**点击那一刻存下的行对象**去当前数组里找。
       indexOf 靠「同一性」判断，而 Vue 的响应式代理有缓存 —— 同一个原始对象
       读两次拿到的是同一个代理，所以 indexOf 的判定是可靠的。
       顺带一提，用户只改字段（姓名/身份证/乐器…）不会换掉对象本身，
       所以 ① 必然能被认出来；这也正是「对象 = 身份」比「下标 = 位置」稳的原因。 */
    const stillThere = targetRow && rows.indexOf(targetRow) !== -1
    if (stillThere) return targetRow

    /* 【已知残留·修不掉，不是漏改】表里两行身份证后 6 位相同时（学生行只看后 6 位，
       所以这种重号是真会发生的），点其中一行上传、又在传完之前把**那一行**删掉，
       文件名就会**唯一**命中另一个人 —— 那是 ok 分支，到不了这里。
       想拦也拦不了：那时「整表被重新导入、命中新表的同一个人」（该写）和
       「同名尾号的另一个人」（不该写）在数据结构上**完全无法区分**（都是
       targetRow 不在表里 + 唯一命中）。这是「按尾号匹配」这套设计的固有代价，
       与本次改动无关，改动前后一模一样。 */
    return null
  }

  /** dist 原文见 git 历史：uploadSuccess(e,t){ n.filename=this.filename, ... } */
  function uploadFileSingle(options) {
    const file = options.file
    uploadPhoto(file)
      .then((url) => {
        // 上传失败时 uploadPhoto 已经弹过提示并回 null，这里不重复弹、也不写 head
        if (!url) return

        const row = resolvePhotoTarget(file.name, targetIndex)

        /* 找不到那一行了 —— 老代码这里是 `if (row) row.head = url` 静默丢弃，
           但「静默」在这里是不对的：文件**已经传上 OSS 并落了库**，用户却看不到
           任何反馈，会以为传成功了、反复重试，最后留下几个没人认领的文件。
           明确告诉用户「这张没写进去、请重新上传」，才能让他知道该重做。

           走到这里只剩两种成因（改个姓名 / 身份证的那种已经被 targetRow 兜住了）：
           那一行被删了，或者整张表被重新导入替换了。所以文案只说这两件事，
           不再提「姓名 / 身份证号被改动」—— 那样说现在是误报。 */
        if (!row) {
          ElMessage.error(
            `「${file.name}」已上传，但表里已经没有与它对应的那一行了` +
              `（该行可能已被删除，或表格被重新导入过），照片未写入，请重新上传`
          )
          return
        }
        row.head = url
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
