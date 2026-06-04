# 多Agent协同工作平台 — 技术选型与架构文档

> 版本：v1.0 | 更新日期：2026-06-04

---

## 目录

1. [项目概述](#1-项目概述)
2. [系统架构](#2-系统架构)
3. [技术选型与理由](#3-技术选型与理由)
4. [数据库设计](#4-数据库设计)
5. [API设计](#5-api设计)
6. [核心服务](#6-核心服务)
7. [前端架构](#7-前端架构)
8. [数据流说明](#8-数据流说明)
9. [安全设计](#9-安全设计)
10. [部署方案](#10-部署方案)

---

## 1. 项目概述

多Agent协同工作平台是一个面向软件研发团队的AI协作系统。平台内置8个专业角色Agent（业务场景挖掘师、需求分析师、产品经理、技术架构师、前端开发、后端开发、测试工程师、运营迭代师），通过可视化工作流编排和群聊机制实现Agent之间的协同工作，支持工具调用、文件操作、交付物管理等完整研发流程。

**核心能力**：

- 可视化工作流编排（拖拽式画布编辑器）
- 多Agent群聊协作（支持@提及、Agent间自动转发）
- 工具/技能系统（7种内置工具 + 自定义扩展）
- 项目文件管理（树形浏览、读写、安全隔离）
- 多LLM供应商适配（DeepSeek / OpenAI / Anthropic / 智谱 / Moonshot / 通义千问 / 自定义兼容接口）

---

## 2. 系统架构

### 2.1 整体架构图

```
┌─────────────────────────────────────────────────────────────────────┐
│                         前端层 (Browser)                            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │  首页     │ │ 工作区   │ │ Agent    │ │  看板    │ │  日报    │ │
│  │  Home    │ │Workspace │ │ Agents   │ │  Board   │ │  Report  │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Zustand 全局状态  │  React Router  │  Axios HTTP Client     │   │
│  └──────────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  WorkflowEditor (@xyflow/react)  │  react-markdown          │   │
│  └──────────────────────────────────────────────────────────────┘   │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ HTTP / Vite Proxy (/api → :3001)
┌──────────────────────────────▼──────────────────────────────────────┐
│                      后端层 (Express + TypeScript ESM)              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │ projects │ │  agents  │ │ workflow │ │  skills  │ │  files   │ │
│  │  routes  │ │  routes  │ │  routes  │ │  routes  │ │  routes  │ │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ │
│       │            │            │            │            │         │
│  ┌────▼────────────▼────────────▼────────────▼────────────▼─────┐  │
│  │                     Service 层                               │  │
│  │  projectService │ agentService │ workflowEditorService       │  │
│  │  skillService   │ fileService  │ deliverableService         │  │
│  │  reportService  │ workflowService                           │  │
│  └────┬────────────┬────────────┬──────────────────────────────┘  │
│       │            │            │                                  │
│  ┌────▼─────┐ ┌────▼─────┐ ┌───▼──────────────────────────────┐  │
│  │  SQLite  │ │ 文件系统  │ │  LLM Caller (多供应商适配)       │  │
│  │  数据库  │ │ 工作区    │ │  DeepSeek / OpenAI / Anthropic  │  │
│  └──────────┘ └──────────┘ │  智谱 / Moonshot / 通义 / 自定义 │  │
│                             └──────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 分层职责

| 层级 | 职责 | 关键技术 |
|------|------|----------|
| **前端展示层** | 页面渲染、用户交互、状态管理 | React 18.3 + TypeScript 5.8 |
| **前端状态层** | 全局状态、数据缓存、UI状态同步 | Zustand 5.0 |
| **API通信层** | HTTP请求、代理转发、错误处理 | Axios 1.17 + Vite Proxy |
| **路由层** | 请求分发、参数校验、文件上传 | Express Router + multer |
| **业务服务层** | 核心业务逻辑、LLM调用、工具执行 | TypeScript Services |
| **数据访问层** | SQL执行、数据库迁移、连接管理 | sqlite3 5.1.7 + sqlite 5.1 |
| **文件存储层** | 项目文件CRUD、路径安全、树形结构 | Node.js fs |

---

## 3. 技术选型与理由

### 3.1 前端技术栈

| 技术 | 版本 | 选型理由 |
|------|------|----------|
| **React** | 18.3 | 组件化开发，生态成熟，社区资源丰富；18版本支持Concurrent特性，提升交互体验 |
| **TypeScript** | 5.8 | 静态类型检查，减少运行时错误；IDE智能提示提升开发效率；与后端共享类型定义 |
| **Vite** | 6.3 | 基于ESM的极速HMR，冷启动毫秒级；原生TypeScript支持；生产构建基于Rollup优化 |
| **Tailwind CSS** | 3.4 | 原子化CSS，开发效率高；无运行时开销；与组件化开发天然契合；减少样式冲突 |
| **Zustand** | 5.0 | 轻量级状态管理（~1KB），API简洁；无Provider包裹；支持中间件扩展；比Redux减少70%样板代码 |
| **@xyflow/react** | 12.11 | 专业级流程图/工作流画布库；内置拖拽、缩放、连线；自定义节点扩展性强；React原生集成 |
| **react-markdown** | 10.1 | 安全的Markdown渲染，防止XSS；支持插件扩展；Agent输出内容以Markdown为主 |
| **remark-gfm** | 4.0 | GitHub风格Markdown扩展（表格、任务列表、删除线等），丰富Agent输出格式 |
| **react-router-dom** | 7.3 | React官方路由方案，声明式路由定义；支持嵌套路由和动态参数 |
| **lucide-react** | 0.511 | 轻量图标库（Tree-shakable），图标风格统一；覆盖常用场景 |
| **axios** | 1.17 | HTTP客户端，拦截器机制统一处理请求/响应；自动JSON转换；取消请求支持 |

### 3.2 后端技术栈

| 技术 | 版本 | 选型理由 |
|------|------|----------|
| **Express** | 4.21 | Node.js最成熟的Web框架，中间件生态丰富；学习曲线平缓；适合中小型API服务 |
| **TypeScript (ESM)** | 5.8 | 前后端统一语言，类型安全；ESM模块系统支持顶层await、tree-shaking |
| **SQLite** | 5.1 (sqlite3 5.1.7) | 零配置嵌入式数据库，无需独立服务；单文件存储便于备份迁移；本地部署场景性能充足 |
| **multer** | 2.1 | Express官方文件上传中间件，支持磁盘存储和内存存储；文件大小限制和类型过滤 |
| **cors** | 2.8 | 跨域资源共享中间件，开发环境前后端分离必需 |
| **tsx** | 4.20 | TypeScript直接执行器，无需预编译；支持ESM和CommonJS；开发体验流畅 |
| **nodemon** | 3.1 | 文件变更自动重启，开发热重载；配合tsx实现TypeScript代码修改即时生效 |

### 3.3 开发工具链

| 工具 | 用途 |
|------|------|
| **concurrently** | 同时启动前端和后端开发服务器 |
| **eslint** | 代码质量检查 |
| **vite-tsconfig-paths** | Vite路径别名解析（@/ → src/） |
| **autoprefixer + postcss** | CSS自动添加浏览器前缀 |

---

## 4. 数据库设计

### 4.1 ER关系图

```
┌──────────────┐       ┌──────────────────┐       ┌──────────────┐
│   projects   │1─────*│  project_agents  │*─────1│    agents    │
│──────────────│       │──────────────────│       │──────────────│
│ id (PK)      │       │ id (PK)          │       │ id (PK)      │
│ name         │       │ project_id (FK)  │       │ name         │
│ direction    │       │ agent_id (FK)    │       │ role         │
│ type         │       │ joined_at        │       │ description  │
│ status       │       └──────────────────┘       │ prompt_tmpl  │
│ current_node │                                  │ avatar       │
│ progress     │                                  │ status       │
│ created_at   │       ┌──────────────────┐       └──────┬───────┘
│ updated_at   │1─────*│  workflow_nodes  │              │1
└──────┬───────┘       │──────────────────│       ┌──────┴───────┐
       │               │ id (PK)          │       │ agent_models │
       │1              │ project_id (FK)  │       │──────────────│
       │               │ agent_id (FK)    │       │ id (PK)      │
┌──────▼───────┐       │ name             │       │ agent_id(FK) │
│project_folders│      │ status           │       │ provider     │
│──────────────│       │ sequence         │       │ model_name   │
│ id (PK)      │       │ started_at       │       │ api_base     │
│ project_id   │       │ completed_at     │       │ api_key      │
│ folder_path  │       └──────────────────┘       │ is_active    │
│ created_at   │                                  └──────────────┘
└──────────────┘
       │1
       │               ┌──────────────────┐
┌──────▼───────┐1─────*│  chat_messages   │
│project_      │       │──────────────────│
│workflows     │       │ id (PK)          │
│──────────────│       │ project_id (FK)  │
│ id (PK)      │       │ agent_id (FK)    │
│ project_id   │       │ agent_name       │
│ nodes (JSON) │       │ role             │
│ edges (JSON) │       │ content          │
│ updated_at   │       │ chat_type        │
└──────────────┘       │ created_at       │
                       └──────────────────┘
┌──────────────┐       ┌──────────────────┐
│deliverables  │       │  daily_reports   │
│──────────────│       │──────────────────│
│ id (PK)      │       │ id (PK)          │
│ project_id   │       │ project_id (FK)  │
│ agent_id     │       │ agent_id         │
│ title        │       │ content          │
│ content      │       │ created_at       │
│ status       │       └──────────────────┘
│ created_at   │
└──────────────┘
┌──────────────┐       ┌──────────────────┐
│   skills     │1─────*│  agent_skills    │
│──────────────│       │──────────────────│
│ id (PK)      │       │ id (PK)          │
│ name         │       │ agent_id (FK)    │
│ description  │       │ skill_id (FK)    │
│ category     │       │ config (JSON)    │
│ icon         │       │ enabled          │
│ parameters   │       │ created_at       │
│ handler_type │       └──────────────────┘
│ is_builtin   │
│ created_at   │
└──────────────┘
```

### 4.2 数据表详细定义

#### projects — 项目表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK, AUTO | 主键自增 |
| name | TEXT | NOT NULL | 项目名称 |
| direction | TEXT | NOT NULL | 项目方向/描述 |
| type | TEXT | NOT NULL, CHECK | 项目类型：web / miniapp / app / optimization |
| status | TEXT | NOT NULL, DEFAULT 'active' | 状态：active / paused / completed / archived |
| current_node | TEXT | DEFAULT 'scene_miner' | 当前工作流节点 |
| progress | INTEGER | DEFAULT 0 | 进度百分比 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 更新时间 |

#### agents — Agent表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | TEXT | PK | Agent唯一标识（如 scene_miner） |
| name | TEXT | NOT NULL | Agent显示名称 |
| role | TEXT | NOT NULL | 角色标识 |
| description | TEXT | NOT NULL | 角色描述 |
| prompt_template | TEXT | NOT NULL | 系统提示词模板 |
| avatar | TEXT | | 头像标识或URL |
| status | TEXT | DEFAULT 'active' | 状态 |
| model_config | TEXT | DEFAULT '{}' | 模型配置（JSON，已迁移至agent_models表） |

#### agent_models — Agent模型配置表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK, AUTO | 主键自增 |
| agent_id | TEXT | FK → agents(id), ON DELETE CASCADE | 所属Agent |
| provider | TEXT | NOT NULL | 供应商：deepseek / openai / anthropic / zhipu / moonshot / qwen / custom |
| model_name | TEXT | NOT NULL | 模型名称（如 deepseek-v4-flash） |
| api_base | TEXT | | API基础地址 |
| api_key | TEXT | | API密钥 |
| is_active | INTEGER | DEFAULT 0 | 是否为当前激活模型（每个Agent仅一个激活） |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

#### deliverables — 交付物表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK, AUTO | 主键自增 |
| project_id | INTEGER | FK → projects(id) | 所属项目 |
| node_id | INTEGER | FK → workflow_nodes(id) | 关联工作流节点 |
| title | TEXT | NOT NULL | 交付物标题 |
| content | TEXT | NOT NULL | 交付物内容（Markdown格式） |
| type | TEXT | NOT NULL | 类型（markdown / code / document） |
| version | INTEGER | DEFAULT 1 | 版本号 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

#### chat_messages — 聊天记录表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK, AUTO | 主键自增 |
| project_id | INTEGER | FK → projects(id) | 所属项目 |
| agent_id | TEXT | | 关联Agent ID |
| agent_name | TEXT | | Agent名称（JOIN查询填充） |
| role | TEXT | NOT NULL, CHECK | 角色：user / agent / system |
| content | TEXT | NOT NULL | 消息内容 |
| chat_type | TEXT | | 聊天类型：group（群聊）/ null（单聊） |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

#### project_agents — 项目-Agent关联表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK, AUTO | 主键自增 |
| project_id | INTEGER | FK → projects(id), ON DELETE CASCADE | 项目ID |
| agent_id | TEXT | FK → agents(id) | Agent ID |
| joined_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 加入时间 |

> UNIQUE约束：(project_id, agent_id) 防止重复关联

#### project_folders — 项目文件夹表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK, AUTO | 主键自增 |
| project_id | INTEGER | FK → projects(id), ON DELETE CASCADE, UNIQUE | 项目ID（一对一） |
| folder_path | TEXT | NOT NULL | 物理文件夹绝对路径 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

#### project_workflows — 项目工作流表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK, AUTO | 主键自增 |
| project_id | INTEGER | FK → projects(id), ON DELETE CASCADE, UNIQUE | 项目ID（一对一） |
| nodes | TEXT | DEFAULT '[]' | 节点定义（JSON数组） |
| edges | TEXT | DEFAULT '[]' | 连线定义（JSON数组） |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 更新时间 |

#### skills — 技能表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | TEXT | PK | 技能唯一标识 |
| name | TEXT | NOT NULL | 技能名称 |
| description | TEXT | NOT NULL | 技能描述 |
| category | TEXT | DEFAULT 'general' | 分类（文件操作 / 开发工具 / 文档工具 / 分析工具 / 信息获取 / 项目管理） |
| icon | TEXT | DEFAULT 'wrench' | 图标标识 |
| parameters | TEXT | DEFAULT '[]' | 参数定义（JSON数组） |
| is_builtin | INTEGER | DEFAULT 1 | 是否内置技能 |
| handler_type | TEXT | NOT NULL | 处理器类型标识 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

#### agent_skills — Agent技能关联表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK, AUTO | 主键自增 |
| agent_id | TEXT | FK → agents(id), ON DELETE CASCADE | Agent ID |
| skill_id | TEXT | FK → skills(id), ON DELETE CASCADE | 技能ID |
| config | TEXT | DEFAULT '{}' | 技能配置（JSON） |
| enabled | INTEGER | DEFAULT 1 | 是否启用 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

> UNIQUE约束：(agent_id, skill_id) 防止重复关联

#### daily_reports — 日报表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK, AUTO | 主键自增 |
| project_id | INTEGER | FK → projects(id) | 所属项目 |
| agent_id | TEXT | | 生成日报的Agent |
| content | TEXT | NOT NULL | 日报内容 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

#### workflow_nodes — 工作流节点表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK, AUTO | 主键自增 |
| project_id | INTEGER | FK → projects(id) | 所属项目 |
| agent_id | TEXT | NOT NULL | 关联Agent |
| name | TEXT | NOT NULL | 节点名称 |
| status | TEXT | DEFAULT 'pending', CHECK | 状态：pending / in_progress / review / completed / rejected |
| sequence | INTEGER | NOT NULL | 排序序号 |
| started_at | DATETIME | | 开始时间 |
| completed_at | DATETIME | | 完成时间 |
| approved_by | TEXT | | 审批人 |
| approval_comment | TEXT | | 审批备注 |

### 4.3 内置数据

**8个默认Agent**：

| ID | 名称 | 角色 |
|----|------|------|
| scene_miner | 业务场景挖掘师 | 发现用户痛点、市场机会和业务增长点 |
| requirement_analyst | 需求分析师 | 将模糊想法转化为结构化需求 |
| product_manager | 产品经理 | 将需求转化为可落地的产品方案 |
| tech_architect | 技术架构师 | 将PRD转化为可执行的技术方案 |
| frontend_dev | 前端开发 | 实现前端页面和交互 |
| backend_dev | 后端开发 | 实现服务端逻辑和API |
| test_engineer | 测试工程师 | 验证交付质量 |
| ops_iter | 运营迭代师 | 全程监管和运营迭代 |

**7个内置技能**：

| ID | 名称 | 分类 | 说明 |
|----|------|------|------|
| file_write | 文件写入 | 文件操作 | 在项目工作区中创建或写入文件内容 |
| file_read | 文件读取 | 文件操作 | 读取项目工作区中的文件内容 |
| code_generate | 代码生成 | 开发工具 | 生成指定编程语言的代码片段 |
| doc_create | 文档创建 | 文档工具 | 创建结构化的Markdown文档 |
| data_analyze | 数据分析 | 分析工具 | 对提供的数据进行分析并输出结论 |
| web_search | 网络搜索 | 信息获取 | 搜索网络信息获取最新资料 |
| task_plan | 任务规划 | 项目管理 | 将复杂任务拆解为可执行的步骤列表 |

---

## 5. API设计

### 5.1 路由总览

| 路由前缀 | 模块 | 说明 |
|----------|------|------|
| `/api/agents` | Agent管理 | CRUD + 模型配置 + 提示词MD上传 + 头像上传 |
| `/api/projects` | 项目管理 | CRUD + Agent管理 + 群聊 + 交付物 |
| `/api/projects/:id/workflow` | 工作流 | CRUD + 下一Agent查询 + 描述生成 |
| `/api/projects/:id/folder` | 文件夹 | 项目文件夹设置 |
| `/api/projects/:id/files/*` | 文件管理 | 树形浏览、读写、创建、删除、重命名 |
| `/api/projects/:id/deliverables` | 交付物 | 交付物管理 |
| `/api/skills` | 技能管理 | CRUD + Agent-Skill关联 + 工具执行 |
| `/api/reports` | 日报 | 日报管理 |
| `/api/health` | 健康检查 | 服务状态检测 |

### 5.2 Agent管理 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/agents` | 获取所有Agent列表（含模型配置） |
| GET | `/api/agents/:id` | 获取单个Agent详情 |
| POST | `/api/agents` | 创建Agent |
| PUT | `/api/agents/:id` | 更新Agent信息 |
| DELETE | `/api/agents/:id` | 删除Agent |
| PUT | `/api/agents/:id/prompt` | 更新Agent提示词 |
| POST | `/api/agents/upload-md` | 上传Markdown文件（提示词导入） |
| POST | `/api/agents/upload-avatar` | 上传Agent头像 |
| GET | `/api/agents/:id/models` | 获取Agent的模型配置列表 |
| POST | `/api/agents/:id/models` | 添加模型配置 |
| PUT | `/api/agents/:id/models/:modelId/active` | 设置激活模型 |
| DELETE | `/api/agents/:id/models/:modelId` | 删除模型配置 |

### 5.3 项目管理 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/projects` | 获取项目列表 |
| POST | `/api/projects` | 创建项目（支持agentIds多选 + folderName文件夹设置） |
| GET | `/api/projects/:id` | 获取项目详情（含工作流节点、交付物、关联Agent） |
| GET | `/api/projects/:id/agents` | 获取项目关联的Agent列表 |
| POST | `/api/projects/:id/agents/:agentId` | 将Agent添加到项目 |
| DELETE | `/api/projects/:id/agents/:agentId` | 从项目移除Agent |
| GET | `/api/projects/:id/nodes` | 获取项目工作流节点列表 |
| POST | `/api/projects/:id/nodes/:nodeId/approve` | 审批工作流节点 |
| GET | `/api/projects/:id/agents/:agentId/chat` | 获取单聊历史 |
| POST | `/api/projects/:id/agents/:agentId/chat` | 发送单聊消息 |
| GET | `/api/projects/:id/deliverables` | 获取项目交付物列表 |

### 5.4 群聊 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/projects/:id/group-chat` | 获取群聊历史（含Agent名称） |
| POST | `/api/projects/:id/group-chat` | 发送群聊消息 |

**群聊消息格式**：

```typescript
// 请求
{
  message: string,          // 消息内容（支持@agent_name或@agent_id）
  sendAsAgentId?: string    // 可选：以某Agent身份发送（Agent间转发）
}

// 响应
{
  success: true,
  data: {
    sentMessage: ChatMessage,   // 发送的消息
    replies: ChatMessage[]      // 被提及Agent的回复列表
  }
}
```

**@解析逻辑**：
1. 正则匹配 `@agent_id` 或 `@agent_name`
2. 先匹配Agent ID，再匹配Agent名称
3. 未明确@时，用户消息默认@所有项目Agent

### 5.5 工作流 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/projects/:projectId/workflow` | 获取项目工作流（nodes + edges） |
| POST | `/api/projects/:projectId/workflow` | 保存工作流（整体覆盖） |
| GET | `/api/projects/:projectId/workflow/next/:agentId` | 查询指定Agent的下一Agent |
| GET | `/api/projects/:projectId/workflow/description` | 获取工作流文本描述（用于注入提示词） |

### 5.6 文件管理 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/projects/:id/folder` | 获取项目文件夹信息 |
| POST | `/api/projects/:id/folder` | 设置项目工作文件夹 |
| GET | `/api/projects/:id/files/tree` | 获取文件树（递归） |
| GET | `/api/projects/:id/files` | 列出单层目录内容 |
| GET | `/api/projects/:id/files/content` | 读取文件内容（?path=xxx） |
| POST | `/api/projects/:id/files/content` | 写入/创建文件 |
| POST | `/api/projects/:id/files/mkdir` | 创建子目录 |
| DELETE | `/api/projects/:id/files` | 删除文件或目录 |
| PUT | `/api/projects/:id/files/rename` | 重命名文件或目录 |

### 5.7 技能管理 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/skills` | 获取所有技能列表 |
| POST | `/api/skills` | 创建自定义技能 |
| GET | `/api/skills/agents/:agentId` | 获取Agent的技能列表 |
| POST | `/api/skills/agents/:agentId/skills/:skillId` | 为Agent添加技能 |
| DELETE | `/api/skills/agents/:agentId/skills/:skillId` | 移除Agent的技能 |
| PUT | `/api/skills/agents/:agentId/skills/:skillId/toggle` | 切换技能启用状态 |
| PUT | `/api/skills/agents/:agentId/skills/:skillId/config` | 更新技能配置 |
| GET | `/api/skills/agents/:agentId/tools-description` | 获取Agent工具描述（用于提示词注入） |
| POST | `/api/skills/execute` | 执行工具调用 |

### 5.8 统一响应格式

```typescript
// 成功响应
{ success: true, data: T }

// 失败响应
{ success: false, error: string }
```

---

## 6. 核心服务

### 6.1 agentService.ts — Agent回复生成

**职责**：Agent CRUD、模型管理、聊天消息管理、回复生成

**核心流程 — generateAgentReply()**：

```
用户消息 → 获取Agent配置
              │
              ├─ 获取Agent工具描述 (skillService.getAgentToolsDescription)
              │   └─ 查询agent_skills → 过滤enabled → 生成工具描述文本
              │
              ├─ 获取工作流描述 (workflowEditorService.getWorkflowDescription)
              │   └─ 查询project_workflows → 解析nodes/edges → 生成流转描述
              │
              ├─ 组装增强提示词 = prompt_template + 工具描述 + 工作流描述
              │
              ├─ 查找激活模型 → 调用LLM (llmCaller.callExternalLLM)
              │   │
              │   ├─ 成功 → 解析工具调用 (parseToolCalls)
              │   │   │
              │   │   ├─ 有工具调用 → 逐个执行 (executeToolCall) → 追加结果
              │   │   │
              │   │   └─ 无工具调用 → 直接返回
              │   │
              │   └─ 失败 → 降级为模拟回复 (generateMockReply)
              │
              └─ 无激活模型 → 使用模拟回复
```

**工具调用格式**：

Agent在LLM回复中使用标记语法调用工具：

```
[TOOL_CALL:工具ID]{"参数名":"值",...}[/TOOL_CALL]
```

系统解析后执行工具，将执行结果追加到回复末尾。

### 6.2 skillService.ts — 技能与工具执行

**职责**：Skill CRUD、Agent-Skill关联管理、工具描述生成、工具调用解析与执行

**7种内置工具执行逻辑**：

| 工具ID | 执行逻辑 |
|--------|----------|
| file_write | 调用fileService.writeFileContent，支持自动创建目录 |
| file_read | 调用fileService.readFileContent，返回文件内容 |
| code_generate | 根据语言和描述生成代码骨架模板 |
| doc_create | 根据标题和章节列表生成Markdown文档 |
| data_analyze | 生成数据分析报告框架（模拟模式） |
| web_search | 返回搜索结果提示（模拟模式，需配置真实API） |
| task_plan | 根据任务描述和约束生成执行步骤 |

**工具描述注入**：将Agent启用的技能以Markdown格式追加到系统提示词中，包含工具名称、描述、参数说明和调用格式。

### 6.3 workflowEditorService.ts — 工作流编辑

**职责**：工作流CRUD、下一Agent查询、工作流文本描述生成

**数据结构**：

```typescript
// 工作流节点
interface WorkflowNode {
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

// 工作流连线
interface WorkflowEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  label?: string
  condition?: string
  type?: string
}
```

**下一Agent查询**：根据当前Agent节点，沿出边查找目标节点。若目标为条件节点，则继续沿条件分支查找。

**工作流描述生成**：将画布节点和连线转换为自然语言描述，注入到Agent提示词中，使Agent了解自己在工作流中的位置和后续步骤。

### 6.4 fileService.ts — 文件系统服务

**职责**：项目文件CRUD、树形结构读取、路径安全校验

**核心安全机制 — resolveSafePath()**：

```
输入: projectPath = "/workspace/project-1-myapp"
      relativePath = "../../etc/passwd"

处理: path.resolve(projectPath, relativePath)
      → "/etc/passwd"

校验: !resolved.startsWith(path.resolve(projectPath))
      → true → 抛出异常 "非法路径：不允许访问项目文件夹之外的文件"
```

**文件树构建**：递归读取目录，过滤隐藏文件（以`.`开头），文件夹排在前面，按名称排序。

**工作区隔离**：每个项目的文件存储在 `project-workspace/project-{id}-{name}/` 目录下，物理隔离。

### 6.5 projectService.ts — 项目管理

**职责**：项目CRUD、Agent关联管理、工作文件夹设置

**创建项目流程**：

```
创建项目记录 → 关联选中的Agent (project_agents)
            → 创建工作流节点 (workflow_nodes)
            → 设置工作文件夹 (project_folders)
```

### 6.6 deliverableService.ts — 交付物管理

**职责**：交付物CRUD，Agent完成工作时自动创建交付物

### 6.7 reportService.ts — 日报管理

**职责**：日报CRUD，支持按项目查询

### 6.8 llmCaller.ts — 多供应商LLM调用

**支持的供应商**：

| 供应商 | API格式 | 认证方式 |
|--------|---------|----------|
| DeepSeek | OpenAI兼容 (`/chat/completions`) | Bearer Token |
| OpenAI | OpenAI原生 (`/chat/completions`) | Bearer Token |
| Anthropic | Anthropic原生 (`/messages`) | x-api-key Header |
| 智谱 (Zhipu) | OpenAI兼容 | Token直接传递 |
| Moonshot | OpenAI兼容 | Bearer Token |
| 通义千问 (Qwen) | OpenAI兼容 | Bearer Token |
| 自定义 (custom) | OpenAI兼容 | Bearer Token |

**调用超时**：60秒

**降级策略**：LLM调用失败时自动降级为模拟回复（generateMockReply），保证系统可用性。

---

## 7. 前端架构

### 7.1 页面结构

| 页面 | 路由 | 功能 |
|------|------|------|
| Home.tsx | `/` | 首页项目列表 + 新建项目弹窗（Agent多选 + 工作文件夹设置） |
| Workspace.tsx | `/project/:id/workspace` | 项目工作区（三栏布局 + 面板拖拽调整 + 群聊 + 工作流 + 文件浏览器） |
| Agents.tsx | `/agents` | Agent管理（CRUD + 提示词编辑 + 模型配置 + Skill面板 + 头像上传） |
| Board.tsx | `/project/:id/board` | 看板视图 |
| DailyReport.tsx | `/project/:id/daily` | 日报 |
| Deliverables.tsx | `/deliverables` | 交付物 |

### 7.2 核心组件

| 组件 | 功能 |
|------|------|
| Layout.tsx | 全局布局（顶部导航栏 + 内容区域） |
| WorkflowEditor.tsx | 工作流画布编辑器，基于@xyflow/react，支持4种自定义节点（Start/End/Agent/Condition）、工具面板、条件编辑、节点操作卡片 |
| Empty.tsx | 空状态占位组件 |

### 7.3 状态管理 (Zustand)

```typescript
interface AppState {
  projects: Project[]                    // 项目列表
  currentProject: Project | null         // 当前项目（含节点、交付物）
  agents: Agent[]                        // Agent列表
  chatMessages: Record<string, ChatMessage[]>  // 按Agent分组的聊天记录
  deliverables: Deliverable[]            // 交付物列表
  reports: DailyReport[]                 // 日报列表
}
```

**设计原则**：

- 单一Store，扁平化结构
- 按业务域划分setter方法
- chatMessages使用Record按Agent ID分组，避免全量更新
- updateNodeStatus精确更新单个节点状态

### 7.4 路由配置

```
/                           → Home（项目列表）
/project/:id/workspace      → Workspace（工作区）
/project/:id/board          → Board（看板）
/project/:id/daily          → DailyReport（日报）
/agents                     → Agents（Agent管理）
/deliverables               → Deliverables（交付物）
```

### 7.5 开发代理配置

Vite开发服务器将 `/api` 请求代理到后端 `http://localhost:3001`：

```typescript
// vite.config.ts
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:3001',
      changeOrigin: true,
      secure: false,
    }
  }
}
```

---

## 8. 数据流说明

### 8.1 用户发送群聊消息

```
用户输入消息（含@Agent）
    │
    ▼
前端 Workspace.tsx
    │ POST /api/projects/:id/group-chat
    │ { message, sendAsAgentId }
    ▼
后端 projects.ts route
    │
    ├─ 1. 保存用户消息到 chat_messages (chat_type='group')
    │
    ├─ 2. 解析@提及
    │     ├─ 正则匹配 @agent_id / @agent_name
    │     └─ 未@时默认@所有项目Agent
    │
    ├─ 3. 遍历被@的Agent，依次生成回复
    │     └─ agentService.generateAgentReply()
    │         ├─ 获取Agent配置 + 工具描述 + 工作流描述
    │         ├─ 组装增强提示词
    │         ├─ 调用LLM / 降级模拟回复
    │         ├─ 解析工具调用 → 执行 → 追加结果
    │         └─ 保存Agent回复到 chat_messages
    │
    ├─ 4. 检查工作流节点状态
    │     └─ 若Agent对应节点为 in_progress → 更新为 review
    │        └─ 自动创建交付物
    │
    ▼
返回 { sentMessage, replies }
    │
    ▼
前端更新聊天列表 + 节点状态
```

### 8.2 Agent工具调用

```
LLM生成回复（含 [TOOL_CALL:file_write]{"path":"src/index.ts","content":"..."}[/TOOL_CALL]）
    │
    ▼
skillService.parseToolCalls(reply)
    │ 正则匹配 [TOOL_CALL:xxx]{...}[/TOOL_CALL]
    │ 提取 toolId + params
    │ 移除标记，保留纯文本
    ▼
skillService.executeToolCall(toolId, params, projectId)
    │ switch(toolId)
    │   ├─ file_write → fileService.writeFileContent()
    │   ├─ file_read  → fileService.readFileContent()
    │   ├─ code_generate → 生成代码骨架
    │   ├─ doc_create → 生成Markdown
    │   ├─ data_analyze → 生成分析报告
    │   ├─ web_search → 返回搜索结果
    │   └─ task_plan → 生成任务计划
    ▼
拼接执行结果到回复末尾
    │
    ▼
返回完整回复（纯文本 + 工具执行结果）
```

### 8.3 工作流编辑与提示词注入

```
用户在画布编辑工作流（拖拽节点、连线）
    │
    ▼
WorkflowEditor.tsx 保存
    │ POST /api/projects/:id/workflow
    │ { nodes, edges }
    ▼
workflowEditorService.saveWorkflow()
    │ JSON序列化 → UPSERT project_workflows
    ▼
Agent回复生成时
    │ workflowEditorService.getWorkflowDescription()
    │ 解析nodes/edges → 生成自然语言描述
    ▼
追加到Agent系统提示词
    │ "以下是当前项目的工作流转顺序..."
    │ "**业务场景挖掘师** 完成后 → 需求分析师"
    ▼
Agent了解自身在工作流中的位置和后续步骤
```

### 8.4 项目创建

```
用户填写项目信息（名称、方向、类型、选择Agent、设置文件夹）
    │
    ▼
POST /api/projects
    │ { name, direction, type, agentIds, folderName }
    ▼
projectService.createProject()
    │
    ├─ INSERT projects
    ├─ INSERT project_agents (批量关联Agent)
    ├─ INSERT workflow_nodes (按顺序创建节点，首个为 in_progress)
    └─ fileService.setProjectFolder() (创建物理目录 + 记录路径)
    ▼
返回项目详情
```

---

## 9. 安全设计

### 9.1 文件路径安全

**核心防护 — resolveSafePath()**：

- 使用 `path.resolve()` 解析相对路径，消除 `..` 穿越
- 校验解析后的绝对路径是否以项目根路径为前缀
- 不满足条件时抛出异常，拒绝访问

```typescript
function resolveSafePath(projectPath: string, relativePath: string): string {
  const resolved = path.resolve(projectPath, relativePath)
  if (!resolved.startsWith(path.resolve(projectPath))) {
    throw new Error('非法路径：不允许访问项目文件夹之外的文件')
  }
  return resolved
}
```

**文件名过滤**：创建文件/目录时，过滤非法字符 `<>:"/\|?*`

### 9.2 项目文件隔离

- 每个项目的文件存储在独立目录：`project-workspace/project-{id}-{name}/`
- 文件操作必须关联projectId，通过数据库查询获取物理路径
- 无法通过路径参数越界访问其他项目的文件

### 9.3 API Key存储

- API Key存储在SQLite数据库的agent_models表中
- 不记录到日志中
- 仅在LLM调用时读取使用
- **注意**：当前为本地部署场景，API Key以明文存储。生产环境建议使用环境变量或密钥管理服务

### 9.4 文件上传安全

- 使用multer限制文件大小（10MB）
- 上传文件重命名为随机文件名（时间戳+随机数+扩展名），防止路径猜测
- MD文件上传后读取内容并删除临时文件
- 头像文件存储在uploads目录，通过静态文件服务访问

### 9.5 HTTP请求安全

- CORS中间件控制跨域访问
- JSON请求体大小限制（10MB）
- 统一错误处理中间件，避免泄露内部错误信息

### 9.6 数据库安全

- 使用参数化查询（`?`占位符），防止SQL注入
- 外键约束 + ON DELETE CASCADE 保证数据一致性
- UNIQUE约束防止重复关联

---

## 10. 部署方案

### 10.1 系统要求

| 项目 | 要求 |
|------|------|
| 操作系统 | Windows 10+ / macOS 12+ / Linux (glibc 2.28+) |
| Node.js | v18.0+（推荐v20 LTS） |
| 内存 | ≥ 2GB |
| 磁盘 | ≥ 500MB（含依赖） |

### 10.2 端口分配

| 服务 | 端口 | 说明 |
|------|------|------|
| 前端开发服务器 | 5173 | Vite dev server |
| 后端API服务器 | 3001 | Express server |

### 10.3 Windows一键部署（启动.bat）

```
[1/5] 检查运行环境
      └─ 检测Node.js → 未安装则自动下载v20 LTS并静默安装

[2/5] 检测并清理端口占用
      └─ 清理3001/5173/5174/5175端口的监听进程

[3/5] 检查项目依赖
      └─ node_modules不存在时执行 npm install（使用npmmirror镜像源）

[4/5] 初始化数据目录
      └─ 创建 data/ uploads/ project-workspace/ 目录

[5/5] 启动平台服务
      └─ npm run dev（concurrently启动前后端）
      └─ 8秒后自动打开浏览器 http://localhost:5173
```

### 10.4 Mac/Linux启动（start.sh）

```bash
#!/bin/bash
# 检查Node.js → 安装依赖 → 创建目录 → npm run dev
```

### 10.5 开发模式启动

```bash
# 安装依赖
npm install

# 同时启动前后端（开发模式）
npm run dev

# 或分别启动
npm run client:dev   # 前端 (Vite, :5173)
npm run server:dev   # 后端 (nodemon + tsx, :3001)
```

### 10.6 生产构建

```bash
# 构建前端
npm run build    # tsc + vite build → dist/

# 启动后端
node --import tsx api/server.ts
```

### 10.7 目录结构

```
小程序agent平台/
├── api/                        # 后端代码
│   ├── db/index.ts             # 数据库初始化 + 迁移
│   ├── routes/                 # API路由
│   │   ├── agents.ts           # Agent管理
│   │   ├── projects.ts         # 项目管理 + 群聊
│   │   ├── workflowEditor.ts   # 工作流编辑
│   │   ├── files.ts            # 文件管理
│   │   ├── skills.ts           # 技能管理
│   │   ├── deliverables.ts     # 交付物
│   │   └── reports.ts          # 日报
│   ├── services/               # 业务服务
│   │   ├── agentService.ts     # Agent回复生成
│   │   ├── skillService.ts     # 技能与工具执行
│   │   ├── workflowEditorService.ts  # 工作流编辑
│   │   ├── workflowService.ts  # 工作流节点管理
│   │   ├── fileService.ts      # 文件系统服务
│   │   ├── projectService.ts   # 项目管理
│   │   ├── deliverableService.ts  # 交付物管理
│   │   └── reportService.ts    # 日报管理
│   ├── utils/llmCaller.ts      # 多供应商LLM调用
│   ├── app.ts                  # Express应用配置
│   └── server.ts               # 服务入口
├── src/                        # 前端代码
│   ├── pages/                  # 页面组件
│   ├── components/             # 公共组件
│   ├── store/index.ts          # Zustand状态管理
│   ├── hooks/                  # 自定义Hooks
│   ├── lib/                    # 工具函数
│   ├── App.tsx                 # 路由配置
│   └── main.tsx                # 入口文件
├── data/                       # SQLite数据库文件
├── uploads/                    # 上传文件目录
├── project-workspace/          # 项目工作区文件
├── dist/                       # 前端构建产物
├── package.json                # 依赖配置
├── vite.config.ts              # Vite配置
├── tsconfig.json               # TypeScript配置
├── tailwind.config.js          # Tailwind配置
├── nodemon.json                # Nodemon配置
├── 启动.bat                    # Windows一键部署脚本
├── start.sh                    # Mac/Linux启动脚本
└── 启动点我.html               # 部署检测页面
```

### 10.8 数据库初始化与迁移

数据库在首次启动时自动初始化（`api/db/index.ts`）：

1. 创建所有表（`CREATE TABLE IF NOT EXISTS`）
2. 执行增量迁移（检查列是否存在，按需`ALTER TABLE`）
3. 初始化内置Agent数据（8个默认Agent + 默认模型配置）
4. 初始化内置Skill数据（7个工具）
5. 为没有模型配置的已有Agent补充默认模型

**迁移策略**：使用 `PRAGMA table_info()` 检查列是否存在，确保迁移幂等性。
