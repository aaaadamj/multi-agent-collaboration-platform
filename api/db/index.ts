import sqlite3 from 'sqlite3'
import { open, Database } from 'sqlite'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let db: Database<sqlite3.Database, sqlite3.Statement> | null = null

export async function getDb() {
  if (!db) {
    db = await open({
      filename: path.join(__dirname, '../../data/agent_platform.db'),
      driver: sqlite3.Database,
    })
    await initDatabase()
  }
  return db
}

async function initDatabase() {
  if (!db) return

  // 创建所有表（IF NOT EXISTS 确保不会重复创建）
  await db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      direction TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('web', 'miniapp', 'app', 'optimization')),
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'paused', 'completed', 'archived')),
      current_node TEXT DEFAULT 'scene_miner',
      progress INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS workflow_nodes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      agent_id TEXT NOT NULL,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'review', 'completed', 'rejected')),
      sequence INTEGER NOT NULL,
      started_at DATETIME,
      completed_at DATETIME,
      approved_by TEXT,
      approval_comment TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    );

    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      description TEXT NOT NULL,
      prompt_template TEXT NOT NULL,
      avatar TEXT,
      status TEXT DEFAULT 'active',
      model_config TEXT DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS agent_models (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      model_name TEXT NOT NULL,
      api_base TEXT,
      api_key TEXT,
      is_active INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS deliverables (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      node_id INTEGER,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      type TEXT NOT NULL,
      version INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id),
      FOREIGN KEY (node_id) REFERENCES workflow_nodes(id)
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      agent_id TEXT,
      role TEXT NOT NULL CHECK(role IN ('user', 'agent', 'system')),
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    );

    CREATE TABLE IF NOT EXISTS project_agents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      agent_id TEXT NOT NULL,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (agent_id) REFERENCES agents(id),
      UNIQUE(project_id, agent_id)
    );

    CREATE TABLE IF NOT EXISTS daily_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      blockers TEXT,
      risks TEXT,
      pending_approvals TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    );

    CREATE TABLE IF NOT EXISTS project_folders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL UNIQUE,
      folder_path TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS project_workflows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL UNIQUE,
      nodes TEXT DEFAULT '[]',
      edges TEXT DEFAULT '[]',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS skills (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'general',
      icon TEXT DEFAULT 'wrench',
      parameters TEXT DEFAULT '[]',
      is_builtin INTEGER DEFAULT 1,
      handler_type TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS agent_skills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id TEXT NOT NULL,
      skill_id TEXT NOT NULL,
      enabled INTEGER DEFAULT 1,
      config TEXT DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
      FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
      UNIQUE(agent_id, skill_id)
    );
  `)

  // 数据库迁移：确保 agents 表有 model_config 列
  try {
    const columns = await db.all('PRAGMA table_info(agents)')
    const hasModelConfig = columns.some((c: any) => c.name === 'model_config')
    if (!hasModelConfig) {
      await db.exec('ALTER TABLE agents ADD COLUMN model_config TEXT DEFAULT "{}"')
    }
  } catch (_e) {
    // 忽略迁移错误，列可能已存在
  }

  // 数据库迁移：确保 chat_messages 表有 chat_type 列
  try {
    const msgColumns = await db.all('PRAGMA table_info(chat_messages)')
    const hasChatType = msgColumns.some((c: any) => c.name === 'chat_type')
    if (!hasChatType) {
      await db.exec('ALTER TABLE chat_messages ADD COLUMN chat_type TEXT')
    }
  } catch (_e) {
    // 忽略迁移错误，列可能已存在
  }

  // 迁移：确保 project_workflows 表存在
  try {
    await db.exec(`CREATE TABLE IF NOT EXISTS project_workflows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL UNIQUE,
      nodes TEXT DEFAULT '[]',
      edges TEXT DEFAULT '[]',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )`)
  } catch (_e) {}

  // 初始化内置Skill数据
  const skillCount = await db.get('SELECT COUNT(*) as count FROM skills')
  if (skillCount && skillCount.count === 0) {
    await db.exec(`
      INSERT INTO skills (id, name, description, category, icon, parameters, is_builtin, handler_type) VALUES
      ('file_write', '文件写入', '在项目工作区中创建或写入文件内容', '文件操作', 'file-text', '[{"name":"path","type":"string","required":true,"desc":"文件路径"},{"name":"content","type":"string","required":true,"desc":"文件内容"}]', 1, 'file_write'),
      ('file_read', '文件读取', '读取项目工作区中的文件内容', '文件操作', 'file-search', '[{"name":"path","type":"string","required":true,"desc":"文件路径"}]', 1, 'file_read'),
      ('code_generate', '代码生成', '生成指定编程语言的代码片段', '开发工具', 'code-2', '[{"name":"language","type":"string","required":true,"desc":"编程语言"},{"name":"description","type":"string","required":true,"desc":"功能描述"}]', 1, 'code_generate'),
      ('doc_create', '文档创建', '创建结构化的Markdown文档', '文档工具', 'book-open', '[{"name":"title","type":"string","required":true,"desc":"文档标题"},{"name":"sections","type":"array","required":true,"desc":"章节列表"}]', 1, 'doc_create'),
      ('data_analyze', '数据分析', '对提供的数据进行分析并输出结论', '分析工具', 'bar-chart-3', '[{"name":"data","type":"string","required":true,"desc":"待分析的数据"},{"name":"focus","type":"string","required":false,"desc":"分析重点"}]', 1, 'data_analyze'),
      ('web_search', '网络搜索', '搜索网络信息获取最新资料', '信息获取', 'globe', '[{"name":"query","type":"string","required":true,"desc":"搜索关键词"}]', 1, 'web_search'),
      ('task_plan', '任务规划', '将复杂任务拆解为可执行的步骤列表', '项目管理', 'list-checks', '[{"name":"task","type":"string","required":true,"desc":"任务描述"},{"name":"constraints","type":"string","required":false,"desc":"约束条件"}]', 1, 'task_plan');
    `)
  }

  // 初始化默认Agent数据
  const count = await db.get('SELECT COUNT(*) as count FROM agents')
  if (count && count.count === 0) {
    await db.exec(`
      INSERT INTO agents (id, name, role, description, prompt_template, avatar) VALUES
      ('scene_miner', '业务场景挖掘师', 'scene_miner', '发现用户痛点、市场机会和业务增长点', '你是一位敏锐的业务场景挖掘师...', 'search'),
      ('requirement_analyst', '需求分析师', 'requirement_analyst', '将模糊想法转化为结构化需求', '你是一位严谨的需求分析师...', 'clipboard-list'),
      ('product_manager', '产品经理', 'product_manager', '将需求转化为可落地的产品方案', '你是一位实战型产品经理...', 'lightbulb'),
      ('tech_architect', '技术架构师', 'tech_architect', '将PRD转化为可执行的技术方案', '你是一位务实的技术架构师...', 'cpu'),
      ('frontend_dev', '前端开发', 'frontend_dev', '实现前端页面和交互', '你是一位注重体验的前端开发工程师...', 'layout'),
      ('backend_dev', '后端开发', 'backend_dev', '实现服务端逻辑和API', '你是一位稳健的后端开发工程师...', 'server'),
      ('test_engineer', '测试工程师', 'test_engineer', '验证交付质量', '你是一位细致的测试工程师...', 'bug'),
      ('ops_iter', '运营迭代师', 'ops_iter', '全程监管和运营迭代', '你是团队的项目运营官...', 'activity');
    `)

    // 为每个默认Agent配置DeepSeek Flash模型
    const defaultAgents = ['scene_miner', 'requirement_analyst', 'product_manager', 'tech_architect', 'frontend_dev', 'backend_dev', 'test_engineer', 'ops_iter']
    for (const agentId of defaultAgents) {
      await db.run(
        'INSERT INTO agent_models (agent_id, provider, model_name, api_base, api_key, is_active) VALUES (?, ?, ?, ?, ?, ?)',
        [agentId, 'deepseek', 'deepseek-v4-flash', 'https://api.deepseek.com/v1', 'sk-0c90f7bfe5a64ba3b86791c253ac38ed', 1]
      )
    }
  }

  // 迁移：为已存在但没有配置任何模型的Agent添加默认DeepSeek Flash模型
  const agentsWithoutModels = await db.all(`
    SELECT a.id FROM agents a 
    LEFT JOIN agent_models am ON a.id = am.agent_id 
    WHERE am.id IS NULL
  `)
  for (const row of agentsWithoutModels as any[]) {
    await db.run(
      'INSERT INTO agent_models (agent_id, provider, model_name, api_base, api_key, is_active) VALUES (?, ?, ?, ?, ?, ?)',
      [row.id, 'deepseek', 'deepseek-v4-flash', 'https://api.deepseek.com/v1', 'sk-0c90f7bfe5a64ba3b86791c253ac38ed', 1]
    )
  }
}

export { db }
