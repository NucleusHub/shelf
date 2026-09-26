import mongoose from 'mongoose'

const noteSchema = new mongoose.Schema(
  {
    profileId: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile', index: true },
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'ShelfLibraryItem', required: true, index: true },
    book: { type: mongoose.Schema.Types.ObjectId, ref: 'ShelfBook', index: true },
    title: { type: String, trim: true, default: '' },
    content: { type: String, default: '' },
  },
  { timestamps: true }
)

export default mongoose.model('ShelfNote', noteSchema)
