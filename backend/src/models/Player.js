import mongoose from 'mongoose';

export const PLAYER_ROLES = ['Batsman', 'Bowler', 'All-rounder', 'Wicket Keeper'];

const playerSchema = new mongoose.Schema(
  {
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    photo: { type: String, default: '' },
    jerseyNumber: { type: Number, min: 0, max: 999, default: null },
    age: { type: Number, min: 5, max: 100, default: null },
    role: { type: String, enum: PLAYER_ROLES, default: 'Batsman' },
    battingStyle: { type: String, trim: true, maxlength: 40, default: '' },
    bowlingStyle: { type: String, trim: true, maxlength: 40, default: '' },
  },
  { timestamps: true }
);

export const Player = mongoose.model('Player', playerSchema);
