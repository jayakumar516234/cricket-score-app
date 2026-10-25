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
import { Spinner, ErrorBox, Modal, ConfirmDialog } from '../components/ui.jsx';
import { ScorerLoginModal } from '../components/ScorerLoginModal.jsx';

export default function TournamentDetail() {
  const { id } = useParams();
  const { user, isSuper, isAdmin } = useAuth();
  const [tab, setTab] = useState('fixtures'); // 'fixtures' | 'teams' | 'scorers' | 'rules'
  const [copied, setCopied] = useState(false);
  const [scorerModalOpen, setScorerModalOpen] = useState(false);

  // Sub-modals for Organizer
  const [addTeamOpen, setAddTeamOpen] = useState(false);
  const [teamCodeInput, setTeamCodeInput] = useState('');
  const [awardByeOpen, setAwardByeOpen] = useState(false);
  const [selectedTeamForBye, setSelectedTeamForBye] = useState('');
  const [byeReason, setByeReason] = useState('Bye advancement to next round');
  const [scheduleMatchOpen, setScheduleMatchOpen] = useState(false);
  const [addScorerOpen, setAddScorerOpen] = useState(false);
  const [scorerName, setScorerName] = useState('');
  const [scorerPin, setScorerPin] = useState('');
  const [scorerGround, setScorerGround] = useState('Ground 1');

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

  if (loading) return <Spinner label="Loading tournament details..." />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;

  const { tournament, matches = [], liveMatches = [], upcomingMatches = [], completedMatches = [], isOrganizer } = data;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(tournament.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWhatsApp = () => {
    const text = `🏆 *${tournament.name}*\n` +
      `📍 Venue: ${tournament.venue || 'Cricket Ground'}\n` +
      `🔢 Tournament Code: *${tournament.code}*\n` +
      `🏏 Teams: ${tournament.teams.length} Teams · ${tournament.defaultOvers} Overs\n\n` +
      `📲 Follow Live Scores: ${window.location.href}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Organizer Actions
  const handleAddTeam = async (e) => {
    e.preventDefault();
    if (!teamCodeInput.trim()) return;
    setActionLoading(true);
    setActionError('');
    try {
      await api.post(`/tournaments/${id}/teams`, { teamCode: teamCodeInput.trim() });
      setTeamCodeInput('');
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
        round: 'Round 1',
        reason: byeReason.trim(),
      });
      setAwardByeOpen(false);
      setSelectedTeamForBye('');
      setActionSuccess('Bye awarded successfully!');
      setTimeout(() => setActionSuccess(''), 3000);
      reload();
    } catch (err) {
      setActionError(err.message || 'Failed to award Bye');
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
      {/* Back and Page Header */}
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
            {tournament.venue ? `${tournament.venue} · ` : ''}{tournament.format} ({tournament.teams.length}/{tournament.maxTeams} Teams)
          </p>
        </div>
      </div>

      {/* Main Tournament Banner Card */}
      <section className="card p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-400 font-black text-white shadow-md">
              <Trophy className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">{tournament.name}</h2>
                <span
                  className={`badge text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                    tournament.status === 'live'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                      : 'bg-amber-50 text-amber-700 border border-amber-300'
                  }`}
                >
                  {tournament.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Organized by <strong className="text-slate-700">{tournament.organizer?.name}</strong>
              </p>
            </div>
          </div>

          {/* Tournament Code & Share */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleCopyCode}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-mono font-bold text-slate-800 hover:bg-slate-100 transition shadow-2xs"
              title="Click to copy code"
            >
              <span>Code: {tournament.code}</span>
              {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5 text-slate-500" />}
            </button>

            <button
              onClick={handleShareWhatsApp}
              className="btn btn-outline text-xs !py-1.5 !px-3 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
            >
              <Share2 className="h-3.5 w-3.5 text-emerald-600" />
              <span>Share</span>
            </button>

            <button
              onClick={() => setScorerModalOpen(true)}
              className="btn btn-outline text-xs !py-1.5 !px-3 border-amber-300 text-amber-800 bg-amber-50/60 hover:bg-amber-100"
            >
              <KeyRound className="h-3.5 w-3.5 text-amber-600" />
              <span>Scorer Mode</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-center text-xs">
          <div className="rounded-xl bg-slate-50 p-2 border border-slate-100">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Teams Registered</span>
            <span className="font-extrabold text-slate-900 text-sm">
              {tournament.teams.length} / {tournament.maxTeams}
            </span>
          </div>
          <div className="rounded-xl bg-slate-50 p-2 border border-slate-100">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Default Overs</span>
            <span className="font-extrabold text-slate-900 text-sm">{tournament.defaultOvers} Overs</span>
          </div>
          <div className="rounded-xl bg-slate-50 p-2 border border-slate-100">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Byes Awarded</span>
            <span className="font-extrabold text-pitch-700 text-sm">{tournament.byes?.length || 0} Byes</span>
          </div>
          <div className="rounded-xl bg-slate-50 p-2 border border-slate-100">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Pitches / Grounds</span>
            <span className="font-extrabold text-slate-900 text-sm truncate block">
              {tournament.grounds?.join(', ') || 'Ground 1'}
            </span>
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

      {/* ============================================================== */}
      {/* 🔴 MULTI-GROUND LIVE MATCHES TICKER / CARDS (SIMULTANEOUS PLAY) */}
      {/* ============================================================== */}
      {liveMatches.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-1.5 uppercase tracking-wide">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-ping inline-block" />
              <span>Simultaneous Live Matches ({liveMatches.length})</span>
            </h3>
            <span className="text-[11px] text-slate-500">Live across tournament grounds</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {liveMatches.map((m) => (
              <div
                key={m.id}
                className="card p-3.5 border-2 border-emerald-400/80 bg-gradient-to-br from-emerald-50/40 via-white to-white shadow-xs relative overflow-hidden"
              >
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="badge bg-emerald-100 text-emerald-800 font-bold">
                    {m.ground || 'Ground 1'} · {m.round}
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-700 animate-pulse">● LIVE</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-center my-2">
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="font-bold text-slate-800 block text-xs truncate">{m.homeTeam.name}</span>
                    <span className="text-base font-black text-slate-900">
                      {m.scores.find((s) => s.team === m.homeTeam.id)?.runs ?? '-'}/
                      {m.scores.find((s) => s.team === m.homeTeam.id)?.wickets ?? '-'}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      ({m.scores.find((s) => s.team === m.homeTeam.id)?.overs ?? '0.0'} ov)
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="font-bold text-slate-800 block text-xs truncate">{m.awayTeam.name}</span>
                    <span className="text-base font-black text-slate-900">
                      {m.scores.find((s) => s.team === m.awayTeam.id)?.runs ?? '-'}/
                      {m.scores.find((s) => s.team === m.awayTeam.id)?.wickets ?? '-'}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      ({m.scores.find((s) => s.team === m.awayTeam.id)?.overs ?? '0.0'} ov)
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 mt-2 pt-2 border-t border-slate-100">
                  <Link
                    to={`/matches/${m.id}`}
                    className="btn btn-green flex-1 !py-1 text-xs font-bold"
                  >
                    {m.canManage ? 'Score Match' : 'Watch Live'}
                  </Link>
                  <Link
                    to={`/matches/${m.id}/scorecard`}
                    className="btn btn-outline !py-1 text-xs"
                  >
                    Scorecard
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Tabs Switcher */}
      <div className="flex gap-1.5 rounded-xl bg-slate-200/70 p-1.5 shadow-2xs text-xs font-bold text-slate-600">
        <button
          onClick={() => setTab('fixtures')}
          className={`flex-1 rounded-lg px-3 py-2 transition ${
            tab === 'fixtures' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
          }`}
        >
          <Swords className="mr-1 inline h-3.5 w-3.5" />
          Fixtures & Bracket ({matches.length})
        </button>
        <button
          onClick={() => setTab('teams')}
          className={`flex-1 rounded-lg px-3 py-2 transition ${
            tab === 'teams' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
          }`}
        >
          <Users className="mr-1 inline h-3.5 w-3.5" />
          Teams & Byes ({tournament.teams.length})
        </button>
        {isOrganizer && (
          <button
            onClick={() => setTab('scorers')}
            className={`flex-1 rounded-lg px-3 py-2 transition ${
              tab === 'scorers' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            <KeyRound className="mr-1 inline h-3.5 w-3.5" />
            Scorers ({tournament.scorers?.length || 0})
          </button>
        )}
        <button
          onClick={() => setTab('rules')}
          className={`flex-1 rounded-lg px-3 py-2 transition ${
            tab === 'rules' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
          }`}
        >
          Rules & Grounds
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: FIXTURES & BRACKET (ROUND 1, QUARTERS, SEMIS, FINAL)     */}
      {/* ============================================================== */}
      {tab === 'fixtures' && (
        <div className="space-y-4">
          {/* Organizer Control Bar */}
          {isOrganizer && (
            <div className="card p-3 sm:p-4 bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
              <div>
                <span className="font-bold text-slate-800 text-xs sm:text-sm block">Organizer Bracket Controls</span>
                <span className="text-[11px] text-slate-500">
                  {matches.length === 0
                    ? 'Generate Round 1 pairings or schedule custom matches.'
                    : 'Add more matches as teams advance.'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {matches.length === 0 && (
                  <button
                    onClick={handleGenerateFixtures}
                    disabled={actionLoading || tournament.teams.length < 2}
                    className="btn btn-primary text-xs !py-1.5 flex items-center gap-1.5"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Auto-Generate Round 1</span>
                  </button>
                )}
                <button
                  onClick={() => setScheduleMatchOpen(true)}
                  className="btn btn-outline text-xs !py-1.5 flex items-center gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>+ Schedule Match</span>
                </button>
              </div>
            </div>
          )}

          {/* Byes Banner (if any teams received a Bye into Round 2) */}
          {tournament.byes && tournament.byes.length > 0 && (
            <div className="card p-3 border-amber-200 bg-amber-50/60">
              <span className="text-xs font-bold text-amber-900 block mb-1">
                ⭐ Teams Advancing with Byes:
              </span>
              <div className="flex flex-wrap gap-2">
                {tournament.byes.map((b, i) => (
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
                  <div className="flex items-center gap-2 pb-1 border-b border-slate-200">
                    <span className="font-black text-sm text-slate-900 uppercase tracking-wider">{roundName}</span>
                    <span className="text-xs text-slate-400 font-medium">({matchesByRound[roundName].length} matches)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {matchesByRound[roundName].map((m) => (
                      <div
                        key={m.id}
                        className="card p-3.5 hover:border-slate-300 transition shadow-2xs flex flex-col justify-between"
                      >
                        <div>
                          {/* Match Top Bar */}
                          <div className="flex items-center justify-between text-[11px] text-slate-500 mb-2">
                            <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                              {m.ground || 'Ground 1'}
                            </span>
                            <span className="capitalize font-semibold text-slate-600">
                              {m.status === 'live' ? (
                                <span className="text-emerald-600 font-bold">● LIVE</span>
                              ) : m.status === 'completed' ? (
                                'Completed'
                              ) : (
                                `${m.overs} Overs`
                              )}
                            </span>
                          </div>

                          {/* Teams vs block */}
                          <div className="space-y-1.5 my-2">
                            <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-slate-900">
                              <span className="truncate">{m.homeTeam.name}</span>
                              <span className="font-mono text-slate-700">
                                {m.scores.find((s) => s.team === m.homeTeam.id)?.runs != null
                                  ? `${m.scores.find((s) => s.team === m.homeTeam.id).runs}/${m.scores.find((s) => s.team === m.homeTeam.id).wickets}`
                                  : '-'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-slate-900">
                              <span className="truncate">{m.awayTeam.name}</span>
                              <span className="font-mono text-slate-700">
                                {m.scores.find((s) => s.team === m.awayTeam.id)?.runs != null
                                  ? `${m.scores.find((s) => s.team === m.awayTeam.id).runs}/${m.scores.find((s) => s.team === m.awayTeam.id).wickets}`
                                  : '-'}
                              </span>
                            </div>
                          </div>

                          {/* Result */}
                          {m.resultSummary && (
                            <div className="text-[11px] font-semibold text-pitch-700 mt-1 bg-pitch-50/70 p-1 rounded">
                              {m.resultSummary}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                          <Link
                            to={`/matches/${m.id}`}
                            className="btn btn-primary flex-1 !py-1 text-xs"
                          >
                            {m.canManage ? (m.status === 'completed' ? 'View Details' : 'Score') : 'View Match'}
                          </Link>
                          <Link
                            to={`/matches/${m.id}/scorecard`}
                            className="btn btn-outline !py-1 text-xs"
                          >
                            Scorecard
                          </Link>
                        </div>
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
      {/* TAB 2: TEAMS & BYES (16 TEAMS VILLAGE ROSTER)                  */}
      {/* ============================================================== */}
      {tab === 'teams' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Registered Teams ({tournament.teams.length} / {tournament.maxTeams})
              </h3>
              <p className="text-xs text-slate-500">
                Village tournaments standard: 14 or 16 teams. Extra slots can be given Byes.
              </p>
            </div>
            {isOrganizer && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAddTeamOpen(true)}
                  className="btn btn-primary text-xs !py-1.5 flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>+ Add Team</span>
                </button>
                <button
                  onClick={() => setAwardByeOpen(true)}
                  className="btn btn-outline text-xs !py-1.5 border-amber-300 text-amber-800 bg-amber-50/60"
                >
                  <Award className="h-3.5 w-3.5 text-amber-600" />
                  <span>Award Bye</span>
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {tournament.teams.map((t, idx) => {
              const hasBye = tournament.byes?.some((b) => b.teamId === t.id || b.teamName === t.name);
              return (
                <div
                  key={t.id || idx}
                  className="card p-3.5 border border-slate-200/80 hover:border-pitch-300 transition shadow-2xs flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 font-mono font-bold text-slate-600 text-xs">
                      #{idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 text-sm truncate">{t.name}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {t.code && (
                          <span className="text-[10px] font-mono text-slate-400">{t.code}</span>
                        )}
                        {hasBye && (
                          <span className="badge bg-amber-100 text-amber-800 text-[10px] font-bold">
                            Bye Awarded
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {isOrganizer && (
                    <button
                      onClick={() => handleRemoveTeam(t.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Remove team"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Multi-Device Match Scorers
              </h3>
              <p className="text-xs text-slate-500">
                Share these PINs with officials scoring Ground 1, Ground 2, Ground 3 from their own phones.
              </p>
            </div>
            <button
              onClick={() => setAddScorerOpen(true)}
              className="btn btn-primary text-xs !py-1.5 flex items-center gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>+ Add Scorer PIN</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {tournament.scorers?.map((s, idx) => (
              <div
                key={idx}
                className="card p-4 border border-amber-200 bg-amber-50/30 shadow-2xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm">{s.name}</span>
                  <button
                    onClick={() => handleRemoveScorer(s.pin)}
                    className="text-slate-400 hover:text-red-600 p-1 rounded"
                    title="Remove PIN"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="text-xs text-slate-600">
                  Assigned Ground: <strong>{s.ground || 'Ground 1'}</strong>
                </div>
                <div className="flex items-center justify-between bg-white rounded-lg p-2 border border-amber-200">
                  <span className="text-xs text-slate-500 font-medium">Scorer PIN:</span>
                  <span className="font-mono text-base font-black text-amber-700 tracking-wider">
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
        <div className="card p-5 space-y-4">
          <div>
            <h3 className="font-bold text-slate-900 text-sm mb-1">Tournament Rules & Guidelines</h3>
            <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">
              {tournament.rules || 'Standard ICC & Village Tennis/Leather ball rules apply. 2 overs powerplay.'}
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm mb-2">Pitches & Grounds</h3>
            <div className="flex flex-wrap gap-2">
              {tournament.grounds?.map((g, i) => (
                <span
                  key={i}
                  className="badge bg-slate-100 text-slate-800 font-bold px-3 py-1.5 rounded-lg text-xs"
                >
                  📍 {g}
                </span>
              ))}
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

      {/* Add Team Modal */}
      <Modal open={addTeamOpen} onClose={() => setAddTeamOpen(false)} title="Add Team to Tournament">
        <form onSubmit={handleAddTeam} className="space-y-4">
          <div>
            <label className="label">Team Code</label>
            <input
              type="text"
              placeholder="e.g. TM-4892"
              value={teamCodeInput}
              onChange={(e) => setTeamCodeInput(e.target.value.toUpperCase())}
              className="input uppercase font-mono font-bold"
              required
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Ask the team captain for their 6-character Team Code.
            </p>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={() => setAddTeamOpen(false)} className="btn btn-outline">
              Cancel
            </button>
            <button type="submit" disabled={actionLoading} className="btn btn-primary">
              Add Team
            </button>
          </div>
        </form>
      </Modal>

      {/* Award Bye Modal */}
      <Modal open={awardByeOpen} onClose={() => setAwardByeOpen(false)} title="Award Bye to Team">
        <form onSubmit={handleAwardBye} className="space-y-4">
          <div>
            <label className="label">Select Team to Receive Bye</label>
            <select
              value={selectedTeamForBye}
              onChange={(e) => setSelectedTeamForBye(e.target.value)}
              className="input font-semibold"
              required
            >
              <option value="">-- Choose Team --</option>
              {tournament.teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              This team will skip Round 1 and advance directly to the next round.
            </p>
          </div>

          <div>
            <label className="label">Reason / Notes</label>
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
            <button type="submit" disabled={actionLoading} className="btn btn-primary">
              Award Bye
            </button>
          </div>
        </form>
      </Modal>

      {/* Schedule Custom Match Modal */}
      <Modal open={scheduleMatchOpen} onClose={() => setScheduleMatchOpen(false)} title="Schedule Match">
        <form onSubmit={handleScheduleCustomMatch} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Home Team</label>
              <select
                value={matchHomeTeam}
                onChange={(e) => setMatchHomeTeam(e.target.value)}
                className="input text-xs font-semibold"
                required
              >
                <option value="">-- Select --</option>
                {tournament.teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Away Team</label>
              <select
                value={matchAwayTeam}
                onChange={(e) => setMatchAwayTeam(e.target.value)}
                className="input text-xs font-semibold"
                required
              >
                <option value="">-- Select --</option>
                {tournament.teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="label">Round</label>
              <select
                value={matchRound}
                onChange={(e) => setMatchRound(e.target.value)}
                className="input text-xs font-semibold"
              >
                <option value="Round 1">Round 1</option>
                <option value="Round 2">Round 2</option>
                <option value="Quarter-Final">Quarter-Final</option>
                <option value="Semi-Final">Semi-Final</option>
                <option value="Final">Final</option>
              </select>
            </div>
            <div>
              <label className="label">Ground</label>
              <select
                value={matchGround}
                onChange={(e) => setMatchGround(e.target.value)}
                className="input text-xs font-semibold"
              >
                {tournament.grounds?.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
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
            <button type="submit" disabled={actionLoading} className="btn btn-primary">
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
              <select
                value={scorerGround}
                onChange={(e) => setScorerGround(e.target.value)}
                className="input font-semibold"
              >
                {tournament.grounds?.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
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
            <button type="submit" disabled={actionLoading} className="btn btn-primary">
              Save Scorer PIN
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
