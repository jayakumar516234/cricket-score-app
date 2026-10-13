import mongoose from 'mongoose';

// Immutable snapshot written when a match is finished.
const scorecardSchema = new mongoose.Schema(
  {
    match: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', required: true, unique: true },
    innings: { type: [mongoose.Schema.Types.Mixed], default: [] },
    result: { type: mongoose.Schema.Types.Mixed },
    playerOfMatch: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

export const Scorecard = mongoose.model('Scorecard', scorecardSchema);
