/**
 * 第十二届「意林杯」四川省管乐展示活动 - 人员编制规则配置
 * 
 * 【重要】此文件为前端配置层，用于：
 * 1. 前端人员数量校验
 * 2. 展示时长限制
 * 3. 视奏要求
 * 
 * 【官方明确】
 * - 管乐团：正式成员35-65人，预备最多5人
 * - 铜管乐团：正式成员20-45人，预备最多3人，打击乐不超过8人
 * - 展示时长：管乐小学≤12分钟，管乐中学≤15分钟，管乐大学≤18分钟，铜管乐团≤10分钟
 * - 视奏：仅管乐团需要，铜管乐团不需要
 */

/**
 * 人员编制规则
 * key: 与 groupConfig.js 中的 FRONTEND_KEY 对应
 */
export const PERSON_RULES = {
  'wind_primary': {
    orchestraType: '管乐团',
    level: '小学组',
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
    level: '中学组',
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
    level: '大学组',
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
    level: '小学组',
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
    level: '中学组',
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
 * 获取指定组别的人员规则
 */
export function getPersonRules(frontendGroupKey) {
  return PERSON_RULES[frontendGroupKey] || null
}

/**
 * 校验人员编制
 * @param {string} frontendGroupKey - 前端组别key
 * @param {Array} formalMembers - 正式成员数组
 * @param {Array} reserveMembers - 预备成员数组
 * @param {Array} allMembers - 所有成员数组（含 position 信息）
 * @returns {{ valid: boolean, errors: Array }}
 */
export function validatePersonCount(frontendGroupKey, formalMembers, reserveMembers, allMembers = []) {
  const rules = getPersonRules(frontendGroupKey)
  if (!rules) {
    return { valid: false, errors: ['未找到对应组别的人员编制规则'] }
  }
  
  const errors = []
  const formalCount = formalMembers.length
  const reserveCount = reserveMembers.length
  
  // 校验正式成员人数
  if (formalCount < rules.formalMin) {
    errors.push(`正式成员人数不能少于${rules.formalMin}人，当前${formalCount}人`)
  }
  if (formalCount > rules.formalMax) {
    errors.push(`正式成员人数不能超过${rules.formalMax}人，当前${formalCount}人`)
  }
  
  // 校验预备成员人数
  if (reserveCount > rules.reserveMax) {
    errors.push(`预备成员人数不能超过${rules.reserveMax}人，当前${reserveCount}人`)
  }
  
  // 校验铜管乐团打击乐人数
  if (rules.percussionMax !== null && allMembers.length > 0) {
    // 从所有成员中统计打击乐人数
    const percussionCount = allMembers.filter(m => {
      // 假设 instrument === '打击乐' 表示打击乐手
      return m.instrument === '打击乐'
    }).length
    if (percussionCount > rules.percussionMax) {
      errors.push(`铜管乐团${rules.level}打击乐人数不能超过${rules.percussionMax}人，当前${percussionCount}人`)
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * 获取展示时长限制（分钟）
 */
export function getDurationLimit(frontendGroupKey) {
  const rules = getPersonRules(frontendGroupKey)
  return rules ? rules.durationLimit : null
}

/**
 * 获取展示时长限制（秒）
 */
export function getDurationLimitSeconds(frontendGroupKey) {
  const rules = getPersonRules(frontendGroupKey)
  return rules ? rules.durationLimitSeconds : null
}

/**
 * 判断是否需要视奏
 */
export function needSightReading(frontendGroupKey) {
  const rules = getPersonRules(frontendGroupKey)
  return rules ? rules.needSightReading : false
}

/**
 * 校验展示时长
 * @param {number} seconds - 时长（秒）
 * @param {string} frontendGroupKey - 前端组别key
 * @returns {{ valid: boolean, error: string }}
 */
export function validateDuration(seconds, frontendGroupKey) {
  const rules = getPersonRules(frontendGroupKey)
  if (!rules) {
    return { valid: false, error: '未找到对应组别的时长规则' }
  }
  
  if (seconds > rules.durationLimitSeconds) {
    const overMinutes = Math.ceil((seconds - rules.durationLimitSeconds) / 60)
    return { 
      valid: false, 
      error: `${rules.orchestraType}${rules.level}展示时长不能超过${rules.durationLimit}分钟，超时${overMinutes}分钟将扣分` 
    }
  }
  
  return { valid: true, error: null }
}
