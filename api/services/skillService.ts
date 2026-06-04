import { getDb } from '../db/index.js'
import * as fileService from './fileService.js'

export interface Skill {
  id: string
  name: string
  description: string
  category: string
  icon: string
  parameters: any[]
  is_builtin: number
  handler_type: string
  created_at: string
}

export interface AgentSkill {
  id: number
  agent_id: string
  skill_id: string
  enabled: number
  config: string
  created_at: string
  skill?: Skill
}

// 获取所有Skills
export async function getSkills(): Promise<Skill[]> {
  const db = await getDb()
  return db.all('SELECT * FROM skills ORDER BY category, name')
}

// 获取单个Skill
export async function getSkillById(id: string): Promise<Skill | null> {
  const db = await getDb()
  return db.get('SELECT * FROM skills WHERE id = ?', [id])
}

// 获取Agent的所有Skills
export async function getAgentSkills(agentId: string): Promise<(AgentSkill & { skill: Skill })[]> {
  const db = await getDb()
  const rows = await db.all(`
    SELECT as_.*, s.name as skill_name, s.description as skill_description, s.category, s.icon,
           s.parameters, s.handler_type, s.is_builtin
    FROM agent_skills as_
    JOIN skills s ON as_.skill_id = s.id
    WHERE as_.agent_id = ?
    ORDER BY s.category, s.name
  `, [agentId])

  return rows.map((row: any) => ({
    id: row.id,
    agent_id: row.agent_id,
    skill_id: row.skill_id,
    enabled: row.enabled,
    config: typeof row.config === 'string' ? JSON.parse(row.config || '{}') : row.config,
    created_at: row.created_at,
    skill: {
      id: row.skill_id,
      name: row.skill_name,
      description: row.skill_description,
      category: row.category,
      icon: row.icon,
      parameters: typeof row.parameters === 'string' ? JSON.parse(row.parameters || '[]') : row.parameters,
      is_builtin: row.is_builtin,
      handler_type: row.handler_type,
      created_at: '',
    }
  }))
}

// 为Agent添加Skill
export async function addAgentSkill(agentId: string, skillId: string, config?: Record<string, any>): Promise<AgentSkill> {
  const db = await getDb()
  const result = await db.run(
    'INSERT OR IGNORE INTO agent_skills (agent_id, skill_id, config) VALUES (?, ?, ?)',
    [agentId, skillId, JSON.stringify(config || {})]
  )
  const row = await db.get('SELECT * FROM agent_skills WHERE id = ?', [result.lastID])
  const skill = await getSkillById(skillId)
  return { ...row, skill: skill! }
}

// 移除Agent的Skill
export async function removeAgentSkill(agentId: string, skillId: string): Promise<void> {
  const db = await getDb()
  await db.run('DELETE FROM agent_skills WHERE agent_id = ? AND skill_id = ?', [agentId, skillId])
}

// 切换Skill启用状态
export async function toggleAgentSkill(agentId: string, skillId: string, enabled: boolean): Promise<void> {
  const db = await getDb()
  await db.run('UPDATE agent_skills SET enabled = ? WHERE agent_id = ? AND skill_id = ?', [enabled ? 1 : 0, agentId, skillId])
}

// 更新Agent的Skill配置
export async function updateAgentSkill(agentId: string, skillId: string, config: Record<string, any>): Promise<AgentSkill & { skill: Skill }> {
  const db = await getDb()
  await db.run('UPDATE agent_skills SET config = ? WHERE agent_id = ? AND skill_id = ?', [JSON.stringify(config), agentId, skillId])
  const rows = await getAgentSkills(agentId)
  const updated = rows.find(r => r.skill_id === skillId)
  if (!updated) throw new Error('Agent skill not found')
  return updated
}

// 创建自定义Skill
export async function createSkill(skill: {
  id: string
  name: string
  description: string
  category: string
  icon?: string
  parameters?: any[]
  handler_type: string
}): Promise<Skill> {
  const db = await getDb()
  await db.run(
    'INSERT INTO skills (id, name, description, category, icon, parameters, is_builtin, handler_type) VALUES (?, ?, ?, ?, ?, ?, 0, ?)',
    [skill.id, skill.name, skill.description, skill.category, skill.icon || 'wrench', JSON.stringify(skill.parameters || []), skill.handler_type]
  )
  const result = await getSkillById(skill.id)
  if (!result) throw new Error('Failed to create skill')
  return result
}

// 获取Agent可用的工具描述（用于注入到LLM提示词）
export async function getAgentToolsDescription(agentId: string): Promise<string> {
  const skills = await getAgentSkills(agentId)
  const activeSkills = skills.filter(s => s.enabled && s.skill)

  if (activeSkills.length === 0) return ''

  let desc = '\n\n## 你可以使用以下工具\n\n'
  for (const s of activeSkills) {
    const sk = s.skill!
    const params = sk.parameters.map((p: any) => `- **${p.name}** (${p.type}${p.required ? ', 必填' : ', 可选'}): ${p.desc}`).join('\n')
    desc += `### ${sk.name}\n${sk.description}\n**参数：**\n${params}\n\n`
  }
  desc += '**使用方式：** 当你需要使用某个工具时，在回复中用以下格式调用：\n'
  desc += '`[TOOL_CALL:工具ID]{"参数名":"值",...}[/TOOL_CALL]`\n\n'
  return desc
}

