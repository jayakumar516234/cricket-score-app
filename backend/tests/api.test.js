// These tests need a running MongoDB. They use MONGO_URI_TEST (default mongodb://127.0.0.1:27017/cricket_app_test)
// and WIPE that database before running.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.MAX_TEAMS_PER_USER = '3';

import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { config } from '../src/config.js';
import { createApp } from '../src/app.js';
import { User } from '../src/models/User.js';

const app = createApp();
const api = () => request(app);
const auth = (t) => ({ Authorization: `Bearer ${t}` });
let tokSuper;
let tokA; // user A: owns Kanchipuram
let tokB; // user B: owns Chennai Kings
let tokC; // user C: used for the team limit

const players = (prefix) =>
  Array.from({ length: 11 }, (_, i) => ({
    name: `${prefix} Player ${i + 1}`,
    jerseyNumber: i + 1,
    age: 20 + i,
    role: i < 4 ? 'Batsman' : i === 4 ? 'Wicket Keeper' : i < 7 ? 'All-rounder' : 'Bowler',
  }));
const teamBody = (name, extra = {}) => ({ name, location: 'Chennai', ballType: 'Tennis Ball', players: players(name), ...extra });
const signup = (name, username, phone, password = 'secret1') => api().post('/api/auth/register').send({ name, username, phone, password });

before(async () => {
  await mongoose.connect(config.mongoUriTest);
  await mongoose.connection.dropDatabase();
  await User.syncIndexes();
  await User.create({ name: 'Super Admin', email: 'superadmin@gmail.com', passwordHash: await bcrypt.hash('1', 4), role: 'superadmin' });
});
after(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

// ---------------- authentication ----------------
test('auth: Super Admin logs in with email; bad credentials are rejected', async () => {
  assert.equal((await api().post('/api/auth/login').send({ identifier: 'superadmin@gmail.com', password: 'wrong' })).status, 401);
  assert.equal((await api().post('/api/auth/login').send({ identifier: '', password: '' })).status, 400);
  const ok = await api().post('/api/auth/login').send({ identifier: 'superadmin@gmail.com', password: '1' });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.user.role, 'superadmin');
  assert.equal(ok.body.user.passwordHash, undefined);
  tokSuper = ok.body.token;
  const me = await api().get('/api/auth/me').set(auth(tokSuper));
  assert.equal(me.body.user.email, 'superadmin@gmail.com');
  assert.equal((await api().get('/api/auth/me')).status, 401);
  assert.equal((await api().get('/api/auth/me').set(auth('garbage'))).status, 401);
});

test('auth: anyone can sign up with name, username, phone and password', async () => {
  const a = await signup('Rahul Kumar', 'Rahul_K', '+91 98765 43210');
  assert.equal(a.status, 201);
  assert.equal(a.body.user.role, 'user');
  assert.equal(a.body.user.username, 'rahul_k'); // lower-cased
  assert.equal(a.body.user.phone, '9876543210'); // normalised
  tokA = a.body.token;
  const b = await signup('Suresh M', 'suresh_m', '9876500001');
  assert.equal(b.status, 201);
  tokB = b.body.token;
  const c = await signup('Third Person', 'third_p', '9876500002');
  tokC = c.body.token;
});

test('auth: sign-up validation and duplicates', async () => {
  assert.equal((await signup('X', 'validname', '9876500003')).status, 400); // short name
  assert.equal((await signup('Name Ok', 'ab', '9876500003')).status, 400); // short username
  assert.equal((await signup('Name Ok', '12345678', '9876500003')).status, 400); // username needs a letter
  assert.equal((await signup('Name Ok', 'valid_name', '12345')).status, 400); // bad phone
  assert.equal((await signup('Name Ok', 'valid_name', '5876500003')).status, 400); // must start with 6-9
  assert.equal((await signup('Name Ok', 'valid_name', '9876500003', '123')).status, 400); // short password
  const dupUser = await signup('Other', 'RAHUL_K', '9876500009');
  assert.equal(dupUser.status, 409);
  assert.match(dupUser.body.error, /username/i);
  const dupPhone = await signup('Other', 'someone_else', '09876543210'); // same number, different format
  assert.equal(dupPhone.status, 409);
  assert.match(dupPhone.body.error, /phone/i);
});

test('auth: login with username or phone number', async () => {
  for (const identifier of ['rahul_k', 'RAHUL_K', '9876543210', '+91 98765-43210']) {
    const r = await api().post('/api/auth/login').send({ identifier, password: 'secret1' });
    assert.equal(r.status, 200, identifier);
    assert.equal(r.body.user.username, 'rahul_k');
  }
  assert.equal((await api().post('/api/auth/login').send({ identifier: 'rahul_k', password: 'nope' })).status, 401);
  assert.equal((await api().post('/api/auth/login').send({ identifier: '9999999999', password: 'secret1' })).status, 401);
});

