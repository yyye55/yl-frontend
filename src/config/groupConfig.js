/**
 * 第十二届“意林杯”四川省管乐展示活动 - 前端组别配置层
 *
 * 【重要】此文件为前端配置层，用于：
 * 1. 前端UI展示
 * 2. 前端业务规则校验
 * 3. 组别与后端值的映射
 *
 * 【后端枚举值已验证】
 * 通过阅读后端代码（apps/core/models.py Report CharField + apps/api/views.py scoped_total
 * / stats_admin 字符串过滤）确认：
 *   - Report.group 为 CharField，存字符串（如 "小学组"、"中学组"、"大学组"）
 *   - Report.establishment 为 CharField，存字符串（如 "管乐团"、"铜管乐团"）
 *   - 后端 scoped_total / stats_admin 按 group="字符串" 过滤，不是数字枚举
 *
 * 【第十二届新增说明】
 * 第十二届新增「铜管乐团」类型（管乐团 + 铜管乐团各若干组）。
 * 但后端 scoped_total / stats_admin 目前只按 "小学组/中学组/大学组" 过滤，
 * 未区分管乐/铜管。完整统计需要后端按 establishment+group 联合分组（BE-01）。
 */

/**
 * 第十二届五个正式组别
 *
 * 【官方明确 - 第十二届红头文件】
 * 管乐团分为：小学组、中学组、大学组
 * 铜管乐团分为：小学组、中学组
 *
 * 【后端枚举值 - 已验证】
 * BACKEND_GROUP_VALUE：直接使用后端 Report.group 存储的字符串值
 * BACKEND_ESTABLISHMENT_VALUE：直接使用后端 Report.establishment 存储的字符串值
 * 证据：apps/api/views.py scoped_total() / stats_admin() 均使用字符串过滤
 */
export const TWELFTH_GROUPS = [
  {
    FRONTEND_KEY: 'wind_primary',
    FRONTEND_LABEL: '管乐团-小学组',
    // 【已验证】后端按 group="小学组" 字符串过滤
    BACKEND_GROUP_VALUE: '小学组',
    // 【已验证】后端 establishment 存 "管乐团" 字符串
    BACKEND_ESTABLISHMENT_VALUE: '管乐团',
    ORCHESTRA_TYPE: '管乐团',
    ORCHESTRA_TYPE_KEY: 'wind',
    LEVEL: '小学组',
    LEVEL_KEY: 'primary',
    IS_BRASS: false,
    // 人员规则
    formalMin: 35,
    formalMax: 65,
    reserveMax: 5,
    percussionMax: null,
    // 时长规则
    durationLimit: 12,
    durationLimitSeconds: 720,
    // 视奏
    needSightReading: true
  },
  {
    FRONTEND_KEY: 'wind_middle',
    FRONTEND_LABEL: '管乐团-中学组',
    // 【已验证】后端按 group="中学组" 字符串过滤
    BACKEND_GROUP_VALUE: '中学组',
    BACKEND_ESTABLISHMENT_VALUE: '管乐团',
    ORCHESTRA_TYPE: '管乐团',
    ORCHESTRA_TYPE_KEY: 'wind',
    LEVEL: '中学组',
    LEVEL_KEY: 'middle',
    IS_BRASS: false,
    formalMin: 35,
    formalMax: 65,
    reserveMax: 5,
    percussionMax: null,
    durationLimit: 15,
    durationLimitSeconds: 900,
    needSightReading: true
  },
  {
    FRONTEND_KEY: 'wind_university',
    FRONTEND_LABEL: '管乐团-大学组',
    // 【已验证】后端按 group="大学组" 字符串过滤
    BACKEND_GROUP_VALUE: '大学组',
    BACKEND_ESTABLISHMENT_VALUE: '管乐团',
    ORCHESTRA_TYPE: '管乐团',
    ORCHESTRA_TYPE_KEY: 'wind',
    LEVEL: '大学组',
    LEVEL_KEY: 'university',
    IS_BRASS: false,
    formalMin: 35,
    formalMax: 65,
    reserveMax: 5,
    percussionMax: null,
    durationLimit: 18,
    durationLimitSeconds: 1080,
    needSightReading: true
  },
  {
    FRONTEND_KEY: 'brass_primary',
    FRONTEND_LABEL: '铜管乐团-小学组',
    // 【已验证】后端按 group="小学组" 字符串过滤（注意与管乐小学共用同一 group 值）
    // 区分管乐/铜管需要后端按 establishment 字段联合判断
    BACKEND_GROUP_VALUE: '小学组',
    BACKEND_ESTABLISHMENT_VALUE: '铜管乐团',
    ORCHESTRA_TYPE: '铜管乐团',
    ORCHESTRA_TYPE_KEY: 'brass',
    LEVEL: '小学组',
    LEVEL_KEY: 'primary',
    IS_BRASS: true,
    formalMin: 20,
    formalMax: 45,
    reserveMax: 3,
    percussionMax: 8,
    durationLimit: 10,
    durationLimitSeconds: 600,
    needSightReading: false
  },
  {
    FRONTEND_KEY: 'brass_middle',
    FRONTEND_LABEL: '铜管乐团-中学组',
    // 【已验证】后端按 group="中学组" 字符串过滤（注意与管乐中学共用同一 group 值）
    BACKEND_GROUP_VALUE: '中学组',
    BACKEND_ESTABLISHMENT_VALUE: '铜管乐团',
    ORCHESTRA_TYPE: '铜管乐团',
    ORCHESTRA_TYPE_KEY: 'brass',
    LEVEL: '中学组',
    LEVEL_KEY: 'middle',
    IS_BRASS: true,
    formalMin: 20,
    formalMax: 45,
    reserveMax: 3,
    percussionMax: 8,
    durationLimit: 10,
    durationLimitSeconds: 600,
    needSightReading: false
  }
]

