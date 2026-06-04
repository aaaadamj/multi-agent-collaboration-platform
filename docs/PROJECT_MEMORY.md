# 项目记忆文件

## 项目名称：多Agent协同工作平台

## 项目概述

这是一个多Agent分级调用与协作平台，支持9个Agent（8个业务Agent + 1个运营迭代师）组成完整软件团队，通过群聊模式推进项目，支持可视化工作流编辑和Skill/Tool系统。

---

## 开发历程

### 第一阶段：基础架构搭建

- 初始化 React 18 + TypeScript + Vite + Tailwind CSS 前端项目
- 初始化 Express 4 + TypeScript (ESM) 后端项目
- 配置 SQLite 数据库，创建所有表结构
- 实现基础 CRUD API

### 第二阶段：Agent系统

- 实现8个预设Agent的初始化
- Agent CRUD功能（名称、岗位、角色定义、提示词、头像）
- 多模型接入：OpenAI/Anthropic/DeepSeek/智谱/Moonshot/通义千问/自定义
- 默认配置DeepSeek Flash模型
- 提示词MD文件上传覆盖功能（修复路由匹配顺序问题）
- 头像上传功能

### 第三阶段：项目与群聊

- 项目CRUD + Agent多选 + 工作文件夹设置
- 群聊模式：所有Agent在同一窗口回复
- @功能：用户@Agent定向通知、Agent@Agent工作接力
- 消息Markdown渲染

### 第四阶段：Skill/Tool系统

- 7个内置Skill定义
- 自定义Skill创建 + MD上传
- Agent-Skill关联管理
- 工具执行引擎：解析[TOOL_CALL]标记并执行7种工具

### 第五阶段：文件系统

- 项目级文件夹权限系统
- 文件树浏览、CRUD、预览
- 路径安全校验（resolveSafePath防目录穿越）
- Agent输出保存为文件

### 第六阶段：可视化工作流

- @xyflow/react画布编辑器
- 4种自定义节点：Agent/Condition/Start/End
- 节点连线（串联/并联/条件分支）
- 工作流保存到数据库
- 工作流描述注入Agent提示词
- 节点操作卡片（复制/删除/条件设置）
- 工具面板折叠/展开

### 第七阶段：UI优化与部署

- 三栏布局面板拖拽调整宽度
- 一键部署BAT脚本（自动安装Node.js + 清理端口 + 安装依赖）
- HTML检测页面
- Mac/Linux启动脚本

---

## 已解决的关键问题

1. **Agents.tsx语法错误**：FileText重复导入，esbuild不支持同一导入中的别名
2. **MD文件上传路由匹配**：upload-md路由在/:id之后注册导致匹配错误
3. **Agent提示词上传MD后不显示**：上传后需自动进入编辑模式
4. **端口3001被占用**：启动脚本添加自动端口清理
5. **writeFileSync类型错误**：encoding参数类型断言
6. **remarkGfm类型错误**：使用as any
7. **useReactFlow在ReactFlow外部调用报错**：移除不必要的useReactFlow调用

---

## 当前文件结构

```
├── api/                    # 后端代码
│   ├── db/index.ts         # 数据库初始化与迁移
│   ├── routes/             # API路由
│   │   ├── agents.ts       # Agent管理
│   │   ├── auth.ts         # 认证
│   │   ├── deliverables.ts # 交付物
│   │   ├── files.ts        # 文件操作
│   │   ├── projects.ts     # 项目管理+群聊
│   │   ├── reports.ts      # 日报
│   │   ├── skills.ts       # Skill管理
│   │   └── workflowEditor.ts # 工作流编辑
│   ├── services/           # 业务逻辑
│   │   ├── agentService.ts # Agent回复生成
│   │   ├── deliverableService.ts
│   │   ├── fileService.ts  # 文件系统服务
│   │   ├── projectService.ts
│   │   ├── reportService.ts
│   │   ├── skillService.ts # Skill+工具执行
│   │   ├── workflowEditorService.ts
│   │   └── workflowService.ts
│   ├── utils/llmCaller.ts  # LLM调用工具
│   ├── app.ts              # Express应用
│   ├── index.ts            # 入口
│   └── server.ts           # 服务器配置
├── src/                    # 前端代码
│   ├── components/
│   │   ├── Layout.tsx      # 全局布局
│   │   ├── WorkflowEditor.tsx # 工作流画布
│   │   └── Empty.tsx
│   ├── pages/
│   │   ├── Home.tsx        # 首页
│   │   ├── Workspace.tsx   # 项目工作区
│   │   ├── Agents.tsx      # Agent管理
│   │   ├── Board.tsx       # 看板
│   │   ├── DailyReport.tsx # 日报
│   │   └── Deliverables.tsx
│   ├── store/index.ts      # Zustand状态
│   ├── App.tsx             # 路由配置
│   ├── main.tsx            # 入口
│   └── index.css           # 全局样式
├── data/                   # 数据目录
│   └── agent_platform.db   # SQLite数据库
├── docs/                   # 文档目录
├── 第一步点我部署环境.bat   # 一键部署脚本
├── 打开平台.html           # 部署检测页面
├── start.sh               # Mac/Linux启动
└── package.json
```

---

## 技术债务与待优化项

- 工作流目前是"软约束"模式（通过提示词引导），未实现自动调度
- 条件节点的条件判断依赖Agent自行理解，未实现程序化条件评估
- 缺少用户认证系统的完整实现
- 缺少WebSocket实时通信（当前使用轮询）
- 缺少单元测试和集成测试
