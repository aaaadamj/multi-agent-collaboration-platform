import { useCallback, useEffect, useState } from 'react'
import {
  ReactFlow,
  Controls,
  Background,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type Node,
  type NodeTypes,
  type NodeProps,
  BackgroundVariant,
  Panel,
  Handle,
  Position,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { ChevronRight, ChevronDown, Copy, Trash2, Settings } from 'lucide-react'

// ====== 自定义节点类型 ======

type AgentNodeData = {
  agentId?: string
  agentName?: string
  role?: string
  label?: string
}

type ConditionNodeData = {
  label?: string
  condition?: string
}

type StartEndNodeData = {
  label?: string
}

function AgentNode({ data, selected }: NodeProps<Node<AgentNodeData>>) {
  const d = data as AgentNodeData
  return (
    <div className={`px-4 py-3 rounded-xl shadow-md border-2 min-w-[160px] ${
      selected ? 'border-amber-500 bg-amber-50' : 'border-slate-300 bg-white'
    }`}>
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-amber-500 !border-2 !border-white" />
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
          {d.agentName?.[0] || '?'}
        </div>
        <div>
          <div className="text-sm font-semibold text-slate-800">{d.agentName || d.label}</div>
          <div className="text-[10px] text-slate-500">{d.role || 'Agent'}</div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-amber-500 !border-2 !border-white" />
    </div>
  )
}

function ConditionNode({ data, selected }: NodeProps<Node<ConditionNodeData>>) {
  const d = data as ConditionNodeData
  return (
    <div className={`relative ${
      selected ? 'text-blue-700' : 'text-blue-600'
    }`}>
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-blue-500 !border-2 !border-white" />
      <div className="w-28 h-28 rotate-45 border-2 border-blue-400 bg-blue-50 flex items-center justify-center">
        <div className="-rotate-45 text-center">
          <div className="text-xs font-semibold">{d.label || '条件判断'}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">{d.condition || '设置条件'}</div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} id="true" className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-white" style={{ left: '30%' }} />
      <Handle type="source" position={Position.Bottom} id="false" className="!w-3 !h-3 !bg-rose-500 !border-2 !border-white" style={{ left: '70%' }} />
    </div>
  )
}

function StartNode({ selected }: NodeProps<Node<StartEndNodeData>>) {
  return (
    <div className={`px-5 py-2.5 rounded-full shadow-md border-2 ${
      selected ? 'border-emerald-500 bg-emerald-50' : 'border-emerald-400 bg-emerald-100'
    }`}>
      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-white" />
      <span className="text-sm font-bold text-emerald-700">开始</span>
    </div>
  )
}

function EndNode({ selected }: NodeProps<Node<StartEndNodeData>>) {
  return (
    <div className={`px-5 py-2.5 rounded-full shadow-md border-2 ${
      selected ? 'border-rose-500 bg-rose-50' : 'border-rose-400 bg-rose-100'
    }`}>
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-rose-500 !border-2 !border-white" />
      <span className="text-sm font-bold text-rose-700">结束</span>
    </div>
  )
}

const nodeTypes: NodeTypes = {
  agent: AgentNode,
  condition: ConditionNode,
  start: StartNode,
  end: EndNode,
}

// ====== 主组件 ======

interface Props {
  projectId: number
  projectAgents: Array<{ agent_id: string; agent_name: string; role: string; description: string }>
  onWorkflowChange?: (nodes: Node[], edges: Edge[]) => void
}

export default function WorkflowEditor({ projectId, projectAgents, onWorkflowChange }: Props) {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [saving, setSaving] = useState(false)
  const [selectedCondition, setSelectedCondition] = useState<string | null>(null)
  const [conditionText, setConditionText] = useState('')
  const [panelCollapsed, setPanelCollapsed] = useState(false)
  const [nodeAction, setNodeAction] = useState<{ nodeId: string; nodeType: string; x: number; y: number } | null>(null)

  // 加载已有工作流
  useEffect(() => {
    fetch(`/api/projects/${projectId}/workflow`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setNodes(data.data.nodes || [])
          setEdges(data.data.edges || [])
        }
      })
  }, [projectId, setNodes, setEdges])

  // 连接节点
  const onConnect = useCallback((connection: Connection) => {
    setEdges(eds => addEdge({
      ...connection,
      animated: true,
      style: { stroke: '#6366f1', strokeWidth: 2 },
      label: connection.sourceHandle === 'true' ? '满足' : connection.sourceHandle === 'false' ? '不满足' : '',
    }, eds))
  }, [setEdges])

  // 添加Agent节点到画布
  const addAgentNode = (agent: typeof projectAgents[0]) => {
    const newNode: Node = {
      id: `agent-${agent.agent_id}-${Date.now()}`,
      type: 'agent',
      position: { x: 200 + Math.random() * 200, y: 150 + nodes.length * 100 },
      data: { agentId: agent.agent_id, agentName: agent.agent_name, role: agent.role, label: agent.agent_name },
    }
    setNodes(nds => [...nds, newNode])
  }

  // 添加条件节点
  const addConditionNode = () => {
    const newNode: Node = {
      id: `condition-${Date.now()}`,
      type: 'condition',
      position: { x: 250 + Math.random() * 100, y: 150 + nodes.length * 100 },
      data: { label: '条件判断', condition: '请设置条件' },
    }
    setNodes(nds => [...nds, newNode])
  }

  // 添加起始/结束节点
  const addStartNode = () => {
    const newNode: Node = {
      id: `start-${Date.now()}`,
      type: 'start',
      position: { x: 300, y: 0 },
      data: { label: '开始' },
    }
    setNodes(nds => [...nds, newNode])
  }

  const addEndNode = () => {
    const newNode: Node = {
      id: `end-${Date.now()}`,
      type: 'end',
      position: { x: 300, y: 600 },
      data: { label: '结束' },
    }
    setNodes(nds => [...nds, newNode])
  }

  // 保存工作流
  const saveWorkflow = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/workflow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes, edges }),
      })
      const data = await res.json()
      if (data.success) {
        onWorkflowChange?.(nodes, edges)
      }
    } catch (e) {
      console.error('保存工作流失败:', e)
    } finally {
      setSaving(false)
    }
  }

  // 更新条件节点的条件文本
  const updateCondition = (nodeId: string, text: string) => {
    setNodes(nds => nds.map(n =>
      n.id === nodeId ? { ...n, data: { ...n.data, condition: text } } : n
    ))
  }

  // 节点左键点击 → 弹出操作卡片
  const handleNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setNodeAction({ nodeId: node.id, nodeType: node.type || 'agent', x: _event.clientX, y: _event.clientY })
  }, [])

  // 复制节点
  const copyNode = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId)
    if (!node) return
    const newNode: Node = {
      ...node,
      id: `${node.type}-${Date.now()}`,
      position: { x: node.position.x + 40, y: node.position.y + 40 },
      data: { ...node.data },
      selected: false,
    }
    setNodes(nds => [...nds, newNode])
    setNodeAction(null)
  }

  // 删除节点
  const deleteNode = (nodeId: string) => {
    setNodes(nds => nds.filter(n => n.id !== nodeId))
    setEdges(eds => eds.filter(e => e.source !== nodeId && e.target !== nodeId))
    setNodeAction(null)
  }

  // 点击画布空白区域关闭操作卡片
  const handlePaneClick = useCallback(() => {
    setNodeAction(null)
  }, [])

  return (
    <div className="h-full w-full" style={{ minHeight: 500 }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        fitView
        deleteKeyCode="Delete"
        className="bg-slate-50"
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#94a3b8" />
        <Controls className="!bg-white !border-slate-200 !shadow-lg !rounded-lg" />

        {/* 左上角工具面板 */}
        <Panel position="top-left" className="!m-2">
          <button
            onClick={() => setPanelCollapsed(!panelCollapsed)}
            className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-md border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors mb-1.5"
            title={panelCollapsed ? '展开面板' : '折叠面板'}
          >
            {panelCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {!panelCollapsed && (
            <div className="!bg-white !rounded-xl !shadow-lg !border !border-slate-200 !p-3 space-y-2">
              <div className="text-xs font-semibold text-slate-700 mb-2">添加节点</div>
              <button onClick={addStartNode} className="w-full text-left text-xs px-3 py-1.5 rounded-lg hover:bg-emerald-50 text-emerald-700 border border-emerald-200">
                ● 开始节点
              </button>
              <button onClick={addEndNode} className="w-full text-left text-xs px-3 py-1.5 rounded-lg hover:bg-rose-50 text-rose-700 border border-rose-200">
                ● 结束节点
              </button>
              <button onClick={addConditionNode} className="w-full text-left text-xs px-3 py-1.5 rounded-lg hover:bg-blue-50 text-blue-700 border border-blue-200">
                ◇ 条件节点
              </button>
              <div className="border-t border-slate-100 pt-2 mt-2">
                <div className="text-xs font-semibold text-slate-700 mb-1.5">Agent节点</div>
                {projectAgents.map(pa => (
                  <button key={pa.agent_id} onClick={() => addAgentNode(pa)} className="w-full text-left text-xs px-3 py-1.5 rounded-lg hover:bg-amber-50 text-amber-700 border border-amber-200 mb-1">
                    + {pa.agent_name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </Panel>

        {/* 右上角保存按钮 */}
        <Panel position="top-right" className="!bg-white !rounded-xl !shadow-lg !border !border-slate-200 !p-2">
          <button
            onClick={saveWorkflow}
            disabled={saving}
            className="px-4 py-2 text-xs font-semibold bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 transition-all"
          >
            {saving ? '保存中...' : '保存工作流'}
          </button>
        </Panel>

        {/* 条件编辑面板 */}
        {selectedCondition && (
          <Panel position="bottom-center" className="!bg-white !rounded-xl !shadow-lg !border !border-blue-200 !p-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-blue-700">条件：</span>
              <input
                value={conditionText}
                onChange={e => {
                  setConditionText(e.target.value)
                  updateCondition(selectedCondition, e.target.value)
                }}
                className="px-2 py-1 text-xs border border-blue-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 w-64"
                placeholder="如：需求已明确 → 是/否"
              />
              <button onClick={() => setSelectedCondition(null)} className="text-xs text-slate-400 hover:text-slate-600">关闭</button>
            </div>
          </Panel>
        )}
      </ReactFlow>

      {/* 节点操作卡片 */}
      {nodeAction && (
        <div
          className="absolute z-50 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 min-w-[120px] animate-in fade-in"
          style={{
            left: nodeAction.x + 8,
            top: nodeAction.y + 8,
          }}
        >
          {nodeAction.nodeType === 'condition' && (
            <>
              <button
                onClick={() => {
                  const node = nodes.find(n => n.id === nodeAction.nodeId)
                  if (node) {
                    setSelectedCondition(nodeAction.nodeId)
                    setConditionText((node.data as ConditionNodeData)?.condition || '')
                  }
                  setNodeAction(null)
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
              >
                <Settings className="w-3.5 h-3.5" />
                设置条件
              </button>
              <div className="mx-2 my-0.5 border-t border-slate-100" />
            </>
          )}
          <button
            onClick={() => copyNode(nodeAction.nodeId)}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-slate-700 hover:bg-amber-50 hover:text-amber-700 transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            复制节点
          </button>
          <div className="mx-2 my-0.5 border-t border-slate-100" />
          <button
            onClick={() => deleteNode(nodeAction.nodeId)}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-slate-700 hover:bg-rose-50 hover:text-rose-600 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            删除节点
          </button>
        </div>
      )}
    </div>
  )
}
