import mongoose from 'mongoose'

// A single "open in" destination — the per-medium global default, and the shape
// a per-item override stores too (see LibraryItem.openTarget). `type` is a free
// string on purpose: the destination set is open-ended (plugins contribute their
// own, e.g. the manga source's 'anilist'), and the client owns which types exist
// and how each builds a URL (utils/openTarget.js). The server just stores it.
const openTargetSchema = new mongoose.Schema(
  {
    type: { type: String, default: 'custom' },
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
    // Enabled BUILT-IN import providers by id (see server/providers). Open
    // Library is on by default because it needs no API key. Built-ins are
    // opt-in; a provider is searched only if listed here.
    providers: { type: [String], default: ['openlibrary'] },
    // Plugin-contributed sources are the opposite — on by default whenever their
    // plugin is installed (the plugin's presence is the opt-in). This lists the
    // ones the user has explicitly turned OFF. Keeps a newly-installed manga/etc.
    // source working without hunting for a toggle, while still allowing opt-out.
    hiddenProviders: { type: [String], default: [] },
    // Per-medium "open in" defaults, keyed by medium id. Built-in mediums are
    // `book` (physical + ebook) and `audio` (audiobook + eaudiobook); plugins
    // add more (e.g. `manga`). A Map, not fixed keys, so the server stays
    // agnostic to which mediums exist — the client (openTarget.js) owns that.
    openDefaults: {
      type: Map,
      of: openTargetSchema,
      default: () => ({ book: { type: 'googlebooks' }, audio: { type: 'audible' } }),
    },
  },
  { timestamps: true }
)

export default mongoose.model('ShelfSettings', shelfSettingsSchema)
