import { Link } from 'react-router-dom';
import { ChevronRight, Shield, Trophy, Users, Activity, CheckCircle2, Plus, Pencil } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useFetch } from '../useFetch.js';
import { Empty, ErrorBox, Spinner, StatusBadge, TeamLogo } from '../components/ui.jsx';
import { MatchScoreLine } from './Matches.jsx';

const Stat = ({ icon: Icon, label, value, tone }) => (
  <div className="card flex items-center gap-3 p-4">
    <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${tone}`}><Icon className="h-5 w-5" aria-hidden /></div>
    <div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  </div>
);

function GetStarted({ mine }) {
  const steps = [
    { done: mine.teams > 0, title: mine.teams > 0 ? 'Team created' : 'Create your team', text: mine.teams > 0 ? 'Update players, squad or details anytime.' : 'Give it a name and add at least 11 players.', to: mine.teams > 0 && mine.myTeam ? `/teams/${mine.myTeam.id}/edit` : '/teams/new', cta: mine.teams > 0 ? 'Update team' : 'Create team' },
    { done: mine.matches > 0, title: 'Create a match', text: 'Choose your team, the opponent, the overs and who won the toss.', to: '/matches/new', cta: 'Create match' },
    { done: false, title: 'Start the match and score it', text: 'Open the match, pick the playing 11 for both teams and tap Start Match.', to: '/matches', cta: 'Open my matches' },
  ];
  const next = steps.findIndex((x) => !x.done);
  return (
    <section className="card p-4" aria-label="Get started">
      <h2 className="font-bold text-slate-900">Get started in 3 steps</h2>
      <ol className="mt-3 space-y-3">
        {steps.map((st, i) => (
          <li key={st.title} className={`flex items-start gap-3 rounded-lg p-2 ${i === next ? 'bg-blue-50 ring-1 ring-blue-200' : ''}`}>
            <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${st.done ? 'bg-pitch-600 text-white' : 'bg-slate-200 text-slate-700'}`}>{st.done ? '✓' : i + 1}</span>
            <div className="flex-1">
              <p className={`text-sm font-semibold ${st.done ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{st.title}</p>
              <p className="text-xs text-slate-500">{st.text}</p>
              {i === next && <Link to={st.to} className="btn btn-primary mt-2 !py-1.5">{st.cta}</Link>}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data, error, loading, reload } = useFetch('/stats', { poll: 15000 });
  if (loading) return <Spinner />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  const t = data.totals;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-gradient-to-br from-navy-900 to-navy-700 p-6 text-white shadow">
        <h1 className="text-2xl font-bold">Welcome, {user.name}</h1>
        <p className="text-sm text-slate-300">Manage your teams and matches</p>
        {(data.can.createTeam || data.can.createMatch || data.mine?.myTeam) && (
          <div className="mt-4 flex flex-wrap gap-3">
            {data.can.createTeam ? (
              <Link to="/teams/new" className="btn btn-green"><Plus className="h-4 w-4" /> Create Team</Link>
            ) : data.mine?.myTeam ? (
              <Link to={`/teams/${data.mine.myTeam.id}/edit`} className="btn btn-outline border-white text-white hover:bg-white/10"><Pencil className="h-4 w-4" /> Update Team</Link>
            ) : null}
            {data.can.createMatch && <Link to="/matches/new" className="btn btn-primary"><Trophy className="h-4 w-4" /> Create Match</Link>}
          </div>
        )}
      </section>

      {data.mine && data.mine.matches === 0 && <GetStarted mine={data.mine} />}

      <section className="grid grid-cols-2 gap-3 md:grid-cols-5" aria-label="Totals">
        <Stat icon={Shield} label="Total Teams" value={t.teams} tone="bg-blue-100 text-blue-700" />
        <Stat icon={Users} label="Total Players" value={t.players} tone="bg-purple-100 text-purple-700" />
        <Stat icon={Trophy} label="Total Matches" value={t.matches} tone="bg-amber-100 text-amber-700" />
        <Stat icon={Activity} label="Live Matches" value={t.live} tone="bg-red-100 text-red-700" />
        <Stat icon={CheckCircle2} label="Completed Matches" value={t.completed} tone="bg-green-100 text-green-700" />
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
            <ul className="space-y-2">
              {data.recentMatches.map((m) => (
                <li key={m.id}>
                  <Link to={`/matches/${m.id}`} className="card block p-3 hover:ring-blue-300">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-900">{m.name}</span>
                      <StatusBadge status={m.status} />
                    </div>
                    <MatchScoreLine match={m} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-bold text-slate-900">Recent Teams</h2>
            <Link to="/teams" className="text-sm font-semibold text-blue-600 hover:underline">View all</Link>
          </div>
          {data.recentTeams.length === 0 ? (
            <Empty icon={Shield} title="No teams yet" text="Create your first team with 11 players." action={data.can.createTeam && <Link to="/teams/new" className="btn btn-green">Create Team</Link>} />
          ) : (
            <ul className="space-y-2">
              {data.recentTeams.map((tm) => (
                <li key={tm.id}>
                  <Link to={`/teams/${tm.id}`} className="card flex items-center gap-3 p-3 hover:ring-blue-300">
                    <TeamLogo team={tm} />
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-slate-900">{tm.name}</div>
                      <div className="text-xs text-slate-500">{tm.playerCount} Players</div>
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
