import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import settings from './settings.js'
import providers from './providers.js'
import sessions from './sessions.js'
import notes from './notes.js'
import admin from './admin.js'
import library from './library.js'

const router = Router()
router.use(requireAuth)
router.use(settings)
router.use(providers)
router.use(sessions)
router.use(notes)
router.use(admin)
// Last: library owns the broad /books/:id verbs.
router.use(library)

export default router
