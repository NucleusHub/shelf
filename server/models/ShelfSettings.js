import mongoose from 'mongoose'

const openTargetSchema = new mongoose.Schema(
  {
    type: { type: String, default: 'custom' },
    customUrl: { type: String, default: '' },
    titleFormat: {
      type: String,
      enum: ['raw', 'lower', 'kebab', 'snake', 'pascal', 'camel'],
      default: 'raw',
    },
  },
  { _id: false }
)

const shelfSettingsSchema = new mongoose.Schema(
  {
    profileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Profile',
      required: true,
      unique: true,
      index: true,
    },
    ratingMax: { type: Number, enum: [10], default: 10 },
    defaultView: { type: String, enum: ['grid', 'list'], default: 'grid' },
    providers: { type: [String], default: ['openlibrary'] },
    hiddenProviders: { type: [String], default: [] },
    openDefaults: {
      type: Map,
      of: openTargetSchema,
      default: () => ({ book: { type: 'googlebooks' }, audio: { type: 'audible' } }),
    },
  },
  { timestamps: true }
)

export default mongoose.model('ShelfSettings', shelfSettingsSchema)
