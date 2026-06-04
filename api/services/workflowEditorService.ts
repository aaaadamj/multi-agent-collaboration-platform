import { getDb } from '../db/index.js'

export interface WorkflowNode {
  id: string
  type: 'agent' | 'condition' | 'start' | 'end'
  position: { x: number; y: number }
  data: {
    agentId?: string
    agentName?: string
    label?: string
    condition?: string
    trueTarget?: string
    falseTarget?: string
  }
}

export interface WorkflowEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  label?: string
  condition?: string
  type?: string
}

export interface Workflow {
  id: number
  project_id: number
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  updated_at: string
}

export async function getWorkflow(projectId: number): Promise<Workflow | null> {
  const db = await getDb()
  const row = await db.get('SELECT * FROM project_workflows WHERE project_id = ?', [projectId])
  if (!row) return null
  return {
    ...row,
    nodes: typeof row.nodes === 'string' ? JSON.parse(row.nodes) : row.nodes,
    edges: typeof row.edges === 'string' ? JSON.parse(row.edges) : row.edges,
  }
}

export async function saveWorkflow(projectId: number, nodes: WorkflowNode[], edges: WorkflowEdge[]): Promise<Workflow> {
  const db = await getDb()
  const existing = await db.get('SELECT id FROM project_workflows WHERE project_id = ?', [projectId])
  if (existing) {
    await db.run(
      'UPDATE project_workflows SET nodes = ?, edges = ?, updated_at = CURRENT_TIMESTAMP WHERE project_id = ?',
      [JSON.stringify(nodes), JSON.stringify(edges), projectId]
    )
  } else {
    await db.run(
      'INSERT INTO project_workflows (project_id, nodes, edges) VALUES (?, ?, ?)',
      [projectId, JSON.stringify(nodes), JSON.stringify(edges)]
    )
  }
  return getWorkflow(projectId) as Promise<Workflow>
}

// 根据工作流获取下一个要执行的Agent
export async function getNextAgents(projectId: number, currentAgentId: string): Promise<string[]> {
  const workflow = await getWorkflow(projectId)
  if (!workflow) return []

  const currentNode = workflow.nodes.find(n => n.data.agentId === currentAgentId)
  if (!currentNode) return []

  const outgoingEdges = workflow.edges.filter(e => e.source === currentNode.id)
  const nextAgentIds: string[] = []

  for (const edge of outgoingEdges) {
    const targetNode = workflow.nodes.find(n => n.id === edge.target)
    if (targetNode?.data.agentId) {
      nextAgentIds.push(targetNode.data.agentId)
    } else if (targetNode?.type === 'condition') {
      // 条件节点：检查条件，决定走哪条路
      const conditionEdges = workflow.edges.filter(e => e.source === targetNode.id)
      for (const ce of conditionEdges) {
        const condTarget = workflow.nodes.find(n => n.id === ce.target)
        if (condTarget?.data.agentId) {
          nextAgentIds.push(condTarget.data.agentId)
        }
      }
    }
  }

  return [...new Set(nextAgentIds)]
}

// 生成工作流的文本描述（用于注入Agent提示词）
export async function getWorkflowDescription(projectId: number): Promise<string> {
  const workflow = await getWorkflow(projectId)
  if (!workflow || workflow.nodes.length === 0) return ''

  let desc = '\n\n## 项目工作流\n\n'
  desc += '以下是当前项目的工作流转顺序，请按照此顺序工作：\n\n'

  // 找到起始节点
  const startNode = workflow.nodes.find(n => n.type === 'start')
  const agentNodes = workflow.nodes.filter(n => n.type === 'agent')

  if (startNode) {
    desc += '**起始** → '
    const firstEdges = workflow.edges.filter(e => e.source === startNode.id)
    const firstAgents = firstEdges.map(e => {
      const n = workflow.nodes.find(n => n.id === e.target)
      return n?.data.agentName || n?.data.label
    }).filter(Boolean)
    desc += firstAgents.join(' / ') + '\n\n'
  }

  for (const node of agentNodes) {
    const outgoing = workflow.edges.filter(e => e.source === node.id)
    if (outgoing.length > 0) {
      const targets = outgoing.map(e => {
        const n = workflow.nodes.find(n => n.id === e.target)
        if (n?.type === 'condition') {
          const condEdges = workflow.edges.filter(ce => ce.source === n.id)
          const condTargets = condEdges.map(ce => {
            const cn = workflow.nodes.find(n => n.id === ce.target)
            return `${ce.label || ce.sourceHandle || '条件'} → ${cn?.data.agentName || cn?.data.label}`
          })
          return `[条件判断: ${condTargets.join(', ')}]`
        }
        return n?.data.agentName || n?.data.label
      }).filter(Boolean)
      desc += `**${node.data.agentName || node.data.label}** 完成后 → ${targets.join(' / ')}\n`
    } else {
      desc += `**${node.data.agentName || node.data.label}** （终点节点）\n`
    }
  }

  desc += '\n**重要**：完成你的工作后，请 @ 下一个节点的Agent，将工作产物传递给对方继续工作。\n'

  return desc
}
