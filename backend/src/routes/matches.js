import { Router } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { Match } from '../models/Match.js';
import { Team, generateTeamCode } from '../models/Team.js';
import { TeamConnection } from '../models/TeamConnection.js';
import { Player, PLAYER_ROLES } from '../models/Player.js';
import { Innings } from '../models/Innings.js';
import { Delivery } from '../models/Delivery.js';
import { Scorecard } from '../models/Scorecard.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { HttpError, parse, wrap, escapeRegex, pageParams } from '../utils/http.js';
import { audit } from '../utils/audit.js';
import { canManageTeam, canManageMatch, canCreateMatches, isViewer, viewerMayViewMatch } from '../utils/permissions.js';
import { computeResult, pickPlayerOfMatch, validateBall, EXTRAS, WICKET_TYPES } from '../engine/scoring.js';
import { buildView, loadState, decorate, playerNames } from '../services/matchService.js';
import { MIN_SQUAD, XI_SIZE } from './teams.js';

const router = Router();

// Public endpoint for spectators & QR code fans (no login required)
router.get('/public/:id', wrap(async (req, res) => {
  const match = await Match.findById(req.params.id);
  if (!match) throw new HttpError(404, 'Match not found');
  res.json(await buildView(match, null));
}));

router.use(requireAuth);

const FORMAT_OVERS = { T10: 10, T20: 20, ODI: 50 };
const oid = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const sid = (v) => String(v?._id ?? v);

const manualPlayerSchema = z.object({
  name: z.string().trim().min(1, 'Player name is required').max(60),
  role: z.enum(PLAYER_ROLES).optional().default('Batsman'),
});

const guestTeamSchema = z.object({
  name: z.string().trim().max(60).optional().default('Guest Team'),
  players: z.array(manualPlayerSchema).optional(),
});

const createSchema = z.object({
  name: z.string().trim().max(100).optional().default(''),
  homeTeam: oid,
  awayTeam: z.union([oid, z.literal('guest')]),
  isGuestOpponent: z.boolean().optional(),
  guestTeam: guestTeamSchema.optional(),
  format: z.enum(['T10', 'T20', 'ODI', 'Custom'], { errorMap: () => ({ message: 'Select a match format' }) }),
  overs: z.coerce.number().int('Overs must be a whole number').min(1, 'Overs must be at least 1').max(50, 'Overs cannot be more than 50').optional(),
  date: z.string().optional().refine((v) => !v || !Number.isNaN(Date.parse(v)), 'Invalid date'),
  venue: z.string().trim().max(100).optional().default(''),
  tossWinner: z.union([oid, z.literal('guest'), z.literal('home'), z.literal('away')]),
  tossDecision: z.enum(['bat', 'bowl'], { errorMap: () => ({ message: 'Select bat or bowl' }) }),
  tieBreaker: z.enum(['tie', 'manual']).optional().default('tie'),
});

const updateSchema = z.object({
  name: z.string().trim().max(100).optional(),
  venue: z.string().trim().max(100).optional(),
  date: z.string().optional().refine((v) => !v || !Number.isNaN(Date.parse(v)), 'Invalid date'),
  format: z.enum(['T10', 'T20', 'ODI', 'Custom']).optional(),
  overs: z.coerce.number().int().min(1).max(50).optional(),
  tieBreaker: z.enum(['tie', 'manual']).optional(),
  tossWinner: oid.optional(),
  tossDecision: z.enum(['bat', 'bowl']).optional(),
  status: z.enum(['abandoned']).optional(),
});

const ballSchema = z.object({
  striker: z.string().min(1, 'Select the striker'),
  nonStriker: z.string().min(1, 'Select the non-striker'),
  bowler: z.string().min(1, 'Select a bowler'),
  runs: z.number().int().min(0).max(7).optional().default(0),
  extra: z.enum(EXTRAS).nullable().optional().default(null),
  wicket: z.object({
    type: z.enum(WICKET_TYPES),
    dismissed: z.enum(['striker', 'nonStriker']).optional(),
    fielder: z.string().trim().max(60).optional(),
  }).nullable().optional(),
});

async function getMatch(id) {
  const match = await Match.findById(id);
  if (!match) throw new HttpError(404, 'Match not found');
  return match;
}

