/**
 * 阿里云 OSS 上传 API 层（STS 临时凭证直传）
 *
 * 【为什么要改】本文件原先是一份「预留结构」：唯一一行 `request.post` 被注释掉，
 * 且注释里假设后端会返回 `policy` / `signature`（OSS PostObject 表单签名）。
 * 而后端 apps/api/views.py 的 oss_token 实际签发的是 **STS 临时凭证**
 * （accessKeyId / accessKeySecret / securityToken），根本不存在 policy/signature。
 * 两者对不上，照原注释实现必然跑不通。现按后端真实契约重写。
 *
 * 【原文件的常量还有个坑】MAX_IMAGE_SIZE = 100KB、ALLOWED_IMAGE_TYPES = ['image/jpeg']
 * 与后端 image 规则（1MB、jpeg+png）不符。这里改成与后端逐条对齐。
 */
import request, { HOST } from '@/utils/request'

export const ossApi = {
  /**
   * 换取一次性上传凭证
   *
   * 请求体：{ biz, filename, contentType, fileSize }
   * 返回信封：{ code, msg, data: { accessKeyId, accessKeySecret, securityToken,
   *           expiration, region, bucket, endpoint, host, key } }
   *
   * 【ObjectKey 由后端生成】形如 {biz}/{YYYYMMDD}/{uuid4}{ext}，前端不能自己拼。
   * 会话策略会收敛到这个目录前缀，前端拿到的凭证只能往这一个 key 写。
   */
  getToken: (data) => request.post(HOST + '/api/oss/token', data)
}

/**
 * 各业务类型的上限与允许的 MIME
 *
 * 【唯一事实来源：后端】apps/api/views.py 的 OSS_BIZ_RULES。
 * 改动此处必须同步改后端，否则前端放行的文件会被 /api/oss/token 拒掉
 * （后端不信任任何前端校验，每次签发凭证都会重新判一遍 biz / fileSize / contentType）。
 */
export const OSS_BIZ_RULES = {
  video: { label: '视频', maxSize: 700 * 1024 * 1024, types: ['video/mp4', 'video/quicktime'] },
  image: { label: '图片', maxSize: 1 * 1024 * 1024, types: ['image/jpeg', 'image/png'] },
  photo: { label: '照片', maxSize: 20 * 1024 * 1024, types: ['image/jpeg', 'image/tiff'] },
  spectrum: { label: '曲谱', maxSize: 20 * 1024 * 1024, types: ['application/pdf'] },
  doc: { label: '文件', maxSize: 20 * 1024 * 1024, types: ['application/pdf'] }
}

/**
 * 按业务类型校验文件
 *
 * 【为什么要在前端再判一遍】各表单的 beforeUpload 已经判过各自的规则，这里是兜底：
 * 上传层被新的调用点复用时，不至于漏掉校验、白发一次请求再被后端拒。
 * 文案沿用后端 failure() 的说法，保证「前端拦下」与「后端拒掉」提示一致。
 *
 * @returns {{ valid: boolean, error: string|null }}
 */
export function validateForBiz(file, biz) {
  const rule = OSS_BIZ_RULES[biz]
  if (!rule) return { valid: false, error: '未知的业务类型' }

  // 与后端一致：size <= 0 视为不合法（空文件 / 调用方漏传 fileSize）
  if (!file || !file.size || file.size > rule.maxSize) {
    return { valid: false, error: `${rule.label}大小不能超过${rule.maxSize / 1024 / 1024}MB` }
  }
  if (!rule.types.includes(file.type)) {
    return { valid: false, error: '不支持的文件类型' }
  }
  return { valid: true, error: null }
}

/**
 * 格式化文件大小显示
 */
export function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB'
  return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB'
}
