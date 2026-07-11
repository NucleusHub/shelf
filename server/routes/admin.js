import { Router } from 'express'
import path from 'path'
import fs from 'node:fs'
import { fileURLToPath } from 'url'
import Book from '../models/Book.js'
import LibraryItem from '../models/LibraryItem.js'
import ReadingSession from '../models/ReadingSession.js'
import Note from '../models/Note.js'
import ShelfSettings from '../models/ShelfSettings.js'

const router = Router()
const uploadsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../uploads')

function requireAdmin(req, res, next) {
  if (req.profile?.role !== 'admin') return res.status(403).json({ error: 'Admin required' })
  next()
}

// POST /users/:userId/teardown — called by the admin panel when a user is
// deleted: purge all of their Shelf data and any locally-uploaded covers.
router.post('/users/:userId/teardown', requireAdmin, async (req, res) => {
  try {
    const books = await Book.find({ profileId: req.params.userId }).select('coverUrl')
    for (const b of books) {
      if (b.coverUrl?.startsWith('/uploads/')) {
        fs.unlink(path.join(uploadsDir, path.basename(b.coverUrl)), () => {})
      }
    }
    const [items] = await Promise.all([
      LibraryItem.deleteMany({ profileId: req.params.userId }),
      Book.deleteMany({ profileId: req.params.userId }),
      ReadingSession.deleteMany({ profileId: req.params.userId }),
      Note.deleteMany({ profileId: req.params.userId }),
      ShelfSettings.deleteMany({ profileId: req.params.userId }),
    ])
    res.json({ ok: true, deleted: items.deletedCount })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
