import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { Team, BALL_TYPES } from '../models/Team.js';
import { Player, PLAYER_ROLES } from '../models/Player.js';
import { Match } from '../models/Match.js';
import { User } from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError, parse, wrap, escapeRegex, pageParams } from '../utils/http.js';
import { audit } from '../utils/audit.js';
import { config } from '../config.js';
import { canManageTeam, canCreateTeams, isViewer, viewerMayViewTeam } from '../utils/permissions.js';
import { signupFields, assertUnique } from './auth.js';

const router = Router();
router.use(requireAuth);

export const MIN_SQUAD = 11; // a team needs at least 11 players
export const MAX_SQUAD = 25;
export const XI_SIZE = 11; // players that play a match
const image = z.string().max(450000, 'Image is too large').refine((v) => v === '' || v.startsWith('data:image/'), 'Invalid image').optional();
const optInt = (min, max, label) =>
  z.preprocess((v) => (v === '' || v === undefined ? null : v), z.coerce.number({ invalid_type_error: `${label} must be a number` }).int(`${label} must be a whole number`).min(min, `${label} must be at least ${min}`).max(max, `${label} must be at most ${max}`).nullable());

const playerSchema = z.object({
  _id: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  name: z.string().trim().min(1, 'Player name is required').max(60),
  photo: image,
  jerseyNumber: optInt(0, 999, 'Jersey number'),
  age: optInt(5, 100, 'Age'),
  role: z.enum(PLAYER_ROLES, { errorMap: () => ({ message: 'Select a valid player role' }) }),
  battingStyle: z.string().trim().max(40).optional().default(''),
  bowlingStyle: z.string().trim().max(40).optional().default(''),
});

const teamSchema = z.object({
  name: z.string().trim().min(2, 'Team name must be at least 2 characters').max(60).transform((n) => n.replace(/\s+/g, ' ')),
  logo: image,
  location: z.string().trim().max(80).optional().default(''),
  description: z.string().trim().max(500).optional().default(''),
  ballType: z.enum(BALL_TYPES, { errorMap: () => ({ message: 'Select a valid ball type' }) }),
  players: z.array(playerSchema)
    .min(MIN_SQUAD, `A team needs at least ${MIN_SQUAD} players`)
    .max(MAX_SQUAD, `A team can have at most ${MAX_SQUAD} players`),
}).superRefine((t, ctx) => {
  const names = new Set();
  const jerseys = new Set();
  t.players.forEach((p, i) => {
    const key = p.name.toLowerCase();
    if (names.has(key)) ctx.addIssue({ code: 'custom', path: ['players', i, 'name'], message: `Duplicate player name: ${p.name}` });
    names.add(key);
    if (p.jerseyNumber !== null && p.jerseyNumber !== undefined) {
      if (jerseys.has(p.jerseyNumber)) ctx.addIssue({ code: 'custom', path: ['players', i, 'jerseyNumber'], message: `Duplicate jersey number: ${p.jerseyNumber}` });
      jerseys.add(p.jerseyNumber);
    }
  });
});

// Team names are unique across the whole app, ignoring upper/lower case and extra spaces.
async function assertNameFree(name, exceptId) {
  const q = { name };
  if (exceptId) q._id = { $ne: exceptId };
  const clash = await Team.findOne(q).collation({ locale: 'en', strength: 2 }).select('_id');
  if (clash) throw new HttpError(409, `A team named "${name}" already exists. Please choose a different team name`);
}

const teamOut = (t, extra = {}) => ({
  id: String(t._id),
  name: t.name,
  logo: t.logo,
  location: t.location,
  description: t.description,
  ballType: t.ballType,
  createdAt: t.createdAt,
  ...extra,
});
const playerOut = (p) => ({
  id: String(p._id),
  name: p.name,
  photo: p.photo,
  jerseyNumber: p.jerseyNumber,
  age: p.age,
  role: p.role,
  battingStyle: p.battingStyle,
  bowlingStyle: p.bowlingStyle,
});

router.get('/', wrap(async (req, res) => {
  const { page, limit, skip } = pageParams(req.query);
  const filter = {};
  if (isViewer(req.user)) filter._id = req.user.viewTeam; // viewers see only their own team
  if (req.query.search) {
    const rx = new RegExp(escapeRegex(String(req.query.search)), 'i');
    filter.$or = [{ name: rx }, { location: rx }];
  }
  if (req.query.ballType && BALL_TYPES.includes(req.query.ballType)) filter.ballType = req.query.ballType;
  const [teams, total] = await Promise.all([
    Team.find(filter).collation({ locale: 'en', strength: 2 }).sort({ name: 1 }).skip(skip).limit(limit),
    Team.countDocuments(filter),
  ]);
  const counts = await Player.aggregate([{ $match: { team: { $in: teams.map((t) => t._id) } } }, { $group: { _id: '$team', n: { $sum: 1 } } }]);
  const countMap = Object.fromEntries(counts.map((c) => [String(c._id), c.n]));
  res.json({
    items: teams.map((t) => teamOut(t, { playerCount: countMap[String(t._id)] || 0, canManage: canManageTeam(req.user, t) })),
    total,
    page,
    pages: Math.ceil(total / limit) || 1,
    canCreate: canCreateTeams(req.user),
  });
}));

