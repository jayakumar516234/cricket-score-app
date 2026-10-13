import mongoose from 'mongoose';

const inningsSchema = new mongoose.Schema(
  {
    match: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', required: true, index: true },
    number: { type: Number, enum: [1, 2], required: true },
    battingTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
    bowlingTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
    target: { type: Number, default: null }, // runs needed to win (second innings only)
    status: { type: String, enum: ['in_progress', 'completed'], default: 'in_progress' },
    // Cached totals (the source of truth is the Delivery collection)
    summary: { runs: { type: Number, default: 0 }, wickets: { type: Number, default: 0 }, legalBalls: { type: Number, default: 0 } },
  },
  { timestamps: true }
);
inningsSchema.index({ match: 1, number: 1 }, { unique: true });

export const Innings = mongoose.model('Innings', inningsSchema);
