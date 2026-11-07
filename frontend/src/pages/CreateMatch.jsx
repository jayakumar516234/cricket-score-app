import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import {
  X,
  Loader2,
  Users,
  Shield,
  Trophy,
  Zap,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Coins,
  Check,
  Edit2,
  MapPin,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { api } from '../api.js';
import { useFetch } from '../useFetch.js';
import { useAuth } from '../context/AuthContext.jsx';
import { ErrorBox, SkeletonForm, TeamLogo, DropdownSelect, Modal } from '../components/ui.jsx';

const OVERS_PRESETS = [
  { label: '6 ov', overs: 6, format: 'Custom' },
  { label: '8 ov', overs: 8, format: 'Custom' },
  { label: '10 ov', overs: 10, format: 'T10' },
  { label: '12 ov', overs: 12, format: 'Custom' },
  { label: '15 ov', overs: 15, format: 'Custom' },
  { label: '20 ov', overs: 20, format: 'T20' },
  { label: 'Custom', overs: null, format: 'Custom' },
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
    guestTeamName: 'Guest XI',
    format: 'T20',
    overs: 20,
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

  const [selectedPreset, setSelectedPreset] = useState('20 ov');
  const [customOversInput, setCustomOversInput] = useState('');
  const [isSpinningCoin, setIsSpinningCoin] = useState(false);
  const [guestModalOpen, setGuestModalOpen] = useState(false);
  const [showMoreSettings, setShowMoreSettings] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (patch) => setF((p) => ({ ...p, ...patch }));

  const myTeams = useMemo(
    () => (data?.items || []).filter((t) => t.canManage && t.playerCount >= 11),
    [data]
  );

  // Fetch connections for selected homeTeam if not admin
  const { data: connData, loading: connLoading } = useFetch(
    f.homeTeam && !isAdmin ? `/teams/${f.homeTeam}/connections` : null
  );

  useEffect(() => {
    if (!f.homeTeam && myTeams.length > 0) {
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
      label: '⭐ Guest XI (Manual Opponent)',
    });
    return list;
  }, [opponents]);

  // Auto-default awayTeam to first opponent or 'guest'
  useEffect(() => {
    if (f.homeTeam && !connLoading && !f.awayTeam) {
      if (opponents.length > 0) {
        set({ awayTeam: opponents[0].id });
      } else {
        set({ awayTeam: 'guest' });
      }
    }
  }, [f.homeTeam, connLoading, opponents, f.awayTeam]);

  const home = data?.items.find((t) => t.id === f.homeTeam);
  const awayDoc =
    (data?.items || []).find((t) => t.id === f.awayTeam) ||
    connData?.connected?.map((c) => c.team).find((t) => t.id === f.awayTeam);
  const effectiveAway =
    f.awayTeam === 'guest'
      ? { id: 'guest', name: f.guestTeamName.trim() || 'Guest XI', isGuest: true }
      : awayDoc;

  // Auto-select toss winner to home team if empty
  useEffect(() => {
    if (!f.tossWinner && home) {
      set({ tossWinner: home.id });
    }
  }, [home, f.tossWinner]);

  const handleSelectPreset = (preset) => {
    setSelectedPreset(preset.label);
    if (preset.label === 'Custom') {
      const val = Number(customOversInput) || 8;
      set({ format: 'Custom', overs: val });
    } else {
      set({ format: preset.format, overs: preset.overs });
    }
  };

  const handleCustomOversChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '');
    setCustomOversInput(raw);
    const num = Number(raw);
    if (num >= 1 && num <= 50) {
      set({ format: 'Custom', overs: num });
    }
  };

  // Fun 3D Interactive Coin Toss Spin!
  const spinTossCoin = () => {
    if (!home || !effectiveAway || isSpinningCoin) return;
    setIsSpinningCoin(true);
    let counter = 0;
    const interval = setInterval(() => {
      counter++;
      set({ tossWinner: counter % 2 === 0 ? home.id : effectiveAway.id });
      if (counter >= 10) {
        clearInterval(interval);
        // Random final winner
        const winner = Math.random() < 0.5 ? home.id : effectiveAway.id;
        set({ tossWinner: winner });
        setIsSpinningCoin(false);
      }
    }, 80);
  };

  const submit = async (e) => {
    e.preventDefault();
    const er = {};
    if (!f.homeTeam) er.homeTeam = 'Choose your team';
    if (!f.awayTeam) er.awayTeam = 'Choose opponent team';
    if (f.homeTeam && f.awayTeam !== 'guest' && f.homeTeam === f.awayTeam) {
      er.awayTeam = 'Opponent must be a different team';
    }
    const finalOvers = Number(f.overs);
    if (f.format === 'Custom' && (!Number.isInteger(finalOvers) || finalOvers < 1 || finalOvers > 50)) {
      er.overs = 'Enter overs (1 - 50)';
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
          er.guestTeam = `Two players have duplicate name: "${pName}"`;
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
              name: f.guestTeamName.trim() || 'Guest XI',
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
      setFormError(err.message || 'Failed to create match');
      setBusy(false);
    }
  };

  if (loading && myTeams.length === 0) return <SkeletonForm />;
  if (error && myTeams.length === 0) return <ErrorBox message={error} />;

  if (myTeams.length === 0) {
    return (
      <div className="mx-auto max-w-md w-full py-6 px-3">
        <div className="rounded-3xl bg-white p-6 text-center shadow-xl border border-slate-200">
          <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-2xl bg-amber-50 text-amber-600 mb-3">
            <Shield className="h-6 w-6" />
          </div>
          <h1 className="font-black text-slate-900 text-lg">Create Your Team First</h1>
          <p className="mt-1 text-xs text-slate-500 max-w-xs mx-auto">
            You need a squad with at least 11 players before starting a live scoring match.
          </p>
          <Link
            to="/teams/new"
            className="btn btn-green bg-emerald-600 hover:bg-emerald-700 text-white font-black mt-4 shadow-md text-xs py-2 px-5 inline-flex items-center gap-1.5"
          >
            Create Squad Now
          </Link>
        </div>
      </div>
    );
  }

  const homeOptions = myTeams.map((t) => ({ value: t.id, label: t.name }));
  const tossWinnerTeam = f.tossWinner === 'guest' ? effectiveAway : (f.tossWinner === home?.id ? home : effectiveAway);

  return (
    <div className="mx-auto max-w-md w-full py-1 sm:py-3 px-2 sm:px-0">
      {/* 🏟️ ARENA MATCH SETUP POPUP CARD */}
      <div className="relative overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-200/90 backdrop-blur-md">
        
        {/* Top Glow & Header */}
        <div className="relative bg-gradient-to-r from-navy-950 via-slate-900 to-navy-900 p-4 text-white overflow-hidden">
          <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-emerald-500/20 blur-xl" />
          <div className="pointer-events-none absolute -left-6 -bottom-6 h-24 w-24 rounded-full bg-blue-500/20 blur-xl" />

          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500 to-pitch-400 text-navy-950 font-black shadow-glow-pitch">
                <Trophy className="h-4.5 w-4.5" />
              </div>
              <div>
                <h1 className="text-base font-black tracking-tight text-white flex items-center gap-1.5">
                  <span>Match Arena</span>
                  <span className="badge bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 text-[9px] uppercase tracking-wider py-0 px-1.5 font-bold">
                    Live Score
                  </span>
                </h1>
                <p className="text-[10.5px] text-slate-300">Fast 1-step live match kickoff</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => nav(-1)}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* ⚔️ VISUAL VS BATTLE ARENA */}
          <div className="mt-3.5 rounded-2xl bg-white/5 border border-white/10 p-2.5 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-2">
              
              {/* Home Team Side */}
              <div className="flex-1 text-center min-w-0">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-400 shadow-inner">
                  {home ? <TeamLogo team={home} size={30} /> : <Shield className="h-5 w-5 text-emerald-400" />}
                </div>
                <div className="mt-1.5 text-xs font-black truncate text-white">
                  {home?.name || 'Your Team'}
                </div>
                <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest block">
                  Home XI
                </span>
              </div>

              {/* Glowing VS Badge */}
              <div className="flex flex-col items-center justify-center shrink-0">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-tr from-amber-500 to-rose-600 text-[10px] font-black text-white shadow-md ring-2 ring-white/20">
                  VS
                </span>
                <span className="text-[8.5px] font-extrabold text-slate-400 uppercase tracking-widest mt-0.5">
                  {f.overs ? `${f.overs} Ov` : 'Match'}
                </span>
              </div>

              {/* Away Team Side */}
              <div className="flex-1 text-center min-w-0">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/20 border border-blue-400/40 text-blue-400 shadow-inner">
                  {effectiveAway?.isGuest ? (
                    <Users className="h-5 w-5 text-amber-400" />
                  ) : effectiveAway ? (
                    <TeamLogo team={effectiveAway} size={30} />
                  ) : (
                    <Shield className="h-5 w-5 text-blue-400" />
                  )}
                </div>
                <div className="mt-1.5 text-xs font-black truncate text-white">
                  {effectiveAway?.name || 'Opponent'}
                </div>
                <span className="text-[9px] font-bold text-blue-400 uppercase tracking-widest block">
                  {effectiveAway?.isGuest ? 'Guest XI' : 'Opponent'}
                </span>
              </div>

            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={submit} noValidate className="p-3.5 sm:p-4 space-y-3.5 bg-slate-50/50">
          <ErrorBox message={formError} />

          {/* 1. TEAM SELECTION DROPDOWNS */}
          <div className="rounded-2xl border border-slate-200 bg-white p-3 space-y-2.5 shadow-2xs">
            <div className="grid grid-cols-2 gap-2">
              {/* Home Select */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Your Team
                </label>
                <DropdownSelect
                  id="home"
                  value={f.homeTeam}
                  onChange={(id) => set({ homeTeam: id, awayTeam: f.awayTeam === id ? '' : f.awayTeam, tossWinner: id })}
                  options={homeOptions}
                  placeholder="Select squad"
                  error={!!errors.homeTeam}
                  buttonClassName="!py-1.5 text-xs font-bold"
                />
              </div>

              {/* Opponent Select */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-blue-800 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  Opponent
                </label>
                <DropdownSelect
                  id="away"
                  value={f.awayTeam}
                  onChange={(id) => set({ awayTeam: id, tossWinner: f.tossWinner || f.homeTeam })}
                  options={opponentOptions}
                  placeholder={connLoading ? 'Loading...' : 'Opponent'}
                  error={!!errors.awayTeam}
                  buttonClassName="!py-1.5 text-xs font-bold"
                />
              </div>
            </div>

            {/* If Guest XI is selected: Clean 1-line Team Name + Edit 11 button */}
            {f.awayTeam === 'guest' && (
              <div className="flex items-center justify-between gap-2 rounded-xl bg-amber-50/90 border border-amber-200 p-2 text-xs">
                <div className="flex-1 min-w-0">
                  <span className="text-[9.5px] font-bold text-amber-900 uppercase block leading-none mb-1">
                    Opponent Team Name
                  </span>
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
                  className="inline-flex items-center gap-1 rounded-xl bg-amber-500 hover:bg-amber-600 px-2.5 py-1.5 text-[11px] font-black text-white shadow-xs shrink-0 transition active:scale-95"
                  title="Customize 11 players"
                >
                  <Users className="h-3.5 w-3.5" />
                  <span>11 Players</span>
                </button>
              </div>
            )}
          </div>

          {/* 2. MATCH OVERS (ONE-TAP CHIPS) */}
          <div className="rounded-2xl border border-slate-200 bg-white p-3 space-y-2 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-700">
                Match Overs
              </span>
              <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                {f.overs ? `${f.overs} Overs Per Side` : 'Pick overs'}
              </span>
            </div>

            {/* Quick Chips */}
            <div className="flex flex-wrap items-center gap-1.5">
              {OVERS_PRESETS.map((preset) => {
                const isActive = selectedPreset === preset.label;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`rounded-xl py-1.5 px-2.5 text-xs font-bold transition-all border ${
                      isActive
                        ? 'bg-gradient-to-r from-emerald-500 to-pitch-500 text-navy-950 border-pitch-400 font-black shadow-xs scale-105'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            {selectedPreset === 'Custom' && (
              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs font-bold text-slate-600">Enter Overs (1-50):</span>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={customOversInput}
                  onChange={handleCustomOversChange}
                  placeholder="e.g. 8"
                  className="input !py-1 !px-2 text-xs font-bold w-20 text-center border-pitch-300"
                  autoFocus
                />
                {errors.overs && <span className="text-[10px] text-red-600 font-bold">{errors.overs}</span>}
              </div>
            )}
          </div>

          {/* 3. INTERACTIVE TOSS ARENA */}
          <div className="rounded-2xl border border-slate-200 bg-white p-3 space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <span>Who Won The Toss?</span>
                <span className="text-red-500">*</span>
              </span>

              {/* Coin Spin Button for fun! */}
              <button
                type="button"
                onClick={spinTossCoin}
                disabled={isSpinningCoin}
                className="inline-flex items-center gap-1 rounded-xl bg-amber-100 hover:bg-amber-200 border border-amber-300 px-2 py-0.5 text-[10px] font-black text-amber-900 transition active:scale-95"
                title="Tap to spin coin randomly"
              >
                <Coins className={`h-3.5 w-3.5 text-amber-600 ${isSpinningCoin ? 'animate-spin' : ''}`} />
                <span>{isSpinningCoin ? 'Flipping…' : 'Flip Coin 🪙'}</span>
              </button>
            </div>

            {/* Team Toss Winner Selector */}
            <div className="grid grid-cols-2 gap-2">
              {[home, effectiveAway].map((t, idx) => {
                if (!t) return null;
                const isWinner = f.tossWinner === t.id;
                return (
                  <button
                    key={t.id || idx}
                    type="button"
                    onClick={() => set({ tossWinner: t.id })}
                    className={`flex items-center justify-center gap-1.5 rounded-xl py-2 px-2 text-xs font-bold border transition-all truncate ${
                      isWinner
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs font-black ring-2 ring-blue-400/40'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {isWinner && <Check className="h-3.5 w-3.5 shrink-0" />}
                    <span className="truncate">{t.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Toss Decision: Bat or Bowl */}
            <div className="pt-1 border-t border-slate-100">
              <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                Elected to:
              </span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  ['bat', '🏏 Bat First'],
                  ['bowl', '⚾ Bowl First'],
                ].map(([v, l]) => {
                  const active = f.tossDecision === v;
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => set({ tossDecision: v })}
                      className={`rounded-xl py-2 px-2 text-xs font-bold border transition-all ${
                        active
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs font-black'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {l}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Live Toss Status Pill */}
            {tossWinnerTeam && (
              <div className="rounded-xl bg-blue-50/80 border border-blue-200/80 px-2.5 py-1.5 text-center text-[11px] font-bold text-blue-900">
                🏆 <strong>{tossWinnerTeam.name}</strong> won the toss and elected to{' '}
                <span className="uppercase text-blue-950 font-black">{f.tossDecision}</span> first
              </div>
            )}
          </div>

          {/* 4. OPTIONAL MATCH DETAILS TOGGLE */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-2.5">
            <button
              type="button"
              onClick={() => setShowMoreSettings(!showMoreSettings)}
              className="flex items-center justify-between w-full text-xs font-bold text-slate-600 hover:text-slate-900 transition py-0.5"
            >
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                <span>Venue, Date & Match Name (Optional)</span>
              </span>
              {showMoreSettings ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {showMoreSettings && (
              <div className="mt-2.5 space-y-2 pt-2 border-t border-slate-100 animate-fadeIn">
                <input
                  value={f.name}
                  onChange={(e) => set({ name: e.target.value })}
                  placeholder="Match Title (defaults to Team A vs Team B)"
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
                    placeholder="Ground / Venue"
                    className="input !py-1.5 text-xs"
                    maxLength={100}
                  />
                </div>
              </div>
            )}
          </div>

          {/* 5. BIG BOLD LAUNCH CTA */}
          <button
            type="submit"
            disabled={busy}
            className="w-full relative overflow-hidden inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-400 hover:to-teal-500 py-3 text-sm font-black text-white shadow-lg shadow-emerald-900/30 active:scale-98 transition-all disabled:opacity-60"
          >
            {busy ? (
              <Loader2 className="h-4.5 w-4.5 animate-spin" />
            ) : (
              <Zap className="h-4.5 w-4.5 text-yellow-300 drop-shadow animate-pulse" />
            )}
            <span>{busy ? 'Launching match…' : '⚡ START LIVE SCORING'}</span>
          </button>
        </form>
      </div>

      {/* POPUP MODAL FOR CUSTOMIZING GUEST 11 PLAYERS */}
      <Modal open={guestModalOpen} onClose={() => setGuestModalOpen(false)} title="Guest XI - 11 Players">
        <div className="space-y-3">
          <p className="text-xs text-slate-500">
            Customize player names and roles for <strong>{f.guestTeamName || 'Guest XI'}</strong>.
          </p>

          <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
            {guestPlayers.map((player, idx) => (
              <div key={idx} className="flex items-center gap-1.5 p-1 rounded-xl border border-slate-200 bg-slate-50/50">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white border border-slate-200 font-mono text-[10px] font-black text-slate-600">
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
              className="btn btn-green bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-1.5 px-4 rounded-xl"
            >
              Done
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