router.get('/:id', wrap(async (req, res) => {
  const team = await Team.findById(req.params.id);
  if (!team) throw new HttpError(404, 'Team not found');
  if (!viewerMayViewTeam(req.user, team)) throw new HttpError(403, 'You can only view your own team');
  const players = await Player.find({ team: team._id }).sort({ createdAt: 1, _id: 1 });
  const done = await Match.find({ status: 'completed', $or: [{ homeTeam: team._id }, { awayTeam: team._id }] }).select('result');
  const won = done.filter((m) => m.result?.winner && String(m.result.winner) === String(team._id)).length;
  const tied = done.filter((m) => !m.result?.winner).length;
  const record = { played: done.length, won, lost: done.length - won - tied, tied };
  res.json({ team: teamOut(team, { canManage: canManageTeam(req.user, team) }), players: players.map(playerOut), record });
}));

router.post('/', wrap(async (req, res) => {
  if (!canCreateTeams(req.user)) throw new HttpError(403, 'You do not have permission to create teams');
  if (req.user.role !== 'superadmin') {
    const owned = await Team.countDocuments({ createdBy: req.user._id });
    if (owned >= config.maxTeamsPerUser) throw new HttpError(403, `You can create up to ${config.maxTeamsPerUser} teams`);
  }
  const data = parse(teamSchema, req.body);
  await assertNameFree(data.name);
  let team;
  try {
    team = await Team.create({ name: data.name, logo: data.logo || '', location: data.location, description: data.description, ballType: data.ballType, createdBy: req.user._id });
  } catch (e) {
    if (e.code === 11000) throw new HttpError(409, 'A team with this name already exists. Please choose a different team name');
    throw e;
  }
  try {
    await Player.insertMany(data.players.map(({ _id, ...p }) => ({ ...p, photo: p.photo || '', team: team._id })));
  } catch (e) {
    await Team.deleteOne({ _id: team._id });
    throw e;
  }
  await audit(req.user, 'team.create', 'Team', team._id, { name: team.name });
  const players = await Player.find({ team: team._id }).sort({ createdAt: 1, _id: 1 });
  res.status(201).json({ team: teamOut(team, { canManage: true }), players: players.map(playerOut) });
}));

router.put('/:id', wrap(async (req, res) => {
  const team = await Team.findById(req.params.id);
  if (!team) throw new HttpError(404, 'Team not found');
  if (!canManageTeam(req.user, team)) throw new HttpError(403, 'You can only edit your own teams');
  const data = parse(teamSchema, req.body);

  const existing = await Player.find({ team: team._id });
  const existingIds = new Set(existing.map((p) => String(p._id)));
  for (const p of data.players) {
    if (p._id && !existingIds.has(p._id)) throw new HttpError(400, 'A player does not belong to this team');
  }
  await assertNameFree(data.name, team._id);
  const before = { name: team.name, location: team.location, ballType: team.ballType };
  team.name = data.name;
  if (data.logo !== undefined) team.logo = data.logo;
  team.location = data.location;
  team.description = data.description;
  team.ballType = data.ballType;
  try {
    await team.save();
  } catch (e) {
    if (e.code === 11000) throw new HttpError(409, 'A team with this name already exists. Please choose a different team name');
    throw e;
  }

  const keepIds = new Set(data.players.filter((p) => p._id).map((p) => p._id));
  const toRemove = existing.filter((p) => !keepIds.has(String(p._id))).map((p) => p._id);
  if (toRemove.length) await Player.deleteMany({ _id: { $in: toRemove } });
  for (const p of data.players) {
    const { _id, ...fields } = p;
    if (_id) {
      const update = { ...fields };
      if (update.photo === undefined) delete update.photo; // keep the current photo when none was sent
      await Player.updateOne({ _id }, { $set: update });
    } else {
      await Player.create({ ...fields, photo: fields.photo || '', team: team._id });
    }
  }
  await audit(req.user, 'team.update', 'Team', team._id, { before, after: { name: team.name, location: team.location, ballType: team.ballType }, playersRemoved: toRemove.length });
  const players = await Player.find({ team: team._id }).sort({ createdAt: 1, _id: 1 });
  res.json({ team: teamOut(team, { canManage: true }), players: players.map(playerOut) });
}));

