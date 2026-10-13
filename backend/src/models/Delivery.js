import mongoose from 'mongoose';

const deliverySchema = new mongoose.Schema(
  {
    match: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', required: true, index: true },
    innings: { type: mongoose.Schema.Types.ObjectId, ref: 'Innings', required: true },
    seq: { type: Number, required: true },
    // Player ids are stored as strings (snapshot ids from Match.xi)
    striker: { type: String, required: true },
    nonStriker: { type: String, required: true },
    bowler: { type: String, required: true },
    runs: { type: Number, default: 0, min: 0, max: 7 },
    extra: { type: String, enum: ['wide', 'noball', 'bye', 'legbye', null], default: null },
    wicket: {
      type: { type: String, enum: ['bowled', 'caught', 'lbw', 'runout', 'stumped', 'hitwicket'] },
      dismissed: { type: String, enum: ['striker', 'nonStriker'] },
      fielder: { type: String, maxlength: 60 },
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
deliverySchema.index({ innings: 1, seq: 1 }, { unique: true });

export const Delivery = mongoose.model('Delivery', deliverySchema);
