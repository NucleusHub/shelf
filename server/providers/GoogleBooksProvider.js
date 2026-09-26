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