test('roles: only the Super Admin sees users and phone numbers', async () => {
  assert.equal((await api().get('/api/users').set(auth(tokA))).status, 403);
  assert.equal((await api().get('/api/audit').set(auth(tokA))).status, 403);
  const list = await api().get('/api/users?search=9876543210').set(auth(tokSuper));
  assert.equal(list.status, 200);
  assert.equal(list.body.items[0].phone, '9876543210');
  assert.equal(list.body.items[0].teamCount, 0);
});

test('roles: Super Admin can disable an account, which then cannot sign in', async () => {
  const c = await api().post('/api/users').set(auth(tokSuper)).send({ name: 'Temp User', username: 'temp_user', phone: '9876500077', password: 'temp123' });
  assert.equal(c.status, 201);
  await api().put(`/api/users/${c.body.user.id}`).set(auth(tokSuper)).send({ active: false });
  assert.equal((await api().post('/api/auth/login').send({ identifier: 'temp_user', password: 'temp123' })).status, 403);
  assert.equal((await api().delete(`/api/users/${c.body.user.id}`).set(auth(tokSuper))).status, 200);
});

// ---------------- team management ----------------
test('teams: a user creates their team with exactly 11 players; others can view it', async () => {
  const r = await api().post('/api/teams').set(auth(tokA)).send(teamBody('Kanchipuram'));
  assert.equal(r.status, 201);
  assert.equal(r.body.players.length, 11);
  assert.equal(r.body.team.canManage, true);
  const list = await api().get('/api/teams?search=kanchi').set(auth(tokB));
  assert.equal(list.body.total, 1);
  assert.equal(list.body.items[0].playerCount, 11);
  assert.equal(list.body.items[0].canManage, false);
  const one = await api().get(`/api/teams/${r.body.team.id}`).set(auth(tokB));
  assert.equal(one.body.players.length, 11);
  assert.ok(!JSON.stringify(one.body).includes('9876543210')); // phone numbers are never exposed to other users
});

test('teams: validation (11 players, duplicate names/jerseys/team name, required fields)', async () => {
  const ten = teamBody('Short Team', { players: players('S').slice(0, 10) });
  assert.equal((await api().post('/api/teams').set(auth(tokA)).send(ten)).status, 400);
  const dupJersey = teamBody('Dup Jersey');
  dupJersey.players[1].jerseyNumber = 1;
  const j = await api().post('/api/teams').set(auth(tokA)).send(dupJersey);
  assert.equal(j.status, 400);
  assert.match(j.body.error, /jersey/i);
  const dupName = teamBody('Dup Name');
  dupName.players[2].name = dupName.players[0].name.toUpperCase();
  assert.equal((await api().post('/api/teams').set(auth(tokA)).send(dupName)).status, 400);
  assert.equal((await api().post('/api/teams').set(auth(tokA)).send(teamBody('kanchipuram'))).status, 409);
  assert.equal((await api().post('/api/teams').set(auth(tokA)).send({ ...teamBody('x'), name: '' })).status, 400);
  assert.equal((await api().post('/api/teams').set(auth(tokA)).send(teamBody('Bad Ball', { ballType: 'Plastic' }))).status, 400);
  assert.equal((await api().post('/api/teams').send(teamBody('No Login'))).status, 401);
  const blank = teamBody('Blank Optional');
  blank.players.forEach((p) => { p.jerseyNumber = ''; p.age = ''; });
  assert.equal((await api().post('/api/teams').set(auth(tokA)).send(blank)).status, 201);
});

