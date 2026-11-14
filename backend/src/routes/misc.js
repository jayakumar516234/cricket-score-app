import { Router } from 'express';
import { Team } from '../models/Team.js';
import { Player } from '../models/Player.js';
import { Match } from '../models/Match.js';
import { Innings } from '../models/Innings.js';
import { AuditLog } from '../models/AuditLog.js';
import { TeamConnection } from '../models/TeamConnection.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { wrap, pageParams, escapeRegex } from '../utils/http.js';
import { canCreateTeams, canCreateMatches } from '../utils/permissions.js';

const router = Router();
const sid = (v) => String(v?._id ?? v);

router.get('/stats', requireAuth, wrap(async (req, res) => {
  const isAdmin = req.user.role === 'superadmin' || req.user.role === 'admin';
  const isView = req.user.role === 'viewer';
  const vt = isView ? req.user.viewTeam : null;

  // Lightweight caching header to assist mobile performance
  res.set('Cache-Control', 'private, max-age=5');

  // ==========================================
  // ADMIN PATH (Optimized parallel queries)
  // ==========================================
  if (isAdmin) {
    const [
      teamsCount,
      playersCount,
      matchesCount,
      liveCount,
      completedCount,
      recentMatchDocs,
      recentTeamDocs,
    ] = await Promise.all([
      Team.countDocuments().lean(),
      Player.countDocuments().lean(),
      Match.countDocuments().lean(),
      Match.countDocuments({ status: 'live' }).lean(),
      Match.countDocuments({ status: 'completed' }).lean(),
      Match.find().sort({ createdAt: -1 }).limit(5).lean(),
      Team.find().sort({ createdAt: -1 }).limit(4).select('name logo').lean(),
    ]);

    // Fetch team details and innings for the 5 matches in parallel
    const teamIds = [...new Set(recentMatchDocs.flatMap((m) => [m.homeTeam, m.awayTeam]).map(sid))];
    const matchIds = recentMatchDocs.map((m) => m._id);

    const [teamDocs, inningsDocs, recentCounts] = await Promise.all([
      teamIds.length ? Team.find({ _id: { $in: teamIds } }).select('name logo').lean() : [],
      matchIds.length ? Innings.find({ match: { $in: matchIds } }).sort({ number: 1 }).lean() : [],
      recentTeamDocs.length
        ? Player.aggregate([
            { $match: { team: { $in: recentTeamDocs.map((t) => t._id) } } },
            { $group: { _id: '$team', n: { $sum: 1 } } },
          ])
        : [],
    ]);

    const tm = Object.fromEntries(teamDocs.map((t) => [sid(t._id), { id: sid(t._id), name: t.name, logo: t.logo }]));
    const cm = Object.fromEntries(recentCounts.map((c) => [sid(c._id), c.n]));

    const recentMatches = recentMatchDocs.map((m) => ({
      id: sid(m._id),
      name: m.name,
      status: m.status,
      format: m.format,
      homeTeam: tm[sid(m.homeTeam)] || { name: 'Deleted team' },
      awayTeam: tm[sid(m.awayTeam)] || { name: 'Deleted team' },
      scores: inningsDocs
        .filter((i) => sid(i.match) === sid(m._id))
        .map((i) => ({ team: sid(i.battingTeam), runs: i.summary.runs, wickets: i.summary.wickets })),
      resultSummary: m.status === 'completed' ? m.result?.summary : null,
    }));

    return res.json({
      isAdmin: true,
      totals: {
        teams: teamsCount,
        players: playersCount,
        matches: matchesCount,
        live: liveCount,
        completed: completedCount,
      },
      recentMatches,
      recentTeams: recentTeamDocs.map((t) => ({
        id: sid(t._id),
        name: t.name,
        logo: t.logo,
        playerCount: cm[sid(t._id)] || 0,
      })),
      can: {
        createTeam: true,
        createMatch: true,
      },
      myTeam: null,
      mine: null,
    });
  }

  // ==========================================
  // NON-ADMIN / TEAM USER PATH
  // Scoped strictly to their own team with parallel execution
  // ==========================================
  const myTeamDoc = vt
    ? await Team.findById(vt).select('_id name code logo location ballType').lean()
    : await Team.findOne({ createdBy: req.user._id, isGuest: { $ne: true } })
        .select('_id name code logo location ballType')
        .lean();

  const targetTeamId = myTeamDoc ? myTeamDoc._id : null;
  const myTeam = myTeamDoc
    ? {
        id: sid(myTeamDoc._id),
        name: myTeamDoc.name,
        code: myTeamDoc.code,
        logo: myTeamDoc.logo,
        location: myTeamDoc.location,
        ballType: myTeamDoc.ballType,
      }
    : null;

  if (!targetTeamId) {
    return res.json({
      isAdmin: false,
      totals: { teams: 0, players: 0, matches: 0, live: 0, completed: 0 },
      recentMatches: [],
      activeLiveMatch: null,
      myTeamRecord: null,
      recentOpponents: [],
      can: {
        createTeam: canCreateTeams(req.user, 0),
        createMatch: false,
      },
      myTeam: null,
      mine: { teams: 0, matches: 0, myTeam: null },
    });
  }

  const teamMatchFilter = { $or: [{ homeTeam: targetTeamId }, { awayTeam: targetTeamId }] };

  // Run team-specific queries in parallel with .lean()
  const [
    playerCount,
    recentMatchDocs,
    completedUserMatches,
    liveMatches,
    conns,
  ] = await Promise.all([
    Player.countDocuments({ team: targetTeamId }).lean(),
    Match.find(teamMatchFilter).sort({ createdAt: -1 }).limit(5).lean(),
    Match.find({ ...teamMatchFilter, status: 'completed' }).select('result').lean(),
    Match.find({ ...teamMatchFilter, status: 'live' }).sort({ updatedAt: -1 }).limit(1).lean(),
    TeamConnection.find({
      $or: [{ fromTeam: targetTeamId }, { toTeam: targetTeamId }],
      status: 'accepted',
    })
      .populate('fromTeam toTeam', 'name logo code location ballType')
      .sort({ updatedAt: -1 })
      .limit(6)
      .lean(),
  ]);

  // Compute team record
  const won = completedUserMatches.filter((m) => m.result?.winner && sid(m.result.winner) === sid(targetTeamId)).length;
  const tied = completedUserMatches.filter((m) => !m.result?.winner).length;
  const lost = completedUserMatches.length - won - tied;
  const userTeamRecord = {
    played: completedUserMatches.length,
    won,
    lost,
    tied,
    winRate: completedUserMatches.length > 0 ? Math.round((won / completedUserMatches.length) * 100) : 0,
    playerCount,
    liveCount: liveMatches.length,
  };

  // Resolve team names and innings for recent matches + active live match
  const liveMatchDoc = liveMatches[0] || null;
  const matchSet = [...recentMatchDocs];
  if (liveMatchDoc && !matchSet.some((m) => sid(m._id) === sid(liveMatchDoc._id))) {
    matchSet.push(liveMatchDoc);
  }

  const allTeamIds = [...new Set(matchSet.flatMap((m) => [m.homeTeam, m.awayTeam]).map(sid))];
  const allMatchIds = matchSet.map((m) => m._id);

  const [teamDocs, inningsDocs] = await Promise.all([
    allTeamIds.length ? Team.find({ _id: { $in: allTeamIds } }).select('name logo').lean() : [],
    allMatchIds.length ? Innings.find({ match: { $in: allMatchIds } }).sort({ number: 1 }).lean() : [],
  ]);

  const tm = Object.fromEntries(teamDocs.map((t) => [sid(t._id), { id: sid(t._id), name: t.name, logo: t.logo }]));

  const formatMatch = (m) => ({
    id: sid(m._id),
    name: m.name,
    status: m.status,
    format: m.format,
    homeTeam: tm[sid(m.homeTeam)] || { name: 'Deleted team' },
    awayTeam: tm[sid(m.awayTeam)] || { name: 'Deleted team' },
    scores: inningsDocs
      .filter((i) => sid(i.match) === sid(m._id))
      .map((i) => ({ team: sid(i.battingTeam), runs: i.summary.runs, wickets: i.summary.wickets })),
    resultSummary: m.status === 'completed' ? m.result?.summary : null,
  });

  const recentMatches = recentMatchDocs.map(formatMatch);
  const formattedLiveMatch = liveMatchDoc ? formatMatch(liveMatchDoc) : null;

  // Opponents list from connections
  const recentOpponents = conns
    .map((c) => {
      const opp = sid(c.fromTeam?._id) === sid(targetTeamId) ? c.toTeam : c.fromTeam;
      return opp ? {
        id: sid(opp._id),
        name: opp.name,
        logo: opp.logo,
        code: opp.code,
        location: opp.location,
        ballType: opp.ballType,
        isOpponent: true,
      } : null;
    })
    .filter(Boolean);

  res.json({
    isAdmin: false,
    totals: {
      teams: 1,
      players: playerCount,
      matches: recentMatchDocs.length,
      live: liveMatches.length,
      completed: completedUserMatches.length,
    },
    recentMatches,
    activeLiveMatch: formattedLiveMatch,
    myTeamRecord: userTeamRecord,
    recentOpponents,
    can: {
      createTeam: false,
      createMatch: canCreateMatches(req.user),
    },
    myTeam,
    mine: {
      teams: 1,
      matches: completedUserMatches.length + liveMatches.length,
      myTeam,
    },
  });
}));

router.get('/audit', requireAuth, requireRole('superadmin'), wrap(async (req, res) => {
  const { page, limit, skip } = pageParams(req.query, 100);
  const filter = {};
  if (req.query.action) filter.action = new RegExp(`^${escapeRegex(String(req.query.action))}`);
  const [items, total] = await Promise.all([
    AuditLog.find(filter).sort({ at: -1 }).skip(skip).limit(limit).lean(),
    AuditLog.countDocuments(filter),
  ]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) || 1 });
}));

export default router;