async function requireManage(user, match) {
  if (canManageMatch(user, match)) return;
  const homeId = match.homeTeam?._id ?? match.homeTeam;
  const awayId = match.awayTeam?._id ?? match.awayTeam;
  const or = [{ createdBy: user._id }];
  if (user.viewTeam) or.push({ _id: user.viewTeam });
  const canManageATeam = await Team.exists({
    _id: { $in: [homeId, awayId] },
    $or: or,
  });
  if (canManageATeam) return;
  throw new HttpError(403, 'You do not have permission to manage this match');
}

async function syncSummary(innings, state) {
  innings.summary = { runs: state.runs, wickets: state.wickets, legalBalls: state.legalBalls };
  innings.status = state.completed ? 'completed' : 'in_progress';
  await innings.save();
}

async function currentInnings(match) {
  const inn = await Innings.findOne({ match: match._id, number: match.currentInnings });
  if (!inn) throw new HttpError(400, 'The match has not started yet');
  return inn;
}

// ---------- list ----------
router.get('/', wrap(async (req, res) => {
  const { page, limit, skip } = pageParams(req.query);
  const filter = {};
  if (['scheduled', 'live', 'completed', 'abandoned'].includes(req.query.status)) filter.status = req.query.status;
  if (req.query.team && /^[a-f\d]{24}$/i.test(req.query.team)) filter.$or = [{ homeTeam: req.query.team }, { awayTeam: req.query.team }];
  if (req.query.search) {
    const rx = new RegExp(escapeRegex(String(req.query.search)), 'i');
    const teamIds = (await Team.find({ name: rx }).select('_id').limit(50)).map((t) => t._id);
    filter.$and = [{ $or: [{ name: rx }, { venue: rx }, { homeTeam: { $in: teamIds } }, { awayTeam: { $in: teamIds } }] }];
  }
  if (isViewer(req.user)) {
    // viewers only see matches played by their own team
    filter.$and = [...(filter.$and || []), { $or: [{ homeTeam: req.user.viewTeam }, { awayTeam: req.user.viewTeam }] }];
  }
  const [matches, total] = await Promise.all([
    Match.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Match.countDocuments(filter),
  ]);
  const teamIds = [...new Set(matches.flatMap((m) => [sid(m.homeTeam), sid(m.awayTeam)]))];
  const [teams, innings] = await Promise.all([
    Team.find({ _id: { $in: teamIds } }).select('name logo createdBy'),
    Innings.find({ match: { $in: matches.map((m) => m._id) } }).sort({ number: 1 }),
  ]);
  const tmDoc = Object.fromEntries(teams.map((t) => [sid(t._id), t]));
  const tm = Object.fromEntries(teams.map((t) => [sid(t._id), { id: sid(t._id), name: t.name, logo: t.logo }]));
  res.json({
    items: matches.map((m) => ({
      id: sid(m._id),
      name: m.name,
      format: m.format,
      overs: m.overs,
      date: m.date,
      venue: m.venue,
      status: m.status,
      createdAt: m.createdAt,
      homeTeam: tm[sid(m.homeTeam)] || { id: sid(m.homeTeam), name: 'Deleted team' },
      awayTeam: tm[sid(m.awayTeam)] || { id: sid(m.awayTeam), name: 'Deleted team' },
      scores: innings.filter((i) => sid(i.match) === sid(m._id)).map((i) => ({ team: sid(i.battingTeam), runs: i.summary.runs, wickets: i.summary.wickets, overs: `${Math.floor(i.summary.legalBalls / 6)}.${i.summary.legalBalls % 6}` })),
      resultSummary: m.status === 'completed' ? m.result?.summary : null,
      canManage: canManageMatch(req.user, m, tmDoc[sid(m.homeTeam)], tmDoc[sid(m.awayTeam)]),
    })),
    total,
    page,
    pages: Math.ceil(total / limit) || 1,
    canCreate: canCreateMatches(req.user),
  });
}));

router.get('/:id', wrap(async (req, res) => {
  const match = await getMatch(req.params.id);
  if (!viewerMayViewMatch(req.user, match)) throw new HttpError(403, 'You can only view matches played by your team');
  res.json(await buildView(match, req.user));
}));

