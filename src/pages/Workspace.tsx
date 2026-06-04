import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import {
  Send, User, Bot, CheckCircle, XCircle, Loader2, FileText,
  Plus, MessageSquare, Users as UsersIcon,
  FolderOpen, FileCode, FileJson, Image, File, ChevronRight, ChevronDown,
  Save, Trash2, Edit3, Eye, Download, RefreshCw, AtSign, GitBranch
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useStore, type WorkflowNode, type Agent, type ChatMessage } from '@/store'
import WorkflowEditor from '@/components/WorkflowEditor'

// ====== 类型定义 ======
interface ProjectAgent {
  id: number
  project_id: number
  agent_id: string
  joined_at: string
  agent_name: string
  role: string
  description: string
  avatar: string
  prompt_template?: string
  agent_status?: string
}

interface FileInfo {
  name: string
  path: string
  relativePath: string
  isDirectory: boolean
  size?: number
  modifiedAt?: string
  children?: FileInfo[]
  extension?: string
}

interface GroupChatMessage {
  id: number
  project_id: number
  agent_id?: string | null
  agent_name?: string | null
  role: 'user' | 'agent'
  content: string
  created_at: string
  chat_type?: string
}

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  pending: { label: '等待中', color: 'text-slate-500', bg: 'bg-slate-100', icon: Loader2 },
  in_progress: { label: '进行中', color: 'text-amber-600', bg: 'bg-amber-50', icon: Loader2 },
  review: { label: '待审批', color: 'text-blue-600', bg: 'bg-blue-50', icon: FileText },
  completed: { label: '已完成', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle },
  rejected: { label: '已打回', color: 'text-rose-600', bg: 'bg-rose-50', icon: XCircle },
}

// 文件图标映射
function getFileIcon(info: FileInfo) {
  if (info.isDirectory) return FolderOpen
  const ext = info.extension?.toLowerCase()
  if (['.md', '.mdx'].includes(ext!)) return FileText
  if (['.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.go', '.rs', '.c', '.cpp', '.h'].includes(ext!)) return FileCode
  if (['.json'].includes(ext!)) return FileJson
  if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'].includes(ext!)) return Image
  return File
}

