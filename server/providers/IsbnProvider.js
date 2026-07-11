// Dedicated ISBN-lookup provider — registered but not yet implemented. Intended
// for a barcode-scanner flow (scan → ISBN → exact match) against a service such
// as isbndb.com. Disabled until ISBNDB_API_KEY is set. Implement getByIsbn()
// (and optionally search()) returning the BookResult shape from providers/index.js.
//
// Note: Open Library already answers ISBN lookups today (see
// OpenLibraryProvider.getByIsbn); this provider exists for a higher-quality,
// key-backed source when one is wanted.
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