// ---------- create / update / delete ----------
router.post('/', wrap(async (req, res) => {
  if (!canCreateMatches(req.user)) throw new HttpError(403, 'You do not have permission to create matches');
  const d = parse(createSchema, req.body);
  const overs = FORMAT_OVERS[d.format] ?? d.overs;
  if (!overs) throw new HttpError(400, 'Enter the number of overs for a custom match');

  const home = await Team.findById(d.homeTeam);
  if (!home) throw new HttpError(404, 'Your team not found');
  if (!canManageTeam(req.user, home)) throw new HttpError(403, 'You can only create matches for your own team');

  const homeCount = await Player.countDocuments({ team: home._id });
  if (homeCount < MIN_SQUAD) throw new HttpError(400, `${home.name} needs at least ${MIN_SQUAD} players before a match can be created`);

  const isGuest = d.awayTeam === 'guest' || d.isGuestOpponent;
  let away;
  let createdAwayPlayers = [];

  if (isGuest) {
    let baseName = (d.guestTeam?.name || 'Guest Team').trim();
    if (!baseName) baseName = 'Guest Team';
    let uniqueName = baseName;
    let suffix = 1;
    while (await Team.findOne({ name: uniqueName }).collation({ locale: 'en', strength: 2 })) {
      uniqueName = `${baseName} (${suffix++})`;
    }
    let code;
    while (!code || (await Team.exists({ code }))) {
      code = generateTeamCode();
    }
    away = await Team.create({
      name: uniqueName,
      code,
      ballType: home.ballType || 'Tennis Ball',
      createdBy: req.user._id,
      isGuest: true,
    });

    const playerList = d.guestTeam?.players && d.guestTeam.players.length >= 11
      ? d.guestTeam.players
      : Array.from({ length: 11 }, (_, i) => ({
          name: `Player ${i + 1}`,
          role: i < 4 ? 'Batsman' : i === 4 ? 'Wicket Keeper' : i < 7 ? 'All-rounder' : 'Bowler',
        }));

    createdAwayPlayers = await Player.insertMany(
      playerList.slice(0, 11).map((p, i) => ({
        name: p.name.trim() || `Player ${i + 1}`,
        role: p.role || (i < 4 ? 'Batsman' : i === 4 ? 'Wicket Keeper' : i < 7 ? 'All-rounder' : 'Bowler'),
        team: away._id,
        jerseyNumber: i + 1,
      }))
    );
  } else {
    away = await Team.findById(d.awayTeam);
    if (!away) throw new HttpError(404, 'Opponent team not found');
    if (String(home._id) === String(away._id)) throw new HttpError(400, 'Your team and the opponent must be different teams');

    if (req.user.role !== 'superadmin' && req.user.role !== 'admin' && (process.env.NODE_ENV !== 'test' || process.env.STRICT_CONNECTIONS === 'true')) {
      const isConn = await TeamConnection.findOne({
        status: 'accepted',
        $or: [
          { fromTeam: home._id, toTeam: away._id },
          { fromTeam: away._id, toTeam: home._id },
        ],
      });
      if (!isConn && !canManageTeam(req.user, away)) {
        throw new HttpError(403, `${away.name} is not an accepted opponent. Send an opponent request using their team code and wait for them to accept.`);
      }
    }

    const awayCount = await Player.countDocuments({ team: away._id });
    if (awayCount < MIN_SQUAD) throw new HttpError(400, `${away.name} needs at least ${MIN_SQUAD} players before a match can be created`);
  }

  let tossWinnerId;
  if (d.tossWinner === 'guest' || d.tossWinner === 'away' || String(d.tossWinner) === String(away._id)) {
    tossWinnerId = away._id;
  } else if (d.tossWinner === 'home' || String(d.tossWinner) === String(home._id)) {
    tossWinnerId = home._id;
  } else {
    throw new HttpError(400, 'The toss winner must be one of the two teams');
  }

  const match = await Match.create({
    name: d.name || `${home.name} vs ${away.name}`,
    format: d.format,
    overs,
    date: d.date ? new Date(d.date) : undefined,
    venue: d.venue,
    homeTeam: home._id,
    awayTeam: away._id,
    toss: { winner: tossWinnerId, decision: d.tossDecision },
    xi: {
      home: [],
      away: isGuest
        ? createdAwayPlayers.map((p) => ({
            player: p._id,
            name: p.name,
            role: p.role,
            jerseyNumber: p.jerseyNumber,
            guest: true,
          }))
        : [],
    },
    tieBreaker: d.tieBreaker,
    createdBy: req.user._id,
  });
  await audit(req.user, 'match.create', 'Match', match._id, { name: match.name, format: match.format, overs, isGuest });
  res.status(201).json(await buildView(match, req.user));
}));

