import { Router } from 'express';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { z } from 'zod';
import { Team, BALL_TYPES, generateTeamCode } from '../models/Team.js';
import { TeamConnection } from '../models/TeamConnection.js';
import { Player, PLAYER_ROLES } from '../models/Player.js';
import { Match } from '../models/Match.js';
import { Delivery } from '../models/Delivery.js';
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

// Ensure a team always has a unique 6-character team code
async function ensureTeamCode(teamDoc) {
  if (!teamDoc) return null;
  if (!teamDoc.code) {
    let code;
    while (!code || (await Team.exists({ code }))) {
      code = generateTeamCode();
    }
    teamDoc.code = code;
    await Team.updateOne({ _id: teamDoc._id }, { $set: { code } });
  }
  return teamDoc.code;
}

const teamOut = (t, extra = {}, user = null) => {
  const isView = isViewer(user);
  const canSeeCode = !isView && (
    !user ||
    user.role === 'superadmin' ||
    user.role === 'admin' ||
    extra.canManage ||
    extra.isOwn ||
    canManageTeam(user, t)
  );

  return {
    id: String(t._id),
    name: t.name,
    code: canSeeCode ? t.code : undefined,
    logo: t.logo,
    location: t.location,
    description: t.description,
    ballType: t.ballType,
    createdAt: t.createdAt,
    createdBy: t.createdBy ? String(t.createdBy) : undefined,
    ...extra,
  };
};
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
  const filter = { isGuest: { $ne: true } };
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
  const ownedCount = (req.user.role === 'superadmin' || req.user.role === 'admin') ? 0 : await Team.countDocuments({ createdBy: req.user._id, isGuest: { $ne: true } });

  // Resolve user's own team (myTeamDoc)
  let myTeamDoc = null;
  if (!isViewer(req.user)) {
    myTeamDoc = await Team.findOne({ createdBy: req.user._id, isGuest: { $ne: true } }).select('_id name code logo location ballType');
    if (!myTeamDoc && req.user.viewTeam) {
      myTeamDoc = await Team.findOne({ _id: req.user.viewTeam, isGuest: { $ne: true } }).select('_id name code logo location ballType');
    }
    if (!myTeamDoc && (req.user.role === 'superadmin' || req.user.role === 'admin')) {
      myTeamDoc = await Team.findOne({ isGuest: { $ne: true } }).select('_id name code logo location ballType');
    }
    if (myTeamDoc) {
      await ensureTeamCode(myTeamDoc);
    }
  }

  // Ensure all listed teams have a code
  for (const t of teams) {
    if (!t.code) {
      await ensureTeamCode(t);
    }
  }

  const connectedTeamIds = new Set();
  let pendingIncomingCount = 0;
  if (myTeamDoc) {
    const [conns, pendingCount] = await Promise.all([
      TeamConnection.find({
        $or: [{ fromTeam: myTeamDoc._id }, { toTeam: myTeamDoc._id }],
        status: 'accepted',
      }).select('fromTeam toTeam'),
      TeamConnection.countDocuments({ toTeam: myTeamDoc._id, status: 'pending' }),
    ]);
    for (const c of conns) {
      const oppId = String(c.fromTeam) === String(myTeamDoc._id) ? String(c.toTeam) : String(c.fromTeam);
      connectedTeamIds.add(oppId);
    }
    pendingIncomingCount = pendingCount;
  }

  res.json({
    items: teams.map((t) => teamOut(t, {
      playerCount: countMap[String(t._id)] || 0,
      canManage: canManageTeam(req.user, t),
      isOwn: String(t.createdBy) === String(req.user._id),
      isConnectedOpponent: connectedTeamIds.has(String(t._id)),
    }, req.user)),
    total,
    page,
    pages: Math.ceil(total / limit) || 1,
    canCreate: canCreateTeams(req.user, ownedCount),
    myTeam: myTeamDoc && !isViewer(req.user) ? {
      id: String(myTeamDoc._id),
      name: myTeamDoc.name,
      code: myTeamDoc.code,
      logo: myTeamDoc.logo,
      location: myTeamDoc.location,
      ballType: myTeamDoc.ballType,
    } : null,
    pendingIncomingCount,
  });
}));

