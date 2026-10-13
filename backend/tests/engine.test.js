import test from 'node:test';
import assert from 'node:assert/strict';
import { computeInnings, validateBall, computeResult, pickPlayerOfMatch } from '../src/engine/scoring.js';

const bat = Array.from({ length: 11 }, (_, i) => `b${i + 1}`);
const bowl = Array.from({ length: 11 }, (_, i) => `w${i + 1}`);
const cfg = (over = {}) => ({ maxOvers: 5, battingXI: bat, bowlingXI: bowl, target: null, ...over });

// helper to build a delivery with sensible defaults
const ball = (o = {}) => ({ striker: 'b1', nonStriker: 'b2', bowler: 'w1', runs: 0, extra: null, ...o });

test('legal delivery adds runs and counts one ball', () => {
  const s = computeInnings([ball({ runs: 4 })], cfg());
  assert.equal(s.runs, 4);
  assert.equal(s.legalBalls, 1);
  assert.equal(s.overs, '0.1');
  const b1 = s.battingCard.find((b) => b.id === 'b1');
  assert.deepEqual([b1.runs, b1.balls, b1.fours], [4, 1, 1]);
});

test('six is credited to batter and bowler', () => {
  const s = computeInnings([ball({ runs: 6 })], cfg());
  assert.equal(s.battingCard[0].sixes, 1);
  assert.equal(s.bowlingCard[0].runs, 6);
});

test('strike rotates on odd runs only', () => {
  let s = computeInnings([ball({ runs: 1 })], cfg());
  assert.equal(s.striker, 'b2');
  assert.equal(s.nonStriker, 'b1');
  s = computeInnings([ball({ runs: 2 })], cfg());
  assert.equal(s.striker, 'b1');
  s = computeInnings([ball({ runs: 3 })], cfg());
  assert.equal(s.striker, 'b2');
  s = computeInnings([ball({ runs: 4 })], cfg());
  assert.equal(s.striker, 'b1');
});

test('wide is not a legal delivery, adds 1 plus runs, batter does not face it', () => {
  const s = computeInnings([ball({ extra: 'wide' }), ball({ extra: 'wide', runs: 2 })], cfg());
  assert.equal(s.runs, 4);
  assert.equal(s.legalBalls, 0);
  assert.equal(s.extras.wide, 4);
  assert.equal(s.battingCard[0].balls, 0);
  assert.equal(s.bowlingCard[0].runs, 4);
  assert.equal(s.striker, 'b1'); // 2 runs: no rotation
});

test('wide with one run run rotates strike', () => {
  const s = computeInnings([ball({ extra: 'wide', runs: 1 })], cfg());
  assert.equal(s.striker, 'b2');
});

test('no-ball is not legal, batter faces it, runs off bat count for batter', () => {
  const s = computeInnings([ball({ extra: 'noball', runs: 4 })], cfg());
  assert.equal(s.runs, 5);
  assert.equal(s.legalBalls, 0);
  assert.equal(s.extras.noball, 1);
  const b1 = s.battingCard[0];
  assert.deepEqual([b1.runs, b1.balls, b1.fours], [4, 1, 1]);
  assert.equal(s.bowlingCard[0].runs, 5);
});

test('byes and leg byes are legal, go to extras, not to batter or bowler', () => {
  const s = computeInnings([ball({ extra: 'bye', runs: 2 }), ball({ extra: 'legbye', runs: 1 })], cfg());
  assert.equal(s.runs, 3);
  assert.equal(s.legalBalls, 2);
  assert.equal(s.extras.bye, 2);
  assert.equal(s.extras.legbye, 1);
  assert.equal(s.battingCard[0].runs, 0);
  assert.equal(s.battingCard[0].balls, 2);
  assert.equal(s.bowlingCard[0].runs, 0);
  assert.equal(s.striker, 'b2'); // legbye 1 rotates
});

test('over completion swaps ends and clears bowler', () => {
  const six = Array.from({ length: 6 }, () => ball({ runs: 0 }));
  const s = computeInnings(six, cfg());
  assert.equal(s.overs, '1.0');
  assert.equal(s.bowler, null);
  assert.equal(s.lastOverBowler, 'w1');
  assert.equal(s.striker, 'b2');
  assert.equal(s.needs.bowler, true);
  assert.equal(s.eligibleBowlers.includes('w1'), false);
  assert.equal(s.eligibleBowlers.includes('w2'), true);
});