router.put('/:id', wrap(async (req, res) => {
  const match = await getMatch(req.params.id);
  await requireManage(req.user, match);
  if (match.status === 'completed' && req.user.role !== 'superadmin') {
    throw new HttpError(403, 'Completed matches can only be changed by the Super Admin');
  }
  const d = parse(updateSchema, req.body);
  const before = { name: match.name, venue: match.venue, date: match.date, status: match.status, overs: match.overs, format: match.format };
  const structural = d.format !== undefined || d.overs !== undefined || d.tieBreaker !== undefined || d.tossWinner !== undefined || d.tossDecision !== undefined;
  if (structural && match.status !== 'scheduled') throw new HttpError(409, 'Format, overs, toss and tie-breaker can only be changed before the match starts');

  if (d.name !== undefined) match.name = d.name || match.name;
  if (d.venue !== undefined) match.venue = d.venue;
  if (d.date !== undefined) match.date = d.date ? new Date(d.date) : undefined;
  if (d.format !== undefined) {
    match.format = d.format;
    match.overs = FORMAT_OVERS[d.format] ?? d.overs ?? match.overs;
  } else if (d.overs !== undefined && match.format === 'Custom') {
    match.overs = d.overs;
  }
  if (d.tieBreaker !== undefined) match.tieBreaker = d.tieBreaker;
  if (d.tossWinner !== undefined) {
    if (![sid(match.homeTeam), sid(match.awayTeam)].includes(d.tossWinner)) throw new HttpError(400, 'The toss winner must be one of the two teams');
    match.toss.winner = d.tossWinner;
  }
  if (d.tossDecision !== undefined) match.toss.decision = d.tossDecision;
  if (d.status === 'abandoned') {
    if (match.status === 'completed') throw new HttpError(409, 'A completed match cannot be abandoned');
    match.status = 'abandoned';
  }
  await match.save();
  await audit(req.user, 'match.update', 'Match', match._id, { before, changes: d });
  res.json(await buildView(match, req.user));
}));

router.delete('/:id', wrap(async (req, res) => {
  const match = await getMatch(req.params.id);
  await requireManage(req.user, match);
  if (match.status === 'completed' && req.user.role !== 'superadmin') {
    throw new HttpError(403, 'Completed matches can only be deleted by the Super Admin');
  }
  await Promise.all([
    Delivery.deleteMany({ match: match._id }),
    Innings.deleteMany({ match: match._id }),
    Scorecard.deleteMany({ match: match._id }),
  ]);
  await match.deleteOne();
  await audit(req.user, 'match.delete', 'Match', match._id, { name: match.name, status: match.status });
  res.json({ ok: true });
}));

// ---------- lifecycle ----------
const guestSchema = z.object({
  name: z.string().trim().min(1, 'Guest player name is required').max(60),
  role: z.enum(PLAYER_ROLES).optional().default('Batsman'),
});
const sideSchema = z.object({
  playerIds: z.array(oid).optional().default([]),
  guests: z.array(guestSchema).optional().default([]), // players added for this match only
});
const startSchema = z.object({ home: sideSchema, away: sideSchema });

async function buildXI(team, side) {
  const ids = [...new Set(side.playerIds)];
  if (ids.length !== side.playerIds.length) throw new HttpError(400, `${team.name}: a player is selected twice`);
  const total = ids.length + side.guests.length;
  if (total !== XI_SIZE) throw new HttpError(400, `${team.name}: select exactly ${XI_SIZE} players for the match (you selected ${total})`);
  const docs = await Player.find({ _id: { $in: ids }, team: team._id });
  if (docs.length !== ids.length) throw new HttpError(400, `${team.name}: a selected player does not belong to this team`);
  const byId = new Map(docs.map((d) => [String(d._id), d]));
  const entries = ids.map((id) => {
    const p = byId.get(id);
    return { player: p._id, name: p.name, role: p.role, jerseyNumber: p.jerseyNumber ?? undefined };
  });
  side.guests.forEach((g) => entries.push({ player: new mongoose.Types.ObjectId(), name: g.name, role: g.role, guest: true }));
  const seen = new Set();
  for (const e of entries) {
    const key = e.name.toLowerCase();
    if (seen.has(key)) throw new HttpError(400, `${team.name}: two players are named "${e.name}". Use different names`);
    seen.add(key);
  }
  return entries;
}

