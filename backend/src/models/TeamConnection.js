import mongoose from 'mongoose';

const teamConnectionSchema = new mongoose.Schema(
  {
    fromTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
    toTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
    fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
      index: true,
    },
  },
  { timestamps: true }
);

teamConnectionSchema.index({ fromTeam: 1, toTeam: 1 }, { unique: true });

export const TeamConnection = mongoose.model('TeamConnection', teamConnectionSchema);
