/**
 * 统一错误处理中间件
 * 
 * 捕获所有未处理的错误并返回统一格式
 */

import { Request, Response, NextFunction } from 'express'
import { serverError, unauthorized, forbidden, notFound, badRequest } from './apiResponse.js'

export class AppError extends Error {
  statusCode: number
  constructor(message: string, statusCode: number = 500) {
    super(message)
    this.statusCode = statusCode
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) { super(`${resource} 不存在`, 404) }
}

export class UnauthorizedError extends AppError {
  constructor(message = '未登录') { super(message, 401) }
}

export class ForbiddenError extends AppError {
  constructor(message = '无权限') { super(message, 403) }
}

export class ValidationError extends AppError {
  constructor(message: string) { super(message, 400) }
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  console.error(`[ERROR] ${err.message}`, err.stack)

  if (err instanceof NotFoundError) {
    return res.status(404).json(notFound(err.message.replace(' 不存在', '')))
  }
  if (err instanceof UnauthorizedError) {
    return res.status(401).json(unauthorized(err.message))
  }
  if (err instanceof ForbiddenError) {
    return res.status(403).json(forbidden(err.message))
  }
  if (err instanceof ValidationError) {
    return res.status(400).json(badRequest(err.message))
  }
  if (err instanceof AppError) {
    return res.status(err.statusCode).json(serverError(err.message))
  }

  res.status(500).json(serverError('服务器内部错误'))
}
