import { Router } from 'express'
import ShelfSettings from '../models/ShelfSettings.js'
import { describeProviders, enabledProviders, searchProviders } from '../providers/index.js'

const router = Router()

// The provider ids searched for this user. Built-ins are opt-in (must be listed
// in `providers`); plugin-contributed sources are on by default (the plugin
// being installed is the opt-in) unless the user turned them off in
// `hiddenProviders`. So installing the manga plugin makes it searchable with no
// extra step, while still being switch-off-able in Settings.
async function userProviderIds(profileId) {
  const doc = await ShelfSettings.findOne({ profileId }).select('providers hiddenProviders').lean()
  const stored = doc?.providers ?? ['openlibrary']
  const hidden = new Set(doc?.hiddenProviders ?? [])
  const pluginIds = describeProviders().filter((p) => p.pluginId && p.available).map((p) => p.id)
  return [...new Set([...stored, ...pluginIds])].filter((id) => !hidden.has(id))
}

// GET /providers — descriptors for the settings UI (id, label, whether it needs
// a key, whether it's usable right now).
router.get('/providers', (_req, res) => {
  res.json(describeProviders())
})

// GET /providers/search?q= — metadata lookup for the "add book" typeahead. Fans
// the query across the user's enabled providers and returns normalised results.
router.get('/providers/search', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim()
    if (q.length < 2) return res.json([])
    const ids = await userProviderIds(req.profile.profileId)
    res.json(await searchProviders(ids, q))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /providers/isbn/:isbn — exact lookup (for a future barcode-scanner flow).
router.get('/providers/isbn/:isbn', async (req, res) => {
  try {
    const ids = await userProviderIds(req.profile.profileId)
    for (const p of enabledProviders(ids)) {
      // Don't let one provider's network/parse failure abort the lookup — a later
      // provider may still have the match.
      try {
        const hit = await p.getByIsbn(req.params.isbn)
        if (hit) return res.json(hit)
      } catch {
        // try the next provider
      }
    }
    res.status(404).json({ error: 'Not found' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
