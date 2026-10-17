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

try {
  await User.syncIndexes();

  const bcrypt = (await import('bcryptjs')).default;
  const existingSuper = await User.findOne({ username: 'superadmin01' });
  if (existingSuper) {
    if (existingSuper.role !== 'superadmin') {
      existingSuper.role = 'superadmin';
      await existingSuper.save();
      console.log('Promoted superadmin01 to superadmin role');
    }
  } else {
    await User.create({
      name: 'Super Admin',
      username: 'superadmin01',
      passwordHash: await bcrypt.hash('j@ya1234', 10),
      role: 'superadmin',
      active: true,
    });
    console.log('Created superadmin01 with superadmin role');
  }
} catch (e) {
  console.warn('Startup setup warning:', e.message);
}

createApp().listen(config.port, () => console.log(`API running on http://localhost:${config.port}`));
