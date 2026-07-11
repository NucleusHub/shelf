// Shared shaping between the two collections (Book + LibraryItem) and the flat
// "entry" the client consumes. Keeping this in one place means every route
// returns an identically-shaped entry, and the field lists below are the single
// source of truth for what a client may write to each collection.

export const BOOK_FIELDS = [
  'title', 'subtitle', 'description', 'authors', 'series', 'genres', 'language',
  'publisher', 'publishedDate', 'pageCount', 'coverUrl', 'isbn', 'identifiers',
]

export const ITEM_FIELDS = [
  'status', 'rating', 'favorite', 'owned', 'format', 'currentPage',
  'startedReading', 'finishedReading',
]

// Copy only the allowed, actually-present keys — drops junk and prevents a
// client from writing profileId/notesCount/etc. directly.
export function pick(obj = {}, fields) {
  const out = {}
  for (const f of fields) if (obj[f] !== undefined) out[f] = obj[f]
  return out
}

// A populated LibraryItem → the flat entry. `item.book` is a Book document
// (populated) or may be null if the book was somehow removed.
export function toEntry(item) {
  const b = item.book && typeof item.book === 'object' ? item.book : null
  return {
    id: item._id,
    status: item.status,
    rating: item.rating,
    favorite: item.favorite,
    owned: item.owned,
    format: item.format,
    currentPage: item.currentPage,
    startedReading: item.startedReading,
    finishedReading: item.finishedReading,
    notesCount: item.notesCount,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    book: b && {
      id: b._id,
      title: b.title,
      subtitle: b.subtitle,
      description: b.description,
      authors: b.authors,
      series: b.series,
      genres: b.genres,
      language: b.language,
      publisher: b.publisher,
      publishedDate: b.publishedDate,
      pageCount: b.pageCount,
      coverUrl: b.coverUrl,
      isbn: b.isbn,
      identifiers: b.identifiers,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
    },
  }
}
