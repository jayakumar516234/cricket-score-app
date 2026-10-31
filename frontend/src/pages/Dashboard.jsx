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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useFetch } from '../useFetch.js';
import { Empty, ErrorBox, StatusBadge, TeamLogo } from '../components/ui.jsx';
import { MatchScoreLine } from './Matches.jsx';

function ShimmerBar({ className = '' }) {
  return <div className={`animate-pulse rounded-md bg-slate-200/90 ${className}`} />;
}

// Modern progressive skeleton loader for each section of the Dashboard
function DashboardSkeleton({ isAdmin }) {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page Title Skeleton */}
      <div className="flex items-center justify-between">
        <ShimmerBar className="h-7 w-32" />
      </div>

      {/* Hero Banner Skeleton */}
      <section className="relative overflow-hidden rounded-2xl border border-navy-800 bg-gradient-to-br from-navy-950 via-navy-900 to-navy-850 p-4 sm:p-6 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="h-14 w-14 sm:h-16 sm:w-16 shrink-0 rounded-2xl bg-navy-800/80 animate-pulse border border-navy-700/60" />
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-6 w-44 rounded-lg bg-navy-800 animate-pulse" />
                <div className="h-5 w-20 rounded-md bg-navy-800 animate-pulse" />
              </div>
              <div className="h-4 w-56 rounded-md bg-navy-800/60 animate-pulse" />
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2 sm:pt-0">
            <div className="h-9 w-28 rounded-xl bg-navy-800 animate-pulse" />
            <div className="h-9 w-28 rounded-xl bg-navy-800 animate-pulse" />
          </div>
        </div>
      </section>

      {/* Stats Counter Grid Skeleton */}
      <section className={`grid grid-cols-2 gap-2.5 sm:gap-3.5 ${isAdmin ? 'sm:grid-cols-3 md:grid-cols-5' : 'md:grid-cols-4'}`}>
        {Array.from({ length: isAdmin ? 5 : 4 }).map((_, i) => (
          <div key={i} className="card p-3 sm:p-4 border border-slate-200/80 flex items-center gap-3 shadow-xs">
            <div className="h-10 w-10 sm:h-11 sm:w-11 shrink-0 rounded-xl bg-slate-200 animate-pulse" />
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="h-6 w-14 rounded-md bg-slate-200 animate-pulse" />
              <div className="h-3 w-20 rounded-md bg-slate-200/70 animate-pulse" />
            </div>
          </div>
        ))}
      </section>

      {/* Two Columns Grid: Matches and Opponents / Teams Skeleton */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Matches Skeleton */}
        <section className="space-y-2.5">
          <div className="flex items-center justify-between">
            <ShimmerBar className="h-5 w-36" />
            <ShimmerBar className="h-4 w-16" />
          </div>
          <div className="space-y-2.5">
            {[1, 2, 3].map((k) => (
              <div key={k} className="card p-3.5 border-l-4 border-l-slate-300 border-slate-200/80 space-y-2 shadow-xs">
                <div className="flex items-center justify-between">
                  <ShimmerBar className="h-4 w-40" />
                  <ShimmerBar className="h-4 w-14 rounded-full" />
                </div>
                <div className="space-y-1.5 pt-1">
                  <ShimmerBar className="h-3.5 w-3/4" />
                  <ShimmerBar className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Recent Opponents / Teams Skeleton */}
        <section className="space-y-2.5">
          <div className="flex items-center justify-between">
            <ShimmerBar className="h-5 w-36" />
            <div className="flex items-center gap-2">
              <ShimmerBar className="h-7 w-24 rounded-lg" />
              <ShimmerBar className="h-4 w-14" />
            </div>
          </div>
          <div className="space-y-2">
            {[1, 2, 3].map((k) => (
              <div key={k} className="card p-3 flex items-center gap-3 shadow-xs">
                <div className="h-10 w-10 shrink-0 rounded-xl bg-slate-200 animate-pulse" />
                <div className="flex-1 space-y-1.5 min-w-0">
                  <ShimmerBar className="h-4 w-32" />
                  <ShimmerBar className="h-3 w-44" />
                </div>
                <div className="h-4 w-4 rounded-full bg-slate-200 animate-pulse shrink-0" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

const Stat = ({ icon: Icon, label, value, tone, borderTone }) => (
  <div className={`card flex items-center gap-2.5 sm:gap-3.5 p-3 sm:p-4 border ${borderTone || 'border-slate-200/80'} shadow-xs hover:shadow-sm transition`}>
    <div className={`flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl ${tone}`}>
      <Icon className="h-5 w-5" aria-hidden />
    </div>
    <div className="min-w-0">
      <div className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight leading-tight">{value}</div>
      <div className="text-[11px] sm:text-xs font-medium text-slate-500 truncate">{label}</div>
    </div>
  </div>
);

// User-specific Home View (Focuses only on My Team, Live Scoring & Opponents)
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

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Team Profile Header Card */}
      {myTeam ? (
        <section className="rounded-2xl bg-gradient-to-br from-navy-950 via-navy-900 to-navy-855 p-4 sm:p-6 text-white shadow-lg border border-navy-700/60 relative overflow-hidden">
          <div className="pointer-events-none absolute -right-6 -bottom-6 h-28 w-28 rounded-full bg-pitch-500/10 blur-2xl" />
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <TeamLogo team={myTeam} size="lg" className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl border-2 border-pitch-400/40 shadow-md shrink-0" />
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white truncate">{myTeam.name}</h2>
                  <span className="badge bg-pitch-500/20 text-pitch-300 text-[10px] font-bold uppercase tracking-wider py-0.5 px-2 border border-pitch-500/30">
                    {t(`roles.${user?.role}`) || 'Team Admin'}
                  </span>
                </div>
                <div className="text-xs sm:text-sm text-slate-300 mt-1 flex items-center gap-2 flex-wrap">
                  {myTeam.location && <span>📍 {myTeam.location}</span>}
                  {myTeam.ballType && <span>🏏 {myTeam.ballType}</span>}
                  <span>👥 {record.playerCount || 0} players</span>
                </div>
                {myTeam.code && (
                  <div className="mt-2.5 flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Team Code:</span>
                    <button
                      type="button"
                      onClick={() => copyCode(myTeam.code)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-navy-800/90 hover:bg-navy-750 px-2.5 py-1 text-xs font-mono font-bold text-pitch-300 border border-pitch-500/30 transition shadow-2xs"
                      title="Click to copy team code"
                    >
                      <span>{myTeam.code}</span>
                      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-slate-400" />}
                    </button>
                    {copied && <span className="text-[11px] text-emerald-400 font-semibold">Copied!</span>}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Action buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/10">
              <Link
                to={`/teams/${myTeam.id}`}
                className="btn text-xs sm:text-sm !py-2 !px-3.5 font-bold shadow-xs transition"
                style={{ backgroundColor: '#059669', color: '#ffffff' }}
              >
                <Users className="h-4 w-4 mr-1 text-emerald-200" /> Manage Squad
              </Link>
              {!isViewer && data.can?.createMatch && (
                <Link to="/matches/new" className="btn btn-green bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm !py-2 !px-3.5 font-bold shadow-md">
                  <Plus className="h-4 w-4 mr-1" /> New Match
                </Link>
              )}
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-2xl bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 p-5 sm:p-6 text-white shadow-md border border-navy-700/60">
          <div className="max-w-xl space-y-3">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Welcome, {user?.name}!</h2>
            <p className="text-sm text-slate-300">
              Create your team, add your 11 players, connect with opponent teams and start live scoring matches.
            </p>
            {data.can?.createTeam && (
              <Link to="/teams/new" className="btn btn-green bg-emerald-600 hover:bg-emerald-700 text-white mt-2 !py-2.5 !px-5 font-bold shadow-md">
                <Plus className="h-4 w-4" /> Create Your Team
              </Link>
            )}
          </div>
        </section>
      )}

      {/* 🔴 Active Live Match Banner (Top Priority for Quick Scoring) */}
      {liveMatch && (
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 p-4 sm:p-5 text-white shadow-lg border border-red-400/40 animate-pulse-subtle">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                </span>
                <span className="text-xs font-black uppercase tracking-wider text-red-100">
                  🔴 LIVE MATCH IN PROGRESS
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-black tracking-tight">{liveMatch.name}</h3>
              <p className="text-xs sm:text-sm text-red-100/90 font-medium">
                {liveMatch.homeTeam?.name} vs {liveMatch.awayTeam?.name}
              </p>
            </div>
            
            <Link
              to={`/matches/${liveMatch.id}`}
              className="btn bg-white text-red-700 hover:bg-red-50 font-black text-sm !py-2.5 !px-5 rounded-xl shadow-md flex items-center justify-center gap-2 shrink-0 self-stretch sm:self-auto"
            >
              <Radio className="h-4 w-4 text-red-600" />
              <span>{isViewer ? t('matches.viewScorecard', 'Watch Live Score') : t('nav.updateScore', 'Update Score')}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      )}

      {/* Team Performance Stats Grid (Strictly user's own team stats) */}
      {myTeam && (
        <section className="grid grid-cols-2 gap-2.5 sm:gap-3.5 md:grid-cols-4" aria-label="Team stats">
          <Stat icon={Users} label="Squad Size" value={`${record.playerCount || 0} Players`} tone="bg-purple-100 text-purple-700" borderTone="border-purple-200/60" />
          <Stat icon={Trophy} label="Matches Played" value={record.played || 0} tone="bg-blue-100 text-blue-700" borderTone="border-blue-200/60" />
          <Stat icon={CheckCircle2} label="Matches Won" value={record.won || 0} tone="bg-emerald-100 text-emerald-700" borderTone="border-emerald-200/60" />
          <Stat icon={Flame} label="Win Rate" value={`${record.winRate || 0}%`} tone="bg-amber-100 text-amber-700" borderTone="border-amber-200/60" />
        </section>
      )}

      {/* My Matches and My Opponents */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Matches Section */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-bold text-slate-900 flex items-center gap-2">
              <Trophy className="h-4.5 w-4.5 text-blue-600" />
              <span>{t('dashboard.recentMatches')}</span>
            </h2>
            <Link to="/matches" className="text-xs sm:text-sm font-semibold text-blue-600 hover:underline">
              {t('dashboard.viewAll')}
            </Link>
          </div>

          {data.recentMatches.length === 0 ? (
            <Empty
              icon={Trophy}
              title={t('dashboard.noMatches')}
              text={t('dashboard.noMatchesText')}
              action={
                !isViewer && data.can?.createMatch ? (
                  <Link to="/matches/new" className="btn btn-green bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md">
                    <Plus className="h-3.5 w-3.5 mr-1" /> {t('dashboard.createMatch')}
                  </Link>
                ) : null
              }
            />
          ) : (
            <ul className="space-y-2.5">
              {data.recentMatches.map((m) => {
                const borderAccent =
                  m.status === 'live'
                    ? 'border-l-4 border-l-red-500 border-red-200/80 bg-gradient-to-r from-red-50/40 to-white hover:border-red-300'
                    : m.status === 'completed'
                    ? 'border-l-4 border-l-emerald-500 border-emerald-200/70 bg-gradient-to-r from-emerald-50/25 to-white hover:border-emerald-300'
                    : 'border-l-4 border-l-blue-500 border-slate-200/80 hover:border-blue-300';
                return (
                  <li key={m.id}>
                    <Link to={`/matches/${m.id}`} className={`card block p-3.5 transition-all shadow-xs hover:shadow-md ${borderAccent}`}>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-sm font-bold text-slate-900 truncate">{m.name}</span>
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
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-bold text-slate-900 flex items-center gap-2">
              <Handshake className="h-4.5 w-4.5 text-blue-600" />
              <span>{t('dashboard.recentOpponents')}</span>
            </h2>
            <div className="flex items-center gap-2">
              {myTeam && !isViewer && (
                <Link to="/teams?add=opponent" className="btn btn-primary text-xs !py-1 !px-2.5">
                  <Plus className="h-3.5 w-3.5" /> {t('dashboard.addOpponent')}
                </Link>
              )}
              <Link to="/teams" className="text-xs sm:text-sm font-semibold text-blue-600 hover:underline">
                {t('dashboard.viewAll')}
              </Link>
            </div>
          </div>

          {(data.recentOpponents || []).length === 0 ? (
            <Empty
              icon={Handshake}
              title={t('dashboard.noOpponents')}
              text={myTeam ? t('dashboard.noOpponentsText') : t('dashboard.noOpponentsNoTeam')}
              action={
                myTeam && !isViewer ? (
                  <Link to="/teams?add=opponent" className="btn btn-primary">{t('dashboard.addOpponent')}</Link>
                ) : null
              }
            />
          ) : (
            <ul className="space-y-2">
              {data.recentOpponents.map((tm) => (
                <li key={tm.id}>
                  <Link to={`/teams/${tm.id}`} className="card flex items-center gap-3 p-3 hover:ring-blue-300">
                    <TeamLogo team={tm} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-900 flex items-center gap-2 truncate">
                        <span>{tm.name}</span>
                        <span className="badge bg-blue-100 text-blue-700 text-[10px] shrink-0">{t('teams.opponent')}</span>
                      </div>
                      <div className="text-xs text-slate-500 truncate">
                        {tm.playerCount} {t('teams.players')}{tm.location ? ` · ${tm.location}` : ''}{tm.ballType ? ` · ${tm.ballType}` : ''}
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

// Full Admin Dashboard View (For Super Admin and Admin)
function AdminDashboardView({ data, user, t, myTeam }) {
  const totals = data.totals;
  const userInit = (user?.name || '?').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Hero Welcome Banner */}
      <section className="rounded-2xl bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 p-4 sm:p-6 text-white shadow-md border border-navy-700/60 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-pitch-500 to-pitch-700 text-navy-950 font-extrabold text-lg sm:text-xl shadow-md border-2 border-pitch-400/30">
              {userInit}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight">{t('dashboard.welcome', { name: user.name })}</h2>
                <span className="badge bg-pitch-500/20 text-pitch-300 text-[10px] font-bold uppercase tracking-wider py-0.5 px-2 border border-pitch-500/30">
                  {t(`roles.${user?.role}`) || 'Admin'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
                {t('dashboard.subtitleAdmin')}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/10">
            {data.can?.createTeam && (
              <Link to="/teams/new" className="btn btn-green bg-emerald-600 hover:bg-emerald-700 text-white flex-1 sm:flex-none text-xs sm:text-sm !py-2 !px-3.5 font-bold shadow-xs">
                <Plus className="h-4 w-4" /> {t('dashboard.createTeam')}
              </Link>
            )}
            {data.can?.createMatch && (
              <Link to="/matches/new" className="btn btn-green bg-emerald-600 hover:bg-emerald-700 text-white flex-1 sm:flex-none text-xs sm:text-sm !py-2 !px-3.5 font-bold shadow-md">
                <Trophy className="h-4 w-4" /> {t('dashboard.createMatch')}
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* System Stats Counter Grid */}
      <section className="grid grid-cols-2 gap-2.5 sm:gap-3.5 sm:grid-cols-3 md:grid-cols-5" aria-label="Totals">
        <Stat icon={Shield} label={t('stats.totalTeams')} value={totals.teams} tone="bg-blue-100 text-blue-700" borderTone="border-blue-200/60" />
        <Stat icon={Users} label={t('stats.totalPlayers')} value={totals.players} tone="bg-purple-100 text-purple-700" borderTone="border-purple-200/60" />
        <Stat icon={Trophy} label={t('stats.totalMatches')} value={totals.matches} tone="bg-amber-100 text-amber-700" borderTone="border-amber-200/60" />
        <Stat icon={Activity} label={t('stats.liveMatches')} value={totals.live} tone="bg-red-100 text-red-700" borderTone="border-red-200/60" />
        <Stat icon={CheckCircle2} label={t('stats.completed')} value={totals.completed} tone="bg-emerald-100 text-emerald-700" borderTone="border-emerald-200/60" />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Matches */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-bold text-slate-900">{t('dashboard.recentMatches')}</h2>
            <Link to="/matches" className="text-sm font-semibold text-blue-600 hover:underline">{t('dashboard.viewAll')}</Link>
          </div>
          {data.recentMatches.length === 0 ? (
            <Empty icon={Trophy} title={t('dashboard.noMatches')} text={t('dashboard.noMatchesText')} />
          ) : (
            <ul className="space-y-2.5">
              {data.recentMatches.map((m) => {
                const borderAccent =
                  m.status === 'live'
                    ? 'border-l-4 border-l-red-500 border-red-200/80 bg-gradient-to-r from-red-50/40 to-white hover:border-red-300'
                    : m.status === 'completed'
                    ? 'border-l-4 border-l-emerald-500 border-emerald-200/70 bg-gradient-to-r from-emerald-50/25 to-white hover:border-emerald-300'
                    : 'border-l-4 border-l-blue-500 border-slate-200/80 hover:border-blue-300';
                return (
                  <li key={m.id}>
                    <Link to={`/matches/${m.id}`} className={`card block p-3.5 transition-all shadow-xs hover:shadow-md ${borderAccent}`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-slate-900 truncate">{m.name}</span>
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
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-bold text-slate-900">{t('dashboard.recentTeams')}</h2>
            <div className="flex items-center gap-2">
              {data.can?.createTeam && (
                <Link to="/teams/new" className="btn btn-green bg-emerald-600 hover:bg-emerald-700 text-white text-xs !py-1 !px-2.5 font-bold shadow-xs">
                  <Plus className="h-3.5 w-3.5" /> {t('dashboard.createTeam')}
                </Link>
              )}
              <Link to="/teams" className="text-sm font-semibold text-blue-600 hover:underline">{t('dashboard.viewAll')}</Link>
            </div>
          </div>
          {(data.recentTeams || []).length === 0 ? (
            <Empty
              icon={Shield}
              title={t('dashboard.noTeams')}
              text={t('dashboard.noTeamsText')}
              action={data.can?.createTeam ? <Link to="/teams/new" className="btn btn-green">{t('dashboard.createTeam')}</Link> : null}
            />
          ) : (
            <ul className="space-y-2">
              {data.recentTeams.map((tm) => (
                <li key={tm.id}>
                  <Link to={`/teams/${tm.id}`} className="card flex items-center gap-3 p-3 hover:ring-blue-300">
                    <TeamLogo team={tm} />
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                        {tm.name}
                        {myTeam && tm.id === myTeam.id && (
                          <span className="badge bg-green-100 text-green-700 text-[10px]">{t('teams.yourTeam')}</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">
                        {tm.playerCount} {t('teams.players')}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden />
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
    <div className="space-y-4 sm:space-y-6">
      {/* Page Heading */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">{pageTitle}</h1>
      </div>

      {isAdmin ? (
        <AdminDashboardView data={data} user={user} t={t} myTeam={myTeam} />
      ) : (
        <UserHomeView data={data} user={user} myTeam={myTeam} t={t} isViewer={isViewer} />
      )}
    </div>
  );
}
