import mongoose from 'mongoose'

// The user's relationship with a Book: where it sits in their library, how far
// they've read, how they rated it. This is the "entry" the client works with —
// its _id is the id used everywhere in the UI and routes (/books/:id).
//
// Rating is stored on a 1..N scale where N is the user's configured ratingMax
// (see ShelfSettings, default 10). `favorite` is intentionally independent of
// rating — you can love a book you'd rate 6/10.
export const STATUSES = ['planned', 'reading', 'on_hold', 'finished']
export const FORMATS = ['physical', 'ebook', 'audiobook', 'eaudiobook']

// Per-item "open in" override. When set, it wins over the per-kind global
// default (see ShelfSettings.openDefaults); null means inherit the default.
const openTargetSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['googlebooks', 'amazon', 'goodreads', 'annas', 'audible', 'googleplay', 'custom'],
      default: 'custom',
    },
    customUrl: { type: String, default: '' },
    titleFormat: {
      type: String,
      enum: ['raw', 'lower', 'kebab', 'snake', 'pascal', 'camel'],
      default: 'raw',
    },
  },
  { _id: false }
)

const libraryItemSchema = new mongoose.Schema(
  {
    profileId: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile', index: true },
    book: { type: mongoose.Schema.Types.ObjectId, ref: 'ShelfBook', required: true, index: true },
    status: { type: String, enum: STATUSES, default: 'planned', index: true },
    // 0.5..10 (half-steps), or null when unrated. Bounded so a bad client can't
    // persist an out-of-range value.
    rating: { type: Number, min: 0, max: 10, default: null },
    favorite: { type: Boolean, default: false },
    owned: { type: Boolean, default: true },
    format: { type: String, enum: FORMATS, default: 'physical' },
    // Where this book opens externally; null inherits the per-kind default.
    openTarget: { type: openTargetSchema, default: null },
    currentPage: { type: Number, min: 0, default: 0 },
    startedReading: { type: Date, default: null },
    finishedReading: { type: Date, default: null },
    // Denormalised so the library grid can show a note count without an N+1
    // query. Kept in sync by the notes routes.
    notesCount: { type: Number, min: 0, default: 0 },
  },
  { timestamps: true }
)

export default mongoose.model('ShelfLibraryItem', libraryItemSchema)
