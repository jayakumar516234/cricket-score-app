import mongoose from 'mongoose';

const suggestionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true },
  userRole: { type: String, required: true },
  userPhone: { type: String, default: '' },
  userUsername: { type: String, default: '' },
  userTeamName: { type: String, default: '' },
  title: { type: String, required: true, trim: true, maxlength: 200 },
  message: { type: String, required: true, trim: true, maxlength: 2000 },
  status: { type: String, enum: ['pending', 'reviewed', 'accepted', 'rejected'], default: 'pending' },
  adminReply: { type: String, trim: true, maxlength: 2000, default: '' },
  repliedAt: { type: Date, default: null },
  repliedBy: { type: String, default: '' },
}, { timestamps: true });

suggestionSchema.index({ user: 1, createdAt: -1 });
suggestionSchema.index({ status: 1, createdAt: -1 });

export const Suggestion = mongoose.model('Suggestion', suggestionSchema);
