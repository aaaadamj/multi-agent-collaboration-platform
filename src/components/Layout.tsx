import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  FileText,
  Settings,
  ClipboardList,
} from 'lucide-react'

const navItems = [
  { path: '/', icon: LayoutDashboard, label: '项目大厅' },
  { path: '/agents', icon: Users, label: 'Agent管理' },
  { path: '/deliverables', icon: FileText, label: '交付物' },
  { path: '/settings', icon: Settings, label: '设置' },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const isProjectPage = location.pathname.startsWith('/project/')

  return (
    <div className="flex h-screen bg-slate-50">
      <aside className="w-16 bg-[#1e1b4b] flex flex-col items-center py-4 flex-shrink-0">
        <div className="mb-6">
          <ClipboardList className="w-8 h-8 text-amber-400" />
        </div>
        <nav className="flex flex-col gap-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `p-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-amber-500 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white hover:bg-white/10'
                }`
              }
              title={item.label}
            >
              <item.icon className="w-5 h-5" />
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="flex-1 overflow-auto">
        {isProjectPage && <ProjectSubNav />}
        <div className="p-6">{children}</div>
      </main>
    </div>
  )
}

function ProjectSubNav() {
  const location = useLocation()
  const projectId = location.pathname.split('/')[2]

  const subNavItems = [
    { path: `/project/${projectId}/workspace`, label: '协作区' },
    { path: `/project/${projectId}/board`, label: '看板' },
    { path: `/project/${projectId}/daily`, label: '日报' },
  ]

  return (
    <div className="bg-white border-b border-slate-200 px-6 py-3">
      <div className="flex gap-6">
        {subNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `text-sm font-medium pb-2 border-b-2 transition-colors ${
                isActive
                  ? 'text-[#1e1b4b] border-amber-500'
                  : 'text-slate-500 border-transparent hover:text-[#1e1b4b]'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </div>
    </div>
  )
}
