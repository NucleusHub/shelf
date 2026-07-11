import mongoose from 'mongoose'

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
    // Ratings are configurable; default is a 10-point scale.
    ratingMax: { type: Number, enum: [5, 10], default: 10 },
    // 'grid' | 'list' — the library layout the user last chose.
    defaultView: { type: String, enum: ['grid', 'list'], default: 'grid' },
    // Enabled import providers by id (see server/providers). Open Library is on
    // by default because it needs no API key.
    providers: { type: [String], default: ['openlibrary'] },
  },
  { timestamps: true }
)

export default mongoose.model('ShelfSettings', shelfSettingsSchema)
