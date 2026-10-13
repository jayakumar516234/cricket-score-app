import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Crown } from 'lucide-react';
import { useFetch } from '../useFetch.js';
import { ErrorBox, Spinner, StatusBadge } from '../components/ui.jsx';
import { ScorecardTabs, teamOf } from '../components/ScoreParts.jsx';

export default function Scorecard() {
  const { id } = useParams();
  const { data: view, error, loading, reload } = useFetch(`/matches/${id}`);
  if (loading) return <Spinner />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  const { match } = view;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link to={`/matches/${id}`} className="btn btn-ghost !p-2" aria-label="Back to match"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="flex-1 text-lg font-bold text-slate-900">{match.name}</h1>
        <StatusBadge status={match.status} />
      </div>
      <section className="card grid grid-cols-2 gap-3 p-4 text-center">
        {[match.homeTeam, match.awayTeam].map((t) => {
          const inn = view.innings.find((i) => i.battingTeam === t.id);
          return (
            <div key={t.id}>
              <p className="text-sm font-semibold text-slate-700">{t.name}</p>
              <p className="text-2xl font-extrabold text-slate-900">{inn ? `${inn.state.runs}/${inn.state.wickets}` : '-'}</p>
              <p className="text-xs text-slate-500">{inn ? `(${inn.state.overs} ov)` : 'Yet to bat'}</p>
            </div>
          );
        })}
        {match.result && <p className="col-span-2 text-sm font-semibold text-pitch-700">{match.result.summary}</p>}
        {match.playerOfMatch && (
          <p className="col-span-2 flex items-center justify-center gap-1.5 text-sm text-slate-600"><Crown className="h-4 w-4 text-amber-500" aria-hidden /> Player of the Match: <span className="font-semibold">{match.playerOfMatch.name}</span>{match.playerOfMatch.summary ? ` (${match.playerOfMatch.summary})` : ''}</p>
        )}
      </section>
      <ScorecardTabs view={view} />
    </div>
  );
}
