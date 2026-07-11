import mongoose from 'mongoose'

// Union of every built-in "open in" destination across kinds. The client
// (utils/openTarget.js) decides which subset each kind actually offers; the
// model only needs to accept any of them plus 'custom'.
export const OPEN_TYPES = ['googlebooks', 'amazon', 'goodreads', 'annas', 'audible', 'googleplay', 'custom']

// A single "open in" destination — the per-kind global default, and the shape a
// per-item override stores too (see LibraryItem.openTarget).
const openTargetSchema = new mongoose.Schema(
  {
    type: { type: String, enum: OPEN_TYPES, default: 'custom' },
    customUrl: { type: String, default: '' },
    // Shape of the {title} placeholder inside customUrl.
    titleFormat: {
      type: String,
      enum: ['raw', 'lower', 'kebab', 'snake', 'pascal', 'camel'],
      default: 'raw',
    },
  },
  { _id: false }
)

// One per-user preferences document, keyed by profileId and created lazily on
// first save. Holds preferences that must follow the user across devices:
// the rating scale (books are always stored 1..ratingMax) and the default
// library view. Import-provider toggles live here too so enabling a future
// provider is a settings change, not a redeploy.
const shelfSettingsSchema = new mongoose.Schema(
  {
    profileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Profile',
      required: true,
      unique: true,
      index: true,
    },
    // Books are rated on a fixed 10-point scale.
    ratingMax: { type: Number, enum: [10], default: 10 },
    // 'grid' | 'list' — the library layout the user last chose.
    defaultView: { type: String, enum: ['grid', 'list'], default: 'grid' },
    // Enabled import providers by id (see server/providers). Open Library is on
    // by default because it needs no API key.
    providers: { type: [String], default: ['openlibrary'] },
    // Per-medium "open in" defaults. `book` covers physical + ebook, `audio`
    // covers audiobook + eaudiobook. Each defaults to a natural destination.
    openDefaults: {
      book: { type: openTargetSchema, default: () => ({ type: 'googlebooks' }) },
      audio: { type: openTargetSchema, default: () => ({ type: 'audible' }) },
    },
  },
  { timestamps: true }
)

export default mongoose.model('ShelfSettings', shelfSettingsSchema)
