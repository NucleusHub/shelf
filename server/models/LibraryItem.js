import mongoose from 'mongoose'

export const STATUSES = ['planned', 'reading', 'on_hold', 'finished']
export const FORMATS = ['physical', 'ebook', 'audiobook', 'eaudiobook']

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

const libraryItemSchema = new mongoose.Schema(
  {
    profileId: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile', index: true },
    book: { type: mongoose.Schema.Types.ObjectId, ref: 'ShelfBook', required: true, index: true },
    status: { type: String, enum: STATUSES, default: 'planned', index: true },
    rating: { type: Number, min: 0, max: 10, default: null },
    favorite: { type: Boolean, default: false },
    owned: { type: Boolean, default: true },
    format: { type: String, enum: FORMATS, default: 'physical' },
    openTarget: { type: openTargetSchema, default: null },
    currentPage: { type: Number, min: 0, default: 0 },
    startedReading: { type: Date, default: null },
    finishedReading: { type: Date, default: null },
    notesCount: { type: Number, min: 0, default: 0 },
  },
  { timestamps: true }
)

export default mongoose.model('ShelfLibraryItem', libraryItemSchema)