test('single on last ball of over: batters cross twice, original striker faces next over', () => {
  const six = Array.from({ length: 5 }, () => ball()).concat([ball({ runs: 1 })]);
  const s = computeInnings(six, cfg());
  assert.equal(s.striker, 'b1');
});

test('maiden over is recorded; wide in over breaks the maiden', () => {
  const maiden = Array.from({ length: 6 }, () => ball());
  assert.equal(computeInnings(maiden, cfg()).bowlingCard[0].maidens, 1);
  const notMaiden = [ball({ extra: 'wide' }), ...Array.from({ length: 6 }, () => ball())];
  assert.equal(computeInnings(notMaiden, cfg()).bowlingCard[0].maidens, 0);
});

test('wide does not advance the over; seventh ball needed for over end', () => {
  const d = [ball({ extra: 'wide' }), ...Array.from({ length: 5 }, () => ball())];
  const s = computeInnings(d, cfg());
  assert.equal(s.overs, '0.5');
  assert.equal(s.bowler, 'w1');
});

test('wicket: bowled credits bowler, vacates striker slot, needs new batter', () => {
  const s = computeInnings([ball({ wicket: { type: 'bowled' } })], cfg());
  assert.equal(s.wickets, 1);
  assert.equal(s.striker, null);
  assert.equal(s.nonStriker, 'b2');
  assert.equal(s.needs.striker, true);
  assert.equal(s.bowlingCard[0].wickets, 1);
  assert.equal(s.fow[0].batter, 'b1');
  assert.equal(s.availableBatters.includes('b1'), false);
  assert.equal(s.availableBatters.includes('b3'), true);
  assert.equal(s.availableBatters.includes('b2'), false);
});

test('run out does not credit the bowler and can dismiss non-striker', () => {
  const s = computeInnings([ball({ runs: 1, wicket: { type: 'runout', dismissed: 'nonStriker' } })], cfg());
  assert.equal(s.bowlingCard[0].wickets, 0);
  assert.equal(s.wickets, 1);
  assert.equal(s.battingCard.find((b) => b.id === 'b2').out, true);
  // one run was completed: b1 is now at the non-striker end, b2's slot is empty
  assert.equal(s.nonStriker, 'b1');
  assert.equal(s.striker, null);
});

test('wicket on last ball of over: new batter then end change', () => {
  const d = Array.from({ length: 5 }, () => ball()).concat([ball({ wicket: { type: 'caught' } })]);
  const s = computeInnings(d, cfg());
  assert.equal(s.overs, '1.0');
  assert.equal(s.wickets, 1);
  assert.equal(s.striker, 'b2');
  assert.equal(s.nonStriker, null);
});

test('all out ends the innings after 10 wickets', () => {
  const d = [];
  let striker = 'b1';
  let non = 'b2';
  let next = 3;
  for (let i = 0; i < 10; i++) {
    d.push({ striker, nonStriker: non, bowler: `w${(Math.floor(i / 6) % 5) + 1}`, runs: 0, extra: null, wicket: { type: 'bowled' } });
    if (next <= 11) { striker = `b${next}`; next += 1; }
  }
  const s = computeInnings(d, cfg({ maxOvers: 20 }));
  assert.equal(s.wickets, 10);
  assert.equal(s.completed, true);
  assert.equal(s.completedReason, 'allout');
});

test('overs complete ends the innings', () => {
  const d = [];
  for (let o = 0; o < 5; o++) for (let i = 0; i < 6; i++) d.push(ball({ bowler: `w${o + 1}` }));
  const s = computeInnings(d, cfg());
  assert.equal(s.completed, true);
  assert.equal(s.completedReason, 'overs');
  assert.equal(s.overs, '5.0');
});

test('chase completes when target is reached, with runs required tracked', () => {
  let s = computeInnings([ball({ runs: 4 })], cfg({ target: 6 }));
  assert.equal(s.completed, false);
  assert.equal(s.runsRequired, 2);
  s = computeInnings([ball({ runs: 4 }), ball({ runs: 2 })], cfg({ target: 6 }));
  assert.equal(s.completed, true);
  assert.equal(s.completedReason, 'target');
});

