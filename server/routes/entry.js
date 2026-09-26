export const BOOK_FIELDS = [
  'title', 'subtitle', 'description', 'authors', 'series', 'genres', 'language',
  'publisher', 'publishedDate', 'pageCount', 'coverUrl', 'isbn', 'identifiers',
]

export const ITEM_FIELDS = [
  'status', 'rating', 'favorite', 'owned', 'format', 'openTarget', 'currentPage',
  'startedReading', 'finishedReading',
]

export function pick(obj = {}, fields) {
  const out = {}
  for (const f of fields) if (obj[f] !== undefined) out[f] = obj[f]
  return out
}

export function toEntry(item) {
  const b = item.book && typeof item.book === 'object' ? item.book : null
  return {
    id: item._id,
    status: item.status,
    rating: item.rating,
    favorite: item.favorite,
    owned: item.owned,
    format: item.format,
    openTarget: item.openTarget || null,
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
