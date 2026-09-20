/**
 * 视频上传服务层
 * 
 * 【第十二届改造】视频文件改为阿里云 OSS 前端直传
 * 
 * 职责：
 * 1. 视频文件校验（格式、大小）
 * 2. 获取 OSS 临时上传凭证
 * 3. 执行 OSS 直传
 * 4. 上传进度管理
 * 5. 上传状态管理
 * 
 * 注意：
 * - 当前后端 OSS 接口尚未确认，预留结构
 * - 实际 OSS SDK 接入需等后端接口确认后实现
 */

import { 
  ALLOWED_VIDEO_TYPES, 
  ALLOWED_VIDEO_EXTENSIONS,
  MAX_VIDEO_SIZE,
  OSS_UPLOAD_STATUS,
  checkFileType,
  checkFileSize
} from '@/api/oss'

/**
 * 创建视频上传服务实例
 * @param {Object} options - 配置选项
 * @param {Function} options.getToken - 获取 OSS 凭证的函数
 * @param {Function} options.onProgress - 进度回调 (percent: number) => void
 * @param {Function} options.onSuccess - 成功回调 (result: Object) => void
 * @param {Function} options.onError - 错误回调 (error: Error) => void
 */
export function createVideoUploader(options = {}) {
  let status = OSS_UPLOAD_STATUS.IDLE
  let progress = 0
  let currentFile = null
  let abortController = null
  
  const { 
    getToken,
    onProgress = () => {},
    onSuccess = () => {},
    onError = () => {}
  } = options
  
  /**
   * 重置状态
   */
  function reset() {
    status = OSS_UPLOAD_STATUS.IDLE
    progress = 0
    currentFile = null
    if (abortController) {
      abortController.abort()
      abortController = null
    }
  }
  
  /**
   * 校验视频文件
   * @param {File} file - 视频文件
   * @returns {{ valid: boolean, error: string }}
   */
  function validateFile(file) {
    // 检查格式
    const typeCheck = checkFileType(file, ALLOWED_VIDEO_TYPES, ALLOWED_VIDEO_EXTENSIONS)
    if (!typeCheck.valid) return typeCheck
    
    // 检查大小
    const sizeCheck = checkFileSize(file, MAX_VIDEO_SIZE, '视频')
    if (!sizeCheck.valid) return sizeCheck
    
    return { valid: true, error: null }
  }
  
  /**
   * 开始上传
   * @param {File} file - 视频文件
   * @returns {Promise<Object>} 上传结果
   */
  async function upload(file) {
    // 重置状态
    reset()
    
    // 校验文件
    const validation = validateFile(file)
    if (!validation.valid) {
      status = OSS_UPLOAD_STATUS.ERROR
      onError(new Error(validation.error))
      return { success: false, error: validation.error }
    }
    
    currentFile = file
    status = OSS_UPLOAD_STATUS.PREPARING
    progress = 0
    
    try {
      // 获取 OSS 凭证
      // TODO: 后端接口确认后实现
      // const tokenData = await getToken({
      //   filename: file.name,
      //   contentType: file.type,
      //   fileSize: file.size
      // })
      
      // TODO: 后端接口确认后实现 OSS 上传逻辑
      // 当前预留结构，等待后端接口
      
      status = OSS_UPLOAD_STATUS.PREPARING
      
      // 模拟上传流程（待后端接口确认后替换）
      // 实际实现应该类似：
      // const formData = new FormData()
      // formData.append('key', tokenData.key)
      // formData.append('OSSAccessKeyId', tokenData.accessKeyId)
      // formData.append('policy', tokenData.policy)
      // formData.append('signature', tokenData.signature)
      // formData.append('securityToken', tokenData.securityToken)
      // formData.append('file', file)
      // 
      // const response = await fetch(tokenData.host, {
      //   method: 'POST',
      //   body: formData,
      //   signal: abortController.signal
      // })
      
      // 临时占位：等待后端接口
      console.warn('[VideoUploadService] OSS 上传接口待后端确认')
      status = OSS_UPLOAD_STATUS.IDLE
      
      return { 
        success: false, 
        error: 'OSS 上传接口尚未就绪，请等待后端接口确认' 
      }
      
    } catch (error) {
      if (error.name === 'AbortError') {
        status = OSS_UPLOAD_STATUS.CANCELLED
        return { success: false, error: '上传已取消' }
      }
      
      status = OSS_UPLOAD_STATUS.ERROR
      onError(error)
      return { success: false, error: error.message }
    }
  }
  
  /**
   * 取消上传
   */
  function cancel() {
    if (status === OSS_UPLOAD_STATUS.UPLOADING) {
      if (abortController) {
        abortController.abort()
      }
      status = OSS_UPLOAD_STATUS.CANCELLED
    }
  }
  
  /**
   * 获取当前状态
   */
  function getStatus() {
    return {
      status,
      progress,
      file: currentFile
    }
  }
  
  return {
    upload,
    cancel,
    reset,
    validateFile,
    getStatus
  }
}

/**
 * 视频上传状态常量
 */
export { OSS_UPLOAD_STATUS }

/**
 * 导出 OSS 相关常量
 */
export { 
  ALLOWED_VIDEO_TYPES,
  ALLOWED_VIDEO_EXTENSIONS,
  MAX_VIDEO_SIZE 
}
