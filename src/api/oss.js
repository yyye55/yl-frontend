/**
 * 阿里云 OSS 上传 API 层
 * 
 * 【第十二届改造】视频文件改为阿里云 OSS 前端直传
 * 
 * 注意：当前后端 OSS 临时授权接口尚未确认，以下为预留结构
 * 
 * 后端需要提供：
 * 1. 获取 OSS 临时上传凭证的接口
 * 2. 返回 accessKeyId, policy, signature, securityToken, key, host 等字段
 */

// TODO: 后端 OSS 接口确认后补充
// import request, { HOST } from '@/utils/request'

// /**
//  * 获取阿里云 OSS 临时上传凭证
//  * @param {Object} params - 请求参数
//  * @param {string} params.filename - 文件名
//  * @param {string} params.contentType - 文件类型
//  * @param {number} params.fileSize - 文件大小
//  * @returns {Promise} 返回 OSS 上传凭证
//  */
// export const ossApi = {
//   getToken: (params) => request.post(HOST + '/api/oss/token', params)
// }

/**
 * OSS 上传状态枚举
 */
export const OSS_UPLOAD_STATUS = {
  IDLE: 'idle',           // 未选择
  PREPARING: 'preparing', // 准备上传
  UPLOADING: 'uploading', // 上传中
  SUCCESS: 'success',     // 上传成功
  ERROR: 'error',         // 上传失败
  CANCELLED: 'cancelled'  // 取消上传
}

/**
 * 允许的视频格式
 */
export const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime']

/**
 * 允许的视频扩展名
 */
export const ALLOWED_VIDEO_EXTENSIONS = ['.mp4', '.mov']

/**
 * 视频大小限制（字节）
 * 700MB = 700 * 1024 * 1024
 */
export const MAX_VIDEO_SIZE = 700 * 1024 * 1024

/**
 * 允许的图片格式
 */
export const ALLOWED_IMAGE_TYPES = ['image/jpeg']

/**
 * 图片大小限制（字节）
 * 100KB = 100 * 1024
 */
export const MAX_IMAGE_SIZE = 100 * 1024

/**
 * 检查文件类型
 * @param {File} file - 文件对象
 * @param {string[]} allowedTypes - 允许的 MIME 类型数组
 * @param {string[]} allowedExtensions - 允许的扩展名数组
 * @returns {{ valid: boolean, error: string }}
 */
export function checkFileType(file, allowedTypes, allowedExtensions) {
  // 检查 MIME 类型
  if (!allowedTypes.includes(file.type)) {
    return { 
      valid: false, 
      error: `文件格式不正确，仅支持 ${allowedExtensions.join('、')} 格式` 
    }
  }
  
  // 检查扩展名
  const ext = '.' + file.name.split('.').pop().toLowerCase()
  if (!allowedExtensions.includes(ext)) {
    return { 
      valid: false, 
      error: `文件扩展名不正确，仅支持 ${allowedExtensions.join('、')} 格式` 
    }
  }
  
  return { valid: true, error: null }
}

/**
 * 检查文件大小
 * @param {File} file - 文件对象
 * @param {number} maxSize - 最大大小（字节）
 * @param {string} type - 文件类型描述
 * @returns {{ valid: boolean, error: string }}
 */
export function checkFileSize(file, maxSize, type = '文件') {
  if (file.size > maxSize) {
    const maxMB = (maxSize / 1024 / 1024).toFixed(0)
    return { 
      valid: false, 
      error: `${type}大小不能超过${maxMB}MB` 
    }
  }
  return { valid: true, error: null }
}

/**
 * 格式化文件大小显示
 * @param {number} bytes - 字节数
 * @returns {string} 格式化后的大小字符串
 */
export function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB'
  return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB'
}
