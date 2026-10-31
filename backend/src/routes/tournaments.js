import express from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Tournament } from '../models/Tournament.js';
import { Match } from '../models/Match.js';
import { Team } from '../models/Team.js';
import { User } from '../models/User.js';
import { Innings } from '../models/Innings.js';
import { Player } from '../models/Player.js';
import { requireAuth, optionalAuth, publicUser, signToken } from '../middleware/auth.js';
import { HttpError, wrap, parse, sid } from '../utils/http.js';
import { canManageMatch } from '../utils/permissions.js';

const router = express.Router();

const oid = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ID');

const createTournamentSchema = z.object({
  name: z.string().trim().min(3, 'Tournament name must have at least 3 characters').max(120),
  description: z.string().trim().max(500).optional().default(''),
  venue: z.string().trim().max(100).optional().default(''),
  grounds: z.array(z.string().trim().min(1)).optional().default(['Ground 1', 'Ground 2']),
  format: z.enum(['knockout', 'league', 'flexible']).optional().default('knockout'),
  maxTeams: z.coerce.number().int().min(2).max(64).optional().default(16),
  defaultOvers: z.coerce.number().int().min(1).max(50).optional().default(8),
  startDate: z.string().optional().refine((v) => !v || !Number.isNaN(Date.parse(v)), 'Invalid start date'),
  endDate: z.string().optional().refine((v) => !v || !Number.isNaN(Date.parse(v)), 'Invalid end date'),
  rules: z.string().trim().max(1000).optional().default(''),
});

const addTeamSchema = z.object({
  teamId: oid.optional(),
  teamCode: z.string().trim().optional(),
});

const awardByeSchema = z.object({
  teamId: oid,
  round: z.string().trim().optional().default('Round 1'),
  reason: z.string().trim().max(120).optional().default('Bye advancement to next round'),
});

const createMatchSchema = z.object({
  homeTeam: oid,
  awayTeam: oid,
  round: z.string().trim().optional().default('Round 1'),
  ground: z.string().trim().optional().default('Ground 1'),
  overs: z.coerce.number().int().min(1).max(50).optional(),
  date: z.string().optional().refine((v) => !v || !Number.isNaN(Date.parse(v)), 'Invalid date'),
  venue: z.string().trim().max(100).optional().default(''),
});

const addScorerSchema = z.object({
  name: z.string().trim().min(2, 'Scorer name is required'),
  pin: z.string().trim().min(4, 'PIN must be 4 digits').max(6),
  ground: z.string().trim().optional().default('Ground 1'),
});

const scorerLoginSchema = z.object({
  tournamentCode: z.string().trim().min(3, 'Tournament code is required'),
  pin: z.string().trim().min(4, 'PIN is required'),
});

// Helper to check tournament organizer permissions
function canManageTournament(user, tournament) {
  if (!user) return false;
  if (user.role === 'superadmin' || user.role === 'admin') return true;
  return String(tournament.organizer) === String(user._id);
}

// ========================
// 1. List Tournaments
// ========================
router.get('/', optionalAuth, wrap(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.search) {
    const rx = new RegExp(req.query.search, 'i');
    filter.$or = [{ name: rx }, { code: rx }, { venue: rx }];
  }

  const tournaments = await Tournament.find(filter)
    .populate('organizer', 'name username role')
    .sort({ createdAt: -1 })
    .limit(50);

  res.json({
    tournaments: tournaments.map((t) => ({
      id: sid(t._id),
      name: t.name,
      code: t.code,
      venue: t.venue,
      grounds: t.grounds,
      format: t.format,
      maxTeams: t.maxTeams,
      teamCount: t.teams.length,
      defaultOvers: t.defaultOvers,
      startDate: t.startDate,
      endDate: t.endDate,
      status: t.status,
      organizerName: t.organizer?.name || 'Tournament Admin',
      createdAt: t.createdAt,
    })),
  });
}));

