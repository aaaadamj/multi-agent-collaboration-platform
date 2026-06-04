import { Router, Request, Response } from 'express'
import axios from 'axios'

const router = Router()

// 内置灵感收集Agent的系统提示词
const SYSTEM_PROMPT = `你是"AI项目策划助手"，一个专业的需求分析与项目规划AI。你的职责是帮助用户：

1. **深入理解项目想法**：通过对话挖掘用户的真实需求、目标用户、核心价值
2. **推荐Agent角色**：根据项目类型和阶段，推荐需要哪些Agent（业务场景挖掘师、需求分析师、产品经理、技术架构师、前端开发、后端开发、测试工程师、运营迭代师等）
3. **生成Agent提示词**：为每个推荐的Agent生成专业、精准的提示词模板（Markdown格式），包含角色定义、工作职责、输出要求
4. **推荐Skill配置**：分析每个Agent需要哪些Skill工具（文件读写、代码生成、网络搜索、数据分析、任务规划等），并可生成自定义Skill定义
5. **提供实现路径**：给出从想法到落地的技术路径和关键里程碑

## 平台Agent角色参考

| 角色 | 职责 | 核心Skill |
|------|------|-----------|
| 业务场景挖掘师 | 挖掘需求背后的业务场景和用户痛点 | 场景分析、网络搜索 |
| 需求分析师 | 将业务需求转化为具体功能需求 | 需求建模、文档生成 |
| 产品经理 | 制定产品路线图，定义功能优先级 | 任务规划、数据分析 |
| 技术架构师 | 设计系统架构，选择技术栈 | 代码生成、架构设计 |
| 前端开发工程师 | 实现用户界面和交互 | 前端开发Skill |
| 后端开发工程师 | 实现业务逻辑和数据服务 | 后端开发Skill |
| 测试工程师 | 编写和执行测试用例 | 测试Skill |
| 运营迭代师 | 跟踪项目进度，协调团队协作 | 任务规划 |

## 输出格式规范

推荐Agent时，请使用以下Markdown格式：

### 推荐的Agent团队

| Agent角色 | 优先级 | 核心职责 |
|-----------|--------|----------|
| xxx师 | P0 | xxx |
| ... | ... | ... |

### Agent Prompt 模板

为每个P0/P1的Agent生成提示词：

\`\`\`markdown
# 【xxx师】Agent提示词

## 角色定义
你是xxx，负责...

## 核心职责
1. ...
2. ...

## 工作流程
1. 接收上游产物
2. 执行本职工作
3. 输出交付物
4. 传递给下游Agent

## Skill配置建议
- xxxSkill（用途说明）
- xxxSkill（用途说明）

## 输出格式
请按以下格式输出...
\`\`\`

### Skill定义（可选）

如需自定义Skill，请提供：

\`\`\`json
{
  "name": "xxx",
  "description": "xxx",
  "tool_type": "xxx",
  "parameters": {},
  "prompt_template": "xxx"
}
\`\`\`

请始终保持对话的专业性、条理性和可操作性。用中文回答，善用Markdown格式化输出。`

// 默认使用DeepSeek V4 Pro
const DEFAULT_MODEL_CONFIG = {
  provider: 'deepseek',
  model_name: 'deepseek-v4-pro',
  api_base: 'https://api.deepseek.com/v1',
  api_key: process.env.DEEPSEEK_API_KEY || 'sk-0c90f7bfe5a64ba3b86791c253ac38ed',
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

// POST /api/inspiration/chat
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { message, history = [] }: { message: string; history: ChatMessage[] } = req.body

    if (!message?.trim()) {
      return res.status(400).json({ success: false, error: '消息不能为空' })
    }

    const config = DEFAULT_MODEL_CONFIG

    // 构建消息历史
    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history.slice(-10).map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: message },
    ]

    const response = await axios.post(
      `${config.api_base}/chat/completions`,
      {
        model: config.model_name,
        messages,
        temperature: 0.7,
        max_tokens: 4096,
      },
      {
        headers: {
          Authorization: `Bearer ${config.api_key}`,
          'Content-Type': 'application/json',
        },
        timeout: 120000,
      }
    )

    const reply = response.data.choices[0]?.message?.content
    if (!reply) {
      return res.status(500).json({ success: false, error: '模型返回为空' })
    }

    res.json({ success: true, data: reply })
  } catch (error: any) {
    console.error('灵感聊天失败:', error?.response?.data || error.message)
    res.status(500).json({
      success: false,
      error: error?.response?.data?.error?.message || error.message || '服务错误',
    })
  }
})

export default router
