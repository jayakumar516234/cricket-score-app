import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ChevronRight,
  Shield,
  Trophy,
  Users,
  Activity,
  CheckCircle2,
  Plus,
  Handshake,
  Copy,
  Check,
  Radio,
  Flame,
  ArrowRight,
  Share2,
  Medal,
  Zap,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useFetch } from '../useFetch.js';
import { Empty, ErrorBox, StatusBadge, TeamLogo } from '../components/ui.jsx';
import { MatchScoreLine } from './Matches.jsx';

function ShimmerBar({ className = '' }) {
  return <div className={`animate-pulse rounded-md bg-slate-200/90 ${className}`} />;
}

// Progressive skeleton loader for Dashboard
function DashboardSkeleton({ isAdmin }) {
  return (
    <div className="space-y-3.5 sm:space-y-5">
      {/* Page Title Skeleton */}
      <div className="flex items-center justify-between">
        <ShimmerBar className="h-6 w-28" />
      </div>

      {/* Hero Banner Skeleton */}
      <section className="rounded-2xl border border-navy-800 bg-gradient-to-br from-navy-950 via-navy-900 to-navy-850 p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 sm:h-14 sm:w-14 shrink-0 rounded-xl bg-navy-800/80 animate-pulse border border-navy-700/60" />
            <div className="space-y-1.5">
              <div className="h-5 w-40 rounded-md bg-navy-800 animate-pulse" />
              <div className="h-3.5 w-48 rounded-md bg-navy-800/60 animate-pulse" />
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2 sm:pt-0">
            <div className="h-8 w-24 rounded-lg bg-navy-800 animate-pulse" />
            <div className="h-8 w-24 rounded-lg bg-navy-800 animate-pulse" />
          </div>
        </div>
      </section>

      {/* Stats Counter Grid Skeleton */}
      <section className={`grid grid-cols-2 gap-2.5 sm:gap-3 ${isAdmin ? 'sm:grid-cols-3 md:grid-cols-5' : 'md:grid-cols-4'}`}>
        {Array.from({ length: isAdmin ? 5 : 4 }).map((_, i) => (
          <div key={i} className="card p-3 border border-slate-200/80 flex items-center gap-2.5 shadow-2xs">
            <div className="h-9 w-9 shrink-0 rounded-xl bg-slate-200 animate-pulse" />
            <div className="space-y-1 flex-1 min-w-0">
              <div className="h-5 w-12 rounded bg-slate-200 animate-pulse" />
              <div className="h-3 w-16 rounded bg-slate-200/70 animate-pulse" />
            </div>
          </div>
        ))}
      </section>

      {/* Two Columns Grid Skeleton */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <ShimmerBar className="h-4 w-32" />
          <div className="space-y-2">
            {[1, 2, 3].map((k) => (
              <div key={k} className="card p-3 border border-slate-200/80 space-y-2 shadow-2xs">
                <ShimmerBar className="h-4 w-40" />
                <ShimmerBar className="h-3 w-3/4" />
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <ShimmerBar className="h-4 w-32" />
          <div className="space-y-2">
            {[1, 2, 3].map((k) => (
              <div key={k} className="card p-3 border border-slate-200/80 flex items-center gap-2.5 shadow-2xs">
                <div className="h-9 w-9 rounded-xl bg-slate-200 animate-pulse shrink-0" />
                <div className="space-y-1 flex-1">
                  <ShimmerBar className="h-4 w-28" />
                  <ShimmerBar className="h-3 w-36" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const Stat = ({ icon: Icon, label, value, sub, tone, borderTone }) => (
  <div className={`card flex items-center gap-2.5 p-3 border ${borderTone || 'border-slate-200/80'} shadow-2xs hover:shadow-xs transition`}>
    <div className={`flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}>
      <Icon className="h-4.5 w-4.5 sm:h-5 sm:w-5" aria-hidden />
    </div>
    <div className="min-w-0 flex-1">
      <div className="text-base sm:text-xl font-black text-slate-900 tracking-tight leading-tight">{value}</div>
      <div className="text-[10px] sm:text-[11px] font-semibold text-slate-500 truncate">{label}</div>
      {sub && <div className="text-[9px] text-slate-400 truncate">{sub}</div>}
    </div>
  </div>
);

// User-specific Home View (Focuses on My Team, Live Match & Opponents)
function UserHomeView({ data, user, myTeam, t, isViewer }) {
  const [copied, setCopied] = useState(false);
  const record = data.myTeamRecord || { played: 0, won: 0, lost: 0, tied: 0, winRate: 0, playerCount: 0 };
  const liveMatch = data.activeLiveMatch;

  const copyCode = (code) => {
    if (!code) return;
    navigator.clipboard?.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareTeamCodeWhatsApp = (team) => {
    const t = team || myTeam;
    if (!t?.code) return;
    const text = encodeURIComponent(
      `🏏 Connect with *${t.name}* on Cricket Score!\nTeam Code: *${t.code}*\nUse this code to connect and play matches with us!`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  return (
    <div className="space-y-3.5 sm:space-y-4">
      {/* 🔴 Active Live Match Banner (Top Priority for Quick Scoring) */}
      {liveMatch && (
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 p-3.5 sm:p-4 text-white shadow-md border border-red-400/40">
          <div className="pointer-events-none absolute -right-6 -bottom-6 h-24 w-24 rounded-full bg-white/10 blur-xl" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
                </span>
                <span className="text-[10.5px] font-black uppercase tracking-wider text-red-100 flex items-center gap-1">
                  <span>LIVE MATCH IN PROGRESS</span>
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black tracking-tight">{liveMatch.name}</h3>
              <p className="text-xs text-red-100 font-medium">
                {liveMatch.homeTeam?.name} vs {liveMatch.awayTeam?.name} · {liveMatch.format || 'Standard'}
              </p>
            </div>

            <Link
              to={`/matches/${liveMatch.id}`}
              className="btn bg-white text-red-700 hover:bg-red-50 font-black text-xs sm:text-sm !py-2 !px-4 rounded-xl shadow-md flex items-center justify-center gap-1.5 shrink-0 self-stretch sm:self-auto"
            >
              <Radio className="h-4 w-4 text-red-600 animate-pulse" />
              <span>{isViewer ? 'Watch Live Score' : 'Update Live Score'}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      )}

      {/* 🛡️ My Team Showcase Banner */}
      {myTeam ? (
        <section className="rounded-2xl bg-gradient-to-br from-navy-950 via-navy-900 to-navy-850 p-3.5 sm:p-4 text-white shadow-md border border-navy-700/60 relative overflow-hidden">
          <div className="pointer-events-none absolute -right-6 -bottom-6 h-28 w-28 rounded-full bg-pitch-500/10 blur-2xl" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <TeamLogo team={myTeam} size="md" className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl border-2 border-pitch-400/40 shadow-sm shrink-0" />
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-xl font-black tracking-tight text-white truncate">{myTeam.name}</h2>
                  <span className="badge bg-emerald-500/20 text-emerald-300 text-[9.5px] font-bold uppercase tracking-wider py-0.2 px-1.5 border border-emerald-500/30 rounded">
                    Your Team
                  </span>
                </div>
                <div className="text-[11px] text-slate-300 mt-0.5 flex items-center gap-2 flex-wrap">
                  {myTeam.location && <span>📍 {myTeam.location}</span>}
                  {myTeam.ballType && <span>🏏 {myTeam.ballType}</span>}
                  <span>👥 {record.playerCount || 11} players</span>
                </div>

                {myTeam.code && (
                  <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">Code:</span>
                    <button
                      type="button"
                      onClick={() => copyCode(myTeam.code)}
                      className="inline-flex items-center gap-1 rounded-md bg-navy-800/90 hover:bg-navy-750 px-2 py-0.5 text-[11px] font-mono font-bold text-pitch-300 border border-pitch-500/30 transition shadow-2xs"
                      title="Click to copy team code"
                    >
                      <span>{myTeam.code}</span>
                      {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3 text-slate-400" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => shareTeamCodeWhatsApp(myTeam)}
                      className="text-pitch-400 hover:text-pitch-200 transition p-0.5"
                      title="Share on WhatsApp"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Action buttons */}
            <div className="flex flex-wrap items-center gap-1.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/10">
              <Link
                to={`/teams/${myTeam.id}`}
                className="btn btn-outline text-xs !py-1.5 !px-3 font-bold text-white border-slate-600 hover:bg-navy-800"
              >
                <Users className="h-3.5 w-3.5 mr-1" /> Squad
              </Link>
              {!isViewer && data.can?.createMatch && (
                <Link
                  to="/matches/new"
                  className="btn btn-green bg-emerald-600 hover:bg-emerald-700 text-white text-xs !py-1.5 !px-3 font-bold shadow-xs flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> Start Match
                </Link>
              )}
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-2xl bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 p-4 sm:p-5 text-white shadow-sm border border-navy-700/60">
          <div className="max-w-xl space-y-2">
            <h2 className="text-lg sm:text-xl font-bold tracking-tight">Welcome, {user?.name}!</h2>
            <p className="text-xs text-slate-300">
              Create your club squad, connect with opponent teams and start live scoring matches.
            </p>
            {data.can?.createTeam && (
              <Link to="/teams/new" className="btn btn-green bg-emerald-600 hover:bg-emerald-700 text-white mt-1.5 !py-1.5 !px-3.5 font-bold shadow-xs inline-flex items-center gap-1.5 text-xs">
                <Plus className="h-3.5 w-3.5" /> Create Your Team
              </Link>
            )}
          </div>
        </section>
      )}

      {/* 🚀 Quick Action Shortcuts Dock (Mobile-First 4 Pills) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {!isViewer && data.can?.createMatch && (
          <Link
            to="/matches/new"
            className="card p-2.5 flex items-center gap-2.5 border border-emerald-200/80 bg-gradient-to-r from-emerald-50/60 to-white hover:border-emerald-400 shadow-2xs transition"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-2xs">
              <Trophy className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 truncate">New Match</div>
              <div className="text-[9.5px] text-slate-500">Live Scoring</div>
            </div>
          </Link>
        )}

        {myTeam && (
          <Link
            to={`/teams/${myTeam.id}`}
            className="card p-2.5 flex items-center gap-2.5 border border-blue-200/80 bg-gradient-to-r from-blue-50/60 to-white hover:border-blue-400 shadow-2xs transition"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-2xs">
              <Shield className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 truncate">My Squad</div>
              <div className="text-[9.5px] text-slate-500">{record.playerCount || 11} Players</div>
            </div>
          </Link>
        )}

        <Link
          to="/teams?add=opponent"
          className="card p-2.5 flex items-center gap-2.5 border border-indigo-200/80 bg-gradient-to-r from-indigo-50/60 to-white hover:border-indigo-400 shadow-2xs transition"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-2xs">
            <Handshake className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-900 truncate">Add Opponent</div>
            <div className="text-[9.5px] text-slate-500">Team Code</div>
          </div>
        </Link>

        <Link
          to="/tournaments"
          className="card p-2.5 flex items-center gap-2.5 border border-amber-200/80 bg-gradient-to-r from-amber-50/60 to-white hover:border-amber-400 shadow-2xs transition"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white shadow-2xs">
            <Medal className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-900 truncate">Tournaments</div>
            <div className="text-[9.5px] text-slate-500">Cups & Brackets</div>
          </div>
        </Link>
      </div>

      {/* 📊 Team Performance Stats Grid */}
      {myTeam && (
        <section className="grid grid-cols-2 gap-2 sm:gap-2.5 md:grid-cols-4" aria-label="Team stats">
          <Stat
            icon={Users}
            label="Squad Strength"
            value={`${record.playerCount || 11}`}
            sub="Active squad"
            tone="bg-purple-100 text-purple-700"
            borderTone="border-purple-200/60"
          />
          <Stat
            icon={Trophy}
            label="Matches Played"
            value={record.played || 0}
            sub="Total outings"
            tone="bg-blue-100 text-blue-700"
            borderTone="border-blue-200/60"
          />
          <Stat
            icon={CheckCircle2}
            label="Victories"
            value={record.won || 0}
            sub={`${record.lost || 0} Lost · ${record.tied || 0} Tied`}
            tone="bg-emerald-100 text-emerald-700"
            borderTone="border-emerald-200/60"
          />
          <Stat
            icon={Flame}
            label="Win Ratio"
            value={`${record.winRate || 0}%`}
            sub={record.played > 0 ? `${record.won}/${record.played} games` : 'No games yet'}
            tone="bg-amber-100 text-amber-700"
            borderTone="border-amber-200/60"
          />
        </section>
      )}

      {/* 🏏 Two Columns: Recent Matches & Connected Opponents */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Matches Section */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
              <Trophy className="h-4 w-4 text-emerald-600" />
              <span>Recent Matches</span>
            </h2>
            <Link to="/matches" className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-0.5">
              View All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {data.recentMatches.length === 0 ? (
            <Empty
              icon={Trophy}
              title="No matches recorded yet"
              text="Start scoring a live match with your squad or opponent."
              action={
                !isViewer && data.can?.createMatch ? (
                  <Link to="/matches/new" className="btn btn-green bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs">
                    <Plus className="h-3.5 w-3.5 mr-1" /> Start New Match
                  </Link>
                ) : null
              }
            />
          ) : (
            <ul className="space-y-2">
              {data.recentMatches.map((m) => {
                const isLive = m.status === 'live';
                const isCompleted = m.status === 'completed';
                const borderAccent = isLive
                  ? 'border-2 border-red-400/90 bg-gradient-to-r from-red-50/50 to-white'
                  : isCompleted
                  ? 'border border-slate-200/90 bg-white hover:border-emerald-300'
                  : 'border border-slate-200/90 bg-white hover:border-blue-300';

                return (
                  <li key={m.id}>
                    <Link to={`/matches/${m.id}`} className={`card block p-3 transition shadow-2xs hover:shadow-xs rounded-xl ${borderAccent}`}>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">{m.name}</span>
                        <StatusBadge status={m.status} />
                      </div>
                      <MatchScoreLine match={m} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Opponents Section */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
              <Handshake className="h-4 w-4 text-blue-600" />
              <span>Opponent Teams</span>
            </h2>
            <div className="flex items-center gap-2">
              {myTeam && !isViewer && (
                <Link to="/teams?add=opponent" className="btn btn-primary text-xs !py-1 !px-2 font-bold shadow-2xs">
                  <Plus className="h-3.5 w-3.5" /> Add
                </Link>
              )}
              <Link to="/teams" className="text-[11px] font-bold text-blue-700 hover:text-blue-900 flex items-center gap-0.5">
                View All <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {(data.recentOpponents || []).length === 0 ? (
            <Empty
              icon={Handshake}
              title="No opponents connected yet"
              text={myTeam ? "Connect with rival clubs using their 6-character team code to play matches." : "Create your team first to connect with opponents."}
              action={
                myTeam && !isViewer ? (
                  <Link to="/teams?add=opponent" className="btn btn-primary text-xs !py-1.5 !px-3 font-bold">
                    <Handshake className="h-3.5 w-3.5 mr-1" /> Add Opponent
                  </Link>
                ) : null
              }
            />
          ) : (
            <ul className="space-y-2">
              {data.recentOpponents.map((tm) => (
                <li key={tm.id}>
                  <div className="card flex items-center justify-between gap-2.5 p-2.5 border border-blue-200/80 bg-gradient-to-r from-blue-50/40 via-white to-white shadow-2xs rounded-xl hover:border-blue-300 transition">
                    <Link to={`/teams/${tm.id}`} className="flex items-center gap-2.5 min-w-0 flex-1">
                      <TeamLogo team={tm} size={36} />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs sm:text-sm font-bold text-blue-950 flex items-center gap-1.5 truncate">
                          <span>{tm.name}</span>
                          <span className="badge bg-blue-100 text-blue-700 text-[9px] font-bold py-0.2 px-1 rounded shrink-0">Opponent</span>
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">
                          {tm.playerCount} Players{tm.location ? ` · ${tm.location}` : ''}
                        </div>
                      </div>
                    </Link>

                    {myTeam && !isViewer && (
                      <Link
                        to={`/matches/new?home=${myTeam.id}&away=${tm.id}`}
                        className="btn btn-green text-[10px] sm:text-xs !py-1 !px-2.5 font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs shrink-0 flex items-center gap-1"
                        title="Play Match with this Opponent"
                      >
                        <Trophy className="h-3 w-3" /> Play
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

// Full Admin Dashboard View (For Super Admin and Admin)
function AdminDashboardView({ data, user, t, myTeam }) {
  const totals = data.totals;
  const userInit = (user?.name || '?').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="space-y-3.5 sm:space-y-4">
      {/* Hero Welcome Banner */}
      <section className="rounded-2xl bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 p-3.5 sm:p-5 text-white shadow-md border border-navy-700/60 relative overflow-hidden">
        <div className="pointer-events-none absolute -right-6 -bottom-6 h-28 w-28 rounded-full bg-pitch-500/10 blur-2xl" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-pitch-500 to-pitch-700 text-navy-950 font-black text-base shadow-sm border border-pitch-400/30">
              {userInit}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-xl font-black tracking-tight text-white">{t('dashboard.welcome', { name: user.name })}</h2>
                <span className="badge bg-pitch-500/20 text-pitch-300 text-[9.5px] font-bold uppercase tracking-wider py-0.2 px-1.5 border border-pitch-500/30 rounded">
                  {t(`roles.${user?.role}`) || 'Admin'}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                {t('dashboard.subtitleAdmin')}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/10">
            {data.can?.createTeam && (
              <Link to="/teams/new" className="btn btn-outline text-white border-slate-600 hover:bg-navy-800 text-xs !py-1.5 !px-3 font-bold">
                <Plus className="h-3.5 w-3.5" /> {t('dashboard.createTeam')}
              </Link>
            )}
            {data.can?.createMatch && (
              <Link to="/matches/new" className="btn btn-green bg-emerald-600 hover:bg-emerald-700 text-white text-xs !py-1.5 !px-3 font-bold shadow-xs flex items-center gap-1">
                <Trophy className="h-3.5 w-3.5" /> {t('dashboard.createMatch')}
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* System Stats Counter Grid */}
      <section className="grid grid-cols-2 gap-2 sm:gap-2.5 sm:grid-cols-3 md:grid-cols-5" aria-label="Totals">
        <Stat icon={Shield} label={t('stats.totalTeams')} value={totals.teams} tone="bg-blue-100 text-blue-700" borderTone="border-blue-200/60" />
        <Stat icon={Users} label={t('stats.totalPlayers')} value={totals.players} tone="bg-purple-100 text-purple-700" borderTone="border-purple-200/60" />
        <Stat icon={Trophy} label={t('stats.totalMatches')} value={totals.matches} tone="bg-amber-100 text-amber-700" borderTone="border-amber-200/60" />
        <Stat icon={Activity} label={t('stats.liveMatches')} value={totals.live} tone="bg-red-100 text-red-700" borderTone="border-red-200/60" />
        <Stat icon={CheckCircle2} label={t('stats.completed')} value={totals.completed} tone="bg-emerald-100 text-emerald-700" borderTone="border-emerald-200/60" />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recent Matches */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs sm:text-sm font-extrabold text-slate-900">{t('dashboard.recentMatches')}</h2>
            <Link to="/matches" className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-0.5">
              {t('dashboard.viewAll')} <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {data.recentMatches.length === 0 ? (
            <Empty icon={Trophy} title={t('dashboard.noMatches')} text={t('dashboard.noMatchesText')} />
          ) : (
            <ul className="space-y-2">
              {data.recentMatches.map((m) => {
                const borderAccent =
                  m.status === 'live'
                    ? 'border-2 border-red-400 bg-gradient-to-r from-red-50/40 to-white'
                    : m.status === 'completed'
                    ? 'border border-slate-200/90 bg-white hover:border-emerald-300'
                    : 'border border-slate-200/90 bg-white hover:border-blue-300';
                return (
                  <li key={m.id}>
                    <Link to={`/matches/${m.id}`} className={`card block p-3 transition shadow-2xs hover:shadow-xs rounded-xl ${borderAccent}`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">{m.name}</span>
                        <StatusBadge status={m.status} />
                      </div>
                      <MatchScoreLine match={m} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Recent Teams */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs sm:text-sm font-extrabold text-slate-900">{t('dashboard.recentTeams')}</h2>
            <div className="flex items-center gap-2">
              {data.can?.createTeam && (
                <Link to="/teams/new" className="btn btn-green bg-emerald-600 hover:bg-emerald-700 text-white text-xs !py-1 !px-2 font-bold shadow-2xs">
                  <Plus className="h-3.5 w-3.5" /> {t('dashboard.createTeam')}
                </Link>
              )}
              <Link to="/teams" className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-0.5">
                {t('dashboard.viewAll')} <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
          {(data.recentTeams || []).length === 0 ? (
            <Empty
              icon={Shield}
              title={t('dashboard.noTeams')}
              text={t('dashboard.noTeamsText')}
              action={data.can?.createTeam ? <Link to="/teams/new" className="btn btn-green text-xs font-bold">{t('dashboard.createTeam')}</Link> : null}
            />
          ) : (
            <ul className="space-y-2">
              {data.recentTeams.map((tm) => (
                <li key={tm.id}>
                  <Link to={`/teams/${tm.id}`} className="card flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200/90 hover:border-slate-300 transition">
                    <TeamLogo team={tm} size={36} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs sm:text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                        <span className="truncate">{tm.name}</span>
                        {myTeam && tm.id === myTeam.id && (
                          <span className="badge bg-green-100 text-green-700 text-[9px] font-bold py-0.2 px-1 rounded">{t('teams.yourTeam')}</span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {tm.playerCount} {t('teams.players')}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { data, error, loading, reload } = useFetch('/stats', { poll: 15000 });

  const isAdmin = user?.role === 'superadmin' || user?.role === 'admin';
  const isViewer = user?.role === 'viewer';

  // Role-based page title
  const pageTitle = isAdmin ? t('nav.overview') : t('nav.home');
  document.title = `${pageTitle} · Cricket Score`;

  // Show individual section skeletons while loading data initially
  if (loading && !data) {
    return <DashboardSkeleton isAdmin={isAdmin} />;
  }

  if (error && !data) {
    return <ErrorBox message={error} onRetry={reload} />;
  }

  const myTeam = data?.myTeam || data?.mine?.myTeam;

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Page Heading */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base sm:text-lg font-black text-slate-900 leading-tight tracking-tight">{pageTitle}</h1>
          <p className="text-[10px] sm:text-[11px] text-slate-500">Cricket match center & live score hub</p>
        </div>
      </div>

      {isAdmin ? (
        <AdminDashboardView data={data} user={user} t={t} myTeam={myTeam} />
      ) : (
        <UserHomeView data={data} user={user} myTeam={myTeam} t={t} isViewer={isViewer} />
      )}
    </div>
  );
}
