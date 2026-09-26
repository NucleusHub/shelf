import mongoose from 'mongoose'

const readingSessionSchema = new mongoose.Schema(
  {
    profileId: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile', index: true },
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'ShelfLibraryItem', required: true, index: true },
    book: { type: mongoose.Schema.Types.ObjectId, ref: 'ShelfBook', index: true },
    date: { type: Date, default: Date.now, index: true },
    pagesRead: { type: Number, min: 0, default: 0 },
    endingPage: { type: Number, min: 0, default: null },
    duration: { type: Number, min: 0, default: null },
  },
  { timestamps: true }
)

export default mongoose.model('ShelfReadingSession', readingSessionSchema)
