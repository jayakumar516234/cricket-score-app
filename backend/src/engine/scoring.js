// Pure cricket scoring engine. No database access: everything is derived by
// replaying the ball-by-ball history, so "undo" is simply deleting the last ball.

export const BALLS_PER_OVER = 6;
export const EXTRAS = ['wide', 'noball', 'bye', 'legbye'];
export const WICKET_TYPES = ['bowled', 'caught', 'lbw', 'runout', 'stumped', 'hitwicket'];

// Which dismissals are possible on which kind of delivery.
const ALLOWED_WICKETS = {
  none: [...WICKET_TYPES],
  wide: ['stumped', 'runout', 'hitwicket'],
  noball: ['runout'],
  bye: ['runout', 'stumped'],
  legbye: ['runout'],
};

export const bowlerOverLimit = (maxOvers) => Math.ceil(maxOvers / 5);
export const formatOvers = (legalBalls) => `${Math.floor(legalBalls / BALLS_PER_OVER)}.${legalBalls % BALLS_PER_OVER}`;
const round2 = (n) => Math.round(n * 100) / 100;

function ballLabel(d) {
  const r = d.runs || 0;
  let t;
  switch (d.extra) {
    case 'wide': t = 'Wd' + (r ? `+${r}` : ''); break;
    case 'noball': t = 'Nb' + (r ? `+${r}` : ''); break;
    case 'bye': t = `B${r}`; break;
    case 'legbye': t = `Lb${r}`; break;
    default: t = String(r);
  }
  if (d.wicket && d.wicket.type) {
    t = d.extra ? `${t}+W` : r ? `${r}W` : 'W';
  }
  return t;
}

/**
 * Replays deliveries and returns the full innings state.
 * deliveries: [{ striker, nonStriker, bowler, runs, extra, wicket:{type,dismissed,fielder} }]
 * cfg: { maxOvers, battingXI:[id], bowlingXI:[id], target:null|number, bowlerOverLimit? }
 * `target` is the number of runs the chasing side needs to WIN (first innings + 1).
 */
