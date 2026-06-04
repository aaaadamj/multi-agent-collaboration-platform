import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Calendar, AlertTriangle, AlertCircle, CheckCircle2, Clock, FileText } from 'lucide-react'
import { useStore, type DailyReport } from '@/store'

export default function DailyReportPage() {
  const { id } = useParams<{ id: string }>()
  const projectId = Number(id)
  const { currentProject, setCurrentProject, reports, setReports } = useStore()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [formData, setFormData] = useState({ content: '', blockers: '', risks: '' })

  useEffect(() => {
    fetch(`/api/projects/${projectId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setCurrentProject(data.data)
      })

    fetch(`/api/reports/project/${projectId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setReports(data.data)
      })
  }, [projectId, setCurrentProject, setReports])

  const handleCreate = async () => {
    const res = await fetch(`/api/reports/project/${projectId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: formData.content,
        blockers: formData.blockers.split('\n').filter(Boolean),
        risks: formData.risks.split('\n').filter(Boolean),
      }),
    })
    const data = await res.json()
    if (data.success) {
      setReports([data.data, ...reports])
      setShowCreateModal(false)
      setFormData({ content: '', blockers: '', risks: '' })
    }
  }

  const getRiskLevel = (risk: string) => {
    if (risk.includes('🔴') || risk.includes('严重')) return { color: 'text-rose-600 bg-rose-50 border-rose-200', icon: AlertTriangle }
    if (risk.includes('🟡') || risk.includes('中等')) return { color: 'text-amber-600 bg-amber-50 border-amber-200', icon: AlertCircle }
    return { color: 'text-emerald-600 bg-emerald-50 border-emerald-200', icon: CheckCircle2 }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1e1b4b]">日报中心</h1>
          <p className="text-slate-500 text-sm mt-1">{currentProject?.name} - 项目日报与运营周报</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-[#1e1b4b] hover:bg-[#2d2a5e] text-white px-4 py-2.5 rounded-lg font-medium transition-colors"
        >
          <FileText className="w-4 h-4" />
          新建日报
        </button>
      </div>

      {reports.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">暂无日报</h3>
          <p className="text-slate-500 mb-4">运营迭代师尚未提交日报记录</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-amber-500 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-amber-600 transition-colors"
          >
            创建日报
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report: DailyReport) => {
            const blockers = JSON.parse(report.blockers || '[]')
            const risks = JSON.parse(report.risks || '[]')

            return (
              <div key={report.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                      <div className="font-semibold text-[#1e1b4b]">项目日报</div>
                      <div className="text-xs text-slate-500">
                        {new Date(report.created_at).toLocaleDateString('zh-CN', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          weekday: 'long',
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{new Date(report.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>

                <div className="p-4">
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">今日进展</h4>
                    <p className="text-sm text-slate-600 whitespace-pre-line">{report.content}</p>
                  </div>

                  {blockers.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-slate-700 mb-2">阻塞项</h4>
                      <div className="space-y-2">
                        {blockers.map((blocker: string, idx: number) => (
                          <div key={idx} className="flex items-start gap-2 p-2 bg-amber-50 rounded-lg border border-amber-100">
                            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-amber-800">{blocker}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {risks.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-slate-700 mb-2">风险预警</h4>
                      <div className="space-y-2">
                        {risks.map((risk: string, idx: number) => {
                          const level = getRiskLevel(risk)
                          const LevelIcon = level.icon
                          return (
                            <div key={idx} className={`flex items-start gap-2 p-2 rounded-lg border ${level.color}`}>
                              <LevelIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                              <span className="text-sm">{risk}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-lg p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-[#1e1b4b] mb-4">新建日报</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">今日进展</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent h-24 resize-none text-sm"
                  placeholder="描述今日项目进展..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">阻塞项（每行一个）</label>
                <textarea
                  value={formData.blockers}
                  onChange={(e) => setFormData({ ...formData, blockers: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent h-20 resize-none text-sm"
                  placeholder="输入阻塞项，每行一个..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">风险预警（每行一个）</label>
                <textarea
                  value={formData.risks}
                  onChange={(e) => setFormData({ ...formData, risks: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent h-20 resize-none text-sm"
                  placeholder="输入风险项，每行一个..."
                />
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
                onClick={handleCreate}
                disabled={!formData.content.trim()}
                className="flex-1 px-4 py-2.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                提交日报
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
