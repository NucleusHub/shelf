// Where a book opens when you click its cover / title — mirrors watchlist, where
// every poster opens an external page and a hover overlay signals it.
//
// A "target" is `{ type, customUrl, titleFormat }`. The effective target for an
// entry is its own `openTarget` when set, otherwise the per-medium global
// default the user picked in Settings — see composables/useShelfSettings.js.
//
// Every format is openable. Destinations are grouped by medium so the two
// audio formats share audiobook stores and the two text formats share book
// stores — keeping Settings to two sections while every cover still opens.

// Which destination set each format uses.
export const MEDIUM_OF = { physical: 'book', ebook: 'book', audiobook: 'audio', eaudiobook: 'audio' }
export const MEDIUMS = ['book', 'audio']
export const mediumOf = (format) => MEDIUM_OF[format] || 'book'

// Ordered for display in the settings/form pickers, keyed by medium. `i18n` is
// the label key.
export const OPEN_OPTIONS = {
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

// The per-medium default destination when a user has never touched Settings.
export const DEFAULT_TYPE = { book: 'googlebooks', audio: 'audible' }

// How the {title} placeholder is shaped inside a custom URL. `raw` keeps the
// title as-is (just URL-encoded); the rest normalise words first.
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

// Resolve the effective target for an entry: its own override wins, else the
// global default for its medium. `defaults` is `{ book, audio }`.
export function resolveTarget(entry, defaults) {
  if (entry?.openTarget?.type) return entry.openTarget
  return defaults?.[mediumOf(entry?.format)] ?? null
}

// Build the destination URL for a target + entry, or null when it can't (e.g. an
// empty custom template). Search destinations query on "title author" for better
// hits; custom URLs template {title} and {author}.
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
    default:
      return null
  }
}
