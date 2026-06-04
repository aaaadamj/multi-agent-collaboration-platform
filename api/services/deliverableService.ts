import { getDb } from '../db/index.js'

export async function createDeliverable(projectId: number, nodeId: number, title: string, content: string, type: string) {
  const db = await getDb()
  const result = await db.run(
    'INSERT INTO deliverables (project_id, node_id, title, content, type) VALUES (?, ?, ?, ?, ?)',
    [projectId, nodeId, title, content, type]
  )
  return db.get('SELECT * FROM deliverables WHERE id = ?', [result.lastID])
}

export async function getProjectDeliverables(projectId: number) {
  const db = await getDb()
  return db.all('SELECT * FROM deliverables WHERE project_id = ? ORDER BY created_at DESC', [projectId])
}

export async function getDeliverableById(id: number) {
  const db = await getDb()
  return db.get('SELECT * FROM deliverables WHERE id = ?', [id])
}
