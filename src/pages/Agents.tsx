import { useEffect, useState, useRef } from 'react'
import {
  Users, Edit2, Save, X, Search, ClipboardList, Lightbulb, Cpu, Layout, Server, Bug, Activity,
  Plus, Trash2, Upload, CheckCircle, FileText, Image, ChevronDown, ChevronUp, Sparkles, Globe,
  Wrench, Code, BookOpen, BarChart3 as BarChart3Icon, ListChecks
} from 'lucide-react'
import { useStore, type Agent, type AgentModel, type Skill, type AgentSkill } from '@/store'

const agentIcons: Record<string, React.ElementType> = {
  search: Search,
  'clipboard-list': ClipboardList,
  lightbulb: Lightbulb,
  cpu: Cpu,
  layout: Layout,
  server: Server,
  bug: Bug,
  activity: Activity,
}

const skillIconMap: Record<string, React.ElementType> = {
  'file-text': FileText,
  'file-search': FileText,
  'code-2': Code,
  'book-open': BookOpen,
  'bar-chart-3': BarChart3Icon,
  globe: Globe,
  'list-checks': ListChecks,
  wrench: Wrench,
}

const PROVIDER_OPTIONS = [
  { value: 'openai', label: 'OpenAI', icon: Globe, defaultBase: 'https://api.openai.com/v1' },
  { value: 'anthropic', label: 'Anthropic (Claude)', icon: Sparkles, defaultBase: 'https://api.anthropic.com' },
  { value: 'deepseek', label: 'DeepSeek', icon: Sparkles, defaultBase: 'https://api.deepseek.com/v1' },
  { value: 'zhipu', label: '智谱AI (GLM)', icon: Sparkles, defaultBase: 'https://open.bigmodel.cn/api/paas/v4' },
  { value: 'moonshot', label: 'Moonshot (Kimi)', icon: Sparkles, defaultBase: 'https://api.moonshot.cn/v1' },
  { value: 'qwen', label: '通义千问 (Qwen)', icon: Sparkles, defaultBase: 'https://dashscope.aliyuncs.com/compatible-mode/v1' },
  { value: 'custom', label: '自定义 (OpenAI兼容)', icon: Globe, defaultBase: '' },
]

const MODEL_OPTIONS: Record<string, string[]> = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'o3', 'o4-mini', 'gpt-4.1', 'gpt-4.1-mini'],
  anthropic: ['claude-sonnet-4-20250514', 'claude-opus-4-20250514', 'claude-haiku-4-20250514'],
  deepseek: ['deepseek-v4-flash', 'deepseek-v4-pro', 'deepseek-chat', 'deepseek-reasoner'],
  zhipu: ['glm-5', 'glm-4-plus', 'glm-4-flash', 'glm-4v', 'glm-4-long'],
  moonshot: ['kimi-latest', 'moonshot-v1-auto', 'moonshot-v1-128k', 'moonshot-v1-32k'],
  qwen: ['qwen3-max', 'qwen3-plus', 'qwen3-turbo', 'qwen3-coder-plus', 'qwen-vl-max'],
  custom: ['custom-model'],
}