// 解析并执行工具调用
export interface ToolExecutionResult {
  success: boolean
  toolId: string
  result?: string
  error?: string
}

export async function executeToolCall(
  toolId: string,
  params: Record<string, any>,
  projectId?: number
): Promise<ToolExecutionResult> {
  try {
    switch (toolId) {
      case 'file_write': {
        if (!projectId) return { success: false, toolId, error: '需要指定项目ID' }
        if (!params.path || !params.content) return { success: false, toolId, error: '缺少必要参数: path, content' }
        const fileInfo = await fileService.writeFileContent(projectId, params.path, params.content, { createDirs: true })
        return { success: true, toolId, result: `✅ 文件已写入：${fileInfo.relativePath} (${(fileInfo.size || 0)} 字节)` }
      }

      case 'file_read': {
        if (!projectId) return { success: false, toolId, error: '需要指定项目ID' }
        if (!params.path) return { success: false, toolId, error: '缺少必要参数: path' }
        const fileData = await fileService.readFileContent(projectId, params.path)
        return { success: true, toolId, result: fileData.content }
      }

      case 'code_generate': {
        const lang = params.language || 'typescript'
        const desc = params.description || ''
        return { success: true, toolId, result: `\`\`\`${lang}\n// 自动生成代码 - 功能：${desc}\n// 注意：这是AI生成的代码框架，请根据实际需求调整\n\n${generateCodeSkeleton(lang, desc)}\n\`\`\`` }
      }

      case 'doc_create': {
        const title = params.title || '未命名文档'
        const sections = Array.isArray(params.sections) ? params.sections : []
        let md = `# ${title}\n\n`
        for (const sec of sections) {
          md += `## ${sec.title || '章节'}\n\n${sec.content || ''}\n\n---\n\n`
        }
        return { success: true, toolId, result: md }
      }

      case 'data_analyze': {
        const data = params.data || ''
        const focus = params.focus || '综合分析'
        return { success: true, toolId, result: `## 数据分析报告\n\n### 分析重点：${focus}\n\n### 原始数据\n\`\`\`\n${data.slice(0, 2000)}\n\`\`\`\n\n### 分析结论\n基于以上数据，建议从以下维度进行深入分析...\n` }
      }

      case 'web_search': {
        const query = params.query || ''
        return { success: true, toolId, result: `## 搜索结果：${query}\n\n> ⚠️ 当前为模拟模式，配置真实API后可获取实时搜索结果\n\n### 相关信息摘要\n- 搜索关键词：${query}\n- 建议结合项目上下文进行分析\n` }
      }

      case 'task_plan': {
        const task = params.task || ''
        const constraints = params.constraints || ''
        return { success: true, toolId, result: `## 任务执行计划\n\n### 目标任务\n${task}\n\n${constraints ? `### 约束条件\n${constraints}\n\n` : ''}### 执行步骤\n1. **需求确认** - 明确任务范围和交付标准\n2. **方案设计** - 制定技术方案和实施路径\n3. **分步执行** - 按优先级逐步推进\n4. **质量验证** - 每步完成后进行检查\n5. **成果汇总** - 整理最终产出物\n` }
      }

      default:
        return { success: false, toolId, error: `未知工具: ${toolId}` }
    }
  } catch (e: any) {
    return { success: false, toolId, error: e.message || '工具执行失败' }
  }
}

// 生成代码骨架
function generateCodeSkeleton(language: string, description: string): string {
  const skeletons: Record<string, string> = {
    typescript: `/**
 * ${description}
 */
function main() {
  // TODO: 实现具体逻辑
}

main();`,
    javascript: `/**
 * ${description}
 */
function main() {
  // TODO: 实现具体逻辑
}

main();`,
    python: `"""
${description}
"""

def main():
    # TODO: 实现具体逻辑
    pass

if __name__ == '__main__':
    main()`,
    java: `/**
 * ${description}
 */
public class Main {
    public static void main(String[] args) {
        // TODO: 实现具体逻辑
    }
}`,
    html: `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>${description}</title>
</head>
<body>
  <!-- TODO: 实现页面内容 -->
</body>
</html>`,
    css: `/* ${description } */

/* TODO: 实现样式 */`,
    sql: `-- ${description}
-- TODO: 实现 SQL 查询
SELECT * FROM table_name;`,
  }
  return skeletons[language] || `// ${description}\n// TODO: 实现 ${language} 代码`
}

// 从Agent回复中解析工具调用
export interface ToolCallItem {
  toolId: string
  params: Record<string, any>
}

export function parseToolCalls(content: string): { cleanContent: string; toolCalls: ToolCallItem[] } {
  const toolRegex = /\[TOOL_CALL:(\w+)\]([\s\S]*?)\[\/TOOL_CALL\]/g
  const toolCalls: ToolCallItem[] = []
  let match

  while ((match = toolRegex.exec(content)) !== null) {
    try {
      const params = JSON.parse(match[2])
      toolCalls.push({ toolId: match[1], params })
    } catch (e) {
      // 忽略无效的JSON
    }
  }

  // 移除工具调用标记，保留纯文本
  const cleanContent = content.replace(toolRegex, '').trim()

  return { cleanContent, toolCalls }
}
