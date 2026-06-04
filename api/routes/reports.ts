import { Router, Request, Response } from 'express'
import * as reportService from '../services/reportService.js'

const router = Router()

router.get('/project/:projectId', async (req: Request, res: Response) => {
  try {
    const reports = await reportService.getProjectReports(Number(req.params.projectId))
    res.json({ success: true, data: reports })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

router.post('/project/:projectId', async (req: Request, res: Response) => {
  try {
    const { content, blockers, risks, pendingApprovals } = req.body
    const report = await reportService.createDailyReport(
      Number(req.params.projectId),
      content,
      JSON.stringify(blockers || []),
      JSON.stringify(risks || []),
      JSON.stringify(pendingApprovals || [])
    )
    res.json({ success: true, data: report })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

export default router
