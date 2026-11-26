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
  Coins,
  Check,
  Edit2,
  MapPin,
  Calendar,
  RotateCw,
  Sparkles,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { api } from '../api.js';
import { useFetch } from '../useFetch.js';
import { useAuth } from '../context/AuthContext.jsx';
import { ErrorBox, SkeletonForm, TeamLogo, DropdownSelect, Modal } from '../components/ui.jsx';
import { playCoinFlipSound, playCoinWinSound } from '../utils/audio.js';
import { createOfflineMatch, getOfflineTeams, saveOfflineTeam } from '../utils/offlineStorage.js';

const QUICK_OVERS = [6, 8, 10, 12, 15, 20, 50];

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
    format: 'T10',
    overs: 10,
    date: '',
    venue: '',
    tossWinner: '',
    tossDecision: 'bat',
    tieBreaker: 'tie',
    mode: (typeof window !== 'undefined' && localStorage.getItem('cricket_scoring_mode') === 'offline') ? 'offline' : 'online',
  });

  const [guestPlayers, setGuestPlayers] = useState(
    Array.from({ length: 11 }, (_, i) => ({
      name: `Player ${i + 1}`,
      role: i < 4 ? 'Batsman' : i === 4 ? 'Wicket Keeper' : i < 7 ? 'All-rounder' : 'Bowler',
    }))
  );

  const [coinModalOpen, setCoinModalOpen] = useState(false);
  const [guestModalOpen, setGuestModalOpen] = useState(false);
  const [showMoreSettings, setShowMoreSettings] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  // Flip Coin is only shown if enabled in Settings (default: false / OFF)
  const showCoinFlip = typeof window !== 'undefined' && localStorage.getItem('cricket_coin_flip') === 'true';

  const set = (patch) => setF((p) => ({ ...p, ...patch }));

  const offlineTeamsList = useMemo(() => {
    const list = getOfflineTeams();
    if (list.length === 0) {
      const t1 = {
        id: 'local_team_1',
        name: 'Team Alpha',
        isLocal: true,
        canManage: true,
        playerCount: 11,
        players: Array.from({ length: 11 }, (_, i) => ({
          name: `Alpha Player ${i + 1}`,
          role: i < 4 ? 'Batsman' : i === 4 ? 'Wicket Keeper' : i < 7 ? 'All-rounder' : 'Bowler',
        })),
      };
      const t2 = {
        id: 'local_team_2',
        name: 'Team Beta',
        isLocal: true,
        canManage: true,
        playerCount: 11,
        players: Array.from({ length: 11 }, (_, i) => ({
          name: `Beta Player ${i + 1}`,
          role: i < 4 ? 'Batsman' : i === 4 ? 'Wicket Keeper' : i < 7 ? 'All-rounder' : 'Bowler',
        })),
      };
      return [t1, t2];
    }
    return list;
  }, []);

  const combinedTeams = useMemo(() => {
    const onlineList = data?.items || [];
    if (f.mode === 'offline') {
      return [...offlineTeamsList, ...onlineList];
    }
    return onlineList.length > 0 ? onlineList : offlineTeamsList;
  }, [data, f.mode, offlineTeamsList]);

  const myTeams = useMemo(
    () => (combinedTeams || []).filter((t) => (t.canManage !== false) && (t.playerCount || 11) >= 11),
    [combinedTeams]
  );

  // Fetch connections for selected homeTeam if not admin
  const { data: connData, loading: connLoading } = useFetch(
    f.homeTeam && !isAdmin && f.mode !== 'offline' ? `/teams/${f.homeTeam}/connections` : null
  );

  useEffect(() => {
    if (!f.homeTeam && myTeams.length > 0) {
      set({ homeTeam: myTeams[0].id });
    }
  }, [myTeams, f.homeTeam]);

  const opponents = useMemo(() => {
    if (isAdmin || f.mode === 'offline') {
      return (combinedTeams || []).filter((t) => t.id !== f.homeTeam && (t.playerCount || 11) >= 11);
    }
    if (!f.homeTeam) return [];
    const connectedList = connData?.connected?.map((c) => c.team) || [];
    return connectedList.filter((t) => (t.playerCount || 11) >= 11);
  }, [isAdmin, f.mode, combinedTeams, f.homeTeam, connData]);

  // Options for opponent select dropdown (Regular opponents + Saved Guest Opponents + New Guest XI)
  const opponentOptions = useMemo(() => {
    const regular = [];
    const savedGuests = [];

    opponents.forEach((t) => {
      if (t.isGuest) {
        savedGuests.push({
          value: t.id,
          label: `👤 ${t.name} (Guest${t.code ? ` · ${t.code}` : ''})`,
        });
      } else {
        regular.push({
          value: t.id,
          label: `${t.name} (${t.playerCount || 11}p)`,
        });
      }
    });

    const list = [...regular, ...savedGuests];
    list.push({
      value: 'guest',
      label: '➕ New Guest XI (New Opponent)',
    });
    return list;
  }, [opponents]);

  // Auto-default awayTeam to last played/selected opponent for this homeTeam, or first opponent or 'guest'
  useEffect(() => {
    if (f.homeTeam && !connLoading && !f.awayTeam) {
      try {
        const lastAway = localStorage.getItem(`cricket_last_opponent_${f.homeTeam}`);
        if (lastAway && (lastAway === 'guest' || opponents.some((t) => t.id === lastAway))) {
          set({ awayTeam: lastAway });
          return;
        }
      } catch {}
      if (opponents.length > 0) {
        set({ awayTeam: opponents[0].id });
      } else {
        set({ awayTeam: 'guest' });
      }
    }
  }, [f.homeTeam, connLoading, opponents, f.awayTeam]);

  const home = combinedTeams.find((t) => t.id === f.homeTeam);
  const awayDoc =
    (combinedTeams || []).find((t) => t.id === f.awayTeam) ||
    connData?.connected?.map((c) => c.team).find((t) => t.id === f.awayTeam);
  const isOpponentGuest = f.awayTeam === 'guest' || Boolean(awayDoc?.isGuest);
  const effectiveAway = isOpponentGuest
    ? {
        id: f.awayTeam === 'guest' ? 'guest' : awayDoc?.id,
        name: f.guestTeamName.trim() || awayDoc?.name || 'Guest XI',
        isGuest: true,
      }
    : awayDoc;

  // When an existing guest team is selected, fetch its actual squad so 11 players load
  const { data: awayTeamData } = useFetch(
    f.awayTeam && f.awayTeam !== 'guest' && awayDoc?.isGuest ? `/teams/${f.awayTeam}` : null
  );

  useEffect(() => {
    if (awayTeamData?.players && awayTeamData.players.length >= 11) {
      setGuestPlayers(
        awayTeamData.players.slice(0, 11).map((p, idx) => ({
          name: p.name || `Player ${idx + 1}`,
          role: p.role || (idx < 4 ? 'Batsman' : idx === 4 ? 'Wicket Keeper' : idx < 7 ? 'All-rounder' : 'Bowler'),
        }))
      );
    }
  }, [awayTeamData]);

  // Auto-sync guest team name if selecting an existing guest team
  useEffect(() => {
    if (f.awayTeam === 'guest') {
      if (!f.guestTeamName || f.guestTeamName === awayDoc?.name) {
        set({ guestTeamName: 'Guest XI' });
      }
    } else if (awayDoc?.isGuest && awayDoc.name) {
      set({ guestTeamName: awayDoc.name });
    }
  }, [f.awayTeam, awayDoc]);

  // Auto-select toss winner to home team if empty
  useEffect(() => {
    if (!f.tossWinner && home) {
      set({ tossWinner: home.id });
    }
  }, [home, f.tossWinner]);

  // Precise Toss Winner state tracking
  const isHomeWinner = f.tossWinner && home && String(f.tossWinner) === String(home.id);
  const isAwayWinner =
    f.tossWinner &&
    effectiveAway &&
    (f.tossWinner === 'guest' || String(f.tossWinner) === String(effectiveAway.id));
  const tossWinnerTeam = isHomeWinner ? home : isAwayWinner ? effectiveAway : null;

  const handleOversChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '');
    const num = raw === '' ? '' : Math.min(100, Math.max(1, Number(raw)));
    set({
      overs: num,
      format: num === 20 ? 'T20' : num === 10 ? 'T10' : num === 50 ? 'ODI' : 'Custom',
    });
  };

  const handlePresetClick = (ov) => {
    set({
      overs: ov,
      format: ov === 20 ? 'T20' : ov === 10 ? 'T10' : ov === 50 ? 'ODI' : 'Custom',
    });
  };

  // Fun Interactive Coin Toss Spin
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
    if (f.format === 'Custom' && (!Number.isInteger(finalOvers) || finalOvers < 1 || finalOvers > 100)) {
      er.overs = 'Enter overs (1 - 100)';
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
        guestTeam: (isGuest || isOpponentGuest)
          ? {
              name: f.guestTeamName.trim() || 'Guest XI',
              players: guestPlayers.map((p, idx) => ({
                name: p.name.trim() || `Player ${idx + 1}`,
                role: p.role,
              })),
            }
          : undefined,
        format: Number(f.overs) === 20 ? 'T20' : Number(f.overs) === 10 ? 'T10' : Number(f.overs) === 50 ? 'ODI' : 'Custom',
        overs: Number(f.overs) || 20,
        date: f.date ? new Date(f.date).toISOString() : undefined,
        venue: f.venue,
        tossWinner: f.tossWinner === 'guest' ? 'guest' : f.tossWinner,
        tossDecision: f.tossDecision,
        tieBreaker: f.tieBreaker,
      };

      if (f.mode === 'offline') {
        const homeDoc = home || { id: 'home_local', name: 'Home Team', players: [] };
        const awayDocFinal = effectiveAway || { id: 'away_local', name: 'Opponent', players: [] };
        const offlineMatch = createOfflineMatch({
          name: f.name || `${homeDoc.name} vs ${awayDocFinal.name}`,
          homeTeam: homeDoc,
          awayTeam: awayDocFinal,
          format: Number(f.overs) === 20 ? 'T20' : Number(f.overs) === 10 ? 'T10' : Number(f.overs) === 50 ? 'ODI' : 'Custom',
          overs: Number(f.overs) || 10,
          venue: f.venue,
          tossWinner: f.tossWinner === 'guest' ? awayDocFinal.id : f.tossWinner || homeDoc.id,
          tossDecision: f.tossDecision || 'bat',
        });
        nav(`/matches/${offlineMatch.id}`);
        return;
      }

      const res = await api('/matches', { method: 'POST', body });
      try {
        const savedAwayId = res?.match?.awayTeam?.id || (isGuest ? 'guest' : f.awayTeam);
        localStorage.setItem(`cricket_last_opponent_${f.homeTeam}`, savedAwayId);
      } catch {}
      nav(`/matches/${res.match.id}`);
    } catch (err) {
      setFormError(err.message || 'Failed to create match');
      setBusy(false);
    }
  };

  if (loading && myTeams.length === 0 && f.mode !== 'offline') return <SkeletonForm />;
  if (error && myTeams.length === 0 && f.mode !== 'offline') return <ErrorBox message={error} />;

  if (myTeams.length === 0 && f.mode !== 'offline') {
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

          {/* ⚔️ VISUAL VS BATTLE ARENA (COMPACT & PROMINENT) */}
          <div className="mt-2.5 rounded-2xl bg-white/5 border border-white/10 p-2.5 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-2.5">
              
              {/* Home Team Side (Team Name) */}
              <div className="flex-1 text-center min-w-0">
                <div className="mx-auto flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl bg-emerald-500/20 border-2 border-emerald-400/50 text-emerald-400 shadow-md">
                  {home ? <TeamLogo team={home} size={28} /> : <Shield className="h-5 w-5 text-emerald-400" />}
                </div>
                <div className="mt-1 text-xs sm:text-sm font-black truncate text-white tracking-tight">
                  {home?.name || 'Your Team'}
                </div>
                <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest block">
                  Home Team
                </span>
              </div>

              {/* Glowing VS Badge & Match Overs Display */}
              <div className="flex flex-col items-center justify-center shrink-0 px-1">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-tr from-amber-500 to-rose-600 text-[11px] font-black text-white shadow-md ring-2 ring-white/30">
                  VS
                </span>
                <span className="text-[11px] sm:text-xs font-black text-amber-300 uppercase tracking-wider mt-0.5 drop-shadow-sm">
                  {f.overs ? `${f.overs} Overs` : 'Match'}
                </span>
                {tossWinnerTeam && (
                  <span className="text-[9px] font-bold text-slate-300 mt-0.5 max-w-[120px] truncate text-center">
                    Toss: {tossWinnerTeam.name.slice(0, 10)} ({f.tossDecision === 'bat' ? 'Bat' : 'Bowl'})
                  </span>
                )}
              </div>

              {/* Away Team Side (Team Name) */}
              <div className="flex-1 text-center min-w-0">
                <div className="mx-auto flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl bg-blue-500/20 border-2 border-blue-400/50 text-blue-400 shadow-md">
                  {effectiveAway?.isGuest ? (
                    <Users className="h-5 w-5 text-amber-400" />
                  ) : effectiveAway ? (
                    <TeamLogo team={effectiveAway} size={28} />
                  ) : (
                    <Shield className="h-5 w-5 text-blue-400" />
                  )}
                </div>
                <div className="mt-1 text-xs sm:text-sm font-black truncate text-white tracking-tight">
                  {effectiveAway?.name || 'Opponent'}
                </div>
                <span className="text-[9px] font-bold text-blue-400 uppercase tracking-widest block">
                  {isOpponentGuest ? 'Guest Opponent' : 'Opponent'}
                </span>
              </div>

            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={submit} noValidate className="p-3.5 sm:p-4 space-y-3 bg-slate-50/50">
          <ErrorBox message={formError} />

          {/* Scoring Mode Switcher: Online Live vs Offline Local Match */}
          <div className="flex items-center justify-between p-1 rounded-2xl bg-white border border-slate-200 shadow-2xs gap-1">
            <button
              type="button"
              onClick={() => set({ mode: 'online' })}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-black transition-all ${
                f.mode === 'online'
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Wifi className="h-3.5 w-3.5" />
              <span>Online Live</span>
            </button>
            <button
              type="button"
              onClick={() => set({ mode: 'offline' })}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-black transition-all ${
                f.mode === 'offline'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <WifiOff className="h-3.5 w-3.5" />
              <span>Offline Local Match</span>
            </button>
          </div>

          {f.mode === 'online' && home && !home.allowOnlineScoring && !isAdmin && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-[11px] text-amber-900 flex items-center justify-between gap-2">
              <span>⚠️ இந்த டீமிற்கு அட்மின் ஆன்லைன் லைவ் அனுமதி தரவில்லை. ஆஃப்லைனில் உடனடியாக ஸ்கோர் செய்யலாம்!</span>
              <button
                type="button"
                onClick={() => set({ mode: 'offline' })}
                className="btn btn-outline text-[10px] !py-0.5 !px-2 bg-white text-amber-900 font-bold shrink-0"
              >
                Switch to Offline
              </button>
            </div>
          )}

          {/* 1. TEAM SELECTION DROPDOWNS - STACKED 1-BY-1 FOR FULL VISIBILITY */}
          <div className="rounded-2xl border border-slate-200 bg-white p-2.5 sm:p-3 space-y-2 shadow-2xs">
            {/* Your Team (Home) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between px-0.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Your Team (Home)
                </label>
                <span className="text-[9.5px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                  Primary Squad
                </span>
              </div>
              <DropdownSelect
                id="home"
                value={f.homeTeam}
                onChange={(id) => set({ homeTeam: id, awayTeam: f.awayTeam === id ? '' : f.awayTeam, tossWinner: id })}
                options={homeOptions}
                placeholder="Select squad"
                error={!!errors.homeTeam}
                buttonClassName="!py-2 !px-3 text-xs sm:text-sm font-bold min-h-[40px] w-full"
              />
            </div>

            {/* Opponent Team (Away / Guest) - Full Width so long names are completely visible */}
            <div className="space-y-1 pt-1.5 border-t border-slate-100">
              <div className="flex items-center justify-between px-0.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-blue-800 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  Opponent Team
                </label>
                <span className="text-[9.5px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                  {isOpponentGuest ? 'Guest XI' : 'Registered / Guest'}
                </span>
              </div>
              <DropdownSelect
                id="away"
                value={f.awayTeam}
                onChange={(id) => set({ awayTeam: id, tossWinner: f.tossWinner || f.homeTeam })}
                options={opponentOptions}
                placeholder={connLoading ? 'Loading...' : 'Select Opponent'}
                error={!!errors.awayTeam}
                buttonClassName="!py-2 !px-3 text-xs sm:text-sm font-bold min-h-[40px] w-full"
              />
            </div>

            {/* If Guest XI is selected: Clean dynamic Team Name + Edit 11 button */}
            {isOpponentGuest && (
              <div className="rounded-xl bg-gradient-to-r from-amber-50 via-orange-50/40 to-amber-50 border border-amber-200/90 p-2 sm:p-2.5 space-y-1.5 text-xs mt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 flex items-center gap-1">
                    <Edit2 className="h-3 w-3 text-amber-600" />
                    Opponent Team Name
                  </span>
                  <div className="flex items-center gap-1">
                    {awayDoc?.code && (
                      <span className="badge bg-amber-200 text-amber-950 border border-amber-400 font-mono text-[9px] font-black py-0.2 px-1.5 rounded">
                        {awayDoc.code}
                      </span>
                    )}
                    <span className="badge bg-amber-100 text-amber-800 border border-amber-300 text-[9px] font-bold py-0.2 px-1.5 rounded">
                      Opponent for {home?.name || 'Your Team'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      className="input !py-1.5 !px-2.5 text-xs sm:text-sm font-bold text-slate-900 w-full bg-white border-amber-300 focus:border-amber-500 focus:ring-amber-400/20 shadow-2xs"
                      value={f.guestTeamName}
                      onChange={(e) => set({ guestTeamName: e.target.value })}
                      placeholder="e.g. Guest Team 1, Kovai Kings XI"
                      maxLength={60}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setGuestModalOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 px-3 py-1.5 text-xs font-black text-white shadow-xs shrink-0 transition active:scale-95 min-h-[36px]"
                    title="Customize 11 players"
                  >
                    <Users className="h-3.5 w-3.5" />
                    <span>11 Players</span>
                  </button>
                </div>
                <p className="text-[9.5px] text-amber-700 font-medium leading-tight">
                  💡 {f.awayTeam === 'guest'
                    ? `This team will be saved in Teams > Opponents with a unique Guest Code (GST...) for ${home?.name || 'your team'}.`
                    : `Saved opponent team for ${home?.name || 'your team'}. You can play matches or adjust the squad anytime.`}
                </p>
              </div>
            )}
          </div>

          {/* 2. MATCH OVERS (INPUT WITH DEFAULT 10) */}
          <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-3.5 space-y-2 shadow-2xs">
            <div className="flex items-center justify-between">
              <label htmlFor="match-overs" className="text-xs font-black uppercase tracking-wider text-slate-700">
                Match Overs
              </label>
              <span className="text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                {f.overs ? `${f.overs} Overs Per Side` : 'Enter overs'}
              </span>
            </div>

            {/* Direct Input (Default 10) */}
            <div className="flex items-center gap-2 bg-slate-50 border-2 border-emerald-500/70 rounded-xl px-3.5 py-2.5 min-h-[46px] focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-500/20 transition shadow-2xs">
              <input
                id="match-overs"
                type="number"
                min="1"
                max="100"
                value={f.overs}
                onChange={handleOversChange}
                placeholder="10"
                className="w-full font-black text-base text-slate-900 bg-transparent focus:outline-none"
              />
              <span className="text-xs font-bold text-slate-500 shrink-0">Overs</span>
            </div>
            {errors.overs && <span className="text-xs text-red-600 font-bold block">{errors.overs}</span>}
          </div>

          {/* 3. WHO WON THE TOSS SECTION (FULL WIDTH NAMES - NO TRUNCATION) */}
          <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-3.5 space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1">
                <span>Who Won The Toss?</span>
                <span className="text-red-500">*</span>
              </span>

              {/* 3D Coin Toss Arena Popup Button (Only if enabled in Settings) */}
              {showCoinFlip && (
                <button
                  type="button"
                  onClick={() => setCoinModalOpen(true)}
                  disabled={!home || !effectiveAway}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 px-3 py-1.5 text-xs font-black text-slate-950 transition active:scale-95 shadow-sm border border-amber-300 min-h-[34px]"
                  title="Open 3D Coin Toss Arena"
                >
                  <Coins className="h-4 w-4 text-amber-950" />
                  <span>Flip Coin 🪙</span>
                </button>
              )}
            </div>

            {/* Team Toss Winner Selector - Full Width Stacked Cards so Full Team Name is Always Visible */}
            <div className="space-y-2">
              {/* Home Team Button */}
              {home && (
                <button
                  type="button"
                  onClick={() => set({ tossWinner: home.id })}
                  className={`w-full flex items-center justify-between gap-3 p-2.5 sm:p-3 rounded-2xl border-2 transition-all min-h-[44px] ${
                    isHomeWinner
                      ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white border-emerald-500 shadow-sm'
                      : 'bg-emerald-50/40 text-slate-800 border-emerald-200/80 hover:bg-emerald-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1 text-left">
                    <TeamLogo team={home} size={24} />
                    <span className="text-xs sm:text-sm font-black leading-snug break-words">{home.name}</span>
                  </div>
                  <span
                    className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg shrink-0 ${
                      isHomeWinner
                        ? 'bg-white/20 text-white ring-1 ring-white/30'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {isHomeWinner ? '✓ Won Toss' : 'Home Team'}
                  </span>
                </button>
              )}

              {/* Away / Opponent Team Button */}
              {effectiveAway && (
                <button
                  type="button"
                  onClick={() => set({ tossWinner: effectiveAway.id })}
                  className={`w-full flex items-center justify-between gap-3 p-2.5 sm:p-3 rounded-2xl border-2 transition-all min-h-[44px] ${
                    isAwayWinner
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-500 shadow-sm'
                      : 'bg-blue-50/40 text-slate-800 border-blue-200/80 hover:bg-blue-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1 text-left">
                    {effectiveAway.isGuest ? (
                      <Users className="h-5 w-5 text-amber-500 shrink-0" />
                    ) : (
                      <TeamLogo team={effectiveAway} size={24} />
                    )}
                    <span className="text-xs sm:text-sm font-black leading-snug break-words">{effectiveAway.name}</span>
                  </div>
                  <span
                    className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg shrink-0 ${
                      isAwayWinner
                        ? 'bg-white/20 text-white ring-1 ring-white/30'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {isAwayWinner ? '✓ Won Toss' : isOpponentGuest ? 'Guest XI' : 'Opponent'}
                  </span>
                </button>
              )}
            </div>

            {/* Toss Decision: Bat or Bowl - Default: Bat First */}
            <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
              <span className="text-xs font-black text-slate-600 shrink-0">
                Elected to:
              </span>
              <div className="grid grid-cols-2 gap-2 flex-1">
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
                      className={`rounded-xl py-2 px-3 text-xs sm:text-sm font-black border transition-all min-h-[40px] ${
                        active
                          ? 'bg-slate-900 text-white border-slate-900 shadow-sm font-black'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {l}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 4. OPTIONAL MATCH DETAILS TOGGLE (WITH CLEAR DATE PLACEHOLDER) */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-3">
            <button
              type="button"
              onClick={() => setShowMoreSettings(!showMoreSettings)}
              className="flex items-center justify-between w-full text-xs sm:text-sm font-bold text-slate-700 hover:text-slate-900 transition py-1 px-0.5"
            >
              <span className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-slate-400" />
                <span>Venue, Date & Match Name (Optional)</span>
              </span>
              {showMoreSettings ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {showMoreSettings && (
              <div className="mt-3 space-y-2.5 pt-2.5 border-t border-slate-100 animate-fadeIn">
                <input
                  value={f.name}
                  onChange={(e) => set({ name: e.target.value })}
                  placeholder="Match Title (defaults to Team A vs Team B)"
                  className="input !py-2.5 text-sm w-full font-medium"
                  maxLength={100}
                />
                <div className="grid grid-cols-2 gap-2">
                  {/* Styled Date Picker with visible "Select Date & Time" placeholder */}
                  <div className="relative">
                    <input
                      type="datetime-local"
                      value={f.date}
                      onChange={(e) => set({ date: e.target.value })}
                      className="input !py-2.5 !pl-9 text-xs sm:text-sm font-semibold text-slate-800 w-full"
                    />
                    <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    {!f.date && (
                      <span className="pointer-events-none absolute left-9 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium select-none">
                        Date & Time
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      value={f.venue}
                      onChange={(e) => set({ venue: e.target.value })}
                      placeholder="Ground / Venue"
                      className="input !py-2.5 !pl-9 text-xs sm:text-sm font-semibold text-slate-800 w-full"
                      maxLength={100}
                    />
                    <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 5. BIG BOLD LAUNCH CTA */}
          <button
            type="submit"
            disabled={busy}
            className={`w-full relative overflow-hidden inline-flex items-center justify-center gap-2 rounded-2xl py-3.5 sm:py-4 text-sm sm:text-base font-black text-white shadow-lg active:scale-98 transition-all disabled:opacity-60 min-h-[52px] ${
              f.mode === 'offline'
                ? 'bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 hover:from-amber-400 hover:to-orange-500 shadow-amber-900/30'
                : 'bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-emerald-900/30'
            }`}
          >
            {busy ? (
              <Loader2 className="h-4.5 w-4.5 animate-spin" />
            ) : f.mode === 'offline' ? (
              <WifiOff className="h-4.5 w-4.5 text-white" />
            ) : (
              <Zap className="h-4.5 w-4.5 text-yellow-300 drop-shadow animate-pulse" />
            )}
            <span>
              {busy
                ? 'Launching match…'
                : f.mode === 'offline'
                ? '⚡ START OFFLINE MATCH (SAVED LOCALLY)'
                : '⚡ START LIVE SCORING'}
            </span>
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

      {/* 🪙 3D COIN TOSS POPUP MODAL */}
      <CoinTossModal
        open={coinModalOpen}
        onClose={() => setCoinModalOpen(false)}
        home={home}
        away={effectiveAway}
        currentWinner={f.tossWinner}
        decision={f.tossDecision}
        onConfirm={(winnerId, dec) => {
          set({ tossWinner: winnerId, tossDecision: dec });
          setCoinModalOpen(false);
        }}
      />
    </div>
  );
}

function CoinTossModal({ open, onClose, home, away, currentWinner, decision, onConfirm }) {
  const [isFlipping, setIsFlipping] = useState(false);
  const [winner, setWinner] = useState(currentWinner || home?.id);
  const [selectedDecision, setSelectedDecision] = useState(decision || 'bat');
  const [activeSide, setActiveSide] = useState('home');
  const [rotationY, setRotationY] = useState(0);
  const [landed, setLanded] = useState(false);

  const startFlip = () => {
    if (isFlipping || !home || !away) return;
    setIsFlipping(true);
    setLanded(false);
    playCoinFlipSound();

    const pickHome = Math.random() < 0.5;
    const finalWinner = pickHome ? home.id : away.id;

    // Rapid alternating team highlight effect
    let ticks = 0;
    const interval = setInterval(() => {
      ticks++;
      setActiveSide((prev) => (prev === 'home' ? 'away' : 'home'));
      if (ticks >= 16) {
        clearInterval(interval);
      }
    }, 120);

    // 5 full spins (1800 deg) + 0 for home or 180 for away
    setRotationY((prev) => {
      const base = Math.floor(prev / 360) * 360 + 1800;
      return pickHome ? base : base + 180;
    });

    setTimeout(() => {
      setWinner(finalWinner);
      setActiveSide(pickHome ? 'home' : 'away');
      setIsFlipping(false);
      setLanded(true);
      playCoinWinSound();
    }, 2200);
  };

  useEffect(() => {
    if (open) {
      setWinner(currentWinner || home?.id);
      setSelectedDecision(decision || 'bat');
      setLanded(false);
      startFlip();
    }
  }, [open]);

  if (!open) return null;

  const winnerTeam = winner === away?.id ? away : home;
  const isHomeActive = isFlipping ? activeSide === 'home' : winner === home?.id;
  const isAwayActive = isFlipping ? activeSide === 'away' : winner === away?.id;

  const handleApply = () => {
    onConfirm(winner, selectedDecision);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-navy-950/80 backdrop-blur-md"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isFlipping) {
          handleApply();
        }
      }}
    >
      <div className="relative w-full max-w-sm sm:max-w-md overflow-hidden rounded-3xl bg-gradient-to-b from-slate-900 via-navy-900 to-slate-950 p-5 text-white shadow-2xl border border-white/10">
        {/* Glow backdrop */}
        <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-emerald-500/20 blur-2xl" />
        <div className="pointer-events-none absolute -left-12 -bottom-12 h-36 w-36 rounded-full bg-blue-500/20 blur-2xl" />

        {/* Header */}
        <div className="relative flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-400/20 text-amber-300">
              <Coins className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black tracking-tight text-white flex items-center gap-1.5">
                <span>Match Toss Arena</span>
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              </h2>
              <p className="text-[10px] text-slate-300">Live 3D Coin Toss</p>
            </div>
          </div>
          <button
            type="button"
            disabled={isFlipping}
            onClick={handleApply}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition disabled:opacity-40"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ⚔️ Teams Rotating Showcase */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          {/* Home Team Card */}
          <div
            className={`relative rounded-2xl p-3 text-center transition-all duration-200 border-2 ${
              isHomeActive
                ? 'bg-emerald-500/25 border-emerald-400 scale-[1.03] shadow-lg shadow-emerald-500/20'
                : 'bg-white/5 border-white/10 opacity-70 scale-95'
            }`}
          >
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-400">
              <TeamLogo team={home} size={30} />
            </div>
            <div className="mt-1.5 text-xs sm:text-sm font-black truncate text-white">
              {home?.name || 'Home Team'}
            </div>
            <span className="text-[9.5px] font-bold uppercase tracking-wider text-emerald-400 block">
              HEADS (Home)
            </span>
            {landed && winner === home?.id && (
              <span className="inline-block mt-1 badge bg-emerald-400 text-slate-950 font-black text-[9px] py-0 px-1.5 rounded-full shadow-sm">
                ✓ WON TOSS
              </span>
            )}
          </div>

          {/* Away Team Card */}
          <div
            className={`relative rounded-2xl p-3 text-center transition-all duration-200 border-2 ${
              isAwayActive
                ? 'bg-blue-500/25 border-blue-400 scale-[1.03] shadow-lg shadow-blue-500/20'
                : 'bg-white/5 border-white/10 opacity-70 scale-95'
            }`}
          >
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/20 border border-blue-400/40 text-blue-400">
              {away?.isGuest ? (
                <Users className="h-6 w-6 text-amber-400" />
              ) : (
                <TeamLogo team={away} size={30} />
              )}
            </div>
            <div className="mt-1.5 text-xs sm:text-sm font-black truncate text-white">
              {away?.name || 'Opponent'}
            </div>
            <span className="text-[9.5px] font-bold uppercase tracking-wider text-blue-400 block">
              TAILS (Opponent)
            </span>
            {landed && winner === away?.id && (
              <span className="inline-block mt-1 badge bg-blue-400 text-slate-950 font-black text-[9px] py-0 px-1.5 rounded-full shadow-sm">
                ✓ WON TOSS
              </span>
            )}
          </div>
        </div>

        {/* 🪙 3D COIN STAGE */}
        <div className="relative my-5 flex flex-col items-center justify-center">
          <div className="[perspective:1000px]">
            <div
              className="relative h-24 w-24 sm:h-28 sm:w-28 rounded-full shadow-2xl transition-transform duration-[2200ms] ease-out [transform-style:preserve-3d]"
              style={{ transform: `rotateY(${rotationY}deg)` }}
            >
              {/* Front Face: Home Team */}
              <div className="absolute inset-0 flex flex-col items-center justify-center rounded-full border-4 border-amber-300 bg-gradient-to-tr from-emerald-700 via-emerald-500 to-amber-400 p-2 text-white shadow-inner [backface-visibility:hidden]">
                <Coins className="h-7 w-7 text-amber-200 drop-shadow" />
                <div className="text-[11px] font-black uppercase tracking-wider truncate max-w-[70px] text-center mt-0.5">
                  {home?.name?.slice(0, 10)}
                </div>
                <span className="text-[8.5px] font-bold text-amber-100 uppercase tracking-widest">Heads</span>
              </div>

              {/* Back Face: Away Team */}
              <div
                className="absolute inset-0 flex flex-col items-center justify-center rounded-full border-4 border-amber-300 bg-gradient-to-tr from-blue-800 via-indigo-600 to-amber-400 p-2 text-white shadow-inner [backface-visibility:hidden]"
                style={{ transform: 'rotateY(180deg)' }}
              >
                <Coins className="h-7 w-7 text-amber-200 drop-shadow" />
                <div className="text-[11px] font-black uppercase tracking-wider truncate max-w-[70px] text-center mt-0.5">
                  {away?.name?.slice(0, 10)}
                </div>
                <span className="text-[8.5px] font-bold text-amber-100 uppercase tracking-widest">Tails</span>
              </div>
            </div>
          </div>

          <div className="mt-3 text-center">
            {isFlipping ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-black text-amber-300 animate-pulse">
                <RotateCw className="h-3.5 w-3.5 animate-spin" />
                Flipping Coin & Choosing Winner…
              </span>
            ) : landed ? (
              <div className="rounded-xl bg-amber-400/20 border border-amber-400/40 px-3 py-1.5 text-center">
                <span className="text-xs sm:text-sm font-black text-amber-300">
                  🎉 {winnerTeam?.name} Won the Toss!
                </span>
              </div>
            ) : null}
          </div>
        </div>

        {/* Toss Decision Selector */}
        <div className="space-y-2 pt-2 border-t border-white/10">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block text-center">
            {winnerTeam?.name} Elected to:
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              ['bat', '🏏 Bat First'],
              ['bowl', '⚾ Bowl First'],
            ].map(([v, label]) => {
              const active = selectedDecision === v;
              return (
                <button
                  key={v}
                  type="button"
                  disabled={isFlipping}
                  onClick={() => setSelectedDecision(v)}
                  className={`py-2 px-3 rounded-xl text-xs sm:text-sm font-black border transition-all min-h-[40px] ${
                    active
                      ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-navy-950 border-amber-400 shadow-md font-black'
                      : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="mt-4 grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            disabled={isFlipping}
            onClick={startFlip}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 px-3 py-2 text-xs font-black text-slate-200 transition active:scale-95 min-h-[42px]"
          >
            <RotateCw className="h-3.5 w-3.5" />
            <span>Flip Again 🪙</span>
          </button>

          <button
            type="button"
            disabled={isFlipping}
            onClick={handleApply}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-pitch-500 hover:from-emerald-600 hover:to-pitch-600 px-3 py-2 text-xs sm:text-sm font-black text-navy-950 shadow-md transition active:scale-95 min-h-[42px]"
          >
            <Check className="h-4 w-4" />
            <span>Confirm & Apply</span>
          </button>
        </div>
      </div>
    </div>
  );
}
