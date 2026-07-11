import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import settings from './settings.js'
import providers from './providers.js'
import sessions from './sessions.js'
import notes from './notes.js'
import admin from './admin.js'
import library from './library.js'

// Everything under /api/shelf requires a signed-in profile. Sub-routers are
// mounted on the same root; their paths don't collide (different depths), and
// library is last because it owns the broad /books/:id verbs.
const router = Router()
router.use(requireAuth)
router.use(settings)
router.use(providers)
router.use(sessions)
router.use(notes)
router.use(admin)
router.use(library)

export default router
