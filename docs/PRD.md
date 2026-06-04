# 多Agent协同工作平台 — 产品需求文档（PRD）

> 版本：v2.0 | 更新日期：2026-06-04

---

## 一、产品概述

### 1.1 产品定位

多Agent协同工作平台是一款面向个人开发者和小型团队的AI协作工具，核心理念是"让AI团队像真实软件团队一样串行/并行协作"。平台内置8个专业Agent角色，覆盖从"发现机会"到"持续迭代"的完整软件开发生命周期，用户仅需扮演指挥官角色，完成判断、审批和异常处理即可驱动整个项目运转。

### 1.2 核心价值

- **AI团队自动化协作**：多个专业Agent按工作流自动流转，产出结构化交付物
- **群聊式交互**：所有Agent在同一窗口回复，支持@定向通知和Agent间工作接力
- **可视化工作流**：拖拽式画布编辑器，自由编排Agent协作流程
- **Skill/Tool扩展**：内置7个工具，支持自定义Skill创建，赋予Agent实际执行能力
- **多模型灵活切换**：每个Agent可独立配置AI模型，适配不同任务需求

### 1.3 产品目标

| 目标 | 衡量指标 |
|------|---------|
| 降低AI协作门槛 | 新用户5分钟内完成首次项目创建 |
| 提升交付效率 | 单项目全流程产出时间缩短50% |
| 保证交付质量 | 关键节点审批+质量关卡双重保障 |
| 灵活可扩展 | 支持自定义Agent、Skill、工作流 |

---

## 二、用户画像

### 2.1 主要用户

| 用户类型 | 特征描述 | 核心诉求 |
|---------|---------|---------|
| 独立开发者 | 1人+AI团队模式，全栈能力但精力有限 | 快速完成从需求到代码的全链路产出 |
| 产品经理 | 有想法但缺技术团队，需要AI辅助落地 | 将产品想法转化为可执行方案和原型 |
| 小型创业团队 | 3-5人，需要高效协作工具 | 多Agent分工协作，减少沟通成本 |
| 技术学习者 | 想了解完整软件开发流程 | 通过Agent协作学习各环节最佳实践 |

### 2.2 用户角色

| 角色 | 注册方式 | 核心权限 |
|------|---------|---------|
| 指挥官（用户） | 本地使用，无需注册 | 发起项目、审批关键节点、查看所有交付物、与任意Agent对话、配置Agent和Skill |

---

## 三、功能需求

### 3.1 Agent管理

#### 3.1.1 预设Agent

平台内置8个专业Agent，覆盖软件开发全生命周期：

| Agent ID | 名称 | 岗位 | 核心职责 | 交付物 |
|----------|------|------|---------|--------|
| scene_miner | 业务场景挖掘师 | 业务挖掘 | 发现用户痛点、市场机会和业务增长点 | 场景机会卡 |
| requirement_analyst | 需求分析师 | 需求分析 | 6问深度挖掘+需求结构化+项目类型锁定+设计规范输出 | 需求洞察卡+需求规格书 |
| product_manager | 产品经理 | 产品设计 | 将需求转化为可落地的产品方案和PRD | PRD文档 |
| tech_architect | 技术架构师 | 技术架构 | 技术选型、架构设计、API契约、数据模型 | 技术方案文档 |
| frontend_dev | 前端开发工程师 | 前端开发 | 实现前端页面和交互，确保视觉品质 | 前端代码+设计方向卡 |
| backend_dev | 后端开发工程师 | 后端开发 | 实现服务端逻辑、API和数据层 | 后端代码+自测报告 |
| test_engineer | 测试工程师 | 测试验证 | 功能测试、接口测试、边界测试 | 测试报告+Bug清单 |
| ops_iter | 运营迭代师 | 运营迭代 | 全程监管+质量关卡+日报+上线后运营 | 项目日报+运营周报 |

**预设Agent特性**：
- 每个Agent拥有独立的系统提示词，定义角色定位、核心职责、工作流程、交付物格式、协作接口、质量标准和约束
- 提示词支持查看和编辑
- 预设Agent不可删除，但可修改提示词

#### 3.1.2 自定义Agent

用户可创建自定义Agent，扩展团队能力：