test('teams: a squad can have 11 to 25 players and new players can be added later', async () => {
  const twelve = teamBody('Squad Twelve', { players: [...players('SQ'), { name: 'SQ Extra', role: 'Bowler', jerseyNumber: 12 }] });
  const r = await api().post('/api/teams').set(auth(tokB)).send(twelve);
  assert.equal(r.status, 201);
  assert.equal(r.body.players.length, 12);
  const id = r.body.team.id;
  const big = Array.from({ length: 26 }, (_, i) => ({ name: `Big ${i}`, jerseyNumber: i + 1, role: 'Batsman' }));
  const tooMany = await api().post('/api/teams').set(auth(tokB)).send(teamBody('Too Many', { players: big }));
  assert.equal(tooMany.status, 400);
  assert.match(tooMany.body.error, /at most 25/);
  // add players one by one (only the owner can)
  assert.equal((await api().post(`/api/teams/${id}/players`).set(auth(tokA)).send({ name: 'Intruder', role: 'Batsman' })).status, 403);
  const add = await api().post(`/api/teams/${id}/players`).set(auth(tokB)).send({ name: 'New Opener', role: 'Batsman', jerseyNumber: 50 });
  assert.equal(add.status, 201);
  assert.equal(add.body.playerCount, 13);
  assert.equal((await api().post(`/api/teams/${id}/players`).set(auth(tokB)).send({ name: 'new opener', role: 'Batsman' })).status, 400); // duplicate name
  assert.equal((await api().post(`/api/teams/${id}/players`).set(auth(tokB)).send({ name: 'Other Guy', role: 'Batsman', jerseyNumber: 50 })).status, 400); // duplicate jersey
  assert.equal((await api().post(`/api/teams/${id}/players`).set(auth(tokB)).send({ name: '', role: 'Batsman' })).status, 400);
  for (let i = 14; i <= 25; i++) {
    assert.equal((await api().post(`/api/teams/${id}/players`).set(auth(tokB)).send({ name: `Filler ${i}`, role: 'Bowler' })).status, 201);
  }
  const full = await api().post(`/api/teams/${id}/players`).set(auth(tokB)).send({ name: 'One Too Many', role: 'Bowler' });
  assert.equal(full.status, 400);
  assert.match(full.body.error, /at most 25/);
});

test('teams: a team name can only be used once (ignoring case and extra spaces)', async () => {
  assert.equal((await api().post('/api/teams').set(auth(tokB)).send(teamBody('  KANCHIPURAM '))).status, 409);
  const dup = await api().post('/api/teams').set(auth(tokC)).send(teamBody('Squad   twelve'));
  assert.equal(dup.status, 409);
  assert.match(dup.body.error, /already exists/);
  // renaming a team to an existing name is also refused
  const mine = (await api().get('/api/teams?search=Blank Optional').set(auth(tokA))).body.items[0];
  const detail = await api().get(`/api/teams/${mine.id}`).set(auth(tokA));
  const ren = await api().put(`/api/teams/${mine.id}`).set(auth(tokA)).send({ ...teamBody('kanchipuram'), players: detail.body.players.map((p) => ({ ...p, _id: p.id })) });
  assert.equal(ren.status, 409);
});

test('teams: users can edit and delete only their own teams; the Super Admin can manage any', async () => {
  const mine = await api().post('/api/teams').set(auth(tokB)).send(teamBody('Chennai Kings'));
  assert.equal(mine.status, 201);
  const kanchi = (await api().get('/api/teams?search=kanchipuram').set(auth(tokB))).body.items[0];
  assert.equal((await api().put(`/api/teams/${kanchi.id}`).set(auth(tokB)).send(teamBody('Kanchipuram'))).status, 403);
  assert.equal((await api().delete(`/api/teams/${kanchi.id}`).set(auth(tokB))).status, 403);
  // owner A edits their own team
  const detail = await api().get(`/api/teams/${kanchi.id}`).set(auth(tokA));
  const asEdit = (ps) => ps.map((p) => ({ ...p, _id: p.id }));
  const ok = await api().put(`/api/teams/${kanchi.id}`).set(auth(tokA)).send({ ...teamBody('Kanchipuram'), location: 'Kanchipuram', players: asEdit(detail.body.players) });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.team.location, 'Kanchipuram');
  // Super Admin can edit any team
  const su = await api().put(`/api/teams/${kanchi.id}`).set(auth(tokSuper)).send({ ...teamBody('Kanchipuram'), location: 'Kanchipuram City', players: asEdit(detail.body.players) });
  assert.equal(su.status, 200);
});

test('teams: edit keeps player ids, supports replacing a player, writes audit history', async () => {
  const t = (await api().get('/api/teams?search=Chennai Kings').set(auth(tokB))).body.items[0];
  const detail = await api().get(`/api/teams/${t.id}`).set(auth(tokB));
  const list = detail.body.players.map((p) => ({ ...p, _id: p.id }));
  const keptId = list[0].id;
  list[0].name = 'Renamed Opener';
  list[10] = { name: 'Brand New Bowler', role: 'Bowler', jerseyNumber: 99 }; // replaces player 11
  const r = await api().put(`/api/teams/${t.id}`).set(auth(tokB)).send({ ...teamBody('Chennai Kings'), players: list });
  assert.equal(r.status, 200);
  assert.equal(r.body.players.length, 11);
  assert.equal(r.body.players.find((p) => p.id === keptId).name, 'Renamed Opener');
  assert.ok(r.body.players.find((p) => p.name === 'Brand New Bowler'));
  const log = await api().get('/api/audit?action=team.update').set(auth(tokSuper));
  assert.ok(log.body.total >= 1);
});

