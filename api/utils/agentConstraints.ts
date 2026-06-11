/**
 * Agent 拓扑约束
 * 
 * 来自 Claude Code 的设计模式：
 * - 防止无限嵌套（teammate 不能再 spawn teammate）
 * - 防止循环依赖
 * - 限制 Agent 调用链深度
 */

export const MAX_AGENT_DEPTH = 3
export const MAX_TEAM_MEMBERS = 8

interface AgentNode {
  id: string
  type: 'agent' | 'condition' | 'start' | 'end'
}

interface AgentEdge {
  source: string
  target: string
}

/**
 * 验证 Agent 拓扑图的合法性
 */
export function validateAgentTopology(nodes: AgentNode[], edges: AgentEdge[]): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  // 1. 无孤立节点
  const connectedNodes = new Set<string>()
  for (const e of edges) {
    connectedNodes.add(e.source)
    connectedNodes.add(e.target)
  }
  for (const n of nodes) {
    if (!connectedNodes.has(n.id) && n.type !== 'start' && n.type !== 'end') {
      errors.push(`节点 "${n.id}" 未连接到任何边`)
    }
  }

  // 2. 检测循环（DFS）
  if (hasCycle(nodes, edges)) {
    errors.push('Agent 拓扑图中检测到循环依赖')
  }

  // 3. 深度限制
  const maxDepth = calculateMaxDepth(nodes, edges)
  if (maxDepth > MAX_AGENT_DEPTH) {
    errors.push(`Agent 调用链深度 ${maxDepth} 超过限制 ${MAX_AGENT_DEPTH}`)
  }

  // 4. 团队成员数限制
  const agentCount = nodes.filter(n => n.type === 'agent').length
  if (agentCount > MAX_TEAM_MEMBERS) {
    errors.push(`Agent 数量 ${agentCount} 超过团队上限 ${MAX_TEAM_MEMBERS}`)
  }

  return { valid: errors.length === 0, errors }
}

/**
 * 检测是否有循环依赖（DFS 三色标记）
 */
function hasCycle(nodes: AgentNode[], edges: AgentEdge[]): boolean {
  const WHITE = 0, GRAY = 1, BLACK = 2
  const color = new Map<string, number>()
  nodes.forEach(n => color.set(n.id, WHITE))

  const adj = new Map<string, string[]>()
  nodes.forEach(n => adj.set(n.id, []))
  edges.forEach(e => adj.get(e.source)?.push(e.target))

  function dfs(nodeId: string): boolean {
    color.set(nodeId, GRAY)
    for (const neighbor of adj.get(nodeId) || []) {
      const c = color.get(neighbor)
      if (c === GRAY) return true
      if (c === WHITE && dfs(neighbor)) return true
    }
    color.set(nodeId, BLACK)
    return false
  }

  for (const n of nodes) {
    if (color.get(n.id) === WHITE && dfs(n.id)) return true
  }
  return false
}

/**
 * 计算拓扑最大深度
 */
function calculateMaxDepth(nodes: AgentNode[], edges: AgentEdge[]): number {
  const adj = new Map<string, string[]>()
  const inDegree = new Map<string, number>()
  nodes.forEach(n => { adj.set(n.id, []); inDegree.set(n.id, 0) })
  edges.forEach(e => { adj.get(e.source)?.push(e.target); inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1) })

  // Kahn 拓扑排序计算各节点深度
  const depth = new Map<string, number>()
  const queue: string[] = []
  nodes.forEach(n => { if (inDegree.get(n.id) === 0) { queue.push(n.id); depth.set(n.id, 1) } })

  let maxD = 1
  while (queue.length > 0) {
    const u = queue.shift()!
    for (const v of adj.get(u) || []) {
      depth.set(v, Math.max(depth.get(v) || 0, (depth.get(u) || 1) + 1))
      maxD = Math.max(maxD, depth.get(v)!)
      inDegree.set(v, (inDegree.get(v) || 1) - 1)
      if (inDegree.get(v) === 0) queue.push(v)
    }
  }
  return maxD
}

/**
 * 检查 Agent 是否可以创建子 Agent
 */
export function canSpawnSubAgent(
  currentDepth: number,
  currentTeamSize: number,
  agentType: 'subagent' | 'teammate'
): { allowed: boolean; reason?: string } {
  if (agentType === 'teammate' && currentDepth > 0) {
    return { allowed: false, reason: 'Teammate 不能创建子 Teammate（防止无限嵌套）' }
  }
  if (currentDepth >= MAX_AGENT_DEPTH) {
    return { allowed: false, reason: `嵌套深度 ${currentDepth} 已达上限 ${MAX_AGENT_DEPTH}` }
  }
  if (currentTeamSize >= MAX_TEAM_MEMBERS) {
    return { allowed: false, reason: `团队成员数 ${currentTeamSize} 已达上限 ${MAX_TEAM_MEMBERS}` }
  }
  return { allowed: true }
}