| 配置项 | 说明 | 约束 |
|--------|------|------|
| Agent ID | 唯一标识符 | 必填，不可重复，如 custom_agent_1 |
| 名称 | Agent显示名称 | 必填 |
| 岗位/角色 | 角色标识 | 必填，如 data_analyst |
| 描述 | 简要描述Agent职责 | 必填 |
| 提示词（角色定义） | 系统提示词，定义Agent行为 | 支持手动输入或MD文件上传覆盖 |
| 头像 | Agent头像图片 | 支持图片上传，存储至 /uploads/ 目录 |

**MD文件上传**：
- 支持上传 .md / .markdown 文件
- 上传后自动读取文件内容并填充到提示词编辑区
- 用户可在填充后进一步编辑再保存

**头像上传**：
- 支持上传图片文件
- 上传后自动更新Agent头像显示
- 文件存储至服务端 /uploads/ 目录

#### 3.1.3 多模型配置

每个Agent可独立配置多个AI模型，灵活切换：

**支持的模型提供商**：

| 提供商 | 默认API Base | 可选模型 |
|--------|-------------|---------|
| OpenAI | https://api.openai.com/v1 | gpt-4o, gpt-4o-mini, o3, o4-mini, gpt-4.1, gpt-4.1-mini |
| Anthropic (Claude) | https://api.anthropic.com | claude-sonnet-4-20250514, claude-opus-4-20250514, claude-haiku-4-20250514 |
| DeepSeek | https://api.deepseek.com/v1 | deepseek-v4-flash, deepseek-v4-pro, deepseek-chat, deepseek-reasoner |
| 智谱AI (GLM) | https://open.bigmodel.cn/api/paas/v4 | glm-5, glm-4-plus, glm-4-flash, glm-4v, glm-4-long |
| Moonshot (Kimi) | https://api.moonshot.cn/v1 | kimi-latest, moonshot-v1-auto, moonshot-v1-128k, moonshot-v1-32k |
| 通义千问 (Qwen) | https://dashscope.aliyuncs.com/compatible-mode/v1 | qwen3-max, qwen3-plus, qwen3-turbo, qwen3-coder-plus, qwen-vl-max |
| 自定义 (OpenAI兼容) | 用户自定义 | 用户自定义模型名 |

**模型配置项**：

| 配置项 | 说明 |
|--------|------|
| 提供商 | 从预设列表中选择或选自定义 |
| 模型名称 | 根据提供商选择或手动输入 |
| API Base URL | 接口地址，选择提供商后自动填充默认值 |
| API Key | 密钥，密码类型输入 |
| 是否默认 | 设为当前Agent的活跃模型 |

**默认模型配置**：
- 平台默认使用 DeepSeek Flash 模型
- API Key: sk-0c90f7bfe5a64ba3b86791c253ac38ed
- API Base: https://api.deepseek.com/v1

**模型管理操作**：
- 添加模型：为Agent添加新的模型配置
- 切换活跃模型：同一Agent只有一个活跃模型
- 删除模型：移除不需要的模型配置

---

### 3.2 Skill/Tool系统

#### 3.2.1 内置Skill

平台内置7个核心Skill，赋予Agent实际执行能力：

| Skill ID | 名称 | 分类 | 图标 | 描述 |
|----------|------|------|------|------|
| file_write | 文件写入 | 文件操作 | file-text | 将内容写入项目工作区文件 |
| file_read | 文件读取 | 文件操作 | file-search | 读取项目工作区文件内容 |
| code_generate | 代码生成 | 开发工具 | code-2 | 根据需求生成代码文件 |
| doc_create | 文档创建 | 文档工具 | book-open | 创建结构化文档（MD/JSON等） |
| data_analyze | 数据分析 | 分析工具 | bar-chart-3 | 分析数据并输出报告 |
| web_search | 网络搜索 | 信息获取 | globe | 搜索网络获取最新信息 |
| task_plan | 任务规划 | 项目管理 | list-checks | 规划和拆解任务 |

**Skill分类体系**：
- 文件操作：文件写入、文件读取
- 开发工具：代码生成
- 文档工具：文档创建
- 分析工具：数据分析
- 信息获取：网络搜索
- 项目管理：任务规划
- 自定义：用户创建的Skill

#### 3.2.2 自定义Skill创建

用户可创建自定义Skill，扩展Agent能力边界：

