import mongoose from 'mongoose'

const seriesSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: '' },
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
    publishedDate: { type: String, trim: true, default: '' },
    pageCount: { type: Number, min: 0, default: null },
    coverUrl: { type: String, default: null },
    isbn: { type: String, trim: true, default: '' },
    identifiers: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
)

export default mongoose.model('ShelfBook', bookSchema)
