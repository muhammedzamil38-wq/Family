import mongoose from 'mongoose';

const PhotoSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  imageUrl: {
    type: String,
    required: true,
    trim: true
  },
  cloudinaryPublicId: {
    type: String,
    required: true,
    trim: true
  },
  year: {
    type: String,
    trim: true,
    default: ''
  },
  decade: {
    type: String,
    trim: true,
    default: 'Unspecified'
  },
  location: {
    type: String,
    trim: true,
    default: ''
  },
  peopleInPhoto: {
    type: [String],
    default: []
  },
  tags: {
    type: [String],
    default: []
  },
  displayOrder: {
    type: Number,
    default: 0
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  isVisible: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const Photo = mongoose.model('Photo', PhotoSchema);
export default Photo;
