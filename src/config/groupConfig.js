/**
 * 第十二届「意林杯」四川省管乐展示活动 - 前端组别配置层
 * 
 * 【重要】此文件为前端配置层，用于：
 * 1. 前端UI展示
 * 2. 前端业务规则校验
 * 3. 组别与后端值的映射
 * 
 * 【后端值待确认】
 * 后端 group 和 establishment 的具体枚举值需要后端确认后填写到 BACKEND_VALUE 列
 */

/**
 * 第十二届五个正式组别
 * 
 * 注意：BACKEND_GROUP_VALUE 和 BACKEND_TYPE_VALUE 需要后端确认后填写
 * 当前使用 FRONTEND_KEY 作为前端内部唯一标识
 */
export const TWELFTH_GROUPS = [
  {
    FRONTEND_KEY: 'wind_primary',
    FRONTEND_LABEL: '管乐团-小学组',
    BACKEND_GROUP_VALUE: null, // TODO: 待后端确认
    BACKEND_TYPE_VALUE: null, // TODO: 待后端确认
    ORCHESTRA_TYPE: '管乐团',
    LEVEL: '小学组',
    IS_BRASS: false
  },
  {
    FRONTEND_KEY: 'wind_middle',
    FRONTEND_LABEL: '管乐团-中学组',
    BACKEND_GROUP_VALUE: null, // TODO: 待后端确认
    BACKEND_TYPE_VALUE: null, // TODO: 待后端确认
    ORCHESTRA_TYPE: '管乐团',
    LEVEL: '中学组',
    IS_BRASS: false
  },
  {
    FRONTEND_KEY: 'wind_university',
    FRONTEND_LABEL: '管乐团-大学组',
    BACKEND_GROUP_VALUE: null, // TODO: 待后端确认
    BACKEND_TYPE_VALUE: null, // TODO: 待后端确认
    ORCHESTRA_TYPE: '管乐团',
    LEVEL: '大学组',
    IS_BRASS: false
  },
  {
    FRONTEND_KEY: 'brass_primary',
    FRONTEND_LABEL: '铜管乐团-小学组',
    BACKEND_GROUP_VALUE: null, // TODO: 待后端确认
    BACKEND_TYPE_VALUE: null, // TODO: 待后端确认
    ORCHESTRA_TYPE: '铜管乐团',
    LEVEL: '小学组',
    IS_BRASS: true
  },
  {
    FRONTEND_KEY: 'brass_middle',
    FRONTEND_LABEL: '铜管乐团-中学组',
    BACKEND_GROUP_VALUE: null, // TODO: 待后端确认
    BACKEND_TYPE_VALUE: null, // TODO: 待后端确认
    ORCHESTRA_TYPE: '铜管乐团',
    LEVEL: '中学组',
    IS_BRASS: true
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
    establishment: config.BACKEND_TYPE_VALUE
  }
}

/**
 * 前端下拉选项（仅 label 和前端 key）
 * 用于 Element Plus el-select
 */
export const GROUP_OPTIONS = TWELFTH_GROUPS.map(g => ({
  label: g.FRONTEND_LABEL,
  value: g.FRONTEND_KEY  // 注意：当前使用前端 key，后端值需后端确认后修改
}))

/**
 * 乐团类型下拉选项
 * 
 * 注意：BACKEND_VALUE 需要后端确认
 */
export const ORCHESTRA_TYPE_OPTIONS = [
  {
    label: '管乐团',
    BACKEND_VALUE: null, // TODO: 待后端确认
    IS_BRASS: false
  },
  {
    label: '铜管乐团',
    BACKEND_VALUE: null, // TODO: 待后端确认
    IS_BRASS: true
  }
]

/**
 * 根据乐团类型获取后端值
 */
export function getOrchestraTypeBackendValue(label) {
  const config = ORCHESTRA_TYPE_OPTIONS.find(o => o.label === label)
  return config ? config.BACKEND_VALUE : null
}
