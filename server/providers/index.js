// ─────────────────────────────────────────────────────────────────────────────
// Import providers — pluggable metadata sources for adding books.
//
// This mirrors Prism's `server/sources/` pattern: a documented duck-typed
// contract plus a registry, so new providers are added by dropping a class in
// and registering it here — no changes to the routes or the client.
//
//   interface BookProvider {
//     id: string                         // stable id, e.g. 'openlibrary'
//     label: string                      // human name for the UI
//     requiresKey: boolean               // true if it needs an API key/config
//     available(): boolean               // is it usable right now?
//     search(query: string): Promise<BookResult[]>
//     getByIsbn(isbn: string): Promise<BookResult | null>
//   }
//
//   type BookResult = {                  // the normalised shape every provider
//     title, subtitle, description,      // returns, matching the Book model
//     authors: string[],
//     series: { name, position } | null,
//     genres: string[],
//     language, publisher, publishedDate,
//     pageCount: number | null,
//     coverUrl: string | null,
//     isbn: string,
//     identifiers: object,               // { openlibrary, googlebooks, … }
//     source: string,                    // the provider id
//   }
//
// Providers implemented lazily on purpose: Open Library works today (no key);
// Google Books and a dedicated ISBN provider are registered but disabled, ready
// to be filled in. Enable/disable is a per-user setting (ShelfSettings.providers).
//
// Plugins can contribute more sources: a plugin targeting `shelf` declares
// `extensions.shelfProviders: ["server/MyProvider.js"]` in its manifest, and
// loadPluginProviders() (called at server startup) discovers, imports and
// registers them. Plugin-contributed providers carry a `pluginId` so the client
// can hide them when their plugin is disabled. See plugins/manga-source.
// ─────────────────────────────────────────────────────────────────────────────
import { readdirSync, readFileSync, existsSync } from 'fs'
import { fileURLToPath, pathToFileURL } from 'url'
import { dirname, join } from 'path'
import OpenLibraryProvider from './OpenLibraryProvider.js'
import GoogleBooksProvider from './GoogleBooksProvider.js'
import IsbnProvider from './IsbnProvider.js'

// Registry — order is the search/priority order. Built-ins first; plugin
// providers append themselves via loadPluginProviders().
const REGISTRY = [
  new OpenLibraryProvider(),
  new GoogleBooksProvider(),
  new IsbnProvider(),
]

let byId = new Map(REGISTRY.map((p) => [p.id, p]))
const rebuildIndex = () => { byId = new Map(REGISTRY.map((p) => [p.id, p])) }

// Plugins are bind-mounted at /app/plugins; this file is /app/providers/index.js.
const PLUGINS_DIR = process.env.PLUGINS_DIR || join(dirname(fileURLToPath(import.meta.url)), '..', 'plugins')

// Discover + register provider classes contributed by installed shelf plugins.
// Called once at startup (before the server listens). Never throws: a broken or
// missing plugin is skipped with a warning so it can't take Shelf down.
export async function loadPluginProviders() {
  let dirs
  try {
    dirs = readdirSync(PLUGINS_DIR, { withFileTypes: true }).filter((e) => e.isDirectory())
  } catch {
    return // no /plugins mount → nothing to add
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
        instance.pluginId = pluginId       // lets the client gate on the plugin's enabled state
        REGISTRY.push(instance)
        rebuildIndex()
        console.log(`[shelf] registered provider "${instance.id}" from plugin "${pluginId}"`)
      } catch (err) {
        console.warn(`[shelf] failed to load provider "${rel}" from plugin "${pluginId}": ${err.message}`)
      }
    }
  }
}

// A short, serialisable descriptor for the client (no methods). `pluginId` is
// set for plugin-contributed sources (null for built-ins).
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

// The providers a given user has enabled AND that are actually usable.
export function enabledProviders(enabledIds = []) {
  return REGISTRY.filter((p) => enabledIds.includes(p.id) && p.available())
}

// Fan a query out across the enabled providers and merge results, de-duplicating
// by ISBN (then title+author) so the same book from two sources shows once.
// Results are interleaved round-robin across providers rather than concatenated,
// so every source contributes to the top of the list — a source that returns
// few hits (or was added last, like a plugin provider) isn't buried under a
// flood from another and then cut off by the client's result cap.
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
