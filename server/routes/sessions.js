import { Router } from 'express'
import LibraryItem from '../models/LibraryItem.js'
import ReadingSession from '../models/ReadingSession.js'
import { toEntry } from './entry.js'

const router = Router()

// Load the caller's item or send 404. Returns null after responding.
async function loadItem(req, res) {
  const item = await LibraryItem.findOne({ _id: req.params.id, profileId: req.profile.profileId }).populate('book')
  if (!item) { res.status(404).json({ error: 'Not found' }); return null }
  return item
}

// GET /sessions — every session for the user (for the statistics page: streaks,
// monthly activity, pace). Lightweight and sorted oldest-first.
router.get('/sessions', async (req, res) => {
  try {
    const sessions = await ReadingSession.find({ profileId: req.profile.profileId })
      .sort({ date: 1 })
      .lean()
    res.json(sessions)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /books/:id/sessions — reading history for one book, newest first.
router.get('/books/:id/sessions', async (req, res) => {
  try {
    const item = await loadItem(req, res)
    if (!item) return
    const sessions = await ReadingSession.find({ item: item._id }).sort({ date: -1 }).lean()
    res.json(sessions)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /books/:id/sessions — log progress. This is the one write that moves a
// book forward, so it owns all the derived bookkeeping: it advances currentPage,
// flips a planned book to "reading" and stamps startedReading, and auto-finishes
// when you reach the last page. Accepts either an endingPage or a pagesRead
// delta (or both); the other is inferred.
router.post('/books/:id/sessions', async (req, res) => {
  try {
    const item = await loadItem(req, res)
    if (!item) return

    const pageCount = item.book?.pageCount || 0
    const prevPage = item.currentPage || 0
    const date = req.body?.date ? new Date(req.body.date) : new Date()
    const duration = req.body?.duration != null && req.body.duration !== '' ? Number(req.body.duration) : null

    let endingPage = req.body?.endingPage != null && req.body.endingPage !== '' ? Number(req.body.endingPage) : null
    let pagesRead = req.body?.pagesRead != null && req.body.pagesRead !== '' ? Number(req.body.pagesRead) : null

    if (endingPage == null && pagesRead != null) endingPage = prevPage + pagesRead
    if (endingPage == null) endingPage = prevPage
    // Clamp to the real length BEFORE deriving pagesRead, so logging past the last
    // page can't inflate the stored pages-read (and every stat built on it).
    if (pageCount) endingPage = Math.min(endingPage, pageCount)
    if (pagesRead == null) pagesRead = Math.max(0, endingPage - prevPage)
    else pagesRead = Math.max(0, Math.min(pagesRead, endingPage - prevPage))

    const session = await ReadingSession.create({
      profileId: req.profile.profileId,
      item: item._id,
      book: item.book?._id,
      date,
      pagesRead: Math.max(0, pagesRead),
      endingPage,
      duration: Number.isFinite(duration) ? duration : null,
    })

    // Only ever move forward — logging an old session shouldn't rewind progress.
    item.currentPage = Math.max(prevPage, endingPage)
    if (item.status === 'planned' || item.status === 'on_hold') item.status = 'reading'
    if (!item.startedReading) item.startedReading = date
    if (pageCount && item.currentPage >= pageCount) {
      item.status = 'finished'
      if (!item.finishedReading) item.finishedReading = date
    }
    await item.save()

    res.status(201).json({ session, entry: toEntry(item) })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// DELETE /sessions/:sid — remove a session and recompute the book's currentPage
// from whatever sessions remain (so deleting the latest session rewinds cleanly).
router.delete('/sessions/:sid', async (req, res) => {
  try {
    const session = await ReadingSession.findOneAndDelete({ _id: req.params.sid, profileId: req.profile.profileId })
    if (!session) return res.status(404).json({ error: 'Not found' })

    const item = await LibraryItem.findOne({ _id: session.item, profileId: req.profile.profileId }).populate('book')
    if (item) {
      const remaining = await ReadingSession.find({ item: item._id }).sort({ endingPage: -1 }).limit(1).lean()
      item.currentPage = remaining[0]?.endingPage || 0
      // If rewinding drops us below the last page, the book is no longer finished
      // (only when we actually know the length — don't un-finish manually-set books).
      const pageCount = item.book?.pageCount || 0
      if (item.status === 'finished' && pageCount && item.currentPage < pageCount) {
        item.status = item.currentPage > 0 ? 'reading' : 'planned'
        item.finishedReading = null
      }
      await item.save()
      return res.json({ ok: true, entry: toEntry(item) })
    }
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
