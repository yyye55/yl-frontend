/**
 * 第十二届「意林杯」四川省管乐展示活动 - 人员编制规则配置
 * 
 * 【重要】此文件为前端配置层，用于：
 * 1. 前端人员数量校验
 * 2. 展示时长限制
 * 3. 视奏要求
 * 
 * 【官方明确 - 第十二届红头文件】
 * - 管乐团：正式成员35-65人，预备最多5人
 * - 铜管乐团：正式成员20-45人，预备最多3人，打击乐不超过8人
 * - 展示时长：管乐小学≤12分钟，管乐中学≤15分钟，管乐大学≤18分钟，铜管乐团≤10分钟
 * - 视奏：仅管乐团需要，铜管乐团不需要
 * 
 * 【乐器识别】
 * - 乐器字段：item.instrument === '打击乐'
 */

/**
 * 人员编制规则
 * key: 与 TWELFTH_GROUPS 中的 FRONTEND_KEY 对应
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
  const map = {
    '管乐团': {
      '小学组': 'wind_primary',
      '中学组': 'wind_middle',
      '大学组': 'wind_university'
    },
    '铜管乐团': {
      '小学组': 'brass_primary',
      '中学组': 'brass_middle'
    }
  }
  return map[establishment]?.[group] || null
}

/**
 * 获取指定组别的人员规则
 * @param {string} frontendGroupKey - 前端组别key (wind_primary / wind_middle / wind_university / brass_primary / brass_middle)
 */
export function getPersonRules(frontendGroupKey) {
  return PERSON_RULES[frontendGroupKey] || null
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
    return { 
      valid: false, 
      errors: ['未找到对应组别的人员编制规则'], 
      stats: { formal: 0, reserve: 0, percussion: 0 } 
    }
  }
  
  const errors = []
  let formalCount = 0
  let reserveCount = 0
  let percussionCount = 0
  
  // 遍历所有人员统计
  persons.forEach(p => {
    // type=0 表示学生/队员
    if (p.type === 0) {
      formalCount++
      if (p.position === 1) {
        reserveCount++
      }
      // 乐器 === '打击乐' 统计
      if (p.instrument === '打击乐') {
        percussionCount++
      }
    }
  })
  
  // 校验正式成员人数
  if (formalCount < rules.formalMin) {
    errors.push(`正式成员人数不能少于${rules.formalMin}人，当前${formalCount}人`)
  }
  if (formalCount > rules.formalMax) {
    errors.push(`正式成员人数不能超过${rules.formalMax}人，当前${formalCount}人`)
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
  const totalSeconds = minutes * 60 + seconds
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
