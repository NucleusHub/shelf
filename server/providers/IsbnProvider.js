export default class IsbnProvider {
  id = 'isbn'
  label = 'ISBN lookup'
  requiresKey = true

  available() {
    return !!process.env.ISBNDB_API_KEY
  }

  async search(_query) {
    return []
  }

  async getByIsbn(_isbn) {
    // TODO: GET https://api2.isbndb.com/book/<isbn> with Authorization header.
    return null
  }
}
