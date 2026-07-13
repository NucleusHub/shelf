import { Router } from 'express'
import ShelfSettings from '../models/ShelfSettings.js'

const router = Router()

// Built-in medium defaults. Plugin mediums (e.g. 'manga') aren't listed here —
// the server is agnostic to which mediums exist; it stores whatever medium keys
// the client sends. The client (utils/openTarget.js) owns the medium set.
const OPEN_DEFAULTS = {
  book: { type: 'googlebooks', customUrl: '', titleFormat: 'raw' },
  audio: { type: 'audible', customUrl: '', titleFormat: 'raw' },
}
const DEFAULTS = { ratingMax: 10, defaultView: 'grid', providers: ['openlibrary'], hiddenProviders: [], openDefaults: OPEN_DEFAULTS }

const TITLE_FORMATS = ['raw', 'lower', 'kebab', 'snake', 'pascal', 'camel']

// Mongoose Map (or lean plain object) → plain object.
const mapObj = (m) => (m instanceof Map ? Object.fromEntries(m) : m && typeof m === 'object' ? m : {})

// Coerce a client-supplied open target into the stored shape, dropping junk.
// `type` is a free string (destinations are open-ended, incl. plugin-contributed
// ones); only the title-format enum and the object shape are validated.
function pickOpenTarget(t, fallbackType = 'custom') {
  return {
    type: typeof t?.type === 'string' && t.type.trim() ? t.type.trim() : fallbackType,
    customUrl: typeof t?.customUrl === 'string' ? t.customUrl : '',
    titleFormat: TITLE_FORMATS.includes(t?.titleFormat) ? t.titleFormat : 'raw',
  }
}

function shape(doc) {
  const stored = mapObj(doc?.openDefaults)
  // Ensure the built-in mediums always resolve; carry through any plugin mediums.
  const openDefaults = { book: OPEN_DEFAULTS.book, audio: OPEN_DEFAULTS.audio, ...stored }
  return {
    ratingMax: 10,
    defaultView: doc?.defaultView ?? DEFAULTS.defaultView,
    providers: doc?.providers ?? DEFAULTS.providers,
    hiddenProviders: doc?.hiddenProviders ?? DEFAULTS.hiddenProviders,
    openDefaults,
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

// PUT /settings — upsert. Validates field shapes; ignores unknown keys.
router.put('/settings', async (req, res) => {
  try {
    const update = {}
    update.ratingMax = 10 // fixed scale; heal any stored 5
    if (['grid', 'list'].includes(req.body?.defaultView)) update.defaultView = req.body.defaultView
    if (Array.isArray(req.body?.providers)) {
      update.providers = req.body.providers.filter((p) => typeof p === 'string')
    }
    if (Array.isArray(req.body?.hiddenProviders)) {
      update.hiddenProviders = req.body.hiddenProviders.filter((p) => typeof p === 'string')
    }
    // Store any medium keys the client sends (book, audio, and plugin mediums).
    if (req.body?.openDefaults && typeof req.body.openDefaults === 'object') {
      update.openDefaults = {}
      for (const [medium, target] of Object.entries(req.body.openDefaults)) {
        update.openDefaults[medium] = pickOpenTarget(target)
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
