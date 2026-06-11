/**
 * Append-only JSONL Session 持久化
 * 
 * 来自 Claude Code 的设计模式：
 * - 每次交互以 JSON 行追加写入，不修改历史记录
 * - 批量 flush 减少 IO
 * - UUID 去重防止重复写入
 * - 支持断点恢复（读取最近 N 条记录）
 */

import * as fs from 'fs'
import * as path from 'path'
import { getDb } from '../db/index.js'

const SESSIONS_DIR = path.join(process.cwd(), 'data', 'sessions')
const FLUSH_INTERVAL_MS = 2000 // 批量 flush 间隔

interface SessionEvent {
  uuid: string
  type: 'user' | 'agent' | 'tool_call' | 'tool_result' | 'system'
  agentId?: string
  role?: string
  content: string
  toolId?: string
  timestamp: string
  projectId?: number
}

// === 写入队列（批量 flush） ===
const writeQueues = new Map<string, SessionEvent[]>()
let flushTimer: NodeJS.Timeout | null = null
const uuidSet = new Set<string>()

function getSessionPath(sessionId: string): string {
  return path.join(SESSIONS_DIR, `${sessionId}.jsonl`)
}

function ensureSessionDir(): void {
  if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true })
  }
}

/**
 * 追加事件到队列（不立即写盘）
 */
export function appendEvent(sessionId: string, event: SessionEvent): void {
  // UUID 去重
  if (uuidSet.has(event.uuid)) return
  uuidSet.add(event.uuid)

  // 添加到时间戳
  event.timestamp = event.timestamp || new Date().toISOString()

  ensureSessionDir()
  const queue = writeQueues.get(sessionId) || []
  queue.push(event)
  writeQueues.set(sessionId, queue)

  // 首次写入时启动 flush 定时器
  if (!flushTimer) {
    flushTimer = setTimeout(flushAll, FLUSH_INTERVAL_MS)
  }

  // 同时写入 SQLite（双写）
  persistToDb(event).catch(err => console.error('[SessionStore] DB write failed:', err))
}

/**
 * 批量 flush 所有队列到磁盘
 */
async function flushAll(): Promise<void> {
  flushTimer = null
  const entries = [...writeQueues.entries()]
  writeQueues.clear()

  for (const [sessionId, events] of entries) {
    if (events.length === 0) continue
    const filePath = getSessionPath(sessionId)
    const content = events.map(e => JSON.stringify(e)).join('\n') + '\n'
    try {
      fs.appendFileSync(filePath, content, { mode: 0o600 })
    } catch {
      fs.mkdirSync(path.dirname(filePath), { recursive: true })
      fs.appendFileSync(filePath, content, { mode: 0o600 })
    }
  }
}

/**
 * 强制 flush（进程退出时调用）
 */
export async function flushSessionStore(): Promise<void> {
  if (flushTimer) {
    clearTimeout(flushTimer)
    flushTimer = null
  }
  await flushAll()
}

/**
 * 读取 session 的事件列表
 */
export function readSession(sessionId: string): SessionEvent[] {
  const filePath = getSessionPath(sessionId)
  if (!fs.existsSync(filePath)) return []
  const content = fs.readFileSync(filePath, 'utf-8')
  return content
    .split('\n')
    .filter(line => line.trim())
    .map(line => {
      try { return JSON.parse(line) }
      catch { return null }
    })
    .filter(Boolean)
}

/**
 * 读取最近 N 条事件（断点恢复用）
 */
export function readRecentEvents(sessionId: string, count: number = 50): SessionEvent[] {
  const all = readSession(sessionId)
  return all.slice(-count)
}

/**
 * 双写到 SQLite（兼容现有查询）
 */
async function persistToDb(event: SessionEvent): Promise<void> {
  if (!event.projectId) return
  try {
    const db = await getDb()
    await db.run(
      'INSERT INTO chat_messages (project_id, agent_id, role, content) VALUES (?, ?, ?, ?)',
      [event.projectId, event.agentId || null, event.type === 'user' ? 'user' : 'agent', event.content]
    )
  } catch (e) {
    // 静默失败，JSONL 是主存储
  }
}
