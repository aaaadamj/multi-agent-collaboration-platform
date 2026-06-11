import { Router, Request, Response } from 'express'
import * as fileService from '../services/fileService.js'
import { ok, created, notFound, badRequest, serverError } from '../utils/apiResponse.js'

const router = Router()

// 获取项目文件夹信息
router.get('/folder', async (req: Request, res: Response) => {
  try {
    const projectId = Number(req.params.id)
    const folder = await fileService.getProjectFolder(projectId)
    if (!folder) {
      res.json(ok(null))
      return
    }
    // 返回文件夹路径（相对信息）和文件树
    const files = await fileService.listProjectFiles(projectId)
    res.json(ok({ ...folder, files }))
  } catch (error) {
    res.status(500).json(serverError((error as Error).message))
  }
})

// 设置/更新项目工作文件夹
router.post('/folder', async (req: Request, res: Response) => {
  try {
    const projectId = Number(req.params.id)
    const { folderName } = req.body
    if (!folderName) {
      res.status(400).json(badRequest('请提供文件夹名称'))
      return
    }
    const folderPath = await fileService.setProjectFolder(projectId, folderName)
    const files = await fileService.listProjectFiles(projectId)
    res.json(ok({ folderPath, files }))
  } catch (error) {
    res.status(500).json(serverError((error as Error).message))
  }
})

// 列出所有文件（树形结构）
router.get('/files', async (req: Request, res: Response) => {
  try {
    const projectId = Number(req.params.id)
    const files = await fileService.listProjectFiles(projectId)
    res.json(ok(files))
  } catch (error) {
    res.status(500).json(serverError((error as Error).message))
  }
})

// 列出指定目录内容（单层）
router.get('/files/list/*', async (req: Request, res: Response) => {
  try {
    const projectId = Number(req.params.id)
    const dirPath = req.params[0] || ''
    const files = await fileService.listDirectory(projectId, decodeURIComponent(dirPath))
    res.json(ok(files))
  } catch (error) {
    res.status(500).json(serverError((error as Error).message))
  }
})

// 读取文件内容
router.get('/files/read/*', async (req: Request, res: Response) => {
  try {
    const projectId = Number(req.params.id)
    const filePath = req.params[0]
    const result = await fileService.readFileContent(projectId, decodeURIComponent(filePath))
    res.json(ok(result))
  } catch (error) {
    res.status(500).json(serverError((error as Error).message))
  }
})

// 写入/创建文件
router.post('/files/write', async (req: Request, res: Response) => {
  try {
    const projectId = Number(req.params.id)
    const { path: filePath, content, createDirs } = req.body
    if (!filePath) {
      res.status(400).json(badRequest('请提供文件路径'))
      return
    }
    const fileInfo = await fileService.writeFileContent(projectId, filePath, content || '', {
      createDirs: createDirs !== false,
    })
    res.json(ok(fileInfo))
  } catch (error) {
    res.status(500).json(serverError((error as Error).message))
  }
})

// 创建子目录
router.post('/files/mkdir', async (req: Request, res: Response) => {
  try {
    const projectId = Number(req.params.id)
    const { path: dirPath } = req.body
    if (!dirPath) {
      res.status(400).json(badRequest('请提供目录路径'))
      return
    }
    const info = await fileService.createDirectory(projectId, dirPath)
    res.json(ok(info))
  } catch (error) {
    res.status(500).json(serverError((error as Error).message))
  }
})

// 删除文件或目录
router.delete('/files/*', async (req: Request, res: Response) => {
  try {
    const projectId = Number(req.params.id)
    const targetPath = req.params[0]
    await fileService.deleteFileOrDir(projectId, decodeURIComponent(targetPath))
    res.json(ok(null))
  } catch (error) {
    res.status(500).json(serverError((error as Error).message))
  }
})

// 重命名
router.put('/files/rename', async (req: Request, res: Response) => {
  try {
    const projectId = Number(req.params.id)
    const { oldPath, newName } = req.body
    if (!oldPath || !newName) {
      res.status(400).json(badRequest('请提供原路径和新名称'))
      return
    }
    const info = await fileService.renameFileOrDir(projectId, oldPath, newName)
    res.json(ok(info))
  } catch (error) {
    res.status(500).json(serverError((error as Error).message))
  }
})

// 从Agent输出保存为文件
router.post('/files/save-output', async (req: Request, res: Response) => {
  try {
    const projectId = Number(req.params.id)
    const { fileName, content, subDir } = req.body
    if (!fileName) {
      res.status(400).json(badRequest('请提供文件名'))
      return
    }
    const fileInfo = await fileService.saveAgentOutputAsFile(projectId, fileName, content || '', subDir)
    res.json(ok(fileInfo))
  } catch (error) {
    res.status(500).json(serverError((error as Error).message))
  }
})

export default router

