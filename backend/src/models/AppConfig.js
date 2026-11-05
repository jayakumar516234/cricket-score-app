import mongoose from 'mongoose';

// Stores global app configuration, keyed by configKey (singleton per key)
const AppConfigSchema = new mongoose.Schema(
  {
    configKey: { type: String, required: true, unique: true, index: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export const AppConfig = mongoose.model('AppConfig', AppConfigSchema);

// Default menu visibility — which nav keys are visible per role
// Keys match the Layout.jsx nav `key` field
export const DEFAULT_MENU_VISIBILITY = {
  superadmin: ['home', 'teams', 'matches', 'tournaments', 'users', 'support', 'audit', 'settings'],
  admin:      ['home', 'teams', 'matches', 'tournaments', 'users', 'support', 'settings'],
  teamadmin:  ['home', 'teams', 'matches', 'tournaments', 'support', 'settings'],
  user:       ['home', 'teams', 'matches', 'tournaments', 'support', 'settings'],
  viewer:     ['home', 'teams', 'matches', 'tournaments', 'support', 'settings'],
};

export const ALL_MENU_KEYS = ['home', 'teams', 'matches', 'tournaments', 'users', 'support', 'audit', 'settings'];
