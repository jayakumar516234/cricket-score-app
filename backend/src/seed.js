// Usage:
//   npm run seed          -> creates the Super Admin only
//   npm run seed:sample   -> also creates 2 sample users (each owning a team) and 3 more teams (development only)
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { config } from './config.js';
import { User } from './models/User.js';
import { Team } from './models/Team.js';
import { Player } from './models/Player.js';

const withSample = process.argv.includes('--sample');
const isProd = config.nodeEnv === 'production';

const name = process.env.SEED_SUPERADMIN_NAME || 'Super Admin';
const email = (process.env.SEED_SUPERADMIN_EMAIL || 'superadmin@gmail.com').toLowerCase();
const password = process.env.SEED_SUPERADMIN_PASSWORD || '1';

if (isProd) {
  if (withSample) { console.error('Sample data is not allowed in production.'); process.exit(1); }
  if (!process.env.SEED_SUPERADMIN_PASSWORD || password.length < 10) {
    console.error('In production, set SEED_SUPERADMIN_PASSWORD (10+ characters) and SEED_SUPERADMIN_EMAIL in the environment.');
    process.exit(1);
  }
}

const FIRST = ['Rahul', 'Suresh', 'Vignesh', 'Aravind', 'Karthik', 'Manoj', 'Dinesh', 'Prakash', 'Sathish', 'Naveen', 'Gokul', 'Harish', 'Ganesh', 'Bala', 'Ashwin', 'Mohan', 'Kumar', 'Surya', 'Vijay', 'Ramesh', 'Arun', 'Senthil'];
const ROLES = ['Batsman', 'Batsman', 'Batsman', 'Batsman', 'Wicket Keeper', 'All-rounder', 'All-rounder', 'Bowler', 'Bowler', 'Bowler', 'Bowler'];
const TEAMS = [
  ['Kanchipuram', 'Kanchipuram', 'Leather Ball'],
  ['Chennai', 'Chennai', 'Leather Ball'],
  ['Tiruvannamalai', 'Tiruvannamalai', 'Tennis Ball'],
  ['Vellore', 'Vellore', 'Tennis Ball'],
  ['Madurai', 'Madurai', 'Rubber Ball'],
];
const SAMPLE_USERS = [
  { name: 'Demo Player One', username: 'demo1', phone: '9000000001', password: 'demo123' },
  { name: 'Demo Player Two', username: 'demo2', phone: '9000000002', password: 'demo123' },
];

await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 5000 }).catch((e) => {
  console.error('Could not connect to MongoDB:', e.message);
  process.exit(1);
});

// Upgrade databases created by the earlier version (it had an "admin" role and a required email).
await User.updateMany({ role: 'admin' }, { $set: { role: 'user' } });
await User.syncIndexes();

let superAdmin = await User.findOne({ email });
if (!superAdmin) {
  superAdmin = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 10), role: 'superadmin' });
  console.log(`Created Super Admin: ${email}${isProd ? '' : ' (development password from .env / default)'}`);
} else {
  console.log(`Super Admin already exists: ${email}`);
}

if (withSample) {
  const owners = [];
  for (const u of SAMPLE_USERS) {
    let doc = await User.findOne({ username: u.username });
    if (!doc) {
      doc = await User.create({ name: u.name, username: u.username, phone: u.phone, passwordHash: await bcrypt.hash(u.password, 10), role: 'user' });
      console.log(`Created sample user: ${u.username} (or phone ${u.phone}) / ${u.password}`);
    }
    owners.push(doc);
  }
  let offset = 0;
  for (const [i, [teamName, location, ballType]] of TEAMS.entries()) {
    if (await Team.exists({ name: teamName })) { offset += 11; continue; }
    const owner = owners[i] || superAdmin; // first two teams belong to demo1 / demo2
    const team = await Team.create({ name: teamName, location, ballType, description: `${teamName} local cricket club`, createdBy: owner._id });
    const players = ROLES.map((role, n) => ({
      team: team._id,
      name: `${FIRST[(offset + n) % FIRST.length]} ${String.fromCharCode(65 + ((offset + n) % 26))}.`,
      jerseyNumber: n + 1,
      age: 18 + ((offset + n) % 12),
      role,
      battingStyle: role === 'Bowler' ? 'Right-hand bat' : n % 3 === 0 ? 'Left-hand bat' : 'Right-hand bat',
      bowlingStyle: role === 'Batsman' || role === 'Wicket Keeper' ? '' : n % 2 ? 'Right-arm medium' : 'Right-arm offbreak',
    }));
    await Player.insertMany(players);
    offset += 11;
    console.log(`Created team ${teamName} (owner: ${owner.username || 'Super Admin'}) with ${players.length} players`);
  }

  // A sample view-only login for the Kanchipuram team.
  const kanchi = await Team.findOne({ name: 'Kanchipuram' });
  if (kanchi && !(await User.exists({ viewTeam: kanchi._id }))) {
    await User.create({ name: 'Kanchipuram viewer', username: 'kanchipuram_view', passwordHash: await bcrypt.hash('1234', 10), role: 'viewer', viewTeam: kanchi._id });
    console.log('Created sample view-only login: kanchipuram_view / 1234 (sees only the Kanchipuram team)');
  }
}

await mongoose.disconnect();
