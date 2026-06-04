import { getDb } from '../db/index.js'
import { createWorkflowNodes } from './workflowService.js'
import { setProjectFolder } from './fileService.js'

export async function createProject(name: string, direction: string, type: string, agentIds?: string[], folderName?: string) {
  const db = await getDb()
  const result = await db.run(
    'INSERT INTO projects (name, direction, type) VALUES (?, ?, ?)',
    [name, direction, type]
  )
  const projectId = result.lastID
  if (projectId) {
    // 如果指定了Agent，只创建这些Agent的工作流节点；否则使用全部Agent
    const agentsToUse = agentIds && agentIds.length > 0
      ? agentIds
      : ['scene_miner', 'requirement_analyst', 'product_manager', 'tech_architect', 'frontend_dev', 'backend_dev', 'test_engineer', 'ops_iter']
    
    // 将选中的Agent关联到项目
    for (const agentId of agentsToUse) {
      await db.run(
        'INSERT OR IGNORE INTO project_agents (project_id, agent_id) VALUES (?, ?)',
        [projectId, agentId]
      )
    }

    // 创建工作流节点（仅包含选中的Agent）
    await createWorkflowNodesForAgents(projectId, agentsToUse)

    // 如果提供了文件夹名称，设置项目工作文件夹
    if (folderName) {
      await setProjectFolder(projectId!, folderName)
    }
  }
  return getProjectById(projectId!)
}

async function createWorkflowNodesForAgents(projectId: number, agentIds: string[]) {
  const db = await getDb()
  const WORKFLOW_SEQUENCE = [
    'scene_miner', 'requirement_analyst', 'product_manager',
    'tech_architect', 'frontend_dev', 'backend_dev', 'test_engineer', 'ops_iter'
  ]
  
  for (let i = 0; i < agentIds.length; i++) {
    const agentId = agentIds[i]
    const sequence = WORKFLOW_SEQUENCE.indexOf(agentId) + 1 || (i + 1)
    const isFirst = i === 0
    await db.run(
      'INSERT INTO workflow_nodes (project_id, agent_id, name, status, sequence) VALUES (?, ?, ?, ?, ?)',
      [projectId, agentId, `节点${i + 1}`, isFirst ? 'in_progress' : 'pending', sequence]
    )
  }
}

export async function getProjects() {
  const db = await getDb()
  return db.all('SELECT * FROM projects ORDER BY created_at DESC')
}

export async function getProjectById(id: number) {
  const db = await getDb()
  return db.get('SELECT * FROM projects WHERE id = ?', [id])
}

export async function getProjectWithNodes(id: number) {
  const db = await getDb()
  const project = await db.get('SELECT * FROM projects WHERE id = ?', [id])
  if (!project) return null
  const nodes = await db.all('SELECT * FROM workflow_nodes WHERE project_id = ? ORDER BY sequence', [id])
  const deliverables = await db.all('SELECT * FROM deliverables WHERE project_id = ? ORDER BY created_at DESC', [id])
  const projectAgents = await db.all(
    'SELECT pa.*, a.name as agent_name, a.role, a.description, a.avatar FROM project_agents pa JOIN agents a ON pa.agent_id = a.id WHERE pa.project_id = ? ORDER BY pa.joined_at',
    [id]
  )
  return { ...project, nodes, deliverables, projectAgents }
}

export async function getProjectAgents(projectId: number) {
  const db = await getDb()
  return db.all(
    'SELECT pa.*, a.name as agent_name, a.role, a.description, a.avatar, a.prompt_template, a.status as agent_status FROM project_agents pa JOIN agents a ON pa.agent_id = a.id WHERE pa.project_id = ? ORDER BY pa.joined_at',
    [projectId]
  )
}

export async function addAgentToProject(projectId: number, agentId: string) {
  const db = await getDb()
  try {
    await db.run(
      'INSERT INTO project_agents (project_id, agent_id) VALUES (?, ?)',
      [projectId, agentId]
    )
    // 同时为该Agent创建工作流节点
    const existingNode = await db.get(
      'SELECT id FROM workflow_nodes WHERE project_id = ? AND agent_id = ?',
      [projectId, agentId]
    )
    if (!existingNode) {
      const maxSeq = await db.get(
        'SELECT MAX(sequence) as max_seq FROM workflow_nodes WHERE project_id = ?',
        [projectId]
      )
      await db.run(
        'INSERT INTO workflow_nodes (project_id, agent_id, name, status, sequence) VALUES (?, ?, ?, ?, ?)',
        [projectId, agentId, '新增节点', 'pending', (maxSeq?.max_seq || 0) + 1]
      )
    }
    return { success: true }
  } catch (e: any) {
    if (e.message?.includes('UNIQUE')) {
      return { success: true, message: 'Agent已在项目中' }
    }
    throw e
  }
}

export async function removeAgentFromProject(projectId: number, agentId: string) {
  const db = await getDb()
  await db.run('DELETE FROM project_agents WHERE project_id = ? AND agent_id = ?', [projectId, agentId])
  return { success: true }
}

export async function updateProjectStatus(id: number, status: string) {
  const db = await getDb()
  await db.run('UPDATE projects SET status = ? WHERE id = ?', [status, id])
  return getProjectById(id)
}
