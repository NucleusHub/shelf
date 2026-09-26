import { dayKey } from './format.js'

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

function currentStreak(sessions) {
  if (!sessions.length) return 0
  const days = new Set(sessions.map((s) => dayKey(s.date)))
  let streak = 0
  const cursor = new Date()
  // Step in UTC to match dayKey.
  if (!days.has(dayKey(cursor))) cursor.setUTCDate(cursor.getUTCDate() - 1)
  while (days.has(dayKey(cursor))) {
    streak++
    cursor.setUTCDate(cursor.getUTCDate() - 1)
  }
  return streak
}

function monthlyActivity(sessions, now) {
  const buckets = []
  const index = {}
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}`
    const bucket = { key, year: d.getUTCFullYear(), month: d.getUTCMonth(), pages: 0 }
    index[key] = bucket
    buckets.push(bucket)
  }
  for (const s of sessions) {
    const d = new Date(s.date)
    if (Number.isNaN(d.getTime())) continue
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}`
    if (index[key]) index[key].pages += s.pagesRead || 0
  }
  return buckets
}
