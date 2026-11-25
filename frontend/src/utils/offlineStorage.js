// Offline Cricket Storage & Match Engine Manager
// Provides 100% client-side persistence for matches, teams, and ball-by-ball actions.
import { computeDecoratedInnings, validateBall } from '../engine/scoring.js';

const MATCHES_KEY = 'cricket_offline_matches';
const TEAMS_KEY = 'cricket_offline_teams';
const SCORING_MODE_KEY = 'cricket_scoring_mode'; // 'online' | 'offline'

// ─── Global & User Preferences ───
export function getScoringModePreference() {
  if (typeof window === 'undefined') return 'online';
  return localStorage.getItem(SCORING_MODE_KEY) || 'online';
}

export function setScoringModePreference(mode) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SCORING_MODE_KEY, mode === 'offline' ? 'offline' : 'online');
}

// ─── Offline Teams ───
export function getOfflineTeams() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(TEAMS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveOfflineTeam(team) {
  const teams = getOfflineTeams();
  const id = team.id || `local_team_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const fullTeam = {
    ...team,
    id,
    isLocal: true,
    canManage: true,
    playerCount: team.players?.length || 11,
    createdAt: team.createdAt || new Date().toISOString(),
  };
  const idx = teams.findIndex((t) => t.id === id);
  if (idx >= 0) {
    teams[idx] = fullTeam;
  } else {
    teams.push(fullTeam);
  }
  localStorage.setItem(TEAMS_KEY, JSON.stringify(teams));
  return fullTeam;
}

export function deleteOfflineTeam(teamId) {
  const teams = getOfflineTeams().filter((t) => t.id !== teamId);
  localStorage.setItem(TEAMS_KEY, JSON.stringify(teams));
}

// ─── Offline Matches ───
export function getOfflineMatches() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(MATCHES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getOfflineMatch(matchId) {
  return getOfflineMatches().find((m) => m.id === matchId) || null;
}

export function saveOfflineMatch(match) {
  const list = getOfflineMatches();
  const idx = list.findIndex((m) => m.id === match.id);
  if (idx >= 0) {
    list[idx] = match;
  } else {
    list.unshift(match);
  }
  localStorage.setItem(MATCHES_KEY, JSON.stringify(list));
  return match;
}

export function deleteOfflineMatch(matchId) {
  const list = getOfflineMatches().filter((m) => m.id !== matchId);
  localStorage.setItem(MATCHES_KEY, JSON.stringify(list));
}

function computeResultLocal({ first, second, firstTeam, secondTeam, names = {} }) {
  const r1 = first.runs;
  const r2 = second.runs;
  const nm = (id) => names[id] || 'Team';
  if (r2 > r1) {
    const value = Math.max(1, second.maxWickets - second.wickets);
    return { winner: secondTeam, tie: false, margin: { type: 'wickets', value }, summary: `${nm(secondTeam)} won by ${value} wicket${value === 1 ? '' : 's'}` };
  }
  if (r2 < r1) {
    const value = r1 - r2;
    return { winner: firstTeam, tie: false, margin: { type: 'runs', value }, summary: `${nm(firstTeam)} won by ${value} run${value === 1 ? '' : 's'}` };
  }
  return { winner: null, tie: true, margin: { type: 'tie', value: 0 }, summary: 'Match tied / Drawn' };
}

/**
 * Creates a brand new offline match structure ready for instant scoring.
 */
export function createOfflineMatch({
  name,
  homeTeam,
  awayTeam,
  format = 'T10',
  overs = 10,
  tossWinner,
  tossDecision = 'bat',
  venue = '',
}) {
  const id = `offline_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  
  const homeBattedFirst =
    (tossWinner === homeTeam.id && tossDecision === 'bat') ||
    (tossWinner === awayTeam.id && tossDecision === 'bowl');

  const batting1stTeam = homeBattedFirst ? homeTeam : awayTeam;
  const bowling1stTeam = homeBattedFirst ? awayTeam : homeTeam;

  const xiHome = homeTeam.players?.slice(0, 11).map((p, idx) => ({
    id: p.id || `p_${homeTeam.id}_${idx + 1}`,
    name: p.name || `Player ${idx + 1}`,
  })) || Array.from({ length: 11 }, (_, i) => ({ id: `p_${homeTeam.id}_${i + 1}`, name: `${homeTeam.name} P${i + 1}` }));

  const xiAway = awayTeam.players?.slice(0, 11).map((p, idx) => ({
    id: p.id || `p_${awayTeam.id}_${idx + 1}`,
    name: p.name || `Player ${idx + 1}`,
  })) || Array.from({ length: 11 }, (_, i) => ({ id: `p_${awayTeam.id}_${i + 1}`, name: `${awayTeam.name} P${i + 1}` }));

  const names = {};
  [...xiHome, ...xiAway].forEach((p) => { names[p.id] = p.name; });

  const battingXI = (homeBattedFirst ? xiHome : xiAway).map((p) => p.id);
  const bowlingXI = (homeBattedFirst ? xiAway : xiHome).map((p) => p.id);

  const initialInnings1 = {
    number: 1,
    battingTeam: batting1stTeam.id,
    bowlingTeam: bowling1stTeam.id,
    deliveries: [],
    state: computeDecoratedInnings([], {
      maxOvers: Number(overs),
      battingXI,
      bowlingXI,
      target: null,
    }, names),
  };

  const match = {
    id,
    isOffline: true,
    name: name || `${homeTeam.name} vs ${awayTeam.name}`,
    format,
    overs: Number(overs),
    venue,
    status: 'live',
    homeTeam: { ...homeTeam, players: xiHome },
    awayTeam: { ...awayTeam, players: xiAway },
    xi: { home: xiHome, away: xiAway },
    tossWinner,
    tossDecision,
    currentInnings: 1,
    innings: [initialInnings1],
    createdAt: new Date().toISOString(),
    result: null,
  };

  saveOfflineMatch(match);
  return match;
}

/**
 * Returns the view object expected by MatchPage.jsx
 */
export function getOfflineMatchView(matchId) {
  const match = getOfflineMatch(matchId);
  if (!match) return null;
  return {
    match,
    innings: match.innings || [],
    canManage: true,
    isScorer: true,
    isOffline: true,
  };
}

/**
 * Records a ball in the active innings of an offline match.
 */
export function recordOfflineBall(matchId, ballInput) {
  const match = getOfflineMatch(matchId);
  if (!match) throw new Error('Offline match not found');

  const currentIdx = (match.currentInnings || 1) - 1;
  const currentInn = match.innings[currentIdx];
  if (!currentInn) throw new Error('Active innings not found');

  const isHomeBatting = currentInn.battingTeam === match.homeTeam.id;
  const battingXI = ((isHomeBatting ? match.xi?.home : match.xi?.away) || []).map((p) => p.id);
  const bowlingXI = ((isHomeBatting ? match.xi?.away : match.xi?.home) || []).map((p) => p.id);

  const names = {};
  [...(match.xi?.home || []), ...(match.xi?.away || [])].forEach((p) => { names[p.id] = p.name; });

  const cfg = {
    maxOvers: match.overs,
    battingXI,
    bowlingXI,
    target: currentInn.state?.target || null,
  };

  const err = validateBall(currentInn.state, cfg, ballInput);
  if (err) throw new Error(err);

  const deliveries = [...(currentInn.deliveries || []), ballInput];
  const newState = computeDecoratedInnings(deliveries, cfg, names);

  currentInn.deliveries = deliveries;
  currentInn.state = newState;

  // Check 1st innings complete => start 2nd innings
  if (match.currentInnings === 1 && newState.completed) {
    const target = newState.runs + 1;
    const inn2BattingXI = bowlingXI;
    const inn2BowlingXI = battingXI;

    const inn2 = {
      number: 2,
      battingTeam: currentInn.bowlingTeam,
      bowlingTeam: currentInn.battingTeam,
      deliveries: [],
      target,
      state: computeDecoratedInnings([], {
        maxOvers: match.overs,
        battingXI: inn2BattingXI,
        bowlingXI: inn2BowlingXI,
        target,
      }, names),
    };
    match.innings.push(inn2);
    match.currentInnings = 2;
  } else if (match.currentInnings === 2 && newState.completed) {
    match.status = 'completed';
    const teamNames = {
      [match.homeTeam.id]: match.homeTeam.name,
      [match.awayTeam.id]: match.awayTeam.name,
    };
    match.result = computeResultLocal({
      first: match.innings[0].state,
      second: match.innings[1].state,
      firstTeam: match.innings[0].battingTeam,
      secondTeam: match.innings[1].battingTeam,
      names: teamNames,
    });
  }

  saveOfflineMatch(match);
  return getOfflineMatchView(matchId);
}

/**
 * Undoes the last ball in the active innings of an offline match.
 */
export function undoOfflineBall(matchId) {
  const match = getOfflineMatch(matchId);
  if (!match) throw new Error('Offline match not found');

  const currentIdx = (match.currentInnings || 1) - 1;
  const currentInn = match.innings[currentIdx];
  if (!currentInn) return getOfflineMatchView(matchId);

  // If 2nd innings has 0 balls and we undo, go back to 1st innings
  if (match.currentInnings === 2 && (!currentInn.deliveries || currentInn.deliveries.length === 0)) {
    match.innings.pop();
    match.currentInnings = 1;
    match.status = 'live';
    saveOfflineMatch(match);
    return getOfflineMatchView(matchId);
  }

  if (!currentInn.deliveries || currentInn.deliveries.length === 0) return getOfflineMatchView(matchId);

  const deliveries = currentInn.deliveries.slice(0, -1);
  const isHomeBatting = currentInn.battingTeam === match.homeTeam.id;
  const battingXI = ((isHomeBatting ? match.xi?.home : match.xi?.away) || []).map((p) => p.id);
  const bowlingXI = ((isHomeBatting ? match.xi?.away : match.xi?.home) || []).map((p) => p.id);

  const names = {};
  [...(match.xi?.home || []), ...(match.xi?.away || [])].forEach((p) => { names[p.id] = p.name; });

  const cfg = {
    maxOvers: match.overs,
    battingXI,
    bowlingXI,
    target: currentInn.state?.target || null,
  };

  currentInn.deliveries = deliveries;
  currentInn.state = computeDecoratedInnings(deliveries, cfg, names);
  if (match.status === 'completed') {
    match.status = 'live';
    match.result = null;
  }

  saveOfflineMatch(match);
  return getOfflineMatchView(matchId);
}

/**
 * Finishes an offline match manually.
 */
export function finishOfflineMatch(matchId) {
  const match = getOfflineMatch(matchId);
  if (!match) return;
  match.status = 'completed';
  if (match.innings.length >= 2) {
    const teamNames = {
      [match.homeTeam.id]: match.homeTeam.name,
      [match.awayTeam.id]: match.awayTeam.name,
    };
    match.result = computeResultLocal({
      first: match.innings[0].state,
      second: match.innings[1].state,
      firstTeam: match.innings[0].battingTeam,
      secondTeam: match.innings[1].battingTeam,
      names: teamNames,
    });
  }
  saveOfflineMatch(match);
  return getOfflineMatchView(matchId);
}
