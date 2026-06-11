import { Router, Request, Response } from 'express'
import * as deliverableService from '../services/deliverableService.js'
import { ok, created, notFound, badRequest, serverError } from '../utils/apiResponse.js'

const router = Router()

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const deliverable = await deliverableService.getDeliverableById(Number(req.params.id))
    if (!deliverable) {
      res.status(404).json(notFound('Deliverable'))
      return
    }
    res.json(ok(deliverable))
  } catch (error) {
    res.status(500).json(serverError((error as Error).message))
  }
})

export default router