// ========================
// 2. Create Tournament
// ========================
router.post('/', requireAuth, wrap(async (req, res) => {
  const d = parse(createTournamentSchema, req.body);
  const code = await Tournament.generateCode();

  const tournament = await Tournament.create({
    name: d.name,
    code,
    description: d.description,
    venue: d.venue,
    grounds: d.grounds && d.grounds.length > 0 ? d.grounds : ['Ground 1', 'Ground 2'],
    format: d.format,
    maxTeams: d.maxTeams,
    defaultOvers: d.defaultOvers,
    startDate: d.startDate ? new Date(d.startDate) : undefined,
    endDate: d.endDate ? new Date(d.endDate) : undefined,
    rules: d.rules,
    organizer: req.user._id,
    scorers: [
      { name: 'Ground 1 Scorer', pin: '1111', ground: 'Ground 1' },
      { name: 'Ground 2 Scorer', pin: '2222', ground: 'Ground 2' },
    ],
  });

  res.status(201).json({
    message: 'Tournament created successfully',
    tournament: {
      id: sid(tournament._id),
      name: tournament.name,
      code: tournament.code,
      format: tournament.format,
      maxTeams: tournament.maxTeams,
      defaultOvers: tournament.defaultOvers,
      grounds: tournament.grounds,
      status: tournament.status,
    },
  });
}));

// ========================
// 3. Quick Scorer Login
// ========================
router.post('/scorer-login', wrap(async (req, res) => {
  const { tournamentCode, pin } = parse(scorerLoginSchema, req.body);
  const tournament = await Tournament.findOne({ code: tournamentCode.toUpperCase() });
  if (!tournament) throw new HttpError(404, 'Tournament not found with this code');

  const scorer = tournament.scorers.find((s) => s.pin === pin);
  if (!scorer) throw new HttpError(401, 'Invalid Scorer PIN for this tournament');

  // Find or create a lightweight user for this scorer
  const username = `scorer_${tournament.code.toLowerCase()}_${pin}`.replace(/[^a-z0-9_]/g, '');
  let user = await User.findOne({ username });
  if (!user) {
    const passwordHash = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10);
    user = await User.create({
      name: `${scorer.name} (${tournament.name})`,
      username,
      passwordHash,
      role: 'scorer',
      tournamentId: tournament._id,
      active: true,
    });
  } else {
    user.tournamentId = tournament._id;
    await user.save();
  }

  const token = signToken(user, null);
  res.json({
    token,
    user: publicUser(user),
    tournament: {
      id: sid(tournament._id),
      name: tournament.name,
      code: tournament.code,
      ground: scorer.ground,
    },
    message: `Signed in as ${scorer.name} for ${tournament.name}`,
  });
}));

// ========================
// 4. Get Tournament By Code
// ========================
router.get('/code/:code', wrap(async (req, res) => {
  const tournament = await Tournament.findOne({ code: req.params.code.toUpperCase() })
    .populate('organizer', 'name username');
  if (!tournament) throw new HttpError(404, 'Tournament not found');
  res.json({
    id: sid(tournament._id),
    name: tournament.name,
    code: tournament.code,
    venue: tournament.venue,
    format: tournament.format,
    maxTeams: tournament.maxTeams,
    teamCount: tournament.teams.length,
    defaultOvers: tournament.defaultOvers,
    status: tournament.status,
  });
}));

