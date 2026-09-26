import { readdirSync, readFileSync, existsSync } from 'fs'
import { fileURLToPath, pathToFileURL } from 'url'
import { dirname, join } from 'path'
import OpenLibraryProvider from './OpenLibraryProvider.js'
import GoogleBooksProvider from './GoogleBooksProvider.js'
import IsbnProvider from './IsbnProvider.js'

const REGISTRY = [
  new OpenLibraryProvider(),
  new GoogleBooksProvider(),
  new IsbnProvider(),
]

let byId = new Map(REGISTRY.map((p) => [p.id, p]))
const rebuildIndex = () => { byId = new Map(REGISTRY.map((p) => [p.id, p])) }

// Plugins are bind-mounted at /app/plugins; this file is /app/providers/index.js.
const PLUGINS_DIR = process.env.PLUGINS_DIR || join(dirname(fileURLToPath(import.meta.url)), '..', 'plugins')

export async function loadPluginProviders() {
  let dirs
  try {
    dirs = readdirSync(PLUGINS_DIR, { withFileTypes: true }).filter((e) => e.isDirectory())
  } catch {
    return
  }
  for (const entry of dirs) {
    const pluginId = entry.name
    const manifestPath = join(PLUGINS_DIR, pluginId, 'nucleus.plugin.json')
    if (!existsSync(manifestPath)) continue
    let manifest
    try { manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) } catch { continue }

    const targets = Array.isArray(manifest.target) ? manifest.target : [manifest.target]
    if (!targets.includes('shelf')) continue
    const specs = manifest.extensions?.shelfProviders
    if (!Array.isArray(specs)) continue

    for (const rel of specs) {
      if (typeof rel !== 'string') continue
      try {
        const mod = await import(pathToFileURL(join(PLUGINS_DIR, pluginId, rel)).href)
        const Provider = mod.default
        if (typeof Provider !== 'function') throw new Error('no default export class')
        const instance = new Provider()
        if (!instance.id || typeof instance.search !== 'function') throw new Error('does not implement the BookProvider contract')
        if (byId.has(instance.id)) { console.warn(`[shelf] provider id "${instance.id}" from plugin "${pluginId}" clashes with an existing provider — skipped`); continue }
        instance.pluginId = pluginId
        REGISTRY.push(instance)
        rebuildIndex()
        console.log(`[shelf] registered provider "${instance.id}" from plugin "${pluginId}"`)
      } catch (err) {
        console.warn(`[shelf] failed to load provider "${rel}" from plugin "${pluginId}": ${err.message}`)
      }
    }
  }
}

export function describeProviders() {
  return REGISTRY.map((p) => ({
    id: p.id,
    label: p.label,
    requiresKey: !!p.requiresKey,
    available: p.available(),
    pluginId: p.pluginId ?? null,
  }))
}

export function getProviderById(id) {
  return byId.get(id) || null
}

export function enabledProviders(enabledIds = []) {
  return REGISTRY.filter((p) => enabledIds.includes(p.id) && p.available())
}

export async function searchProviders(enabledIds, query) {
  const providers = enabledProviders(enabledIds)
  const settled = await Promise.allSettled(providers.map((p) => p.search(query)))
  const perProvider = settled.map((s) => (s.status === 'fulfilled' && Array.isArray(s.value) ? s.value : []))

  const ordered = []
  const depth = Math.max(0, ...perProvider.map((a) => a.length))
  for (let i = 0; i < depth; i++) {
    for (const arr of perProvider) if (i < arr.length) ordered.push(arr[i])
  }

  const seen = new Set()
  const merged = []
  for (const r of ordered) {
    if (!r || !r.title) continue
    const key = (r.isbn || `${r.title}|${(r.authors || [])[0] || ''}`).toLowerCase().trim()
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(r)
  }
  return merged
}
