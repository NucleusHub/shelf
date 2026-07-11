import { dayKey } from './format.js'

// Everything the statistics page shows, derived purely from the entries +
// sessions the API already returns. Pure function → trivial to reason about and
// test; the view just renders the result.
export function computeStats(entries = [], sessions = [], { year } = {}) {
  const now = new Date()
  const thisYear = year ?? now.getFullYear()

  const finished = entries.filter((e) => e.status === 'finished')
  const reading = entries.filter((e) => e.status === 'reading')

  const finishedThisYear = finished.filter(
    (e) => e.finishedReading && new Date(e.finishedReading).getFullYear() === thisYear
  )

  const pagesTotal = sessions.reduce((s, x) => s + (x.pagesRead || 0), 0)
  const pagesThisYear = sessions
    .filter((x) => new Date(x.date).getFullYear() === thisYear)
    .reduce((s, x) => s + (x.pagesRead || 0), 0)
  const minutesTotal = sessions.reduce((s, x) => s + (x.duration || 0), 0)

  const rated = entries.filter((e) => e.rating != null && e.rating > 0)
  const avgRating = rated.length
    ? Math.round((rated.reduce((s, e) => s + e.rating, 0) / rated.length) * 10) / 10
    : null

  return {
    finishedThisYear: finishedThisYear.length,
    currentlyReading: reading.length,
    totalBooks: entries.length,
    pagesTotal,
    pagesThisYear,
    minutesTotal,
    avgRating,
    ratedCount: rated.length,
    topGenres: topCounts(entries.flatMap((e) => e.book?.genres || [])),
    topAuthors: topCounts(entries.flatMap((e) => e.book?.authors || [])),
    streak: currentStreak(sessions),
    monthly: monthlyActivity(sessions, now),
    statusCounts: countBy(entries, (e) => e.status),
    ratingDistribution: rated.length ? countBy(rated, (e) => e.rating) : {},
  }
}

// Top-5 [{ name, count }] from a flat list of strings, most frequent first.
function topCounts(list) {
  const map = {}
  for (const raw of list) {
    const name = String(raw || '').trim()
    if (!name) continue
    map[name] = (map[name] || 0) + 1
  }
  return Object.entries(map)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
}

function countBy(list, fn) {
  const map = {}
  for (const x of list) {
    const k = fn(x)
    map[k] = (map[k] || 0) + 1
  }
  return map
}

// Consecutive-day reading streak ending today or yesterday (so an unfinished
// today doesn't zero out a real streak until a day is actually missed).
function currentStreak(sessions) {
  if (!sessions.length) return 0
  const days = new Set(sessions.map((s) => dayKey(s.date)))
  let streak = 0
  const cursor = new Date()
  // Allow the streak to "start" today or yesterday.
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1)
  while (days.has(dayKey(cursor))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

// Pages read per month for the last 12 months, oldest → newest.
function monthlyActivity(sessions, now) {
  const buckets = []
  const index = {}
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    const bucket = { key, year: d.getFullYear(), month: d.getMonth(), pages: 0 }
    index[key] = bucket
    buckets.push(bucket)
  }
  for (const s of sessions) {
    const d = new Date(s.date)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    if (index[key]) index[key].pages += s.pagesRead || 0
  }
  return buckets
}