test('run rate is runs per over of legal balls', () => {
  const d = Array.from({ length: 12 }, (_, i) => ball({ runs: 1, bowler: i < 6 ? 'w1' : 'w2' }));
  const s = computeInnings(d, cfg());
  assert.equal(s.runRate, 6);
});

test('recent balls and labels', () => {
  const s = computeInnings([ball({ runs: 4 }), ball({ extra: 'wide' }), ball({ extra: 'noball', runs: 1 }), ball({ wicket: { type: 'lbw' } })], cfg());
  assert.deepEqual(s.recent, ['4', 'Wd', 'Nb+1', 'W']);
});

// ---------- several things on the same ball ----------
test('wide + 2 runs + run out on the same ball', () => {
  const d = [ball({ extra: 'wide', runs: 2, wicket: { type: 'runout', dismissed: 'nonStriker' } })];
  const s = computeInnings(d, cfg());
  assert.equal(s.runs, 3); // 1 wide + 2 run
  assert.equal(s.extras.wide, 3);
  assert.equal(s.legalBalls, 0); // a wide is not a legal ball
  assert.equal(s.wickets, 1);
  assert.equal(s.battingCard.find((b) => b.id === 'b2').out, true);
  assert.equal(s.battingCard.find((b) => b.id === 'b1').balls, 0); // striker did not face a wide
  assert.equal(s.bowlingCard[0].wickets, 0); // run out is not the bowler's wicket
  assert.equal(s.bowlingCard[0].runs, 3);
  assert.equal(s.striker, 'b1'); // 2 runs: no change of ends, the non-striker slot is empty
  assert.equal(s.nonStriker, null);
  assert.equal(s.needs.nonStriker, true);
  assert.deepEqual(s.recent, ['Wd+2+W']);
});

test('wide + 1 run + run out of the striker (batters crossed once)', () => {
  const s = computeInnings([ball({ extra: 'wide', runs: 1, wicket: { type: 'runout', dismissed: 'striker' } })], cfg());
  assert.equal(s.runs, 2);
  assert.equal(s.striker, 'b2'); // they crossed once, so b2 is on strike and b1 (out) leaves an empty slot
  assert.equal(s.nonStriker, null);
  assert.equal(s.needs.nonStriker, true);
});

test('no-ball + 3 runs off the bat + run out, and bye + 1 + run out', () => {
  let s = computeInnings([ball({ extra: 'noball', runs: 3, wicket: { type: 'runout', dismissed: 'nonStriker' } })], cfg());
  assert.equal(s.runs, 4);
  assert.equal(s.legalBalls, 0);
  assert.equal(s.battingCard.find((b) => b.id === 'b1').runs, 3);
  assert.equal(s.wickets, 1);
  s = computeInnings([ball({ extra: 'bye', runs: 1, wicket: { type: 'runout', dismissed: 'nonStriker' } })], cfg());
  assert.equal(s.runs, 1);
  assert.equal(s.legalBalls, 1);
  assert.equal(s.extras.bye, 1);
  assert.equal(s.wickets, 1);
});

test('validateBall accepts wide + runs + run out but not wide + bowled', () => {
  const c = cfg();
  const empty = computeInnings([], c);
  const base = { striker: 'b1', nonStriker: 'b2', bowler: 'w1' };
  assert.equal(validateBall(empty, c, { ...base, extra: 'wide', runs: 2, wicket: { type: 'runout', dismissed: 'nonStriker' } }), null);
  assert.equal(validateBall(empty, c, { ...base, extra: 'noball', runs: 1, wicket: { type: 'runout', dismissed: 'striker' } }), null);
  assert.match(validateBall(empty, c, { ...base, extra: 'wide', runs: 2, wicket: { type: 'bowled' } }), /not possible/);
});

