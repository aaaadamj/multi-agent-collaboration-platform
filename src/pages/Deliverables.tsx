import { useEffect } from 'react'
import { FileText, Clock, ArrowRight } from 'lucide-react'
import { useStore, type Deliverable } from '@/store'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export default function DeliverablesPage() {
  const { deliverables, setDeliverables } = useStore()

  useEffect(() => {
    fetch('/api/projects')
      .then((res) => res.json())
      .then(async (data) => {
        if (data.success && data.data.length > 0) {
          const allDeliverables: Deliverable[] = []
          for (const project of data.data) {
            const res = await fetch(`/api/projects/${project.id}/deliverables`)
            const d = await res.json()
            if (d.success) {
              allDeliverables.push(...d.data.map((item: Deliverable) => ({ ...item, project_name: project.name })))
            }
          }
          setDeliverables(allDeliverables)
        }
      })
  }, [setDeliverables])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1e1b4b]">交付物仓库</h1>
        <p className="text-slate-500 text-sm mt-1">所有项目的交付物归档与查看</p>
      </div>

      {deliverables.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">暂无交付物</h3>
          <p className="text-slate-500">项目运行后，各Agent的产出将在这里归档</p>
        </div>
      ) : (
        <div className="space-y-4">
          {deliverables.map((d: Deliverable & { project_name?: string }) => (
            <div key={d.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center">
                    <FileText className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <div className="font-semibold text-[#1e1b4b]">{d.title}</div>
                    <div className="text-xs text-slate-500">
                      {(d as any).project_name || '未知项目'} · 版本 {d.version}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{new Date(d.created_at).toLocaleDateString('zh-CN')}</span>
                </div>
              </div>
              <div className="p-4">
                <div className="prose prose-sm max-w-none prose-headings:text-slate-800 prose-p:text-slate-700 prose-strong:text-slate-800 bg-slate-50 rounded-lg p-4">
                  <ReactMarkdown remarkPlugins={[remarkGfm as any]}>{d.content}</ReactMarkdown>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
