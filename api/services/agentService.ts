import { getDb } from '../db/index.js'
import { getAgentToolsDescription, parseToolCalls, executeToolCall } from './skillService.js'
import { getWorkflowDescription } from './workflowEditorService.js'

export async function getAgents() {
  const db = await getDb()
  const agents = await db.all('SELECT * FROM agents ORDER BY id')
  for (const agent of agents) {
    const models = await db.all('SELECT * FROM agent_models WHERE agent_id = ?', [agent.id])
    ;(agent as any).models = models
  }
  return agents
}

export async function getAgentById(id: string) {
  const db = await getDb()
  const agent = await db.get('SELECT * FROM agents WHERE id = ?', [id])
  if (agent) {
    const models = await db.all('SELECT * FROM agent_models WHERE agent_id = ?', [id])
    ;(agent as any).models = models
  }
  return agent
}

export async function createAgent(agent: {
  id: string
  name: string
  role: string
  description: string
  prompt_template: string
  avatar?: string
}) {
  const db = await getDb()
  await db.run(
    'INSERT INTO agents (id, name, role, description, prompt_template, avatar) VALUES (?, ?, ?, ?, ?, ?)',
    [agent.id, agent.name, agent.role, agent.description, agent.prompt_template, agent.avatar || '']
  )
  return getAgentById(agent.id)
}

export async function updateAgent(id: string, updates: {
  name?: string
  role?: string
  description?: string
  prompt_template?: string
  avatar?: string
  status?: string
}) {
  const db = await getDb()
  const fields: string[] = []
  const values: any[] = []
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      fields.push(`${key} = ?`)
      values.push(value)
    }
  }
  if (fields.length === 0) return getAgentById(id)
  values.push(id)
  await db.run(`UPDATE agents SET ${fields.join(', ')} WHERE id = ?`, values)
  return getAgentById(id)
}

export async function deleteAgent(id: string) {
  const db = await getDb()
  await db.run('DELETE FROM agents WHERE id = ?', [id])
  return { success: true }
}

export async function updateAgentPrompt(id: string, prompt: string) {
  const db = await getDb()
  await db.run('UPDATE agents SET prompt_template = ? WHERE id = ?', [prompt, id])
  return getAgentById(id)
}

export async function getChatMessages(projectId: number, agentId: string) {
  const db = await getDb()
  return db.all(
    'SELECT * FROM chat_messages WHERE project_id = ? AND agent_id = ? ORDER BY created_at',
    [projectId, agentId]
  )
}

export async function addChatMessage(projectId: number, agentId: string | null, role: string, content: string) {
  const db = await getDb()
  const result = await db.run(
    'INSERT INTO chat_messages (project_id, agent_id, role, content) VALUES (?, ?, ?, ?)',
    [projectId, agentId, role, content]
  )
  return db.get('SELECT * FROM chat_messages WHERE id = ?', [result.lastID])
}

export async function addAgentModel(agentId: string, model: {
  provider: string
  model_name: string
  api_base?: string
  api_key?: string
  is_active?: boolean
}) {
  const db = await getDb()
  if (model.is_active) {
    await db.run('UPDATE agent_models SET is_active = 0 WHERE agent_id = ?', [agentId])
  }
  const result = await db.run(
    'INSERT INTO agent_models (agent_id, provider, model_name, api_base, api_key, is_active) VALUES (?, ?, ?, ?, ?, ?)',
    [agentId, model.provider, model.model_name, model.api_base || '', model.api_key || '', model.is_active ? 1 : 0]
  )
  return db.get('SELECT * FROM agent_models WHERE id = ?', [result.lastID])
}

export async function getAgentModels(agentId: string) {
  const db = await getDb()
  return db.all('SELECT * FROM agent_models WHERE agent_id = ?', [agentId])
}