export function computeInnings(deliveries, cfg) {
  const { maxOvers, battingXI, bowlingXI, target = null } = cfg;
  const maxWickets = Math.max(battingXI.length - 1, 1);
  const limit = cfg.bowlerOverLimit ?? bowlerOverLimit(maxOvers);

  const batters = new Map();
  const bowlers = new Map();
  const overs = new Map();
  const balls = [];
  const fow = [];
  const extras = { wide: 0, noball: 0, bye: 0, legbye: 0, total: 0 };
  let runs = 0;
  let wickets = 0;
  let legalBalls = 0;
  let striker = null;
  let nonStriker = null;
  let bowler = null;
  let lastOverBowler = null;

  const getBatter = (id) => {
    if (!batters.has(id)) batters.set(id, { id, runs: 0, balls: 0, fours: 0, sixes: 0, out: false, dismissal: null });
    return batters.get(id);
  };
  const getBowler = (id) => {
    if (!bowlers.has(id)) bowlers.set(id, { id, legalBalls: 0, runs: 0, wickets: 0, maidens: 0, wides: 0, noballs: 0 });
    return bowlers.get(id);
  };

  deliveries.forEach((d, i) => {
    const extra = d.extra || null;
    const r = d.runs || 0;
    getBatter(d.striker);
    getBatter(d.nonStriker);
    const bw = getBowler(d.bowler);
    const overIdx = Math.floor(legalBalls / BALLS_PER_OVER);
    const ballsBefore = legalBalls % BALLS_PER_OVER;

    let teamRuns;
    let batRuns = 0;
    let bowlerRuns;
    let legal = true;
    let faced = true;
    switch (extra) {
      case 'wide':
        teamRuns = 1 + r; bowlerRuns = teamRuns; legal = false; faced = false;
        extras.wide += teamRuns; bw.wides += teamRuns;
        break;
      case 'noball':
        teamRuns = 1 + r; batRuns = r; bowlerRuns = teamRuns; legal = false;
        extras.noball += 1; bw.noballs += 1;
        break;
      case 'bye':
        teamRuns = r; bowlerRuns = 0; extras.bye += r;
        break;
      case 'legbye':
        teamRuns = r; bowlerRuns = 0; extras.legbye += r;
        break;
      default:
        teamRuns = r; batRuns = r; bowlerRuns = r;
    }

    runs += teamRuns;
    const bt = batters.get(d.striker);
    bt.runs += batRuns;
    if (faced) bt.balls += 1;
    if (batRuns === 4 && (extra === null || extra === 'noball')) bt.fours += 1;
    if (batRuns === 6 && (extra === null || extra === 'noball')) bt.sixes += 1;
    bw.runs += bowlerRuns;
    if (!overs.has(overIdx)) overs.set(overIdx, { bowler: d.bowler, runs: 0 });
    overs.get(overIdx).runs += bowlerRuns;

    // Strike rotation on completed runs (odd number => batters cross).
    let pos = { s: d.striker, n: d.nonStriker };
    if (r % 2 === 1) pos = { s: pos.n, n: pos.s };

    if (d.wicket && d.wicket.type) {
      const outId = d.wicket.dismissed === 'nonStriker' ? d.nonStriker : d.striker;
      const ob = batters.get(outId);
      ob.out = true;
      ob.dismissal = {
        type: d.wicket.type,
        bowler: d.wicket.type === 'runout' ? null : d.bowler,
        fielder: d.wicket.fielder || null,
      };
      wickets += 1;
      if (d.wicket.type !== 'runout') bw.wickets += 1;
      fow.push({ wicket: wickets, runs, over: formatOvers(legalBalls + (legal ? 1 : 0)), batter: outId });
      if (pos.s === outId) pos.s = null;
      if (pos.n === outId) pos.n = null;
    }

    if (legal) {
      legalBalls += 1;
      bw.legalBalls += 1;
    }
    if (legal && legalBalls % BALLS_PER_OVER === 0) {
      pos = { s: pos.n, n: pos.s }; // end of over: batters change ends
      lastOverBowler = d.bowler;
      bowler = null;
    } else {
      bowler = d.bowler;
    }
    striker = pos.s;
    nonStriker = pos.n;

    balls.push({
      seq: d.seq ?? i + 1,
      over: overIdx,
      ball: ballsBefore + 1,
      overLabel: `${overIdx}.${ballsBefore + 1}`,
      striker: d.striker,
      nonStriker: d.nonStriker,
      bowler: d.bowler,
      runs: r,
      extra,
      teamRuns,
      batRuns,
      legal,
      wicket: d.wicket && d.wicket.type
        ? { type: d.wicket.type, dismissed: d.wicket.dismissed === 'nonStriker' ? d.nonStriker : d.striker, fielder: d.wicket.fielder || null }
        : null,
      label: ballLabel(d),
    });
  });

  extras.total = extras.wide + extras.noball + extras.bye + extras.legbye;

  // Over-by-over summary: wides / no-balls stay inside the over they were bowled in.
  const overSummary = [];
  for (const b of balls) {
    if (!overSummary[b.over]) {
      overSummary[b.over] = { over: b.over, number: b.over + 1, bowler: b.bowler, runs: 0, wickets: 0, legalBalls: 0, complete: false, balls: [] };
    }
    const o = overSummary[b.over];
    o.runs += b.teamRuns;
    if (b.wicket) o.wickets += 1;
    if (b.legal) o.legalBalls += 1;
    o.balls.push(b.label);
  }
  overSummary.forEach((o) => { o.complete = o.legalBalls >= BALLS_PER_OVER; });

  // Maidens: only fully bowled overs with no runs conceded by the bowler.
  const completedOvers = Math.floor(legalBalls / BALLS_PER_OVER);
  overs.forEach((o, idx) => {
    if (idx < completedOvers && o.runs === 0) bowlers.get(o.bowler).maidens += 1;
  });

  const oversDone = legalBalls >= maxOvers * BALLS_PER_OVER;
  const allOut = wickets >= maxWickets;
  const targetReached = target != null && runs >= target;
  const completed = targetReached || allOut || oversDone;
  const completedReason = targetReached ? 'target' : allOut ? 'allout' : oversDone ? 'overs' : null;

  const needs = {
    striker: !completed && striker === null,
    nonStriker: !completed && nonStriker === null,
    bowler: !completed && bowler === null,
  };

  const availableBatters = completed
    ? []
    : battingXI.filter((id) => !(batters.get(id)?.out) && id !== striker && id !== nonStriker);
  const eligibleBowlers = completed || bowler !== null
    ? []
    : bowlingXI.filter((id) => id !== lastOverBowler && (bowlers.get(id)?.legalBalls || 0) < limit * BALLS_PER_OVER);

  const battingCard = [...batters.values()].map((b) => ({
    ...b,
    strikeRate: b.balls ? round2((b.runs / b.balls) * 100) : 0,
    status: b.out ? 'out' : 'batting',
    onStrike: !b.out && b.id === striker,
  }));
  const bowlingCard = [...bowlers.values()].map((b) => ({
    ...b,
    overs: formatOvers(b.legalBalls),
    economy: b.legalBalls ? round2(b.runs / (b.legalBalls / BALLS_PER_OVER)) : 0,
  }));
  const yetToBat = battingXI.filter((id) => !batters.has(id));

  return {
    runs,
    wickets,
    maxWickets,
    legalBalls,
    overs: formatOvers(legalBalls),
    maxOvers,
    runRate: legalBalls ? round2(runs / (legalBalls / BALLS_PER_OVER)) : 0,
    extras,
    striker,
    nonStriker,
    bowler,
    lastOverBowler,
    completed,
    completedReason,
    needs,
    availableBatters,
    eligibleBowlers,
    battingCard,
    bowlingCard,
    yetToBat,
    fow,
    balls,
    overSummary,
    currentOver: Math.floor(legalBalls / BALLS_PER_OVER), // 0-based index of the over being bowled (or about to start)
    recent: balls.slice(-12).map((b) => b.label),
    target,
    runsRequired: target != null ? Math.max(target - runs, 0) : null,
    ballsRemaining: Math.max(maxOvers * BALLS_PER_OVER - legalBalls, 0),
  };
}