export default function AgentsPage() {
  const { agents, setAgents } = useStore()
  const [editingAgent, setEditingAgent] = useState<string | null>(null)
  const [editPrompt, setEditPrompt] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null)
  const [showModelPanel, setShowModelPanel] = useState<string | null>(null)
  const [showSkillPanel, setShowSkillPanel] = useState<string | null>(null)
  const [allSkills, setAllSkills] = useState<Skill[]>([])
  const [agentSkillsMap, setAgentSkillsMap] = useState<Record<string, AgentSkill[]>>({})
  const mdFileInputRef = useRef<HTMLInputElement>(null)
  const avatarFileInputRef = useRef<HTMLInputElement>(null)
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null)
  const [editingSkillAgentId, setEditingSkillAgentId] = useState<string | null>(null)
  const [editSkillConfig, setEditSkillConfig] = useState('')
  const [showCreateSkillModal, setShowCreateSkillModal] = useState(false)
  const [createSkillForm, setCreateSkillForm] = useState({
    id: '',
    name: '',
    description: '',
    category: '自定义',
    icon: 'wrench',
    handler_type: 'md_prompt',
    behavior_md: '',
  })
  const skillMdFileInputRef = useRef<HTMLInputElement>(null)

  const [createForm, setCreateForm] = useState({
    id: '',
    name: '',
    role: '',
    description: '',
    prompt_template: '',
    avatar: '',
  })

  const [modelForm, setModelForm] = useState({
    provider: 'openai',
    model_name: '',
    api_base: '',
    api_key: '',
    is_active: true,
  })

  useEffect(() => {
    fetch('/api/agents')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setAgents(data.data)
      })

    // 获取所有可用Skills
    fetch('/api/skills')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setAllSkills(data.data)
      })
  }, [setAgents])

  const handleSavePrompt = async (agentId: string) => {
    const res = await fetch(`/api/agents/${agentId}/prompt`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: editPrompt }),
    })
    const data = await res.json()
    if (data.success) {
      setAgents(agents.map((a) => (a.id === agentId ? { ...a, prompt_template: editPrompt } : a)))
      setEditingAgent(null)
    }
  }

  const handleCreateAgent = async () => {
    const res = await fetch('/api/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createForm),
    })
    const data = await res.json()
    if (data.success) {
      setAgents([...agents, data.data])
      setShowCreateModal(false)
      setCreateForm({ id: '', name: '', role: '', description: '', prompt_template: '', avatar: '' })
    }
  }

  const handleDeleteAgent = async (agentId: string) => {
    if (!confirm('确定要删除这个Agent吗？')) return
    const res = await fetch(`/api/agents/${agentId}`, { method: 'DELETE' })
    const data = await res.json()
    if (data.success) {
      setAgents(agents.filter((a) => a.id !== agentId))
    }
  }

  const handleUploadMD = async (e: React.ChangeEvent<HTMLInputElement>, agentId?: string) => {
    const file = e.target.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch('/api/agents/upload-md', {
      method: 'POST',
      body: formData,
    })
    const data = await res.json()
    if (data.success) {
      if (agentId) {
        // 上传MD后自动进入编辑模式，覆盖原有提示词
        setEditingAgent(agentId)
        setEditPrompt(data.data.content)
      } else {
        setCreateForm({ ...createForm, prompt_template: data.data.content })
      }
    }
    // 清空input以允许重复上传同一文件
    e.target.value = ''
  }

  const handleUploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>, agentId?: string) => {
    const file = e.target.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch('/api/agents/upload-avatar', {
      method: 'POST',
      body: formData,
    })
    const data = await res.json()
    if (data.success) {
      if (agentId) {
        const updated = await fetch(`/api/agents/${agentId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ avatar: data.data.url }),
        }).then((r) => r.json())
        if (updated.success) {
          setAgents(agents.map((a) => (a.id === agentId ? { ...a, avatar: data.data.url } : a)))
        }
      } else {
        setCreateForm({ ...createForm, avatar: data.data.url })
      }
    }
  }

  const handleAddModel = async (agentId: string) => {
    const res = await fetch(`/api/agents/${agentId}/models`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(modelForm),
    })
    const data = await res.json()
    if (data.success) {
      setAgents(
        agents.map((a) =>
          a.id === agentId
            ? { ...a, models: [...(a.models || []), data.data] }
            : a
        )
      )
      setModelForm({ provider: 'openai', model_name: '', api_base: '', api_key: '', is_active: true })
    }
  }

  const handleSetActiveModel = async (agentId: string, modelId: number) => {
    const res = await fetch(`/api/agents/${agentId}/models/${modelId}/active`, {
      method: 'PUT',
    })
    const data = await res.json()
    if (data.success) {
      setAgents(
        agents.map((a) =>
          a.id === agentId
            ? {
                ...a,
                models: (a.models || []).map((m) => ({
                  ...m,
                  is_active: m.id === modelId ? 1 : 0,
                })),
              }
            : a
        )
      )
    }
  }

  const handleDeleteModel = async (agentId: string, modelId: number) => {
    const res = await fetch(`/api/agents/${agentId}/models/${modelId}`, { method: 'DELETE' })
    const data = await res.json()
    if (data.success) {
      setAgents(
        agents.map((a) =>
          a.id === agentId
            ? { ...a, models: (a.models || []).filter((m) => m.id !== modelId) }
            : a
        )
      )
    }
  }

  // 获取Agent的Skills
  const fetchAgentSkills = async (agentId: string) => {
    const res = await fetch(`/api/skills/agents/${agentId}`)
    const data = await res.json()
    if (data.success) {
      setAgentSkillsMap((prev) => ({ ...prev, [agentId]: data.data }))
    }
  }

  // 打开Skill面板时加载该Agent的Skills
  const handleOpenSkillPanel = async (agentId: string) => {
    if (showSkillPanel === agentId) {
      setShowSkillPanel(null)
    } else {
      setShowSkillPanel(agentId)
      if (!agentSkillsMap[agentId]) {
        await fetchAgentSkills(agentId)
      }
    }
  }

  // 为Agent添加Skill
  const handleAddSkill = async (agentId: string, skillId: string) => {
    const res = await fetch(`/api/skills/agents/${agentId}/skills/${skillId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    const data = await res.json()
    if (data.success) {
      setAgentSkillsMap((prev) => ({
        ...prev,
        [agentId]: [...(prev[agentId] || []), data.data],
      }))
    }
  }

  // 移除Agent的Skill
  const handleRemoveSkill = async (agentId: string, skillId: string) => {
    const res = await fetch(`/api/skills/agents/${agentId}/skills/${skillId}`, {
      method: 'DELETE',
    })
    const data = await res.json()
    if (data.success) {
      setAgentSkillsMap((prev) => ({
        ...prev,
        [agentId]: (prev[agentId] || []).filter((s) => s.skill_id !== skillId),
      }))
    }
  }

  // 切换Skill启用状态
  const handleToggleSkill = async (agentId: string, skillId: string, enabled: boolean) => {
    const res = await fetch(`/api/skills/agents/${agentId}/skills/${skillId}/toggle`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    })
    const data = await res.json()
    if (data.success) {
      setAgentSkillsMap((prev) => ({
        ...prev,
        [agentId]: (prev[agentId] || []).map((s) =>
          s.skill_id === skillId ? { ...s, enabled: enabled ? 1 : 0 } : s
        ),
      }))
    }
  }

  // 编辑Skill配置
  const handleEditSkillConfig = (agentId: string, skillId: string) => {
    const agentSkill = agentSkillsMap[agentId]?.find((s) => s.skill_id === skillId)
    if (agentSkill) {
      setEditingSkillAgentId(agentId)
      setEditingSkillId(skillId)
      setEditSkillConfig(JSON.stringify(agentSkill.config || {}, null, 2))
    }
  }

  // 保存Skill配置
  const handleSaveSkillConfig = async () => {
    if (!editingSkillAgentId || !editingSkillId) return
    try {
      const config = JSON.parse(editSkillConfig)
      const res = await fetch(`/api/skills/agents/${editingSkillAgentId}/skills/${editingSkillId}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      })
      const data = await res.json()
      if (data.success) {
        setAgentSkillsMap((prev) => ({
          ...prev,
          [editingSkillAgentId]: (prev[editingSkillAgentId] || []).map((s) =>
            s.skill_id === editingSkillId ? { ...s, config } : s
          ),
        }))
        setEditingSkillId(null)
        setEditingSkillAgentId(null)
        setEditSkillConfig('')
      }
    } catch {
      alert('JSON格式错误，请检查输入')
    }
  }

  // 创建自定义Skill
  const handleCreateSkill = async () => {
    try {
      const res = await fetch('/api/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: createSkillForm.id,
          name: createSkillForm.name,
          description: createSkillForm.description,
          category: createSkillForm.category,
          icon: createSkillForm.icon,
          handler_type: createSkillForm.handler_type,
          parameters: createSkillForm.behavior_md ? [{ name: 'behavior', type: 'string', desc: 'Skill行为定义', required: true }] : [],
        }),
      })
      const data = await res.json()
      if (data.success) {
        setAllSkills([...allSkills, data.data])
        setShowCreateSkillModal(false)
        setCreateSkillForm({
          id: '',
          name: '',
          description: '',
          category: '自定义',
          icon: 'wrench',
          handler_type: 'md_prompt',
          behavior_md: '',
        })
      }
    } catch (error) {
      alert('创建Skill失败: ' + (error as Error).message)
    }
  }

  // 上传Skill行为MD文件
  const handleUploadSkillMD = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch('/api/agents/upload-md', {
      method: 'POST',
      body: formData,
    })
    const data = await res.json()
    if (data.success) {
      setCreateSkillForm({ ...createSkillForm, behavior_md: data.data.content })
    }
    e.target.value = ''
  }

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      scene_miner: '业务挖掘',
      requirement_analyst: '需求分析',
      product_manager: '产品设计',
      tech_architect: '技术架构',
      frontend_dev: '前端开发',
      backend_dev: '后端开发',
      test_engineer: '测试验证',
      ops_iter: '运营迭代',
    }
    return labels[role] || role
  }

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      scene_miner: 'bg-blue-100 text-blue-700',
      requirement_analyst: 'bg-purple-100 text-purple-700',
      product_manager: 'bg-amber-100 text-amber-700',
      tech_architect: 'bg-cyan-100 text-cyan-700',
      frontend_dev: 'bg-pink-100 text-pink-700',
      backend_dev: 'bg-emerald-100 text-emerald-700',
      test_engineer: 'bg-rose-100 text-rose-700',
      ops_iter: 'bg-indigo-100 text-indigo-700',
    }
    return colors[role] || 'bg-slate-100 text-slate-700'
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1e1b4b]">Agent管理</h1>
          <p className="text-slate-500 text-sm mt-1">配置和管理您的AI团队成员</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-lg font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          新增Agent
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {agents.map((agent: Agent) => {
          const AgentIcon = agent.avatar?.startsWith('/uploads/')
            ? null
            : agentIcons[agent.avatar] || Users
          const isExpanded = expandedAgent === agent.id
          const isModelPanelOpen = showModelPanel === agent.id

          return (
            <div key={agent.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-100">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {agent.avatar?.startsWith('/uploads/') ? (
                      <img
                        src={`http://localhost:3001${agent.avatar}`}
                        alt={agent.name}
                        className="w-12 h-12 rounded-xl object-cover"
                      />
                    ) : (
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getRoleColor(agent.role)}`}>
                        {AgentIcon && <AgentIcon className="w-6 h-6" />}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-[#1e1b4b]">{agent.name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getRoleColor(agent.role)}`}>
                          {getRoleLabel(agent.role)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 mt-0.5">{agent.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-full ${agent.status === 'active' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      <span className="text-xs text-slate-400">
                        {agent.status === 'active' ? '在线' : '离线'}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteAgent(agent.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 模型状态 */}
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <button
                    onClick={() => setShowModelPanel(showModelPanel === agent.id ? null : agent.id)}
                    className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                  >
                    <Sparkles className="w-3 h-3" />
                    {agent.models?.find((m) => m.is_active === 1)
                      ? `使用模型: ${agent.models.find((m) => m.is_active === 1)?.model_name}`
                      : '未配置模型'}
                    {isModelPanelOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                  <button
                    onClick={() => handleOpenSkillPanel(agent.id)}
                    className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg transition-colors ${
                      showSkillPanel === agent.id
                        ? 'bg-violet-100 text-violet-700'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Wrench className="w-3 h-3" />
                    Skills
                    {(agentSkillsMap[agent.id] || []).length > 0 && (
                      <span className="bg-violet-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-medium">
                        {(agentSkillsMap[agent.id] || []).filter((s) => s.enabled).length}
                      </span>
                    )}
                    {showSkillPanel === agent.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                  <button
                    onClick={() => setExpandedAgent(isExpanded ? null : agent.id)}
                    className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                  >
                    <FileText className="w-3 h-3" />
                    提示词
                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                  <button
                    onClick={() => avatarFileInputRef.current?.click()}
                    className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                  >
                    <Image className="w-3 h-3" />
                    上传头像
                  </button>
                  <input
                    ref={avatarFileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleUploadAvatar(e, agent.id)}
                  />
                </div>
              </div>

              {/* 模型配置面板 */}
              {isModelPanelOpen && (
                <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                  <h4 className="text-sm font-semibold text-slate-700 mb-3">AI模型配置</h4>

                  {/* 已配置模型列表 */}
                  {agent.models && agent.models.length > 0 && (
                    <div className="space-y-2 mb-4">
                      {agent.models.map((model: AgentModel) => (
                        <div
                          key={model.id}
                          className={`flex items-center justify-between p-2.5 rounded-lg border ${
                            model.is_active === 1
                              ? 'border-amber-300 bg-amber-50'
                              : 'border-slate-200 bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {model.is_active === 1 && <CheckCircle className="w-4 h-4 text-amber-500" />}
                            <span className="text-sm font-medium text-slate-700">{model.model_name}</span>
                            <span className="text-xs text-slate-400">{PROVIDER_OPTIONS.find((p) => p.value === model.provider)?.label}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {model.is_active !== 1 && (
                              <button
                                onClick={() => handleSetActiveModel(agent.id, model.id)}
                                className="text-xs px-2 py-1 rounded bg-[#1e1b4b] text-white hover:bg-[#2d2a5e] transition-colors"
                              >
                                启用
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteModel(agent.id, model.id)}
                              className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 添加新模型 */}
                  <div className="bg-white rounded-lg border border-slate-200 p-3 space-y-3">
                    <div className="text-xs font-medium text-slate-500">添加模型</div>
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={modelForm.provider}
                        onChange={(e) => {
                          const provider = e.target.value
                          const defaultBase = PROVIDER_OPTIONS.find((p) => p.value === provider)?.defaultBase || ''
                          setModelForm({
                            ...modelForm,
                            provider,
                            api_base: defaultBase,
                            model_name: MODEL_OPTIONS[provider]?.[0] || '',
                          })
                        }}
                        className="text-sm px-2.5 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        {PROVIDER_OPTIONS.map((p) => (
                          <option key={p.value} value={p.value}>{p.label}</option>
                        ))}
                      </select>
                      <select
                        value={modelForm.model_name}
                        onChange={(e) => setModelForm({ ...modelForm, model_name: e.target.value })}
                        className="text-sm px-2.5 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        {MODEL_OPTIONS[modelForm.provider]?.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>
                    <input
                      type="text"
                      value={modelForm.api_base}
                      onChange={(e) => setModelForm({ ...modelForm, api_base: e.target.value })}
                      placeholder="API Base URL"
                      className="w-full text-sm px-2.5 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <input
                      type="password"
                      value={modelForm.api_key}
                      onChange={(e) => setModelForm({ ...modelForm, api_key: e.target.value })}
                      placeholder="API Key"
                      className="w-full text-sm px-2.5 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <label className="flex items-center gap-2 text-sm text-slate-600">
                      <input
                        type="checkbox"
                        checked={modelForm.is_active}
                        onChange={(e) => setModelForm({ ...modelForm, is_active: e.target.checked })}
                        className="rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                      />
                      设为默认模型
                    </label>
                    <button
                      onClick={() => handleAddModel(agent.id)}
                      disabled={!modelForm.model_name || !modelForm.api_key}
                      className="w-full text-sm px-3 py-2 bg-[#1e1b4b] text-white rounded-lg hover:bg-[#2d2a5e] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      添加模型
                    </button>
                  </div>
                </div>
              )}

              {/* Skill管理面板 */}
              {showSkillPanel === agent.id && (
                <div className="p-4 border-b border-slate-100 bg-violet-50/30">
                  <h4 className="text-sm font-semibold text-slate-700 mb-3">技能工具管理</h4>

                  {/* 按分类显示Skills */}
                  {['文件操作', '开发工具', '文档工具', '分析工具', '信息获取', '项目管理', '自定义'].map((category) => {
                    const categorySkills = allSkills.filter((s) => s.category === category)
                    if (categorySkills.length === 0) return null

                    const agentSkillList = agentSkillsMap[agent.id] || []

                    return (
                      <div key={category} className="mb-4 last:mb-0">
                        <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">{category}</div>
                        <div className="space-y-2">
                          {categorySkills.map((skill: Skill) => {
                            const SkillIcon = skillIconMap[skill.icon] || Wrench
                            const agentSkill = agentSkillList.find((as: AgentSkill) => as.skill_id === skill.id)
                            const isAdded = !!agentSkill
                            const isEnabled = isAdded && agentSkill.enabled === 1

                            return (
                              <div
                                key={skill.id}
                                className={`flex items-center justify-between p-2.5 rounded-lg border transition-colors ${
                                  isEnabled
                                    ? 'border-violet-300 bg-violet-50'
                                    : isAdded
                                    ? 'border-slate-200 bg-white'
                                    : 'border-slate-200 bg-white/60 opacity-70'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                    isEnabled ? 'bg-violet-100' : 'bg-slate-100'
                                  }`}>
                                    <SkillIcon className={`w-4 h-4 ${isEnabled ? 'text-violet-600' : 'text-slate-500'}`} />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-sm font-medium text-slate-700">{skill.name}</span>
                                      {isEnabled && (
                                        <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-medium">已启用</span>
                                      )}
                                      {isAdded && !isEnabled && (
                                        <span className="text-[10px] px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded-full font-medium">已禁用</span>
                                      )}
                                    </div>
                                    <p className="text-xs text-slate-500 truncate">{skill.description}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                                  {isAdded ? (
                                    <>
                                      <button
                                        onClick={() => handleEditSkillConfig(agent.id, skill.id)}
                                        className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
                                        title="编辑配置"
                                      >
                                        <Edit2 className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => handleToggleSkill(agent.id, skill.id, !isEnabled)}
                                        className={`p-1.5 rounded-md transition-colors ${
                                          isEnabled
                                            ? 'text-emerald-600 hover:bg-emerald-100'
                                            : 'text-slate-400 hover:bg-slate-100'
                                        }`}
                                        title={isEnabled ? '禁用' : '启用'}
                                      >
                                        {isEnabled ? <CheckCircle className="w-4 h-4" /> : <div className="w-4 h-4 rounded border-2 border-slate-300" />}
                                      </button>
                                      <button
                                        onClick={() => handleRemoveSkill(agent.id, skill.id)}
                                        className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-md transition-colors"
                                        title="移除"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      onClick={() => handleAddSkill(agent.id, skill.id)}
                                      className="text-xs px-2.5 py-1.5 bg-violet-600 text-white rounded-md hover:bg-violet-700 transition-colors font-medium"
                                    >
                                      添加
                                    </button>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}

                  {allSkills.length === 0 && (
                    <div className="text-sm text-slate-400 text-center py-4">暂无可用技能</div>
                  )}

                  <div className="mt-4 pt-3 border-t border-slate-200">
                    <button
                      onClick={() => setShowCreateSkillModal(true)}
                      className="w-full flex items-center justify-center gap-1.5 text-xs px-3 py-2 bg-violet-100 text-violet-700 rounded-lg hover:bg-violet-200 transition-colors font-medium"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      创建自定义Skill
                    </button>
                  </div>
                </div>
              )}

              {/* 提示词面板 */}
              {isExpanded && (
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-slate-700">系统提示词</h4>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => mdFileInputRef.current?.click()}
                        className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 font-medium transition-colors"
                      >
                        <Upload className="w-3 h-3" />
                        上传MD文件
                      </button>
                      <input
                        ref={mdFileInputRef}
                        type="file"
                        accept=".md,.markdown"
                        className="hidden"
                        onChange={(e) => handleUploadMD(e, agent.id)}
                      />
                      {editingAgent === agent.id ? (
                        <>
                          <button
                            onClick={() => handleSavePrompt(agent.id)}
                            className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
                          >
                            <Save className="w-3 h-3" />
                            保存
                          </button>
                          <button
                            onClick={() => setEditingAgent(null)}
                            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-600 font-medium transition-colors"
                          >
                            <X className="w-3 h-3" />
                            取消
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingAgent(agent.id)
                            setEditPrompt(agent.prompt_template)
                          }}
                          className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 font-medium transition-colors"
                        >
                          <Edit2 className="w-3 h-3" />
                          编辑
                        </button>
                      )}
                    </div>
                  </div>

                  {editingAgent === agent.id ? (
                    <textarea
                      value={editPrompt}
                      onChange={(e) => setEditPrompt(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent h-40 resize-none text-sm"
                    />
                  ) : (
                    <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600 max-h-40 overflow-auto">
                      <pre className="whitespace-pre-wrap font-sans">{agent.prompt_template}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 创建Agent弹窗 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-auto">
            <h2 className="text-xl font-bold text-[#1e1b4b] mb-4">新增Agent</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Agent ID</label>
                <input
                  type="text"
                  value={createForm.id}
                  onChange={(e) => setCreateForm({ ...createForm, id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                  placeholder="唯一标识，如：custom_agent_1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">名称</label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                  placeholder="Agent显示名称"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">岗位/角色</label>
                <input
                  type="text"
                  value={createForm.role}
                  onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                  placeholder="如：product_manager"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">描述</label>
                <input
                  type="text"
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                  placeholder="简要描述该Agent的职责"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">角色定义（提示词）</label>
                <div className="flex gap-2 mb-2">
                  <button
                    onClick={() => mdFileInputRef.current?.click()}
                    className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 font-medium transition-colors"
                  >
                    <Upload className="w-3 h-3" />
                    上传MD文件
                  </button>
                  <input
                    ref={mdFileInputRef}
                    type="file"
                    accept=".md,.markdown"
                    className="hidden"
                    onChange={(e) => handleUploadMD(e)}
                  />
                </div>
                <textarea
                  value={createForm.prompt_template}
                  onChange={(e) => setCreateForm({ ...createForm, prompt_template: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 h-32 resize-none text-sm"
                  placeholder="输入系统提示词，或上传MD文件自动填充..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">头像</label>
                <div className="flex items-center gap-3">
                  {createForm.avatar ? (
                    <img
                      src={`http://localhost:3001${createForm.avatar}`}
                      alt="avatar"
                      className="w-12 h-12 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                      <Image className="w-5 h-5 text-slate-400" />
                    </div>
                  )}
                  <button
                    onClick={() => avatarFileInputRef.current?.click()}
                    className="text-sm px-3 py-1.5 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    上传图片
                  </button>
                  <input
                    ref={avatarFileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleUploadAvatar(e)}
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
              >
                取消
              </button>
              <button
                onClick={handleCreateAgent}
                disabled={!createForm.id || !createForm.name || !createForm.role}
                className="flex-1 px-4 py-2.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 编辑Skill配置弹窗 */}
      {editingSkillId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-auto">
            <h2 className="text-xl font-bold text-[#1e1b4b] mb-4">编辑Skill配置</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">配置 (JSON格式)</label>
                <textarea
                  value={editSkillConfig}
                  onChange={(e) => setEditSkillConfig(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 h-64 resize-none text-sm font-mono"
                  placeholder='{"key": "value"}'
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setEditingSkillId(null)
                  setEditingSkillAgentId(null)
                  setEditSkillConfig('')
                }}
                className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
              >
                取消
              </button>
              <button
                onClick={handleSaveSkillConfig}
                className="flex-1 px-4 py-2.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-medium"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 创建自定义Skill弹窗 */}
      {showCreateSkillModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-auto">
            <h2 className="text-xl font-bold text-[#1e1b4b] mb-4">创建自定义Skill</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Skill ID</label>
                <input
                  type="text"
                  value={createSkillForm.id}
                  onChange={(e) => setCreateSkillForm({ ...createSkillForm, id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                  placeholder="唯一标识，如：custom_skill_1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">名称</label>
                <input
                  type="text"
                  value={createSkillForm.name}
                  onChange={(e) => setCreateSkillForm({ ...createSkillForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                  placeholder="Skill显示名称"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">描述</label>
                <input
                  type="text"
                  value={createSkillForm.description}
                  onChange={(e) => setCreateSkillForm({ ...createSkillForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                  placeholder="简要描述该Skill的功能"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">分类</label>
                <select
                  value={createSkillForm.category}
                  onChange={(e) => setCreateSkillForm({ ...createSkillForm, category: e.target.value })}
                  className="w-full text-sm px-2.5 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="文件操作">文件操作</option>
                  <option value="开发工具">开发工具</option>
                  <option value="文档工具">文档工具</option>
                  <option value="分析工具">分析工具</option>
                  <option value="信息获取">信息获取</option>
                  <option value="项目管理">项目管理</option>
                  <option value="自定义">自定义</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">处理类型</label>
                <select
                  value={createSkillForm.handler_type}
                  onChange={(e) => setCreateSkillForm({ ...createSkillForm, handler_type: e.target.value })}
                  className="w-full text-sm px-2.5 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="md_prompt">MD提示词</option>
                  <option value="api_call">API调用</option>
                  <option value="script">脚本执行</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">行为定义</label>
                <div className="flex gap-2 mb-2">
                  <button
                    onClick={() => skillMdFileInputRef.current?.click()}
                    className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 font-medium transition-colors"
                  >
                    <Upload className="w-3 h-3" />
                    上传MD文件
                  </button>
                  <input
                    ref={skillMdFileInputRef}
                    type="file"
                    accept=".md,.markdown"
                    className="hidden"
                    onChange={handleUploadSkillMD}
                  />
                </div>
                <textarea
                  value={createSkillForm.behavior_md}
                  onChange={(e) => setCreateSkillForm({ ...createSkillForm, behavior_md: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 h-32 resize-none text-sm font-mono"
                  placeholder="输入Skill行为定义，或上传MD文件自动填充..."
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateSkillModal(false)}
                className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
              >
                取消
              </button>
              <button
                onClick={handleCreateSkill}
                disabled={!createSkillForm.id || !createSkillForm.name}
                className="flex-1 px-4 py-2.5 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
