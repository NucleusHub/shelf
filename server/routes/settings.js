import { Router } from 'express'
import ShelfSettings from '../models/ShelfSettings.js'

const router = Router()

const OPEN_DEFAULTS = {
  book: { type: 'googlebooks', customUrl: '', titleFormat: 'raw' },
  audio: { type: 'audible', customUrl: '', titleFormat: 'raw' },
}
const DEFAULTS = { ratingMax: 10, defaultView: 'grid', providers: ['openlibrary'], hiddenProviders: [], openDefaults: OPEN_DEFAULTS }

const TITLE_FORMATS = ['raw', 'lower', 'kebab', 'snake', 'pascal', 'camel']

const mapObj = (m) => (m instanceof Map ? Object.fromEntries(m) : m && typeof m === 'object' ? m : {})

function pickOpenTarget(t, fallbackType = 'custom') {
  return {
    type: typeof t?.type === 'string' && t.type.trim() ? t.type.trim() : fallbackType,
    customUrl: typeof t?.customUrl === 'string' ? t.customUrl : '',
    titleFormat: TITLE_FORMATS.includes(t?.titleFormat) ? t.titleFormat : 'raw',
  }
}

function shape(doc) {
  const stored = mapObj(doc?.openDefaults)
  const openDefaults = { book: OPEN_DEFAULTS.book, audio: OPEN_DEFAULTS.audio, ...stored }
  return {
    ratingMax: 10,
    defaultView: doc?.defaultView ?? DEFAULTS.defaultView,
    providers: doc?.providers ?? DEFAULTS.providers,
    hiddenProviders: doc?.hiddenProviders ?? DEFAULTS.hiddenProviders,
    openDefaults,
  }
}

router.get('/settings', async (req, res) => {
  try {
    const doc = await ShelfSettings.findOne({ profileId: req.profile.profileId }).lean()
    res.json(shape(doc))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.put('/settings', async (req, res) => {
  try {
    const update = {}
    update.ratingMax = 10
    if (['grid', 'list'].includes(req.body?.defaultView)) update.defaultView = req.body.defaultView
    if (Array.isArray(req.body?.providers)) {
      update.providers = req.body.providers.filter((p) => typeof p === 'string')
    }
    if (Array.isArray(req.body?.hiddenProviders)) {
      update.hiddenProviders = req.body.hiddenProviders.filter((p) => typeof p === 'string')
    }
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
