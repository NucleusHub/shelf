import { Router } from 'express'
import LibraryItem from '../models/LibraryItem.js'
import ReadingSession from '../models/ReadingSession.js'
import { toEntry } from './entry.js'

const router = Router()

async function loadItem(req, res) {
  const item = await LibraryItem.findOne({ _id: req.params.id, profileId: req.profile.profileId }).populate('book')
  if (!item) { res.status(404).json({ error: 'Not found' }); return null }
  return item
}

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

router.delete('/sessions/:sid', async (req, res) => {
  try {
    const session = await ReadingSession.findOneAndDelete({ _id: req.params.sid, profileId: req.profile.profileId })
    if (!session) return res.status(404).json({ error: 'Not found' })

    const item = await LibraryItem.findOne({ _id: session.item, profileId: req.profile.profileId }).populate('book')
    if (item) {
      const remaining = await ReadingSession.find({ item: item._id }).sort({ endingPage: -1 }).limit(1).lean()
      item.currentPage = remaining[0]?.endingPage || 0
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
