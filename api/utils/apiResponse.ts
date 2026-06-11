/**
 * 统一 API 响应格式（遵循 Vibe Coding 后端架构验收标准）
 * 
 * 所有接口返回格式统一为：
 * { success: boolean, data?: any, error?: string, meta?: object }
 */

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  meta?: {
    timestamp: string
    page?: number
    pageSize?: number
    total?: number
    [key: string]: any
  }
}

export function ok<T>(data: T, meta?: ApiResponse['meta']): ApiResponse<T> {
  return { success: true, data, meta: { timestamp: new Date().toISOString(), ...meta } }
}

export function created<T>(data: T): ApiResponse<T> {
  return { success: true, data, meta: { timestamp: new Date().toISOString() } }
}

export function emptyList(): ApiResponse {
  return { success: true, data: [], meta: { timestamp: new Date().toISOString(), total: 0 } }
}

export function listOk<T>(data: T[], total: number, page: number, pageSize: number): ApiResponse<T[]> {
  return { success: true, data, meta: { timestamp: new Date().toISOString(), total, page, pageSize } }
}

export function badRequest(message: string): ApiResponse {
  return { success: false, error: '参数错误', message, meta: { timestamp: new Date().toISOString() } }
}

export function unauthorized(message = '未登录或登录已过期'): ApiResponse {
  return { success: false, error: '未登录', message, meta: { timestamp: new Date().toISOString() } }
}

export function forbidden(message = '无权限执行此操作'): ApiResponse {
  return { success: false, error: '无权限', message, meta: { timestamp: new Date().toISOString() } }
}

export function notFound(resource: string): ApiResponse {
  return { success: false, error: '资源不存在', message: `${resource} 不存在`, meta: { timestamp: new Date().toISOString() } }
}

export function serverError(message = '服务器内部错误'): ApiResponse {
  return { success: false, error: '系统异常', message, meta: { timestamp: new Date().toISOString() } }
}