| 配置项 | 说明 | 约束 |
|--------|------|------|
| Skill ID | 唯一标识符 | 必填，不可重复 |
| 名称 | Skill显示名称 | 必填 |
| 描述 | 简要描述Skill功能 | 必填 |
| 分类 | 从预设分类中选择 | 文件操作/开发工具/文档工具/分析工具/信息获取/项目管理/自定义 |
| 处理类型 | Skill的执行方式 | md_prompt（MD提示词）/ api_call（API调用）/ script（脚本执行） |
| 行为定义 | Skill的具体行为描述 | 支持手动输入或MD文件上传 |
| 工具参数 | JSON格式定义参数 | 自动生成behavior参数 |

#### 3.2.3 Agent-Skill关联

每个Agent可配置多个Skill，实现灵活的能力组合：

| 操作 | 说明 |
|------|------|
| 添加Skill | 从Skill列表中选择并添加到Agent |
| 移除Skill | 从Agent的Skill列表中移除 |
| 启用/禁用Skill | 切换Skill的启用状态，禁用后Agent不使用该Skill |
| 编辑Skill配置 | 修改Agent-Skill关联的自定义配置（JSON格式） |

**Skill面板展示**：
- 按分类分组展示所有可用Skill
- 已添加的Skill显示启用/禁用状态标签
- 已启用的Skill高亮显示
- 显示当前Agent已启用的Skill数量角标

#### 3.2.4 工具执行引擎

Agent回复中的工具调用通过标记解析执行：

- **标记格式**：Agent回复中包含 `[TOOL_CALL]` 标记
- **解析流程**：后端解析Agent回复 → 提取工具调用信息 → 执行对应Skill → 返回执行结果
- **工具描述注入**：将Agent已启用的Skill描述自动注入Agent提示词，引导Agent正确调用工具
- **执行接口**：`POST /api/skills/execute`，传入 toolId、params、projectId

---

### 3.3 项目管理

#### 3.3.1 创建项目

| 配置项 | 说明 | 约束 |
|--------|------|------|
| 项目名称 | 项目显示名称 | 必填 |
| 项目方向/描述 | 项目需求描述 | 必填 |
| 项目类型 | 交付形态 | 网页(web)/小程序(miniapp)/App(app)/优化(optimization) |
| Agent成员 | 参与项目的Agent | 创建后可动态添加 |
| 工作文件夹 | 项目文件存储目录 | 创建后可设置 |

**项目状态流转**：

```
active → paused → active（可恢复）
active → completed（全部节点完成）
completed → archived（归档）
```

#### 3.3.2 项目工作区

**文件树浏览**：
- 树形结构展示项目文件夹内容
- 支持目录展开/折叠
- 文件图标根据扩展名区分（MD/代码/JSON/图片/其他）
- 显示文件和目录名称

**文件CRUD操作**：

| 操作 | 说明 |
|------|------|
| 新建文件 | 指定文件路径和初始内容 |
| 新建目录 | 指定目录路径 |
| 读取文件 | 点击文件查看内容 |
| 保存文件 | 将Agent输出保存为文件 |
| 删除文件 | 删除指定文件或目录 |

**文件预览**：
- Markdown文件：使用react-markdown渲染，支持GFM语法
- 代码文件：等宽字体深色背景展示
- 文本文件：纯文本展示
- 支持的预览扩展名：.md, .mdx, .ts, .tsx, .js, .jsx, .py, .json, .html, .css, .vue, .yaml, .yml, .sql, .sh, .bash 等

#### 3.3.3 项目级文件夹权限

- 所有Agent拥有项目工作区的完整读写权限
- Agent可通过Skill（file_write、file_read等）操作工作区文件
- 工作区文件存储在服务端 project-workspace/ 目录下

#### 3.3.4 交付物管理

| 操作 | 说明 |
|------|------|
| 查看交付物 | 按项目维度展示所有交付物，支持Markdown渲染预览 |
| 保存到工作区 | 一键将交付物内容保存为工作区文件 |
| 交付物属性 | 标题、内容、类型、版本号、创建时间、关联节点 |

---

### 3.4 群聊协作

#### 3.4.1 群聊模式

- 所有Agent在同一窗口回复，形成群聊对话流
- 用户消息右对齐（琥珀金背景），Agent消息左对齐（浅灰背景）
- Agent消息支持Markdown渲染（含GFM表格、代码块等）
- 消息按时间顺序排列，自动滚动到最新消息