router.get('/:id', wrap(async (req, res) => {
  const team = await Team.findById(req.params.id);
  if (!team) throw new HttpError(404, 'Team not found');
  if (!viewerMayViewTeam(req.user, team)) throw new HttpError(403, 'You can only view your own team');
  await ensureTeamCode(team);
  const players = await Player.find({ team: team._id }).sort({ createdAt: 1, _id: 1 });
  const done = await Match.find({ status: 'completed', $or: [{ homeTeam: team._id }, { awayTeam: team._id }] }).select('result');
  const won = done.filter((m) => m.result?.winner && String(m.result.winner) === String(team._id)).length;
  const tied = done.filter((m) => !m.result?.winner).length;
  const record = { played: done.length, won, lost: done.length - won - tied, tied };
  res.json({
    team: teamOut(team, { canManage: canManageTeam(req.user, team) }, req.user),
    players: players.map(playerOut),
    record,
  });
}));

router.post('/', wrap(async (req, res) => {
  if (!canCreateTeams(req.user)) throw new HttpError(403, 'You do not have permission to create teams');
  if (req.user.role !== 'superadmin' && req.user.role !== 'admin') {
    const owned = await Team.countDocuments({ createdBy: req.user._id, isGuest: { $ne: true } });
    if (owned >= 1) throw new HttpError(403, 'Team Admin can create only 1 team. You can edit your existing team.');
  }
  const data = parse(teamSchema, req.body);
  await assertNameFree(data.name);
  let code;
  while (!code || (await Team.exists({ code }))) {
    code = generateTeamCode();
  }
  let team;
  try {
    team = await Team.create({ name: data.name, code, logo: data.logo || '', location: data.location, description: data.description, ballType: data.ballType, createdBy: req.user._id });
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

// ---- view-only login & admin login for this team (owner / Super Admin manage it) ----
const viewerSchema = z.object({
  username: signupFields.username.optional(),
  password: z.string().min(4, 'Password must be at least 4 characters').max(100).optional(),
  phone: z.string().trim().optional(),
  name: z.string().trim().optional(),
  active: z.boolean().optional(),
});

const adminLoginSchema = z.object({
  name: signupFields.name.optional(),
  username: signupFields.username.optional(),
  phone: signupFields.phone.optional(),
  password: z.string().min(4, 'Password must be at least 4 characters').max(100).optional(),
});

async function ownedTeam(req) {
  const team = await Team.findById(req.params.id);
  if (!team) throw new HttpError(404, 'Team not found');
  if (!canManageTeam(req.user, team)) throw new HttpError(403, 'Only the team owner or admin can manage team credentials');
  return team;
}
const viewerOut = (v) => (v ? { id: String(v._id), name: v.name, username: v.username, phone: v.phone || '', active: v.active, createdAt: v.createdAt } : null);

router.get('/:id/viewer', wrap(async (req, res) => {
  const team = await ownedTeam(req);
  const viewer = await User.findOne({ viewTeam: team._id, role: 'viewer' });
  const teamAdmin = team.createdBy ? await User.findById(team.createdBy).select('name username phone role active lastActiveAt') : null;
  res.json({
    viewer: viewerOut(viewer),
    teamAdmin: teamAdmin ? { id: String(teamAdmin._id), name: teamAdmin.name, username: teamAdmin.username, phone: teamAdmin.phone || '', active: teamAdmin.active, lastActiveAt: teamAdmin.lastActiveAt } : null,
  });
}));

// Create the view login, or change its username / password / phone / switch it off.
router.put('/:id/viewer', wrap(async (req, res) => {
  const team = await ownedTeam(req);
  const data = parse(viewerSchema, req.body);
  let viewer = await User.findOne({ viewTeam: team._id, role: 'viewer' });
  if (!viewer) {
    if (!data.username || !data.password) throw new HttpError(400, 'Enter a username and a password for the view login');
    await assertUnique({ username: data.username, ...(data.phone ? { phone: data.phone } : {}) });
    viewer = await User.create({
      name: data.name || `${team.name} Viewer`,
      username: data.username,
      phone: data.phone || undefined,
      passwordHash: await bcrypt.hash(data.password, 10),
      role: 'viewer',
      viewTeam: team._id,
    });
    await audit(req.user, 'team.viewer.create', 'Team', team._id, { username: viewer.username });
    return res.status(201).json({ viewer: viewerOut(viewer) });
  }
  if (data.username && data.username !== viewer.username) {
    await assertUnique({ username: data.username }, viewer._id);
    viewer.username = data.username;
  }
  if (data.phone !== undefined) {
    if (data.phone) {
      await assertUnique({ phone: data.phone }, viewer._id);
      viewer.phone = data.phone;
    } else {
      viewer.phone = undefined;
    }
  }
  if (data.name) viewer.name = data.name;
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

// Update team admin credentials (username, phone, password)
router.put('/:id/admin-login', wrap(async (req, res) => {
  const team = await ownedTeam(req);
  if (!team.createdBy) throw new HttpError(404, 'No Team Admin is assigned to this team');
  const canEdit = req.user.role === 'superadmin' || req.user.role === 'admin' || String(req.user._id) === String(team.createdBy);
  if (!canEdit) throw new HttpError(403, 'You do not have permission to edit this login');

  const adminUser = await User.findById(team.createdBy);
  if (!adminUser) throw new HttpError(404, 'Team Admin account not found');

  const data = parse(adminLoginSchema, req.body);
  if (data.username && data.username !== adminUser.username) {
    await assertUnique({ username: data.username }, adminUser._id);
    adminUser.username = data.username;
  }
  if (data.phone && data.phone !== adminUser.phone) {
    await assertUnique({ phone: data.phone }, adminUser._id);
    adminUser.phone = data.phone;
  }
  if (data.name) adminUser.name = data.name;
  if (data.password) adminUser.passwordHash = await bcrypt.hash(data.password, 10);
  await adminUser.save();

  await audit(req.user, 'team.admin.update', 'Team', team._id, { username: adminUser.username, passwordChanged: !!data.password });
  res.json({
    teamAdmin: {
      id: String(adminUser._id),
      name: adminUser.name,
      username: adminUser.username,
      phone: adminUser.phone || '',
      active: adminUser.active,
    },
  });
}));

// ---- Opponent team connections & requests ----
// Send opponent request using team code
router.post('/:id/connect', wrap(async (req, res) => {
  const team = await Team.findById(req.params.id);
  if (!team) throw new HttpError(404, 'Team not found');
  if (!canManageTeam(req.user, team)) throw new HttpError(403, 'Only team managers can send opponent requests');

  const { code } = parse(z.object({ code: z.string().trim().min(3).max(20) }), req.body);
  const target = await Team.findOne({ code: code.toUpperCase() });
  if (!target) throw new HttpError(404, 'Invalid team code. No team found with this code');
  if (String(target._id) === String(team._id)) throw new HttpError(400, 'You cannot send an opponent request to your own team');

  const existing = await TeamConnection.findOne({
    $or: [
      { fromTeam: team._id, toTeam: target._id },
      { fromTeam: target._id, toTeam: team._id },
    ],
  });

  if (existing) {
    if (existing.status === 'accepted') {
      throw new HttpError(400, `Already connected with ${target.name}`);
    }
    if (String(existing.fromTeam) === String(team._id) && existing.status === 'pending') {
      throw new HttpError(400, `Request already sent to ${target.name}. Waiting for them to accept`);
    }
    if (String(existing.toTeam) === String(team._id) && existing.status === 'pending') {
      existing.status = 'accepted';
      await existing.save();
      await audit(req.user, 'team.connection.accept', 'TeamConnection', existing._id, { from: target.name, to: team.name });
      return res.json({ ok: true, status: 'accepted', message: `Connected with ${target.name}!` });
    }
    existing.fromTeam = team._id;
    existing.toTeam = target._id;
    existing.fromUser = req.user._id;
    existing.status = 'pending';
    await existing.save();
    await audit(req.user, 'team.connection.request', 'TeamConnection', existing._id, { from: team.name, to: target.name });
    return res.status(201).json({ ok: true, status: 'pending', message: `Opponent request sent to ${target.name}` });
  }

  const conn = await TeamConnection.create({
    fromTeam: team._id,
    toTeam: target._id,
    fromUser: req.user._id,
    status: 'pending',
  });
  await audit(req.user, 'team.connection.request', 'TeamConnection', conn._id, { from: team.name, to: target.name });
  res.status(201).json({ ok: true, status: 'pending', message: `Opponent request sent to ${target.name}` });
}));

// Get connections (accepted opponent teams, incoming requests, outgoing requests)
router.get('/:id/connections', wrap(async (req, res) => {
  const team = await Team.findById(req.params.id);
  if (!team) throw new HttpError(404, 'Team not found');

  const allConns = await TeamConnection.find({
    $or: [{ fromTeam: team._id }, { toTeam: team._id }],
  }).populate('fromTeam toTeam').sort({ updatedAt: -1 });

  const connected = [];
  const incoming = [];
  const outgoing = [];

  for (const c of allConns) {
    if (c.status === 'accepted') {
      const opp = String(c.fromTeam?._id) === String(team._id) ? c.toTeam : c.fromTeam;
      if (opp) {
        connected.push({
          connectionId: String(c._id),
          team: teamOut(opp),
          connectedAt: c.updatedAt,
        });
      }
    } else if (c.status === 'pending') {
      if (String(c.toTeam?._id) === String(team._id)) {
        if (c.fromTeam) {
          incoming.push({
            connectionId: String(c._id),
            fromTeam: teamOut(c.fromTeam),
            createdAt: c.createdAt,
          });
        }
      } else {
        if (c.toTeam) {
          outgoing.push({
            connectionId: String(c._id),
            toTeam: teamOut(c.toTeam),
            createdAt: c.createdAt,
          });
        }
      }
    }
  }

  const oppIds = connected.map((ct) => ct.team.id);
  const counts = await Player.aggregate([
    { $match: { team: { $in: oppIds.map((id) => new mongoose.Types.ObjectId(id)) } } },
    { $group: { _id: '$team', n: { $sum: 1 } } },
  ]);
  const countMap = Object.fromEntries(counts.map((x) => [String(x._id), x.n]));
  connected.forEach((ct) => {
    ct.team.playerCount = countMap[ct.team.id] || 0;
  });

  res.json({
    connected,
    incoming,
    outgoing,
    canManage: canManageTeam(req.user, team),
  });
}));

// Accept or reject connection request
router.put('/:id/connections/:connId', wrap(async (req, res) => {
  const team = await Team.findById(req.params.id);
  if (!team) throw new HttpError(404, 'Team not found');
  if (!canManageTeam(req.user, team)) throw new HttpError(403, 'Permission denied');

  const { status } = parse(z.object({ status: z.enum(['accepted', 'rejected']) }), req.body);
  const conn = await TeamConnection.findById(req.params.connId).populate('fromTeam toTeam');
  if (!conn) throw new HttpError(404, 'Request not found');
  if (String(conn.toTeam._id) !== String(team._id) && req.user.role !== 'superadmin' && req.user.role !== 'admin') {
    throw new HttpError(403, 'Only the receiving team can accept or reject this request');
  }

  conn.status = status;
  await conn.save();
  await audit(req.user, `team.connection.${status}`, 'TeamConnection', conn._id, { from: conn.fromTeam.name, to: conn.toTeam.name });
  res.json({ ok: true, status });
}));

// Remove connection or cancel request
router.delete('/:id/connections/:connId', wrap(async (req, res) => {
  const team = await Team.findById(req.params.id);
  if (!team) throw new HttpError(404, 'Team not found');
  if (!canManageTeam(req.user, team)) throw new HttpError(403, 'Permission denied');

  const conn = await TeamConnection.findById(req.params.connId);
  if (!conn) throw new HttpError(404, 'Connection not found');
  if (String(conn.fromTeam) !== String(team._id) && String(conn.toTeam) !== String(team._id) && req.user.role !== 'superadmin' && req.user.role !== 'admin') {
    throw new HttpError(403, 'Permission denied');
  }

  await conn.deleteOne();
  await audit(req.user, 'team.connection.delete', 'TeamConnection', conn._id);
  res.json({ ok: true });
}));

// ---- player career stats (aggregated from match deliveries) ----
router.get('/:id/player-stats', wrap(async (req, res) => {
  const team = await Team.findById(req.params.id);
  if (!team) throw new HttpError(404, 'Team not found');
  if (!viewerMayViewTeam(req.user, team)) throw new HttpError(403, 'You can only view your own team');

  const players = await Player.find({ team: team._id }).sort({ createdAt: 1, _id: 1 });
  const teamId = String(team._id);

  // Find all live/completed matches where this team played
  const matches = await Match.find({
    status: { $in: ['live', 'completed'] },
    $or: [{ homeTeam: team._id }, { awayTeam: team._id }],
  }).lean();

  // Initialize stats per player
  const stats = {};
  for (const p of players) {
    const pid = String(p._id);
    stats[pid] = {
      id: pid, name: p.name, photo: p.photo, role: p.role, jerseyNumber: p.jerseyNumber,
      matches: 0,
      innings: 0, runs: 0, ballsFaced: 0, fours: 0, sixes: 0, notOuts: 0, highestScore: 0,
      bowlingInnings: 0, legalBallsBowled: 0, runsConceded: 0, wickets: 0,
      catches: 0, runOuts: 0, stumpings: 0,
    };
  }

  // Count matches per player from XI snapshots
  for (const m of matches) {
    const side = String(m.homeTeam) === teamId ? 'home' : 'away';
    for (const x of (m.xi?.[side] || [])) {
      const pid = String(x.player);
      if (stats[pid]) stats[pid].matches++;
    }
  }

  if (matches.length === 0) {
    return res.json({ stats: Object.values(stats) });
  }

  // Get all deliveries for these matches
  const deliveries = await Delivery.find({ match: { $in: matches.map((m) => m._id) } }).lean();

  // Track per-innings batting to calculate highest score & innings count
  const batInns = {}; // key: `${inningsId}_${playerId}`
  const bowlInns = {}; // key: `${inningsId}_${playerId}`

  for (const d of deliveries) {
    const stk = d.striker;
    const bwl = d.bowler;

    // --- Batting (only for players of this team) ---
    if (stats[stk]) {
      const bk = `${d.innings}_${stk}`;
      if (!batInns[bk]) batInns[bk] = { runs: 0, balls: 0, fours: 0, sixes: 0, out: false };
      const bi = batInns[bk];
      // Batter faces the ball unless it's a wide
      if (d.extra !== 'wide') bi.balls++;
      // Runs credited to batter: only when no bye/legbye extra
      if (!d.extra || d.extra === 'noball') {
        bi.runs += d.runs;
        if (d.runs === 4) bi.fours++;
        if (d.runs === 6) bi.sixes++;
      }
      // Striker dismissed
      if (d.wicket?.type && d.wicket.dismissed === 'striker') bi.out = true;
    }

    // Non-striker dismissed (run out at non-striker end)
    if (d.wicket?.type && d.wicket.dismissed === 'nonStriker' && stats[d.nonStriker]) {
      const bk = `${d.innings}_${d.nonStriker}`;
      if (!batInns[bk]) batInns[bk] = { runs: 0, balls: 0, fours: 0, sixes: 0, out: false };
      batInns[bk].out = true;
    }

    // --- Bowling (only for players of this team) ---
    if (stats[bwl]) {
      const ok = `${d.innings}_${bwl}`;
      if (!bowlInns[ok]) bowlInns[ok] = { legalBalls: 0, runs: 0, wickets: 0 };
      const bo = bowlInns[ok];
      if (d.extra !== 'wide' && d.extra !== 'noball') bo.legalBalls++;
      // Runs conceded: everything except byes/legbyes
      if (!d.extra || d.extra === 'wide' || d.extra === 'noball') {
        bo.runs += d.runs;
        if (d.extra === 'wide' || d.extra === 'noball') bo.runs += 1; // the 1-run penalty
      }
      if (d.wicket?.type && d.wicket.type !== 'runout') bo.wickets++;
    }

    // --- Fielding (catches, stumpings, run outs by name match) ---
    if (d.wicket?.type && d.wicket.fielder) {
      const fn = d.wicket.fielder.toLowerCase().trim();
      for (const p of players) {
        if (p.name.toLowerCase().trim() === fn) {
          const pid = String(p._id);
          if (d.wicket.type === 'caught') stats[pid].catches++;
          else if (d.wicket.type === 'runout') stats[pid].runOuts++;
          else if (d.wicket.type === 'stumped') stats[pid].stumpings++;
          break;
        }
      }
    }
  }

  // Aggregate per-innings batting data into career stats
  for (const [key, bi] of Object.entries(batInns)) {
    const pid = key.split('_')[1];
    if (!stats[pid]) continue;
    stats[pid].innings++;
    stats[pid].runs += bi.runs;
    stats[pid].ballsFaced += bi.balls;
    stats[pid].fours += bi.fours;
    stats[pid].sixes += bi.sixes;
    if (!bi.out) stats[pid].notOuts++;
    if (bi.runs > stats[pid].highestScore) stats[pid].highestScore = bi.runs;
  }

  // Aggregate per-innings bowling data
  for (const [key, bo] of Object.entries(bowlInns)) {
    const pid = key.split('_')[1];
    if (!stats[pid]) continue;
    stats[pid].bowlingInnings++;
    stats[pid].legalBallsBowled += bo.legalBalls;
    stats[pid].runsConceded += bo.runs;
    stats[pid].wickets += bo.wickets;
  }

  // Compute averages and format
  const result = Object.values(stats).map((s) => {
    const dismissed = s.innings - s.notOuts;
    return {
      ...s,
      battingAvg: dismissed > 0 ? +(s.runs / dismissed).toFixed(2) : s.runs > 0 ? null : 0,
      strikeRate: s.ballsFaced > 0 ? +((s.runs / s.ballsFaced) * 100).toFixed(1) : 0,
      oversDisplay: `${Math.floor(s.legalBallsBowled / 6)}.${s.legalBallsBowled % 6}`,
      bowlingAvg: s.wickets > 0 ? +(s.runsConceded / s.wickets).toFixed(2) : null,
      economyRate: s.legalBallsBowled > 0 ? +((s.runsConceded / s.legalBallsBowled) * 6).toFixed(2) : null,
    };
  });

  res.json({ stats: result });
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