// ---------- over-by-over summary ----------
test('overSummary groups balls by over, keeps wides inside their over, and flags completed overs', () => {
  const d = [
    ...Array.from({ length: 6 }, () => ball({ bowler: 'w1' })),
    ball({ bowler: 'w2', runs: 1 }),
    ball({ bowler: 'w2', striker: 'b2', nonStriker: 'b1', extra: 'wide' }),
    ball({ bowler: 'w2', striker: 'b2', nonStriker: 'b1', runs: 4 }),
  ];
  const s = computeInnings(d, cfg());
  assert.equal(s.overSummary.length, 2);
  const [o1, o2] = s.overSummary;
  assert.deepEqual([o1.number, o1.bowler, o1.runs, o1.legalBalls, o1.complete], [1, 'w1', 0, 6, true]);
  assert.deepEqual(o1.balls, ['0', '0', '0', '0', '0', '0']);
  assert.deepEqual([o2.number, o2.bowler, o2.runs, o2.legalBalls, o2.complete], [2, 'w2', 6, 2, false]); // 1 + wide(1) + 4
  assert.deepEqual(o2.balls, ['1', 'Wd', '4']);
  assert.equal(s.currentOver, 1);
});

test('overSummary counts wickets, and a wide after the 6th legal ball belongs to the next over', () => {
  const d = [
    ...Array.from({ length: 5 }, () => ball({ bowler: 'w1' })),
    ball({ bowler: 'w1', wicket: { type: 'bowled' } }),
    ball({ bowler: 'w2', striker: 'b2', nonStriker: 'b3', extra: 'wide' }),
  ];
  const s = computeInnings(d, cfg());
  assert.equal(s.overSummary[0].wickets, 1);
  assert.equal(s.overSummary[0].balls[5], 'W');
  assert.equal(s.overSummary[1].number, 2);
  assert.deepEqual(s.overSummary[1].balls, ['Wd']);
  assert.equal(s.currentOver, 1);
});

test('overSummary is empty before the first ball; currentOver points at the next over after a full over', () => {
  assert.equal(computeInnings([], cfg()).overSummary.length, 0);
  assert.equal(computeInnings([], cfg()).currentOver, 0);
  const s = computeInnings(Array.from({ length: 6 }, () => ball()), cfg());
  assert.equal(s.overSummary.length, 1);
  assert.equal(s.currentOver, 1); // over 2 has not started yet
});

// ---------- validation ----------
test('validateBall rejects unselected players and impossible dismissals', () => {
  const c = cfg();
  const empty = computeInnings([], c);
  assert.match(validateBall(empty, c, { runs: 1 }), /Select the striker/);
  assert.match(validateBall(empty, c, { striker: 'b1', nonStriker: 'b1', bowler: 'w1' }), /different/);
  assert.match(validateBall(empty, c, { striker: 'b1', nonStriker: 'b2' }), /Select a bowler/);
  assert.equal(validateBall(empty, c, { striker: 'b1', nonStriker: 'b2', bowler: 'w1' }), null);
  assert.match(validateBall(empty, c, { striker: 'b1', nonStriker: 'b2', bowler: 'w1', extra: 'noball', wicket: { type: 'bowled' } }), /not possible/);
  assert.match(validateBall(empty, c, { striker: 'b1', nonStriker: 'b2', bowler: 'w1', extra: 'wide', wicket: { type: 'caught' } }), /not possible/);
  assert.equal(validateBall(empty, c, { striker: 'b1', nonStriker: 'b2', bowler: 'w1', extra: 'wide', wicket: { type: 'stumped' } }), null);
  assert.match(validateBall(empty, c, { striker: 'b1', nonStriker: 'b2', bowler: 'w1', wicket: { type: 'bowled', dismissed: 'nonStriker' } }), /run out/);
  assert.match(validateBall(empty, c, { striker: 'b1', nonStriker: 'b2', bowler: 'w1', runs: 9 }), /0 to 7/);
  assert.match(validateBall(empty, c, { striker: 'zz', nonStriker: 'b2', bowler: 'w1' }), /not in the batting XI/);
});

test('validateBall blocks changing bowler mid-over and consecutive overs', () => {
  const c = cfg();
  const mid = computeInnings([ball()], c);
  assert.match(validateBall(mid, c, { striker: 'b1', nonStriker: 'b2', bowler: 'w2' }), /middle of an over/);
  const six = computeInnings(Array.from({ length: 6 }, () => ball()), c);
  assert.match(validateBall(six, c, { striker: 'b2', nonStriker: 'b1', bowler: 'w1' }), /cannot bowl now/);
  assert.equal(validateBall(six, c, { striker: 'b2', nonStriker: 'b1', bowler: 'w2' }), null);
});

