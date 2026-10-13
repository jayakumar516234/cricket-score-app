import { Innings } from '../models/Innings.js';
import { Delivery } from '../models/Delivery.js';
import { Team } from '../models/Team.js';
import { Scorecard } from '../models/Scorecard.js';
import { computeInnings } from '../engine/scoring.js';
import { canManageMatch, canManageTeam } from '../utils/permissions.js';

const sid = (v) => String(v?._id ?? v);

export const teamKey = (match, teamId) => (sid(match.homeTeam) === sid(teamId) ? 'home' : 'away');
export const xiFor = (match, teamId) => match.xi[teamKey(match, teamId)];
export const xiIds = (match, teamId) => xiFor(match, teamId).map((p) => sid(p.player));

export function playerNames(match) {
  const map = {};
  [...match.xi.home, ...match.xi.away].forEach((p) => { map[sid(p.player)] = p.name; });
  return map;
}

export function inningsConfig(match, innings) {
  return {
    maxOvers: match.overs,
    battingXI: xiIds(match, innings.battingTeam),
    bowlingXI: xiIds(match, innings.bowlingTeam),
    target: innings.target ?? null,
  };
}

export async function loadState(match, innings) {
  const cfg = inningsConfig(match, innings);
  const deliveries = await Delivery.find({ innings: innings._id }).sort({ seq: 1 }).lean();
  const state = computeInnings(deliveries, cfg);
  return { cfg, deliveries, state };
}

/** Adds player names to a computed state so the client does not have to look them up. */
export function decorate(state, names) {
  const n = (id) => (id ? names[id] || 'Unknown' : null);
  const dismissalText = (b) => {
    if (!b.dismissal) return 'not out';
    const { type, bowler, fielder } = b.dismissal;
    switch (type) {
      case 'bowled': return `b ${n(bowler)}`;
      case 'lbw': return `lbw b ${n(bowler)}`;
      case 'caught': return `c ${fielder || 'fielder'} b ${n(bowler)}`;
      case 'stumped': return `st ${fielder || 'keeper'} b ${n(bowler)}`;
      case 'hitwicket': return `hit wicket b ${n(bowler)}`;
      case 'runout': return `run out${fielder ? ` (${fielder})` : ''}`;
      default: return type;
    }
  };
  return {
    ...state,
    strikerName: n(state.striker),
    nonStrikerName: n(state.nonStriker),
    bowlerName: n(state.bowler),
    battingCard: state.battingCard.map((b) => ({ ...b, name: n(b.id), dismissalText: dismissalText(b) })),
    bowlingCard: state.bowlingCard.map((b) => ({ ...b, name: n(b.id) })),
    yetToBat: state.yetToBat.map((id) => ({ id, name: n(id) })),
    availableBatters: state.availableBatters.map((id) => ({ id, name: n(id) })),
    eligibleBowlers: state.eligibleBowlers.map((id) => ({ id, name: n(id) })),
    overSummary: state.overSummary.map((o) => ({ ...o, bowlerName: n(o.bowler) })),
    fow: state.fow.map((f) => ({ ...f, name: n(f.batter) })),
    commentary: [...state.balls].reverse().map((b) => ({
      seq: b.seq,
      over: b.overLabel,
      label: b.label,
      wicket: !!b.wicket,
      boundary: b.batRuns === 4 || b.batRuns === 6,
      text: commentaryText(b, n),
    })),
  };
}

