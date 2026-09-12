import mongoose from 'mongoose';

const BookSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  description: {
    type: String,
    trim: true
  },
  author: {
    type: String,
    trim: true
  },
  pdfPath: {
    type: String,
    required: true
  },
  coverPath: {
    type: String,
    required: true
  },
  coverAlt: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['draft', 'ready', 'published'],
    default: 'draft'
  },
  displayOrder: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

const Book = mongoose.model('Book', BookSchema);
export default Book;