test('teams: delete removes team and its players; a user can only create a limited number of teams', async () => {
  const c = await api().post('/api/teams').set(auth(tokA)).send(teamBody('Throwaway'));
  assert.equal(c.status, 201);
  assert.equal((await api().delete(`/api/teams/${c.body.team.id}`).set(auth(tokA))).status, 200);
  assert.equal((await api().get(`/api/teams/${c.body.team.id}`).set(auth(tokA))).status, 404);
  for (const n of ['Limit One', 'Limit Two', 'Limit Three']) {
    assert.equal((await api().post('/api/teams').set(auth(tokC)).send(teamBody(n))).status, 201);
  }
  const over = await api().post('/api/teams').set(auth(tokC)).send(teamBody('Limit Four'));
  assert.equal(over.status, 403);
  assert.match(over.body.error, /up to 3 teams/);
});

// ---------------- match flow: extras, wickets, overs, strike, innings, result ----------------
let H; // user A's team (home)
let AW; // user B's team (opponent)
let third;
let matchId;
let xiH;
let xiA;

const state = async () => (await api().get(`/api/matches/${matchId}`).set(auth(tokA))).body;
const score = (body, token = tokA) => api().post(`/api/matches/${matchId}/balls`).set(auth(token)).send(body);

test('match: a user creates a match with their own team vs an opponent', async () => {
  const teams = (await api().get('/api/teams?limit=50').set(auth(tokA))).body.items;
  H = teams.find((t) => t.name === 'Kanchipuram');
  AW = teams.find((t) => t.name === 'Chennai Kings');
  third = teams.find((t) => t.name === 'Blank Optional');
  const base = { homeTeam: H.id, awayTeam: AW.id, format: 'Custom', overs: 2, tossWinner: H.id, tossDecision: 'bat' };
  assert.equal((await api().post('/api/matches').set(auth(tokA)).send({ ...base, awayTeam: H.id })).status, 400); // same team
  assert.equal((await api().post('/api/matches').set(auth(tokA)).send({ ...base, tossWinner: third.id })).status, 400); // toss winner must be playing
  assert.equal((await api().post('/api/matches').set(auth(tokA)).send({ ...base, overs: 99 })).status, 400);
  assert.equal((await api().post('/api/matches').send(base)).status, 401);
  // B cannot start a match using A's team as "own team"
  assert.equal((await api().post('/api/matches').set(auth(tokB)).send(base)).status, 403);
  const t20 = await api().post('/api/matches').set(auth(tokA)).send({ ...base, format: 'T20', overs: undefined });
  assert.equal(t20.status, 201);
  assert.equal(t20.body.match.overs, 20);
  await api().delete(`/api/matches/${t20.body.match.id}`).set(auth(tokA));
  const ok = await api().post('/api/matches').set(auth(tokA)).send(base);
  assert.equal(ok.status, 201);
  assert.equal(ok.body.canManage, true);
  matchId = ok.body.match.id;
  assert.equal(ok.body.match.xi.home.length, 0); // the playing XI is chosen when the match starts
  // other users can view the match but not manage it
  const view = await api().get(`/api/matches/${matchId}`).set(auth(tokB));
  assert.equal(view.body.canManage, false);
});

const side = (ids, guests = []) => ({ playerIds: ids, guests });
const squadIds = async (team, token = tokA) => (await api().get(`/api/teams/${team.id}`).set(auth(token))).body.players.map((p) => p.id);

test('match: the playing XI (11 of the squad) is chosen at the start, guests can be added', async () => {
  const teams = (await api().get('/api/teams?limit=50').set(auth(tokB))).body.items;
  const twelve = teams.find((t) => t.name === 'Squad Twelve'); // 25 players
  const m = await api().post('/api/matches').set(auth(tokB)).send({ homeTeam: twelve.id, awayTeam: H.id, format: 'Custom', overs: 1, tossWinner: twelve.id, tossDecision: 'bat' });
  assert.equal(m.status, 201);
  const id = m.body.match.id;
  const start = (body) => api().post(`/api/matches/${id}/start`).set(auth(tokB)).send(body);
  const sq = await squadIds(twelve, tokB);
  const away = await squadIds(H, tokB);
  assert.equal((await start({})).status, 400); // nothing selected
  assert.equal((await start({ home: side(sq.slice(0, 10)), away: side(away) })).status, 400); // only 10
  assert.equal((await start({ home: side(sq.slice(0, 12)), away: side(away) })).status, 400); // 12
  assert.equal((await start({ home: side([...sq.slice(0, 10), away[0]]), away: side(away) })).status, 400); // a player of another team
  assert.equal((await start({ home: side([sq[0], sq[0], ...sq.slice(1, 10)]), away: side(away) })).status, 400); // duplicate
  const names = (await api().get(`/api/teams/${twelve.id}`).set(auth(tokB))).body.players.map((p) => p.name);
  assert.equal((await start({ home: side(sq.slice(0, 10), [{ name: names[0].toUpperCase() }]), away: side(away) })).status, 400); // guest with the same name
  const ok = await start({ home: side(sq.slice(0, 10), [{ name: 'Guest Fielder', role: 'Bowler' }]), away: side(away) });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.match.status, 'live');
  assert.equal(ok.body.match.xi.home.length, 11);
  assert.equal(ok.body.match.xi.home.filter((p) => p.guest).length, 1);
  assert.equal((await api().post(`/api/matches/${id}/start`).set(auth(tokB)).send({ home: side(sq.slice(0, 11)), away: side(away) })).status, 409); // already started
  assert.equal((await api().delete(`/api/matches/${id}`).set(auth(tokB))).status, 200);
});

