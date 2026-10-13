import mongoose from 'mongoose';

const { Schema } = mongoose;

const xiEntry = new Schema(
  {
    player: { type: Schema.Types.ObjectId, ref: 'Player' },
    name: String,
    role: String,
    jerseyNumber: Number,
    guest: Boolean, // added for this match only (not saved in the team)
  },
  { _id: false }
);

const matchSchema = new Schema(
  {
    name: { type: String, trim: true, maxlength: 100 },
    format: { type: String, enum: ['T10', 'T20', 'ODI', 'Custom'], required: true },
    overs: { type: Number, required: true, min: 1, max: 50 },
    date: { type: Date },
    venue: { type: String, trim: true, maxlength: 100, default: '' },
    homeTeam: { type: Schema.Types.ObjectId, ref: 'Team', required: true }, // "Your own team"
    awayTeam: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
    toss: {
      winner: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
      decision: { type: String, enum: ['bat', 'bowl'], required: true },
    },
    // Playing XI snapshot taken when the match is created
    xi: { home: [xiEntry], away: [xiEntry] },
    tieBreaker: { type: String, enum: ['tie', 'manual'], default: 'tie' },
    status: { type: String, enum: ['scheduled', 'live', 'completed', 'abandoned'], default: 'scheduled', index: true },
    currentInnings: { type: Number, default: 0 },
    result: {
      winner: { type: Schema.Types.ObjectId, ref: 'Team' },
      tie: Boolean,
      byTieBreak: Boolean,
      marginType: String,
      marginValue: Number,
      summary: String,
    },
    playerOfMatch: { player: String, name: String, team: { type: Schema.Types.ObjectId, ref: 'Team' }, points: Number, summary: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    completedAt: Date,
  },
  { timestamps: true }
);

export const Match = mongoose.model('Match', matchSchema);
