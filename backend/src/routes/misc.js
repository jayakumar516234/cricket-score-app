import { Router } from 'express';
import { Team } from '../models/Team.js';
import { Player } from '../models/Player.js';
import { Match } from '../models/Match.js';
import { Innings } from '../models/Innings.js';
import { AuditLog } from '../models/AuditLog.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { wrap, pageParams, escapeRegex } from '../utils/http.js';
import { canCreateTeams, canCreateMatches } from '../utils/permissions.js';

const router = Router();
const sid = (v) => String(v?._id ?? v);

router.get('/stats', requireAuth, wrap(async (req, res) => {
  const vt = req.user.role === 'viewer' ? req.user.viewTeam : null; // viewers only see their own team's numbers
  const mf = vt ? { $or: [{ homeTeam: vt }, { awayTeam: vt }] } : {};
  const [teams, players, matches, live, completed] = await Promise.all([
    vt ? 1 : Team.countDocuments(),
    Player.countDocuments(vt ? { team: vt } : {}),
    Match.countDocuments(mf),
    Match.countDocuments({ ...mf, status: 'live' }),
    Match.countDocuments({ ...mf, status: 'completed' }),
  ]);
  const recent = await Match.find(mf).sort({ createdAt: -1 }).limit(5);
  const teamDocs = await Team.find({ _id: { $in: recent.flatMap((m) => [m.homeTeam, m.awayTeam]) } }).select('name logo');
  const tm = Object.fromEntries(teamDocs.map((t) => [sid(t._id), { id: sid(t._id), name: t.name, logo: t.logo }]));
  const innings = await Innings.find({ match: { $in: recent.map((m) => m._id) } }).sort({ number: 1 });
  const recentTeams = await Team.find(vt ? { _id: vt } : {}).sort({ createdAt: -1 }).limit(3).select('name logo');
  const recentCounts = await Player.aggregate([{ $match: { team: { $in: recentTeams.map((t) => t._id) } } }, { $group: { _id: '$team', n: { $sum: 1 } } }]);
  const cm = Object.fromEntries(recentCounts.map((c) => [String(c._id), c.n]));
  res.json({
    totals: { teams, players, matches, live, completed },
    recentMatches: recent.map((m) => ({
      id: sid(m._id),
      name: m.name,
      status: m.status,
      format: m.format,
      homeTeam: tm[sid(m.homeTeam)] || { name: 'Deleted team' },
      awayTeam: tm[sid(m.awayTeam)] || { name: 'Deleted team' },
      scores: innings.filter((i) => sid(i.match) === sid(m._id)).map((i) => ({ team: sid(i.battingTeam), runs: i.summary.runs, wickets: i.summary.wickets })),
      resultSummary: m.status === 'completed' ? m.result?.summary : null,
    })),
    recentTeams: recentTeams.map((t) => ({ id: sid(t._id), name: t.name, logo: t.logo, playerCount: cm[String(t._id)] || 0 })),
    can: {
      createTeam: canCreateTeams(req.user, await Team.countDocuments({ createdBy: req.user._id })),
      createMatch: canCreateMatches(req.user),
    },
    // progress of a normal user (used for the "get started" guide on the dashboard)
    mine: (req.user.role === 'user' || req.user.role === 'teamadmin')
      ? {
          teams: await Team.countDocuments({ createdBy: req.user._id }),
          matches: await Match.countDocuments({ createdBy: req.user._id }),
          myTeam: await Team.findOne({ createdBy: req.user._id }).select('_id name').then((t) => t ? { id: String(t._id), name: t.name } : null),
        }
      : null,
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
