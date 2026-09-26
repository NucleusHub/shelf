import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import mongoose from 'mongoose'
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'
import shelfRoutes from './routes/index.js'
import { loadPluginProviders } from './providers/index.js'
import { requireAppEnabled } from './core/server/appAccess.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const uploadsDir = path.resolve(__dirname, 'uploads')

const app = express()
const PORT = process.env.PORT || 3010

app.use(cors({ origin: true, credentials: true }))
app.use(express.json())
app.use(cookieParser())
app.use('/uploads', express.static(uploadsDir))

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`)
  },
})
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true)
    else cb(new Error('Only image files are allowed'))
  },
})

app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' })
  res.json({ url: `/uploads/${req.file.filename}` })
})

app.get('/api/shelf/health', (_, res) => res.json({ ok: true }))
app.use('/api/shelf', requireAppEnabled('shelf'))
app.use('/api/shelf', shelfRoutes)

mongoose
  .connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('[shelf] connected to MongoDB')
    await loadPluginProviders()
    app.listen(PORT, () => console.log(`[shelf] server on port ${PORT}`))
  })
  .catch((err) => {
    console.error('[shelf] MongoDB connection error:', err)
    process.exit(1)
  })
