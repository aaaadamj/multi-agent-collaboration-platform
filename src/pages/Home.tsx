import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Clock, ArrowRight, Users, Check, FolderOpen } from 'lucide-react'
import { useStore, type Project, type Agent } from '@/store'

export default function Home() {
  const navigate = useNavigate()
  const { projects, setProjects, agents, setAgents } = useStore()
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({ name: '', direction: '', type: 'web', folderName: '' })
  const [selectedAgents, setSelectedAgents] = useState<string[]>([])

  useEffect(() => {
    Promise.all([
      fetch('/api/projects').then((r) => r.json()),
      fetch('/api/agents').then((r) => r.json()),
    ]).then(([projData, agentData]) => {
      if (projData.success) setProjects(projData.data)
      if (agentData.success) setAgents(agentData.data)
    }).catch(console.error)
  }, [setProjects, setAgents])

  const handleCreate = async () => {
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          agentIds: selectedAgents.length > 0 ? selectedAgents : undefined,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setProjects([data.data, ...projects])
        setShowModal(false)
        setFormData({ name: '', direction: '', type: 'web', folderName: '' })
        setSelectedAgents([])
        navigate(`/project/${data.data.id}/workspace`)
      }
    } catch (error) {
      console.error('创建项目失败:', error)
    }
  }

  const toggleAgent = (agentId: string) => {
    setSelectedAgents((prev) =>
      prev.includes(agentId) ? prev.filter((id) => id !== agentId) : [...prev, agentId]
    )
  }

  const selectAllAgents = () => {
    setSelectedAgents(agents.map((a: Agent) => a.id))
  }

  const clearSelection = () => {
    setSelectedAgents([])
  }

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      web: '网页设计',
      miniapp: '小程序',
      app: 'App',
      optimization: '优化',
    }
    return labels[type] || type
  }

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      web: 'bg-blue-100 text-blue-700',
      miniapp: 'bg-green-100 text-green-700',
      app: 'bg-purple-100 text-purple-700',
      optimization: 'bg-orange-100 text-orange-700',
    }
    return colors[type] || 'bg-slate-100 text-slate-700'
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1e1b4b]">项目大厅</h1>
          <p className="text-slate-500 text-sm mt-1">管理您的所有AI团队协作项目</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-lg font-medium transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          新建项目
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Plus className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-700 mb-2">还没有项目</h3>
          <p className="text-slate-500 mb-4">点击右上角按钮创建您的第一个AI团队协作项目</p>
          <button
            onClick={() => setShowModal(true)}
            className="bg-[#1e1b4b] text-white px-6 py-2.5 rounded-lg font-medium hover:bg-[#2d2a5e] transition-colors"
          >
            立即创建
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(projects as Project[]).map((project) => (
            <div
              key={project.id}
              onClick={() => navigate(`/project/${project.id}/workspace`)}
              className="bg-white rounded-xl border border-slate-200 p-5 cursor-pointer hover:shadow-lg hover:border-amber-300 transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${getTypeColor(project.type)}`}>
                  {getTypeLabel(project.type)}
                </span>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                  project.status === 'active' ? 'bg-emerald-100 text-emerald-700'
                  : project.status === 'completed' ? 'bg-slate-100 text-slate-700'
                  : 'bg-amber-100 text-amber-700'
                }`}>
                  {project.status === 'active' ? '进行中' : project.status === 'completed' ? '已完成' : '已暂停'}
                </span>
              </div>

              <h3 className="text-lg font-semibold text-[#1e1b4b] mb-2 group-hover:text-amber-600 transition-colors">
                {project.name}
              </h3>
              <p className="text-slate-500 text-sm mb-4 line-clamp-2">{project.direction}</p>

              <div className="mb-3">
                <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                  <span>进度</span>
                  <span>{project.progress}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className="bg-amber-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{new Date(project.created_at).toLocaleDateString('zh-CN')}</span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-amber-500 transition-colors" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 创建项目弹窗 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl p-6 shadow-2xl max-h-[90vh] overflow-auto">
            <h2 className="text-xl font-bold text-[#1e1b4b] mb-4">新建项目</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">项目名称 *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="输入项目名称"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">项目方向/需求 *</label>
                <textarea
                  value={formData.direction}
                  onChange={(e) => setFormData({ ...formData, direction: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent h-24 resize-none"
                  placeholder="描述您的项目方向或核心需求..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">项目类型 *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  <option value="web">网页设计</option>
                  <option value="miniapp">小程序</option>
                  <option value="app">App</option>
                  <option value="optimization">前后端优化</option>
                </select>
              </div>

              {/* 工作文件夹设置 */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
                <div className="flex items-center gap-2 mb-2">
                  <FolderOpen className="w-4 h-4 text-blue-600" />
                  <label className="block text-sm font-medium text-blue-800">
                    项目工作文件夹
                  </label>
                </div>
                <p className="text-xs text-blue-600 mb-2.5">
                  为项目分配一个专属文件夹，所有Agent成员将拥有该文件夹的完整读写权限，可生成Markdown、代码等文件
                </p>
                <input
                  type="text"
                  value={formData.folderName}
                  onChange={(e) => setFormData({ ...formData, folderName: e.target.value })}
                  className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-white text-sm"
                  placeholder="输入文件夹名称（如：电商小程序-v1）"
                />
                {formData.folderName && (
                  <p className="text-[10px] text-blue-500 mt-1.5 flex items-center gap-1">
                    <FolderOpen className="w-3 h-3" />
                    文件夹路径：project-workspace/project-{formData.folderName.replace(/[<>:"/\\|?*]/g, '_')}
                  </p>
                )}
              </div>

              {/* Agent选择区域 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-slate-700">
                    选择参与项目的Agent成员
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={selectAllAgents}
                      className="text-xs text-amber-600 hover:text-amber-700 font-medium"
                    >
                      全选
                    </button>
                    <button
                      type="button"
                      onClick={clearSelection}
                      className="text-xs text-slate-500 hover:text-slate-700 font-medium"
                    >
                      清空
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mb-3">
                  已选择 {selectedAgents.length} 个Agent（不选则默认使用全部8个标准Agent）
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-48 overflow-auto p-1">
                  {(agents as Agent[]).map((agent) => {
                    const isSelected = selectedAgents.includes(agent.id)
                    return (
                      <button
                        key={agent.id}
                        type="button"
                        onClick={() => toggleAgent(agent.id)}
                        className={`flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all ${
                          isSelected
                            ? 'border-amber-400 bg-amber-50 shadow-sm'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                          isSelected ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-400'
                        }`}>
                          {isSelected ? <Check className="w-3.5 h-3.5" /> : null}
                        </div>
                        <div className="min-w-0">
                          <div className={`text-xs font-medium truncate ${isSelected ? 'text-amber-800' : 'text-slate-700'}`}>
                            {agent.name}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">{agent.description}</div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
              >
                取消
              </button>
              <button
                onClick={handleCreate}
                disabled={!formData.name || !formData.direction}
                className="flex-1 px-4 py-2.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                创建并进入
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