#### 3.4.2 @功能

**用户@Agent**：
- 输入框中输入 `@Agent名称` 定向通知指定Agent
- 点击左侧Agent列表可快速插入@提及
- 被@的Agent优先回复该消息

**Agent@Agent**：
- Agent回复中包含"接力"按钮，可@其他Agent继续工作
- 点击接力按钮后，被@的Agent基于上下文继续工作
- 支持一次@多个Agent

#### 3.4.3 消息类型

| 消息类型 | 发送方 | 展示样式 |
|---------|--------|---------|
| 用户消息 | 指挥官 | 右对齐，琥珀金背景，纯文本 |
| Agent回复 | 各Agent | 左对齐，浅灰背景，Markdown渲染 |
| 系统消息 | 平台 | 居中，灰色小字 |

**Agent回复附加功能**：
- 显示Agent名称和角色标签
- 显示"保存到工作区"按钮
- 显示"接力"按钮组（@其他Agent）

#### 3.4.4 Agent输出保存

- 每条Agent回复下方提供"保存到工作区"按钮
- 点击后弹出保存对话框，可自定义文件名
- 默认文件名格式：`{Agent名称}-{时间戳}.md`
- 保存成功后文件出现在工作区文件树中

#### 3.4.5 审批机制

**审批触发**：
- Agent完成工作后状态变为"待审批(review)"
- 群聊顶部出现"审批"按钮

**审批操作**：

| 操作 | 效果 |
|------|------|
| 通过 | 当前节点标记为已完成，自动流转到下一个节点 |
| 打回 | 当前节点回到进行中状态，Agent需重新工作 |

**审批意见**：
- 审批时可输入审批意见（可选）
- 审批意见显示在项目看板的对应节点卡片上

---

### 3.5 可视化工作流

#### 3.5.1 画布编辑器

基于 @xyflow/react 实现的可视化工作流编辑器：

**节点类型**：

| 节点类型 | 外观 | 说明 |
|---------|------|------|
| 开始节点 | 绿色圆角矩形 | 工作流起点，只有输出端口 |
| 结束节点 | 红色圆角矩形 | 工作流终点，只有输入端口 |
| Agent节点 | 白色圆角矩形+Agent头像 | 代表一个Agent执行环节，有输入和输出端口 |
| 条件节点 | 蓝色菱形 | 条件判断分支，有1个输入端口和2个输出端口（满足/不满足） |

**画布操作**：
- 拖拽节点到画布任意位置
- 缩放和平移画布
- 网格背景辅助对齐
- 画布控件（缩放、适应视图等）

#### 3.5.2 节点连线

- 从节点输出端口拖拽到另一节点输入端口完成连线
- 连线带箭头方向指示
- 连线支持动画效果
- 条件节点输出连线标注"满足"/"不满足"
- 支持串联工作流（A→B→C）
- 支持并联工作流（A→B, A→C 同时执行）

#### 3.5.3 节点操作

左键单击节点弹出操作卡片：

| 操作 | 说明 | 适用节点 |
|------|------|---------|
| 设置条件 | 编辑条件判断文本 | 条件节点 |
| 复制节点 | 复制节点到画布偏移位置 | 所有节点 |
| 删除节点 | 删除节点及其连线 | 所有节点 |

**条件设置**：
- 点击"设置条件"后底部弹出条件编辑面板
- 输入条件描述文本，如"需求已明确 → 是/否"
- 条件文本显示在菱形节点内部

#### 3.5.4 工作流保存

- 点击右上角"保存工作流"按钮持久化到数据库
- 保存内容：节点列表（位置、类型、数据）+ 边列表（连接关系）
- 下次打开自动加载已保存的工作流
- 保存期间按钮显示"保存中..."状态

#### 3.5.5 工作流注入

- 将工作流的结构描述自动注入Agent提示词
- Agent根据注入的工作流描述理解自己在流程中的位置和下一步动作
- 注入内容包括：当前节点、前置节点、后续节点、条件分支逻辑
- API：`GET /api/projects/:id/workflow/description`

---

### 3.6 面板拖拽调整

#### 3.6.1 三栏布局

项目工作区采用三栏布局：

