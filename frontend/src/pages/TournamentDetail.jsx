import { useState, useMemo } from 'react';
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
  Bell,
  UserCheck,
  UserX,
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
  const [addTeamTab, setAddTeamTab] = useState('myteam'); // 'myteam' | 'code' | 'guest'
  const [teamCodeInput, setTeamCodeInput] = useState('');
  const [guestTeamName, setGuestTeamName] = useState('');
  const [guestTeamCity, setGuestTeamCity] = useState('');
  const [guestTeamContact, setGuestTeamContact] = useState('');

  // Guest players list (11 players) - same pattern as CreateMatch.jsx
  const [guestPlayers, setGuestPlayers] = useState(
    Array.from({ length: 11 }, (_, i) => ({
      name: `Player ${i + 1}`,
      role: i < 4 ? 'batsman' : i < 6 ? 'allrounder' : 'bowler',
    }))
  );
  const [showGuestPlayers, setShowGuestPlayers] = useState(false);

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

  const { tournament, matches = [], liveMatches = [], upcomingMatches = [], completedMatches = [], isOrganizer, myTeamsInTournament = [], myOwnTeams: apiMyOwnTeams = [] } = data;
  const teams = tournament.teams || [];
  const byes = tournament.byes || [];
  const grounds = tournament.grounds || ['Ground 1'];
  const scorers = tournament.scorers || [];

  // Check if current user is admin of a team with pending spot confirmation in this tournament
  const myPendingSpot = myTeamsInTournament.find((t) => t.canConfirmSpot);

  // Separate pending vs approved teams
  const pendingTeams = teams.filter((t) => t.status === 'pending');
  const approvedTeams = teams.filter((t) => t.status !== 'pending');

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
    let resMsg = 'Team added successfully!';
    try {
      if (addTeamTab === 'code') {
        if (!teamCodeInput.trim()) {
          setActionError('Please enter a Team Code');
          setActionLoading(false);
          return;
        }
        const res = await api.post(`/tournaments/${id}/teams`, { teamCode: teamCodeInput.trim() });
        if (res?.message) resMsg = res.message;
      } else {
        if (!guestTeamName.trim()) {
          setActionError('Please enter a team name');
          setActionLoading(false);
          return;
        }
        const res = await api.post(`/tournaments/${id}/teams`, {
          isGuest: true,
          name: guestTeamName.trim(),
          location: guestTeamCity.trim(),
          contact: guestTeamContact.trim(),
          players: guestPlayers.map((p, i) => ({
            name: p.name.trim() || `Player ${i + 1}`,
            role: p.role,
          })),
        });
        if (res?.message) resMsg = res.message;
      }
      setTeamCodeInput('');
      setGuestTeamName('');
      setGuestTeamCity('');
      setGuestTeamContact('');
      setGuestPlayers(Array.from({ length: 11 }, (_, i) => ({
        name: `Player ${i + 1}`,
        role: i < 4 ? 'batsman' : i < 6 ? 'allrounder' : 'bowler',
      })));
      setShowGuestPlayers(false);
      setAddTeamOpen(false);
      setActionSuccess(resMsg);
      setTimeout(() => setActionSuccess(''), 4000);
      reload();
    } catch (err) {
      setActionError(err.message || 'Failed to add team');
    } finally {
      setActionLoading(false);
    }
  };

  // Quick add: organizer adds their own team by id directly (button click, no form submit)
  const handleAddMyOwnTeam = async (teamId, teamName) => {
    setActionLoading(true);
    setActionError('');
    try {
      const res = await api.post(`/tournaments/${id}/teams`, { teamId });
      setAddTeamOpen(false);
      setActionSuccess(res?.message || `${teamName} added to tournament!`);
      setTimeout(() => setActionSuccess(''), 4000);
      reload();
    } catch (err) {
      setActionError(err.message || 'Failed to add team');
    } finally {
      setActionLoading(false);
    }
  };

  // Team Admin Actions for Confirming Spot
  const handleConfirmMySpot = async () => {
    if (!myPendingSpot) return;
    setActionLoading(true);
    setActionError('');
    setActionSuccess('');
    try {
      const res = await api.post(`/tournaments/${id}/teams/${myPendingSpot.id}/confirm-spot`);
      setActionSuccess(res.message || `Spot confirmed for ${myPendingSpot.name}!`);
      setTimeout(() => setActionSuccess(''), 4000);
      reload();
    } catch (err) {
      setActionError(err.message || 'Failed to confirm spot');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeclineMySpot = async () => {
    if (!myPendingSpot) return;
    if (!window.confirm(`Are you sure you want to decline the tournament invitation for ${myPendingSpot.name}?`)) return;
    setActionLoading(true);
    setActionError('');
    setActionSuccess('');
    try {
      const res = await api.post(`/tournaments/${id}/teams/${myPendingSpot.id}/decline-spot`);
      setActionSuccess(res.message || 'Invitation declined');
      setTimeout(() => setActionSuccess(''), 4000);
      reload();
    } catch (err) {
      setActionError(err.message || 'Failed to decline spot');
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
                  {tournament.visibility === 'invited' ? (
                    <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-100 border border-amber-400/30">
                      🔒 Invited Only (அணிகளுக்கு மட்டும்)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-100 border border-emerald-400/30">
                      🌐 Public (அனைவருக்கும்)
                    </span>
                  )}
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

      {/* 🔔 Team Admin Spot Confirmation Banner */}
      {myPendingSpot && (
        <div className="rounded-2xl border-2 border-amber-400 bg-gradient-to-r from-amber-50 via-orange-50 to-white p-4 space-y-3 shadow-md animate-in fade-in">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-xs text-lg">
                🏆
              </div>
              <div>
                <h4 className="text-sm sm:text-base font-black text-amber-950">
                  Spot Confirmation Required: {myPendingSpot.name}
                </h4>
                <p className="text-xs text-amber-800 mt-0.5">
                  The tournament organizer added your team using your Team Code. Please confirm your spot to officially join the tournament draw!
                </p>
              </div>
            </div>
            <span className="badge bg-amber-500 text-white text-[10px] font-black uppercase tracking-wider py-0.5 px-2 rounded-full shrink-0">
              Action Required
            </span>
          </div>

          <div className="flex items-center gap-2 pt-1 border-t border-amber-200">
            <button
              type="button"
              disabled={actionLoading}
              onClick={handleConfirmMySpot}
              className="btn btn-green bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs !py-2 !px-4 shadow-xs inline-flex items-center gap-1.5"
            >
              <UserCheck className="h-4 w-4" /> Confirm Spot
            </button>
            <button
              type="button"
              disabled={actionLoading}
              onClick={handleDeclineMySpot}
              className="btn btn-outline border-red-300 text-red-700 hover:bg-red-50 font-bold text-xs !py-2 !px-3 inline-flex items-center gap-1"
            >
              <UserX className="h-4 w-4" /> Decline
            </button>
          </div>
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
                      {m.canManage ? '🏏 Update Match' : '👁 Watch Live'}
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
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 transition-all relative ${
            tab === 'teams' ? 'bg-white text-slate-900 shadow font-extrabold' : 'hover:text-slate-800'
          }`}
        >
          <Users className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden sm:inline">Teams ({teams.length})</span>
          <span className="sm:hidden">Teams</span>
          {isOrganizer && pendingTeams.length > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-black text-white animate-bounce shadow-xs">
              {pendingTeams.length}
            </span>
          )}
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

          {/* Matches List in Sequential Order */}
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
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Tournament Matches ({matches.length}) · Sequential Order
                </span>
                <span className="text-[11px] text-slate-400">
                  {matches.filter((m) => m.status === 'completed').length} completed · {matches.filter((m) => m.status === 'live').length} live
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {matches.map((m, mIdx) => (
                  <div
                    key={m.id}
                    className={`relative overflow-hidden rounded-2xl border bg-white shadow-sm hover:shadow-md transition-all flex flex-col justify-between ${
                      m.status === 'live'
                        ? 'border-2 border-red-500 bg-gradient-to-br from-red-50/40 via-white to-white'
                        : m.status === 'completed'
                        ? 'border-slate-200'
                        : 'border-slate-200 hover:border-pitch-300'
                    }`}
                  >
                    {m.status === 'live' && (
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-amber-500 to-red-500 animate-pulse" />
                    )}
                    <div className="p-4">
                      {/* Match Top Bar: Match Number + Round + Status */}
                      <div className="flex items-center justify-between text-[11px] mb-3 flex-wrap gap-1">
                        <div className="flex items-center gap-1.5">
                          <span className="flex h-5 items-center justify-center rounded-md bg-slate-900 text-white font-mono font-black text-[10px] px-2 shadow-2xs">
                            Match #{mIdx + 1}
                          </span>
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 font-bold text-slate-700 text-[10px]">
                            {m.round || 'Round 1'}
                          </span>
                          <span className="text-slate-400 text-[10px]">📍 {m.ground || 'Ground 1'}</span>
                        </div>

                        <div className="flex items-center gap-1">
                          {m.status === 'live' ? (
                            <span className="inline-flex items-center gap-1 text-red-600 font-black text-[10.5px] bg-red-100 px-2 py-0.5 rounded-full border border-red-200">
                              <span className="h-2 w-2 rounded-full bg-red-600 animate-ping" />
                              LIVE
                            </span>
                          ) : m.status === 'completed' ? (
                            <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-bold">✓ Completed</span>
                          ) : (
                            <span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full text-[10px] font-bold">{m.overs} Overs</span>
                          )}
                        </div>
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
                            <div key={team.id} className="flex items-center justify-between gap-2 p-1.5 rounded-xl bg-slate-50/80 border border-slate-100">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className={`h-5 w-5 shrink-0 rounded-full flex items-center justify-center text-[10px] font-black ${
                                  ti === 0 ? 'bg-pitch-100 text-pitch-700' : 'bg-amber-100 text-amber-700'
                                }`}>
                                  {ti === 0 ? 'H' : 'A'}
                                </span>
                                <span className="font-bold text-slate-900 text-xs sm:text-sm truncate">{team.name}</span>
                              </div>
                              <span className={`font-mono font-black text-sm shrink-0 ${hasScore ? 'text-slate-900' : 'text-slate-300'}`}>
                                {hasScore ? `${sc.runs}/${sc.wickets} (${sc.overs} ov)` : '–'}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Result */}
                      {m.resultSummary && (
                        <div className="mt-2.5 text-[11px] font-bold text-pitch-800 bg-pitch-50 border border-pitch-200/70 px-2.5 py-1.5 rounded-xl flex items-center gap-1.5">
                          <Trophy className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                          <span>{m.resultSummary}</span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="px-4 pb-3 flex items-center gap-2">
                      <Link
                        to={`/matches/${m.id}`}
                        className={`flex-1 text-center rounded-xl font-black text-xs py-2 shadow-2xs transition ${
                          m.status === 'live'
                            ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white'
                            : m.canManage && m.status !== 'completed'
                            ? 'bg-pitch-600 hover:bg-pitch-700 text-white'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                        }`}
                      >
                        {m.status === 'live'
                          ? (m.canManage ? '🏏 Update Match' : '🟠 Watch Live')
                          : m.canManage
                          ? (m.status === 'completed' ? 'View Details' : '▶ Start Scoring')
                          : 'View Match'}
                      </Link>
                      <Link
                        to={`/matches/${m.id}/scorecard`}
                        className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs px-3 py-2 transition shadow-2xs"
                      >
                        Scorecard
                      </Link>
                    </div>

                    {/* Organizer Quick Team Elimination on Completed Match */}
                    {isOrganizer && m.status === 'completed' && (
                      <div className="px-4 pb-3 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-1 text-[11px] bg-slate-50/70">
                        <span className="text-slate-500 font-semibold">Mark Out:</span>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleUpdateTeamStatus(m.homeTeam.id, 'eliminated')}
                            className="min-h-[34px] px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 font-bold border border-red-200 text-xs transition"
                            title={`Eliminate ${m.homeTeam.name}`}
                          >
                            🔴 {m.homeTeam.name.slice(0, 10)}
                          </button>
                          <button
                            onClick={() => handleUpdateTeamStatus(m.awayTeam.id, 'eliminated')}
                            className="min-h-[34px] px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 font-bold border border-red-200 text-xs transition"
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
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: TEAMS & BYES (ROSTER & ELIMINATION MANAGEMENT)           */}
      {/* ============================================================== */}
      {tab === 'teams' && (
        <div className="space-y-4">

          {/* 🔔 Pending Join Requests — Organizer only */}
          {isOrganizer && pendingTeams.length > 0 && (
            <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 space-y-3 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs">
                  <Bell className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-amber-900">
                    {pendingTeams.length} Pending Join Request{pendingTeams.length > 1 ? 's' : ''}
                  </h4>
                  <p className="text-[10px] text-amber-700">Teams waiting for your approval to join this tournament</p>
                </div>
              </div>

              <ul className="space-y-2">
                {pendingTeams.map((tm) => (
                  <li key={tm.id} className="flex items-center justify-between gap-3 rounded-xl bg-white border border-amber-200 px-3 py-2.5 shadow-xs">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-slate-900 truncate">{tm.name}</div>
                      {tm.location && <div className="text-[10px] text-slate-500 truncate">📍 {tm.location}</div>}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={async () => {
                          setActionLoading(true); setActionError('');
                          try {
                            await api.patch(`/tournaments/${id}/teams/${tm.id}/status`, { status: 'approved' });
                            setActionSuccess(`✅ ${tm.name} approved!`);
                            reload();
                          } catch (err) { setActionError(err.message); }
                          finally { setActionLoading(false); }
                        }}
                        disabled={actionLoading}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 px-2.5 py-1.5 text-[11px] font-black text-white shadow-xs transition"
                      >
                        <UserCheck className="h-3.5 w-3.5" /> Accept
                      </button>
                      <button
                        onClick={async () => {
                          setActionLoading(true); setActionError('');
                          try {
                            await api.delete(`/tournaments/${id}/teams/${tm.id}`);
                            setActionSuccess(`❌ ${tm.name} request rejected`);
                            reload();
                          } catch (err) { setActionError(err.message); }
                          finally { setActionLoading(false); }
                        }}
                        disabled={actionLoading}
                        className="inline-flex items-center gap-1 rounded-lg bg-red-50 border border-red-200 hover:bg-red-100 disabled:opacity-60 px-2.5 py-1.5 text-[11px] font-black text-red-700 transition"
                      >
                        <UserX className="h-3.5 w-3.5" /> Reject
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-slate-900 text-base">
                  🏏 Registered Teams ({approvedTeams.length} / {tournament.maxTeams || 16})
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
                  onClick={() => {
                    // Auto-select "My Team" tab if organizer has own teams not yet added
                    setAddTeamTab(apiMyOwnTeams.length > 0 ? 'myteam' : 'code');
                    setActionError('');
                    setAddTeamOpen(true);
                  }}
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
              ['active', `Active (${teams.filter((t) => t.status === 'approved' || (!t.status)).length})`],
              ['eliminated', `Eliminated (${teams.filter((t) => t.status === 'eliminated').length})`],
              ...(teams.some((t) => t.status === 'pending')
                ? [['pending', `Pending (${teams.filter((t) => t.status === 'pending').length})`]]
                : []),
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
                if (teamFilter === 'active') return t.status === 'approved' || !t.status;
                if (teamFilter === 'eliminated') return t.status === 'eliminated';
                if (teamFilter === 'pending') return t.status === 'pending';
                if (teamFilter === 'byes') return byes.some((b) => b.teamId === t.id || b.teamName === t.name);
                return true;
              })
              .map((t, idx) => {
                const teamBye = byes.find((b) => b.teamId === t.id || b.teamName === t.name);
                const isEliminated = t.status === 'eliminated';
                const isWinner = t.status === 'winner';
                const isPending = t.status === 'pending';

                return (
                  <div
                    key={t.id || idx}
                    className={`relative overflow-hidden rounded-2xl border bg-white shadow-sm hover:shadow-md transition-all flex flex-col justify-between p-4 ${
                      isEliminated
                        ? 'border-red-200 bg-red-50/20 opacity-80'
                        : isWinner
                        ? 'border-amber-300 bg-amber-50/30'
                        : isPending
                        ? 'border-amber-200 bg-amber-50/15'
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
                            : isPending
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
                          ) : isPending ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full">
                              ⏳ Pending Confirmation
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
                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                        {isEliminated ? (
                          <button
                            onClick={() => handleUpdateTeamStatus(t.id, 'approved')}
                            className="flex-1 min-h-[40px] py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-bold text-xs sm:text-sm transition"
                          >
                            🟢 Reactivate Team
                          </button>
                        ) : isPending ? (
                          <button
                            onClick={() => handleUpdateTeamStatus(t.id, 'approved')}
                            className="flex-1 min-h-[40px] py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm transition shadow-xs"
                          >
                            ✓ Approve Spot
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => handleUpdateTeamStatus(t.id, 'eliminated')}
                              className="flex-1 min-h-[40px] py-2 px-3 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-bold text-xs sm:text-sm transition"
                              title="Eliminate team after match"
                            >
                              🔴 Eliminate
                            </button>
                            <button
                              onClick={() => handleUpdateTeamStatus(t.id, 'winner')}
                              className="min-h-[40px] py-2 px-3.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 font-bold text-xs sm:text-sm transition"
                              title="Crown as Winner"
                            >
                              🏆 Winner
                            </button>
                          </>
                        )}
                      </div>
                    )}

                    {/* This team's matches */}
                    {(() => {
                      const teamMatches = matches.filter(
                        (m) => m.homeTeam?.id === t.id || m.awayTeam?.id === t.id
                      );
                      if (teamMatches.length === 0) return null;
                      return (
                        <div className="mt-3 pt-2.5 border-t border-slate-100">
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Matches</p>
                          <div className="space-y-1.5">
                            {teamMatches.map((m, mi) => {
                              const isHome = m.homeTeam?.id === t.id;
                              const opp = isHome ? m.awayTeam : m.homeTeam;
                              const isLive = m.status === 'live';
                              const isDone = m.status === 'completed';
                              return (
                                <Link
                                  key={m.id}
                                  to={`/matches/${m.id}`}
                                  className={`flex items-center justify-between gap-2 rounded-xl px-2.5 py-1.5 text-xs transition ${
                                    isLive
                                      ? 'bg-red-50 border border-red-200 hover:bg-red-100'
                                      : isDone
                                      ? 'bg-slate-50 border border-slate-200 hover:bg-slate-100'
                                      : 'bg-blue-50 border border-blue-100 hover:bg-blue-100'
                                  }`}
                                >
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    {isLive && (
                                      <span className="flex h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                                    )}
                                    <span className="font-bold text-slate-700 truncate">
                                      vs {opp?.name || 'TBD'}
                                    </span>
                                    <span className="text-[10px] text-slate-400 shrink-0">{m.round}</span>
                                  </div>
                                  <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-lg ${
                                    isLive ? 'text-red-700 bg-red-100' :
                                    isDone ? 'text-slate-600 bg-slate-200' :
                                    'text-blue-700 bg-blue-100'
                                  }`}>
                                    {isLive ? '🔴 LIVE' : isDone ? '✓ Done' : '📅 Upcoming'}
                                  </span>
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
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

      {/* Add Team Modal - 3 ways: My Team | Team Code | Guest Team */}
      <Modal open={addTeamOpen} onClose={() => { setAddTeamOpen(false); setActionError(''); }} title="Add Team to Tournament">
        <div className="space-y-4">

          {/* Mode Switcher Tabs */}
          <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-bold text-slate-600 gap-0.5">
            {apiMyOwnTeams.length > 0 && (
              <button
                type="button"
                onClick={() => setAddTeamTab('myteam')}
                className={`flex-1 py-2 rounded-lg text-center transition ${
                  addTeamTab === 'myteam' ? 'bg-white text-slate-900 shadow-xs font-black' : 'hover:text-slate-900'
                }`}
              >
                🏏 My Team
              </button>
            )}
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
              ➕ Guest Team
            </button>
          </div>

          {actionError && (
            <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2 font-semibold">
              ⚠️ {actionError}
            </div>
          )}

          {/* MY TEAM TAB: organizer's own registered teams not yet in this tournament */}
          {addTeamTab === 'myteam' && (
            <div className="space-y-2">
              <p className="text-xs text-slate-500 font-medium">உங்களுடைய டீம்கள் – ஒரு கிளிக்கில் டோர்னமென்டில் சேர்க்கலாம்:</p>
              {apiMyOwnTeams.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  உங்கள் அனைத்து டீம்களும் ஏற்கனவே டோர்னமென்டில் சேர்க்கப்பட்டுவிட்டன.
                </p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {apiMyOwnTeams.map((t) => (
                    <div key={t.id} className="flex items-center justify-between gap-3 bg-slate-50 border border-slate-200 hover:border-pitch-300 rounded-xl px-3 py-2.5 transition">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-pitch-100 text-pitch-700 font-black text-sm">
                          {(t.name || '?')[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-sm text-slate-900 truncate">{t.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{t.code}{t.location ? ` · ${t.location}` : ''}</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => handleAddMyOwnTeam(t.id, t.name)}
                        className="shrink-0 inline-flex items-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-3 py-1.5 shadow-sm transition disabled:opacity-50"
                      >
                        {actionLoading ? '...' : '+ Add'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TEAM CODE TAB: add registered team by their code */}
          {addTeamTab === 'code' && (
            <form onSubmit={handleAddTeam} className="space-y-4 text-sm">
              <div className="space-y-2">
                <label className="label font-bold text-slate-700">Team Code (6 எழுத்து கோட்)</label>
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
                  எதிரணி கேப்டனிடம் அவர்களின் Team Code கேளுங்கள். ஆப்பில் பதிவு இல்லாத அணிகளுக்கு <strong>"Guest Team"</strong> tab பயன்படுத்துங்கள்.
                </p>
              </div>
              <div className="flex gap-2 justify-end pt-1">
                <button type="button" onClick={() => setAddTeamOpen(false)} className="btn btn-outline flex-1 sm:flex-initial py-2.5">Cancel</button>
                <button type="submit" disabled={actionLoading} className="btn btn-green flex-1 sm:flex-initial py-2.5 font-bold shadow-md">
                  {actionLoading ? 'Adding...' : 'Add by Code'}
                </button>
              </div>
            </form>
          )}

          {/* GUEST TEAM TAB: for teams without app account */}
          {addTeamTab === 'guest' && (
            <form onSubmit={handleAddTeam} className="space-y-3 text-sm">
              {/* Team Name */}
              <div>
                <label className="label font-bold text-slate-700">அணி பெயர் *</label>
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
                  <label className="label font-bold text-slate-700">ஊர் / நகரம் (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Kanchipuram"
                    value={guestTeamCity}
                    onChange={(e) => setGuestTeamCity(e.target.value)}
                    className="input py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="label font-bold text-slate-700">கேப்டன் / தொடர்பு (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Kumar - 9876543210"
                    value={guestTeamContact}
                    onChange={(e) => setGuestTeamContact(e.target.value)}
                    className="input py-2.5 text-sm"
                  />
                </div>
              </div>

              {/* 11 Players Toggle Section */}
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowGuestPlayers((v) => !v)}
                  className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-black text-amber-900 hover:bg-amber-100 transition"
                >
                  <span className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-amber-700" />
                    11 பேர் பெயர் போடு (வீரர் பட்டியல்)
                  </span>
                  <span className="text-amber-600 text-[10px] font-bold">
                    {showGuestPlayers ? '▲ மூடு' : '▼ திற'}
                  </span>
                </button>

                {showGuestPlayers && (
                  <div className="px-3 pb-3 space-y-1.5 border-t border-amber-200">
                    <p className="text-[10px] text-amber-700 font-medium pt-2">
                      வீரர் பெயர் மாத்துக்கலாம் — default-ஆ Player 1–11 இருக்கும்.
                    </p>
                    <div className="space-y-1 max-h-56 overflow-y-auto pr-0.5">
                      {guestPlayers.map((player, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 p-1 rounded-xl border border-amber-200 bg-white">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-amber-100 border border-amber-200 font-mono text-[9px] font-black text-amber-700">
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
                          <select
                            value={player.role}
                            onChange={(e) => {
                              const updated = [...guestPlayers];
                              updated[idx] = { ...updated[idx], role: e.target.value };
                              setGuestPlayers(updated);
                            }}
                            className="shrink-0 rounded-lg border border-slate-200 bg-white px-1.5 py-1 text-[10px] font-bold text-slate-700 focus:outline-none focus:border-amber-400"
                          >
                            <option value="batsman">🏏 Bat</option>
                            <option value="bowler">⚾ Bowl</option>
                            <option value="allrounder">⚡ All</option>
                            <option value="wicketkeeper">🧤 WK</option>
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <p className="text-xs text-slate-500 bg-amber-50 border border-amber-200/60 p-2.5 rounded-xl">
                💡 ஆப்பில் அக்கவுண்ட் இல்லாத அணிகளை இப்படி நேரடியாக சேர்க்கலாம். GST கோட் கிடைக்கும் — மேட்ச் உடனே நடத்தலாம்.
              </p>
              <div className="flex gap-2 justify-end pt-1">
                <button type="button" onClick={() => setAddTeamOpen(false)} className="btn btn-outline flex-1 sm:flex-initial py-2.5">Cancel</button>
                <button type="submit" disabled={actionLoading} className="btn btn-green flex-1 sm:flex-initial py-2.5 font-bold shadow-md">
                  {actionLoading ? 'Adding...' : 'Create Guest Team'}
                </button>
              </div>
            </form>
          )}

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
                  { value: '', label: '-- Select Home Team --' },
                  ...teams
                    .filter((t) => t.status !== 'pending')
                    .map((t) => ({
                      value: t.id,
                      label: `${t.name}${t.status === 'eliminated' ? ' 🔴 (Eliminated)' : t.status === 'winner' ? ' 🏆 (Champion)' : ' 🟢 (Active)'}`,
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
                  { value: '', label: '-- Select Away Team --' },
                  ...teams
                    .filter((t) => t.status !== 'pending')
                    .map((t) => ({
                      value: t.id,
                      label: `${t.name}${t.status === 'eliminated' ? ' 🔴 (Eliminated)' : t.status === 'winner' ? ' 🏆 (Champion)' : ' 🟢 (Active)'}`,
                    })),
                ]}
                placeholder="-- Select --"
                buttonClassName="text-xs font-semibold"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="label font-bold">Round / Match</label>
              <DropdownSelect
                value={matchRound}
                onChange={(val) => setMatchRound(val)}
                options={[
                  `Match ${matches.length + 1}`,
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
              <div className="flex flex-wrap gap-1.5">
                {[8, 9, 10, 12, 14, 16, 24, 32].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setCustomMaxTeams(n)}
                    className={`min-h-[38px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
                      customMaxTeams === n ? 'bg-pitch-600 text-white shadow-2xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {n}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCustomMaxTeams(64)}
                  className={`min-h-[38px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
                    customMaxTeams >= 64 ? 'bg-pitch-600 text-white shadow-2xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
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