// ========================
// 5. Get Tournament Detail
// ========================
router.get('/:id', optionalAuth, wrap(async (req, res) => {
  const tournament = await Tournament.findById(req.params.id)
    .populate('organizer', 'name username role')
    .populate('teams.team', 'name logo code city');
  if (!tournament) throw new HttpError(404, 'Tournament not found');

  // Fetch all matches for this tournament
  const matches = await Match.find({ tournament: tournament._id })
    .populate('homeTeam', 'name logo')
    .populate('awayTeam', 'name logo')
    .sort({ createdAt: 1 });

  // Innings for these matches
  const matchIds = matches.map((m) => m._id);
  const innings = await Innings.find({ match: { $in: matchIds } }).sort({ number: 1 });

  const isOrganizer = req.user ? canManageTournament(req.user, tournament) : false;

  const formattedMatches = matches.map((m) => {
    const inn = innings.filter((i) => String(i.match) === String(m._id));
    return {
      id: sid(m._id),
      name: m.name,
      format: m.format,
      overs: m.overs,
      ground: m.ground || 'Ground 1',
      round: m.tournamentRound || 'Round 1',
      date: m.date,
      status: m.status,
      homeTeam: { id: sid(m.homeTeam?._id), name: m.homeTeam?.name || 'Team 1', logo: m.homeTeam?.logo },
      awayTeam: { id: sid(m.awayTeam?._id), name: m.awayTeam?.name || 'Team 2', logo: m.awayTeam?.logo },
      scores: inn.map((i) => ({
        team: sid(i.battingTeam),
        runs: i.summary.runs,
        wickets: i.summary.wickets,
        overs: `${Math.floor(i.summary.legalBalls / 6)}.${i.summary.legalBalls % 6}`,
      })),
      resultSummary: m.status === 'completed' ? m.result?.summary : null,
      isBye: m.isBye || false,
      canManage: req.user ? canManageMatch(req.user, m) : false,
    };
  });

  const liveMatches = formattedMatches.filter((m) => m.status === 'live');
  const upcomingMatches = formattedMatches.filter((m) => m.status === 'scheduled');
  const completedMatches = formattedMatches.filter((m) => m.status === 'completed');

  res.json({
    tournament: {
      id: sid(tournament._id),
      name: tournament.name,
      code: tournament.code,
      description: tournament.description,
      venue: tournament.venue,
      grounds: tournament.grounds,
      format: tournament.format,
      maxTeams: tournament.maxTeams,
      defaultOvers: tournament.defaultOvers,
      startDate: tournament.startDate,
      endDate: tournament.endDate,
      status: tournament.status,
      rules: tournament.rules,
      organizer: {
        id: sid(tournament.organizer?._id),
        name: tournament.organizer?.name || 'Organizer',
      },
      teams: tournament.teams.map((t) => ({
        id: sid(t.team?._id),
        name: t.name || t.team?.name,
        logo: t.team?.logo,
        code: t.team?.code,
        status: t.status,
        seed: t.seed,
      })),
      byes: tournament.byes.map((b) => ({
        teamId: sid(b.team),
        teamName: b.teamName,
        round: b.round,
        reason: b.reason,
      })),
      scorers: isOrganizer
        ? tournament.scorers.map((s) => ({
            name: s.name,
            pin: s.pin,
            ground: s.ground,
          }))
        : [],
    },
    matches: formattedMatches,
    liveMatches,
    upcomingMatches,
    completedMatches,
    isOrganizer,
  });
}));

// ========================
// 6. Add Team to Tournament
// ========================
router.post('/:id/teams', requireAuth, wrap(async (req, res) => {
  const tournament = await Tournament.findById(req.params.id);
  if (!tournament) throw new HttpError(404, 'Tournament not found');

  const { teamId, teamCode } = parse(addTeamSchema, req.body);
  let team;
  if (teamId) {
    team = await Team.findById(teamId);
  } else if (teamCode) {
    team = await Team.findOne({ code: teamCode.toUpperCase() });
  }
  if (!team) throw new HttpError(404, 'Team not found');

  if (tournament.teams.length >= tournament.maxTeams) {
    throw new HttpError(400, `Tournament is full (Maximum ${tournament.maxTeams} teams allowed)`);
  }

  const alreadyJoined = tournament.teams.some((t) => String(t.team) === String(team._id));
  if (alreadyJoined) throw new HttpError(400, `${team.name} is already registered in this tournament`);

  tournament.teams.push({
    team: team._id,
    name: team.name,
    seed: tournament.teams.length + 1,
    status: 'approved',
  });

  await tournament.save();
  res.json({ message: `${team.name} added to tournament`, teamCount: tournament.teams.length });
}));

// ========================
// 7. Remove Team from Tournament
// ========================
router.delete('/:id/teams/:teamId', requireAuth, wrap(async (req, res) => {
  const tournament = await Tournament.findById(req.params.id);
  if (!tournament) throw new HttpError(404, 'Tournament not found');
  if (!canManageTournament(req.user, tournament)) throw new HttpError(403, 'Only organizer can remove teams');

  tournament.teams = tournament.teams.filter((t) => String(t.team) !== String(req.params.teamId));
  tournament.byes = tournament.byes.filter((b) => String(b.team) !== String(req.params.teamId));
  await tournament.save();
  res.json({ message: 'Team removed from tournament' });
}));