function commentaryText(b, n) {
  const base = `${n(b.bowler)} to ${n(b.striker)}`;
  let what;
  if (b.extra === 'wide') what = `wide${b.runs ? ` plus ${b.runs} run${b.runs > 1 ? 's' : ''}` : ''}, ${b.teamRuns} run${b.teamRuns > 1 ? 's' : ''} added`;
  else if (b.extra === 'noball') what = `no ball${b.runs ? `, ${b.runs} off the bat` : ''}, ${b.teamRuns} run${b.teamRuns > 1 ? 's' : ''} added`;
  else if (b.extra === 'bye') what = `${b.runs} bye${b.runs === 1 ? '' : 's'}`;
  else if (b.extra === 'legbye') what = `${b.runs} leg bye${b.runs === 1 ? '' : 's'}`;
  else if (b.runs === 4) what = 'FOUR runs';
  else if (b.runs === 6) what = 'SIX runs';
  else if (b.runs === 0) what = 'no run';
  else what = `${b.runs} run${b.runs > 1 ? 's' : ''}`;
  let text = `${base}, ${what}`;
  if (b.wicket) {
    const w = b.wicket;
    const out = n(w.dismissed);
    const how = { bowled: 'bowled', caught: `caught${w.fielder ? ` by ${w.fielder}` : ''}`, lbw: 'lbw', runout: `run out${w.fielder ? ` (${w.fielder})` : ''}`, stumped: `stumped${w.fielder ? ` by ${w.fielder}` : ''}`, hitwicket: 'hit wicket' }[w.type];
    text += `. WICKET! ${out} ${how}`;
  }
  return text;
}

const inningsView = (innings, state, names) => ({
  id: String(innings._id),
  number: innings.number,
  battingTeam: sid(innings.battingTeam),
  bowlingTeam: sid(innings.bowlingTeam),
  status: innings.status,
  target: innings.target,
  state: decorate(state, names),
});

export async function buildView(match, user) {
  const teams = await Team.find({ _id: { $in: [match.homeTeam, match.awayTeam] } }).select('name logo location ballType createdBy');
  const teamOut = (id) => {
    const t = teams.find((x) => sid(x._id) === sid(id));
    return t ? { id: sid(t._id), name: t.name, logo: t.logo, location: t.location, ballType: t.ballType } : { id: sid(id), name: 'Deleted team', logo: '' };
  };
  const names = playerNames(match);
  const innings = await Innings.find({ match: match._id }).sort({ number: 1 });
  const views = [];
  for (const inn of innings) {
    const { state } = await loadState(match, inn);
    views.push(inningsView(inn, state, names));
  }
  const scorecard = match.status === 'completed' ? await Scorecard.findOne({ match: match._id }).lean() : null;
  const plain = match.toObject();
  const xiOut = (list) => list.map((p) => ({ id: sid(p.player), name: p.name, role: p.role, jerseyNumber: p.jerseyNumber, guest: !!p.guest }));
  const teamDoc = (id) => teams.find((x) => sid(x._id) === sid(id));
  return {
    match: {
      id: sid(match._id),
      name: match.name,
      format: match.format,
      overs: match.overs,
      date: match.date,
      venue: match.venue,
      status: match.status,
      currentInnings: match.currentInnings,
      tieBreaker: match.tieBreaker,
      homeTeam: teamOut(match.homeTeam),
      awayTeam: teamOut(match.awayTeam),
      toss: { winner: sid(match.toss.winner), decision: match.toss.decision },
      xi: { home: xiOut(match.xi.home), away: xiOut(match.xi.away) },
      result: match.status === 'completed' ? { ...plain.result, winner: plain.result?.winner ? sid(plain.result.winner) : null } : null,
      playerOfMatch: match.status === 'completed' && plain.playerOfMatch ? { ...plain.playerOfMatch, team: sid(plain.playerOfMatch.team) } : null,
      completedAt: match.completedAt,
      createdAt: match.createdAt,
    },
    innings: views,
    scorecard: scorecard ? { innings: scorecard.innings, result: scorecard.result, playerOfMatch: scorecard.playerOfMatch } : null,
    canManage: canManageMatch(user, match),
    // true when the signed-in user owns that team, so new players can be saved into it
    canEditTeams: { home: !!teamDoc(match.homeTeam) && canManageTeam(user, teamDoc(match.homeTeam)), away: !!teamDoc(match.awayTeam) && canManageTeam(user, teamDoc(match.awayTeam)) },
  };
}