test('match: scoring is blocked before the start; start sets innings 1 by toss; others cannot start', async () => {
  const dummy = { striker: 'a', nonStriker: 'b', bowler: 'c', runs: 1 };
  assert.equal((await score(dummy)).status, 409);
  const homeIds = await squadIds(H);
  const awayIds = await squadIds(AW);
  const body = { home: side(homeIds), away: side(awayIds) };
  assert.equal((await api().post(`/api/matches/${matchId}/start`).set(auth(tokB)).send(body)).status, 403);
  const s = await api().post(`/api/matches/${matchId}/start`).set(auth(tokA)).send(body);
  assert.equal(s.status, 200);
  assert.equal(s.body.match.status, 'live');
  assert.equal(s.body.innings[0].battingTeam, H.id); // home won toss and chose to bat
  xiH = s.body.match.xi.home.map((p) => p.id);
  xiA = s.body.match.xi.away.map((p) => p.id);
  assert.equal(xiH.length, 11);
  assert.equal(xiA.length, 11);
});

test('scoring: wide + 2 runs + run out on the same ball', async () => {
  // a separate quick check on the live match: use the first ball of the innings, then undo it
  let r = await score({ striker: xiH[0], nonStriker: xiH[1], bowler: xiA[10], runs: 2, extra: 'wide', wicket: { type: 'runout', dismissed: 'nonStriker', fielder: 'Keeper' } });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  let st = r.body.innings[0].state;
  assert.equal(st.runs, 3);
  assert.equal(st.wickets, 1);
  assert.equal(st.overs, '0.0'); // wide: not a legal delivery
  assert.equal(st.needs.nonStriker, true);
  assert.equal(st.battingCard.find((b) => b.id === xiH[1]).out, true);
  assert.equal(st.bowlingCard[0].wickets, 0);
  assert.equal(st.commentary[0].label, 'Wd+2+W');
  // a bowled wicket on a wide is refused
  assert.equal((await score({ striker: xiH[0], nonStriker: xiH[2], bowler: xiA[10], extra: 'wide', wicket: { type: 'bowled' } })).status, 400);
  const undo = await api().delete(`/api/matches/${matchId}/balls/last`).set(auth(tokA));
  assert.equal(undo.status, 200);
  assert.equal(undo.body.innings[0].state.runs, 0);
  assert.equal(undo.body.innings[0].state.wickets, 0);
});

test('scoring: legal ball, strike rotation, wide and no-ball are not legal balls', async () => {
  let r = await score({ striker: xiH[0], nonStriker: xiH[1], bowler: xiA[10], runs: 1 });
  assert.equal(r.status, 201);
  let st = r.body.innings[0].state;
  assert.equal(st.runs, 1);
  assert.equal(st.overs, '0.1');
  assert.equal(st.striker, xiH[1]); // strike rotated
  r = await score({ striker: xiH[1], nonStriker: xiH[0], bowler: xiA[10], extra: 'wide' });
  st = r.body.innings[0].state;
  assert.equal(st.runs, 2);
  assert.equal(st.overs, '0.1'); // wide is not a legal delivery
  r = await score({ striker: xiH[1], nonStriker: xiH[0], bowler: xiA[10], extra: 'noball', runs: 4 });
  st = r.body.innings[0].state;
  assert.equal(st.runs, 7);
  assert.equal(st.overs, '0.1');
  assert.equal(st.extras.wide, 1);
  assert.equal(st.extras.noball, 1);
});