// ========================
// 8. Award / Remove Bye
// ========================
router.post('/:id/byes', requireAuth, wrap(async (req, res) => {
  const tournament = await Tournament.findById(req.params.id);
  if (!tournament) throw new HttpError(404, 'Tournament not found');
  if (!canManageTournament(req.user, tournament)) throw new HttpError(403, 'Only organizer can award Byes');

  const { teamId, round, reason } = parse(awardByeSchema, req.body);
  const teamInTrn = tournament.teams.find((t) => String(t.team) === String(teamId));
  if (!teamInTrn) throw new HttpError(404, 'Team not part of this tournament');

  // Check if bye already awarded
  const existing = tournament.byes.find((b) => String(b.team) === String(teamId) && b.round === round);
  if (existing) throw new HttpError(400, `Team already has a Bye for ${round}`);

  tournament.byes.push({
    team: teamInTrn.team,
    teamName: teamInTrn.name,
    round,
    reason,
  });

  await tournament.save();
  res.json({ message: `Bye awarded to ${teamInTrn.name} for ${round}`, byes: tournament.byes });
}));

router.delete('/:id/byes/:teamId', requireAuth, wrap(async (req, res) => {
  const tournament = await Tournament.findById(req.params.id);
  if (!tournament) throw new HttpError(404, 'Tournament not found');
  if (!canManageTournament(req.user, tournament)) throw new HttpError(403, 'Only organizer can remove Byes');

  tournament.byes = tournament.byes.filter((b) => String(b.team) !== String(req.params.teamId));
  await tournament.save();
  res.json({ message: 'Bye removed' });
}));

// ========================
// 9. Auto-Generate Knockout Fixtures
// ========================
router.post('/:id/generate-fixtures', requireAuth, wrap(async (req, res) => {
  const tournament = await Tournament.findById(req.params.id);
  if (!tournament) throw new HttpError(404, 'Tournament not found');
  if (!canManageTournament(req.user, tournament)) throw new HttpError(403, 'Only organizer can generate fixtures');

  const teams = [...tournament.teams];
  if (teams.length < 2) throw new HttpError(400, 'At least 2 teams required to generate fixtures');

  // Teams with Round 1 Byes skip Round 1
  const round1ByeIds = new Set(tournament.byes.filter((b) => b.round === 'Round 1').map((b) => String(b.team)));
  const playingTeams = teams.filter((t) => !round1ByeIds.has(String(t.team)));

  const grounds = tournament.grounds.length > 0 ? tournament.grounds : ['Ground 1', 'Ground 2'];
  const createdMatches = [];

  // Pair up playing teams for Round 1
  for (let i = 0; i < playingTeams.length - 1; i += 2) {
    const homeTeam = playingTeams[i];
    const awayTeam = playingTeams[i + 1];
    const ground = grounds[Math.floor(i / 2) % grounds.length];

    const match = await Match.create({
      name: `${homeTeam.name} vs ${awayTeam.name}`,
      format: 'Custom',
      overs: tournament.defaultOvers || 8,
      homeTeam: homeTeam.team,
      awayTeam: awayTeam.team,
      toss: { winner: homeTeam.team, decision: 'bat' },
      status: 'scheduled',
      tournament: tournament._id,
      tournamentRound: 'Round 1',
      ground,
      venue: tournament.venue || ground,
      createdBy: req.user._id,
    });
    createdMatches.push(match);
  }

  // If odd team without bye, grant automatic Bye
  if (playingTeams.length % 2 === 1) {
    const oddTeam = playingTeams[playingTeams.length - 1];
    tournament.byes.push({
      team: oddTeam.team,
      teamName: oddTeam.name,
      round: 'Round 1',
      reason: 'Automatic Bye (Odd team count in Round 1)',
    });
    await tournament.save();
  }

  tournament.status = 'live';
  await tournament.save();

  res.json({
    message: `Generated ${createdMatches.length} Round 1 fixtures`,
    matchesCount: createdMatches.length,
    byesCount: tournament.byes.length,
  });
}));

