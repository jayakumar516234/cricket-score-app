import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Handshake, Users, Shield } from 'lucide-react';
import { api } from '../api.js';
import { useFetch } from '../useFetch.js';
import { useAuth } from '../context/AuthContext.jsx';
import { ErrorBox, Field, Spinner, SkeletonForm, TeamLogo, DropdownSelect } from '../components/ui.jsx';

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
    if (f.awayTeam === 'guest') {
      const seenNames = new Set();
      for (let i = 0; i < guestPlayers.length; i++) {
        const pName = (guestPlayers[i].name || '').trim();
        if (!pName) {
          er.guestTeam = `Player ${i + 1} name cannot be empty`;
          break;
        }
        const key = pName.toLowerCase();
        if (seenNames.has(key)) {
          er.guestTeam = `Two players have the same name: "${pName}". Player names must be unique.`;
          break;
        }
        seenNames.add(key);
      }
    }
    setErrors(er);
    setFormError(er.guestTeam || '');
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

  if (loading && myTeams.length === 0) return <SkeletonForm />;
  if (error && myTeams.length === 0) return <ErrorBox message={error} />;

  if (myTeams.length === 0) {
    return (
      <div className="space-y-3">
        <Link to="/matches" className="btn btn-ghost"><ArrowLeft className="h-4 w-4" /> Back</Link>
        <div className="card p-6 text-center">
          <h1 className="font-bold text-slate-900">Create your team first</h1>
          <p className="mt-1 text-sm text-slate-500">A match is played between your own team and an opponent. Add your team with at least 11 players to continue.</p>
          <Link to="/teams/new" className="btn btn-green bg-emerald-600 hover:bg-emerald-700 text-white font-bold mt-4 shadow-md">Create Team</Link>
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

      <section className="card space-y-4 p-4 border border-slate-200/80 shadow-xs">
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
      </section>

      {/* Team Selection Section - Modern Battle Arena Style */}
      <section className="card p-4 sm:p-5 space-y-5 border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">

          <div>
            <h2 className="text-base font-bold text-slate-900">Select Match Teams</h2>
            <p className="text-xs text-slate-500">Pick your own squad and opponent team</p>
          </div>
          <span className="badge bg-pitch-50 text-pitch-700 border border-pitch-200">
            Playing 11
          </span>
        </div>

        {/* VS Battle Matchup Preview Card */}
        <div className="relative rounded-2xl bg-gradient-to-r from-slate-900 via-navy-950 to-slate-900 p-4 text-white shadow-md overflow-hidden">
          <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-blue-500/20 blur-2xl pointer-events-none" />
          <div className="absolute -left-8 -bottom-8 h-28 w-28 rounded-full bg-pitch-500/20 blur-2xl pointer-events-none" />
          
          <div className="relative flex items-center justify-between gap-3">
            {/* Home / Own Team Box */}
            <div className="flex-1 text-center min-w-0">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 ring-2 ring-pitch-400/50 backdrop-blur-sm">
                {home ? <TeamLogo team={home} size={36} /> : <Shield className="h-6 w-6 text-pitch-400" />}
              </div>
              <div className="mt-2 text-xs font-bold truncate text-white">
                {home ? home.name : 'Select Your Team'}
              </div>
              <span className="inline-block mt-0.5 text-[10px] font-semibold text-pitch-400 uppercase tracking-wider">
                Home / Own Team
              </span>
            </div>

            {/* VS Badge */}
            <div className="flex flex-col items-center justify-center shrink-0">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-red-600 to-amber-500 text-xs font-black text-white shadow-md ring-2 ring-white/20">
                VS
              </span>
              <span className="mt-1 text-[9px] font-semibold text-slate-400 uppercase tracking-widest">
                Fixture
              </span>
            </div>

            {/* Away / Opponent Team Box */}
            <div className="flex-1 text-center min-w-0">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 ring-2 ring-blue-400/50 backdrop-blur-sm">
                {effectiveAway ? (
                  f.awayTeam === 'guest' ? (
                    <Users className="h-6 w-6 text-amber-400" />
                  ) : (
                    <TeamLogo team={effectiveAway} size={36} />
                  )
                ) : (
                  <Shield className="h-6 w-6 text-blue-400" />
                )}
              </div>
              <div className="mt-2 text-xs font-bold truncate text-white">
                {effectiveAway ? effectiveAway.name : 'Select Opponent'}
              </div>
              <span className="inline-block mt-0.5 text-[10px] font-semibold text-blue-400 uppercase tracking-wider">
                {f.awayTeam === 'guest' ? 'Manual Opponent' : 'Opponent'}
              </span>
            </div>
          </div>
        </div>

        {/* Home Team Input Card */}
        <div className="rounded-xl border border-pitch-200/80 bg-pitch-50/30 p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-pitch-900 flex items-center gap-1.5" htmlFor="home">
              <span className="h-2 w-2 rounded-full bg-pitch-600" />
              1. Your Own Team <span className="text-red-500">*</span>
            </label>
            <span className="badge bg-pitch-100 text-pitch-800 text-[10px]">Verified Squad</span>
          </div>
          <DropdownSelect
            id="home"
            value={f.homeTeam}
            onChange={changeHome}
            options={homeOptions}
            placeholder="Choose your team"
            error={!!errors.homeTeam}
          />
          {errors.homeTeam && <p className="text-xs text-red-600 font-medium" role="alert">{errors.homeTeam}</p>}
        </div>

        {/* Opponent Selection Card */}
        <div className="rounded-xl border border-blue-200/80 bg-blue-50/20 p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5" htmlFor="away">
              <span className="h-2 w-2 rounded-full bg-blue-600" />
              2. Opponent Team <span className="text-red-500">*</span>
            </label>
            <span className="text-[11px] text-slate-500">Connected or Manual</span>
          </div>
          <DropdownSelect
            id="away"
            value={f.awayTeam}
            onChange={changeAway}
            options={opponentOptions}
            placeholder={connLoading ? 'Loading opponents...' : 'Choose opponent'}
            error={!!errors.awayTeam}
          />
          {errors.awayTeam && <p className="text-xs text-red-600 font-medium" role="alert">{errors.awayTeam}</p>}
        </div>

        {/* If Guest Team is selected, show custom name & 11s configuration */}
        {f.awayTeam === 'guest' && (
          <div className="rounded-2xl border-2 border-dashed border-amber-300 bg-gradient-to-b from-amber-50/80 to-white p-4 sm:p-5 space-y-4 shadow-xs">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">Manual Opponent Team (11 Players)</h3>
                  <p className="text-xs text-slate-500">Name the team & customize the 11 players playing today</p>
                </div>
              </div>
              <span className="badge bg-amber-100 text-amber-800 border border-amber-300 font-bold text-[10px] shrink-0">
                Manual 11s
              </span>
            </div>

            <div>
              <label className="label text-xs font-bold uppercase text-slate-700" htmlFor="guest-name">
                Opponent Team Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="guest-name"
                  className="input font-semibold text-slate-800 pl-3 pr-10 border-amber-200 focus:border-amber-500 focus:ring-amber-400/20"
                  value={f.guestTeamName}
                  onChange={(e) => set({ guestTeamName: e.target.value })}
                  placeholder="e.g. Chennai Super Warriors, Guest XI"
                  maxLength={60}
                />
                <span className="absolute right-3 top-2.5 text-xs font-bold text-amber-600">XI</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Playing 11 Squad List
                </span>
                <span className="text-[11px] font-semibold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-full">
                  11 / 11 Players
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto p-2.5 border border-slate-200 rounded-xl bg-slate-50/60 shadow-inner">
                {guestPlayers.map((player, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 p-1.5 rounded-lg border border-slate-200 bg-white text-xs shadow-2xs hover:border-blue-300 transition">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 font-mono text-[11px] font-black text-slate-600">
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      className="input !py-1 !px-2 flex-1 text-xs border-slate-200 font-medium"
                      value={player.name}
                      onChange={(e) => {
                        const updated = [...guestPlayers];
                        updated[idx] = { ...updated[idx], name: e.target.value };
                        setGuestPlayers(updated);
                      }}
                      placeholder={`Player ${idx + 1}`}
                      maxLength={40}
                    />
                    <div className="w-28 shrink-0">
                      <DropdownSelect
                        value={player.role}
                        onChange={(val) => {
                          const updated = [...guestPlayers];
                          updated[idx] = { ...updated[idx], role: val };
                          setGuestPlayers(updated);
                        }}
                        options={[
                          { value: 'Batsman', label: '🏏 Batsman' },
                          { value: 'Bowler', label: '⚾ Bowler' },
                          { value: 'All-rounder', label: '⚡ All-rounder' },
                          { value: 'Wicket Keeper', label: '🧤 Keeper' },
                        ]}
                        buttonClassName="!py-1 !px-2 text-xs font-semibold bg-slate-50 border-slate-200"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {!isAdmin && f.homeTeam && !connLoading && opponents.length === 0 && f.awayTeam !== 'guest' && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-800 space-y-1.5">
            <div className="font-bold text-amber-950 flex items-center gap-1.5">
              <span>⚠️ No connected opponent teams found for {home?.name || 'your team'}</span>
            </div>
            <p>You can select <strong>"Guest Team (Manual 11s)"</strong> above to instantly play against a manual team, or connect with opponents using their Team Code.</p>
            <div className="pt-1">
              <Link to={`/teams/${f.homeTeam}`} className="inline-flex items-center gap-1 font-bold text-blue-700 underline hover:no-underline">
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

      <button className="btn btn-green bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md w-full py-3 text-base" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Create Match</button>
    </form>
  );
}
