import { Router } from 'express'
import path from 'path'
import fs from 'node:fs'
import { fileURLToPath } from 'url'
import Book from '../models/Book.js'
import LibraryItem from '../models/LibraryItem.js'
import ReadingSession from '../models/ReadingSession.js'
import Note from '../models/Note.js'
import { toEntry, pick, BOOK_FIELDS, ITEM_FIELDS } from './entry.js'

const router = Router()
const uploadsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../uploads')

// Remove a cover from disk if (and only if) it's one we uploaded locally.
function unlinkCover(coverUrl) {
  if (coverUrl?.startsWith('/uploads/')) {
    fs.unlink(path.join(uploadsDir, path.basename(coverUrl)), () => {})
  }
}

// GET /entries — the whole library for the signed-in user, newest-updated first.
// A personal library is small enough (hundreds–low thousands) to send in one
// go; the client handles all filtering/sorting/search so interactions stay
// instant and offline-friendly.
router.get('/entries', async (req, res) => {
  try {
    const items = await LibraryItem.find({ profileId: req.profile.profileId })
      .populate('book')
      .sort({ updatedAt: -1 })
    res.json(items.map(toEntry))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /books/:id — a single entry for the detail page.
router.get('/books/:id', async (req, res) => {
  try {
    const item = await LibraryItem.findOne({ _id: req.params.id, profileId: req.profile.profileId }).populate('book')
    if (!item) return res.status(404).json({ error: 'Not found' })
    res.json(toEntry(item))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /books — add a book. Body is { book: {...}, item: {...} }; both parts are
// created together so an entry always has its work. Falls back gracefully if the
// client sends a flat object.
router.post('/books', async (req, res) => {
  try {
    const bookData = pick(req.body?.book ?? req.body ?? {}, BOOK_FIELDS)
    const itemData = pick(req.body?.item ?? req.body ?? {}, ITEM_FIELDS)
    if (!bookData.title) return res.status(400).json({ error: 'Title is required' })

    const book = await Book.create({ ...bookData, profileId: req.profile.profileId })
    let item
    try {
      item = await LibraryItem.create({
        ...itemData,
        book: book._id,
        profileId: req.profile.profileId,
      })
    } catch (err) {
      // Don't leave a Book with no entry pointing at it if the item (e.g. a bad
      // status/format enum) fails validation.
      await Book.deleteOne({ _id: book._id }).catch(() => {})
      throw err
    }
    item.book = book
    res.status(201).json(toEntry(item))
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// PATCH /books/:id — update either side. Body is { book?: {...}, item?: {...} }.
router.patch('/books/:id', async (req, res) => {
  try {
    const item = await LibraryItem.findOne({ _id: req.params.id, profileId: req.profile.profileId })
    if (!item) return res.status(404).json({ error: 'Not found' })

    const itemData = pick(req.body?.item ?? {}, ITEM_FIELDS)
    if (Object.keys(itemData).length) {
      item.set(itemData)
      await item.save()
    }

    const bookData = pick(req.body?.book ?? {}, BOOK_FIELDS)
    if (Object.keys(bookData).length) {
      const current = await Book.findOne({ _id: item.book, profileId: req.profile.profileId }).lean()
      // Merge identifiers rather than replacing the whole Mixed map, so a partial
      // update (e.g. just isbn13) doesn't wipe an existing orbitFileId / provider id.
      if (bookData.identifiers && typeof bookData.identifiers === 'object' && current?.identifiers) {
        bookData.identifiers = { ...current.identifiers, ...bookData.identifiers }
      }
      await Book.updateOne(
        { _id: item.book, profileId: req.profile.profileId },
        { $set: bookData },
        { runValidators: true }
      )
      // Reclaim the old locally-uploaded cover when it's been replaced/removed.
      if ('coverUrl' in bookData && current?.coverUrl && current.coverUrl !== bookData.coverUrl) {
        unlinkCover(current.coverUrl)
      }
    }

    await item.populate('book')
    res.json(toEntry(item))
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// DELETE /books/:id — remove the entry and everything hanging off it (book,
// sessions, notes, and any locally-uploaded cover).
router.delete('/books/:id', async (req, res) => {
  try {
    const item = await LibraryItem.findOne({ _id: req.params.id, profileId: req.profile.profileId }).populate('book')
    if (!item) return res.status(404).json({ error: 'Not found' })

    if (item.book?.coverUrl) unlinkCover(item.book.coverUrl)
    await Promise.all([
      LibraryItem.deleteOne({ _id: item._id }),
      Book.deleteOne({ _id: item.book?._id, profileId: req.profile.profileId }),
      ReadingSession.deleteMany({ item: item._id }),
      Note.deleteMany({ item: item._id }),
    ])
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