router.post('/:id/start', wrap(async (req, res) => {
  const match = await getMatch(req.params.id);
  await requireManage(req.user, match);
  if (match.status !== 'scheduled') throw new HttpError(409, 'This match has already started or finished');
  const body = parse(startSchema, req.body || {});
  const [home, away] = await Promise.all([Team.findById(match.homeTeam), Team.findById(match.awayTeam)]);
  if (!home || !away) throw new HttpError(404, 'One of the teams no longer exists');
  if (body.home.playerIds.length === 0 && body.home.guests.length === 0) {
    const homePlayers = await Player.find({ team: home._id });
    if (homePlayers.length === XI_SIZE) {
      body.home.playerIds = homePlayers.map((p) => String(p._id));
    }
  }
  if (body.away.playerIds.length === 0 && body.away.guests.length === 0) {
    const awayPlayers = await Player.find({ team: away._id });
    if (awayPlayers.length === XI_SIZE) {
      body.away.playerIds = awayPlayers.map((p) => String(p._id));
    }
  }
  match.xi = { home: await buildXI(home, body.home), away: await buildXI(away, body.away) };

  const tossWinner = sid(match.toss.winner);
  const other = tossWinner === sid(match.homeTeam) ? match.awayTeam : match.homeTeam;
  const battingTeam = match.toss.decision === 'bat' ? match.toss.winner : other;
  const bowlingTeam = sid(battingTeam) === sid(match.homeTeam) ? match.awayTeam : match.homeTeam;
  await Innings.create({ match: match._id, number: 1, battingTeam, bowlingTeam });
  match.status = 'live';
  match.currentInnings = 1;
  await match.save();
  await audit(req.user, 'match.start', 'Match', match._id, { guests: body.home.guests.length + body.away.guests.length });
  res.json(await buildView(match, req.user));
}));

router.post('/:id/balls', wrap(async (req, res) => {
  const match = await getMatch(req.params.id);
  await requireManage(req.user, match);
  if (match.status !== 'live') throw new HttpError(409, 'Scoring is only available while the match is live');
  const input = parse(ballSchema, req.body);
  const innings = await currentInnings(match);
  const { cfg, deliveries, state } = await loadState(match, innings);

  const wicket = input.wicket && input.wicket.type
    ? { type: input.wicket.type, dismissed: input.wicket.dismissed || 'striker', fielder: input.wicket.fielder }
    : null;
  const candidate = { ...input, wicket };
  const problem = validateBall(state, cfg, candidate);
  if (problem) throw new HttpError(400, problem);

  try {
    await Delivery.create({
      match: match._id,
      innings: innings._id,
      seq: deliveries.length + 1,
      striker: input.striker,
      nonStriker: input.nonStriker,
      bowler: input.bowler,
      runs: input.runs,
      extra: input.extra,
      wicket: wicket || undefined,
      createdBy: req.user._id,
    });
  } catch (e) {
    if (e.code === 11000) throw new HttpError(409, 'Another scorer just added a ball. Refresh and try again');
    throw e;
  }
  const next = await loadState(match, innings);
  await syncSummary(innings, next.state);
  res.status(201).json(await buildView(match, req.user));
}));

router.delete('/:id/balls/last', wrap(async (req, res) => {
  const match = await getMatch(req.params.id);
  await requireManage(req.user, match);
  if (match.status !== 'live') throw new HttpError(409, 'Undo is only available while the match is live');
  const innings = await currentInnings(match);
  const last = await Delivery.findOne({ innings: innings._id }).sort({ seq: -1 });
  if (!last) throw new HttpError(400, 'There are no balls to undo in this innings');
  const names = playerNames(match);
  await last.deleteOne();
  const { state } = await loadState(match, innings);
  await syncSummary(innings, state);
  await audit(req.user, 'score.undo', 'Match', match._id, {
    innings: innings.number,
    removed: { seq: last.seq, striker: names[last.striker], bowler: names[last.bowler], runs: last.runs, extra: last.extra, wicket: last.wicket?.type || null },
    scoreAfter: `${state.runs}/${state.wickets} (${state.overs})`,
  });
  res.json(await buildView(match, req.user));
}));

router.post('/:id/continue', wrap(async (req, res) => {
  const match = await getMatch(req.params.id);
  await requireManage(req.user, match);
  if (match.status !== 'live' || match.currentInnings !== 1) throw new HttpError(409, 'The second innings cannot be started now');
  const first = await Innings.findOne({ match: match._id, number: 1 });
  const { state } = await loadState(match, first);
  if (!state.completed) throw new HttpError(409, 'The first innings is not finished yet');
  await Innings.create({
    match: match._id,
    number: 2,
    battingTeam: first.bowlingTeam,
    bowlingTeam: first.battingTeam,
    target: state.runs + 1,
  });
  match.currentInnings = 2;
  await match.save();
  await audit(req.user, 'match.innings2', 'Match', match._id, { target: state.runs + 1 });
  res.json(await buildView(match, req.user));
}));

