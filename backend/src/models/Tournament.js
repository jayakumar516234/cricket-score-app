import mongoose from 'mongoose';

const { Schema } = mongoose;

const tournamentTeamSchema = new Schema(
  {
    team: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
    name: { type: String, required: true },
    seed: { type: Number },
    status: { type: String, enum: ['approved', 'pending', 'eliminated', 'winner'], default: 'approved' },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const tournamentByeSchema = new Schema(
  {
    team: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
    teamName: { type: String, required: true },
    round: { type: String, default: 'Round 1' },
    reason: { type: String, default: 'Bye advancement' },
    awardedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const tournamentScorerSchema = new Schema(
  {
    name: { type: String, required: true },
    pin: { type: String, required: true },
    ground: { type: String, default: 'Main Ground' },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const tournamentSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String, trim: true, default: '' },
    venue: { type: String, trim: true, default: '' },
    grounds: { type: [String], default: ['Ground 1', 'Ground 2'] },
    format: { type: String, enum: ['knockout', 'league', 'flexible'], default: 'knockout' },
    maxTeams: { type: Number, default: 16, min: 2, max: 64 },
    defaultOvers: { type: Number, default: 8, min: 1, max: 50 },
    startDate: { type: Date },
    endDate: { type: Date },
    status: { type: String, enum: ['upcoming', 'live', 'completed'], default: 'upcoming', index: true },
    organizer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    teams: [tournamentTeamSchema],
    byes: [tournamentByeSchema],
    scorers: [tournamentScorerSchema],
    banner: { type: String, default: '' },
    rules: { type: String, default: '' },
  },
  { timestamps: true }
);

// Function to generate a random code like TRN-8392
tournamentSchema.statics.generateCode = async function () {
  let code = '';
  let exists = true;
  while (exists) {
    const num = Math.floor(1000 + Math.random() * 9000);
    code = `TRN-${num}`;
    const found = await this.findOne({ code });
    if (!found) exists = false;
  }
  return code;
};

export const Tournament = mongoose.model('Tournament', tournamentSchema);
