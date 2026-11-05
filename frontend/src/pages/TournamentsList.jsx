import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Medal, Plus, Search, Trophy, KeyRound, MapPin, Users, Clock, Check, Copy, Flame, ChevronRight, Zap, Shield } from 'lucide-react';
import { useFetch } from '../useFetch.js';
import { useAuth } from '../context/AuthContext.jsx';
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

  const { data, loading, error, reload } = useFetch(`/tournaments${search ? `?search=${encodeURIComponent(search)}` : ''}`);

  const tournaments = data?.tournaments || [];

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

  const statusCounts = {
    live: tournaments.filter((t) => t.status === 'live').length,
    upcoming: tournaments.filter((t) => t.status === 'upcoming').length,
    completed: tournaments.filter((t) => t.status === 'completed').length,
  };

  if (loading && !data) return <SkeletonTournamentList />;

  return (
    <div className="space-y-6">
      {/* ─── Hero Header ─── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 p-5 sm:p-7 shadow-lg text-white">
        <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-6 -left-4 h-28 w-28 rounded-full bg-white/10" />

        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="h-6 w-6 text-yellow-200" />
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">Cricket Tournaments</h1>
            </div>
            <p className="text-sm text-orange-100">
              Knockout cups · Multi-ground scoring · Village brackets
            </p>
            {statusCounts.live > 0 && (
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-sm px-3 py-1 text-xs font-bold border border-white/30">
                <span className="h-2 w-2 rounded-full bg-emerald-300 animate-ping inline-block" />
                {statusCounts.live} LIVE right now
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setScorerOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/20 hover:bg-white/30 border border-white/30 backdrop-blur-sm px-3 py-2 text-xs font-bold text-white transition"
              title="Log in to score a match"
            >
              <KeyRound className="h-4 w-4" />
              <span>Scorer PIN</span>
            </button>

            {user && user.role !== 'viewer' && (
              <button
                onClick={() => setCreateOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white text-orange-600 hover:bg-orange-50 px-4 py-2 text-xs font-black shadow-md transition"
              >
                <Plus className="h-4 w-4" />
                <span>New Tournament</span>
              </button>
            )}
          </div>
        </div>
      </div>

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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTournaments.map((t) => {
                const isLive = t.status === 'live';
                const isCompleted = t.status === 'completed';
                return (
                  <Link
                    key={t.id}
                    to={`/tournaments/${t.id}`}
                    className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-white shadow-sm hover:shadow-lg transition-all duration-200 ${
                      isLive
                        ? 'border-emerald-300 hover:border-emerald-400'
                        : 'border-slate-200 hover:border-pitch-400'
                    }`}
                  >
                    {isLive && (
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-green-400 to-teal-400" />
                    )}

                    <div className="p-4 sm:p-5">
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span
                          className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full border capitalize ${
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

                        <button
                          onClick={(e) => handleCopyCode(t.code, e)}
                          className="inline-flex items-center gap-1 rounded-lg bg-slate-100 hover:bg-slate-200 px-2 py-0.5 text-[11px] font-mono font-bold text-slate-700 transition"
                          title="Copy tournament code"
                        >
                          <span>{t.code}</span>
                          {copiedCode === t.code ? (
                            <Check className="h-3 w-3 text-green-600" />
                          ) : (
                            <Copy className="h-3 w-3 text-slate-400" />
                          )}
                        </button>
                      </div>

                      <h3 className="font-extrabold text-slate-900 text-base sm:text-lg leading-snug group-hover:text-pitch-700 transition">
                        {t.name}
                      </h3>

                      {t.venue && (
                        <p className="flex items-center gap-1.5 text-xs text-slate-500 mt-1.5">
                          <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{t.venue}</span>
                        </p>
                      )}

                      {t.grounds && t.grounds.length > 0 && (
                        <div className="mt-2.5 flex flex-wrap gap-1">
                          {t.grounds.map((g, i) => (
                            <span
                              key={i}
                              className="text-[10px] font-semibold bg-pitch-50 text-pitch-700 border border-pitch-200/60 px-2 py-0.5 rounded-md"
                            >
                              {g}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="px-4 sm:px-5 pb-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block mb-0.5">Format</span>
                        <span className="font-bold text-slate-800 capitalize">{t.format}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block mb-0.5">Teams</span>
                        <span className="font-bold text-slate-800">
                          {t.teamCount}
                          <span className="text-slate-400 font-normal"> / {t.maxTeams}</span>
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block mb-0.5">Overs</span>
                        <span className="font-bold text-slate-800">{t.defaultOvers} ov</span>
                      </div>
                    </div>

                    <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-hover:text-pitch-500 group-hover:translate-x-0.5 transition-all" />
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
    </div>
  );
}