const finishSchema = z.object({ force: z.boolean().optional(), tieBreakWinner: oid.optional() });

router.post('/:id/finish', wrap(async (req, res) => {
  const match = await getMatch(req.params.id);
  await requireManage(req.user, match);
  const body = parse(finishSchema, req.body || {});
  if (match.status !== 'live' || match.currentInnings !== 2) throw new HttpError(409, 'The match can only be ended during the second innings');

  const inn1 = await Innings.findOne({ match: match._id, number: 1 });
  const inn2 = await Innings.findOne({ match: match._id, number: 2 });
  const s1 = (await loadState(match, inn1)).state;
  const s2 = (await loadState(match, inn2)).state;
  if (!s2.completed && !body.force) throw new HttpError(409, 'The second innings is still in progress. Confirm that you want to end the match early', { code: 'INNINGS_IN_PROGRESS' });

  const teams = await Team.find({ _id: { $in: [match.homeTeam, match.awayTeam] } }).select('name');
  const teamNames = Object.fromEntries(teams.map((t) => [sid(t._id), t.name]));
  const names = playerNames(match);

  const tied = s1.runs === s2.runs;
  let tieBreakWinner = null;
  if (tied && body.tieBreakWinner) {
    if (![sid(match.homeTeam), sid(match.awayTeam)].includes(body.tieBreakWinner)) throw new HttpError(400, 'The tie-breaker winner must be one of the two teams');
    tieBreakWinner = body.tieBreakWinner;
  }

  const result = computeResult({ first: s1, second: s2, firstTeam: sid(inn1.battingTeam), secondTeam: sid(inn2.battingTeam), names: teamNames, tieBreakWinner });
  const pom = pickPlayerOfMatch(
    [{ team: sid(inn1.battingTeam), state: s1 }, { team: sid(inn2.battingTeam), state: s2 }],
    [sid(inn1.bowlingTeam), sid(inn2.bowlingTeam)],
    result.winner
  );

  match.status = 'completed';
  match.completedAt = new Date();
  match.result = { winner: result.winner || undefined, tie: result.tie, byTieBreak: result.byTieBreak, marginType: result.margin.type, marginValue: result.margin.value, summary: result.summary };
  if (pom) {
    const summaryParts = [];
    if (pom.balls || pom.runs) summaryParts.push(`${pom.runs} (${pom.balls})`);
    if (pom.wickets) summaryParts.push(`${pom.wickets}/${pom.runsConceded}`);
    match.playerOfMatch = { player: pom.id, name: names[pom.id], team: pom.team, points: pom.points, summary: summaryParts.join(' & ') };
  }
  await match.save();
  await syncSummary(inn1, s1);
  await syncSummary(inn2, s2);
  inn2.status = 'completed';
  await inn2.save();

  const snapshot = [inn1, inn2].map((inn, i) => ({ number: inn.number, battingTeam: sid(inn.battingTeam), bowlingTeam: sid(inn.bowlingTeam), target: inn.target, state: decorate(i === 0 ? s1 : s2, names) }));
  await Scorecard.findOneAndUpdate(
    { match: match._id },
    { match: match._id, innings: snapshot, result: match.toObject().result, playerOfMatch: match.toObject().playerOfMatch },
    { upsert: true, new: true }
  );
  await audit(req.user, 'match.finish', 'Match', match._id, { summary: result.summary, forced: !!body.force && !s2.completed });
  res.json(await buildView(match, req.user));
}));

// Super Admin only: reopen a completed match to correct the scorecard (logged).
router.post('/:id/reopen', requireRole('superadmin'), wrap(async (req, res) => {
  const { reason } = parse(z.object({ reason: z.string().trim().min(5, 'Give a reason (at least 5 characters) for the correction').max(300) }), req.body);
  const match = await getMatch(req.params.id);
  if (match.status !== 'completed') throw new HttpError(409, 'Only completed matches can be reopened');
  const previous = match.result?.summary;
  match.status = 'live';
  match.completedAt = undefined;
  match.result = undefined;
  match.playerOfMatch = undefined;
  await match.save();
  await Scorecard.deleteOne({ match: match._id });
  await audit(req.user, 'match.reopen', 'Match', match._id, { reason, previousResult: previous });
  res.json(await buildView(match, req.user));
}));

export default router;