export async function setActiveModel(agentId: string, modelId: number) {
  const db = await getDb()
  await db.run('UPDATE agent_models SET is_active = 0 WHERE agent_id = ?', [agentId])
  await db.run('UPDATE agent_models SET is_active = 1 WHERE id = ? AND agent_id = ?', [modelId, agentId])
  return db.get('SELECT * FROM agent_models WHERE id = ?', [modelId])
}

export async function deleteAgentModel(modelId: number) {
  const db = await getDb()
  await db.run('DELETE FROM agent_models WHERE id = ?', [modelId])
  return { success: true }
}

export async function generateAgentReply(agentId: string, message: string, projectContext: any) {
  const agent = await getAgentById(agentId)
  if (!agent) throw new Error('Agent not found')

  const models = (agent as any).models || []
  const activeModel = models.find((m: any) => m.is_active === 1)

  // 获取Agent的工具描述并追加到prompt_template中
  const toolsDesc = await getAgentToolsDescription(agentId)
  const workflowDesc = projectContext?.id ? await getWorkflowDescription(projectContext.id) : ''
  const enhancedPrompt = agent.prompt_template + toolsDesc + workflowDesc

  if (activeModel && activeModel.api_base && activeModel.api_key) {
    try {
      const { callExternalLLM } = await import('../utils/llmCaller.js')
      let reply = await callExternalLLM(activeModel, enhancedPrompt, message, projectContext)

      // 检查是否有工具调用
      const { cleanContent, toolCalls } = parseToolCalls(reply)

      // 如果有工具调用，执行它们并将结果追加到回复中
      if (toolCalls.length > 0) {
        let executionResults = '\n\n--- 工具执行结果 ---\n'
        for (const tc of toolCalls) {
          const result = await executeToolCall(tc.toolId, tc.params, projectContext?.id)
          executionResults += `\n**[${tc.toolId}]** ${result.success ? '✅ 成功' : '❌ 失败'}\n${result.result || result.error}\n`
        }
        return cleanContent + executionResults
      }
      return reply
    } catch (error) {
      console.error('External LLM call failed, falling back to mock:', error)
    }
  }

  return generateMockReply(agentId, agent.name, message, projectContext)
}

