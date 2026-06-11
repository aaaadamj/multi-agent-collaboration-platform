/**
 * Agent 四级权限模型
 */
export type PermissionMode = 'bypass' | 'plan' | 'gentle' | 'auto'
export type PermissionDecision = 'allow' | 'deny' | 'confirm'

const READ_ONLY_TOOLS = new Set([
  'file_read', 'web_search', 'data_analyze', 'task_plan',
  'code_generate', 'doc_create'
])

const HIGH_RISK_TOOLS = new Set([
  'file_write', 'bash', 'shell_exec', 'delete', 'rm'
])

const DANGEROUS_PATTERNS = [
  'rm -rf', 'fork bomb', '/dev/sda',
  'shutdown', 'reboot', 'DROP TABLE', 'TRUNCATE'
]

export interface PermissionContext {
  mode: PermissionMode
  agentName?: string
  projectId?: number
}

export function checkToolPermission(
  toolName: string,
  ctx: PermissionContext
): { decision: PermissionDecision; reason?: string } {
  if (ctx.mode === 'bypass') return { decision: 'allow' }
  if (ctx.mode === 'plan') {
    if (READ_ONLY_TOOLS.has(toolName)) return { decision: 'allow' }
    return { decision: 'deny', reason: 'mode plan only read' }
  }
  if (ctx.mode === 'gentle') {
    if (HIGH_RISK_TOOLS.has(toolName)) {
      return { decision: 'confirm', reason: toolName + ' really confirm' }
    }
    return { decision: 'allow' }
  }
  if (HIGH_RISK_TOOLS.has(toolName)) {
    return { decision: 'confirm', reason: toolName + ' really confirm' }
  }
  return { decision: 'allow' }
}

export function validateShellCommand(command: string): { safe: boolean; reason?: string } {
  const normalized = command.toLowerCase()
  for (const p of DANGEROUS_PATTERNS) {
    if (normalized.includes(p.toLowerCase())) {
      return { safe: false, reason: 'dangerous operation: ' + p }
    }
  }
  return { safe: true }
}

export function getPermissionMode(): PermissionMode {
  const env = process.env['AGENT_PERMISSION_MODE']
  if (env === 'bypass' || env === 'plan' || env === 'gentle' || env === 'auto') return env
  return 'auto'
}