// Add one new player to a team you own (used from the team page and from the match "playing XI" screen).
router.post('/:id/players', wrap(async (req, res) => {
  const team = await Team.findById(req.params.id);
  if (!team) throw new HttpError(404, 'Team not found');
  if (!canManageTeam(req.user, team)) throw new HttpError(403, 'You can only add players to your own team');
  const data = parse(playerSchema.omit({ _id: true }), req.body);
  const existing = await Player.find({ team: team._id });
  if (existing.length >= MAX_SQUAD) throw new HttpError(400, `A team can have at most ${MAX_SQUAD} players`);
  if (existing.some((p) => p.name.toLowerCase() === data.name.toLowerCase())) throw new HttpError(400, `Duplicate player name: ${data.name}`);
  if (data.jerseyNumber !== null && existing.some((p) => p.jerseyNumber === data.jerseyNumber)) throw new HttpError(400, `Duplicate jersey number: ${data.jerseyNumber}`);
  const player = await Player.create({ ...data, photo: data.photo || '', team: team._id });
  await audit(req.user, 'team.player.add', 'Team', team._id, { player: player.name });
  res.status(201).json({ player: playerOut(player), playerCount: existing.length + 1 });
}));

// ---- view-only login for this team (owner / Super Admin manage it) ----
const viewerSchema = z.object({
  username: signupFields.username.optional(),
  password: z.string().min(4, 'Password must be at least 4 characters').max(100).optional(),
  active: z.boolean().optional(),
});

async function ownedTeam(req) {
  const team = await Team.findById(req.params.id);
  if (!team) throw new HttpError(404, 'Team not found');
  if (!canManageTeam(req.user, team)) throw new HttpError(403, 'Only the team owner can manage the view login');
  return team;
}
const viewerOut = (v) => (v ? { username: v.username, active: v.active, createdAt: v.createdAt } : null);

router.get('/:id/viewer', wrap(async (req, res) => {
  const team = await ownedTeam(req);
  res.json({ viewer: viewerOut(await User.findOne({ viewTeam: team._id, role: 'viewer' })) });
}));

// Create the view login, or change its password / switch it off.
router.put('/:id/viewer', wrap(async (req, res) => {
  const team = await ownedTeam(req);
  const data = parse(viewerSchema, req.body);
  let viewer = await User.findOne({ viewTeam: team._id, role: 'viewer' });
  if (!viewer) {
    if (!data.username || !data.password) throw new HttpError(400, 'Enter a username and a password for the view login');
    await assertUnique({ username: data.username });
    viewer = await User.create({ name: `${team.name} viewer`, username: data.username, passwordHash: await bcrypt.hash(data.password, 10), role: 'viewer', viewTeam: team._id });
    await audit(req.user, 'team.viewer.create', 'Team', team._id, { username: viewer.username });
    return res.status(201).json({ viewer: viewerOut(viewer) });
  }
  if (data.username && data.username !== viewer.username) {
    await assertUnique({ username: data.username }, viewer._id);
    viewer.username = data.username;
  }
  if (data.password) viewer.passwordHash = await bcrypt.hash(data.password, 10);
  if (data.active !== undefined) viewer.active = data.active;
  await viewer.save();
  await audit(req.user, 'team.viewer.update', 'Team', team._id, { username: viewer.username, passwordChanged: !!data.password, active: viewer.active });
  res.json({ viewer: viewerOut(viewer) });
}));

router.delete('/:id/viewer', wrap(async (req, res) => {
  const team = await ownedTeam(req);
  const viewer = await User.findOne({ viewTeam: team._id, role: 'viewer' });
  if (viewer) {
    await viewer.deleteOne();
    await audit(req.user, 'team.viewer.delete', 'Team', team._id, { username: viewer.username });
  }
  res.json({ ok: true });
}));

router.delete('/:id', wrap(async (req, res) => {
  const team = await Team.findById(req.params.id);
  if (!team) throw new HttpError(404, 'Team not found');
  if (!canManageTeam(req.user, team)) throw new HttpError(403, 'You can only delete your own teams');
  if (await Match.exists({ $or: [{ homeTeam: team._id }, { awayTeam: team._id }] })) {
    throw new HttpError(409, 'This team has matches and cannot be deleted. Delete its matches first');
  }
  await Player.deleteMany({ team: team._id });
  await User.deleteMany({ viewTeam: team._id, role: 'viewer' });
  await team.deleteOne();
  await audit(req.user, 'team.delete', 'Team', team._id, { name: team.name });
  res.json({ ok: true });
}));

export default router;
