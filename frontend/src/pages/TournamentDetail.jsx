import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Medal,
  MapPin,
  Calendar,
  Users,
  Trophy,
  Plus,
  Play,
  Check,
  Copy,
  Share2,
  KeyRound,
  ShieldAlert,
  ShieldCheck,
  Swords,
  Trash2,
  Clock,
  Sparkles,
  Flame,
  Award,
  ChevronRight,
} from 'lucide-react';
import { useFetch } from '../useFetch.js';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api.js';
import { Spinner, ErrorBox, Modal, ConfirmDialog, SkeletonCard, SkeletonTournamentDetail, DropdownSelect } from '../components/ui.jsx';
import { ScorerLoginModal } from '../components/ScorerLoginModal.jsx';

export default function TournamentDetail() {
  const { id } = useParams();
  const { user, isSuper, isAdmin } = useAuth();
  const [tab, setTab] = useState('fixtures'); // 'fixtures' | 'teams' | 'scorers' | 'rules'
  const [copied, setCopied] = useState(false);
  const [scorerModalOpen, setScorerModalOpen] = useState(false);

  // Sub-modals for Organizer
  const [addTeamOpen, setAddTeamOpen] = useState(false);
  const [addTeamTab, setAddTeamTab] = useState('code'); // 'code' | 'guest'
  const [teamCodeInput, setTeamCodeInput] = useState('');
  const [guestTeamName, setGuestTeamName] = useState('');
  const [guestTeamCity, setGuestTeamCity] = useState('');
  const [guestTeamContact, setGuestTeamContact] = useState('');

  // Edit Team modal
  const [editTeamOpen, setEditTeamOpen] = useState(false);
  const [editTeamId, setEditTeamId] = useState(null);
  const [editTeamName, setEditTeamName] = useState('');
  const [editTeamCity, setEditTeamCity] = useState('');
  const [editTeamContact, setEditTeamContact] = useState('');

  const [awardByeOpen, setAwardByeOpen] = useState(false);
  const [selectedTeamForBye, setSelectedTeamForBye] = useState('');
  const [byeRound, setByeRound] = useState('Round 1');
  const [byeReason, setByeReason] = useState('Bye advancement to next round');
  const [scheduleMatchOpen, setScheduleMatchOpen] = useState(false);
  const [addScorerOpen, setAddScorerOpen] = useState(false);
  const [scorerName, setScorerName] = useState('');
  const [scorerPin, setScorerPin] = useState('');
  const [scorerGround, setScorerGround] = useState('Ground 1');
  const [teamFilter, setTeamFilter] = useState('all'); // 'all' | 'active' | 'eliminated' | 'byes'
  const [editLimitOpen, setEditLimitOpen] = useState(false);
  const [customMaxTeams, setCustomMaxTeams] = useState(16);

  // Custom match scheduling states
  const [matchHomeTeam, setMatchHomeTeam] = useState('');
  const [matchAwayTeam, setMatchAwayTeam] = useState('');
  const [matchRound, setMatchRound] = useState('Round 1');
  const [matchGround, setMatchGround] = useState('Ground 1');
  const [matchOvers, setMatchOvers] = useState(8);

  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  const { data, loading, error, reload } = useFetch(`/tournaments/${id}`);

  if (loading && !data) return <SkeletonTournamentDetail />;
  if (error && !data) return <ErrorBox message={error} onRetry={reload} />;
  if (!data?.tournament) return <ErrorBox message="Tournament not found" onRetry={reload} />;

  const { tournament, matches = [], liveMatches = [], upcomingMatches = [], completedMatches = [], isOrganizer } = data;
  const teams = tournament.teams || [];
  const byes = tournament.byes || [];
  const grounds = tournament.grounds || ['Ground 1'];
  const scorers = tournament.scorers || [];

  const handleCopyCode = () => {
    navigator.clipboard.writeText(tournament.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWhatsApp = () => {
    const text = `🏆 *${tournament.name}*\n` +
      `📍 Venue: ${tournament.venue || 'Cricket Ground'}\n` +
      `🔢 Tournament Code: *${tournament.code}*\n` +
      `🏏 Teams: ${teams.length} Teams · ${tournament.defaultOvers || 8} Overs\n\n` +
      `📲 Follow Live Scores: ${window.location.href}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Organizer Actions
  const handleAddTeam = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setActionError('');
    try {
      if (addTeamTab === 'code') {
        if (!teamCodeInput.trim()) {
          setActionError('Please enter a Team Code');
          setActionLoading(false);
          return;
        }
        await api.post(`/tournaments/${id}/teams`, { teamCode: teamCodeInput.trim() });
      } else {
        if (!guestTeamName.trim()) {
          setActionError('Please enter a team name');
          setActionLoading(false);
          return;
        }
        await api.post(`/tournaments/${id}/teams`, {
          isGuest: true,
          name: guestTeamName.trim(),
          location: guestTeamCity.trim(),
          contact: guestTeamContact.trim(),
        });
      }
      setTeamCodeInput('');
      setGuestTeamName('');
      setGuestTeamCity('');
      setGuestTeamContact('');
      setAddTeamOpen(false);
      setActionSuccess('Team added successfully!');
      setTimeout(() => setActionSuccess(''), 3000);
      reload();
    } catch (err) {
      setActionError(err.message || 'Failed to add team');
    } finally {
      setActionLoading(false);
    }
  };

  const openEditTeam = (t) => {
    setEditTeamId(t.id);
    setEditTeamName(t.name || '');
    setEditTeamCity(t.location || '');
    setEditTeamContact(t.contact || '');
    setEditTeamOpen(true);
  };

  const handleEditTeam = async (e) => {
    e.preventDefault();
    if (!editTeamName.trim()) return;
    setActionLoading(true);
    setActionError('');
    try {
      await api.put(`/tournaments/${id}/teams/${editTeamId}`, {
        name: editTeamName.trim(),
        location: editTeamCity.trim(),
        contact: editTeamContact.trim(),
      });
      setEditTeamOpen(false);
      setActionSuccess('Team details updated successfully!');
      setTimeout(() => setActionSuccess(''), 3000);
      reload();
    } catch (err) {
      setActionError(err.message || 'Failed to update team');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveTeam = async (teamId) => {
    if (!confirm('Are you sure you want to remove this team from the tournament?')) return;
    try {
      await api.delete(`/tournaments/${id}/teams/${teamId}`);
      reload();
    } catch (err) {
      alert(err.message || 'Failed to remove team');
    }
  };

  const handleAwardBye = async (e) => {
    e.preventDefault();
    if (!selectedTeamForBye) return;
    setActionLoading(true);
    setActionError('');
    try {
      await api.post(`/tournaments/${id}/byes`, {
        teamId: selectedTeamForBye,
        round: byeRound,
        reason: byeReason.trim(),
      });
      setAwardByeOpen(false);
      setSelectedTeamForBye('');
      setByeReason('Bye advancement to next round');
      setActionSuccess(`Bye awarded for ${byeRound}!`);
      setTimeout(() => setActionSuccess(''), 3000);
      reload();
    } catch (err) {
      setActionError(err.message || 'Failed to award Bye');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateTeamStatus = async (teamId, status) => {
    setActionLoading(true);
    setActionError('');
    try {
      await api.patch(`/tournaments/${id}/teams/${teamId}/status`, { status });
      setActionSuccess(`Team marked as ${status}!`);
      setTimeout(() => setActionSuccess(''), 3000);
      reload();
    } catch (err) {
      setActionError(err.message || 'Failed to update team status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateMaxTeams = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setActionError('');
    try {
      await api.put(`/tournaments/${id}`, { maxTeams: Number(customMaxTeams) });
      setEditLimitOpen(false);
      setActionSuccess(`Tournament team limit updated to ${customMaxTeams}!`);
      setTimeout(() => setActionSuccess(''), 3000);
      reload();
    } catch (err) {
      setActionError(err.message || 'Failed to update team limit');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveBye = async (teamId) => {
    try {
      await api.delete(`/tournaments/${id}/byes/${teamId}`);
      reload();
    } catch (err) {
      alert(err.message || 'Failed to remove Bye');
    }
  };

  const handleGenerateFixtures = async () => {
    if (!confirm('This will auto-pair registered teams for Round 1 (teams with Byes will advance automatically). Continue?')) return;
    setActionLoading(true);
    setActionError('');
    try {
      const res = await api.post(`/tournaments/${id}/generate-fixtures`, {});
      setActionSuccess(res.message || 'Fixtures generated successfully!');
      setTimeout(() => setActionSuccess(''), 3000);
      reload();
    } catch (err) {
      setActionError(err.message || 'Failed to generate fixtures');
    } finally {
      setActionLoading(false);
    }
  };

  const handleScheduleCustomMatch = async (e) => {
    e.preventDefault();
    if (!matchHomeTeam || !matchAwayTeam) {
      setActionError('Please select both Home and Away teams');
      return;
    }
    if (matchHomeTeam === matchAwayTeam) {
      setActionError('Home and Away teams must be different');
      return;
    }
    setActionLoading(true);
    setActionError('');
    try {
      await api.post(`/tournaments/${id}/matches`, {
        homeTeam: matchHomeTeam,
        awayTeam: matchAwayTeam,
        round: matchRound,
        ground: matchGround,
        overs: Number(matchOvers) || tournament.defaultOvers || 8,
      });
      setScheduleMatchOpen(false);
      setActionSuccess('Match scheduled successfully!');
      setTimeout(() => setActionSuccess(''), 3000);
      reload();
    } catch (err) {
      setActionError(err.message || 'Failed to schedule match');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddScorer = async (e) => {
    e.preventDefault();
    if (!scorerName.trim() || !scorerPin.trim()) return;
    setActionLoading(true);
    setActionError('');
    try {
      await api.post(`/tournaments/${id}/scorers`, {
        name: scorerName.trim(),
        pin: scorerPin.trim(),
        ground: scorerGround,
      });
      setScorerName('');
      setScorerPin('');
      setAddScorerOpen(false);
      setActionSuccess('Scorer PIN added successfully!');
      setTimeout(() => setActionSuccess(''), 3000);
      reload();
    } catch (err) {
      setActionError(err.message || 'Failed to add scorer');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveScorer = async (pin) => {
    if (!confirm('Remove this Scorer PIN?')) return;
    try {
      await api.delete(`/tournaments/${id}/scorers/${pin}`);
      reload();
    } catch (err) {
      alert(err.message || 'Failed to remove scorer');
    }
  };

  // Group matches by Round (Round 1, Quarter-Finals, Semi-Finals, Final)
  const roundOrder = ['Round 1', 'Round 2', 'Quarter-Final', 'Semi-Final', 'Final'];
  const matchesByRound = matches.reduce((acc, m) => {
    const r = m.round || 'Round 1';
    if (!acc[r]) acc[r] = [];
    acc[r].push(m);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      {/* ─── Back + Header ─── */}
      <div className="flex items-center gap-2">
        <Link to="/tournaments" className="btn btn-ghost !p-2" aria-label="Back to tournaments">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg sm:text-xl font-black text-slate-900 truncate flex items-center gap-2">
            <Medal className="h-5 w-5 text-amber-500 shrink-0" />
            <span>{tournament.name}</span>
          </h1>
          <p className="text-xs text-slate-500 truncate">
            {tournament.venue ? `${tournament.venue} · ` : ''}{tournament.format} · {teams.length}/{tournament.maxTeams || 16} Teams
          </p>
        </div>
      </div>

      {/* ─── Hero Banner Card ─── */}
      <section className="relative overflow-hidden rounded-2xl shadow-md">
        {/* Gradient BG */}
        <div className={`absolute inset-0 ${
          tournament.status === 'live'
            ? 'bg-gradient-to-br from-emerald-600 via-green-600 to-teal-700'
            : tournament.status === 'completed'
            ? 'bg-gradient-to-br from-slate-700 via-slate-600 to-slate-800'
            : 'bg-gradient-to-br from-amber-500 via-orange-500 to-red-500'
        }`} />
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-8 -left-6 h-32 w-32 rounded-full bg-white/10" />

        <div className="relative p-4 sm:p-6 text-white space-y-3 sm:space-y-4">
          {/* Top row */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="flex h-11 w-11 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 shadow-md">
                <Trophy className="h-5 w-5 sm:h-7 sm:w-7 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <h2 className="text-base sm:text-xl font-black leading-tight">{tournament.name}</h2>
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full capitalize border ${
                      tournament.status === 'live'
                        ? 'bg-white/20 text-white border-white/40'
                        : 'bg-white/20 text-white border-white/40'
                    }`}
                  >
                    {tournament.status === 'live' && (
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-ping" />
                    )}
                    {tournament.status === 'live' ? 'LIVE' : tournament.status}
                  </span>
                </div>
                <p className="text-sm text-white/80 mt-0.5">
                  By <strong className="text-white">{tournament.organizer?.name || 'Tournament Admin'}</strong>
                </p>
                {tournament.venue && (
                  <p className="flex items-center gap-1 text-xs text-white/70 mt-1">
                    <MapPin className="h-3 w-3" />
                    {tournament.venue}
                  </p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleCopyCode}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 px-3 py-1.5 text-xs font-mono font-bold text-white transition"
                title="Click to copy code"
              >
                <span>{tournament.code}</span>
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5 text-white/70" />}
              </button>

              <button
                onClick={handleShareWhatsApp}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 px-3 py-1.5 text-xs font-bold text-white transition"
              >
                <Share2 className="h-3.5 w-3.5" />
                <span>Share</span>
              </button>

              <button
                onClick={() => setScorerModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white text-orange-600 hover:bg-orange-50 px-3 py-1.5 text-xs font-black shadow-md transition"
              >
                <KeyRound className="h-3.5 w-3.5" />
                <span>Scorer Mode</span>
              </button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-white/20">
            {[
              { label: 'Teams', value: `${teams.length} / ${tournament.maxTeams || 16}`, isTeams: true },
              { label: 'Overs', value: `${tournament.defaultOvers || 8} ov` },
              { label: 'Byes', value: `${byes.length}` },
              { label: 'Grounds', value: grounds.length > 1 ? `${grounds.length} Pitches` : grounds[0] || 'Ground 1' },
            ].map(({ label, value, isTeams }) => (
              <div key={label} className="rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 p-2.5 text-center relative group">
                <span className="text-[10px] text-white/60 font-bold uppercase block mb-0.5">{label}</span>
                <span className="font-extrabold text-white text-sm">{value}</span>
                {isTeams && isOrganizer && (
                  <button
                    onClick={() => {
                      setCustomMaxTeams(tournament.maxTeams || 16);
                      setEditLimitOpen(true);
                    }}
                    className="mt-1 block mx-auto text-[10px] bg-white/20 hover:bg-white/30 text-white font-bold px-1.5 py-0.5 rounded transition"
                    title="Change team limit"
                  >
                    ✏️ Edit Limit
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Global Action Banner Notification */}
      {actionSuccess && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 flex items-center gap-2 animate-in fade-in">
          <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}
      {actionError && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-800 flex items-center gap-2 animate-in fade-in">
          <ShieldAlert className="h-4 w-4 text-red-600 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* ─── Multi-Ground Live Ticker ─── */}
      {liveMatches.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-2 uppercase tracking-wide">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
              </span>
              Simultaneous Live ({liveMatches.length})
            </h3>
            <span className="text-[11px] text-emerald-600 font-semibold animate-pulse">● Scoring now</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {liveMatches.map((m) => (
              <div
                key={m.id}
                className="relative overflow-hidden rounded-2xl border-2 border-emerald-400 bg-gradient-to-br from-emerald-900 via-green-800 to-teal-900 text-white shadow-md"
              >
                {/* top strip */}
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-400 to-teal-400" />

                <div className="p-4">
                  <div className="flex items-center justify-between text-xs mb-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 border border-white/30 px-2.5 py-0.5 font-bold text-white">
                      📍 {m.ground || 'Ground 1'} · {m.round}
                    </span>
                    <span className="text-[11px] font-bold text-emerald-300 animate-pulse flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                      LIVE
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center">
                    {[
                      { team: m.homeTeam, label: 'Home' },
                      { team: m.awayTeam, label: 'Away' },
                    ].map(({ team, label }) => {
                      const sc = m.scores.find((s) => s.team === team.id);
                      return (
                        <div key={team.id} className="rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 p-2.5">
                          <span className="text-[10px] text-white/60 font-bold uppercase block mb-0.5">{label}</span>
                          <span className="font-bold text-white block text-xs truncate">{team.name}</span>
                          <span className="text-xl font-black text-white">
                            {sc?.runs ?? '-'}/{sc?.wickets ?? '-'}
                          </span>
                          <span className="text-[10px] text-white/60 block">({sc?.overs ?? '0.0'} ov)</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex gap-2 mt-3">
                    <Link
                      to={`/matches/${m.id}`}
                      className="flex-1 text-center rounded-xl bg-emerald-400 hover:bg-emerald-300 text-emerald-900 font-black text-xs py-2 transition"
                    >
                      {m.canManage ? '🏏 Score Match' : '👁 Watch Live'}
                    </Link>
                    <Link
                      to={`/matches/${m.id}/scorecard`}
                      className="rounded-xl bg-white/20 hover:bg-white/30 border border-white/30 text-white font-bold text-xs px-3 py-2 transition"
                    >
                      Card
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-2xl bg-slate-100 p-1 shadow-inner text-xs font-bold text-slate-500">
        <button
          onClick={() => setTab('fixtures')}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 transition-all ${
            tab === 'fixtures' ? 'bg-white text-slate-900 shadow font-extrabold' : 'hover:text-slate-800'
          }`}
        >
          <Swords className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden sm:inline">Fixtures ({matches.length})</span>
          <span className="sm:hidden">Fixtures</span>
        </button>
        <button
          onClick={() => setTab('teams')}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 transition-all ${
            tab === 'teams' ? 'bg-white text-slate-900 shadow font-extrabold' : 'hover:text-slate-800'
          }`}
        >
          <Users className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden sm:inline">Teams ({teams.length})</span>
          <span className="sm:hidden">Teams</span>
        </button>
        {isOrganizer && (
          <button
            onClick={() => setTab('scorers')}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 transition-all ${
              tab === 'scorers' ? 'bg-white text-slate-900 shadow font-extrabold' : 'hover:text-slate-800'
            }`}
          >
            <KeyRound className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">Scorers ({scorers.length})</span>
            <span className="sm:hidden">Scorers</span>
          </button>
        )}
        <button
          onClick={() => setTab('rules')}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 transition-all ${
            tab === 'rules' ? 'bg-white text-slate-900 shadow font-extrabold' : 'hover:text-slate-800'
          }`}
        >
          <span>Rules</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: FIXTURES & BRACKET (ROUND 1, QUARTERS, SEMIS, FINAL)     */}
      {/* ============================================================== */}
      {tab === 'fixtures' && (
        <div className="space-y-4">
          {/* Organizer Control Bar */}
          {isOrganizer && (
            <div className="rounded-2xl bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="font-black text-slate-800 text-sm block">🏟️ Organizer Controls</span>
                <span className="text-[11px] text-slate-500">
                  {matches.length === 0
                    ? 'Generate Round 1 pairings or schedule custom matches.'
                    : 'Add more matches as teams advance to next rounds.'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {matches.length === 0 && (
                  <button
                    onClick={handleGenerateFixtures}
                    disabled={actionLoading || teams.length < 2}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-black text-xs px-4 py-2 shadow-md transition disabled:opacity-50"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>Auto-Generate Round 1</span>
                  </button>
                )}
                <button
                  onClick={() => setScheduleMatchOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border-2 border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs px-3 py-2 transition"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Schedule Match</span>
                </button>
              </div>
            </div>
          )}

          {/* Byes Banner (if any teams received a Bye into Round 2) */}
          {byes.length > 0 && (
            <div className="card p-3 border-amber-200 bg-amber-50/60">
              <span className="text-xs font-bold text-amber-900 block mb-1">
                ⭐ Teams Advancing with Byes:
              </span>
              <div className="flex flex-wrap gap-2">
                {byes.map((b, i) => (
                  <span
                    key={i}
                    className="badge bg-white border border-amber-300 text-amber-800 text-xs px-2 py-1 rounded-lg font-bold shadow-2xs"
                  >
                    {b.teamName} <span className="font-normal text-amber-600">({b.round} Bye)</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Matches List Grouped by Round */}
          {matches.length === 0 ? (
            <div className="card p-8 text-center text-slate-500">
              <Swords className="mx-auto mb-2 h-10 w-10 text-slate-300" />
              <h3 className="font-bold text-slate-800 text-sm">No fixtures scheduled yet</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {isOrganizer
                  ? 'Click "Auto-Generate Round 1" to pair registered teams, or schedule custom matches.'
                  : 'The tournament organizer will publish the match fixtures soon.'}
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {Object.keys(matchesByRound).map((roundName) => (
                <div key={roundName} className="space-y-2">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="h-7 px-3 rounded-full bg-gradient-to-r from-slate-800 to-slate-700 text-white text-xs font-black uppercase tracking-wider flex items-center">
                      {roundName}
                    </div>
                    <span className="text-xs text-slate-400 font-medium">{matchesByRound[roundName].length} matches</span>
                    <div className="flex-1 h-px bg-slate-200" />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {matchesByRound[roundName].map((m) => (
                      <div
                        key={m.id}
                        className={`relative overflow-hidden rounded-2xl border bg-white shadow-sm hover:shadow-md transition-all flex flex-col justify-between ${
                          m.status === 'live'
                            ? 'border-emerald-300'
                            : m.status === 'completed'
                            ? 'border-slate-200'
                            : 'border-slate-200 hover:border-pitch-300'
                        }`}
                      >
                        {m.status === 'live' && (
                          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-400 to-teal-400" />
                        )}
                        <div className="p-4">
                          {/* Match Top Bar */}
                          <div className="flex items-center justify-between text-[11px] mb-3">
                            <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-0.5 font-bold text-slate-600">
                              📍 {m.ground || 'Ground 1'}
                            </span>
                            <span className="capitalize font-bold">
                              {m.status === 'live' ? (
                                <span className="inline-flex items-center gap-1 text-emerald-600">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                                  LIVE
                                </span>
                              ) : m.status === 'completed' ? (
                                <span className="text-slate-400">✓ Done</span>
                              ) : (
                                <span className="text-slate-500">{m.overs} Overs</span>
                              )}
                            </span>
                          </div>

                          {/* Teams vs block */}
                          <div className="space-y-2">
                            {[
                              { team: m.homeTeam, label: 'Home' },
                              { team: m.awayTeam, label: 'Away' },
                            ].map(({ team, label }, ti) => {
                              const sc = m.scores.find((s) => s.team === team.id);
                              const hasScore = sc?.runs != null;
                              return (
                                <div key={team.id} className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className={`h-5 w-5 shrink-0 rounded-full flex items-center justify-center text-[10px] font-black ${
                                      ti === 0 ? 'bg-pitch-100 text-pitch-700' : 'bg-amber-100 text-amber-700'
                                    }`}>
                                      {ti === 0 ? 'H' : 'A'}
                                    </span>
                                    <span className="font-bold text-slate-900 text-xs sm:text-sm truncate">{team.name}</span>
                                  </div>
                                  <span className={`font-mono font-black text-sm shrink-0 ${hasScore ? 'text-slate-900' : 'text-slate-300'}`}>
                                    {hasScore ? `${sc.runs}/${sc.wickets}` : '–'}
                                  </span>
                                </div>
                              );
                            })}
                          </div>

                          {/* Result */}
                          {m.resultSummary && (
                            <div className="mt-2.5 text-[11px] font-semibold text-pitch-700 bg-pitch-50 border border-pitch-200/50 px-2.5 py-1.5 rounded-lg">
                              🏆 {m.resultSummary}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="px-4 pb-3 flex items-center gap-2">
                          <Link
                            to={`/matches/${m.id}`}
                            className={`flex-1 text-center rounded-xl font-black text-xs py-2 transition ${
                              m.status === 'live'
                                ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                                : m.canManage && m.status !== 'completed'
                                ? 'bg-pitch-600 hover:bg-pitch-700 text-white'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                          >
                            {m.status === 'live'
                              ? (m.canManage ? '🏏 Score' : '👁 Watch')
                              : m.canManage
                              ? (m.status === 'completed' ? 'View Details' : '▶ Start')
                              : 'View Match'}
                          </Link>
                          <Link
                            to={`/matches/${m.id}/scorecard`}
                            className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-bold text-xs px-3 py-2 transition"
                          >
                            Card
                          </Link>
                        </div>

                        {/* Organizer Quick Team Elimination on Completed Match */}
                        {isOrganizer && m.status === 'completed' && (
                          <div className="px-4 pb-3 pt-1 border-t border-slate-100 flex flex-wrap items-center justify-between gap-1 text-[11px] bg-slate-50/60">
                            <span className="text-slate-500 font-semibold">Eliminate:</span>
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleUpdateTeamStatus(m.homeTeam.id, 'eliminated')}
                                className="px-2 py-0.5 rounded-md bg-red-50 hover:bg-red-100 text-red-700 font-bold border border-red-200 text-[10px] transition"
                                title={`Eliminate ${m.homeTeam.name}`}
                              >
                                🔴 {m.homeTeam.name.slice(0, 10)}
                              </button>
                              <button
                                onClick={() => handleUpdateTeamStatus(m.awayTeam.id, 'eliminated')}
                                className="px-2 py-0.5 rounded-md bg-red-50 hover:bg-red-100 text-red-700 font-bold border border-red-200 text-[10px] transition"
                                title={`Eliminate ${m.awayTeam.name}`}
                              >
                                🔴 {m.awayTeam.name.slice(0, 10)}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: TEAMS & BYES (ROSTER & ELIMINATION MANAGEMENT)           */}
      {/* ============================================================== */}
      {tab === 'teams' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-slate-900 text-base">
                  🏏 Registered Teams ({teams.length} / {tournament.maxTeams || 16})
                </h3>
                {isOrganizer && (
                  <button
                    onClick={() => {
                      setCustomMaxTeams(tournament.maxTeams || 16);
                      setEditLimitOpen(true);
                    }}
                    className="text-[11px] font-bold text-pitch-700 bg-pitch-50 hover:bg-pitch-100 border border-pitch-200 px-2 py-0.5 rounded-lg transition"
                  >
                    ✏️ Change Limit
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Flexible bracket: Any number of teams (e.g. 9, 14, 16) can play. Manage active & eliminated teams.
              </p>
            </div>
            {isOrganizer && (
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setAddTeamOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-black text-xs px-3 py-2 shadow-md transition"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Team</span>
                </button>
                <button
                  onClick={() => setAwardByeOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-amber-50 border-2 border-amber-300 text-amber-800 hover:bg-amber-100 font-bold text-xs px-3 py-2 transition"
                >
                  <Award className="h-3.5 w-3.5 text-amber-600" />
                  <span>Award Bye / Finalist</span>
                </button>
              </div>
            )}
          </div>

          {/* Teams Status Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
            {[
              ['all', `All (${teams.length})`],
              ['active', `Active (${teams.filter((t) => t.status !== 'eliminated').length})`],
              ['eliminated', `Eliminated (${teams.filter((t) => t.status === 'eliminated').length})`],
              ['byes', `Byes (${byes.length})`],
            ].map(([fKey, fLabel]) => (
              <button
                key={fKey}
                onClick={() => setTeamFilter(fKey)}
                className={`rounded-lg px-3 py-1.5 transition-all ${
                  teamFilter === fKey
                    ? 'bg-white text-slate-900 shadow-xs font-black'
                    : 'hover:text-slate-900'
                }`}
              >
                {fLabel}
              </button>
            ))}
          </div>

          {/* Teams Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {teams
              .filter((t) => {
                if (teamFilter === 'active') return t.status !== 'eliminated';
                if (teamFilter === 'eliminated') return t.status === 'eliminated';
                if (teamFilter === 'byes') return byes.some((b) => b.teamId === t.id || b.teamName === t.name);
                return true;
              })
              .map((t, idx) => {
                const teamBye = byes.find((b) => b.teamId === t.id || b.teamName === t.name);
                const isEliminated = t.status === 'eliminated';
                const isWinner = t.status === 'winner';

                return (
                  <div
                    key={t.id || idx}
                    className={`relative overflow-hidden rounded-2xl border bg-white shadow-sm hover:shadow-md transition-all flex flex-col justify-between p-4 ${
                      isEliminated
                        ? 'border-red-200 bg-red-50/20 opacity-80'
                        : isWinner
                        ? 'border-amber-300 bg-amber-50/30'
                        : teamBye
                        ? 'border-amber-200 bg-amber-50/20'
                        : 'border-slate-200 hover:border-pitch-300'
                    }`}
                  >
                    <div>
                      {/* Top Bar: Seed + Status Badges + Delete */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl font-black text-xs ${
                          isEliminated
                            ? 'bg-red-100 text-red-700'
                            : isWinner
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-pitch-50 text-pitch-700'
                        }`}>
                          #{idx + 1}
                        </span>

                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                          {isEliminated ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-100 border border-red-200 px-2 py-0.5 rounded-full">
                              🔴 Eliminated
                            </span>
                          ) : isWinner ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
                              🏆 Champion
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full">
                              🟢 Active
                            </span>
                          )}

                          {teamBye && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full" title={teamBye.reason}>
                              ⭐ Bye ({teamBye.round})
                            </span>
                          )}
                        </div>

                        {isOrganizer && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openEditTeam(t)}
                              className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition text-xs"
                              title="Edit team details / name"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleRemoveTeam(t.id)}
                              className="p-1 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="Remove team from tournament"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Team Name & Code */}
                      <div className="my-1.5">
                        <div className={`font-black text-sm truncate ${isEliminated ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                          {t.name}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          {t.code && (
                            <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                              {t.code}
                            </span>
                          )}
                          {t.isGuest && (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                              Guest Team
                            </span>
                          )}
                          {t.location && (
                            <span className="text-[10px] text-slate-400 truncate max-w-[120px]">
                              📍 {t.location}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Organizer Elimination & Status Control Buttons */}
                    {isOrganizer && (
                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-1.5">
                        {isEliminated ? (
                          <button
                            onClick={() => handleUpdateTeamStatus(t.id, 'approved')}
                            className="flex-1 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-bold text-xs transition"
                          >
                            🟢 Reactivate Team
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => handleUpdateTeamStatus(t.id, 'eliminated')}
                              className="flex-1 py-1 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-bold text-xs transition"
                              title="Eliminate team after match"
                            >
                              🔴 Eliminate
                            </button>
                            <button
                              onClick={() => handleUpdateTeamStatus(t.id, 'winner')}
                              className="py-1 px-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 font-bold text-xs transition"
                              title="Crown as Winner"
                            >
                              🏆 Winner
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: MULTI-GROUND SCORERS (GROUND 1, GROUND 2, GROUND 3)     */}
      {/* ============================================================== */}
      {tab === 'scorers' && isOrganizer && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-black text-slate-900 text-base">🔑 Multi-Device Scorers</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Share PINs with ground officials to score simultaneously from their phones.
              </p>
            </div>
            <button
              onClick={() => setAddScorerOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-black text-xs px-3 py-2 shadow-md transition"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Scorer PIN</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {scorers.map((s, idx) => (
              <div
                key={idx}
                className="relative overflow-hidden rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 shadow-sm space-y-3 p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-black text-slate-900 text-sm block">{s.name}</span>
                    <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                      📍 {s.ground || 'Ground 1'}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemoveScorer(s.pin)}
                    className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
                    title="Remove PIN"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex items-center justify-between bg-white rounded-xl p-3 border-2 border-amber-200 shadow-inner">
                  <span className="text-xs text-slate-500 font-bold uppercase tracking-wide">Scorer PIN</span>
                  <span className="font-mono text-xl font-black text-amber-700 tracking-[0.3em]">
                    {s.pin}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 text-xs text-slate-600 space-y-1">
            <span className="font-bold text-slate-800 block">💡 How simultaneous scoring works:</span>
            <p>1. Open the app on Ground 1's phone and click <strong>"Scorer PIN"</strong>.</p>
            <p>2. Enter Tournament Code <strong>{tournament.code}</strong> and the PIN above.</p>
            <p>3. They can score their match without logging out other devices or needing admin passwords.</p>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: RULES & GROUNDS INFO                                    */}
      {/* ============================================================== */}
      {tab === 'rules' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <div>
              <h3 className="font-black text-slate-900 text-base mb-2 flex items-center gap-2">
                📋 Tournament Rules
              </h3>
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {tournament.rules || 'Standard ICC & Village Tennis/Leather ball rules apply. 2 overs powerplay, no-ball free hit, standard DLS rules.'}
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100">
              <h3 className="font-black text-slate-900 text-base mb-3 flex items-center gap-2">
                🏟️ Pitches & Grounds
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {grounds.map((g, i) => (
                  <div
                    key={i}
                    className="rounded-xl bg-gradient-to-br from-pitch-50 to-emerald-50 border border-pitch-200/60 p-3 text-center"
                  >
                    <span className="text-lg block mb-1">📍</span>
                    <span className="font-black text-pitch-800 text-sm">{g}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================== MODALS =================== */}

      {/* Scorer Mode Modal */}
      <ScorerLoginModal
        open={scorerModalOpen}
        onClose={() => setScorerModalOpen(false)}
        defaultCode={tournament.code}
      />

      {/* Add Team Modal (Registered Code OR Guest Team) */}
      <Modal open={addTeamOpen} onClose={() => setAddTeamOpen(false)} title="Add Team to Tournament">
        <div className="space-y-4">
          {/* Mode Switcher Tabs */}
          <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-bold text-slate-600">
            <button
              type="button"
              onClick={() => setAddTeamTab('code')}
              className={`flex-1 py-2 rounded-lg text-center transition ${
                addTeamTab === 'code' ? 'bg-white text-slate-900 shadow-xs font-black' : 'hover:text-slate-900'
              }`}
            >
              🔑 Team Code
            </button>
            <button
              type="button"
              onClick={() => setAddTeamTab('guest')}
              className={`flex-1 py-2 rounded-lg text-center transition ${
                addTeamTab === 'guest' ? 'bg-white text-slate-900 shadow-xs font-black' : 'hover:text-slate-900'
              }`}
            >
              ➕ Guest Team (நேரடி பதிவு)
            </button>
          </div>

          <form onSubmit={handleAddTeam} className="space-y-4 text-sm">
            {addTeamTab === 'code' ? (
              <div className="space-y-2">
                <label className="label font-bold text-slate-700">6-Character Team Code</label>
                <input
                  type="text"
                  placeholder="e.g. TM-4892"
                  value={teamCodeInput}
                  onChange={(e) => setTeamCodeInput(e.target.value.toUpperCase())}
                  className="input uppercase font-mono font-black text-center text-lg sm:text-base tracking-widest py-3"
                  maxLength={10}
                  autoFocus
                />
                <p className="text-xs text-slate-500">
                  Ask the team captain for their Team Code. If they are not registered on the app, click <strong>"Guest Team"</strong> tab above.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="label font-bold text-slate-700">Team Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Kanchipuram Super Kings"
                    value={guestTeamName}
                    onChange={(e) => setGuestTeamName(e.target.value)}
                    className="input font-bold py-3 text-base sm:text-sm"
                    required
                    autoFocus
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="label font-bold text-slate-700">City / Village (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Kanchipuram"
                      value={guestTeamCity}
                      onChange={(e) => setGuestTeamCity(e.target.value)}
                      className="input py-2.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="label font-bold text-slate-700">Captain / Contact (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Kumar - 9876543210"
                      value={guestTeamContact}
                      onChange={(e) => setGuestTeamContact(e.target.value)}
                      className="input py-2.5 text-sm"
                    />
                  </div>
                </div>
                <p className="text-xs text-slate-500 bg-amber-50 border border-amber-200/60 p-2.5 rounded-xl">
                  💡 Guest team will be created immediately and added to the tournament. You can edit their name or details later.
                </p>
              </div>
            )}

            <div className="flex gap-2 justify-end pt-3">
              <button
                type="button"
                onClick={() => setAddTeamOpen(false)}
                className="btn btn-outline flex-1 sm:flex-initial py-2.5"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="btn btn-green flex-1 sm:flex-initial py-2.5 font-bold shadow-md"
              >
                {actionLoading ? 'Adding...' : addTeamTab === 'code' ? 'Add by Code' : 'Create Guest Team'}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Edit Team Modal */}
      <Modal open={editTeamOpen} onClose={() => setEditTeamOpen(false)} title="Edit Team Details">
        <form onSubmit={handleEditTeam} className="space-y-4 text-sm">
          <div>
            <label className="label font-bold text-slate-700">Team Name *</label>
            <input
              type="text"
              value={editTeamName}
              onChange={(e) => setEditTeamName(e.target.value)}
              className="input font-bold py-3 text-base sm:text-sm"
              required
            />
          </div>
          <div>
            <label className="label font-bold text-slate-700">City / Village</label>
            <input
              type="text"
              value={editTeamCity}
              onChange={(e) => setEditTeamCity(e.target.value)}
              className="input py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="label font-bold text-slate-700">Captain / Contact</label>
            <input
              type="text"
              value={editTeamContact}
              onChange={(e) => setEditTeamContact(e.target.value)}
              className="input py-2.5 text-sm"
            />
          </div>
          <div className="flex gap-2 justify-end pt-3">
            <button
              type="button"
              onClick={() => setEditTeamOpen(false)}
              className="btn btn-outline flex-1 sm:flex-initial py-2.5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="btn btn-green flex-1 sm:flex-initial py-2.5 font-bold shadow-md"
            >
              Save Changes
            </button>
          </div>
        </form>
      </Modal>

      {/* Award Bye Modal */}
      <Modal open={awardByeOpen} onClose={() => setAwardByeOpen(false)} title="Award Bye / Direct Advance">
        <form onSubmit={handleAwardBye} className="space-y-4">
          <div>
            <label className="label font-bold">Select Team to Receive Bye</label>
            <DropdownSelect
              value={selectedTeamForBye}
              onChange={(val) => setSelectedTeamForBye(val)}
              options={[
                { value: '', label: '-- Choose Team --' },
                ...teams.map((t) => ({ value: t.id, label: `${t.name}${t.status === 'eliminated' ? ' (Eliminated)' : ''}` })),
              ]}
              placeholder="-- Choose Team --"
              buttonClassName="font-semibold"
            />
          </div>

          <div>
            <label className="label font-bold">Bye to Stage / Round</label>
            <DropdownSelect
              value={byeRound}
              onChange={(val) => {
                setByeRound(val);
                if (val.includes('Final')) {
                  setByeReason('Direct Finalist (Bye to Final)');
                }
              }}
              options={[
                { value: 'Round 1', label: 'Round 1 Bye (Advances to Round 2)' },
                { value: 'Round 2', label: 'Round 2 Bye (Advances to Quarter-Final)' },
                { value: 'Quarter-Final', label: 'Quarter-Final Bye' },
                { value: 'Semi-Final', label: 'Semi-Final Bye' },
                { value: 'Final', label: '🏆 Final (Direct Finalist)' },
              ]}
              buttonClassName="font-semibold"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              {byeRound === 'Final'
                ? '⭐ This team directly plays in the Final without playing preliminary rounds.'
                : 'This team skips this round and automatically advances.'}
            </p>
          </div>

          <div>
            <label className="label font-bold">Reason / Notes</label>
            <input
              type="text"
              value={byeReason}
              onChange={(e) => setByeReason(e.target.value)}
              className="input"
            />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={() => setAwardByeOpen(false)} className="btn btn-outline">
              Cancel
            </button>
            <button type="submit" disabled={actionLoading} className="btn btn-green">
              Award Bye
            </button>
          </div>
        </form>
      </Modal>

      {/* Schedule Custom Match Modal */}
      <Modal open={scheduleMatchOpen} onClose={() => setScheduleMatchOpen(false)} title="Schedule Match (Any Teams / Direct Final)">
        <form onSubmit={handleScheduleCustomMatch} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label font-bold">Home Team</label>
              <DropdownSelect
                value={matchHomeTeam}
                onChange={(val) => setMatchHomeTeam(val)}
                options={[
                  { value: '', label: '-- Select Home --' },
                  ...teams.map((t) => ({
                    value: t.id,
                    label: `${t.name}${t.status === 'eliminated' ? ' (Eliminated)' : ''}${t.status === 'winner' ? ' (Champion)' : ''}`,
                  })),
                ]}
                placeholder="-- Select --"
                buttonClassName="text-xs font-semibold"
              />
            </div>
            <div>
              <label className="label font-bold">Away Team</label>
              <DropdownSelect
                value={matchAwayTeam}
                onChange={(val) => setMatchAwayTeam(val)}
                options={[
                  { value: '', label: '-- Select Away --' },
                  ...teams.map((t) => ({
                    value: t.id,
                    label: `${t.name}${t.status === 'eliminated' ? ' (Eliminated)' : ''}${t.status === 'winner' ? ' (Champion)' : ''}`,
                  })),
                ]}
                placeholder="-- Select --"
                buttonClassName="text-xs font-semibold"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="label font-bold">Round / Stage</label>
              <DropdownSelect
                value={matchRound}
                onChange={(val) => setMatchRound(val)}
                options={[
                  'Round 1',
                  'Round 2',
                  'Quarter-Final',
                  'Semi-Final',
                  'Final',
                  'Qualifier 1',
                  'Eliminator',
                  'Qualifier 2',
                  'Playoff',
                  'Super Over',
                ]}
                buttonClassName="text-xs font-semibold"
              />
            </div>
            <div>
              <label className="label">Ground</label>
              <DropdownSelect
                value={matchGround}
                onChange={(val) => setMatchGround(val)}
                options={grounds}
                buttonClassName="text-xs font-semibold"
              />
            </div>
            <div>
              <label className="label">Overs</label>
              <input
                type="number"
                min={1}
                max={50}
                value={matchOvers}
                onChange={(e) => setMatchOvers(e.target.value)}
                className="input text-xs font-semibold"
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={() => setScheduleMatchOpen(false)} className="btn btn-outline">
              Cancel
            </button>
            <button type="submit" disabled={actionLoading} className="btn btn-green">
              Create Match
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Scorer PIN Modal */}
      <Modal open={addScorerOpen} onClose={() => setAddScorerOpen(false)} title="Add Scorer PIN">
        <form onSubmit={handleAddScorer} className="space-y-4">
          <div>
            <label className="label">Scorer Name / Device</label>
            <input
              type="text"
              placeholder="e.g. Ground 2 Scorer"
              value={scorerName}
              onChange={(e) => setScorerName(e.target.value)}
              className="input font-semibold"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Assigned Ground</label>
              <DropdownSelect
                value={scorerGround}
                onChange={(val) => setScorerGround(val)}
                options={grounds}
                buttonClassName="font-semibold"
              />
            </div>
            <div>
              <label className="label">4-Digit PIN</label>
              <input
                type="text"
                maxLength={6}
                placeholder="e.g. 3333"
                value={scorerPin}
                onChange={(e) => setScorerPin(e.target.value)}
                className="input font-mono font-bold text-center"
                required
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={() => setAddScorerOpen(false)} className="btn btn-outline">
              Cancel
            </button>
            <button type="submit" disabled={actionLoading} className="btn btn-green">
              Save Scorer PIN
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Tournament Limit Modal */}
      <Modal open={editLimitOpen} onClose={() => setEditLimitOpen(false)} title="Change Tournament Slots / Limits">
        <form onSubmit={handleUpdateMaxTeams} className="space-y-4">
          <div>
            <label className="label font-bold">Total Allowed Teams</label>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                min={teams.length || 2}
                max={128}
                value={customMaxTeams}
                onChange={(e) => setCustomMaxTeams(Number(e.target.value))}
                className="input font-bold text-center w-28"
                required
              />
              <div className="flex flex-wrap gap-1">
                {[8, 9, 10, 12, 14, 16, 24, 32].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setCustomMaxTeams(n)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                      customMaxTeams === n ? 'bg-pitch-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {n}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCustomMaxTeams(64)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                    customMaxTeams >= 64 ? 'bg-pitch-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Open (64)
                </button>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Currently registered: {teams.length} teams. You can set any number like 9, 10, 14, 16, or 64.
            </p>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={() => setEditLimitOpen(false)} className="btn btn-outline">
              Cancel
            </button>
            <button type="submit" disabled={actionLoading} className="btn btn-green">
              Update Limit
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