/**
 * 根据前端 key 获取组别配置
 */
export function getGroupConfig(frontendKey) {
  return TWELFTH_GROUPS.find(g => g.FRONTEND_KEY === frontendKey) || null
}

/**
 * 根据前端 key 获取后端需要的提交值
 * 返回格式: { group: xxx, establishment: xxx }
 */
export function getBackendValues(frontendKey) {
  const config = getGroupConfig(frontendKey)
  if (!config) {
    console.warn(`[GroupConfig] 未找到组别配置: ${frontendKey}`)
    return null
  }
  return {
    group: config.BACKEND_GROUP_VALUE,
    establishment: config.BACKEND_ESTABLISHMENT_VALUE
  }
}

/**
 * 前端下拉选项（用于 Element Plus el-select）
 * 显示值使用前端 key，提交时需要通过 getBackendValues 转换
 */
export const GROUP_OPTIONS = TWELFTH_GROUPS.map(g => ({
  label: g.FRONTEND_LABEL,
  value: g.FRONTEND_KEY,
  // 后端值已验证为字符串
  backendValue: g.BACKEND_GROUP_VALUE
}))

/**
 * 乐团类型下拉选项
 *
 * 【第十二届】只有两种乐团类型
 *
 * 【后端枚举值 - 已验证】
 * establishment 字段存字符串 "管乐团" / "铜管乐团"
 * 证据：apps/api/views.py export_services.py admin_data1_rows() 直接用 item.establishment
 */
export const ORCHESTRA_TYPE_OPTIONS = [
  {
    label: '管乐团',
    BACKEND_VALUE: '管乐团', // 【已验证】后端直接存字符串
    ORCHESTRA_TYPE_KEY: 'wind',
    IS_BRASS: false
  },
  {
    label: '铜管乐团',
    BACKEND_VALUE: '铜管乐团', // 【已验证】后端直接存字符串
    ORCHESTRA_TYPE_KEY: 'brass',
    IS_BRASS: true
  }
]

/**
 * 组别选项（不带乐团类型前缀，用于现有表单）
 * 用于 /city/elementary/create 等使用 '小学组'/'中学组'/'大学组' 的场景
 */
export const LEVEL_OPTIONS = [
  { label: '小学组', value: '小学组' },
  { label: '中学组', value: '中学组' },
  { label: '大学组', value: '大学组' }
]

/**
 * 根据乐团类型获取后端值
 */
export function getOrchestraTypeBackendValue(label) {
  const config = ORCHESTRA_TYPE_OPTIONS.find(o => o.label === label)
  return config ? config.BACKEND_VALUE : null
}

/**
 * 根据乐团类型和组别获取完整组别配置
 * @param {string} orchestraType - 乐团类型 ('管乐团' / '铜管乐团')
 * @param {string} level - 组别 ('小学组' / '中学组' / '大学组')
 */
export function getGroupByTypeAndLevel(orchestraType, level) {
  return TWELFTH_GROUPS.find(g =>
    g.ORCHESTRA_TYPE === orchestraType && g.LEVEL === level
  ) || null
}
