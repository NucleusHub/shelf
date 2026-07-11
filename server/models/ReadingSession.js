import mongoose from 'mongoose'

// One reading event. Sessions are the source of truth for reading history and
// everything derived from it — streaks, average pace, pages-read-per-month.
// `endingPage` snapshots where the user stopped (so we can rebuild currentPage);
// `pagesRead` is how many pages that session covered; `duration` is minutes.
const readingSessionSchema = new mongoose.Schema(
  {
    profileId: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile', index: true },
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'ShelfLibraryItem', required: true, index: true },
    book: { type: mongoose.Schema.Types.ObjectId, ref: 'ShelfBook', index: true },
    date: { type: Date, default: Date.now, index: true },
    pagesRead: { type: Number, min: 0, default: 0 },
    endingPage: { type: Number, min: 0, default: null },
    // Minutes spent reading. Optional — progress can be logged without timing.
    duration: { type: Number, min: 0, default: null },
  },
  { timestamps: true }
)

export default mongoose.model('ShelfReadingSession', readingSessionSchema)
