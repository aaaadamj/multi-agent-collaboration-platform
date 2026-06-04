/**
 * This is a API server
 */

import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import projectRoutes from './routes/projects.js'
import agentRoutes from './routes/agents.js'
import reportRoutes from './routes/reports.js'
import deliverableRoutes from './routes/deliverables.js'
import fileRoutes from './routes/files.js'
import skillRoutes from './routes/skills.js'
import workflowEditorRoutes from './routes/workflowEditor.js'

// load env
dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

/**
 * API Routes
 */
app.use('/api/projects', projectRoutes)
app.use('/api/agents', agentRoutes)
app.use('/api/reports', reportRoutes)
app.use('/api/deliverables', deliverableRoutes)
// 文件路由挂载在 /api/projects/:id 下（与项目路由共享 :id 参数）
app.use('/api/projects', fileRoutes)
app.use('/api/skills', skillRoutes)
app.use('/api/projects/:projectId/workflow', workflowEditorRoutes)

/**
 * health
 */
app.use(
  '/api/health',
  (req: Request, res: Response, next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

/**
 * error handler middleware
 */
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({
    success: false,
    error: 'Server internal error',
  })
})

/**
 * 404 handler
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export default app
