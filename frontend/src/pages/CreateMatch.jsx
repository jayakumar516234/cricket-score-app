import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  X,
  Loader2,
  Handshake,
  Users,
  Shield,
  Trophy,
  Zap,
  ChevronDown,
  ChevronUp,
  Settings2,
} from 'lucide-react';
import { api } from '../api.js';
import { useFetch } from '../useFetch.js';
import { useAuth } from '../context/AuthContext.jsx';
import { ErrorBox, SkeletonForm, TeamLogo, DropdownSelect, Modal } from '../components/ui.jsx';

const FORMATS = [
  { v: 'T10', label: 'T10', overs: 10 },
  { v: 'T20', label: 'T20', overs: 20 },
  { v: 'ODI', label: 'ODI', overs: 50 },
  { v: 'Custom', label: 'Custom', overs: null },
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

  const [guestModalOpen, setGuestModalOpen] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (patch) => setF((p) => ({ ...p, ...patch }));

  const myTeams = useMemo(() => (data?.items || []).filter((t) => t.canManage && t.playerCount >= 11), [data]);

  // Fetch connections for selected homeTeam if not admin
  const { data: connData, loading: connLoading } = useFetch(
    f.homeTeam && !isAdmin ? `/teams/${f.homeTeam}/connections` : null
  );

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

  // Options for opponent select dropdown
  const opponentOptions = useMemo(() => {
    const list = opponents.map((t) => ({
      value: t.id,
      label: `${t.name} (${t.playerCount || 11}p)`,
    }));
    list.push({
      value: 'guest',
      label: '⭐ Guest Team (Manual 11s)',
    });
    return list;
  }, [opponents]);

  // Auto-default awayTeam to guest if no opponents
  useEffect(() => {
    if (f.homeTeam && !connLoading && opponents.length === 0 && !f.awayTeam) {
      set({ awayTeam: 'guest', tossWinner: f.homeTeam });
    }
  }, [f.homeTeam, connLoading, opponents.length, f.awayTeam]);

  const home = data?.items.find((t) => t.id === f.homeTeam);
  const awayDoc =
    (data?.items || []).find((t) => t.id === f.awayTeam) ||
    connData?.connected?.map((c) => c.team).find((t) => t.id === f.awayTeam);
  const effectiveAway =
    f.awayTeam === 'guest'
      ? { id: 'guest', name: f.guestTeamName.trim() || 'Guest Team', isGuest: true }
      : awayDoc;

  // Auto-select toss winner to home team if empty
  useEffect(() => {
    if (!f.tossWinner && home) {
      set({ tossWinner: home.id });
    }
  }, [home, f.tossWinner]);

  const changeHome = (id) =>
    set({ homeTeam: id, awayTeam: f.awayTeam === id ? '' : f.awayTeam, tossWinner: id });
  const changeAway = (id) => set({ awayTeam: id, tossWinner: f.tossWinner || f.homeTeam });

  const submit = async (e) => {
    e.preventDefault();
    const er = {};
    if (!f.homeTeam) er.homeTeam = 'Select your team';
    if (!f.awayTeam) er.awayTeam = 'Select opponent';
    if (f.homeTeam && f.awayTeam !== 'guest' && f.homeTeam === f.awayTeam) {
      er.awayTeam = 'Opponent must be a different team';
    }
    if (f.format === 'Custom' && !(Number.isInteger(Number(f.overs)) && Number(f.overs) >= 1 && Number(f.overs) <= 50)) {
      er.overs = 'Enter overs (1-50)';
    }
    if (!f.tossWinner) er.tossWinner = 'Select toss winner';
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
          er.guestTeam = `Player names must be unique: "${pName}"`;
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
        guestTeam: isGuest
          ? {
              name: f.guestTeamName.trim() || 'Guest Team',
              players: guestPlayers.map((p, idx) => ({
                name: p.name.trim() || `Player ${idx + 1}`,
                role: p.role,
              })),
            }
          : undefined,
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
      <div className="mx-auto max-w-md w-full py-4 space-y-3">
        <Link to="/matches" className="btn btn-ghost text-xs">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Link>
        <div className="card p-6 text-center shadow-lg border border-slate-200">
          <h1 className="font-bold text-slate-900 text-base">Create your team first</h1>
          <p className="mt-1 text-xs text-slate-500">
            A match needs at least 11 players in your squad to start live scoring.
          </p>
          <Link to="/teams/new" className="btn btn-green bg-emerald-600 hover:bg-emerald-700 text-white font-bold mt-4 shadow-sm text-xs">
            Create Team
          </Link>
        </div>
      </div>
    );
  }

  const homeOptions = myTeams.map((t) => ({ value: t.id, label: t.name }));

  return (
    <div className="mx-auto max-w-md w-full py-1 sm:py-3">
      {/* Sleek Popup Card Container */}
      <div className="relative overflow-hidden rounded-2xl bg-white shadow-xl border border-slate-200/90 transition-all">
        {/* Top Gradient Stripe */}
        <div className="h-1.5 bg-gradient-to-r from-emerald-500 via-pitch-500 to-blue-500" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-xs">
              <Trophy className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-sm font-black text-slate-900 leading-tight">Create Match</h1>
              <p className="text-[10px] text-slate-500">Quick match setup</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => nav(-1)}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition"
            aria-label="Close"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        <form onSubmit={submit} noValidate className="p-4 space-y-3.5">
          <ErrorBox message={formError} />

          {/* 1. MATCHUP SECTION: Compact Home vs Opponent */}
          <div className="rounded-xl border border-slate-200 bg-gradient-to-b from-slate-50/80 to-white p-3 space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-600">
                1. Select Teams
              </span>
              <span className="text-[9.5px] font-bold text-pitch-700 bg-pitch-50 border border-pitch-200 px-1.5 py-0.2 rounded">
                Playing 11
              </span>
            </div>

            {/* Home Team */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-emerald-800 uppercase tracking-wide flex items-center gap-1" htmlFor="home">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Your Team
              </label>
              <DropdownSelect
                id="home"
                value={f.homeTeam}
                onChange={changeHome}
                options={homeOptions}
                placeholder="Choose your team"
                error={!!errors.homeTeam}
                buttonClassName="!py-1.5 text-xs font-bold"
              />
              {errors.homeTeam && <p className="text-[10px] text-red-600 font-bold">{errors.homeTeam}</p>}
            </div>

            {/* VS Divider */}
            <div className="relative flex items-center justify-center my-1">
              <div className="border-t border-slate-200 w-full" />
              <span className="absolute bg-white px-2 py-0.5 text-[9px] font-black text-slate-400 uppercase tracking-widest rounded-full border border-slate-200 shadow-2xs">
                VS
              </span>
            </div>

            {/* Opponent Team */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-blue-800 uppercase tracking-wide flex items-center gap-1" htmlFor="away">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                Opponent Team
              </label>
              <DropdownSelect
                id="away"
                value={f.awayTeam}
                onChange={changeAway}
                options={opponentOptions}
                placeholder={connLoading ? 'Loading opponents...' : 'Choose opponent'}
                error={!!errors.awayTeam}
                buttonClassName="!py-1.5 text-xs font-bold"
              />
              {errors.awayTeam && <p className="text-[10px] text-red-600 font-bold">{errors.awayTeam}</p>}
            </div>

            {/* If Guest XI selected - Compact 1-line configuration */}
            {f.awayTeam === 'guest' && (
              <div className="flex items-center justify-between gap-2 rounded-xl bg-amber-50 border border-amber-200/90 p-2 text-xs">
                <div className="flex-1 min-w-0">
                  <span className="text-[9.5px] font-bold text-amber-800 uppercase block">Opponent Name</span>
                  <input
                    type="text"
                    className="input !py-1 !px-2 text-xs font-bold text-slate-800 w-full bg-white border-amber-300"
                    value={f.guestTeamName}
                    onChange={(e) => set({ guestTeamName: e.target.value })}
                    placeholder="Guest XI"
                    maxLength={60}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setGuestModalOpen(true)}
                  className="inline-flex items-center gap-1 rounded-lg bg-amber-500 hover:bg-amber-600 px-2.5 py-1.5 text-[11px] font-black text-white shadow-xs shrink-0 transition"
                  title="Customize guest player names"
                >
                  <Users className="h-3.5 w-3.5" />
                  <span>11 Players</span>
                </button>
              </div>
            )}

            {!isAdmin && f.homeTeam && !connLoading && opponents.length === 0 && f.awayTeam !== 'guest' && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-2 text-[11px] text-amber-800 flex items-center justify-between gap-2">
                <span>No connected opponents.</span>
                <button
                  type="button"
                  onClick={() => set({ awayTeam: 'guest', tossWinner: f.homeTeam })}
                  className="font-bold text-blue-700 underline shrink-0"
                >
                  Use Guest Team XI
                </button>
              </div>
            )}
          </div>

          {/* 2. MATCH FORMAT: Compact Segmented Buttons */}
          <div className="space-y-1.5">
            <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-600 block">
              2. Format & Overs
            </span>
            <div className="grid grid-cols-4 gap-1.5">
              {FORMATS.map((o) => {
                const active = f.format === o.v;
                return (
                  <button
                    key={o.v}
                    type="button"
                    onClick={() => set({ format: o.v })}
                    className={`flex flex-col items-center justify-center rounded-xl py-1.5 px-1 text-xs font-bold transition-all border ${
                      active
                        ? 'bg-pitch-500 text-navy-950 border-pitch-500 shadow-xs font-black scale-102'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>{o.label}</span>
                    <span className="text-[9px] opacity-75">{o.overs ? `${o.overs} ov` : 'Custom'}</span>
                  </button>
                );
              })}
            </div>
            {f.format === 'Custom' && (
              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs font-bold text-slate-600">Custom Overs:</span>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={f.overs}
                  onChange={(e) => set({ overs: e.target.value.replace(/\D/g, '') })}
                  placeholder="e.g. 8"
                  className={`input !py-1 !px-2 text-xs font-bold w-20 text-center ${
                    errors.overs ? 'input-error' : ''
                  }`}
                />
                {errors.overs && <span className="text-[10px] text-red-600 font-bold">{errors.overs}</span>}
              </div>
            )}
          </div>

          {/* 3. TOSS SECTION: Compact Pill Buttons */}
          <div className="space-y-2">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-600">
                  3. Toss Winner <span className="text-red-500">*</span>
                </span>
                {errors.tossWinner && (
                  <span className="text-[10px] text-red-600 font-bold">{errors.tossWinner}</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[home, effectiveAway].map((t, idx) => {
                  if (!t) return null;
                  const isSelected = f.tossWinner === t.id;
                  return (
                    <button
                      key={t.id || idx}
                      type="button"
                      onClick={() => set({ tossWinner: t.id })}
                      className={`flex items-center justify-center gap-1.5 rounded-xl py-2 px-2 text-xs font-bold border transition-all truncate ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs font-black'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span className="truncate">{t.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-600 block">
                Toss Decision
              </span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  ['bat', '🏏 Bat First'],
                  ['bowl', '⚾ Bowl First'],
                ].map(([v, l]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => set({ tossDecision: v })}
                    className={`rounded-xl py-2 px-2 text-xs font-bold border transition-all ${
                      f.tossDecision === v
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs font-black'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 4. OPTIONAL INFO: Collapsible Section */}
          <div className="border-t border-slate-100 pt-1">
            <button
              type="button"
              onClick={() => setShowMore(!showMore)}
              className="flex items-center justify-between w-full text-[11px] font-bold text-slate-500 hover:text-slate-800 py-1 transition"
            >
              <span className="flex items-center gap-1">
                <Settings2 className="h-3.5 w-3.5" />
                <span>Match Name, Venue & Date (Optional)</span>
              </span>
              {showMore ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
            {showMore && (
              <div className="mt-2 space-y-2 pt-1 animate-fadeIn">
                <input
                  value={f.name}
                  onChange={(e) => set({ name: e.target.value })}
                  placeholder="Defaults to Team A vs Team B"
                  className="input !py-1.5 text-xs w-full"
                  maxLength={100}
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="datetime-local"
                    value={f.date}
                    onChange={(e) => set({ date: e.target.value })}
                    className="input !py-1.5 text-xs"
                  />
                  <input
                    value={f.venue}
                    onChange={(e) => set({ venue: e.target.value })}
                    placeholder="Venue / Ground"
                    className="input !py-1.5 text-xs"
                    maxLength={100}
                  />
                </div>
              </div>
            )}
          </div>

          {/* SUBMIT BUTTON */}
          <button
            type="submit"
            disabled={busy}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 py-2.5 text-xs sm:text-sm font-black text-white shadow-md shadow-emerald-900/20 active:scale-95 transition-all disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4 drop-shadow" />}
            <span>{busy ? 'Setting up match…' : 'Start Live Match'}</span>
          </button>
        </form>
      </div>

      {/* POPUP MODAL FOR CUSTOMIZING GUEST 11 PLAYERS */}
      <Modal open={guestModalOpen} onClose={() => setGuestModalOpen(false)} title="Guest Team 11 Players">
        <div className="space-y-3">
          <p className="text-xs text-slate-500">
            Customize player names and roles for <strong>{f.guestTeamName || 'Guest Team'}</strong>.
          </p>

          <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
            {guestPlayers.map((player, idx) => (
              <div key={idx} className="flex items-center gap-1.5 p-1 rounded-lg border border-slate-200 bg-slate-50/50">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white border border-slate-200 font-mono text-[10px] font-black text-slate-600">
                  {idx + 1}
                </span>
                <input
                  type="text"
                  className="input !py-1 !px-2 flex-1 text-xs border-slate-200 font-medium bg-white"
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
                      { value: 'Batsman', label: '🏏 Bat' },
                      { value: 'Bowler', label: '⚾ Bowl' },
                      { value: 'All-rounder', label: '⚡ All' },
                      { value: 'Wicket Keeper', label: '🧤 WK' },
                    ]}
                    buttonClassName="!py-1 !px-2 text-[11px] font-semibold bg-white border-slate-200"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => setGuestModalOpen(false)}
              className="btn btn-green bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-1.5 px-4"
            >
              Done
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
