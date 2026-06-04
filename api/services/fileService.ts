import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { getDb } from '../db/index.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
// 项目工作区根目录：所有项目文件夹都放在此目录下
const WORKSPACE_ROOT = path.join(__dirname, '../../project-workspace')

// 确保工作区根目录存在
export function ensureWorkspaceRoot() {
  if (!fs.existsSync(WORKSPACE_ROOT)) {
    fs.mkdirSync(WORKSPACE_ROOT, { recursive: true })
  }
}

// 获取项目的实际文件夹路径（安全隔离）
async function getProjectFolderPath(projectId: number): Promise<string | null> {
  const db = await getDb()
  const row = await db.get('SELECT folder_path FROM project_folders WHERE project_id = ?', [projectId])
  return row?.folder_path || null
}

// 安全路径解析：确保不越出项目文件夹
function resolveSafePath(projectPath: string, relativePath: string): string {
  // 解析相对路径，去除 ..
  const resolved = path.resolve(projectPath, relativePath)
  // 确保结果在项目路径内
  if (!resolved.startsWith(path.resolve(projectPath))) {
    throw new Error('非法路径：不允许访问项目文件夹之外的文件')
  }
  return resolved
}

// 文件/文件夹信息接口
export interface FileInfo {
  name: string
  path: string
  relativePath: string
  isDirectory: boolean
  size?: number
  modifiedAt?: string
  children?: FileInfo[]
  extension?: string
}

// 递归构建文件树
function buildFileTree(dirPath: string, basePath: string, relativePrefix = ''): FileInfo[] {
  const items: FileInfo[] = []
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })
    for (const entry of entries) {
      // 隐藏文件（以.开头）不显示
      if (entry.name.startsWith('.')) continue

      const fullPath = path.join(dirPath, entry.name)
      const relativePath = relativePrefix ? `${relativePrefix}/${entry.name}` : entry.name
      const stat = fs.statSync(fullPath)

      const info: FileInfo = {
        name: entry.name,
        path: fullPath,
        relativePath,
        isDirectory: entry.isDirectory(),
        size: stat.size,
        modifiedAt: stat.mtime.toISOString(),
        extension: entry.isDirectory() ? undefined : path.extname(entry.name),
      }

      if (entry.isDirectory()) {
        info.children = buildFileTree(fullPath, basePath, relativePath)
      }
      items.push(info)
    }
    // 排序：文件夹在前，然后按名称排序
    items.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
      return a.name.localeCompare(b.name, 'zh-CN')
    })
  } catch (e) {
    // 忽略无权限的目录
  }
  return items
}

// ====== 导出的服务函数 ======

// 为项目设置工作文件夹
export async function setProjectFolder(projectId: number, folderName: string): Promise<string> {
  ensureWorkspaceRoot()
  const db = await getDb()

  // 使用安全的文件夹名（只保留字母、数字、中文、下划线、连字符）
  const safeName = folderName.replace(/[<>:"/\\|?*]/g, '_').trim()
  const folderPath = path.join(WORKSPACE_ROOT, `project-${projectId}-${safeName}`)

  // 创建物理文件夹
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true })
  }

  // 数据库记录（UPSERT）
  const existing = await db.get('SELECT id FROM project_folders WHERE project_id = ?', [projectId])
  if (existing) {
    await db.run('UPDATE project_folders SET folder_path = ? WHERE project_id = ?', [folderPath, projectId])
  } else {
    await db.run('INSERT INTO project_folders (project_id, folder_path) VALUES (?, ?)', [projectId, folderPath])
  }

  return folderPath
}

// 获取项目文件夹信息
export async function getProjectFolder(projectId: number): Promise<{ id: number; project_id: number; folder_path: string } | null> {
  const db = await getDb()
  return db.get('SELECT * FROM project_folders WHERE project_id = ?', [projectId])
}

// 列出项目文件夹内容（树形结构）
export async function listProjectFiles(projectId: number): Promise<FileInfo[]> {
  const folderPath = await getProjectFolderPath(projectId)
  if (!folderPath || !fs.existsSync(folderPath)) {
    return []
  }
  return buildFileTree(folderPath, folderPath)
}

// 列出单层目录内容
export async function listDirectory(projectId: number, dirPath?: string): Promise<FileInfo[]> {
  const rootPath = await getProjectFolderPath(projectId)
  if (!rootPath) throw new Error('项目未设置工作文件夹')

  const targetPath = dirPath ? resolveSafePath(rootPath, dirPath) : rootPath
  if (!fs.existsSync(targetPath) || !fs.statSync(targetPath).isDirectory()) {
    return []
  }

  return buildFileTree(targetPath, rootPath, dirPath || '')
}

