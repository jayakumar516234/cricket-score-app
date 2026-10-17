import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Handshake, Users } from 'lucide-react';
import { api } from '../api.js';
import { useFetch } from '../useFetch.js';
import { useAuth } from '../context/AuthContext.jsx';
import { ErrorBox, Field, Spinner, TeamLogo, DropdownSelect } from '../components/ui.jsx';

const FORMATS = [
  { v: 'T10', label: 'T10 (10 Overs)', overs: 10 },
  { v: 'T20', label: 'T20 (20 Overs)', overs: 20 },
  { v: 'ODI', label: 'ODI (50 Overs)', overs: 50 },
  { v: 'Custom', label: 'Custom' },
];

export default function CreateMatch() {
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isSuper } = useAuth();
  const isAdmin = isSuper || user?.role === 'admin';

  const { data, loading, error } = useFetch('/teams?limit=100');
  const [f, setF] = useState({
    name: '',
    homeTeam: searchParams.get('home') || '',
    awayTeam: searchParams.get('away') || '',
    guestTeamName: 'Guest Team',
    format: 'T20',
    overs: '',
    date: '',
    venue: '',
    tossWinner: '',
    tossDecision: 'bat',
    tieBreaker: 'tie',
  });

  const [guestPlayers, setGuestPlayers] = useState(
    Array.from({ length: 11 }, (_, i) => ({
      name: `Player ${i + 1}`,
      role: i < 4 ? 'Batsman' : i === 4 ? 'Wicket Keeper' : i < 7 ? 'All-rounder' : 'Bowler',
    }))
  );

  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (patch) => setF((p) => ({ ...p, ...patch }));

  const myTeams = useMemo(() => (data?.items || []).filter((t) => t.canManage && t.playerCount >= 11), [data]);

  // Fetch connections for selected homeTeam if not admin
  const { data: connData, loading: connLoading } = useFetch(f.homeTeam && !isAdmin ? `/teams/${f.homeTeam}/connections` : null);

  useEffect(() => {
    if (!f.homeTeam && myTeams.length === 1) {
      set({ homeTeam: myTeams[0].id });
    }
  }, [myTeams, f.homeTeam]);

  const opponents = useMemo(() => {
    if (isAdmin) {
      return (data?.items || []).filter((t) => t.id !== f.homeTeam && t.playerCount >= 11);
    }
    if (!f.homeTeam) return [];
    const connectedList = connData?.connected?.map((c) => c.team) || [];
    return connectedList.filter((t) => (t.playerCount || 11) >= 11);
  }, [isAdmin, data, f.homeTeam, connData]);

  // Options for opponent select dropdown: includes connected opponents AND always Guest Team (Manual 11s)
  const opponentOptions = useMemo(() => {
    const list = opponents.map((t) => ({
      value: t.id,
      label: `${t.name} (${t.playerCount || 11} players)`,
    }));
    list.push({
      value: 'guest',
      label: '⭐ Guest Team (Manual 11s)',
      badge: 'Manual Team',
    });
    return list;
  }, [opponents]);

  // If no connected opponents and no awayTeam selected, default to 'guest'
  useEffect(() => {
    if (f.homeTeam && !connLoading && opponents.length === 0 && !f.awayTeam) {
      set({ awayTeam: 'guest', tossWinner: f.homeTeam });
    }
  }, [f.homeTeam, connLoading, opponents.length, f.awayTeam]);

  const home = data?.items.find((t) => t.id === f.homeTeam);
  const awayDoc = (data?.items || []).find((t) => t.id === f.awayTeam) || connData?.connected?.map((c) => c.team).find((t) => t.id === f.awayTeam);
  const effectiveAway = f.awayTeam === 'guest'
    ? { id: 'guest', name: f.guestTeamName.trim() || 'Guest Team', isGuest: true }
    : awayDoc;

  const changeHome = (id) => set({ homeTeam: id, awayTeam: f.awayTeam === id ? '' : f.awayTeam, tossWinner: '' });
  const changeAway = (id) => set({ awayTeam: id, tossWinner: '' });

  const submit = async (e) => {
    e.preventDefault();
    const er = {};
    if (!f.homeTeam) er.homeTeam = 'Select your team';
    if (!f.awayTeam) er.awayTeam = 'Select the opponent team';
    if (f.homeTeam && f.awayTeam !== 'guest' && f.homeTeam === f.awayTeam) er.awayTeam = 'Opponent must be a different team';
    if (f.format === 'Custom' && !(Number.isInteger(Number(f.overs)) && Number(f.overs) >= 1 && Number(f.overs) <= 50)) er.overs = 'Enter overs between 1 and 50';
    if (!f.tossWinner) er.tossWinner = 'Select who won the toss';
    setErrors(er);
    setFormError('');
    if (Object.keys(er).length) return;
    setBusy(true);

    try {
      const isGuest = f.awayTeam === 'guest';
      const body = {
        name: f.name,
        homeTeam: f.homeTeam,
        awayTeam: isGuest ? 'guest' : f.awayTeam,
        isGuestOpponent: isGuest,
        guestTeam: isGuest ? {
          name: f.guestTeamName.trim() || 'Guest Team',
          players: guestPlayers.map((p, idx) => ({
            name: p.name.trim() || `Player ${idx + 1}`,
            role: p.role,
          })),
        } : undefined,
        format: f.format,
        overs: f.format === 'Custom' ? Number(f.overs) : undefined,
        date: f.date ? new Date(f.date).toISOString() : undefined,
        venue: f.venue,
        tossWinner: f.tossWinner === 'guest' ? 'guest' : f.tossWinner,
        tossDecision: f.tossDecision,
        tieBreaker: f.tieBreaker,
      };

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

  const homeOptions = myTeams.map((t) => ({ value: t.id, label: t.name }));

  return (
    <form onSubmit={submit} noValidate className="mx-auto max-w-xl space-y-5">
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => nav(-1)} className="btn btn-ghost !p-2" aria-label="Go back"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="text-xl font-bold text-slate-900">Create Match</h1>
      </div>
      <ErrorBox message={formError} />
      <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">You will choose the playing 11 of each team when you start the match.</p>

      <section className="card space-y-4 p-4">
        <Field label="Match Name (optional)" htmlFor="mname">
          <input
            id="mname"
            className="input"
            value={f.name}
            onChange={(e) => set({ name: e.target.value })}
            placeholder="Defaults to Team A vs Team B"
            maxLength={100}
          />
        </Field>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="label !mb-0" htmlFor="home">Select Teams <span className="text-red-500">*</span></label>
            <span className="badge bg-green-100 text-green-700">Your Own Team</span>
          </div>
          <DropdownSelect
            id="home"
            value={f.homeTeam}
            onChange={changeHome}
            options={homeOptions}
            placeholder="Choose your team"
            error={!!errors.homeTeam}
          />
          {errors.homeTeam && <p className="mt-1 text-xs text-red-600" role="alert">{errors.homeTeam}</p>}
        </div>

        <div>
          <label className="label" htmlFor="away">Opponent Team <span className="text-red-500">*</span></label>
          <DropdownSelect
            id="away"
            value={f.awayTeam}
            onChange={changeAway}
            options={opponentOptions}
            placeholder={connLoading ? 'Loading opponents...' : 'Choose opponent'}
            error={!!errors.awayTeam}
          />
          {errors.awayTeam && <p className="mt-1 text-xs text-red-600" role="alert">{errors.awayTeam}</p>}
        </div>

        {/* If Guest Team is selected, show custom name & 11s configuration */}
        {f.awayTeam === 'guest' && (
          <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-bold text-slate-900 flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-blue-600" />
                <span>Manual Opponent Team (11 Players)</span>
              </div>
              <span className="badge bg-blue-100 text-blue-700 text-xs">Guest 11</span>
            </div>
            <p className="text-xs text-slate-600">
              Set the opponent team name and customize the 11 manual players for this match.
            </p>

            <div>
              <label className="label" htmlFor="guest-name">Opponent Team Name</label>
              <input
                id="guest-name"
                className="input bg-white"
                value={f.guestTeamName}
                onChange={(e) => set({ guestTeamName: e.target.value })}
                placeholder="e.g. Guest Team or St. Paul's XI"
                maxLength={60}
              />
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-700 mb-2">Manual 11s Squad:</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto p-2 border border-slate-200 rounded-lg bg-white">
                {guestPlayers.map((player, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 p-1 rounded-md border border-slate-100 bg-slate-50 text-xs">
                    <span className="w-5 text-center font-mono font-bold text-slate-400">{idx + 1}</span>
                    <input
                      type="text"
                      className="input !py-1 !px-2 flex-1 text-xs bg-white"
                      value={player.name}
                      onChange={(e) => {
                        const updated = [...guestPlayers];
                        updated[idx] = { ...updated[idx], name: e.target.value };
                        setGuestPlayers(updated);
                      }}
                      placeholder={`Player ${idx + 1}`}
                      maxLength={40}
                    />
                    <select
                      className="input !py-1 !px-1 text-xs w-20 bg-white"
                      value={player.role}
                      onChange={(e) => {
                        const updated = [...guestPlayers];
                        updated[idx] = { ...updated[idx], role: e.target.value };
                        setGuestPlayers(updated);
                      }}
                    >
                      <option value="Batsman">Bat</option>
                      <option value="Bowler">Bowl</option>
                      <option value="All-rounder">All</option>
                      <option value="Wicket Keeper">WK</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {!isAdmin && f.homeTeam && !connLoading && opponents.length === 0 && f.awayTeam !== 'guest' && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            <div className="font-semibold text-amber-900">No connected opponent teams found for {home?.name || 'your team'}.</div>
            <p className="mt-1">You can select "Guest Team (Manual 11s)" above to play against a manual team, or connect with opponents using their Team Code.</p>
            <div className="mt-2">
              <Link to={`/teams/${f.homeTeam}`} className="inline-flex items-center gap-1 font-semibold text-blue-700 underline hover:no-underline">
                <Handshake className="h-3.5 w-3.5" /> Go to Team Page & Connect Opponent →
              </Link>
            </div>
          </div>
        )}
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
          {!home || !effectiveAway ? <p className="text-sm text-slate-500">Select both teams first.</p> : (
            <div className="grid grid-cols-2 gap-2">
              {[home, effectiveAway].map((t) => (
                <label key={t.id} className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-sm ${f.tossWinner === t.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}>
                  <input
                    type="radio"
                    name="toss"
                    className="accent-blue-600"
                    checked={f.tossWinner === t.id}
                    onChange={() => set({ tossWinner: t.id })}
                  />
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
      </section>

      <button className="btn btn-primary w-full" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Create Match</button>
    </form>
  );
}
