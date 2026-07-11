import { Router } from 'express'
import ShelfSettings from '../models/ShelfSettings.js'

const router = Router()

const DEFAULTS = { ratingMax: 10, defaultView: 'grid', providers: ['openlibrary'] }

function shape(doc) {
  return {
    ratingMax: doc?.ratingMax ?? DEFAULTS.ratingMax,
    defaultView: doc?.defaultView ?? DEFAULTS.defaultView,
    providers: doc?.providers ?? DEFAULTS.providers,
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
    if ([5, 10].includes(Number(req.body?.ratingMax))) update.ratingMax = Number(req.body.ratingMax)
    if (['grid', 'list'].includes(req.body?.defaultView)) update.defaultView = req.body.defaultView
    if (Array.isArray(req.body?.providers)) {
      update.providers = req.body.providers.filter((p) => typeof p === 'string')
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
