import { Router, Request, Response } from 'express'
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import * as agentService from '../services/agentService.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const uploadDir = path.join(__dirname, '../../uploads')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir)
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
    cb(null, uniqueSuffix + path.extname(file.originalname))
  },
})

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } })

const router = Router()

router.get('/', async (_req: Request, res: Response) => {
  try {
    const agents = await agentService.getAgents()
    res.json({ success: true, data: agents })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

router.post('/upload-md', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: 'No file uploaded' })
      return
    }
    const content = fs.readFileSync(req.file.path, 'utf-8')
    fs.unlinkSync(req.file.path)
    res.json({ success: true, data: { content } })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

router.post('/upload-avatar', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: 'No file uploaded' })
      return
    }
    const url = `/uploads/${req.file.filename}`
    res.json({ success: true, data: { url } })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const agent = await agentService.getAgentById(req.params.id)
    if (!agent) {
      res.status(404).json({ success: false, error: 'Agent not found' })
      return
    }
    res.json({ success: true, data: agent })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

router.post('/', async (req: Request, res: Response) => {
  try {
    const { id, name, role, description, prompt_template, avatar } = req.body
    const agent = await agentService.createAgent({ id, name, role, description, prompt_template, avatar })
    res.json({ success: true, data: agent })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { name, role, description, prompt_template, avatar, status } = req.body
    const agent = await agentService.updateAgent(req.params.id, { name, role, description, prompt_template, avatar, status })
    res.json({ success: true, data: agent })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await agentService.deleteAgent(req.params.id)
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

router.put('/:id/prompt', async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body
    const agent = await agentService.updateAgentPrompt(req.params.id, prompt)
    res.json({ success: true, data: agent })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

router.post('/:id/models', async (req: Request, res: Response) => {
  try {
    const { provider, model_name, api_base, api_key, is_active } = req.body
    const model = await agentService.addAgentModel(req.params.id, {
      provider,
      model_name,
      api_base,
      api_key,
      is_active,
    })
    res.json({ success: true, data: model })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

router.get('/:id/models', async (req: Request, res: Response) => {
  try {
    const models = await agentService.getAgentModels(req.params.id)
    res.json({ success: true, data: models })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

router.put('/:id/models/:modelId/active', async (req: Request, res: Response) => {
  try {
    const model = await agentService.setActiveModel(req.params.id, Number(req.params.modelId))
    res.json({ success: true, data: model })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

router.delete('/:id/models/:modelId', async (req: Request, res: Response) => {
  try {
    await agentService.deleteAgentModel(Number(req.params.modelId))
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

export default router