| 板块 | 默认宽度 | 内容 |
|------|---------|------|
| 左侧：团队成员 | 256px | Agent成员列表、添加成员、状态显示 |
| 中间：群聊/工作流 | 自适应剩余空间 | 群聊对话或工作流画布（Tab切换） |
| 右侧：交付物/工作区 | 320px | 交付物列表或文件浏览器（Tab切换） |

#### 3.6.2 拖拽分隔条

- 左右两侧各有1.5px宽的拖拽分隔条
- 鼠标悬停时分隔条变色提示（左侧琥珀色、右侧蓝色）
- 拖拽时鼠标变为列调整光标

#### 3.6.3 宽度约束

| 约束项 | 值 |
|--------|-----|
| 最小面板宽度 | 180px |
| 左侧最大占比 | 容器宽度的35% |
| 右侧最大占比 | 容器宽度的40% |

---

### 3.7 一键部署

#### 3.7.1 自动安装Node.js环境

- 启动时自动检测Node.js是否已安装
- 未安装时自动下载Node.js v20 LTS安装包
- 静默安装（msiexec /qn）
- 安装后自动刷新环境变量

#### 3.7.2 自动清理端口

- 检测并清理以下端口的占用：
  - 3001（后端API服务）
  - 5173（前端开发服务器）
  - 5174-5176（备用端口）
- 使用 taskkill /F 强制终止占用进程

#### 3.7.3 自动安装依赖

- 检测 node_modules 目录是否存在
- 首次运行时自动执行 npm install
- 使用国内镜像源：https://registry.npmmirror.com
- 安装失败时提供错误提示和手动安装指引

#### 3.7.4 部署状态检测

- 提供 启动点我.html 页面，双击打开后检测部署状态
- 检测项：Node.js环境、依赖安装、服务运行状态
- 显示访问地址和状态指示

#### 3.7.5 BAT脚本一键启动

- 启动.bat 脚本执行完整部署流程：
  1. 检查并安装Node.js
  2. 清理端口占用
  3. 安装项目依赖
  4. 初始化数据目录（data/、uploads/、project-workspace/）
  5. 启动服务（npm run dev）
  6. 8秒后自动打开浏览器访问 http://localhost:5173

---

## 四、非功能需求

### 4.1 性能要求

| 指标 | 要求 |
|------|------|
| 页面首屏加载 | < 2s |
| API响应时间 | < 500ms（非AI调用） |
| AI回复延迟 | 流式输出，首token < 3s |
| 工作流画布渲染 | 50个节点内流畅操作 |
| 文件读取 | < 1s（1MB以内文件） |

### 4.2 安全要求

| 要求 | 说明 |
|------|------|
| API Key存储 | 加密存储，前端密码类型输入，不日志输出 |
| 文件操作安全 | 限制在项目工作区目录内，禁止路径穿越 |
| SQL注入防护 | 使用参数化查询，禁止SQL拼接 |
| XSS防护 | Markdown渲染时过滤危险标签 |
| 敏感信息 | 密钥从环境变量读取，不硬编码 |

### 4.3 可用性要求

| 要求 | 说明 |
|------|------|
| 本地部署 | 无需云服务，本地一键启动 |
| 零注册 | 无需注册账号，打开即用 |
| 离线可用 | 除AI调用外，所有功能离线可用 |
| 数据持久化 | SQLite本地存储，数据不丢失 |

### 4.4 兼容性要求

| 环境 | 要求 |
|------|------|
| 操作系统 | Windows 10+ |
| 浏览器 | Chrome 90+ / Edge 90+ |
| Node.js | v18+（推荐v20 LTS） |
| 屏幕分辨率 | 1280px+（桌面端优先） |

### 4.5 可扩展性要求

| 要求 | 说明 |
|------|------|
| Agent可扩展 | 支持自定义Agent，不限数量 |
| Skill可扩展 | 支持自定义Skill，不限数量 |
| 模型可扩展 | 支持任意OpenAI兼容API |
| 工作流可扩展 | 支持自由编排节点和连线 |

---

## 五、数据模型

### 5.1 实体关系