// ========================
// 10. Schedule Custom Match Inside Tournament
// ========================
router.post('/:id/matches', requireAuth, wrap(async (req, res) => {
  const tournament = await Tournament.findById(req.params.id);
  if (!tournament) throw new HttpError(404, 'Tournament not found');
  if (!canManageTournament(req.user, tournament)) throw new HttpError(403, 'Only organizer can schedule matches');

  const d = parse(createMatchSchema, req.body);
  const home = await Team.findById(d.homeTeam);
  const away = await Team.findById(d.awayTeam);
  if (!home || !away) throw new HttpError(404, 'One or both teams not found');

  const match = await Match.create({
    name: `${home.name} vs ${away.name}`,
    format: 'Custom',
    overs: d.overs || tournament.defaultOvers || 8,
    homeTeam: home._id,
    awayTeam: away._id,
    toss: { winner: home._id, decision: 'bat' },
    status: 'scheduled',
    tournament: tournament._id,
    tournamentRound: d.round || 'Round 1',
    ground: d.ground || 'Ground 1',
    venue: d.venue || tournament.venue || d.ground || 'Ground 1',
    date: d.date ? new Date(d.date) : undefined,
    createdBy: req.user._id,
  });

  if (tournament.status === 'upcoming') {
    tournament.status = 'live';
    await tournament.save();
  }

  res.status(201).json({ message: 'Tournament match scheduled successfully', matchId: sid(match._id) });
}));

// ========================
// 11. Add / Remove Scorer PIN
// ========================
router.post('/:id/scorers', requireAuth, wrap(async (req, res) => {
  const tournament = await Tournament.findById(req.params.id);
  if (!tournament) throw new HttpError(404, 'Tournament not found');
  if (!canManageTournament(req.user, tournament)) throw new HttpError(403, 'Only organizer can manage scorers');

  const { name, pin, ground } = parse(addScorerSchema, req.body);
  const pinExists = tournament.scorers.some((s) => s.pin === pin);
  if (pinExists) throw new HttpError(400, 'This PIN is already assigned to another scorer');

  tournament.scorers.push({ name, pin, ground });
  await tournament.save();
  res.json({ message: `Scorer ${name} added with PIN ${pin}`, scorers: tournament.scorers });
}));

router.delete('/:id/scorers/:pin', requireAuth, wrap(async (req, res) => {
  const tournament = await Tournament.findById(req.params.id);
  if (!tournament) throw new HttpError(404, 'Tournament not found');
  if (!canManageTournament(req.user, tournament)) throw new HttpError(403, 'Only organizer can manage scorers');

  tournament.scorers = tournament.scorers.filter((s) => s.pin !== req.params.pin);
  await tournament.save();
  res.json({ message: 'Scorer removed' });
}));

// ========================
// 12. Update Tournament
// ========================
router.put('/:id', requireAuth, wrap(async (req, res) => {
  const tournament = await Tournament.findById(req.params.id);
  if (!tournament) throw new HttpError(404, 'Tournament not found');
  if (!canManageTournament(req.user, tournament)) throw new HttpError(403, 'Only organizer can update tournament');

  const { name, description, venue, grounds, status, defaultOvers, maxTeams, rules } = req.body;
  if (name) tournament.name = name;
  if (description !== undefined) tournament.description = description;
  if (venue !== undefined) tournament.venue = venue;
  if (grounds && Array.isArray(grounds)) tournament.grounds = grounds;
  if (status && ['upcoming', 'live', 'completed'].includes(status)) tournament.status = status;
  if (defaultOvers) tournament.defaultOvers = Number(defaultOvers);
  if (maxTeams) tournament.maxTeams = Number(maxTeams);
  if (rules !== undefined) tournament.rules = rules;

  await tournament.save();
  res.json({ message: 'Tournament updated successfully', tournament });
}));

export default router;
