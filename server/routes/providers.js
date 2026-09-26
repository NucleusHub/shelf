import { Router } from 'express'
import ShelfSettings from '../models/ShelfSettings.js'
import { describeProviders, enabledProviders, searchProviders } from '../providers/index.js'

const router = Router()

async function userProviderIds(profileId) {
  const doc = await ShelfSettings.findOne({ profileId }).select('providers hiddenProviders').lean()
  const stored = doc?.providers ?? ['openlibrary']
  const hidden = new Set(doc?.hiddenProviders ?? [])
  const pluginIds = describeProviders().filter((p) => p.pluginId && p.available).map((p) => p.id)
  return [...new Set([...stored, ...pluginIds])].filter((id) => !hidden.has(id))
}

router.get('/providers', (_req, res) => {
  res.json(describeProviders())
})

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

router.get('/providers/isbn/:isbn', async (req, res) => {
  try {
    const ids = await userProviderIds(req.profile.profileId)
    for (const p of enabledProviders(ids)) {
      try {
        const hit = await p.getByIsbn(req.params.isbn)
        if (hit) return res.json(hit)
      } catch {
      }
    }
    res.status(404).json({ error: 'Not found' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