test('scoring: rejects invalid selections and impossible dismissals', async () => {
  assert.equal((await score({ striker: xiH[5], nonStriker: xiH[0], bowler: xiA[10], runs: 1 })).status, 400);
  assert.equal((await score({ striker: xiH[1], nonStriker: xiH[0], bowler: xiA[9], runs: 1 })).status, 400);
  assert.equal((await score({ striker: xiH[1], nonStriker: xiH[0], bowler: xiA[10], extra: 'noball', wicket: { type: 'bowled' } })).status, 400);
  assert.equal((await score({ striker: xiA[0], nonStriker: xiH[0], bowler: xiA[10], runs: 1 })).status, 400);
});

test('scoring: wicket, new batter, undo restores state and is audited', async () => {
  let r = await score({ striker: xiH[1], nonStriker: xiH[0], bowler: xiA[10], wicket: { type: 'bowled' } });
  assert.equal(r.status, 201);
  let st = r.body.innings[0].state;
  assert.equal(st.wickets, 1);
  assert.equal(st.needs.striker, true);
  assert.equal(st.nonStriker, xiH[0]);
  assert.equal((await score({ striker: xiH[1], nonStriker: xiH[0], bowler: xiA[10], runs: 1 })).status, 400); // dismissed batter cannot return
  r = await score({ striker: xiH[2], nonStriker: xiH[0], bowler: xiA[10], runs: 0 });
  assert.equal(r.status, 201);
  const undo = await api().delete(`/api/matches/${matchId}/balls/last`).set(auth(tokA));
  assert.equal(undo.status, 200);
  st = undo.body.innings[0].state;
  assert.equal(st.balls.length, 4);
  assert.equal(st.wickets, 1);
  const undo2 = await api().delete(`/api/matches/${matchId}/balls/last`).set(auth(tokA));
  st = undo2.body.innings[0].state;
  assert.equal(st.wickets, 0); // wicket undone
  assert.equal(st.striker, xiH[1]);
  const log = await api().get('/api/audit?action=score.undo').set(auth(tokSuper));
  assert.ok(log.body.total >= 2);
});

test('scoring: other users cannot score or undo; over completion forces a bowler change', async () => {
  const body = { striker: xiH[1], nonStriker: xiH[0], bowler: xiA[10], runs: 1 };
  assert.equal((await score(body, tokB)).status, 403); // even the opponent's owner cannot score
  assert.equal((await api().delete(`/api/matches/${matchId}/balls/last`).set(auth(tokB))).status, 403);
  let st;
  for (let i = 0; i < 5; i++) {
    const cur = (await state()).innings[0].state;
    const r = await score({ striker: cur.striker, nonStriker: cur.nonStriker, bowler: xiA[10], runs: 0 });
    assert.equal(r.status, 201);
    st = r.body.innings[0].state;
  }
  assert.equal(st.overs, '1.0');
  assert.equal(st.bowler, null);
  assert.equal((await score({ striker: st.striker, nonStriker: st.nonStriker, bowler: xiA[10], runs: 0 })).status, 400); // no consecutive overs
  assert.equal((await score({ striker: st.striker, nonStriker: st.nonStriker, bowler: xiA[9], runs: 6 })).status, 201);
});

test('innings: finish the first innings by overs, show target, then continue', async () => {
  let st = (await state()).innings[0].state;
  for (let i = 0; i < 5; i++) {
    const r = await score({ striker: st.striker, nonStriker: st.nonStriker, bowler: xiA[9], runs: 0 });
    st = r.body.innings[0].state;
  }
  assert.equal(st.completed, true);
  assert.equal(st.completedReason, 'overs');
  assert.equal((await score({ striker: st.striker || xiH[0], nonStriker: st.nonStriker || xiH[1], bowler: xiA[8], runs: 1 })).status, 400);
  const total = st.runs;
  const cont = await api().post(`/api/matches/${matchId}/continue`).set(auth(tokA));
  assert.equal(cont.status, 200);
  const inn2 = cont.body.innings[1];
  assert.equal(inn2.battingTeam, AW.id);
  assert.equal(inn2.target, total + 1);
  assert.equal(inn2.state.runsRequired, total + 1);
  assert.equal((await api().post(`/api/matches/${matchId}/continue`).set(auth(tokA))).status, 409);
});

