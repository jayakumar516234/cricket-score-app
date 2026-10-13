import { useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { api } from '../api.js';
import { useFetch } from '../useFetch.js';
import { ErrorBox, Field, Spinner, TeamLogo } from '../components/ui.jsx';

const FORMATS = [
  { v: 'T10', label: 'T10 (10 Overs)', overs: 10 },
  { v: 'T20', label: 'T20 (20 Overs)', overs: 20 },
  { v: 'ODI', label: 'ODI (50 Overs)', overs: 50 },
  { v: 'Custom', label: 'Custom' },
];

export default function CreateMatch() {
  const nav = useNavigate();
  const { data, loading, error } = useFetch('/teams?limit=100');
  const [f, setF] = useState({ name: '', homeTeam: '', awayTeam: '', format: 'T20', overs: '', date: '', venue: '', tossWinner: '', tossDecision: 'bat', tieBreaker: 'tie' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (patch) => setF((p) => ({ ...p, ...patch }));

  const myTeams = useMemo(() => (data?.items || []).filter((t) => t.canManage && t.playerCount >= 11), [data]);
  const opponents = useMemo(() => (data?.items || []).filter((t) => t.id !== f.homeTeam && t.playerCount >= 11), [data, f.homeTeam]);
  const home = data?.items.find((t) => t.id === f.homeTeam);
  const away = data?.items.find((t) => t.id === f.awayTeam);

  const changeHome = (id) => set({ homeTeam: id, awayTeam: f.awayTeam === id ? '' : f.awayTeam, tossWinner: '' });
  const changeAway = (id) => set({ awayTeam: id, tossWinner: '' });

  const submit = async (e) => {
    e.preventDefault();
    const er = {};
    if (!f.homeTeam) er.homeTeam = 'Select your team';
    if (!f.awayTeam) er.awayTeam = 'Select the opponent team';
    if (f.homeTeam && f.homeTeam === f.awayTeam) er.awayTeam = 'Opponent must be a different team';
    if (f.format === 'Custom' && !(Number.isInteger(Number(f.overs)) && Number(f.overs) >= 1 && Number(f.overs) <= 50)) er.overs = 'Enter overs between 1 and 50';
    if (!f.tossWinner) er.tossWinner = 'Select who won the toss';
    setErrors(er);
    setFormError('');
    if (Object.keys(er).length) return;
    setBusy(true);
    try {
      const body = { ...f, overs: f.format === 'Custom' ? Number(f.overs) : undefined, date: f.date ? new Date(f.date).toISOString() : undefined };
      const res = await api('/matches', { method: 'POST', body });
      nav(`/matches/${res.match.id}`);
    } catch (err) {
      setFormError(err.message);
      setBusy(false);
    }
  };

  if (loading) return <Spinner />;
  if (error) return <ErrorBox message={error} />;

  if (myTeams.length === 0) {
    return (
      <div className="space-y-3">
        <Link to="/matches" className="btn btn-ghost"><ArrowLeft className="h-4 w-4" /> Back</Link>
        <div className="card p-6 text-center">
          <h1 className="font-bold text-slate-900">Create your team first</h1>
          <p className="mt-1 text-sm text-slate-500">A match is played between your own team and an opponent. Add your team with at least 11 players to continue.</p>
          <Link to="/teams/new" className="btn btn-green mt-4">Create Team</Link>
        </div>
      </div>
    );
  }
  if (data.items.filter((t) => t.playerCount >= 11).length < 2) {
    return (
      <div className="space-y-3">
        <Link to="/matches" className="btn btn-ghost"><ArrowLeft className="h-4 w-4" /> Back</Link>
        <div className="card p-6 text-center">
          <h1 className="font-bold text-slate-900">No opponent team yet</h1>
          <p className="mt-1 text-sm text-slate-500">Your team is ready. You need one more team in the app to play against. Create the opponent team (with at least 11 players) or ask them to sign up.</p>
          <Link to="/teams/new" className="btn btn-green mt-4">Create opponent team</Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="mx-auto max-w-xl space-y-5">
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => nav(-1)} className="btn btn-ghost !p-2" aria-label="Go back"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="text-xl font-bold text-slate-900">Create Match</h1>
      </div>
      <ErrorBox message={formError} />
      <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">You will choose the playing 11 of each team when you start the match.</p>

      <section className="card space-y-4 p-4">
        <Field label="Match Name (optional)" htmlFor="mname"><input id="mname" className="input" value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder="Defaults to Team A vs Team B" maxLength={100} /></Field>
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="label !mb-0" htmlFor="home">Select Teams <span className="text-red-500">*</span></label>
            <span className="badge bg-green-100 text-green-700">Your Own Team</span>
          </div>
          <select id="home" className={`input ${errors.homeTeam ? 'input-error' : ''}`} value={f.homeTeam} onChange={(e) => changeHome(e.target.value)}>
            <option value="">Choose your team</option>
            {myTeams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          {errors.homeTeam && <p className="mt-1 text-xs text-red-600" role="alert">{errors.homeTeam}</p>}
        </div>
        <Field label="Opponent Team" required error={errors.awayTeam} htmlFor="away">
          <select id="away" className={`input ${errors.awayTeam ? 'input-error' : ''}`} value={f.awayTeam} onChange={(e) => changeAway(e.target.value)}>
            <option value="">Choose opponent</option>
            {opponents.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </Field>
      </section>

      <section className="card space-y-4 p-4">
        <fieldset>
          <legend className="label">Match Type</legend>
          <div className="grid grid-cols-2 gap-2">
            {FORMATS.map((o) => (
              <label key={o.v} className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-sm ${f.format === o.v ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}>
                <input type="radio" name="format" className="accent-blue-600" checked={f.format === o.v} onChange={() => set({ format: o.v })} /> {o.label}
              </label>
            ))}
          </div>
        </fieldset>
        {f.format === 'Custom' ? (
          <Field label="Number of Overs" required error={errors.overs} htmlFor="overs">
            <input id="overs" inputMode="numeric" className={`input ${errors.overs ? 'input-error' : ''}`} value={f.overs} onChange={(e) => set({ overs: e.target.value.replace(/\D/g, '') })} placeholder="1 to 50" />
          </Field>
        ) : (
          <p className="text-sm text-slate-600">Overs: <span className="font-semibold">{FORMATS.find((o) => o.v === f.format).overs}</span></p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Match Date (optional)" htmlFor="mdate"><input id="mdate" type="datetime-local" className="input" value={f.date} onChange={(e) => set({ date: e.target.value })} /></Field>
          <Field label="Venue (optional)" htmlFor="venue"><input id="venue" className="input" value={f.venue} onChange={(e) => set({ venue: e.target.value })} maxLength={100} /></Field>
        </div>
      </section>

      <section className="card space-y-4 p-4">
        <fieldset>
          <legend className="label">Toss Winner <span className="text-red-500">*</span></legend>
          {!home || !away ? <p className="text-sm text-slate-500">Select both teams first.</p> : (
            <div className="grid grid-cols-2 gap-2">
              {[home, away].map((t) => (
                <label key={t.id} className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-sm ${f.tossWinner === t.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}>
                  <input type="radio" name="toss" className="accent-blue-600" checked={f.tossWinner === t.id} onChange={() => set({ tossWinner: t.id })} />
                  <TeamLogo team={t} size={24} /> {t.name}
                </label>
              ))}
            </div>
          )}
          {errors.tossWinner && <p className="mt-1 text-xs text-red-600" role="alert">{errors.tossWinner}</p>}
        </fieldset>
        <fieldset>
          <legend className="label">Toss Decision</legend>
          <div className="grid grid-cols-2 gap-2">
            {[['bat', 'Bat first'], ['bowl', 'Bowl first']].map(([v, l]) => (
              <label key={v} className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-sm ${f.tossDecision === v ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}>
                <input type="radio" name="decision" className="accent-blue-600" checked={f.tossDecision === v} onChange={() => set({ tossDecision: v })} /> {l}
              </label>
            ))}
          </div>
        </fieldset>
        <Field label="If the scores are tied" htmlFor="tie" hint="Choose how a tied match is decided.">
          <select id="tie" className="input" value={f.tieBreaker} onChange={(e) => set({ tieBreaker: e.target.value })}>
            <option value="tie">Declare the match tied</option>
            <option value="manual">Pick the winner of a tie-breaker (e.g. super over, bowl-out)</option>
          </select>
        </Field>
      </section>

      <button className="btn btn-primary w-full" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Create Match</button>
    </form>
  );
}
