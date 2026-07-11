import mongoose from 'mongoose'

// The work itself — the objective, shareable-in-principle metadata about a book,
// kept separate from the user's relationship with it (see LibraryItem). One Book
// per work per profile; adding a book creates a Book + a LibraryItem together.
//
// Fields are deliberately permissive: `publishedDate` is a free string (sources
// give anything from "1997" to "1997-06-26"), and `identifiers` is an open map so
// import providers (Open Library, Google Books, …) and future integrations
// (Orbit file links) can stash their own ids without a schema change.
const seriesSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: '' },
    // Position within the series (e.g. 2, or 2.5 for a novella). Null = unset.
    position: { type: Number, default: null },
  },
  { _id: false }
)

const bookSchema = new mongoose.Schema(
  {
    profileId: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile', index: true },
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, trim: true, default: '' },
    description: { type: String, default: '' },
    authors: { type: [String], default: [] },
    series: { type: seriesSchema, default: null },
    genres: { type: [String], default: [] },
    language: { type: String, trim: true, default: '' },
    publisher: { type: String, trim: true, default: '' },
    // Kept as a string — publication precision varies wildly across sources.
    publishedDate: { type: String, trim: true, default: '' },
    pageCount: { type: Number, min: 0, default: null },
    coverUrl: { type: String, default: null },
    isbn: { type: String, trim: true, default: '' },
    // Open map of external ids: { openlibrary, googlebooks, isbn10, isbn13,
    // orbitFileId, … }. Mixed so providers/integrations extend it freely.
    identifiers: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
)

export default mongoose.model('ShelfBook', bookSchema)