test('validateBall enforces the per-bowler over limit (ceil(overs/5))', () => {
  const c = cfg({ maxOvers: 5 }); // limit 1 over
  const d = [...Array.from({ length: 6 }, () => ball({ bowler: 'w1' })), ...Array.from({ length: 6 }, () => ball({ striker: 'b2', nonStriker: 'b1', bowler: 'w2' }))];
  const s = computeInnings(d, c);
  assert.equal(s.eligibleBowlers.includes('w1'), false);
  assert.equal(s.eligibleBowlers.includes('w3'), true);
});

test('validateBall requires the same batters after a wicket and a new batter in the empty slot', () => {
  const c = cfg();
  const s = computeInnings([ball({ wicket: { type: 'bowled' } })], c);
  assert.match(validateBall(s, c, { striker: 'b1', nonStriker: 'b2', bowler: 'w1' }), /already out/);
  assert.match(validateBall(s, c, { striker: 'b3', nonStriker: 'b4', bowler: 'w1' }), /Non-striker does not match/);
  assert.equal(validateBall(s, c, { striker: 'b3', nonStriker: 'b2', bowler: 'w1' }), null);
});

test('validateBall refuses scoring after the innings is complete', () => {
  const c = cfg({ target: 2 });
  const s = computeInnings([ball({ runs: 4 })], c);
  assert.match(validateBall(s, c, { striker: 'b1', nonStriker: 'b2', bowler: 'w1' }), /already complete/);
});

// ---------- results ----------
const mk = (runs, wickets, maxWickets = 10) => ({ runs, wickets, maxWickets });
const names = { A: 'Kanchipuram', B: 'Chennai' };

test('result: team batting second wins by wickets', () => {
  const r = computeResult({ first: mk(150, 10), second: mk(151, 3), firstTeam: 'A', secondTeam: 'B', names });
  assert.equal(r.winner, 'B');
  assert.deepEqual(r.margin, { type: 'wickets', value: 7 });
  assert.equal(r.summary, 'Chennai won by 7 wickets');
});

test('result: team batting first wins by runs', () => {
  const r = computeResult({ first: mk(182, 7), second: mk(176, 10), firstTeam: 'A', secondTeam: 'B', names });
  assert.equal(r.winner, 'A');
  assert.deepEqual(r.margin, { type: 'runs', value: 6 });
});

test('result: tie, with and without tie-breaker', () => {
  const tie = computeResult({ first: mk(100, 5), second: mk(100, 8), firstTeam: 'A', secondTeam: 'B', names });
  assert.equal(tie.tie, true);
  assert.equal(tie.winner, null);
  const tb = computeResult({ first: mk(100, 5), second: mk(100, 8), firstTeam: 'A', secondTeam: 'B', names, tieBreakWinner: 'B' });
  assert.equal(tb.winner, 'B');
  assert.equal(tb.byTieBreak, true);
});

test('result: wins by 1 wicket / 1 run use singular', () => {
  assert.match(computeResult({ first: mk(100, 5), second: mk(101, 9), firstTeam: 'A', secondTeam: 'B', names }).summary, /1 wicket$/);
  assert.match(computeResult({ first: mk(100, 5), second: mk(99, 9), firstTeam: 'A', secondTeam: 'B', names }).summary, /1 run$/);
});

test('player of the match prefers the winning side top performer', () => {
  const s1 = computeInnings([ball({ runs: 6 }), ball({ runs: 6 })], cfg());
  const s2 = computeInnings([
    { striker: 'b1', nonStriker: 'b2', bowler: 'w1', runs: 0, wicket: { type: 'bowled' } },
  ], cfg());
  const pom = pickPlayerOfMatch([{ team: 'A', state: s1 }, { team: 'B', state: s2 }], ['B', 'A'], 'A');
  assert.equal(pom.team, 'A');
  assert.equal(pom.id, 'b1');
});
