import { Router, Request, Response } from 'express'
import * as projectService from '../services/projectService.js'
import * as workflowService from '../services/workflowService.js'
import * as agentService from '../services/agentService.js'
import * as deliverableService from '../services/deliverableService.js'

const router = Router()

router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, direction, type, agentIds, folderName } = req.body
    const project = await projectService.createProject(name, direction, type, agentIds, folderName)
    res.json({ success: true, data: project })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

router.get('/', async (_req: Request, res: Response) => {
  try {
    const projects = await projectService.getProjects()
    res.json({ success: true, data: projects })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const project = await projectService.getProjectWithNodes(Number(req.params.id))
    if (!project) {
      res.status(404).json({ success: false, error: 'Project not found' })
      return
    }
    res.json({ success: true, data: project })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

router.get('/:id/agents', async (req: Request, res: Response) => {
  try {
    const agents = await projectService.getProjectAgents(Number(req.params.id))
    res.json({ success: true, data: agents })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

router.post('/:id/agents/:agentId', async (req: Request, res: Response) => {
  try {
    const result = await projectService.addAgentToProject(Number(req.params.id), req.params.agentId)
    res.json({ success: true, data: result })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

router.delete('/:id/agents/:agentId', async (req: Request, res: Response) => {
  try {
    await projectService.removeAgentFromProject(Number(req.params.id), req.params.agentId)
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

router.get('/:id/nodes', async (req: Request, res: Response) => {
  try {
    const nodes = await workflowService.getProjectNodes(Number(req.params.id))
    res.json({ success: true, data: nodes })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

router.post('/:id/nodes/:nodeId/approve', async (req: Request, res: Response) => {
  try {
    console.log('[DEBUG-APPROVE] HIT THE REAL APPROVE ROUTE! id=', req.params.id, 'nodeId=', req.params.nodeId)
    const { approved, comment } = req.body
    const result = await workflowService.approveNode(Number(req.params.id), req.params.nodeId, approved, comment)
    res.json({ success: true, data: result })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

router.get('/:id/agents/:agentId/chat', async (req: Request, res: Response) => {
  try {
    const messages = await agentService.getChatMessages(Number(req.params.id), req.params.agentId)
    res.json({ success: true, data: messages })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

router.post('/:id/agents/:agentId/chat', async (req: Request, res: Response) => {
  try {
    const { message } = req.body
    const projectId = Number(req.params.id)
    const agentId = req.params.agentId

    // 保存用户消息
    await agentService.addChatMessage(projectId, agentId, 'user', message)

    // 获取项目上下文
    const project = await projectService.getProjectById(projectId)

    // 生成Agent回复（优先使用配置的真实模型，否则使用模拟回复）
    const reply = await agentService.generateAgentReply(agentId, message, project || {})

    // 保存Agent回复
    const agentMessage = await agentService.addChatMessage(projectId, agentId, 'agent', reply)

    // 检查是否需要更新节点状态
    const node = await workflowService.getCurrentNode(projectId)
    if (node && node.agent_id === agentId && node.status === 'in_progress') {
      await workflowService.updateNodeStatus(projectId, agentId, 'review')
      if (node.id) {
        await deliverableService.createDeliverable(projectId, node.id, `${agentId}交付物`, reply, 'markdown')
      }
    }

    res.json({ success: true, data: { message: agentMessage } })
  } catch (error) {
    console.error('Chat error:', error)
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

router.get('/:id/deliverables', async (req: Request, res: Response) => {
  try {
    const deliverables = await deliverableService.getProjectDeliverables(Number(req.params.id))
    res.json({ success: true, data: deliverables })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

// ====== 群聊相关 API ======
// 获取项目的群聊历史（所有Agent的消息都在这里）
router.get('/:id/group-chat', async (req: Request, res: Response) => {
  try {
    const db = await (await import('../db/index.js')).getDb()
    const messages = await db.all(`
      SELECT cm.*, a.name as agent_name 
      FROM chat_messages cm 
      LEFT JOIN agents a ON cm.agent_id = a.id 
      WHERE cm.project_id = ? AND (cm.chat_type IS NULL OR cm.chat_type = 'group')
      ORDER BY cm.created_at ASC
    `, [Number(req.params.id)])
    res.json({ success: true, data: messages })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

// 发送群聊消息（支持@功能）
router.post('/:id/group-chat', async (req: Request, res: Response) => {
  try {
    const projectId = Number(req.params.id)
    const { message, sendAsAgentId } = req.body // sendAsAgentId: 如果是Agent@其他Agent，填入发送者AgentId

    // 保存用户/Agent发送的消息
    const db = await (await import('../db/index.js')).getDb()
    const senderId = sendAsAgentId || null
    const senderRole = sendAsAgentId ? 'agent' : 'user'

    const result = await db.run(
      'INSERT INTO chat_messages (project_id, agent_id, role, content, chat_type) VALUES (?, ?, ?, ?, ?)',
      [projectId, senderId, senderRole, message, 'group']
    )
    const sentMessage = await db.get('SELECT cm.*, a.name as agent_name FROM chat_messages cm LEFT JOIN agents a ON cm.agent_id = a.id WHERE cm.id = ?', [result.lastID])

    // 解析消息中的@，提取需要响应的Agent
    const mentionedAgents: string[] = []
    // 匹配 @agent_name 或 @agent_id
    const projectAgents = await projectService.getProjectAgents(projectId)
    const atPattern = /@([^\s]+)/g
    let match

    while ((match = atPattern.exec(message)) !== null) {
      const mention = match[1]
      // 先检查是否是Agent ID
      if (projectAgents.some((a: any) => a.agent_id === mention)) {
        if (!mentionedAgents.includes(mention)) mentionedAgents.push(mention)
      } else {
        // 检查是否是Agent名称
        const foundAgent = projectAgents.find((a: any) => a.agent_name === mention)
        if (foundAgent && !mentionedAgents.includes(foundAgent.agent_id)) {
          mentionedAgents.push(foundAgent.agent_id)
        }
      }
    }

    // 如果没有明确@任何人：
    // - 如果是用户发送，@所有Agent？或者@当前活动Agent？
    // - 这里我们的策略：如果没有@，只有发送者是用户时，@所有项目Agent
    const agentsToNotify = mentionedAgents.length > 0 
      ? mentionedAgents 
      : (!sendAsAgentId ? projectAgents.map((a: any) => a.agent_id) : [])

    const project = await projectService.getProjectById(projectId)
    const replies: any[] = []

    // 让被@的Agent依次回复
    for (const agentId of agentsToNotify) {
      try {
        // 生成Agent回复
        const reply = await agentService.generateAgentReply(agentId, message, project || {})
        
        // 保存回复到群聊
        const replyResult = await db.run(
          'INSERT INTO chat_messages (project_id, agent_id, role, content, chat_type) VALUES (?, ?, ?, ?, ?)',
          [projectId, agentId, 'agent', reply, 'group']
        )
        const replyMessage = await db.get('SELECT cm.*, a.name as agent_name FROM chat_messages cm LEFT JOIN agents a ON cm.agent_id = a.id WHERE cm.id = ?', [replyResult.lastID])
        
        replies.push(replyMessage)

        // 检查是否需要更新节点状态（如果是单聊相关的节点）
        const node = await workflowService.getCurrentNode(projectId)
        if (node && node.agent_id === agentId && node.status === 'in_progress') {
          await workflowService.updateNodeStatus(projectId, agentId, 'review')
          if (node.id) {
            await deliverableService.createDeliverable(projectId, node.id, `${agentId}交付物`, reply, 'markdown')
          }
        }
      } catch (error) {
        console.error(`Agent ${agentId} 回复失败:`, error)
      }
    }

    res.json({ success: true, data: { sentMessage, replies } })
  } catch (error) {
    console.error('Group chat error:', error)
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

export default router
