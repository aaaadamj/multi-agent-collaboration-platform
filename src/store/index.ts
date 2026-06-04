import { create } from 'zustand'

export interface Project {
  id: number
  name: string
  direction: string
  type: string
  status: string
  current_node: string
  progress: number
  created_at: string
  updated_at: string
}

export interface WorkflowNode {
  id: number
  project_id: number
  agent_id: string
  name: string
  status: string
  sequence: number
  started_at: string
  completed_at: string
  approved_by: string
  approval_comment: string
}

export interface AgentModel {
  id: number
  agent_id: string
  provider: string
  model_name: string
  api_base: string
  api_key: string
  is_active: number
  created_at: string
}

export interface Agent {
  id: string
  name: string
  role: string
  description: string
  prompt_template: string
  avatar: string
  status: string
  models?: AgentModel[]
}

export interface ChatMessage {
  id: number
  project_id: number
  agent_id: string
  role: string
  content: string
  created_at: string
}

export interface Deliverable {
  id: number
  project_id: number
  node_id: number
  title: string
  content: string
  type: string
  version: number
  created_at: string
}

export interface DailyReport {
  id: number
  project_id: number
  content: string
  blockers: string
  risks: string
  pending_approvals: string
  created_at: string
}

export interface Skill {
  id: string
  name: string
  description: string
  category: string
  icon: string
  parameters: any[]
  is_builtin: number
  handler_type: string
}

export interface AgentSkill {
  id: number
  agent_id: string
  skill_id: string
  enabled: number
  config: Record<string, any>
  skill?: Skill
}

interface AppState {
  projects: Project[]
  currentProject: (Project & { nodes?: WorkflowNode[]; deliverables?: Deliverable[] }) | null
  agents: Agent[]
  chatMessages: Record<string, ChatMessage[]>
  deliverables: Deliverable[]
  reports: DailyReport[]

  setProjects: (projects: Project[]) => void
  setCurrentProject: (project: AppState['currentProject']) => void
  setAgents: (agents: Agent[]) => void
  setChatMessages: (agentId: string, messages: ChatMessage[]) => void
  addChatMessage: (agentId: string, message: ChatMessage) => void
  setDeliverables: (deliverables: Deliverable[]) => void
  setReports: (reports: DailyReport[]) => void
  updateNodeStatus: (agentId: string, status: string) => void
}

export const useStore = create<AppState>((set) => ({
  projects: [],
  currentProject: null,
  agents: [],
  chatMessages: {},
  deliverables: [],
  reports: [],

  setProjects: (projects) => set({ projects }),
  setCurrentProject: (project) => set({ currentProject: project }),
  setAgents: (agents) => set({ agents }),
  setChatMessages: (agentId, messages) =>
    set((state) => ({
      chatMessages: { ...state.chatMessages, [agentId]: messages },
    })),
  addChatMessage: (agentId, message) =>
    set((state) => ({
      chatMessages: {
        ...state.chatMessages,
        [agentId]: [...(state.chatMessages[agentId] || []), message],
      },
    })),
  setDeliverables: (deliverables) => set({ deliverables }),
  setReports: (reports) => set({ reports }),
  updateNodeStatus: (agentId, status) =>
    set((state) => {
      if (!state.currentProject?.nodes) return state
      return {
        currentProject: {
          ...state.currentProject,
          nodes: state.currentProject.nodes.map((n) =>
            n.agent_id === agentId ? { ...n, status } : n
          ),
        },
      }
    }),
}))
