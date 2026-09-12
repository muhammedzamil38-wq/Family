import mongoose from 'mongoose';

const AuditLogSchema = new mongoose.Schema({
  actorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true
  },
  entityType: {
    type: String,
    required: true
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId
  },
  details: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const AuditLog = mongoose.model('AuditLog', AuditLogSchema);
export default AuditLog;
