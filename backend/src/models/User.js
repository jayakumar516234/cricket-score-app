import mongoose from 'mongoose';

// Two roles only:
//  - superadmin: the app owner (sees every user, team and match; can correct completed matches)
//  - user:       anyone who signs up; manages only their own team(s) and matches
//  - viewer:     a read-only login for ONE team (created by that team's owner), can only look
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    username: { type: String, lowercase: true, trim: true, unique: true, sparse: true },
    phone: { type: String, trim: true, unique: true, sparse: true }, // 10 digits, normalised
    email: { type: String, lowercase: true, trim: true, unique: true, sparse: true }, // used by the Super Admin
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['superadmin', 'admin', 'teamadmin', 'user', 'viewer', 'scorer'], default: 'user' },
    active: { type: Boolean, default: true },
    sessionToken: { type: String, default: '' }, // random token set on login; used to enforce single-session for non-viewer users
    viewTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', index: true, sparse: true }, // viewers only: the one team they can see
    tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', index: true, sparse: true }, // tournament scorers
    lastActiveAt: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const User = mongoose.model('User', userSchema);
