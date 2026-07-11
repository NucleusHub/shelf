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
// ─────────────────────────────────────────────────────────────────────────────
import OpenLibraryProvider from './OpenLibraryProvider.js'
import GoogleBooksProvider from './GoogleBooksProvider.js'
import IsbnProvider from './IsbnProvider.js'

// Registry — order is the search/priority order.
const REGISTRY = [
  new OpenLibraryProvider(),
  new GoogleBooksProvider(),
  new IsbnProvider(),
]

const byId = new Map(REGISTRY.map((p) => [p.id, p]))

// A short, serialisable descriptor for the client (no methods).
export function describeProviders() {
  return REGISTRY.map((p) => ({
    id: p.id,
    label: p.label,
    requiresKey: !!p.requiresKey,
    available: p.available(),
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
export async function searchProviders(enabledIds, query) {
  const providers = enabledProviders(enabledIds)
  const settled = await Promise.allSettled(providers.map((p) => p.search(query)))
  const results = settled.flatMap((s) => (s.status === 'fulfilled' ? s.value : []))

  const seen = new Set()
  const merged = []
  for (const r of results) {
    const key = (r.isbn || `${r.title}|${(r.authors || [])[0] || ''}`).toLowerCase().trim()
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(r)
  }
  return merged
}
