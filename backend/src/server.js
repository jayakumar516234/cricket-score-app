import mongoose from 'mongoose';
import { config } from './config.js';
import { createApp } from './app.js';
import { User } from './models/User.js';

mongoose.set('strictQuery', true);

try {
  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 5000 });
  console.log(`MongoDB connected: ${config.mongoUri}`);
} catch (e) {
  console.error('\nCould not connect to MongoDB at', config.mongoUri);
  console.error('Make sure MongoDB is running (see README, step 1). Error:', e.message);
  process.exit(1);
}

// Upgrade databases created by the earlier version (it had an "admin" role and a required email).
try {
  const moved = await User.updateMany({ role: 'admin' }, { $set: { role: 'user' } });
  if (moved.modifiedCount) console.log(`Converted ${moved.modifiedCount} old admin account(s) to normal users`);
  await User.syncIndexes();
} catch (e) {
  console.warn('User index sync warning:', e.message);
}

createApp().listen(config.port, () => console.log(`API running on http://localhost:${config.port}`));
