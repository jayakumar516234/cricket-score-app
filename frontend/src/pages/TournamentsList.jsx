import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Medal, Plus, Search, Trophy, KeyRound, MapPin, Users, Clock, Check, Copy, Flame } from 'lucide-react';
import { useFetch } from '../useFetch.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Spinner, ErrorBox, SkeletonCard } from '../components/ui.jsx';
import { TournamentCreateModal } from '../components/TournamentCreateModal.jsx';
import { ScorerLoginModal } from '../components/ScorerLoginModal.jsx';

export default function TournamentsList() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'live' | 'upcoming' | 'completed'
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

  return (
    <div className="space-y-5">
      {/* Page Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Medal className="h-6 w-6 text-amber-500" />
            <span>Cricket Tournaments</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Knockout cups, multi-ground simultaneous scoring & village brackets
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Scorer PIN Button */}
          <button
            onClick={() => setScorerOpen(true)}
            className="btn btn-outline text-xs sm:text-sm border-amber-300 bg-amber-50/50 text-amber-900 hover:bg-amber-100 flex items-center gap-1.5"
            title="Log in to score a match on your phone"
          >
            <KeyRound className="h-4 w-4 text-amber-600" />
            <span>Scorer PIN</span>
          </button>

          {/* Create Tournament Button */}
          {user && user.role !== 'viewer' && (
            <button
              onClick={() => setCreateOpen(true)}
              className="btn btn-green text-xs sm:text-sm flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>New Tournament</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search tournament by name, venue or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input !pl-10 text-xs sm:text-sm"
          />
        </div>

        <div className="flex rounded-xl bg-slate-200/70 p-1 gap-1 text-xs font-bold text-slate-600">
          {[
            ['all', 'All'],
            ['live', 'Live'],
            ['upcoming', 'Upcoming'],
            ['completed', 'Completed'],
          ].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setFilter(val)}
              className={`rounded-lg px-3 py-1.5 transition ${
                filter === val ? 'bg-white text-slate-900 shadow-2xs' : 'hover:text-slate-900'
              }`}
            >
              {val === 'live' && <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse" />}
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading & Errors */}
      {loading && !data && <SkeletonCard count={3} />}
      {error && !data && <ErrorBox message={error} onRetry={reload} />}

      {/* Tournaments Grid */}
      {data && (
        <>
          {filteredTournaments.length === 0 ? (
            <div className="card p-10 text-center flex flex-col items-center justify-center">
              <Medal className="h-12 w-12 text-slate-300 mb-3" />
              <h3 className="font-bold text-slate-800 text-base">No tournaments found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                {search
                  ? `No tournaments match "${search}". Try another keyword or code.`
                  : 'Get started by creating your first tournament or enter a Scorer PIN to score matches.'}
              </p>
              {user && user.role !== 'viewer' && (
                <button
                  onClick={() => setCreateOpen(true)}
                  className="btn btn-green mt-4 text-xs flex items-center gap-1.5 shadow-sm"
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
                return (
                  <Link
                    key={t.id}
                    to={`/tournaments/${t.id}`}
                    className="card p-4 sm:p-5 hover:border-pitch-400 hover:shadow-md transition group flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <span
                          className={`badge text-[11px] font-bold px-2.5 py-0.5 rounded-full capitalize ${
                            isLive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-300/60'
                              : t.status === 'completed'
                              ? 'bg-slate-100 text-slate-600'
                              : 'bg-amber-50 text-amber-700 border border-amber-300/60'
                          }`}
                        >
                          {isLive && (
                            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 mr-1.5 animate-ping" />
                          )}
                          {t.status}
                        </span>

                        {/* Tournament Code */}
                        <button
                          onClick={(e) => handleCopyCode(t.code, e)}
                          className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[11px] font-mono font-bold text-slate-700 hover:bg-slate-200 transition"
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

                      {/* Tournament Name */}
                      <h3 className="font-extrabold text-slate-900 text-base sm:text-lg group-hover:text-pitch-700 transition">
                        {t.name}
                      </h3>

                      {/* Venue & Location */}
                      {t.venue && (
                        <p className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                          <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{t.venue}</span>
                        </p>
                      )}

                      {/* Grounds list */}
                      {t.grounds && t.grounds.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {t.grounds.map((g, i) => (
                            <span
                              key={i}
                              className="text-[10px] font-medium bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded"
                            >
                              {g}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Stats footer */}
                    <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium uppercase">Format</span>
                        <span className="font-bold text-slate-800 capitalize">{t.format}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium uppercase">Teams</span>
                        <span className="font-bold text-slate-800">
                          {t.teamCount} / {t.maxTeams}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium uppercase">Overs</span>
                        <span className="font-bold text-slate-800">{t.defaultOvers} ov</span>
                      </div>
                    </div>
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
