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

  const { Team, generateTeamCode } = await import('./models/Team.js');
  await Team.syncIndexes();
  const teamsWithoutCode = await Team.find({ $or: [{ code: { $exists: false } }, { code: null }, { code: '' }] });
  for (const t of teamsWithoutCode) {
    let c;
    while (!c || (await Team.exists({ code: c }))) {
      c = generateTeamCode();
    }
    t.code = c;
    await t.save();
    console.log(`Assigned code ${c} to team ${t.name}`);
  }

  const { TeamConnection } = await import('./models/TeamConnection.js');
  await TeamConnection.syncIndexes();
} catch (e) {
  console.warn('Startup setup warning:', e.message);
}

createApp().listen(config.port, () => console.log(`API running on http://localhost:${config.port}`));