```
PROJECT ||--o{ WORKFLOW_NODE : contains
PROJECT ||--o{ DELIVERABLE : produces
PROJECT ||--o{ DAILY_REPORT : has
PROJECT ||--o{ CHAT_MESSAGE : contains
PROJECT ||--o{ PROJECT_AGENT : includes
PROJECT ||--o{ PROJECT_FOLDER : has
WORKFLOW_NODE ||--o{ DELIVERABLE : outputs
AGENT ||--o{ WORKFLOW_NODE : assigned_to
AGENT ||--o{ CHAT_MESSAGE : participates
AGENT ||--o{ AGENT_MODEL : configured_with
AGENT ||--o{ AGENT_SKILL : equipped_with
SKILL ||--o{ AGENT_SKILL : bound_to
```

### 5.2 数据表定义

#### projects（项目表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK, AUTO | 项目ID |
| name | TEXT | NOT NULL | 项目名称 |
| direction | TEXT | NOT NULL | 项目方向/描述 |
| type | TEXT | NOT NULL, CHECK | 项目类型：web/miniapp/app/optimization |
| status | TEXT | DEFAULT 'active', CHECK | 状态：active/paused/completed/archived |
| current_node | TEXT | DEFAULT 'scene_miner' | 当前活跃节点 |
| progress | INTEGER | DEFAULT 0 | 进度百分比 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 更新时间 |

#### agents（Agent表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | TEXT | PK | Agent唯一标识 |
| name | TEXT | NOT NULL | Agent名称 |
| role | TEXT | NOT NULL | 岗位角色 |
| description | TEXT | NOT NULL | 职责描述 |
| prompt_template | TEXT | NOT NULL | 系统提示词 |
| avatar | TEXT | | 头像（图标名或上传路径） |
| status | TEXT | DEFAULT 'active' | 状态 |

#### agent_models（Agent模型配置表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK, AUTO | 配置ID |
| agent_id | TEXT | FK → agents.id | 关联Agent |
| provider | TEXT | NOT NULL | 模型提供商 |
| model_name | TEXT | NOT NULL | 模型名称 |
| api_base | TEXT | NOT NULL | API基础地址 |
| api_key | TEXT | NOT NULL | API密钥 |
| is_active | INTEGER | DEFAULT 0 | 是否为活跃模型 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

#### skills（Skill表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | TEXT | PK | Skill唯一标识 |
| name | TEXT | NOT NULL | Skill名称 |
| description | TEXT | NOT NULL | 功能描述 |
| category | TEXT | NOT NULL | 分类 |
| icon | TEXT | NOT NULL | 图标标识 |
| parameters | TEXT | | 参数定义（JSON） |
| is_builtin | INTEGER | DEFAULT 0 | 是否内置 |
| handler_type | TEXT | DEFAULT 'md_prompt' | 处理类型 |

#### agent_skills（Agent-Skill关联表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK, AUTO | 关联ID |
| agent_id | TEXT | FK → agents.id | 关联Agent |
| skill_id | TEXT | FK → skills.id | 关联Skill |
| enabled | INTEGER | DEFAULT 1 | 是否启用 |
| config | TEXT | | 自定义配置（JSON） |

#### workflow_nodes（工作流节点表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK, AUTO | 节点ID |
| project_id | INTEGER | FK → projects.id | 关联项目 |
| agent_id | TEXT | NOT NULL | 关联Agent |
| name | TEXT | NOT NULL | 节点名称 |
| status | TEXT | DEFAULT 'pending', CHECK | 状态：pending/in_progress/review/completed/rejected |
| sequence | INTEGER | NOT NULL | 执行顺序 |
| started_at | DATETIME | | 开始时间 |
| completed_at | DATETIME | | 完成时间 |
| approved_by | TEXT | | 审批人 |
| approval_comment | TEXT | | 审批意见 |

#### chat_messages（对话消息表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK, AUTO | 消息ID |
| project_id | INTEGER | FK → projects.id | 关联项目 |
| agent_id | TEXT | | 关联Agent |
| role | TEXT | NOT NULL, CHECK | 角色：user/agent/system |
| content | TEXT | NOT NULL | 消息内容 |
| chat_type | TEXT | | 聊天类型（group/individual） |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

#### deliverables（交付物表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK, AUTO | 交付物ID |
| project_id | INTEGER | FK → projects.id | 关联项目 |
| node_id | INTEGER | FK → workflow_nodes.id | 关联节点 |
| title | TEXT | NOT NULL | 标题 |
| content | TEXT | NOT NULL | 内容 |
| type | TEXT | NOT NULL | 类型 |
| version | INTEGER | DEFAULT 1 | 版本号 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

