import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Crosshair, Loader2, Play, Trophy, Undo2, Crown, UserPlus, X } from 'lucide-react';
import { api } from '../api.js';
import { useFetch } from '../useFetch.js';
import { useAuth } from '../context/AuthContext.jsx';
import { ConfirmDialog, ErrorBox, Modal, Spinner, StatusBadge, TeamLogo, DropdownSelect, fmtDate } from '../components/ui.jsx';
import { BatTable, BowlTable, ExtrasLine, OverByOver, ScorecardTabs, teamOf } from '../components/ScoreParts.jsx';
import { useBallQueue } from '../useBallQueue.js';

const WICKET_LABELS = { bowled: 'Bowled', caught: 'Caught', lbw: 'LBW', runout: 'Run out', stumped: 'Stumped', hitwicket: 'Hit wicket' };
const ALLOWED = {
  none: ['bowled', 'caught', 'lbw', 'runout', 'stumped', 'hitwicket'],
  wide: ['stumped', 'runout', 'hitwicket'],
  noball: ['runout'],
  bye: ['runout', 'stumped'],
  legbye: ['runout'],
};
const EXTRA_BUTTONS = [['wide', 'Wide'], ['noball', 'No Ball'], ['bye', 'Bye'], ['legbye', 'Leg Bye']];
const RUN_BUTTONS = [0, 1, 2, 3, 4, 6];
const EXTRA_LABEL = { wide: 'Wide', noball: 'No Ball', bye: 'Bye', legbye: 'Leg Bye' };

export default function MatchPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { isSuper } = useAuth();
  const [poll, setPoll] = useState(4000);
  const { data: view, setData, error, loading, reload } = useFetch(`/matches/${id}`, { poll });
  const [busy, setBusy] = useState(false);
  const [actError, setActError] = useState('');

  useEffect(() => {
    if (view) setPoll(view.canManage || view.match.status === 'completed' ? 0 : 4000);
  }, [view?.canManage, view?.match.status]); // eslint-disable-line react-hooks/exhaustive-deps

  // Runs an API action, replaces the view with the server's answer, returns true on success.
  const act = async (fn) => {
    setBusy(true);
    setActError('');
    try {
      const res = await fn();
      if (res?.match) setData(res);
      return { ok: true, res };
    } catch (e) {
      setActError(e.message);
      return { ok: false, error: e };
    } finally {
      setBusy(false);
    }
  };

  const queueProps = useBallQueue({ matchId: id, view, setData, setActError, act });

  if (loading && !view) return <Spinner />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  const { match } = view;

  let body;
  if (match.status === 'completed') body = <ResultView view={view} />;
  else if (match.status === 'abandoned') body = <Banner tone="slate">This match was abandoned.</Banner>;
  else if (match.status === 'scheduled') body = <SetupView view={view} act={act} busy={busy} id={id} />;
  else {
    const inn = view.innings[match.currentInnings - 1];
    if (match.currentInnings === 1 && inn?.state.completed) body = <TargetView view={view} act={act} busy={busy} id={id} />;
    else body = <LiveView view={view} act={act} busy={busy} id={id} queueProps={queueProps} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link to="/matches" className="btn btn-ghost !p-2" aria-label="Back to matches"><ArrowLeft className="h-5 w-5" /></Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold text-slate-900">{match.homeTeam.name} vs {match.awayTeam.name}</h1>
          <p className="text-xs text-slate-500">{match.format} · {match.overs} overs{match.venue ? ` · ${match.venue}` : ''}{match.date ? ` · ${fmtDate(match.date)}` : ''}</p>
        </div>
        <StatusBadge status={match.status} />
      </div>
      <ErrorBox message={actError} />
      {body}
      {view.canManage && (match.status !== 'completed' || isSuper) && <ManagerTools view={view} act={act} busy={busy} id={id} nav={nav} />}
    </div>
  );
}

const Banner = ({ tone = 'blue', children }) => (
  <div className={`rounded-xl p-4 text-sm font-medium ${tone === 'green' ? 'bg-green-50 text-green-800 ring-1 ring-green-200' : tone === 'slate' ? 'bg-slate-200 text-slate-700' : 'bg-blue-50 text-blue-800 ring-1 ring-blue-200'}`}>{children}</div>
);

// ---------------------------------------------------------------- scheduled: choose the playing XI
const XI = 11;
let guestSeed = 0;

function SetupView({ view, act, busy, id }) {
  const { match } = view;
  const tossTeam = match.toss.winner === match.homeTeam.id ? match.homeTeam : match.awayTeam;
  const [home, setHome] = useState({ ids: [], guests: [] });
  const [away, setAway] = useState({ ids: [], guests: [] });
  const count = (v) => v.ids.length + v.guests.length;
  const ready = count(home) === XI && count(away) === XI;
  const payload = (v) => ({ playerIds: v.ids, guests: v.guests.map(({ name, role }) => ({ name, role })) });

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="flex items-center justify-around gap-2 text-center">
          {[match.homeTeam, match.awayTeam].map((t, i) => (
            <div key={t.id} className="flex flex-1 flex-col items-center gap-1">
              <TeamLogo team={t} size={56} />
              <span className="font-semibold text-slate-900">{t.name}</span>
              {i === 0 && <span className="badge bg-green-100 text-green-700">Your Own Team</span>}
            </div>
          ))}
        </div>
        <p className="mt-4 text-center text-sm text-slate-600">{tossTeam.name} won the toss and chose to {match.toss.decision} first.</p>
      </div>

      {view.canManage ? (
        <>
          <Banner>Choose the playing {XI} for both teams, then start the match. Need someone who is not in the list? Use "Add new player".</Banner>
          <div className="grid gap-3 lg:grid-cols-2">
            <XISide team={match.homeTeam} editable={view.canEditTeams.home} value={home} onChange={setHome} />
            <XISide team={match.awayTeam} editable={view.canEditTeams.away} value={away} onChange={setAway} />
          </div>
          <button className="btn btn-green w-full" disabled={busy || !ready}
            onClick={() => act(() => api(`/matches/${id}/start`, { method: 'POST', body: { home: payload(home), away: payload(away) } }))}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Start Match
          </button>
          {!ready && <p className="text-center text-xs text-slate-500">Select exactly {XI} players for each team to start ({match.homeTeam.name} {count(home)}/{XI}, {match.awayTeam.name} {count(away)}/{XI}).</p>}
        </>
      ) : <Banner>This match has not started yet.</Banner>}
    </div>
  );
}