export default function Workspace() {
  const { id } = useParams<{ id: string }>()
  const projectId = Number(id)
  const {
    currentProject, setCurrentProject,
    agents, setAgents,
    updateNodeStatus,
    deliverables, setDeliverables,
  } = useStore()

  // ====== 状态管理 ======
  const [projectAgents, setProjectAgents] = useState<ProjectAgent[]>([])
  const [showAddAgentPanel, setShowAddAgentPanel] = useState(false)
  
  // ====== 群聊相关状态 ======
  const [groupMessages, setGroupMessages] = useState<GroupChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [approvalComment, setApprovalComment] = useState('')
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)
  const [mainTab, setMainTab] = useState<'chat' | 'workflow'>('chat')

  // ====== 文件系统相关状态 ======
  const [projectFolder, setProjectFolder] = useState<{ id: number; project_id: number; folder_path: string } | null>(null)
  const [fileTree, setFileTree] = useState<FileInfo[]>([])
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState<string>('')
  const [fileLoading, setFileLoading] = useState(false)
  const [rightPanelTab, setRightPanelTab] = useState<'deliverables' | 'files'>('files')
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set())
  const [showNewFileDialog, setShowNewFileDialog] = useState(false)
  const [newFileInfo, setNewFileInfo] = useState({ name: '', content: '', isDir: false })
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [saveContent, setSaveContent] = useState({ fileName: '', content: '' })

  // ====== 面板拖拽调整宽度 ======
  const [leftWidth, setLeftWidth] = useState(256)   // 左侧面板默认 256px (w-64)
  const [rightWidth, setRightWidth] = useState(320)  // 右侧面板默认 320px (w-80)
  const [dragging, setDragging] = useState<'left' | 'right' | null>(null)
  const dragStartRef = useRef({ x: 0, width: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  const MIN_PANEL_WIDTH = 180
  const MAX_LEFT_RATIO = 0.35
  const MAX_RIGHT_RATIO = 0.4

  const handleDividerMouseDown = (side: 'left' | 'right', e: React.MouseEvent) => {
    e.preventDefault()
    setDragging(side)
    dragStartRef.current = {
      x: e.clientX,
      width: side === 'left' ? leftWidth : rightWidth,
    }
  }

  useEffect(() => {
    if (!dragging) return

    const handleMouseMove = (e: MouseEvent) => {
      const { x: startX, width: startWidth } = dragStartRef.current
      const containerWidth = containerRef.current?.clientWidth || 1200
      const delta = e.clientX - startX

      if (dragging === 'left') {
        const newWidth = Math.min(
          Math.max(startWidth + delta, MIN_PANEL_WIDTH),
          containerWidth * MAX_LEFT_RATIO
        )
        setLeftWidth(newWidth)
      } else {
        const newWidth = Math.min(
          Math.max(startWidth - delta, MIN_PANEL_WIDTH),
          containerWidth * MAX_RIGHT_RATIO
        )
        setRightWidth(newWidth)
      }
    }

    const handleMouseUp = () => {
      setDragging(null)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragging])

  const chatEndRef = useRef<HTMLDivElement>(null)

  // 加载项目数据
  useEffect(() => {
    if (!projectId) return

    fetch(`/api/projects/${projectId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setCurrentProject(data.data)
          const currentNode = data.data.nodes?.find((n: WorkflowNode) =>
            n.status === 'in_progress' || n.status === 'review'
          )
          if (currentNode) setActiveAgentId(currentNode.agent_id)
        }
      })

    fetch('/api/agents')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setAgents(data.data)
      })

    fetch(`/api/projects/${projectId}/deliverables`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setDeliverables(data.data)
      })

    fetch(`/api/projects/${projectId}/agents`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setProjectAgents(data.data)
      })

    loadProjectFolder()
    loadGroupChatHistory()
  }, [projectId, setCurrentProject, setAgents, setDeliverables])

  // 自动滚动到底部
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [groupMessages])

  // 加载项目文件夹
  const loadProjectFolder = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/folder`)
      const data = await res.json()
      if (data.success && data.data) {
        setProjectFolder(data.data)
        setFileTree(data.data.files || [])
        const firstLevelDirs = new Set<string>()
        ;(data.data.files || []).filter((f: FileInfo) => f.isDirectory).forEach((f: FileInfo) => {
          firstLevelDirs.add(f.relativePath)
        })
        setExpandedDirs(firstLevelDirs)
      }
    } catch (e) {
      console.error('加载项目文件夹失败:', e)
    }
  }, [projectId])

  // 加载群聊历史
  const loadGroupChatHistory = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/group-chat`)
      const data = await res.json()
      if (data.success) setGroupMessages(data.data || [])
    } catch (e) {
      console.error('加载群聊历史失败:', e)
    }
  }, [projectId])

  // ====== 群聊功能 ======
  const handleSendGroupMessage = async () => {
    if (!inputMessage.trim() || isLoading) return
    setIsLoading(true)
    const messageToSend = inputMessage
    setInputMessage('')

    try {
      const res = await fetch(`/api/projects/${projectId}/group-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageToSend })
      })
      const data = await res.json()
      if (data.success) {
        const newMessages = [data.data.sentMessage, ...data.data.replies].filter(Boolean)
        setGroupMessages(prev => [...prev, ...newMessages])
      }
    } catch (error) {
      console.error('发送群聊消息失败:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 点击Agent快速插入@
  const insertAtAgent = (agentName: string) => {
    setInputMessage(prev => prev + (prev.endsWith(' ') ? '' : ' ') + `@${agentName} `)
  }

  // 让一个Agent@另一个Agent
  const handleAgentAtAgent = async (fromAgentId: string, toAgentId: string, message: string) => {
    const fromAgent = projectAgents.find(a => a.agent_id === fromAgentId)
    const toAgent = projectAgents.find(a => a.agent_id === toAgentId)
    if (!fromAgent || !toAgent) return

    const fullMessage = `@${toAgent.agent_name} ${message}`
    setIsLoading(true)

    try {
      const res = await fetch(`/api/projects/${projectId}/group-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: fullMessage, sendAsAgentId: fromAgentId })
      })
      const data = await res.json()
      if (data.success) {
        const newMessages = [data.data.sentMessage, ...data.data.replies].filter(Boolean)
        setGroupMessages(prev => [...prev, ...newMessages])
      }
    } catch (error) {
      console.error('Agent之间@失败:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // ====== 文件操作 ======
  const toggleDir = (relativePath: string) => {
    setExpandedDirs(prev => {
      const next = new Set(prev)
      if (next.has(relativePath)) next.delete(relativePath)
      else next.add(relativePath)
      return next
    })
  }

  const selectFile = async (info: FileInfo) => {
    if (info.isDirectory) return
    setSelectedFilePath(info.relativePath)
    setFileLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/files/read/${encodeURIComponent(info.relativePath)}`)
      const data = await res.json()
      if (data.success) setFileContent(data.data.content)
    } catch (e) {
      console.error('读取文件失败:', e)
      setFileContent('// 文件读取失败')
    } finally {
      setFileLoading(false)
    }
  }

  const handleCreateFile = async () => {
    if (!newFileInfo.name.trim()) return
    try {
      if (newFileInfo.isDir) {
        await fetch(`/api/projects/${projectId}/files/mkdir`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: newFileInfo.name }),
        })
      } else {
        await fetch(`/api/projects/${projectId}/files/write`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: newFileInfo.name, content: newFileInfo.content }),
        })
      }
      setShowNewFileDialog(false)
      setNewFileInfo({ name: '', content: '', isDir: false })
      await loadProjectFolder()
    } catch (e) {
      console.error('创建文件失败:', e)
    }
  }

  const openSaveDialog = (content: string, suggestedName?: string) => {
    setSaveContent({ fileName: suggestedName || 'output.md', content })
    setShowSaveDialog(true)
  }

  const handleSaveAsFile = async () => {
    if (!saveContent.fileName.trim()) return
    try {
      await fetch(`/api/projects/${projectId}/files/save-output`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: saveContent.fileName,
          content: saveContent.content
        }),
      })
      setShowSaveDialog(false)
      setSaveContent({ fileName: '', content: '' })
      await loadProjectFolder()
    } catch (e) {
      console.error('保存文件失败:', e)
    }
  }

  const handleDeleteFile = async (filePath: string) => {
    if (!confirm(`确定要删除 ${filePath} 吗？`)) return
    try {
      await fetch(`/api/projects/${projectId}/files/${encodeURIComponent(filePath)}`, { method: 'DELETE' })
      setSelectedFilePath(null)
      setFileContent('')
      await loadProjectFolder()
    } catch (e) {
      console.error('删除文件失败:', e)
    }
  }

  const handleSetFolder = async (folderName: string) => {
    try {
      await fetch(`/api/projects/${projectId}/folder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderName })
      })
      await loadProjectFolder()
    } catch (e) {
      console.error('设置文件夹失败:', e)
    }
  }

  // ====== 其他功能 ======
  const handleApprove = async (approved: boolean) => {
    if (!activeAgentId) return
    try {
      const res = await fetch(`/api/projects/${projectId}/nodes/${activeAgentId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved, comment: approvalComment })
      })
      const data = await res.json()
      if (data.success) {
        updateNodeStatus(activeAgentId, approved ? 'completed' : 'rejected')
        setShowApprovalModal(false)
        setApprovalComment('')

        fetch(`/api/projects/${projectId}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.success) {
              setCurrentProject(data.data)
              const currentNode = data.data.nodes?.find((n: WorkflowNode) =>
                n.status === 'in_progress' || n.status === 'review'
              )
              if (currentNode) setActiveAgentId(currentNode.agent_id)
            }
          })
      }
    } catch (error) {
      console.error(error)
    }
  }

  const handleAddAgentToProject = async (agentId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/agents/${agentId}`, { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        const agentsRes = await fetch(`/api/projects/${projectId}/agents`)
        const agentsData = await agentsRes.json()
        if (agentsData.success) setProjectAgents(agentsData.data)
      }
    } catch (error) {
      console.error(error)
    }
  }

  const getAvailableAgents = (): Agent[] => {
    const projectAgentIds = new Set(projectAgents.map(pa => pa.agent_id))
    return (agents as Agent[]).filter(a => !projectAgentIds.has(a.id))
  }

  const getNodeForAgent = (agentId: string) => currentProject?.nodes?.find((n) => n.agent_id === agentId)

  const getFilePreviewType = () => {
    if (!selectedFilePath) return 'none'
    const ext = selectedFilePath.split('.').pop()?.toLowerCase()
    if (['md', 'mdx'].includes(ext!)) return 'markdown'
    if (['ts', 'tsx', 'js', 'jsx', 'py', 'json', 'html', 'css', 'vue', 'yaml', 'yml', 'sql', 'sh', 'bash'].includes(ext!)) return 'code'
    return 'text'
  }

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

  const getAgentIcon = (agent: ProjectAgent) => {
    if (agent.avatar?.startsWith('/uploads/')) {
      return <img src={`http://localhost:3001${agent.avatar}`} alt={agent.agent_name} className="w-6 h-6 rounded-full object-cover" />
    }
    const Icon = agentIcons[agent.avatar] || Bot
    return <Icon className="w-6 h-6" />
  }

  return (
    <div ref={containerRef} className={`flex h-[calc(100vh-64px)] ${dragging ? 'select-none' : ''} ${dragging === 'left' ? 'cursor-col-resize' : dragging === 'right' ? 'cursor-col-resize' : ''}`}>
      {/* 左侧：Agent成员列表 */}
      <div style={{ width: leftWidth, minWidth: MIN_PANEL_WIDTH }} className="bg-white rounded-xl border border-slate-200 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-slate-100">
          <h3 className="font-semibold text-[#1e1b4b] flex items-center gap-2">
            <UsersIcon className="w-5 h-5" />
            团队成员
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            点击可快速插入@
          </p>
        </div>

        <div className="flex-1 overflow-auto p-2 space-y-1.5">
          {projectAgents.length === 0 ? (
            <div className="p-3 text-center text-xs text-slate-400">
              暂无Agent成员
            </div>
          ) : (
            projectAgents.map((pa) => {
              const node = getNodeForAgent(pa.agent_id)
              const status = node ? statusConfig[node.status] : statusConfig.pending
              const StatusIcon = status.icon

              return (
                <button
                  key={pa.id}
                  onClick={() => insertAtAgent(pa.agent_name)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left hover:bg-slate-50 border border-transparent hover:border-slate-200"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${getRoleColor(pa.role)}`}>
                    {getAgentIcon(pa)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-[#1e1b4b] truncate flex items-center gap-1.5">
                      {pa.agent_name}
                      <span className="text-blue-500 text-xs opacity-75"><AtSign className="w-3 h-3" /></span>
                    </div>
                    <div className={`text-xs ${status.color} flex items-center gap-1`}>
                      <StatusIcon className={`w-3 h-3 ${node?.status === 'in_progress' ? 'animate-spin' : ''}`} />
                      {status.label}
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>

        <div className="p-3 border-t border-slate-100 space-y-2">
          <button
            onClick={() => setShowAddAgentPanel(!showAddAgentPanel)}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-amber-600 hover:bg-amber-50 rounded-lg border border-amber-200 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            添加成员
          </button>

          {showAddAgentPanel && (
            <div className="space-y-1 max-h-32 overflow-auto border-t border-slate-100 pt-2">
              {getAvailableAgents().length === 0 ? (
                <div className="text-xs text-slate-400 text-center py-2">所有Agent已加入</div>
              ) : (
                getAvailableAgents().map(agent => (
                  <button
                    key={agent.id}
                    onClick={() => handleAddAgentToProject(agent.id)}
                    className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 text-left text-xs"
                  >
                    <Bot className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-700">{agent.name}</span>
                  </button>
                ))
              )}
            </div>
          )}

          <a href="/agents" target="_blank" className="block text-center text-[10px] text-slate-400 hover:text-amber-600 transition-colors">
            管理Agent →
          </a>
        </div>
      </div>

      {/* 左侧拖拽分隔条 */}
      <div
        onMouseDown={(e) => handleDividerMouseDown('left', e)}
        className="w-1.5 flex-shrink-0 cursor-col-resize hover:bg-amber-300/40 active:bg-amber-400/50 transition-colors rounded-sm mx-0.5 self-stretch my-2"
        title="拖拽调整宽度"
      />

      {/* 中间：群聊/工作流窗口 */}
      <div className="flex-1 flex flex-col bg-white rounded-xl border border-slate-200 overflow-hidden min-w-0">
        <div className="flex border-b border-slate-100">
          <button onClick={() => setMainTab('chat')} className={`flex-1 px-4 py-2.5 text-sm font-medium ${mainTab === 'chat' ? 'text-amber-600 border-b-2 border-amber-500' : 'text-slate-500'}`}>
            <MessageSquare className="w-4 h-4 inline mr-1" />群聊
          </button>
          <button onClick={() => setMainTab('workflow')} className={`flex-1 px-4 py-2.5 text-sm font-medium ${mainTab === 'workflow' ? 'text-blue-600 border-b-2 border-blue-500' : 'text-slate-500'}`}>
            <GitBranch className="w-4 h-4 inline mr-1" />工作流
          </button>
        </div>

        {mainTab === 'workflow' ? (
          <div className="flex-1">
            <WorkflowEditor projectId={projectId} projectAgents={projectAgents} onWorkflowChange={(_nodes, _edges) => {
              // 工作流变更时可以触发操作
            }} />
          </div>
        ) : (
        <>
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="font-semibold text-[#1e1b4b]">{currentProject?.name} · 群聊</div>
              <div className="text-xs text-slate-500">
                所有对话和协作都在这里
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {projectFolder && (
              <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                <FolderOpen className="w-3 h-3" /> 工作区已挂载
              </span>
            )}
            {activeAgentId && getNodeForAgent(activeAgentId)?.status === 'review' && (
              <>
                <button
                  onClick={() => setShowApprovalModal(true)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 font-medium transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  审批
                </button>
              </>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-4 bg-gradient-to-b from-slate-50/50 to-white">
          {groupMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <UsersIcon className="w-12 h-12 mb-3 opacity-50" />
              <p>开始和团队成员对话吧！</p>
              <p className="text-xs mt-1">点击左侧成员可以快速插入@</p>
            </div>
          ) : (
            groupMessages.map((msg) => {
              const isUser = msg.role === 'user'
              const agent = projectAgents.find(a => a.agent_id === msg.agent_id)
              
              return (
                <div key={msg.id} className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isUser ? 'bg-amber-500' : getRoleColor(agent?.role || '')
                  }`}>
                    {isUser ? (
                      <User className="w-5 h-5 text-white" />
                    ) : (
                      agent ? getAgentIcon(agent) : <Bot className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                    isUser ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-800'
                  }`}>
                    {!isUser && (
                      <div className={`text-[10px] font-semibold mb-1.5 ${
                        agent ? getRoleColor(agent.role).replace('text-', 'text-').replace('bg-', 'text-') : 'text-slate-600'
                      }`}>
                        {msg.agent_name || 'Agent'}
                      </div>
                    )}
                    {!isUser ? (
                      <div className="prose prose-sm max-w-none text-sm">
                        <ReactMarkdown remarkPlugins={[remarkGfm as any]}>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    )}

                    {/* Agent消息的保存按钮和@其他Agent */}
                    {!isUser && projectFolder && (
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          onClick={() => openSaveDialog(msg.content, `${msg.agent_name || 'output'}-${Date.now()}.md`)}
                          className="flex items-center gap-1 text-[10px] text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                        >
                          <Save className="w-3 h-3" />
                          保存到工作区
                        </button>

                        {/* @其他Agent接力 */}
                        <div className="flex items-center gap-1 ml-auto">
                          <span className="text-[10px] text-slate-400 mr-1">接力:</span>
                          {projectAgents
                            .filter(a => a.agent_id !== msg.agent_id)
                            .slice(0, 3)
                            .map(a => (
                              <button
                                key={a.agent_id}
                                onClick={() => handleAgentAtAgent(a.agent_id, a.agent_id, '请基于上面的内容继续工作')}
                                className="text-[10px] text-slate-500 hover:text-slate-700 px-1.5 py-0.5 hover:bg-slate-200 rounded transition-colors"
                              >
                                @{a.agent_name}
                              </button>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
          {isLoading && (
            <div className="flex gap-3">
              <div className="w-10 h-10 bg-[#1e1b4b] rounded-full flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="bg-slate-100 rounded-2xl px-4 py-3">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="p-4 border-t border-slate-100 bg-white">
          <div className="flex gap-2">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSendGroupMessage()
                }
              }}
              placeholder="输入消息... @成员可定向通知"
              className="flex-1 px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm resize-none"
              rows={2}
            />
            <button
              onClick={handleSendGroupMessage}
              disabled={isLoading || !inputMessage.trim()}
              className="px-4 py-3 bg-gradient-to-br from-[#1e1b4b] to-[#2d2a5e] text-white rounded-xl hover:from-[#2d2a5e] hover:to-[#3c3972] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
        </>
        )}
      </div>

      {/* 右侧拖拽分隔条 */}
      <div
        onMouseDown={(e) => handleDividerMouseDown('right', e)}
        className="w-1.5 flex-shrink-0 cursor-col-resize hover:bg-blue-300/40 active:bg-blue-400/50 transition-colors rounded-sm mx-0.5 self-stretch my-2"
        title="拖拽调整宽度"
      />

      {/* 右侧面板：文件/交付物 */}
      <div style={{ width: rightWidth, minWidth: MIN_PANEL_WIDTH }} className="bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden flex-shrink-0">
        {/* Tab切换 */}
        <div className="flex border-b border-slate-100">
          <button
            onClick={() => setRightPanelTab('deliverables')}
            className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
              rightPanelTab === 'deliverables'
                ? 'text-amber-600 border-b-2 border-amber-500 bg-amber-50/30'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileText className="w-4 h-4 inline mr-1.5 -mt-0.5" />
            交付物
          </button>
          <button
            onClick={() => setRightPanelTab('files')}
            className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
              rightPanelTab === 'files'
                ? 'text-blue-600 border-b-2 border-blue-500 bg-blue-50/30'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <FolderOpen className="w-4 h-4 inline mr-1.5 -mt-0.5" />
            工作区
          </button>
        </div>

        {rightPanelTab === 'deliverables' ? (
          // ====== 交付物面板 ======
          <div className="flex-1 overflow-auto p-3 space-y-2">
            {deliverables.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">暂无交付物</div>
            ) : (
              deliverables.map((d) => (
                <div key={d.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-2 mb-1.5">
                    <FileText className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-medium text-[#1e1b4b] truncate">{d.title}</span>
                  </div>
                  <div className="text-xs text-slate-500 line-clamp-3">
                    <ReactMarkdown remarkPlugins={[remarkGfm as any]}>{String(d.content).slice(0, 100) + '...'}</ReactMarkdown>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-slate-400">
                      {new Date(d.created_at).toLocaleDateString('zh-CN')}
                    </span>
                    {projectFolder && (
                      <button
                        onClick={() => openSaveDialog(d.content, `${d.title}.md`)}
                        className="text-[10px] text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
                      >
                        <Save className="w-3 h-3" /> 保存
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          // ====== 文件浏览器 ======
          <div className="flex-1 flex flex-col overflow-hidden">
            {!projectFolder ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <FolderOpen className="w-12 h-12 text-slate-200 mb-3" />
                <p className="text-sm text-slate-500 font-medium mb-1">尚未设置项目工作文件夹</p>
                <p className="text-xs text-slate-400 mb-4">设置后Agent可在此生成和编辑文件</p>
                <div className="w-full max-w-[200px] space-y-2">
                  <input
                    id="setFolderInput"
                    type="text"
                    placeholder="输入文件夹名称..."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const val = (e.target as HTMLInputElement).value.trim()
                        if (val) handleSetFolder(val)
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      const el = document.getElementById('setFolderInput') as HTMLInputElement
                      if (el?.value.trim()) handleSetFolder(el.value.trim())
                    }}
                    className="w-full px-3 py-2 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                  >
                    设置文件夹
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* 文件工具栏 */}
                <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <span className="text-[10px] text-slate-400 truncate max-w-[160px]" title={projectFolder.folder_path}>
                    <FolderOpen className="w-3 h-3 inline mr-1" />
                    {projectFolder.folder_path.split(/[/\\]/).pop()}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setShowNewFileDialog(true)}
                      title="新建文件/目录"
                      className="p-1 rounded hover:bg-slate-200 text-slate-500 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={loadProjectFolder}
                      title="刷新"
                      className="p-1 rounded hover:bg-slate-200 text-slate-500 transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* 内容区 */}
                <div className="flex-1 overflow-auto">
                  {!selectedFilePath ? (
                    // 文件树视图
                    <div className="p-2">
                      {fileTree.length === 0 ? (
                        <div className="text-center py-8 text-slate-400 text-xs">
                          <FolderOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          空文件夹<br/>点击上方 + 新建文件
                        </div>
                      ) : (
                        <FileTree
                          fileTree={fileTree}
                          selectedPath={selectedFilePath}
                          onSelect={selectFile}
                          onExpand={toggleDir}
                          expandedDirs={expandedDirs}
                        />
                      )}
                    </div>
                  ) : (
                    // 文件预览
                    <div className="h-full flex flex-col">
                      <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between bg-slate-50 sticky top-0 z-10">
                        <button
                          onClick={() => { setSelectedFilePath(null); setFileContent('') }}
                          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                        >
                          <ChevronRight className="w-3 h-3 rotate-[-90deg]" />
                          返回
                        </button>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-400 truncate max-w-[120px]">{selectedFilePath}</span>
                          <button
                            onClick={() => handleDeleteFile(selectedFilePath)}
                            title="删除"
                            className="p-1 rounded hover:bg-rose-100 text-rose-400 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <div className="flex-1 overflow-auto p-3">
                        {fileLoading ? (
                          <div className="flex items-center justify-center h-32 text-slate-400">
                            <Loader2 className="w-5 h-5 animate-spin" />
                          </div>
                        ) : getFilePreviewType() === 'markdown' ? (
                          <div className="prose prose-sm max-w-none">
                            <ReactMarkdown remarkPlugins={[remarkGfm as any]}>{fileContent}</ReactMarkdown>
                          </div>
                        ) : getFilePreviewType() === 'code' ? (
                          <pre className="bg-slate-900 text-slate-100 rounded-lg p-3 text-xs leading-relaxed overflow-x-auto">
                            <code>{fileContent}</code>
                          </pre>
                        ) : (
                          <pre className="text-xs text-slate-700 whitespace-pre-wrap break-words">{fileContent}</pre>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* 审批弹窗 */}
      {showApprovalModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-[#1e1b4b] mb-2">审批确认</h2>
            <p className="text-slate-500 text-sm mb-4">
              {getAgentById(activeAgentId!)?.name}已完成工作并提交交付物，请审批是否通过。
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">审批意见（可选）</label>
              <textarea
                value={approvalComment}
                onChange={(e) => setApprovalComment(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 h-20 resize-none text-sm"
                placeholder="输入审批意见..."
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => handleApprove(false)}
                className="flex-1 px-4 py-2.5 border border-rose-300 text-rose-600 rounded-lg hover:bg-rose-50 transition-colors font-medium"
              >
                打回重做
              </button>
              <button
                onClick={() => handleApprove(true)}
                className="flex-1 px-4 py-2.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors font-medium"
              >
                通过
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 新建文件弹窗 */}
      {showNewFileDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-[#1e1b4b] mb-4">新建{newFileInfo.isDir ? '目录' : '文件'}</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  {newFileInfo.isDir ? '目录名' : '文件路径'}
                </label>
                <input
                  type="text"
                  value={newFileInfo.name}
                  onChange={(e) => setNewFileInfo({ ...newFileInfo, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder={newFileInfo.isDir ? '如：src/components' : '如：README.md 或 src/index.ts'}
                />
              </div>
              {!newFileInfo.isDir && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">初始内容（可选）</label>
                  <textarea
                    value={newFileInfo.content}
                    onChange={(e) => setNewFileInfo({ ...newFileInfo, content: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-28 resize-none text-sm"
                    placeholder="输入文件内容..."
                  />
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => setNewFileInfo({ ...newFileInfo, isDir: false })}
                  className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${
                    !newFileInfo.isDir ? 'bg-blue-50 border-blue-300 text-blue-700 font-medium' : 'border-slate-200 text-slate-500'
                  }`}
                >
                  <File className="w-4 h-4 inline mr-1 -mt-0.5" /> 文件
                </button>
                <button
                  onClick={() => setNewFileInfo({ ...newFileInfo, isDir: true })}
                  className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${
                    newFileInfo.isDir ? 'bg-blue-50 border-blue-300 text-blue-700 font-medium' : 'border-slate-200 text-slate-500'
                  }`}
                >
                  <FolderOpen className="w-4 h-4 inline mr-1 -mt-0.5" /> 目录
                </button>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => { setShowNewFileDialog(false); setNewFileInfo({ name: '', content: '', isDir: false }) }}
                className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
              >
                取消
              </button>
              <button
                onClick={handleCreateFile}
                disabled={!newFileInfo.name.trim()}
                className="flex-1 px-4 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium disabled:opacity-50"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 保存为文件弹窗 */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-[#1e1b4b] mb-4 flex items-center gap-2">
              <Save className="w-5 h-5 text-blue-500" />
              保存到工作区
            </h2>
            <div className="mb-3 p-2 bg-slate-50 rounded-lg text-xs text-slate-500">
              将保存到项目文件夹：<span className="font-medium text-slate-700">{projectFolder?.folder_path.split(/[/\\]/).pop()}</span>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">文件名 *</label>
                <input
                  type="text"
                  value={saveContent.fileName}
                  onChange={(e) => setSaveContent({ ...saveContent, fileName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="如：需求文档.md、index.ts、config.json"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">内容预览</label>
                <div className="max-h-40 overflow-auto p-2 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 whitespace-pre-wrap break-words">
                  {saveContent.content.slice(0, 500)}{saveContent.content.length > 500 ? '...(截断)' : ''}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => { setShowSaveDialog(false); setSaveContent({ fileName: '', content: '' }) }}
                className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
              >
                取消
              </button>
              <button
                onClick={handleSaveAsFile}
                disabled={!saveContent.fileName.trim()}
                className="flex-1 px-4 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium disabled:opacity-50"
              >
                <Save className="w-4 h-4 inline mr-1 -mt-0.5" />
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  // ====== 子组件：文件树 ======
  function FileTree({
    fileTree, selectedPath, onSelect, onExpand, expandedDirs, depth = 0
  }: {
    fileTree: FileInfo[], selectedPath: string | null, onSelect: (f: FileInfo) => void,
    onExpand: (path: string) => void, expandedDirs: Set<string>, depth?: number
  }) {
    return (
      <>
        {fileTree.map((item) => (
          <div key={item.relativePath}>
            <button
              onClick={() => item.isDirectory ? onExpand(item.relativePath) : onSelect(item)}
              className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-left text-xs transition-colors hover:bg-slate-50 ${
                selectedPath === item.relativePath ? 'bg-blue-50 text-blue-700 border-l-2 border-blue-500' : 'text-slate-700 border-l-2 border-transparent'
              }`}
              style={{ paddingLeft: `${depth * 12 + 8}px` }}
            >
              {item.isDirectory ? (
                <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                  {expandedDirs.has(item.relativePath) ? <ChevronDown className="w-3 h-3 text-slate-400" /> : <ChevronRight className="w-3 h-3 text-slate-400" />}
                </span>
              ) : <span className="w-4 h-4 flex-shrink-0" />}
              {(() => {
                const Icon = getFileIcon(item)
                return <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${
                  item.isDirectory ? 'text-amber-500' :
                  ['.md', '.mdx'].includes(item.extension || '') ? 'text-blue-500' :
                  ['.ts', '.tsx', '.js', '.jsx', '.py'].includes(item.extension || '') ? 'text-purple-500' :
                  ['.json'].includes(item.extension || '') ? 'text-green-500' : 'text-slate-400'
                }`} />
              })()}
              <span className="truncate">{item.name}</span>
            </button>
            {item.isDirectory && expandedDirs.has(item.relativePath) && item.children && (
              <FileTree
                fileTree={item.children}
                selectedPath={selectedPath}
                onSelect={onSelect}
                onExpand={onExpand}
                expandedDirs={expandedDirs}
                depth={depth + 1}
              />
            )}
          </div>
        ))}
      </>
    )
  }

  // 辅助函数
  function getAgentById(agentId: string): { name: string; description: string } | undefined {
    const pa = projectAgents.find(a => a.agent_id === agentId)
    if (pa) return { name: pa.agent_name, description: pa.description }
    const a = (agents as Agent[]).find(a => a.id === agentId)
    if (a) return { name: a.name, description: a.description }
    return undefined
  }
}

// 缺失的图标导入定义
import { Search, ClipboardList, Lightbulb, Cpu, Layout, Server, Bug, Activity } from 'lucide-react'