#### daily_reports（日报表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK, AUTO | 日报ID |
| project_id | INTEGER | FK → projects.id | 关联项目 |
| content | TEXT | NOT NULL | 日报内容 |
| blockers | TEXT | | 阻塞项 |
| risks | TEXT | | 风险项 |
| pending_approvals | TEXT | | 待审批项 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

#### project_agents（项目-Agent关联表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK, AUTO | 关联ID |
| project_id | INTEGER | FK → projects.id | 关联项目 |
| agent_id | TEXT | FK → agents.id | 关联Agent |
| joined_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 加入时间 |

#### project_folders（项目文件夹表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK, AUTO | 文件夹ID |
| project_id | INTEGER | FK → projects.id | 关联项目 |
| folder_path | TEXT | NOT NULL | 文件夹路径 |

#### workflow_graphs（工作流图表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK, AUTO | 记录ID |
| project_id | INTEGER | FK → projects.id | 关联项目 |
| nodes | TEXT | NOT NULL | 节点数据（JSON） |
| edges | TEXT | NOT NULL | 边数据（JSON） |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 更新时间 |

---

## 六、API接口列表

### 6.1 Agent管理接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/agents | 获取所有Agent列表 |
| GET | /api/agents/:id | 获取单个Agent详情 |
| POST | /api/agents | 创建自定义Agent |
| PUT | /api/agents/:id | 更新Agent信息 |
| DELETE | /api/agents/:id | 删除Agent |
| PUT | /api/agents/:id/prompt | 更新Agent提示词 |
| POST | /api/agents/upload-md | 上传MD文件（返回内容） |
| POST | /api/agents/upload-avatar | 上传头像图片 |
| GET | /api/agents/:id/models | 获取Agent的模型配置列表 |
| POST | /api/agents/:id/models | 为Agent添加模型配置 |
| PUT | /api/agents/:id/models/:modelId/active | 设置活跃模型 |
| DELETE | /api/agents/:id/models/:modelId | 删除模型配置 |

### 6.2 Skill/Tool接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/skills | 获取所有Skill列表 |
| POST | /api/skills | 创建自定义Skill |
| GET | /api/skills/agents/:agentId | 获取Agent的Skill列表 |
| POST | /api/skills/agents/:agentId/skills/:skillId | 为Agent添加Skill |
| DELETE | /api/skills/agents/:agentId/skills/:skillId | 移除Agent的Skill |
| PUT | /api/skills/agents/:agentId/skills/:skillId/toggle | 切换Skill启用状态 |
| PUT | /api/skills/agents/:agentId/skills/:skillId/config | 更新Skill配置 |
| GET | /api/skills/agents/:agentId/tools-description | 获取Agent工具描述（用于提示词注入） |
| POST | /api/skills/execute | 执行工具调用 |

### 6.3 项目管理接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/projects | 获取项目列表 |
| POST | /api/projects | 创建项目 |
| GET | /api/projects/:id | 获取项目详情（含节点和交付物） |
| GET | /api/projects/:id/agents | 获取项目成员列表 |
| POST | /api/projects/:id/agents/:agentId | 添加Agent到项目 |
| GET | /api/projects/:id/folder | 获取项目文件夹信息 |
| POST | /api/projects/:id/folder | 设置项目工作文件夹 |

### 6.4 工作流接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/projects/:id/nodes | 获取工作流节点列表 |
| PUT | /api/projects/:id/nodes/:nodeId/status | 更新节点状态 |
| POST | /api/projects/:id/nodes/:nodeId/approve | 审批节点 |
| GET | /api/projects/:id/workflow | 获取工作流图数据 |
| POST | /api/projects/:id/workflow | 保存工作流图数据 |
| GET | /api/projects/:id/workflow/next/:agentId | 获取下一个Agent |
| GET | /api/projects/:id/workflow/description | 获取工作流描述（用于提示词注入） |

### 6.5 群聊接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/projects/:id/group-chat | 获取群聊历史 |
| POST | /api/projects/:id/group-chat | 发送群聊消息（含Agent回复） |

### 6.6 文件操作接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/projects/:id/files/read/:path | 读取文件内容 |
| POST | /api/projects/:id/files/write | 写入文件 |
| POST | /api/projects/:id/files/mkdir | 创建目录 |
| POST | /api/projects/:id/files/save-output | 保存Agent输出为文件 |
| DELETE | /api/projects/:id/files/:path | 删除文件 |

