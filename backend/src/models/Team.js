import mongoose from 'mongoose';

export const BALL_TYPES = ['Leather Ball', 'Tennis Ball', 'Rubber Ball', 'Other'];

export function generateTeamCode(isGuest = false) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  if (isGuest) {
    let res = 'GST';
    for (let i = 0; i < 3; i++) {
      res += chars[Math.floor(Math.random() * chars.length)];
    }
    return res;
  }
  let res = '';
  for (let i = 0; i < 6; i++) {
    res += chars[Math.floor(Math.random() * chars.length)];
  }
  return res;
}

const teamSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    code: { type: String, unique: true, uppercase: true, trim: true, index: true },
    logo: { type: String, default: '' }, // small data URL (resized in the browser)
    location: { type: String, trim: true, maxlength: 80, default: '' },
    description: { type: String, trim: true, maxlength: 500, default: '' },
    ballType: { type: String, enum: BALL_TYPES, default: 'Leather Ball' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isGuest: { type: Boolean, default: false, index: true },
    isOpponent: { type: Boolean, default: false, index: true },
    allowOnlineScoring: { type: Boolean, default: false },
  },
  { timestamps: true }
);
// Case-insensitive unique team names
teamSchema.index({ name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

export const Team = mongoose.model('Team', teamSchema);
