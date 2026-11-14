import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Medal, Plus, Search, Trophy, KeyRound, MapPin, Users, Clock, Check, Copy, Flame, ChevronRight, Zap, Shield, LogIn, X } from 'lucide-react';
import { useFetch } from '../useFetch.js';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api.js';
import { Spinner, ErrorBox, SkeletonCard, SkeletonTournamentList } from '../components/ui.jsx';
import { TournamentCreateModal } from '../components/TournamentCreateModal.jsx';
import { ScorerLoginModal } from '../components/ScorerLoginModal.jsx';

export default function TournamentsList() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [scorerOpen, setScorerOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);

  // Join tournament via code
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [joinSuccess, setJoinSuccess] = useState('');

  // Spot Confirmation Action State
  const [spotActionId, setSpotActionId] = useState(null);
  const [spotActionMsg, setSpotActionMsg] = useState('');
  const [spotActionError, setSpotActionError] = useState('');

  const { data, loading, error, reload } = useFetch(`/tournaments${search ? `?search=${encodeURIComponent(search)}` : ''}`);

  const tournaments = data?.tournaments || [];
  const myInvitations = data?.myInvitations || [];

  const handleConfirmSpot = async (tournamentId, teamId) => {
    setSpotActionId(`${tournamentId}-${teamId}`);
    setSpotActionError('');
    setSpotActionMsg('');
    try {
      const res = await api.post(`/tournaments/${tournamentId}/teams/${teamId}/confirm-spot`);
      setSpotActionMsg(res.message || 'Spot confirmed successfully!');
      setTimeout(() => setSpotActionMsg(''), 4000);
      reload();
    } catch (err) {
      setSpotActionError(err.message || 'Failed to confirm spot');
    } finally {
      setSpotActionId(null);
    }
  };

  const handleDeclineSpot = async (tournamentId, teamId, teamName) => {
    if (!window.confirm(`Are you sure you want to decline the tournament invitation for ${teamName}?`)) return;
    setSpotActionId(`${tournamentId}-${teamId}`);
    setSpotActionError('');
    setSpotActionMsg('');
    try {
      const res = await api.post(`/tournaments/${tournamentId}/teams/${teamId}/decline-spot`);
      setSpotActionMsg(res.message || 'Tournament invitation declined');
      setTimeout(() => setSpotActionMsg(''), 4000);
      reload();
    } catch (err) {
      setSpotActionError(err.message || 'Failed to decline spot');
    } finally {
      setSpotActionId(null);
    }
  };

  const filteredTournaments = tournaments.filter((t) => {
    if (filter === 'all') return true;
    return t.status === filter;
  });

  const handleCopyCode = (code, e) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setJoinLoading(true);
    setJoinError('');
    setJoinSuccess('');
    try {
      const res = await api.post('/tournaments/join', { tournamentCode: joinCode.trim().toUpperCase() });
      setJoinSuccess(res.message || 'Join request sent! Waiting for organizer approval.');
      setJoinCode('');
      reload();
    } catch (err) {
      setJoinError(err.message || 'Failed to send join request');
    } finally {
      setJoinLoading(false);
    }
  };

  const statusCounts = {
    live: tournaments.filter((t) => t.status === 'live').length,
    upcoming: tournaments.filter((t) => t.status === 'upcoming').length,
    completed: tournaments.filter((t) => t.status === 'completed').length,
  };

  if (loading && !data) return <SkeletonTournamentList />;

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* ─── Hero Header ─── */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 p-3.5 sm:p-5 shadow-md text-white">
        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-6 -left-4 h-20 w-20 rounded-full bg-white/10" />

        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-200" />
              <h1 className="text-base sm:text-xl font-black tracking-tight">Cricket Tournaments</h1>
            </div>
            <p className="text-[10px] sm:text-xs text-orange-100">
              Knockout cups · Multi-ground scoring · Village brackets
            </p>
            {statusCounts.live > 0 && (
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-sm px-2.5 py-0.5 text-[10px] font-bold border border-white/30">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-ping inline-block" />
                {statusCounts.live} LIVE right now
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setScorerOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/20 hover:bg-white/30 border border-white/30 backdrop-blur-sm min-h-[38px] px-3.5 py-2 text-xs sm:text-sm font-bold text-white transition shadow-2xs"
              title="Log in to score a match"
            >
              <KeyRound className="h-4 w-4" />
              <span>Scorer PIN</span>
            </button>

            {user && user.role !== 'viewer' && (
              <button
                onClick={() => { setJoinOpen(true); setJoinError(''); setJoinSuccess(''); }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white/20 hover:bg-white/30 border border-white/30 backdrop-blur-sm min-h-[38px] px-3.5 py-2 text-xs sm:text-sm font-bold text-white transition shadow-2xs"
                title="Join a tournament with invite code"
              >
                <LogIn className="h-4 w-4" />
                <span>Join via Code</span>
              </button>
            )}

            {user && user.role !== 'viewer' && (
              <button
                onClick={() => setCreateOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white text-orange-600 hover:bg-orange-50 min-h-[38px] px-4 py-2 text-xs sm:text-sm font-black shadow-md transition"
              >
                <Plus className="h-4 w-4" />
                <span>New Tournament</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── Spot Confirmation Invitations (Notifications for Team Admin) ─── */}
      {myInvitations.length > 0 && (
        <div className="rounded-2xl border-2 border-amber-400 bg-gradient-to-br from-amber-50 via-orange-50 to-white p-4 space-y-3 shadow-md animate-in fade-in">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs">
                <Trophy className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-amber-950">
                  🏆 Tournament Invitation: Confirm Your Team Spot ({myInvitations.length})
                </h3>
                <p className="text-[11px] text-amber-800">
                  Your team has been added to a tournament via Team Code. Please confirm your spot to enter the draw!
                </p>
              </div>
            </div>
            <span className="badge bg-amber-500 text-white text-[10px] font-black uppercase tracking-wider py-0.5 px-2 rounded-full animate-pulse">
              Action Required
            </span>
          </div>

          {spotActionMsg && (
            <div className="rounded-xl bg-emerald-100/90 border border-emerald-300 p-2.5 text-xs font-bold text-emerald-900">
              {spotActionMsg}
            </div>
          )}
          {spotActionError && <ErrorBox message={spotActionError} />}

          <div className="grid gap-2.5 sm:grid-cols-2">
            {myInvitations.map((inv) => {
              const isBusy = spotActionId === `${inv.tournamentId}-${inv.teamId}`;
              return (
                <div
                  key={`${inv.tournamentId}-${inv.teamId}`}
                  className="card p-3 rounded-xl border border-amber-300/80 bg-white shadow-xs space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-black text-slate-900 truncate">
                        {inv.tournamentName}
                      </h4>
                      <p className="text-[11px] text-slate-600 mt-0.5 truncate">
                        Team: <strong className="text-pitch-700 font-bold">{inv.teamName}</strong> · by {inv.organizerName}
                      </p>
                      {inv.venue && (
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">
                          📍 {inv.venue} {inv.defaultOvers ? `· ${inv.defaultOvers} overs` : ''}
                        </p>
                      )}
                    </div>
                    <span className="badge bg-amber-100 text-amber-800 text-[9.5px] font-bold py-0.2 px-1.5 shrink-0">
                      Pending Spot
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-1.5 border-t border-slate-100">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleConfirmSpot(inv.tournamentId, inv.teamId)}
                      className="btn btn-green flex-1 min-h-[40px] !py-2 text-xs sm:text-sm font-black shadow-xs inline-flex items-center justify-center gap-1.5 rounded-xl"
                    >
                      {isBusy ? <Spinner size="sm" /> : <Check className="h-4 w-4" />}
                      <span>Confirm Spot</span>
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleDeclineSpot(inv.tournamentId, inv.teamId, inv.teamName)}
                      className="btn btn-outline min-h-[40px] !py-2 px-3 text-xs sm:text-sm font-bold text-red-600 border-red-200 hover:bg-red-50 inline-flex items-center gap-1.5 rounded-xl"
                      title="Decline Invitation"
                    >
                      <X className="h-4 w-4" />
                      <span>Decline</span>
                    </button>
                    <Link
                      to={`/tournaments/${inv.tournamentId}`}
                      className="btn btn-ghost min-h-[40px] !py-2 px-3 text-xs sm:text-sm font-bold text-slate-600 hover:text-slate-900 rounded-xl inline-flex items-center"
                      title="View Tournament"
                    >
                      View
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Filters + Search ─── */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, venue or code…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input !pl-10 text-xs sm:text-sm"
          />
        </div>

        <div className="flex rounded-xl bg-slate-100 p-1 gap-1 text-xs font-bold text-slate-500 shadow-inner">
          {[
            ['all', 'All', null],
            ['live', 'Live', statusCounts.live],
            ['upcoming', 'Upcoming', statusCounts.upcoming],
            ['completed', 'Done', statusCounts.completed],
          ].map(([val, label, count]) => (
            <button
              key={val}
              onClick={() => setFilter(val)}
              className={`relative rounded-lg px-3 py-1.5 transition-all ${
                filter === val
                  ? 'bg-white text-slate-900 shadow font-extrabold'
                  : 'hover:text-slate-800'
              }`}
            >
              {val === 'live' && (
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse" />
              )}
              {label}
              {count > 0 && (
                <span className={`ml-1 text-[10px] rounded-full px-1.5 py-0.5 font-bold ${
                  filter === val ? 'bg-slate-100 text-slate-700' : 'bg-slate-200 text-slate-500'
                }`}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Loading / Errors ─── */}
      {loading && !data && <SkeletonCard count={3} />}
      {error && !data && <ErrorBox message={error} onRetry={reload} />}

      {/* ─── Tournaments Grid ─── */}
      {data && (
        <>
          {filteredTournaments.length === 0 ? (
            <div className="card p-12 text-center flex flex-col items-center justify-center border-dashed border-2 border-slate-200">
              <div className="h-16 w-16 rounded-2xl bg-amber-50 flex items-center justify-center mb-4">
                <Medal className="h-8 w-8 text-amber-300" />
              </div>
              <h3 className="font-bold text-slate-800 text-base">No tournaments found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                {search
                  ? `No tournaments match "${search}". Try another keyword.`
                  : 'Get started by creating your first tournament.'}
              </p>
              {user && user.role !== 'viewer' && (
                <button
                  onClick={() => setCreateOpen(true)}
                  className="btn btn-green mt-5 text-xs flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create Tournament</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredTournaments.map((t) => {
                const isLive = t.status === 'live';
                const isCompleted = t.status === 'completed';
                return (
                  <Link
                    key={t.id}
                    to={`/tournaments/${t.id}`}
                    className={`group relative flex flex-col justify-between overflow-hidden rounded-xl border bg-white shadow-sm hover:shadow-lg transition-all duration-200 ${
                      isLive
                        ? 'border-emerald-300 hover:border-emerald-400'
                        : 'border-slate-200 hover:border-pitch-400'
                    }`}
                  >
                    {isLive && (
                      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-400 via-green-400 to-teal-400" />
                    )}

                    <div className="p-3 sm:p-4">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${
                              isLive
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                : isCompleted
                                ? 'bg-slate-100 text-slate-500 border-slate-200'
                                : 'bg-amber-50 text-amber-700 border-amber-300'
                            }`}
                          >
                            {isLive && (
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                            )}
                            {isLive ? 'LIVE' : t.status}
                          </span>

                          {t.visibility === 'invited' ? (
                            <span className="inline-flex items-center gap-0.5 text-[9.5px] font-bold px-1.5 py-0.2 rounded-full bg-amber-50 text-amber-800 border border-amber-300" title="Only organizer and participating teams can see">
                              🔒 Invited Only
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 text-[9.5px] font-bold px-1.5 py-0.2 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                              🌐 Public
                            </span>
                          )}
                        </div>

                        <button
                          onClick={(e) => handleCopyCode(t.code, e)}
                          className="inline-flex items-center gap-1 rounded-lg bg-slate-100 hover:bg-slate-200 px-2 py-0.5 text-[10px] font-mono font-bold text-slate-700 transition"
                          title="Copy tournament code"
                        >
                          <span>{t.code}</span>
                          {copiedCode === t.code ? (
                            <Check className="h-2.5 w-2.5 text-green-600" />
                          ) : (
                            <Copy className="h-2.5 w-2.5 text-slate-400" />
                          )}
                        </button>
                      </div>

                      <h3 className="font-extrabold text-slate-900 text-sm sm:text-base leading-snug group-hover:text-pitch-700 transition">
                        {t.name}
                      </h3>

                      {t.venue && (
                        <p className="flex items-center gap-1 text-[10px] text-slate-500 mt-1">
                          <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                          <span className="truncate">{t.venue}</span>
                        </p>
                      )}

                      {t.grounds && t.grounds.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {t.grounds.map((g, i) => (
                            <span
                              key={i}
                              className="text-[9px] font-semibold bg-pitch-50 text-pitch-700 border border-pitch-200/60 px-1.5 py-0.5 rounded-md"
                            >
                              {g}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="px-3 sm:px-4 pb-3 pt-2 border-t border-slate-100 grid grid-cols-3 gap-1 text-center">
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase block mb-0.5">Format</span>
                        <span className="font-bold text-slate-800 text-[10px] capitalize">{t.format}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase block mb-0.5">Teams</span>
                        <span className="font-bold text-slate-800 text-[10px]">
                          {t.teamCount}
                          <span className="text-slate-400 font-normal"> / {t.maxTeams}</span>
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase block mb-0.5">Overs</span>
                        <span className="font-bold text-slate-800 text-[10px]">{t.defaultOvers} ov</span>
                      </div>
                    </div>

                    <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-300 group-hover:text-pitch-500 group-hover:translate-x-0.5 transition-all" />
                  </Link>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Modals */}
      <TournamentCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(newTrn) => {
          reload();
          if (newTrn?.id) nav(`/tournaments/${newTrn.id}`);
        }}
      />
      <ScorerLoginModal
        open={scorerOpen}
        onClose={() => setScorerOpen(false)}
      />

      {/* Join Tournament via Code Modal */}
      {joinOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setJoinOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <LogIn className="h-4 w-4 text-amber-500" /> Join Tournament
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">Tournament organizer code enter pannunga</p>
              </div>
              <button onClick={() => setJoinOpen(false)} className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition">
                <X className="h-4 w-4" />
              </button>
            </div>

            {joinSuccess ? (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-center space-y-2">
                <div className="flex h-10 w-10 mx-auto items-center justify-center rounded-full bg-emerald-100">
                  <Check className="h-5 w-5 text-emerald-600" />
                </div>
                <p className="text-sm font-bold text-emerald-800">{joinSuccess}</p>
                <p className="text-[11px] text-emerald-600">Organizer approve panna uadane neenga tournament-la join aaguveenga!</p>
                <button
                  onClick={() => { setJoinOpen(false); setJoinSuccess(''); }}
                  className="mt-1 inline-flex items-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-bold text-white transition"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleJoin} className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">Tournament Code</label>
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="e.g. TRN-4521"
                    className="input w-full font-mono font-bold text-sm tracking-widest"
                    maxLength={10}
                    autoFocus
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Tournament organizer kuduttha code enter pannunga</p>
                </div>

                {joinError && (
                  <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700 font-medium">
                    {joinError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={joinLoading || !joinCode.trim()}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-60 px-4 py-2.5 text-sm font-black text-white shadow-md transition"
                >
                  {joinLoading ? <Spinner size={16} /> : <LogIn className="h-4 w-4" />}
                  {joinLoading ? 'Sending Request…' : 'Send Join Request'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