### 6.7 交付物接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/projects/:id/deliverables | 获取交付物列表 |
| GET | /api/deliverables/:id | 获取交付物详情 |

### 6.8 日报接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/projects/:id/daily-reports | 获取日报列表 |
| POST | /api/projects/:id/daily-reports | 创建日报 |

---

## 七、页面结构

### 7.1 页面路由

| 路由 | 页面 | 说明 |
|------|------|------|
| / | 项目大厅 | 项目列表、新建项目入口、项目状态概览 |
| /project/:id/workspace | 项目工作区 | 三栏布局：团队成员+群聊/工作流+交付物/工作区 |
| /project/:id/board | 项目看板 | 节点状态跟踪、审批操作、工作流时间线 |
| /project/:id/daily | 日报中心 | 每日项目日报、运营周报 |
| /agents | Agent管理 | Agent列表、提示词编辑、模型配置、Skill管理 |
| /deliverables | 交付物仓库 | 所有项目交付物归档与查看 |

### 7.2 导航结构

- 左侧固定导航栏（64px宽图标导航）
- 导航项：项目大厅、Agent管理、交付物仓库
- 项目内子导航：工作区、看板、日报

---

## 八、设计规范

### 8.1 色彩系统

| 用途 | 色值 | 说明 |
|------|------|------|
| 主色 | #1e1b4b（深靛蓝） | 指挥感、专业感 |
| 强调色 | #f59e0b（琥珀金） | 审批、关键操作高亮 |
| 辅助色 | #64748b（石板灰） | 次要信息 |
| 成功色 | #10b981（翠绿） | 通过/完成 |
| 危险色 | #f43f5e（玫瑰红） | 打回/风险 |
| 信息色 | #3b82f6（蓝色） | 工作流/文件操作 |

### 8.2 角色色彩映射

| Agent角色 | 背景色 | 文字色 |
|-----------|--------|--------|
| 业务挖掘 | bg-blue-100 | text-blue-700 |
| 需求分析 | bg-purple-100 | text-purple-700 |
| 产品设计 | bg-amber-100 | text-amber-700 |
| 技术架构 | bg-cyan-100 | text-cyan-700 |
| 前端开发 | bg-pink-100 | text-pink-700 |
| 后端开发 | bg-emerald-100 | text-emerald-700 |
| 测试验证 | bg-rose-100 | text-rose-700 |
| 运营迭代 | bg-indigo-100 | text-indigo-700 |

### 8.3 字体与图标

- 中文：系统默认无衬线字体
- 英文展示：Geist
- 等宽数据：JetBrains Mono
- 图标：lucide-react，线条风格，统一20px尺寸

### 8.4 组件风格

- 按钮：主按钮琥珀金填充+圆角8px，次要按钮深靛蓝描边
- 卡片：白色背景+圆角12px+浅灰边框
- 弹窗：居中模态+背景遮罩+圆角12px
- 输入框：浅灰边框+聚焦时琥珀金描边

---

## 九、核心流程

### 9.1 项目启动流程

```
用户进入平台 → 点击"新建项目" → 输入项目名称和方向 → 选择项目类型
→ 系统创建项目并初始化工作流节点 → 进入项目工作区
→ 用户设置工作文件夹 → 添加Agent成员 → 开始群聊协作
```

### 9.2 工作流自动流转

```
业务场景挖掘师 → [审批] → 需求分析师 → 产品经理 → [审批]
→ 技术架构师 → [审批] → 前端开发 ‖ 后端开发 → 测试工程师
→ [审批] → 上线 → 运营迭代师 → 反馈回流至业务场景挖掘师
```

**关键审批点**：场景产出后、PRD产出后、技术方案产出后、测试通过后

### 9.3 群聊协作流程

```
用户输入消息（可@Agent） → 后端解析@提及 → 调用对应Agent的AI模型
→ Agent回复（Markdown渲染）→ 检测[TOOL_CALL]标记 → 执行工具
→ 工具结果追加到对话 → 用户可保存Agent输出到工作区
```

### 9.4 工作流编辑流程

```
切换到工作流Tab → 从左侧面板拖拽节点到画布 → 连接节点
→ 设置条件节点条件 → 保存工作流 → 工作流描述注入Agent提示词
```