test('result: chasing side wins by wickets; completed matches are locked for users', async () => {
  let st = (await state()).innings[1].state;
  const early = await api().post(`/api/matches/${matchId}/finish`).set(auth(tokA)).send({});
  assert.equal(early.status, 409); // innings still running, needs confirmation
  let guard = 0;
  while (!st.completed && guard++ < 60) {
    const first = st.legalBalls === 0 && !st.striker;
    const r = await score({ striker: first ? xiA[0] : st.striker, nonStriker: first ? xiA[1] : st.nonStriker, bowler: st.bowler || (st.eligibleBowlers[0] || { id: xiH[10] }).id, runs: 6 });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    st = r.body.innings[1].state;
  }
  assert.equal(st.completedReason, 'target');
  assert.equal((await api().post(`/api/matches/${matchId}/finish`).set(auth(tokB)).send({})).status, 403);
  const done = await api().post(`/api/matches/${matchId}/finish`).set(auth(tokA)).send({});
  assert.equal(done.status, 200);
  assert.equal(done.body.match.status, 'completed');
  assert.equal(done.body.match.result.winner, AW.id);
  assert.match(done.body.match.result.summary, /won by 10 wickets/);
  assert.ok(done.body.match.playerOfMatch.name);
  assert.ok(done.body.scorecard);
  // team record shows on the team page
  const rec = (await api().get(`/api/teams/${AW.id}`).set(auth(tokB))).body.record;
  assert.deepEqual(rec, { played: 1, won: 1, lost: 0, tied: 0 });
  assert.equal((await api().get(`/api/teams/${H.id}`).set(auth(tokA))).body.record.lost, 1);
  // the creator can no longer change a completed match; only the Super Admin can reopen it
  assert.equal((await api().put(`/api/matches/${matchId}`).set(auth(tokA)).send({ name: 'Edited' })).status, 403);
  assert.equal((await api().delete(`/api/matches/${matchId}`).set(auth(tokA))).status, 403);
  assert.equal((await api().post(`/api/matches/${matchId}/reopen`).set(auth(tokA)).send({ reason: 'I made a mistake' })).status, 403);
  assert.equal((await api().post(`/api/matches/${matchId}/reopen`).set(auth(tokSuper)).send({})).status, 400);
  const reopen = await api().post(`/api/matches/${matchId}/reopen`).set(auth(tokSuper)).send({ reason: 'Wrong batter credited' });
  assert.equal(reopen.status, 200);
  assert.equal(reopen.body.match.status, 'live');
  const log = await api().get('/api/audit?action=match.reopen').set(auth(tokSuper));
  assert.equal(log.body.items[0].details.reason, 'Wrong batter credited');
});

// ---------------- view-only logins (one per team) ----------------
let tokV; // viewer of Kanchipuram

test('viewer: only the team owner (or Super Admin) can create the view login', async () => {
  assert.equal((await api().put(`/api/teams/${H.id}/viewer`).set(auth(tokB)).send({ username: 'kanchi_view', password: '1234' })).status, 403);
  assert.equal((await api().get(`/api/teams/${H.id}/viewer`).set(auth(tokB))).status, 403);
  assert.equal((await api().put(`/api/teams/${H.id}/viewer`).set(auth(tokA)).send({ username: 'kanchi_view' })).status, 400); // password missing
  assert.equal((await api().put(`/api/teams/${H.id}/viewer`).set(auth(tokA)).send({ username: 'kanchi_view', password: '12' })).status, 400); // too short
  assert.equal((await api().put(`/api/teams/${H.id}/viewer`).set(auth(tokA)).send({ username: 'rahul_k', password: '1234' })).status, 409); // username taken
  const c = await api().put(`/api/teams/${H.id}/viewer`).set(auth(tokA)).send({ username: 'Kanchi_View', password: '1234' });
  assert.equal(c.status, 201);
  assert.equal(c.body.viewer.username, 'kanchi_view');
  assert.equal((await api().get(`/api/teams/${H.id}/viewer`).set(auth(tokA))).body.viewer.username, 'kanchi_view');
  const login = await api().post('/api/auth/login').send({ identifier: 'kanchi_view', password: '1234' });
  assert.equal(login.status, 200);
  assert.equal(login.body.user.role, 'viewer');
  tokV = login.body.token;
});

test('viewer: can look at their own team and its matches, nothing else', async () => {
  const teams = await api().get('/api/teams').set(auth(tokV));
  assert.equal(teams.body.total, 1);
  assert.equal(teams.body.items[0].id, H.id);
  assert.equal(teams.body.canCreate, false);
  assert.equal(teams.body.items[0].canManage, false);
  assert.equal((await api().get(`/api/teams/${H.id}`).set(auth(tokV))).status, 200);
  assert.equal((await api().get(`/api/teams/${AW.id}`).set(auth(tokV))).status, 403); // another team
  const matches = await api().get('/api/matches').set(auth(tokV));
  assert.equal(matches.body.total, 1);
  assert.equal((await api().get(`/api/matches/${matchId}`).set(auth(tokV))).status, 200);
  assert.equal((await api().get(`/api/matches/${matchId}`).set(auth(tokV))).body.canManage, false);
  // a match between two other teams is hidden
  const twelve = (await api().get('/api/teams?search=Squad Twelve').set(auth(tokB))).body.items[0];
  const other = await api().post('/api/matches').set(auth(tokB)).send({ homeTeam: twelve.id, awayTeam: AW.id, format: 'Custom', overs: 1, tossWinner: twelve.id, tossDecision: 'bat' });
  assert.equal(other.status, 201);
  assert.equal((await api().get(`/api/matches/${other.body.match.id}`).set(auth(tokV))).status, 403);
  assert.equal((await api().get('/api/matches').set(auth(tokV))).body.total, 1);
  await api().delete(`/api/matches/${other.body.match.id}`).set(auth(tokB));
  // stats are limited to their team
  const stats = await api().get('/api/stats').set(auth(tokV));
  assert.equal(stats.body.totals.teams, 1);
  assert.equal(stats.body.totals.matches, 1);
  assert.equal(stats.body.can.createTeam, false);
});

