import { Router, Request, Response } from 'express'
import * as workflowEditorService from '../services/workflowEditorService.js'

const router = Router({ mergeParams: true })

// 获取项目工作流
router.get('/', async (req: Request, res: Response) => {
  try {
    const projectId = Number(req.params.projectId)
    const workflow = await workflowEditorService.getWorkflow(projectId)
    res.json({ success: true, data: workflow })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

// 保存项目工作流
router.post('/', async (req: Request, res: Response) => {
  try {
    const projectId = Number(req.params.projectId)
    const { nodes, edges } = req.body
    const workflow = await workflowEditorService.saveWorkflow(projectId, nodes || [], edges || [])
    res.json({ success: true, data: workflow })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

// 获取下一个Agent
router.get('/next/:agentId', async (req: Request, res: Response) => {
  try {
    const projectId = Number(req.params.projectId)
    const nextAgents = await workflowEditorService.getNextAgents(projectId, req.params.agentId)
    res.json({ success: true, data: nextAgents })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

// 获取工作流描述（用于注入提示词）
router.get('/description', async (req: Request, res: Response) => {
  try {
    const projectId = Number(req.params.projectId)
    const desc = await workflowEditorService.getWorkflowDescription(projectId)
    res.json({ success: true, data: desc })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

export default router
