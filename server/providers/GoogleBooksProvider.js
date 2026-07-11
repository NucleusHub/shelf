// Google Books — registered but not yet implemented. It reports itself
// unavailable until a GOOGLE_BOOKS_API_KEY is provided, so the fan-out in
// index.js simply skips it. Fill in search()/getByIsbn() against
// https://www.googleapis.com/books/v1/volumes to enable it; the returned rows
// must match the BookResult shape documented in providers/index.js.
export default class GoogleBooksProvider {
  id = 'googlebooks'
  label = 'Google Books'
  requiresKey = true

  available() {
    return !!process.env.GOOGLE_BOOKS_API_KEY
  }

  async search(_query) {
    // TODO: GET /books/v1/volumes?q=<query>&key=<KEY> → map volumeInfo → BookResult
    return []
  }

  async getByIsbn(_isbn) {
    // TODO: GET /books/v1/volumes?q=isbn:<isbn>&key=<KEY>
    return null
  }
}
