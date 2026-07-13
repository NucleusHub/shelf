// Where a book opens when you click its cover / title — mirrors watchlist, where
// every poster opens an external page and a hover overlay signals it.
//
// A "target" is `{ type, customUrl, titleFormat }`. The effective target for an
// entry is its own `openTarget` when set, otherwise the per-medium global
// default the user picked in Settings — see composables/useShelfSettings.js.
//
// Two built-in mediums (book, audio) live here; more are contributed by plugins
// via the `shelfOpenTargets` extension point (utils/pluginOpenTargets.js) and
// merged in below, so Shelf carries no per-source knowledge — a manga source,
// a comics source, etc. all plug in the same way.
import { pluginOpenMediums } from './pluginOpenTargets.js'

// Which destination set each format uses.
export const MEDIUM_OF = { physical: 'book', ebook: 'book', audiobook: 'audio', eaudiobook: 'audio' }
export const mediumOf = (format) => MEDIUM_OF[format] || 'book'

// Built-in destinations, ordered for display. `i18n` is the label key.
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

// Every custom URL destination also gets the title-format control, so plugin
// mediums that offer a "custom" destination behave like the built-ins.
const CUSTOM_OPTION = { type: 'custom', i18n: 'shelf.open.custom' }

// Destination options per medium (built-ins + plugin mediums). Plugin
// destinations carry a literal `label`; built-ins carry an `i18n` key.
export const OPEN_OPTIONS = { ...BUILTIN_OPTIONS }
for (const m of pluginOpenMediums) {
  const opts = m.destinations.map((d) => ({ type: d.type, label: d.label }))
  if (!opts.some((o) => o.type === 'custom')) opts.push(CUSTOM_OPTION)
  OPEN_OPTIONS[m.id] = opts
}

// The default destination for a medium when the user has never touched Settings.
export const DEFAULT_TYPE = { book: 'googlebooks', audio: 'audible' }
for (const m of pluginOpenMediums) DEFAULT_TYPE[m.id] = m.defaultType || m.destinations[0]?.type || 'custom'

// Medium metadata for the Settings UI. Built-ins carry an `i18n` label key;
// plugin mediums carry a literal `label` + `pluginId` (so the host can gate on
// the plugin being enabled and badge the section).
export const OPEN_MEDIUMS = [
  { id: 'book', i18n: 'shelf.open.books' },
  { id: 'audio', i18n: 'shelf.open.audiobooks' },
  ...pluginOpenMediums.map((m) => ({ id: m.id, label: m.label, pluginId: m.pluginId })),
]

// type → plugin-supplied URL builder, for buildOpenUrl's default case.
const PLUGIN_BUILD = new Map()
for (const m of pluginOpenMediums) for (const d of m.destinations) if (typeof d.build === 'function') PLUGIN_BUILD.set(d.type, d.build)

// A plugin medium's match rule wins over the format-based medium (a manga is
// usually an ebook but should open on a manga site).
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

// Split a title into alphanumeric words, dropping punctuation/separators.
const words = (s) =>
  String(s ?? '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)

const cap = (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()

// Shape a title per the chosen format (see TITLE_FORMATS).
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

// Pull the title/author a destination URL is built from out of an entry.
function fields(entry) {
  const b = entry?.book || entry || {}
  return { title: b.title || '', author: (b.authors && b.authors[0]) || '' }
}

// The medium whose open-in default applies to an entry: a plugin medium whose
// match rule fires wins; otherwise the entry's format medium.
export function mediumOfEntry(entry) {
  for (const m of MATCHERS) {
    try { if (m.match(entry)) return m.id } catch { /* a bad matcher never breaks resolution */ }
  }
  return mediumOf(entry?.format)
}

// Resolve the effective target for an entry: its own override wins, else the
// global default for its medium, else the medium's built-in default type.
export function resolveTarget(entry, defaults) {
  if (entry?.openTarget?.type) return entry.openTarget
  const medium = mediumOfEntry(entry)
  return defaults?.[medium] ?? (DEFAULT_TYPE[medium] ? { type: DEFAULT_TYPE[medium] } : null)
}

// Build the destination URL for a target + entry, or null when it can't (e.g. an
// empty custom template). Search destinations query on "title author" for better
// hits; custom URLs template {title} and {author}; plugin destinations delegate
// to their own build(ctx).
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
