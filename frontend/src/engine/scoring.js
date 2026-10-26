// Pure cricket scoring engine for optimistic client updates.
// Matches backend/src/engine/scoring.js and adds decoration with player names.

export const BALLS_PER_OVER = 6;
export const EXTRAS = ['wide', 'noball', 'bye', 'legbye'];
export const WICKET_TYPES = ['bowled', 'caught', 'lbw', 'runout', 'stumped', 'hitwicket'];

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
  let eligibleBowlers = completed || bowler !== null
    ? []
    : bowlingXI.filter((id) => id !== lastOverBowler && (bowlers.get(id)?.legalBalls || 0) < limit * BALLS_PER_OVER);

  // If all bowlers have reached their limit, fallback to allow any bowler except consecutive overs
  if (!completed && bowler === null && eligibleBowlers.length === 0 && bowlingXI.length > 0) {
    eligibleBowlers = bowlingXI.filter((id) => id !== lastOverBowler);
    if (eligibleBowlers.length === 0) eligibleBowlers = [...bowlingXI];
  }

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
    currentOver: Math.floor(legalBalls / BALLS_PER_OVER),
    recent: balls.slice(-12).map((b) => b.label),
    target,
    runsRequired: target != null ? Math.max(target - runs, 0) : null,
    ballsRemaining: Math.max(maxOvers * BALLS_PER_OVER - legalBalls, 0),
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

export function computeDecoratedInnings(deliveries, cfg, names) {
  const raw = computeInnings(deliveries, cfg);
  return decorate(raw, names);
}

export function applyQueueToView(serverView, queue) {
  if (!serverView || !queue || queue.length === 0) return serverView;
  const match = serverView.match;
  if (!match) return serverView;
  const innIndex = (match.currentInnings || 1) - 1;
  const inn = serverView.innings?.[innIndex];
  if (!inn) return serverView;

  const names = {};
  [...(match.xi?.home || []), ...(match.xi?.away || [])].forEach((p) => {
    names[p.id] = p.name;
  });

  const isHomeBatting = inn.battingTeam === match.homeTeam.id;
  const battingXI = ((isHomeBatting ? match.xi?.home : match.xi?.away) || []).map((p) => p.id);
  const bowlingXI = ((isHomeBatting ? match.xi?.away : match.xi?.home) || []).map((p) => p.id);
  const cfg = {
    maxOvers: match.overs,
    battingXI,
    bowlingXI,
    target: inn.target ?? null,
  };

  const baseDeliveries = (inn.state?.balls || []).map((b) => ({
    striker: b.striker,
    nonStriker: b.nonStriker,
    bowler: b.bowler,
    runs: b.runs,
    extra: b.extra,
    wicket: b.wicket ? { type: b.wicket.type, dismissed: b.wicket.dismissed, fielder: b.wicket.fielder } : null,
  }));

  const allDeliveries = [
    ...baseDeliveries,
    ...queue.map((q) => q.candidate),
  ];

  const newState = computeDecoratedInnings(allDeliveries, cfg, names);

  const newInnings = [...serverView.innings];
  newInnings[innIndex] = {
    ...inn,
    state: newState,
  };

  return {
    ...serverView,
    innings: newInnings,
  };
}

