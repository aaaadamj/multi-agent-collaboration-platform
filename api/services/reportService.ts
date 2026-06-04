import { getDb } from '../db/index.js'

export async function createDailyReport(projectId: number, content: string, blockers: string, risks: string, pendingApprovals: string) {
  const db = await getDb()
  const result = await db.run(
    'INSERT INTO daily_reports (project_id, content, blockers, risks, pending_approvals) VALUES (?, ?, ?, ?, ?)',
    [projectId, content, blockers, risks, pendingApprovals]
  )
  return db.get('SELECT * FROM daily_reports WHERE id = ?', [result.lastID])
}

export async function getProjectReports(projectId: number) {
  const db = await getDb()
  return db.all('SELECT * FROM daily_reports WHERE project_id = ? ORDER BY created_at DESC', [projectId])
}

export async function getReportById(id: number) {
  const db = await getDb()
  return db.get('SELECT * FROM daily_reports WHERE id = ?', [id])
}
