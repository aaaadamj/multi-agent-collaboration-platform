import { getDb } from '../db/index.js'

export const WORKFLOW_DEFINITION = [
  { id: 'scene_miner', name: '业务场景挖掘', agentId: 'scene_miner', sequence: 1, needApproval: true },
  { id: 'requirement_analyst', name: '需求分析', agentId: 'requirement_analyst', sequence: 2, needApproval: false },
  { id: 'product_manager', name: '产品设计', agentId: 'product_manager', sequence: 3, needApproval: true },
  { id: 'tech_architect', name: '技术架构', agentId: 'tech_architect', sequence: 4, needApproval: true },
  { id: 'frontend_dev', name: '前端开发', agentId: 'frontend_dev', sequence: 5, needApproval: false, parallel: true },
  { id: 'backend_dev', name: '后端开发', agentId: 'backend_dev', sequence: 6, needApproval: false, parallel: true },
  { id: 'test_engineer', name: '测试验证', agentId: 'test_engineer', sequence: 7, needApproval: true },
  { id: 'ops_iter', name: '运营迭代', agentId: 'ops_iter', sequence: 8, needApproval: false }
]

export async function createWorkflowNodes(projectId: number) {
  const db = await getDb()
  for (const node of WORKFLOW_DEFINITION) {
    await db.run(
      'INSERT INTO workflow_nodes (project_id, agent_id, name, status, sequence) VALUES (?, ?, ?, ?, ?)',
      [projectId, node.agentId, node.name, node.sequence === 1 ? 'in_progress' : 'pending', node.sequence]
    )
  }
}

export async function getProjectNodes(projectId: number) {
  const db = await getDb()
  return db.all('SELECT * FROM workflow_nodes WHERE project_id = ? ORDER BY sequence', [projectId])
}

export async function updateNodeStatus(projectId: number, nodeId: string, status: string) {
  const db = await getDb()
  const now = new Date().toISOString()
  if (status === 'in_progress') {
    await db.run(
      'UPDATE workflow_nodes SET status = ?, started_at = ? WHERE project_id = ? AND agent_id = ?',
      [status, now, projectId, nodeId]
    )
  } else if (status === 'completed' || status === 'rejected') {
    await db.run(
      'UPDATE workflow_nodes SET status = ?, completed_at = ? WHERE project_id = ? AND agent_id = ?',
      [status, now, projectId, nodeId]
    )
  } else {
    await db.run(
      'UPDATE workflow_nodes SET status = ? WHERE project_id = ? AND agent_id = ?',
      [status, projectId, nodeId]
    )
  }
  return db.get('SELECT * FROM workflow_nodes WHERE project_id = ? AND agent_id = ?', [projectId, nodeId])
}

export async function approveNode(projectId: number, nodeId: string, approved: boolean, comment?: string) {
  const db = await getDb()
  const node = await db.get('SELECT * FROM workflow_nodes WHERE project_id = ? AND agent_id = ?', [projectId, nodeId])
  if (!node) throw new Error('Node not found')

  if (approved) {
    await db.run(
      'UPDATE workflow_nodes SET status = ?, completed_at = ?, approved_by = ?, approval_comment = ? WHERE project_id = ? AND agent_id = ?',
      ['completed', new Date().toISOString(), 'commander', comment || '', projectId, nodeId]
    )

    const currentSeq = node.sequence
    const nextNodeDef = WORKFLOW_DEFINITION.find(n => n.sequence === currentSeq + 1)
    
    if (nextNodeDef) {
      await db.run(
        'UPDATE workflow_nodes SET status = ?, started_at = ? WHERE project_id = ? AND agent_id = ?',
        ['in_progress', new Date().toISOString(), projectId, nextNodeDef.agentId]
      )
      
      const progress = Math.round((currentSeq / WORKFLOW_DEFINITION.length) * 100)
      await db.run('UPDATE projects SET current_node = ?, progress = ? WHERE id = ?', [nextNodeDef.agentId, progress, projectId])
      
      return { approved: true, nextNode: nextNodeDef }
    } else {
      await db.run('UPDATE projects SET status = ?, progress = 100, current_node = ? WHERE id = ?', ['completed', 'ops_iter', projectId])
      return { approved: true, projectCompleted: true }
    }
  } else {
    await db.run(
      'UPDATE workflow_nodes SET status = ?, approval_comment = ? WHERE project_id = ? AND agent_id = ?',
      ['rejected', comment || '', projectId, nodeId]
    )
    return { approved: false }
  }
}

export async function getCurrentNode(projectId: number) {
  const db = await getDb()
  return db.get(
    'SELECT * FROM workflow_nodes WHERE project_id = ? AND status IN ("in_progress", "review") ORDER BY sequence LIMIT 1',
    [projectId]
  )
}
