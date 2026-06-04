import { Router, Request, Response } from 'express'
import * as deliverableService from '../services/deliverableService.js'

const router = Router()

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const deliverable = await deliverableService.getDeliverableById(Number(req.params.id))
    if (!deliverable) {
      res.status(404).json({ success: false, error: 'Deliverable not found' })
      return
    }
    res.json({ success: true, data: deliverable })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

export default router
