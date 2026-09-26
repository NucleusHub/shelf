import { pluginOpenMediums } from './pluginOpenTargets.js'

export const MEDIUM_OF = { physical: 'book', ebook: 'book', audiobook: 'audio', eaudiobook: 'audio' }
export const mediumOf = (format) => MEDIUM_OF[format] || 'book'

const BUILTIN_OPTIONS = {
  book: [
    { type: 'googlebooks', i18n: 'shelf.open.googlebooks' },
    { type: 'amazon', i18n: 'shelf.open.amazon' },
    { type: 'goodreads', i18n: 'shelf.open.goodreads' },
    { type: 'annas', i18n: 'shelf.open.annas' },
    { type: 'custom', i18n: 'shelf.open.custom' },
  ],
  audio: [
    { type: 'audible', i18n: 'shelf.open.audible' },
    { type: 'googleplay', i18n: 'shelf.open.googleplay' },
    { type: 'goodreads', i18n: 'shelf.open.goodreads' },
    { type: 'custom', i18n: 'shelf.open.custom' },
  ],
}

const CUSTOM_OPTION = { type: 'custom', i18n: 'shelf.open.custom' }

export const OPEN_OPTIONS = { ...BUILTIN_OPTIONS }
for (const m of pluginOpenMediums) {
  const opts = m.destinations.map((d) => ({ type: d.type, label: d.label }))
  if (!opts.some((o) => o.type === 'custom')) opts.push(CUSTOM_OPTION)
  OPEN_OPTIONS[m.id] = opts
}

export const DEFAULT_TYPE = { book: 'googlebooks', audio: 'audible' }
for (const m of pluginOpenMediums) DEFAULT_TYPE[m.id] = m.defaultType || m.destinations[0]?.type || 'custom'

export const OPEN_MEDIUMS = [
  { id: 'book', i18n: 'shelf.open.books' },
  { id: 'audio', i18n: 'shelf.open.audiobooks' },
  ...pluginOpenMediums.map((m) => ({ id: m.id, label: m.label, pluginId: m.pluginId })),
]

const PLUGIN_BUILD = new Map()
for (const m of pluginOpenMediums) for (const d of m.destinations) if (typeof d.build === 'function') PLUGIN_BUILD.set(d.type, d.build)

const MATCHERS = pluginOpenMediums.filter((m) => typeof m.match === 'function')

export const TITLE_FORMATS = [
  { value: 'raw', i18n: 'shelf.open.fmtRaw', example: 'The Hobbit' },
  { value: 'lower', i18n: 'shelf.open.fmtLower', example: 'the hobbit' },
  { value: 'kebab', i18n: 'shelf.open.fmtKebab', example: 'the-hobbit' },
  { value: 'snake', i18n: 'shelf.open.fmtSnake', example: 'the_hobbit' },
  { value: 'pascal', i18n: 'shelf.open.fmtPascal', example: 'TheHobbit' },
  { value: 'camel', i18n: 'shelf.open.fmtCamel', example: 'theHobbit' },
]

const enc = (s) => encodeURIComponent(String(s ?? '').trim())

const words = (s) =>
  String(s ?? '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)

const cap = (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()

export function formatTitle(title, format) {
  const raw = String(title ?? '').trim()
  switch (format) {
    case 'lower':
      return raw.toLowerCase()
    case 'kebab':
      return words(raw).join('-').toLowerCase()
    case 'snake':
      return words(raw).join('_').toLowerCase()
    case 'pascal':
      return words(raw).map(cap).join('')
    case 'camel':
      return words(raw)
        .map((w, i) => (i === 0 ? w.toLowerCase() : cap(w)))
        .join('')
    case 'raw':
    default:
      return raw
  }
}

function fields(entry) {
  const b = entry?.book || entry || {}
  return { title: b.title || '', author: (b.authors && b.authors[0]) || '' }
}

export function mediumOfEntry(entry) {
  for (const m of MATCHERS) {
    try { if (m.match(entry)) return m.id } catch {}
  }
  return mediumOf(entry?.format)
}

export function resolveTarget(entry, defaults) {
  if (entry?.openTarget?.type) return entry.openTarget
  const medium = mediumOfEntry(entry)
  return defaults?.[medium] ?? (DEFAULT_TYPE[medium] ? { type: DEFAULT_TYPE[medium] } : null)
}

export function buildOpenUrl(target, entry) {
  if (!target?.type || !entry) return null
  const { title, author } = fields(entry)
  const q = [title, author].filter(Boolean).join(' ')
  switch (target.type) {
    case 'googlebooks':
      return `https://www.google.com/search?tbm=bks&q=${enc(q)}`
    case 'amazon':
      return `https://www.amazon.com/s?k=${enc(q)}&i=digital-text`
    case 'goodreads':
      return `https://www.goodreads.com/search?q=${enc(q)}`
    case 'annas':
      return `https://annas-archive.org/search?q=${enc(q)}`
    case 'audible':
      return `https://www.audible.com/search?keywords=${enc(q)}`
    case 'googleplay':
      return `https://play.google.com/store/search?q=${enc(q)}&c=books`
    case 'custom': {
      const tpl = (target.customUrl || '').trim()
      if (!tpl) return null
      const shaped = formatTitle(title, target.titleFormat)
      return tpl.replaceAll('{title}', enc(shaped)).replaceAll('{author}', enc(author))
    }
    default: {
      const fn = PLUGIN_BUILD.get(target.type)
      if (!fn) return null
      try { return fn({ entry, title, author, query: q, enc }) || null } catch { return null }
    }
  }
}
