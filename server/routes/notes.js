import { Router } from 'express'
import LibraryItem from '../models/LibraryItem.js'
import Note from '../models/Note.js'

const router = Router()

// Keep the denormalised notesCount on the item honest after every mutation.
async function syncCount(itemId) {
  const count = await Note.countDocuments({ item: itemId })
  await LibraryItem.updateOne({ _id: itemId }, { $set: { notesCount: count } })
  return count
}

// GET /books/:id/notes — a book's notes, newest first.
router.get('/books/:id/notes', async (req, res) => {
  try {
    const item = await LibraryItem.findOne({ _id: req.params.id, profileId: req.profile.profileId }).select('_id')
    if (!item) return res.status(404).json({ error: 'Not found' })
    const notes = await Note.find({ item: item._id }).sort({ updatedAt: -1 }).lean()
    res.json(notes)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /books/:id/notes — add a note.
router.post('/books/:id/notes', async (req, res) => {
  try {
    const item = await LibraryItem.findOne({ _id: req.params.id, profileId: req.profile.profileId })
    if (!item) return res.status(404).json({ error: 'Not found' })
    const note = await Note.create({
      profileId: req.profile.profileId,
      item: item._id,
      book: item.book,
      title: (req.body?.title || '').trim(),
      content: req.body?.content || '',
    })
    const notesCount = await syncCount(item._id)
    res.status(201).json({ note, notesCount })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// PATCH /notes/:nid — edit a note's title/content.
router.patch('/notes/:nid', async (req, res) => {
  try {
    const update = {}
    if (req.body?.title !== undefined) update.title = (req.body.title || '').trim()
    if (req.body?.content !== undefined) update.content = req.body.content || ''
    const note = await Note.findOneAndUpdate(
      { _id: req.params.nid, profileId: req.profile.profileId },
      { $set: update },
      { new: true, runValidators: true }
    )
    if (!note) return res.status(404).json({ error: 'Not found' })
    res.json(note)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// DELETE /notes/:nid — remove a note.
router.delete('/notes/:nid', async (req, res) => {
  try {
    const note = await Note.findOneAndDelete({ _id: req.params.nid, profileId: req.profile.profileId })
    if (!note) return res.status(404).json({ error: 'Not found' })
    const notesCount = await syncCount(note.item)
    res.json({ ok: true, notesCount })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
