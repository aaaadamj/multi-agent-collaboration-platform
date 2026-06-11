import { Router, Request, Response } from 'express'
import * as skillService from '../services/skillService.js'
import { ok, created, notFound, badRequest, serverError } from '../utils/apiResponse.js'

const router = Router()

// 获取所有可用Skills
router.get('/', async (_req: Request, res: Response) => {
  try {
    const skills = await skillService.getSkills()
    res.json(ok(skills))
  } catch (error) {
    res.status(500).json(serverError((error as Error).message))
  }
})

// 创建自定义Skill
router.post('/', async (req: Request, res: Response) => {
  try {
    const skill = await skillService.createSkill(req.body)
    res.json(ok(skill))
  } catch (error) {
    res.status(500).json(serverError((error as Error).message))
  }
})

// 获取Agent的Skills
router.get('/agents/:agentId', async (req: Request, res: Response) => {
  try {
    const skills = await skillService.getAgentSkills(req.params.agentId)
    res.json(ok(skills))
  } catch (error) {
    res.status(500).json(serverError((error as Error).message))
  }
})

// 为Agent添加Skill
router.post('/agents/:agentId/skills/:skillId', async (req: Request, res: Response) => {
  try {
    const result = await skillService.addAgentSkill(req.params.agentId, req.params.skillId, req.body.config)
    res.json(ok(result))
  } catch (error) {
    res.status(500).json(serverError((error as Error).message))
  }
})

// 移除Agent的Skill
router.delete('/agents/:agentId/skills/:skillId', async (req: Request, res: Response) => {
  try {
    await skillService.removeAgentSkill(req.params.agentId, req.params.skillId)
    res.json(ok(null))
  } catch (error) {
    res.status(500).json(serverError((error as Error).message))
  }
})

// 切换Skill启用状态
router.put('/agents/:agentId/skills/:skillId/toggle', async (req: Request, res: Response) => {
  try {
    const { enabled } = req.body
    await skillService.toggleAgentSkill(req.params.agentId, req.params.skillId, !!enabled)
    res.json(ok(null))
  } catch (error) {
    res.status(500).json(serverError((error as Error).message))
  }
})

// 更新Agent的Skill配置
router.put('/agents/:agentId/skills/:skillId/config', async (req: Request, res: Response) => {
  try {
    const { config } = req.body
    const result = await skillService.updateAgentSkill(req.params.agentId, req.params.skillId, config)
    res.json(ok(result))
  } catch (error) {
    res.status(500).json(serverError((error as Error).message))
  }
})

// 获取Agent的工具描述（用于提示词）
router.get('/agents/:agentId/tools-description', async (req: Request, res: Response) => {
  try {
    const desc = await skillService.getAgentToolsDescription(req.params.agentId)
    res.json(ok(desc))
  } catch (error) {
    res.status(500).json(serverError((error as Error).message))
  }
})

// 执行工具调用
router.post('/execute', async (req: Request, res: Response) => {
  try {
    const { toolId, params, projectId } = req.body
    const result = await skillService.executeToolCall(toolId, params, projectId)
    res.json(ok(result))
  } catch (error) {
    res.status(500).json(serverError((error as Error).message))
  }
})

export default router
