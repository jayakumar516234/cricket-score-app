import mongoose from 'mongoose';

const MatchMessageSchema = new mongoose.Schema(
  {
    match: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    senderName: { type: String, required: true, trim: true, maxlength: 60 },
    senderRole: { type: String, default: 'viewer' },
    message: { type: String, required: true, trim: true, maxlength: 300 },
  },
  { timestamps: true }
);

// Keep messages clean and capped per match
MatchMessageSchema.index({ match: 1, createdAt: -1 });

export const MatchMessage = mongoose.model('MatchMessage', MatchMessageSchema);
