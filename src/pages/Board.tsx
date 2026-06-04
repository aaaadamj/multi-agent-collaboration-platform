import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle, XCircle, Clock, Loader2, FileText, AlertCircle } from 'lucide-react'
import { useStore, type WorkflowNode } from '@/store'

const statusColumns = [
  { key: 'pending', label: '待开始', color: 'bg-slate-100', borderColor: 'border-slate-200', icon: Clock },
  { key: 'in_progress', label: '进行中', color: 'bg-amber-50', borderColor: 'border-amber-200', icon: Loader2 },
  { key: 'review', label: '待审批', color: 'bg-blue-50', borderColor: 'border-blue-200', icon: FileText },
  { key: 'completed', label: '已完成', color: 'bg-emerald-50', borderColor: 'border-emerald-200', icon: CheckCircle },
]

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  pending: { label: '等待中', color: 'text-slate-500', bg: 'bg-slate-100', icon: Clock },
  in_progress: { label: '进行中', color: 'text-amber-600', bg: 'bg-amber-50', icon: Loader2 },
  review: { label: '待审批', color: 'text-blue-600', bg: 'bg-blue-50', icon: FileText },
  completed: { label: '已完成', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle },
  rejected: { label: '已打回', color: 'text-rose-600', bg: 'bg-rose-50', icon: XCircle },
}

export default function Board() {
  const { id } = useParams<{ id: string }>()
  const projectId = Number(id)
  const { currentProject, setCurrentProject, agents, setAgents } = useStore()

  useEffect(() => {
    fetch(`/api/projects/${projectId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setCurrentProject(data.data)
      })

    fetch('/api/agents')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setAgents(data.data)
      })
  }, [projectId, setCurrentProject, setAgents])

  const getAgentById = (agentId: string) => agents.find((a) => a.id === agentId)

  const getNodesByStatus = (status: string) => {
    return currentProject?.nodes?.filter((n: WorkflowNode) => n.status === status) || []
  }

  const handleApprove = async (node: WorkflowNode, approved: boolean) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/nodes/${node.agent_id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved }),
      })
      const data = await res.json()
      if (data.success) {
        fetch(`/api/projects/${projectId}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.success) setCurrentProject(data.data)
          })
      }
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1e1b4b]">项目看板</h1>
        <p className="text-slate-500 text-sm mt-1">
          {currentProject?.name} - 整体进度 {currentProject?.progress}%
        </p>
      </div>

      {/* 进度条 */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
        <div className="flex justify-between text-sm text-slate-600 mb-2">
          <span>项目总进度</span>
          <span className="font-semibold text-[#1e1b4b]">{currentProject?.progress || 0}%</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-3">
          <div
            className="bg-gradient-to-r from-amber-400 to-amber-500 h-3 rounded-full transition-all duration-700"
            style={{ width: `${currentProject?.progress || 0}%` }}
          />
        </div>
      </div>

      {/* 看板 */}
      <div className="grid grid-cols-4 gap-4">
        {statusColumns.map((column) => {
          const nodes = getNodesByStatus(column.key)
          const ColumnIcon = column.icon

          return (
            <div key={column.key} className="bg-slate-50/50 rounded-xl border border-slate-200 flex flex-col min-h-[400px]">
              <div className={`p-3 border-b ${column.borderColor} ${column.color} rounded-t-xl`}>
                <div className="flex items-center gap-2">
                  <ColumnIcon className="w-4 h-4 text-slate-600" />
                  <span className="font-semibold text-sm text-slate-700">{column.label}</span>
                  <span className="ml-auto text-xs bg-white px-2 py-0.5 rounded-full text-slate-500 font-medium">
                    {nodes.length}
                  </span>
                </div>
              </div>
              <div className="p-2 space-y-2 flex-1">
                {nodes.map((node: WorkflowNode) => {
                  const agent = getAgentById(node.agent_id)
                  const status = statusConfig[node.status]
                  const StatusIcon = status.icon

                  return (
                    <div
                      key={node.id}
                      className="bg-white rounded-lg border border-slate-200 p-3 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${status.bg}`}>
                          <StatusIcon className={`w-4 h-4 ${status.color} ${node.status === 'in_progress' ? 'animate-spin' : ''}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-[#1e1b4b] truncate">{agent?.name}</div>
                          <div className="text-xs text-slate-500">{node.name}</div>
                        </div>
                      </div>

                      {node.started_at && (
                        <div className="text-xs text-slate-400 mb-2">
                          开始于 {new Date(node.started_at).toLocaleDateString('zh-CN')}
                        </div>
                      )}

                      {node.status === 'review' && (
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => handleApprove(node, false)}
                            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 border border-rose-300 text-rose-600 rounded-md hover:bg-rose-50 text-xs font-medium transition-colors"
                          >
                            <XCircle className="w-3 h-3" />
                            打回
                          </button>
                          <button
                            onClick={() => handleApprove(node, true)}
                            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 text-xs font-medium transition-colors"
                          >
                            <CheckCircle className="w-3 h-3" />
                            通过
                          </button>
                        </div>
                      )}

                      {node.approval_comment && (
                        <div className="mt-2 p-2 bg-slate-50 rounded-md text-xs text-slate-600 flex items-start gap-1.5">
                          <AlertCircle className="w-3 h-3 text-amber-500 mt-0.5 flex-shrink-0" />
                          <span>{node.approval_comment}</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* 工作流时间线 */}
      <div className="mt-6 bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-semibold text-[#1e1b4b] mb-4">工作流时间线</h3>
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {currentProject?.nodes?.map((node: WorkflowNode, index: number) => {
            const agent = getAgentById(node.agent_id)
            const status = statusConfig[node.status]
            const isCompleted = node.status === 'completed'
            const isCurrent = node.status === 'in_progress' || node.status === 'review'

            return (
              <div key={node.id} className="flex items-center flex-shrink-0">
                <div
                  className={`flex flex-col items-center px-4 py-3 rounded-lg border-2 transition-all ${
                    isCompleted
                      ? 'border-emerald-300 bg-emerald-50'
                      : isCurrent
                      ? 'border-amber-400 bg-amber-50 shadow-md'
                      : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${
                      isCompleted ? 'bg-emerald-500' : isCurrent ? 'bg-amber-500 animate-pulse' : 'bg-slate-300'
                    }`}
                  >
                    <span className="text-white text-xs font-bold">{index + 1}</span>
                  </div>
                  <span className={`text-xs font-medium ${isCurrent ? 'text-amber-700' : 'text-slate-600'}`}>
                    {agent?.name}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5">{status.label}</span>
                </div>
                {index < (currentProject?.nodes?.length || 0) - 1 && (
                  <div
                    className={`w-8 h-0.5 mx-1 flex-shrink-0 ${
                      isCompleted ? 'bg-emerald-400' : 'bg-slate-200'
                    }`}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
