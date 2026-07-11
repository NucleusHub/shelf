// Small pure formatting/derivation helpers, kept out of components so they can be
// reused and reasoned about on their own.

// Reading progress 0..100 for an entry. Finished always reads 100; otherwise
// it's currentPage / pageCount (0 when the page count is unknown).
export function progressPct(entry) {
  if (!entry) return 0
  if (entry.status === 'finished') return 100
  const total = entry.book?.pageCount || 0
  if (!total) return 0
  return Math.max(0, Math.min(100, Math.round(((entry.currentPage || 0) / total) * 100)))
}

export function authorLabel(entry) {
  const authors = entry?.book?.authors || []
  if (!authors.length) return ''
  if (authors.length <= 2) return authors.join(' & ')
  return `${authors[0]} +${authors.length - 1}`
}

// Series line, e.g. "Mistborn #2" — only when a name is set.
export function seriesLabel(entry) {
  const s = entry?.book?.series
  if (!s?.name) return ''
  return s.position != null ? `${s.name} #${s.position}` : s.name
}

// Locale-aware short date; tolerant of null/invalid input.
export function fmtDate(value, locale = 'en-US') {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' })
}

// Minutes → "1h 20m" / "45m". Null-safe.
export function fmtDuration(min) {
  if (!min) return ''
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  if (h && m) return `${h}h ${m}m`
  if (h) return `${h}h`
  return `${m}m`
}

// YYYY-MM-DD per-day key for streaks. Uses UTC so a date-only session date
// (stored at UTC midnight, e.g. "2026-07-11") maps back to that same calendar
// day instead of shifting a day in timezones behind UTC. Streak math in stats.js
// steps its cursor in UTC to match.
export function dayKey(value) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}
