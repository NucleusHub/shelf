// Open Library (openlibrary.org) — the reference BookProvider implementation.
// Free, no API key, so it's enabled by default. Maps Open Library's search and
// ISBN responses into the common BookResult shape.
const SEARCH_URL = 'https://openlibrary.org/search.json'
const ISBN_URL = (isbn) => `https://openlibrary.org/isbn/${encodeURIComponent(isbn)}.json`
const COVER = (id, size = 'L') => `https://covers.openlibrary.org/b/id/${id}-${size}.jpg`

// Fields we ask the search endpoint for — keeps the payload small.
const FIELDS = [
  'key', 'title', 'subtitle', 'author_name', 'first_publish_year',
  'number_of_pages_median', 'cover_i', 'isbn', 'language', 'publisher', 'subject',
].join(',')

export default class OpenLibraryProvider {
  id = 'openlibrary'
  label = 'Open Library'
  requiresKey = false

  available() { return true }

  async search(query) {
    const q = String(query || '').trim()
    if (q.length < 2) return []
    const url = `${SEARCH_URL}?q=${encodeURIComponent(q)}&fields=${FIELDS}&limit=12`
    const res = await fetch(url, { headers: { 'User-Agent': 'Nucleus-Shelf/0.1' } })
    if (!res.ok) return []
    const data = await res.json()
    return (data.docs || []).map((d) => this._fromDoc(d))
  }

  async getByIsbn(isbn) {
    const clean = String(isbn || '').replace(/[^0-9Xx]/g, '')
    if (!clean) return null
    const res = await fetch(ISBN_URL(clean), { headers: { 'User-Agent': 'Nucleus-Shelf/0.1' } })
    if (!res.ok) return null
    const d = await res.json()
    return {
      ...this._empty(),
      title: d.title || '',
      subtitle: d.subtitle || '',
      publishedDate: d.publish_date || '',
      pageCount: d.number_of_pages ?? null,
      publisher: (d.publishers || [])[0] || '',
      coverUrl: d.covers?.length ? COVER(d.covers[0]) : null,
      isbn: clean,
      identifiers: { openlibrary: d.key, isbn13: (d.isbn_13 || [])[0], isbn10: (d.isbn_10 || [])[0] },
      source: this.id,
    }
  }

  _empty() {
    return {
      title: '', subtitle: '', description: '', authors: [], series: null,
      genres: [], language: '', publisher: '', publishedDate: '',
      pageCount: null, coverUrl: null, isbn: '', identifiers: {}, source: this.id,
    }
  }

  _fromDoc(d) {
    return {
      ...this._empty(),
      title: d.title || '',
      subtitle: d.subtitle || '',
      authors: d.author_name || [],
      // Open Library subjects are noisy; take a few as loose genres.
      genres: (d.subject || []).slice(0, 5),
      language: (d.language || [])[0] || '',
      publisher: (d.publisher || [])[0] || '',
      publishedDate: d.first_publish_year ? String(d.first_publish_year) : '',
      pageCount: d.number_of_pages_median ?? null,
      coverUrl: d.cover_i ? COVER(d.cover_i) : null,
      isbn: (d.isbn || [])[0] || '',
      identifiers: { openlibrary: d.key },
      source: this.id,
    }
  }
}
