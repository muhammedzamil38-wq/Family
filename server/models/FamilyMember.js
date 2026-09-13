import mongoose from 'mongoose';

const FamilyMemberSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FamilyMember',
    default: null
  },
  relationshipLabel: {
    type: String,
    trim: true
  },
  birthYear: {
    type: Number
  },
  deathYear: {
    type: Number
  },
  bio: {
    type: String,
    trim: true
  },
  portraitPath: {
    type: String
  },
  portraitCloudinaryPublicId: {
    type: String
  },
  displayOrder: {
    type: Number,
    default: 0
  },
  isVisible: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index parentId for efficient hierarchy and tree lookup
FamilyMemberSchema.index({ parentId: 1 });

const FamilyMember = mongoose.model('FamilyMember', FamilyMemberSchema);
export default FamilyMember;