function XISide({ team, editable, value, onChange }) {
  const { data, error, loading, reload } = useFetch(`/teams/${team.id}`);
  const [addOpen, setAddOpen] = useState(false);
  const inited = useRef(false);
  const players = data?.players || [];
  const count = value.ids.length + value.guests.length;

  useEffect(() => {
    // a squad of exactly 11 plays everyone by default
    if (data && !inited.current) {
      inited.current = true;
      if (data.players.length <= XI) onChange({ ...value, ids: data.players.map((p) => p.id) });
    }
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (pid) => {
    if (value.ids.includes(pid)) onChange({ ...value, ids: value.ids.filter((x) => x !== pid) });
    else if (count < XI) onChange({ ...value, ids: [...value.ids, pid] });
  };
  const removeGuest = (gid) => onChange({ ...value, guests: value.guests.filter((g) => g.id !== gid) });

  const addPlayer = async ({ name, role, jerseyNumber }) => {
    const taken = [...players.map((p) => p.name), ...value.guests.map((g) => g.name)].some((n) => n.toLowerCase() === name.toLowerCase());
    if (taken) throw new Error(`There is already a player named ${name}`);
    if (editable) {
      const res = await api(`/teams/${team.id}/players`, { method: 'POST', body: { name, role, jerseyNumber } });
      await reload();
      if (count < XI) onChange({ ...value, ids: [...value.ids, res.player.id] });
    } else {
      onChange({ ...value, guests: [...value.guests, { id: `g-${guestSeed++}`, name, role }] });
    }
  };

  return (
    <section className="card p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="font-bold text-slate-900">{team.name}</h2>
        <span className={`badge ${count === XI ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-800'}`}>{count}/{XI} selected</span>
      </div>
      {loading && !data ? <Spinner /> : error ? <ErrorBox message={error} onRetry={reload} /> : (
        <>
          <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
            {players.map((p) => {
              const checked = value.ids.includes(p.id);
              const full = !checked && count >= XI;
              return (
                <li key={p.id}>
                  <label className={`flex items-center gap-3 py-2 text-sm ${full ? 'opacity-50' : 'cursor-pointer'}`}>
                    <input type="checkbox" className="h-4 w-4 accent-pitch-600" checked={checked} disabled={full} onChange={() => toggle(p.id)} />
                    <span className="flex-1 font-medium text-slate-900">{p.name}</span>
                    <span className="text-xs text-slate-500">{p.role}{p.jerseyNumber != null ? ` · #${p.jerseyNumber}` : ''}</span>
                  </label>
                </li>
              );
            })}
            {value.guests.map((g) => (
              <li key={g.id} className="flex items-center gap-3 py-2 text-sm">
                <span className="flex h-4 w-4 items-center justify-center rounded bg-pitch-600 text-white"><UserPlus className="h-3 w-3" aria-hidden /></span>
                <span className="flex-1 font-medium text-slate-900">{g.name} <span className="badge bg-blue-100 text-blue-700">this match only</span></span>
                <span className="text-xs text-slate-500">{g.role}</span>
                <button type="button" onClick={() => removeGuest(g.id)} className="text-slate-400 hover:text-red-600" aria-label={`Remove ${g.name}`}><X className="h-4 w-4" /></button>
              </li>
            ))}
          </ul>
          {count >= XI && players.length > XI && <p className="mt-2 text-xs text-slate-500">11 selected. Untick a player to choose someone else.</p>}
          <button type="button" className="btn btn-outline mt-3 w-full" onClick={() => setAddOpen(true)}><UserPlus className="h-4 w-4" /> Add new player</button>
          <p className="mt-1 text-xs text-slate-500">{editable ? `New players are saved into ${team.name}.` : `${team.name} is not your team, so a new player is added for this match only.`}</p>
        </>
      )}
      <AddPlayerModal open={addOpen} onClose={() => setAddOpen(false)} teamName={team.name} onAdd={addPlayer} />
    </section>
  );
}

function AddPlayerModal({ open, onClose, teamName, onAdd }) {
  const [f, setF] = useState({ name: '', role: 'Batsman', jersey: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setF({ name: '', role: 'Batsman', jersey: '' }); setErr(''); } }, [open]);
  const submit = async (e) => {
    e.preventDefault();
    if (!f.name.trim()) return setErr('Enter the player name');
    setBusy(true);
    setErr('');
    try {
      await onAdd({ name: f.name.trim(), role: f.role, jerseyNumber: f.jersey === '' ? null : Number(f.jersey) });
      onClose();
    } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  return (
    <Modal open={open} onClose={onClose} title={`Add player to ${teamName}`}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <ErrorBox message={err} />
        <div><label className="label" htmlFor="np-name">Player name <span className="text-red-500">*</span></label><input id="np-name" className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} maxLength={60} autoFocus /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label" htmlFor="np-role">Role</label>
            <DropdownSelect id="np-role" value={f.role} onChange={(v) => setF({ ...f, role: v })} options={['Batsman', 'Bowler', 'All-rounder', 'Wicket Keeper']} />
          </div>
          <div><label className="label" htmlFor="np-jersey">Jersey no (optional)</label><input id="np-jersey" inputMode="numeric" className="input" value={f.jersey} onChange={(e) => setF({ ...f, jersey: e.target.value.replace(/\D/g, '') })} /></div>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Add player</button>
        </div>
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------- target page
function TargetView({ view, act, busy, id }) {
  const { match } = view;
  const first = view.innings[0];
  const s = first.state;
  const battedFirst = teamOf(view, first.battingTeam);
  const chasing = teamOf(view, first.bowlingTeam);
  const target = s.runs + 1;
  const [undoOpen, setUndoOpen] = useState(false);
  return (
    <div className="mx-auto max-w-md space-y-4">
      <div className="rounded-2xl bg-gradient-to-b from-navy-900 to-navy-700 p-5 text-center text-white">
        <p className="text-sm text-slate-300">{battedFirst.name} finished on</p>
        <p className="text-3xl font-extrabold">{s.runs}/{s.wickets} <span className="text-base font-medium text-slate-300">({s.overs} ov)</span></p>
      </div>
      <div className="card p-6 text-center">
        <Crosshair className="mx-auto h-9 w-9 text-pitch-600" aria-hidden />
        <p className="mt-1 text-lg font-bold text-slate-900">Target</p>
        <p className="text-6xl font-extrabold text-slate-900">{target}</p>
        <p className="text-lg font-semibold text-slate-700">Runs</p>
        <p className="mt-3 text-slate-600"><span className="font-semibold">{chasing.name}</span> need {target} runs in {match.overs} overs</p>
        {view.canManage ? (
          <>
            <button className="btn btn-green mt-5 w-full" disabled={busy} onClick={() => act(() => api(`/matches/${id}/continue`, { method: 'POST' }))}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Continue
            </button>
            <button className="btn btn-ghost mt-2 w-full" onClick={() => setUndoOpen(true)}><Undo2 className="h-4 w-4" /> Undo last ball</button>
          </>
        ) : <p className="mt-4 text-sm text-slate-500">Waiting for the second innings to start.</p>}
      </div>
      <ConfirmDialog open={undoOpen} title="Undo last ball?" message="The last ball of the first innings will be removed. This is recorded in the audit log." confirmLabel="Undo last ball" busy={busy}
        onCancel={() => setUndoOpen(false)} onConfirm={async () => { await act(() => api(`/matches/${id}/balls/last`, { method: 'DELETE' })); setUndoOpen(false); }} />
      <ScorecardTabs view={view} />
    </div>
  );
}

// ---------------------------------------------------------------- live scoring
function LiveView({ view, act, busy, id, queueProps }) {
  const { match } = view;
  const inn = view.innings[match.currentInnings - 1];
  const st = inn.state;
  const batting = teamOf(view, inn.battingTeam);
  const bowling = teamOf(view, inn.bowlingTeam);
  const manage = view.canManage;
  const { queue, syncStatus, sendBall, undoBall } = queueProps || { queue: [], syncStatus: 'synced', sendBall: () => {}, undoBall: () => {} };

  const [extra, setExtra] = useState(null);
  const [extraRuns, setExtraRuns] = useState(0); // runs on a wide / no ball / bye / leg bye ball, chosen before confirming
  const [wicketType, setWicketType] = useState(null); // 'runout' when opened from the Run Out button
  const [sel, setSel] = useState({ striker: '', nonStriker: '', bowler: '' });
  const [wicketOpen, setWicketOpen] = useState(false);
  const [undoOpen, setUndoOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [endForce, setEndForce] = useState(false);
  const [tieWinner, setTieWinner] = useState('');
  const [tieDecision, setTieDecision] = useState('draw');
  const [showCard, setShowCard] = useState(false);

  const striker = st.striker || sel.striker;
  const nonStriker = st.nonStriker || sel.nonStriker;
  const bowler = st.bowler || sel.bowler;
  const nameOf = (list, pid) => list.find((p) => p.id === pid)?.name;
  const ready = !st.completed && striker && nonStriker && bowler && striker !== nonStriker;
  const hasBalls = st.balls.length > 0;

  const atCrease = st.battingCard.filter((b) => !b.out && (b.id === st.striker || b.id === st.nonStriker));
  const rrr = st.target != null && st.ballsRemaining > 0 ? ((st.runsRequired / st.ballsRemaining) * 6).toFixed(2) : null;
  const firstInnings = view.innings[0]?.state;
  const isTied = match.currentInnings === 2 && firstInnings && st.runs === firstInnings.runs;
  const needsTieWinner = isTied && tieDecision === 'super_over';

  const send = (runs, wicket, ex = extra) => {
    const candidate = { striker, nonStriker, bowler, runs, extra: ex, wicket: wicket || null };
    sendBall(candidate);
    setExtra(null);
    setExtraRuns(0);
    setSel({ striker: '', nonStriker: '', bowler: '' });
    return true;
  };

  const handleUndo = async () => {
    setUndoOpen(false);
    await undoBall();
  };

  const batterOptions = (exclude) => st.availableBatters.filter((p) => p.id !== exclude);

  const endMatch = async () => {
    const winnerToSend = isTied && tieDecision === 'super_over' ? tieWinner : undefined;
    const r = await act(() => api(`/matches/${id}/finish`, { method: 'POST', body: { force: endForce || undefined, tieBreakWinner: winnerToSend } }));
    if (r.ok) setEndOpen(false);
  };

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-2xl bg-navy-900 text-white shadow">
        <div className="flex items-center justify-between bg-navy-950 px-4 py-2 text-sm">
          <span className="text-slate-300">Innings {inn.number} · {bowling.name} bowling</span>
          <div className="flex items-center gap-2">
            {syncStatus === 'syncing' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-300">
                <Loader2 className="h-3 w-3 animate-spin" /> Syncing ({queue.length})
              </span>
            )}
            {syncStatus === 'offline' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/20 px-2 py-0.5 text-xs text-rose-300">
                Saved offline ({queue.length})
              </span>
            )}
            {syncStatus === 'synced' && queue.length === 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                ✓ Saved
              </span>
            )}
            <span className="badge bg-red-600 text-white"><span className="mr-1.5 h-1.5 w-1.5 animate-pulse rounded-full bg-white" />LIVE</span>
          </div>
        </div>
        <div className="space-y-4 p-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <TeamLogo team={batting} size={32} /><h2 className="text-lg font-bold">{batting.name}</h2>
                {batting.id === match.homeTeam.id && <span className="badge bg-pitch-600/30 text-pitch-400">Your team</span>}
              </div>
              <p className="mt-1 text-4xl font-extrabold">{st.runs}/{st.wickets} <span className="text-lg font-medium text-slate-300">({st.overs} ov)</span></p>
            </div>
            <div className="text-right text-sm text-slate-300">
              {st.completed ? <p className="font-semibold text-white">Innings complete</p> : <p className="text-base font-bold text-white">Over {Math.min(st.currentOver + 1, st.maxOvers)} of {st.maxOvers}</p>}
              <p>Run rate: <span className="font-semibold text-white">{st.runRate.toFixed(2)}</span></p>
              <p>{st.ballsRemaining} ball{st.ballsRemaining === 1 ? '' : 's'} left</p>
            </div>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/15" role="progressbar" aria-label="Overs completed" aria-valuemin={0} aria-valuemax={st.maxOvers * 6} aria-valuenow={st.legalBalls}>
            <div className="h-full rounded-full bg-pitch-500" style={{ width: `${Math.min(100, (st.legalBalls / (st.maxOvers * 6)) * 100)}%` }} />
          </div>

          {st.target != null && (
            <p className="rounded-lg bg-white/10 px-3 py-2 text-sm">
              Target <span className="font-bold">{st.target}</span> · need <span className="font-bold text-pitch-400">{st.runsRequired}</span> from <span className="font-bold">{st.ballsRemaining}</span> balls{rrr && <> · RRR <span className="font-bold">{rrr}</span></>}
            </p>
          )}

          {atCrease.length > 0 && <BatTable dark state={{ ...st, battingCard: atCrease }} />}
          <BowlTable dark state={{ ...st, bowlingCard: st.bowlingCard.filter((b) => b.id === st.bowler || b.id === st.lastOverBowler || st.bowlingCard.length <= 2) }} />
          <ExtrasLine dark state={st} />
          <OverByOver dark state={st} />
        </div>
      </section>

      {manage && !st.completed && (
        <>
          {(!ready) && (
            <section className="card space-y-3 p-4" aria-label="Choose players">
              <h3 className="font-bold text-slate-900">{!hasBalls ? 'Select openers and the first bowler' : 'Choose the next players'}</h3>
              {!st.striker && (
                <div>
                  <label className="label" htmlFor="sel-striker">{hasBalls ? 'New batter' : 'Striker'}</label>
                  <DropdownSelect
                    id="sel-striker"
                    value={sel.striker}
                    onChange={(v) => setSel({ ...sel, striker: v })}
                    options={batterOptions(sel.nonStriker).map((p) => ({ value: p.id, label: p.name }))}
                    placeholder="Select batter"
                  />
                </div>
              )}
              {!st.nonStriker && (
                <div>
                  <label className="label" htmlFor="sel-non">{hasBalls && st.striker ? 'New batter' : 'Non-striker'}</label>
                  <DropdownSelect
                    id="sel-non"
                    value={sel.nonStriker}
                    onChange={(v) => setSel({ ...sel, nonStriker: v })}
                    options={batterOptions(sel.striker).map((p) => ({ value: p.id, label: p.name }))}
                    placeholder="Select batter"
                  />
                </div>
              )}
              {!st.bowler && (
                <div>
                  <label className="label" htmlFor="sel-bowler">{hasBalls ? 'Next bowler' : 'Bowler'}</label>
                  <DropdownSelect
                    id="sel-bowler"
                    value={sel.bowler}
                    onChange={(v) => setSel({ ...sel, bowler: v })}
                    options={st.eligibleBowlers.map((p) => ({ value: p.id, label: p.name }))}
                    placeholder="Select bowler"
                  />
                  <p className="mt-1 text-xs text-slate-500">A bowler cannot bowl two overs in a row or more than {Math.ceil(match.overs / 5)} over{Math.ceil(match.overs / 5) === 1 ? '' : 's'}.</p>
                </div>
              )}
              <p className="text-xs text-slate-500">Scoring buttons unlock after every player above is selected.</p>
            </section>
          )}

          {ready && (
            <p className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-900">
              <span className="font-semibold">Over {st.currentOver + 1}, ball {(st.legalBalls % 6) + 1}.</span>{' '}
              {nameOf(st.battingCard, striker) || nameOf(st.availableBatters, striker)}* is facing {st.bowlerName || nameOf(st.eligibleBowlers, bowler)}
              {' '}(with {nameOf(st.battingCard, nonStriker) || nameOf(st.availableBatters, nonStriker)} at the other end). Tap what happened on this ball.
            </p>
          )}

          <section className="card space-y-3 p-3" aria-label="Scoring controls">
            {queue.length > 0 && (
              <div className="flex items-center justify-between rounded-lg bg-navy-950 p-2.5 text-xs text-pitch-300 ring-1 ring-pitch-500/30">
                <span>⚡ Score updated instantly! Saving {queue.length} ball{queue.length > 1 ? 's' : ''} to server in background...</span>
                {syncStatus === 'syncing' && <Loader2 className="h-3.5 w-3.5 animate-spin text-pitch-400" />}
              </div>
            )}
            <div className="grid grid-cols-4 gap-2">
              {EXTRA_BUTTONS.map(([v, label]) => (
                <button key={v} type="button" aria-pressed={extra === v} disabled={!ready} onClick={() => { setExtra(extra === v ? null : v); setExtraRuns(0); }}
                  className={`btn !px-1 ${extra === v ? 'bg-amber-400 text-amber-950' : 'bg-slate-100 text-slate-800 hover:bg-slate-200'}`}>{label}</button>
              ))}
            </div>

            {extra ? (
              <div className="space-y-3 rounded-lg bg-amber-50 p-3 ring-1 ring-amber-200">
                <p className="text-sm font-semibold text-amber-900">
                  {EXTRA_LABEL[extra]}: how many runs did they run? {(extra === 'wide' || extra === 'noball') && <span className="font-normal">(the 1 extra run is added automatically)</span>}
                </p>
                <div className="grid grid-cols-6 gap-2">
                  {RUN_BUTTONS.map((r) => (
                    <button key={r} type="button" disabled={!ready} aria-pressed={extraRuns === r} onClick={() => setExtraRuns(r)}
                      className={`btn !px-0 !py-3 text-base ${extraRuns === r ? 'bg-amber-500 text-amber-950 ring-2 ring-amber-700' : 'bg-white text-slate-800 ring-1 ring-slate-300 hover:bg-slate-50'}`}>{r}</button>
                  ))}
                </div>
                <p className="text-center text-sm text-amber-900">
                  {EXTRA_LABEL[extra]}{extraRuns ? ` + ${extraRuns} run${extraRuns > 1 ? 's' : ''}` : ''} = <span className="font-bold">{extraRuns + (extra === 'wide' || extra === 'noball' ? 1 : 0)} for the team</span>
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" disabled={!ready} onClick={() => send(extraRuns, null)} className="btn btn-green">Add this ball</button>
                  <button type="button" disabled={!ready} onClick={() => { setWicketType('runout'); setWicketOpen(true); }} className="btn btn-danger">+ Run out / Wicket</button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-6 gap-2">
                {RUN_BUTTONS.map((r) => (
                  <button key={r} type="button" disabled={!ready} onClick={() => send(r)}
                    className={`btn !px-0 !py-3 text-base ${r === 4 ? 'bg-blue-600 text-white hover:bg-blue-700' : r === 6 ? 'bg-pitch-600 text-white hover:bg-pitch-700' : 'bg-navy-800 text-white hover:bg-navy-700'}`}>
                    {r === 0 ? 'Dot' : r}
                  </button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              <button type="button" disabled={!ready} onClick={() => { setWicketType(null); setWicketOpen(true); }} className="btn btn-danger">Wicket</button>
              <button type="button" disabled={!ready} onClick={() => { setWicketType('runout'); setWicketOpen(true); }} className="btn border border-red-300 bg-red-50 text-red-700 hover:bg-red-100">Run Out</button>
              <button type="button" disabled={busy || (!hasBalls && queue.length === 0)} onClick={() => setUndoOpen(true)} className="btn btn-outline"><Undo2 className="h-4 w-4" /> Undo</button>
            </div>
            <details className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
              <summary className="cursor-pointer font-semibold text-slate-700">How to score (simple guide)</summary>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li><span className="font-semibold">Dot, 1, 2, 3, 4, 6</span>: the runs the batter scored on this ball. Tap once and it is saved.</li>
                <li><span className="font-semibold">Wide, No Ball, Bye, Leg Bye</span>: tap the type first, choose the runs, then press <span className="font-semibold">Add this ball</span>. Wides and no balls are not counted in the over.</li>
                <li><span className="font-semibold">Wicket</span>: choose how the batter got out. <span className="font-semibold">Run Out</span>: choose how many runs were completed and who is out.</li>
                <li><span className="font-semibold">Wide + 2 runs + run out</span>: tap Wide, choose 2, then press <span className="font-semibold">+ Run out / Wicket</span>.</li>
                <li>After a wicket, choose the new batter. After 6 balls, choose the next bowler.</li>
                <li>Made a mistake? <span className="font-semibold">Undo</span> removes the last ball.</li>
              </ul>
            </details>
          </section>
        </>
      )}

      {manage && st.completed && match.currentInnings === 2 && (
        isTied ? (
          <section className="card space-y-4 border-2 border-amber-500 bg-amber-50/50 p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-xl text-white">
                🤝
              </span>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Match Tied! Scores are Level</h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Both teams completed their innings on <strong className="text-slate-900">{st.runs} runs</strong>. Choose how you want to settle the match result:
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-amber-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className={`flex cursor-pointer flex-col rounded-xl border-2 p-3 transition ${tieDecision === 'draw' ? 'border-blue-600 bg-blue-50/80 shadow-sm' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="tie_opt"
                      className="accent-blue-600"
                      checked={tieDecision === 'draw'}
                      onChange={() => { setTieDecision('draw'); setTieWinner(''); }}
                    />
                    <span className="font-bold text-sm text-slate-900">🤝 Declare Match Drawn / Tied</span>
                  </div>
                  <span className="text-xs text-slate-500 mt-1 pl-6">
                    Declare match as an official Draw / Tie with equal points.
                  </span>
                </label>

                <label className={`flex cursor-pointer flex-col rounded-xl border-2 p-3 transition ${tieDecision === 'super_over' ? 'border-amber-600 bg-amber-100/70 shadow-sm' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="tie_opt"
                      className="accent-amber-600"
                      checked={tieDecision === 'super_over'}
                      onChange={() => setTieDecision('super_over')}
                    />
                    <span className="font-bold text-sm text-slate-900">⚡ Decide via Super Over</span>
                  </div>
                  <span className="text-xs text-slate-500 mt-1 pl-6">
                    Play a Super Over and select the winning team below.
                  </span>
                </label>
              </div>

              {tieDecision === 'super_over' && (
                <div className="rounded-xl border border-amber-300 bg-white p-3.5 space-y-2">
                  <label className="label font-bold text-slate-900">
                    Who won the Super Over?
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[match.homeTeam, match.awayTeam].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTieWinner(t.id)}
                        className={`btn text-xs font-bold py-2.5 transition ${tieWinner === t.id ? 'btn-green ring-2 ring-emerald-500' : 'btn-outline text-slate-700 hover:bg-slate-100'}`}
                      >
                        🏆 {t.name}
                      </button>
                    ))}
                  </div>
                  {!tieWinner && (
                    <p className="text-xs text-amber-700 font-medium">Please select which team won the Super Over before finishing.</p>
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  className="btn btn-green font-bold"
                  disabled={busy || (tieDecision === 'super_over' && !tieWinner)}
                  onClick={() => { setEndForce(false); setEndOpen(true); }}
                >
                  <Trophy className="h-4 w-4" /> Finish & Publish Result
                </button>
                <button className="btn btn-outline" disabled={busy || !hasBalls} onClick={() => setUndoOpen(true)}>
                  <Undo2 className="h-4 w-4" /> Undo Last Ball
                </button>
              </div>
            </div>
          </section>
        ) : (
          <section className="card space-y-3 border-l-4 border-pitch-600 p-4">
            <h3 className="font-bold text-slate-900">Innings complete</h3>
            <p className="text-sm text-slate-600">The second innings is over. End the match to publish the result.</p>
            <div className="flex flex-wrap gap-2">
              <button className="btn btn-green" disabled={busy} onClick={() => { setEndForce(false); setEndOpen(true); }}><Trophy className="h-4 w-4" /> End Match</button>
              <button className="btn btn-outline" disabled={busy || !hasBalls} onClick={() => setUndoOpen(true)}><Undo2 className="h-4 w-4" /> Undo Last Ball</button>
            </div>
          </section>
        )
      )}

      {manage && match.currentInnings === 2 && !st.completed && (
        <button className="btn btn-ghost w-full text-slate-500" onClick={() => { setEndForce(true); setEndOpen(true); }}>End match early</button>
      )}

      {!manage && <Banner>Live scores refresh automatically every few seconds.</Banner>}

      <button className="btn btn-outline w-full" onClick={() => setShowCard(!showCard)}>{showCard ? 'Hide' : 'Show'} full scorecard and commentary</button>
      {showCard && <ScorecardTabs view={view} />}

      <WicketModal open={wicketOpen} onClose={() => setWicketOpen(false)} initialExtra={extra} initialRuns={extra ? extraRuns : 0} initialType={wicketType} busy={busy}
        names={{ striker: nameOf(st.battingCard, striker) || nameOf(st.availableBatters, striker), nonStriker: nameOf(st.battingCard, nonStriker) || nameOf(st.availableBatters, nonStriker) }}
        onSubmit={(runs, wicket, ex) => { send(runs, wicket, ex); setWicketOpen(false); }} />

      <ConfirmDialog open={undoOpen} title="Undo last ball?" confirmLabel="Undo last ball" busy={busy} onCancel={() => setUndoOpen(false)}
        message="The last ball will be removed and the scorecard recalculated."
        onConfirm={handleUndo} />

      <ConfirmDialog
        open={endOpen}
        title={endForce ? 'End match early?' : isTied ? 'Confirm match result' : 'End match?'}
        confirmLabel="Confirm & Finish"
        busy={busy}
        onCancel={() => setEndOpen(false)}
        message={
          endForce
            ? 'The second innings is still in progress. The result will be calculated from the current scores.'
            : isTied
            ? tieDecision === 'super_over'
              ? `Finalise match with ${match.homeTeam.id === tieWinner ? match.homeTeam.name : match.awayTeam.name} winning the Super Over?`
              : 'Finalise match as an official Draw / Tie?'
            : 'This finalises the result. Only the Super Admin can correct a completed match.'
        }
        onConfirm={endMatch}
      />
    </div>
  );
}

// One dialog for everything that can happen together on a ball:
// e.g. Wide + 2 runs + Run out, No ball + 1 run + Run out, Bye + 1 + Run out, or a plain wicket.
function WicketModal({ open, onClose, initialExtra, initialRuns = 0, initialType = null, names, busy, onSubmit }) {
  const [ex, setEx] = useState(null);
  const [type, setType] = useState('bowled');
  const [dismissed, setDismissed] = useState('striker');
  const [runs, setRuns] = useState(0);
  const [fielder, setFielder] = useState('');
  const types = ALLOWED[ex || 'none'];

  useEffect(() => {
    if (open) {
      const allowed = ALLOWED[initialExtra || 'none'];
      setEx(initialExtra || null);
      setType(initialType && allowed.includes(initialType) ? initialType : allowed[0]);
      setDismissed('striker'); setRuns(initialRuns || 0); setFielder('');
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const pickExtra = (v) => {
    setEx(v);
    if (!ALLOWED[v || 'none'].includes(type)) setType(ALLOWED[v || 'none'][0]);
  };

  const isRunOut = type === 'runout';
  const usedRuns = isRunOut ? runs : 0;
  const teamRuns = usedRuns + (ex === 'wide' || ex === 'noball' ? 1 : 0);
  const outName = isRunOut && dismissed === 'nonStriker' ? names.nonStriker : names.striker;
  const preview = [ex ? EXTRA_LABEL[ex] : 'Normal ball', usedRuns ? `${usedRuns} run${usedRuns > 1 ? 's' : ''}` : null, `${WICKET_LABELS[type]} (${outName || 'batter'})`].filter(Boolean).join(' + ');

  const submit = (e) => {
    e.preventDefault();
    onSubmit(usedRuns, { type, dismissed: isRunOut ? dismissed : 'striker', fielder: fielder.trim() || undefined }, ex);
  };

  return (
    <Modal open={open} onClose={onClose} title="Wicket">
      <form onSubmit={submit} className="space-y-4">
        <fieldset>
          <legend className="label">What kind of ball was it?</legend>
          <div className="flex flex-wrap gap-2">
            {[[null, 'Normal'], ['wide', 'Wide'], ['noball', 'No Ball'], ['bye', 'Bye'], ['legbye', 'Leg Bye']].map(([v, l]) => (
              <button key={l} type="button" onClick={() => pickExtra(v)} aria-pressed={ex === v}
                className={`btn !py-1.5 ${ex === v ? 'bg-amber-400 text-amber-950' : 'bg-slate-100 text-slate-800 hover:bg-slate-200'}`}>{l}</button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="label">How was the batter out?</legend>
          <div className="grid grid-cols-2 gap-2">
            {types.map((t) => (
              <label key={t} className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-sm ${type === t ? 'border-red-500 bg-red-50' : 'border-slate-200'}`}>
                <input type="radio" name="wtype" className="accent-red-600" checked={type === t} onChange={() => setType(t)} /> {WICKET_LABELS[t]}
              </label>
            ))}
          </div>
          {ex && <p className="mt-1 text-xs text-slate-500">On a {EXTRA_LABEL[ex].toLowerCase()}, only {types.map((t) => WICKET_LABELS[t].toLowerCase()).join(', ')} {types.length === 1 ? 'is' : 'are'} possible.</p>}
        </fieldset>
        {isRunOut && (
          <>
            <fieldset>
              <legend className="label">Who is out?</legend>
              <div className="grid grid-cols-2 gap-2">
                {[['striker', names.striker], ['nonStriker', names.nonStriker]].map(([v, n]) => (
                  <label key={v} className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-sm ${dismissed === v ? 'border-red-500 bg-red-50' : 'border-slate-200'}`}>
                    <input type="radio" name="wout" className="accent-red-600" checked={dismissed === v} onChange={() => setDismissed(v)} /> <span>{n}<span className="block text-xs text-slate-500">{v === 'striker' ? 'Striker' : 'Non-striker'}</span></span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div>
              <label className="label" htmlFor="w-runs">{ex === 'wide' || ex === 'noball' ? `Runs run before the run out (the 1 ${EXTRA_LABEL[ex].toLowerCase()} run is added automatically)` : 'Runs completed before the run out'}</label>
              <DropdownSelect id="w-runs" value={runs} onChange={(v) => setRuns(Number(v))} options={[0, 1, 2, 3, 4, 5, 6].map((r) => ({ value: r, label: String(r) }))} />
            </div>
          </>
        )}
        {['caught', 'stumped', 'runout'].includes(type) && (
          <div>
            <label className="label" htmlFor="w-fielder">{type === 'stumped' ? 'Wicket keeper (optional)' : 'Fielder (optional)'}</label>
            <input id="w-fielder" className="input" value={fielder} onChange={(e) => setFielder(e.target.value)} maxLength={60} />
          </div>
        )}
        <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
          <p className="font-semibold">{preview}</p>
          <p className="text-xs text-slate-500">Team score goes up by {teamRuns} run{teamRuns === 1 ? '' : 's'}{ex === 'wide' || ex === 'noball' ? '. This ball does not count in the over.' : '.'}</p>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-danger" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Confirm wicket</button>
        </div>
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------- result
function ResultView({ view }) {
  const { match } = view;
  const r = match.result;
  const home = match.homeTeam;
  const away = match.awayTeam;
  const scoreOf = (team) => view.innings.find((i) => i.battingTeam === team.id)?.state;
  const won = r.winner === home.id;
  const lost = r.winner === away.id;
  const headline = r.byTieBreak
    ? (won ? '🎉 Won the Super Over!' : `${r.winner === away.id ? away.name : 'Opponent'} Won the Super Over!`)
    : r.winner
    ? (won ? 'Congratulations! You Won the Match!' : 'Better Luck Next Time!')
    : '🤝 Match Tied / Drawn!';
  const pom = match.playerOfMatch;

  return (
    <div className="mx-auto max-w-md space-y-4">
      <section className="rounded-2xl bg-gradient-to-b from-navy-950 to-navy-800 p-6 text-center text-white shadow">
        <Trophy className={`mx-auto h-14 w-14 ${!r.winner ? 'text-amber-400' : lost ? 'text-slate-400' : 'text-amber-400'}`} aria-hidden />
        <h2 className="mt-2 text-2xl font-extrabold">{headline}</h2>
        <p className="mt-1 text-slate-300 font-medium">{r.summary}</p>
        {!r.winner && (
          <p className="mt-1 text-xs text-amber-200/90">Both teams finished with equal scores. The match ended in an official Draw.</p>
        )}
        {r.byTieBreak && (
          <p className="mt-1 text-xs text-amber-200/90">Scores were level after regular overs. Decided via Super Over.</p>
        )}
        {r.winner && !r.byTieBreak && <p className="mt-1 text-xs text-slate-400">{won ? `${home.name} is your own team` : `Your own team is ${home.name}`}</p>}
        <div className="mt-5 grid grid-cols-2 gap-3">
          {[home, away].map((t) => {
            const s = scoreOf(t);
            return (
              <div key={t.id} className={`rounded-xl border p-3 ${r.winner === t.id ? 'border-pitch-400 bg-pitch-600/20' : 'border-white/15 bg-white/5'}`}>
                <p className="text-sm font-semibold">{t.name}</p>
                <p className="text-2xl font-bold">{s ? `${s.runs}/${s.wickets}` : '-'}</p>
                <p className="text-xs text-slate-300">{s ? `(${s.overs} ov)` : ''}</p>
              </div>
            );
          })}
        </div>
        {pom && (
          <div className="mt-4 rounded-xl border border-white/15 bg-white/5 p-3">
            <p className="flex items-center justify-center gap-1.5 text-sm font-semibold text-amber-300"><Crown className="h-4 w-4" aria-hidden /> Player of the Match</p>
            <p className="mt-1 text-lg font-bold">{pom.name}</p>
            {pom.summary && <p className="text-sm text-slate-300">{pom.summary}</p>}
          </div>
        )}
      </section>
      <div className="grid gap-2">
        <Link to={`/matches/${match.id}/scorecard`} className="btn btn-green">View Scorecard</Link>
        <Link to="/" className="btn btn-outline">Back to Home</Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- admin tools
function ManagerTools({ view, act, busy, id, nav }) {
  const { match } = view;
  const [dialog, setDialog] = useState(null);
  const [reason, setReason] = useState('');
  const items = [];
  if (match.status === 'scheduled' || match.status === 'live') items.push(['abandon', 'Abandon match']);
  if (match.status === 'completed') items.push(['reopen', 'Reopen to correct the score']);
  items.push(['delete', 'Delete match']);

  const run = async () => {
    if (dialog === 'abandon') {
      const r = await act(() => api(`/matches/${id}`, { method: 'PUT', body: { status: 'abandoned' } }));
      if (r.ok) setDialog(null);
    } else if (dialog === 'reopen') {
      const r = await act(() => api(`/matches/${id}/reopen`, { method: 'POST', body: { reason } }));
      if (r.ok) { setDialog(null); setReason(''); }
    } else if (dialog === 'delete') {
      const r = await act(() => api(`/matches/${id}`, { method: 'DELETE' }));
      if (r.ok) nav('/matches');
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="mb-2 text-xs font-semibold text-slate-500">Match administration</p>
      <div className="flex flex-wrap gap-2">
        {items.map(([k, label]) => <button key={k} className={`btn btn-outline !py-1.5 ${k === 'delete' ? 'text-red-600' : ''}`} onClick={() => setDialog(k)}>{label}</button>)}
      </div>
      <ConfirmDialog open={!!dialog} danger={dialog === 'delete' || dialog === 'abandon'} busy={busy} onCancel={() => setDialog(null)} onConfirm={run}
        title={{ abandon: 'Abandon match?', reopen: 'Reopen this match?', delete: 'Delete match?' }[dialog] || ''}
        confirmLabel={{ abandon: 'Abandon', reopen: 'Reopen match', delete: 'Delete match' }[dialog] || 'Confirm'}
        message={{
          abandon: 'The match will be marked as abandoned and scoring stops.',
          reopen: 'Only the Super Admin can do this. The result is cleared so you can undo balls and re-finish the match. A reason is required and is saved in the audit log.',
          delete: 'This permanently deletes the match and every ball scored. Completed matches can only be deleted by the Super Admin.',
        }[dialog] || ''}>
        {dialog === 'reopen' && (
          <div className="mt-3">
            <label className="label" htmlFor="reopen-reason">Reason for the correction</label>
            <textarea id="reopen-reason" rows={2} className="input" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
        )}
      </ConfirmDialog>
    </section>
  );
}