// 读取文件内容
export async function readFileContent(projectId: number, filePath: string): Promise<{ content: string; encoding: string }> {
  const rootPath = await getProjectFolderPath(projectId)
  if (!rootPath) throw new Error('项目未设置工作文件夹')

  const safePath = resolveSafePath(rootPath, filePath)
  if (!fs.existsSync(safePath) || fs.statSync(safePath).isDirectory()) {
    throw new Error('文件不存在或为目录')
  }

  const content = fs.readFileSync(safePath, 'utf-8')
  return { content, encoding: 'utf-8' }
}

// 写入/创建文件
export async function writeFileContent(
  projectId: number,
  filePath: string,
  content: string,
  options?: { encoding?: string; createDirs?: boolean }
): Promise<FileInfo> {
  const rootPath = await getProjectFolderPath(projectId)
  if (!rootPath) throw new Error('项目未设置工作文件夹')

  const safePath = resolveSafePath(rootPath, filePath)

  // 如果需要，自动创建父目录
  if (options?.createDirs !== false) {
    const dir = path.dirname(safePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  }

  fs.writeFileSync(safePath, content, { encoding: (options?.encoding || 'utf-8') as BufferEncoding })

  const stat = fs.statSync(safePath)
  const relativePath = path.relative(rootPath, safePath).replace(/\\/g, '/')
  return {
    name: path.basename(safePath),
    path: safePath,
    relativePath,
    isDirectory: false,
    size: stat.size,
    modifiedAt: stat.mtime.toISOString(),
    extension: path.extname(safePath),
  }
}

// 创建子目录
export async function createDirectory(projectId: number, dirPath: string): Promise<FileInfo> {
  const rootPath = await getProjectFolderPath(projectId)
  if (!rootPath) throw new Error('项目未设置工作文件夹')

  const safePath = resolveSafePath(rootPath, dirPath)
  if (fs.existsSync(safePath) && fs.statSync(safePath).isDirectory()) {
    throw new Error('目录已存在')
  }

  fs.mkdirSync(safePath, { recursive: true })

  const relativePath = path.relative(rootPath, safePath).replace(/\\/g, '/')
  return {
    name: path.basename(safePath),
    path: safePath,
    relativePath,
    isDirectory: true,
    modifiedAt: new Date().toISOString(),
  }
}

// 删除文件或目录
export async function deleteFileOrDir(projectId: number, targetPath: string): Promise<void> {
  const rootPath = await getProjectFolderPath(projectId)
  if (!rootPath) throw new Error('项目未设置工作文件夹')

  const safePath = resolveSafePath(rootPath, targetPath)
  if (!fs.existsSync(safePath)) {
    throw new Error('文件或目录不存在')
  }

  const stat = fs.statSync(safePath)
  if (stat.isDirectory()) {
    fs.rmSync(safePath, { recursive: true, force: true })
  } else {
    fs.unlinkSync(safePath)
  }
}

// 重命名文件或目录
export async function renameFileOrDir(projectId: number, oldPath: string, newName: string): Promise<FileInfo> {
  const rootPath = await getProjectFolderPath(projectId)
  if (!rootPath) throw new Error('项目未设置工作文件夹')

  const oldSafePath = resolveSafePath(rootPath, oldPath)
  if (!fs.existsSync(oldSafePath)) {
    throw new Error('文件或目录不存在')
  }

  const dir = path.dirname(oldSafePath)
  const newSafePath = path.join(dir, newName.replace(/[<>:"/\\|?*]/g, '_'))
  
  // 安全检查：确保新路径仍在项目范围内
  resolveSafePath(rootPath, path.relative(rootPath, newSafePath))

  fs.renameSync(oldSafePath, newSafePath)

  const stat = fs.statSync(newSafePath)
  const relativePath = path.relative(rootPath, newSafePath).replace(/\\/g, '/')
  return {
    name: path.basename(newSafePath),
    path: newSafePath,
    relativePath,
    isDirectory: stat.isDirectory(),
    size: stat.size,
    modifiedAt: stat.mtime.toISOString(),
    extension: stat.isDirectory() ? undefined : path.extname(newSafePath),
  }
}

// 从Agent输出中提取并保存文件（智能解析代码块和markdown）
export async function saveAgentOutputAsFile(
  projectId: number,
  fileName: string,
  content: string,
  subDir?: string
): Promise<FileInfo> {
  let fullPath = fileName
  if (subDir) {
    fullPath = `${subDir}/${fileName}`
  }
  return writeFileContent(projectId, fullPath, content, { createDirs: true })
}

