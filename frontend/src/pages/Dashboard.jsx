import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, Shield, Trophy, Users, Activity, CheckCircle2, Plus, Pencil, Handshake } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useFetch } from '../useFetch.js';
import { Empty, ErrorBox, Spinner, StatusBadge, TeamLogo } from '../components/ui.jsx';
import { MatchScoreLine } from './Matches.jsx';

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

function GetStarted({ mine }) {
  const myTeamId = mine.myTeam?.id;
  const steps = [
    { done: mine.teams > 0, title: mine.teams > 0 ? 'Team created' : 'Create your team', text: mine.teams > 0 ? (mine.myTeam ? `Your team "${mine.myTeam.name}" is ready. You can update squad anytime.` : 'Update players, squad or details anytime.') : 'Give it a name and add at least 11 players.', to: mine.teams > 0 && myTeamId ? `/teams/${myTeamId}/edit` : '/teams/new', cta: mine.teams > 0 ? 'Update team' : 'Create team' },
    { done: mine.matches > 0, title: 'Create a match', text: 'Choose your team, the opponent, the overs and who won the toss.', to: '/matches/new', cta: 'Create match' },
    { done: false, title: 'Start the match and score it', text: 'Open the match, pick the playing 11 for both teams and tap Start Match.', to: '/matches', cta: 'Open my matches' },
  ];
  const next = steps.findIndex((x) => !x.done);
  return (
    <section className="card p-4 sm:p-5" aria-label="Get started">
      <h2 className="font-bold text-slate-900">Get started in 3 steps</h2>
      <ol className="mt-3 space-y-3">
        {steps.map((st, i) => (
          <li key={st.title} className={`flex items-start gap-3 rounded-xl p-3 ${i === next ? 'bg-blue-50/80 ring-1 ring-blue-300 shadow-xs' : 'bg-slate-50/60'}`}>
            <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${st.done ? 'bg-pitch-600 text-white' : 'bg-slate-200 text-slate-700'}`}>{st.done ? '✓' : i + 1}</span>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${st.done ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{st.title}</p>
              <p className="text-xs text-slate-500 mt-0.5">{st.text}</p>
              {i === next && <Link to={st.to} className="btn btn-primary mt-2 text-xs !py-1.5">{st.cta}</Link>}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default function Dashboard() {
  const nav = useNavigate();
  const { user } = useAuth();
  const { data, error, loading, reload } = useFetch('/stats', { poll: 15000 });
  if (loading) return <Spinner />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  const t = data.totals;
  const myTeam = data.myTeam || data.mine?.myTeam;
  const userInit = (user?.name || '?').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const roleLabel = user?.role === 'superadmin' ? 'Super Admin' : user?.role === 'admin' ? 'Admin' : user?.role === 'viewer' ? 'Viewer' : 'Team Admin';

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
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Welcome, {user.name}</h1>
                <span className="badge bg-pitch-500/20 text-pitch-300 text-[10px] font-bold uppercase tracking-wider py-0.5 px-2 border border-pitch-500/30">
                  {roleLabel}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-0.5">Manage your cricket teams, schedule matches and score live.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/10">
            {data.can?.createTeam ? (
              <Link to="/teams/new" className="btn btn-green flex-1 sm:flex-none text-xs sm:text-sm !py-2 !px-3.5"><Plus className="h-4 w-4" /> Create Team</Link>
            ) : myTeam ? (
              <Link to={`/teams/${myTeam.id}/edit`} className="btn btn-green flex-1 sm:flex-none text-xs sm:text-sm !py-2 !px-3.5"><Pencil className="h-4 w-4" /> Update Team</Link>
            ) : null}
            {data.can?.createMatch && (
              <Link to="/matches/new" className="btn btn-primary flex-1 sm:flex-none text-xs sm:text-sm !py-2 !px-3.5"><Trophy className="h-4 w-4" /> Create Match</Link>
            )}
          </div>
        </div>
      </section>

      {data.mine && data.mine.matches === 0 && <GetStarted mine={data.mine} />}

      {/* Stats Counter Grid */}
      <section className="grid grid-cols-2 gap-2.5 sm:gap-3.5 sm:grid-cols-3 md:grid-cols-5" aria-label="Totals">
        <Stat icon={Shield} label="Total Teams" value={t.teams} tone="bg-blue-100 text-blue-700" borderTone="border-blue-200/60" />
        <Stat icon={Users} label="Total Players" value={t.players} tone="bg-purple-100 text-purple-700" borderTone="border-purple-200/60" />
        <Stat icon={Trophy} label="Total Matches" value={t.matches} tone="bg-amber-100 text-amber-700" borderTone="border-amber-200/60" />
        <Stat icon={Activity} label="Live Matches" value={t.live} tone="bg-red-100 text-red-700" borderTone="border-red-200/60" />
        <Stat icon={CheckCircle2} label="Completed" value={t.completed} tone="bg-emerald-100 text-emerald-700" borderTone="border-emerald-200/60" />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-bold text-slate-900">Recent Matches</h2>
            <Link to="/matches" className="text-sm font-semibold text-blue-600 hover:underline">View all</Link>
          </div>
          {data.recentMatches.length === 0 ? (
            <Empty icon={Trophy} title="No matches yet" text="Matches you create will show up here." />
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
                    <Link
                      to={`/matches/${m.id}`}
                      className={`card block p-3.5 transition-all shadow-xs hover:shadow-md ${borderAccent}`}
                    >
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

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-bold text-slate-900">{user?.role === 'superadmin' || user?.role === 'admin' ? 'Recent Teams' : 'Recent Opponents'}</h2>
            <div className="flex items-center gap-2">
              {(user?.role === 'superadmin' || user?.role === 'admin') ? (
                data.can?.createTeam ? (
                  <Link to="/teams/new" className="btn btn-green text-xs !py-1 !px-2.5">
                    <Plus className="h-3.5 w-3.5" /> Create Team
                  </Link>
                ) : null
              ) : myTeam ? (
                <Link to="/teams?add=opponent" className="btn btn-primary text-xs !py-1 !px-2.5">
                  <Plus className="h-3.5 w-3.5" /> Add Opponent
                </Link>
              ) : data.can?.createTeam ? (
                <Link to="/teams/new" className="btn btn-green text-xs !py-1 !px-2.5">
                  <Plus className="h-3.5 w-3.5" /> Create Team
                </Link>
              ) : null}
              <Link to="/teams" className="text-sm font-semibold text-blue-600 hover:underline">View all</Link>
            </div>
          </div>
          {((user?.role === 'superadmin' || user?.role === 'admin') ? data.recentTeams : (data.recentOpponents || [])).length === 0 ? (
            <Empty
              icon={user?.role === 'superadmin' || user?.role === 'admin' ? Shield : Handshake}
              title={user?.role === 'superadmin' || user?.role === 'admin' ? 'No teams yet' : 'No opponents yet'}
              text={
                user?.role === 'superadmin' || user?.role === 'admin'
                  ? 'Create a team with 11 players to get started.'
                  : myTeam
                  ? 'Connect with opponent teams using their 6-character team code to play matches.'
                  : 'Create your team first to connect with opponents.'
              }
              action={
                (user?.role === 'superadmin' || user?.role === 'admin') ? (
                  data.can?.createTeam ? <Link to="/teams/new" className="btn btn-green">Create Team</Link> : null
                ) : myTeam ? (
                  <Link to="/teams?add=opponent" className="btn btn-primary">Add New Opponent</Link>
                ) : data.can?.createTeam ? (
                  <Link to="/teams/new" className="btn btn-green">Create Team</Link>
                ) : null
              }
            />
          ) : (
            <ul className="space-y-2">
              {((user?.role === 'superadmin' || user?.role === 'admin') ? data.recentTeams : data.recentOpponents).map((tm) => (
                <li key={tm.id}>
                  <Link to={`/teams/${tm.id}`} className="card flex items-center gap-3 p-3 hover:ring-blue-300">
                    <TeamLogo team={tm} />
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                        {tm.name}
                        {tm.isOpponent && (
                          <span className="badge bg-blue-100 text-blue-700 text-[10px]">Opponent</span>
                        )}
                        {(user?.role === 'superadmin' || user?.role === 'admin') && myTeam && tm.id === myTeam.id && (
                          <span className="badge bg-green-100 text-green-700 text-[10px]">Your Team</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">
                        {tm.playerCount} Players{tm.location ? ` · ${tm.location}` : ''}{tm.ballType ? ` · ${tm.ballType}` : ''}
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