/** Returns an error message, or null if the delivery is valid for the given state. */
export function validateBall(state, cfg, input) {
  if (state.completed) return 'Innings is already complete';
  const { striker, nonStriker, bowler, runs = 0, extra = null, wicket = null } = input;

  if (extra !== null && !EXTRAS.includes(extra)) return 'Invalid extra type';
  if (!Number.isInteger(runs) || runs < 0 || runs > 7) return 'Runs must be a whole number from 0 to 7';

  if (!striker || !nonStriker) return 'Select the striker and the non-striker';
  if (striker === nonStriker) return 'Striker and non-striker must be different players';
  for (const id of [striker, nonStriker]) {
    if (!cfg.battingXI.includes(id)) return 'Batter is not in the batting XI';
    if (state.battingCard.find((b) => b.id === id)?.out) return 'That batter is already out';
  }
  if (state.striker && state.striker !== striker) return 'Striker does not match the current state';
  if (state.nonStriker && state.nonStriker !== nonStriker) return 'Non-striker does not match the current state';

  if (!bowler) return 'Select a bowler';
  if (!cfg.bowlingXI.includes(bowler)) return 'Bowler is not in the bowling XI';
  if (state.bowler && state.bowler !== bowler) return 'The bowler cannot change in the middle of an over';
  if (!state.bowler && !state.eligibleBowlers.includes(bowler)) {
    return 'This bowler cannot bowl now (no consecutive overs, and the per-bowler over limit applies)';
  }

  if (wicket && wicket.type) {
    const allowed = ALLOWED_WICKETS[extra || 'none'];
    if (!allowed.includes(wicket.type)) {
      return `A ${wicket.type} dismissal is not possible on ${extra ? `a ${extra}` : 'this delivery'}`;
    }
    if (wicket.dismissed && !['striker', 'nonStriker'].includes(wicket.dismissed)) return 'Invalid dismissed batter';
    if (wicket.type !== 'runout' && wicket.dismissed === 'nonStriker') return 'Only a run out can dismiss the non-striker';
  }
  return null;
}

/** Decide the result of a two-innings match. `first` batted first. */
export function computeResult({ first, second, firstTeam, secondTeam, names = {}, tieBreakWinner = null }) {
  const r1 = first.runs;
  const r2 = second.runs;
  const nm = (id) => names[id] || 'Team';
  if (r2 > r1) {
    const value = second.maxWickets - second.wickets;
    return { winner: secondTeam, tie: false, byTieBreak: false, margin: { type: 'wickets', value }, summary: `${nm(secondTeam)} won by ${value} wicket${value === 1 ? '' : 's'}` };
  }
  if (r2 < r1) {
    const value = r1 - r2;
    return { winner: firstTeam, tie: false, byTieBreak: false, margin: { type: 'runs', value }, summary: `${nm(firstTeam)} won by ${value} run${value === 1 ? '' : 's'}` };
  }
  if (tieBreakWinner) {
    return { winner: tieBreakWinner, tie: true, byTieBreak: true, margin: { type: 'tiebreak', value: 0 }, summary: `Match tied - ${nm(tieBreakWinner)} won the Super Over` };
  }
  return { winner: null, tie: true, byTieBreak: false, margin: { type: 'tie', value: 0 }, summary: 'Match tied / Drawn' };
}

const battingPoints = (b) => b.runs + b.fours + 2 * b.sixes;
const bowlingPoints = (b) => 25 * b.wickets + 10 * b.maidens;

/**
 * entries: [{ team, state }] (team = batting team of that innings),
 * bowlingTeams: team id bowling in each entry. Prefers a player from the winning side.
 */
export function pickPlayerOfMatch(entries, bowlingTeams, winnerTeam = null) {
  const agg = new Map();
  entries.forEach(({ team, state }, idx) => {
    state.battingCard.forEach((b) => {
      const a = agg.get(b.id) || { id: b.id, team, points: 0, runs: 0, balls: 0, wickets: 0, runsConceded: 0 };
      a.points += battingPoints(b); a.runs += b.runs; a.balls += b.balls;
      agg.set(b.id, a);
    });
    state.bowlingCard.forEach((b) => {
      const a = agg.get(b.id) || { id: b.id, team: bowlingTeams[idx], points: 0, runs: 0, balls: 0, wickets: 0, runsConceded: 0 };
      a.points += bowlingPoints(b); a.wickets += b.wickets; a.runsConceded += b.runs;
      agg.set(b.id, a);
    });
  });
  let list = [...agg.values()];
  if (winnerTeam) {
    const winners = list.filter((p) => p.team === winnerTeam);
    if (winners.length) list = winners;
  }
  list.sort((a, b) => b.points - a.points);
  return list[0] || null;
}