test('viewer: cannot create or change anything', async () => {
  assert.equal((await api().post('/api/teams').set(auth(tokV)).send(teamBody('Viewer Team'))).status, 403);
  assert.equal((await api().put(`/api/teams/${H.id}`).set(auth(tokV)).send(teamBody('Kanchipuram'))).status, 403);
  assert.equal((await api().delete(`/api/teams/${H.id}`).set(auth(tokV))).status, 403);
  assert.equal((await api().post(`/api/teams/${H.id}/players`).set(auth(tokV)).send({ name: 'Sneaky', role: 'Batsman' })).status, 403);
  assert.equal((await api().put(`/api/teams/${H.id}/viewer`).set(auth(tokV)).send({ password: 'hacked' })).status, 403);
  assert.equal((await api().post('/api/matches').set(auth(tokV)).send({ homeTeam: H.id, awayTeam: AW.id, format: 'T20', tossWinner: H.id, tossDecision: 'bat' })).status, 403);
  assert.equal((await api().post(`/api/matches/${matchId}/balls`).set(auth(tokV)).send({ striker: 'a', nonStriker: 'b', bowler: 'c', runs: 1 })).status, 403);
  assert.equal((await api().delete(`/api/matches/${matchId}/balls/last`).set(auth(tokV))).status, 403);
  assert.equal((await api().get('/api/users').set(auth(tokV))).status, 403);
  assert.equal((await api().get('/api/audit').set(auth(tokV))).status, 403);
});

test('viewer: owner can reset the password, switch the login off, and remove it', async () => {
  const reset = await api().put(`/api/teams/${H.id}/viewer`).set(auth(tokA)).send({ password: 'newpass' });
  assert.equal(reset.status, 200);
  assert.equal((await api().post('/api/auth/login').send({ identifier: 'kanchi_view', password: '1234' })).status, 401);
  assert.equal((await api().post('/api/auth/login').send({ identifier: 'kanchi_view', password: 'newpass' })).status, 200);
  await api().put(`/api/teams/${H.id}/viewer`).set(auth(tokA)).send({ active: false });
  assert.equal((await api().post('/api/auth/login').send({ identifier: 'kanchi_view', password: 'newpass' })).status, 403);
  await api().put(`/api/teams/${H.id}/viewer`).set(auth(tokA)).send({ active: true });
  // the Super Admin sees viewers (and every user's teams) on the Users page
  const users = await api().get('/api/users?search=kanchi_view').set(auth(tokSuper));
  assert.equal(users.body.items[0].role, 'viewer');
  assert.equal(users.body.items[0].viewTeamInfo.name, 'Kanchipuram');
  const owner = await api().get('/api/users?search=rahul_k').set(auth(tokSuper));
  assert.ok(owner.body.items[0].teams.some((t) => t.name === 'Kanchipuram'));
  assert.equal((await api().delete(`/api/teams/${H.id}/viewer`).set(auth(tokA))).status, 200);
  assert.equal((await api().post('/api/auth/login').send({ identifier: 'kanchi_view', password: 'newpass' })).status, 401);
});

test('dashboard: counts teams, players and matches; a user also gets their own progress', async () => {
  const mine = (await api().get('/api/stats').set(auth(tokA))).body.mine;
  assert.ok(mine.teams >= 2);
  assert.equal(mine.matches, 1);
  assert.equal((await api().get('/api/stats').set(auth(tokSuper))).body.mine, null);
  const s = await api().get('/api/stats').set(auth(tokB));
  assert.equal(s.status, 200);
  assert.ok(s.body.totals.teams >= 5);
  assert.ok(s.body.totals.players >= s.body.totals.teams * 11);
  assert.equal(s.body.totals.matches, 1);
  assert.equal(s.body.totals.live, 1);
});