function generateMockReply(agentId: string, agentName: string, message: string, projectContext: any) {
  const replies: Record<string, string> = {
    scene_miner: `我是${agentName}，已收到您的方向指引。\n\n我正在分析「${projectContext.direction || '当前项目'}」的市场机会...\n\n## 场景机会卡（初步）\n- **场景名称**：${projectContext.name || '待定义'}\n- **目标用户**：初步判断为年轻职场人群\n- **痛点描述**：现有解决方案效率低下\n- **机会描述**：通过AI自动化提升效率\n- **价值评估**：\n  - 用户价值：高\n  - 商业价值：中\n  - 实现成本：中\n  - 综合优先级：P1\n\n请问您希望我从哪个角度深入挖掘？`,

    requirement_analyst: `我是${agentName}，现在开始深度需求挖掘。\n\n您提出了「${projectContext.direction || '当前需求'}」，在正式拆解之前，我需要先完成6问法挖掘。\n\n### Q1：你到底要解决什么问题？\n不要接受表面需求，我们要挖到真正的痛点。\n\n请告诉我：为什么需要这个？现在这个问题是怎么解决的？为什么现在的解法不够好？`,

    product_manager: `我是${agentName}，基于需求规格书，我开始设计产品方案。\n\n## PRD（初步框架）\n### 1. 产品概述\n- 产品名称：${projectContext.name || '待命名'}\n- 核心价值：提升效率、降低门槛\n- 目标用户：职场人群\n\n### 2. 用户旅程\n用户进入 → 核心功能 → 获得结果 → 分享/留存\n\n### 3. MVP范围\n- 核心功能模块\n- 基础用户系统\n- 数据展示面板\n\n请确认这个方向是否符合您的预期？`,

    tech_architect: `我是${agentName}，现在开始技术方案设计。\n\n## 技术方案（初步）\n### 1. 技术选型\n| 层面 | 选择 | 理由 |\n|------|------|------|\n| 前端 | React + TypeScript | 生态成熟，类型安全 |\n| 后端 | Node.js + Express | 轻量高效 |\n| 数据库 | SQLite | 本地部署，零配置 |\n| 部署 | 本地/云服务器 | 灵活可控 |\n\n### 2. 系统架构\n前端 → API网关 → 业务服务 → 数据层\n\n### 3. 风险评估\n| 风险 | 影响 | 降级方案 |\n|------|------|---------|\n| 并发量小 | 低 | 单机部署足够 |\n| 数据安全 | 中 | 定期备份 |\n\n这个技术路线是否符合团队现状？`,

    frontend_dev: `我是${agentName}，开始前端开发工作。\n\n## 前端开发进展\n### 已完成\n- [x] 项目初始化（React + Vite + Tailwind）\n- [x] 路由配置\n- [x] 基础组件搭建\n\n### 进行中\n- [ ] 页面布局实现\n- [ ] 交互逻辑开发\n- [ ] API对接\n\n### 代码示例\n\`\`\`tsx\nexport default function Component() {\n  return <div>Hello World</div>\n}\n\`\`\`\n\n前端框架已搭建完成，正在按PRD实现各页面。`,

    backend_dev: `我是${agentName}，开始后端开发工作。\n\n## 后端开发进展\n### 已完成\n- [x] 数据库设计\n- [x] API路由搭建\n- [x] 基础CRUD接口\n\n### 进行中\n- [ ] 业务逻辑实现\n- [ ] 认证鉴权\n- [ ] 接口测试\n\n### API列表\n| 方法 | 路径 | 说明 |\n|------|------|------|\n| GET | /api/projects | 项目列表 |\n| POST | /api/projects | 创建项目 |\n| GET | /api/projects/:id | 项目详情 |\n\n后端服务已启动，API可按契约对接。`,

    test_engineer: `我是${agentName}，开始测试验证工作。\n\n## 测试报告（初版）\n### 1. 测试范围\n- 功能模块：全部核心功能\n- API接口：所有后端接口\n- 测试环境：本地开发环境\n\n### 2. 测试结果汇总\n| 类型 | 用例数 | 通过 | 失败 |\n|------|--------|------|------|\n| 功能测试 | 20 | 18 | 2 |\n| 接口测试 | 15 | 15 | 0 |\n| 边界测试 | 10 | 9 | 1 |\n\n### 3. Bug清单\n| 编号 | 模块 | 描述 | 严重程度 |\n|------|------|------|---------|\n| BUG-01 | 登录 | 密码错误无提示 | P1 |\n| BUG-02 | 列表 | 空数据无空态 | P2 |\n\n建议修复P1级Bug后上线。`,

    ops_iter: `我是${agentName}，全程监管项目进展。\n\n## 项目日报\n### 1. 今日进展\n- 项目「${projectContext.name || '当前项目'}」正常推进\n- 当前节点：${projectContext.current_node || '初始化'}\n- 整体进度：${projectContext.progress || 0}%\n\n### 2. 各节点状态\n| 节点 | 状态 | 交付物 |\n|------|------|--------|\n| 场景挖掘 | 已完成 | 场景机会卡 |\n| 需求分析 | 已完成 | 需求规格书 |\n| 产品设计 | 进行中 | PRD撰写中 |\n\n### 3. 阻塞与风险\n- 🔴 无严重阻塞\n- 🟡 进度正常\n\n### 4. 待审批项\n- 暂无\n\n明日计划：推进产品设计节点完成。`
  }

  return replies[agentId] || `我是${agentName}，已收到您的消息：「${message}」\n\n我正在基于当前项目上下文进行分析和处理...\n\n（当前使用模拟回复，您可以在Agent管理中配置真实的大模型API以获得更智能的回复）`
}
