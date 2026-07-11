import { Router } from 'express'
import ShelfSettings, { OPEN_TYPES } from '../models/ShelfSettings.js'

const router = Router()

const OPEN_DEFAULTS = {
  book: { type: 'googlebooks', customUrl: '', titleFormat: 'raw' },
  audio: { type: 'audible', customUrl: '', titleFormat: 'raw' },
}
const DEFAULTS = { ratingMax: 10, defaultView: 'grid', providers: ['openlibrary'], openDefaults: OPEN_DEFAULTS }

const TITLE_FORMATS = ['raw', 'lower', 'kebab', 'snake', 'pascal', 'camel']

// Coerce a client-supplied open target into the stored shape, dropping junk.
function pickOpenTarget(t, fallbackType) {
  return {
    type: OPEN_TYPES.includes(t?.type) ? t.type : fallbackType,
    customUrl: typeof t?.customUrl === 'string' ? t.customUrl : '',
    titleFormat: TITLE_FORMATS.includes(t?.titleFormat) ? t.titleFormat : 'raw',
  }
}

function shape(doc) {
  return {
    ratingMax: 10,
    defaultView: doc?.defaultView ?? DEFAULTS.defaultView,
    providers: doc?.providers ?? DEFAULTS.providers,
    openDefaults: {
      book: doc?.openDefaults?.book ?? OPEN_DEFAULTS.book,
      audio: doc?.openDefaults?.audio ?? OPEN_DEFAULTS.audio,
    },
  }
}

// GET /settings — the user's Shelf preferences (created lazily on first save).
router.get('/settings', async (req, res) => {
  try {
    const doc = await ShelfSettings.findOne({ profileId: req.profile.profileId }).lean()
    res.json(shape(doc))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /settings — upsert. Validates the enumerated fields; ignores unknown keys.
router.put('/settings', async (req, res) => {
  try {
    const update = {}
    update.ratingMax = 10 // fixed scale; heal any stored 5
    if (['grid', 'list'].includes(req.body?.defaultView)) update.defaultView = req.body.defaultView
    if (Array.isArray(req.body?.providers)) {
      update.providers = req.body.providers.filter((p) => typeof p === 'string')
    }
    if (req.body?.openDefaults && typeof req.body.openDefaults === 'object') {
      update.openDefaults = {
        book: pickOpenTarget(req.body.openDefaults.book, 'googlebooks'),
        audio: pickOpenTarget(req.body.openDefaults.audio, 'audible'),
      }
    }
    const doc = await ShelfSettings.findOneAndUpdate(
      { profileId: req.profile.profileId },
      { $set: update },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    ).lean()
    res.json(shape(doc))
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

export default router
