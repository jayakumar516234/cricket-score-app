process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.MAX_TEAMS_PER_USER = '1';
process.env.STRICT_CONNECTIONS = 'true';

import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { config } from '../src/config.js';
import { createApp } from '../src/app.js';
import { User } from '../src/models/User.js';
import { Team } from '../src/models/Team.js';
import { TeamConnection } from '../src/models/TeamConnection.js';

const app = createApp();
const api = () => request(app);
const auth = (t) => ({ Authorization: `Bearer ${t}` });

let tokAdminA, tokAdminB, userA, userB;
let teamA, teamB;

const squad = (prefix) =>
  Array.from({ length: 11 }, (_, i) => ({
    name: `${prefix} Player ${i + 1}`,
    jerseyNumber: i + 1,
    age: 22,
    role: i < 5 ? 'Batsman' : 'Bowler',
  }));

before(async () => {
  await mongoose.connect(config.mongoUriTest);
  await mongoose.connection.dropDatabase();
  await User.syncIndexes();
  await Team.syncIndexes();
  await TeamConnection.syncIndexes();

  const regA = await api().post('/api/auth/register').send({
    name: 'Admin One',
    username: 'admin_one',
    phone: '9876543211',
    password: 'password1',
  });
  tokAdminA = regA.body.token;
  userA = regA.body.user;

  const regB = await api().post('/api/auth/register').send({
    name: 'Admin Two',
    username: 'admin_two',
    phone: '9876543212',
    password: 'password1',
  });
  tokAdminB = regB.body.token;
  userB = regB.body.user;
});

after(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

test('1. Team Admin can create 1 team with unique 6-char code', async () => {
  const resA = await api()
    .post('/api/teams')
    .set(auth(tokAdminA))
    .send({
      name: 'Chennai Superstars',
      location: 'Chennai',
      ballType: 'Tennis Ball',
      players: squad('CSK'),
    });
  assert.equal(resA.status, 201);
  assert.ok(resA.body.team.code, 'team must have a code');
  assert.equal(resA.body.team.code.length, 6);
  teamA = resA.body.team;

  const resB = await api()
    .post('/api/teams')
    .set(auth(tokAdminB))
    .send({
      name: 'Mumbai Challengers',
      location: 'Mumbai',
      ballType: 'Tennis Ball',
      players: squad('MI'),
    });
  assert.equal(resB.status, 201);
  assert.ok(resB.body.team.code);
  assert.notEqual(resA.body.team.code, resB.body.team.code);
  teamB = resB.body.team;
});

test('2. Team Admin cannot create a second team (1 team limit)', async () => {
  const second = await api()
    .post('/api/teams')
    .set(auth(tokAdminA))
    .send({
      name: 'Second Team Attempt',
      location: 'Chennai',
      ballType: 'Tennis Ball',
      players: squad('SEC'),
    });
  assert.equal(second.status, 403);
  assert.match(second.body.error, /only 1 team/i);
});

test('3. Team Admin can edit their existing team', async () => {
  const edit = await api()
    .put(`/api/teams/${teamA.id}`)
    .set(auth(tokAdminA))
    .send({
      name: 'Chennai Superstars XI',
      location: 'Chennai Central',
      ballType: 'Tennis Ball',
      players: squad('CSK'),
    });
  assert.equal(edit.status, 200);
  assert.equal(edit.body.team.name, 'Chennai Superstars XI');
});

test('4. Cannot create match against opponent before connecting', async () => {
  const match = await api()
    .post('/api/matches')
    .set(auth(tokAdminA))
    .send({
      homeTeam: teamA.id,
      awayTeam: teamB.id,
      format: 'T20',
      tossWinner: teamA.id,
      tossDecision: 'bat',
    });
  assert.equal(match.status, 403);
  assert.match(match.body.error, /not an accepted opponent/i);
});

test('5. Send opponent request using team code', async () => {
  // Invalid code
  const bad = await api()
    .post(`/api/teams/${teamA.id}/connect`)
    .set(auth(tokAdminA))
    .send({ code: 'NONEXIST' });
  assert.equal(bad.status, 404);

  // Send request to Team B using Team B's code
  const req = await api()
    .post(`/api/teams/${teamA.id}/connect`)
    .set(auth(tokAdminA))
    .send({ code: teamB.code });
  assert.equal(req.status, 201);
  assert.equal(req.body.status, 'pending');

  // Duplicate request check
  const dup = await api()
    .post(`/api/teams/${teamA.id}/connect`)
    .set(auth(tokAdminA))
    .send({ code: teamB.code });
  assert.equal(dup.status, 400);
});

test('6. Opponent sees incoming request and accepts', async () => {
  const conns = await api()
    .get(`/api/teams/${teamB.id}/connections`)
    .set(auth(tokAdminB));
  assert.equal(conns.status, 200);
  assert.equal(conns.body.incoming.length, 1);
  assert.equal(conns.body.incoming[0].fromTeam.name, 'Chennai Superstars XI');

  const connId = conns.body.incoming[0].connectionId;
  const accept = await api()
    .put(`/api/teams/${teamB.id}/connections/${connId}`)
    .set(auth(tokAdminB))
    .send({ status: 'accepted' });
  assert.equal(accept.status, 200);
  assert.equal(accept.body.status, 'accepted');
});

test('7. Both teams now list each other as connected opponents', async () => {
  const connsA = await api()
    .get(`/api/teams/${teamA.id}/connections`)
    .set(auth(tokAdminA));
  assert.equal(connsA.status, 200);
  assert.equal(connsA.body.connected.length, 1);
  assert.equal(connsA.body.connected[0].team.id, teamB.id);

  const connsB = await api()
    .get(`/api/teams/${teamB.id}/connections`)
    .set(auth(tokAdminB));
  assert.equal(connsB.status, 200);
  assert.equal(connsB.body.connected.length, 1);
  assert.equal(connsB.body.connected[0].team.id, teamA.id);
});

test('8. Opponent team squad and player stats are accessible', async () => {
  const oppSquad = await api()
    .get(`/api/teams/${teamB.id}`)
    .set(auth(tokAdminA));
  assert.equal(oppSquad.status, 200);
  assert.equal(oppSquad.body.players.length, 11);

  const oppStats = await api()
    .get(`/api/teams/${teamB.id}/player-stats`)
    .set(auth(tokAdminA));
  assert.equal(oppStats.status, 200);
  assert.ok(Array.isArray(oppStats.body.stats));
  assert.equal(oppStats.body.stats.length, 11);
});

test('9. Can now create a match between connected opponents', async () => {
  const match = await api()
    .post('/api/matches')
    .set(auth(tokAdminA))
    .send({
      homeTeam: teamA.id,
      awayTeam: teamB.id,
      format: 'T20',
      tossWinner: teamA.id,
      tossDecision: 'bat',
    });
  assert.equal(match.status, 201);
  assert.equal(match.body.match.homeTeam.id, teamA.id);
  assert.equal(match.body.match.awayTeam.id, teamB.id);
});
