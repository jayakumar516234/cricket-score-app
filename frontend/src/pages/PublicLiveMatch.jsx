import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Trophy, Radio, Share2, Crown, ArrowRight, Shield } from 'lucide-react';
import { useFetch } from '../useFetch.js';
import { ErrorBox, Spinner, StatusBadge, TeamLogo } from '../components/ui.jsx';
import { BatTable, BowlTable, ExtrasLine, OverByOver, ScorecardTabs, teamOf } from '../components/ScoreParts.jsx';
import { WhatsAppShareButton } from '../components/WhatsAppShare.jsx';
import { OverBarChart } from '../components/OverBarChart.jsx';

export default function PublicLiveMatch() {
  const { id } = useParams();
  const [poll, setPoll] = useState(3000);
  // Unauthenticated fetch from public endpoint!
  const { data: view, error, loading, reload } = useFetch(`/matches/public/${id}`, { poll });

  useEffect(() => {
    if (view && view.match?.status === 'completed') {
      setPoll(0); // Stop polling when finished
    }
  }, [view?.match?.status]);

  if (loading && !view) return <Spinner label="Connecting to Live Cricket Arena..." />;
  if (error) return (
    <div className="max-w-md mx-auto p-4 space-y-3 text-center">
      <ErrorBox message={error} onRetry={reload} />
      <Link to="/" className="btn btn-outline">Go to Home</Link>
    </div>
  );

  const { match } = view;
  const inn = view.innings?.[match.currentInnings - 1] || view.innings?.[0];
  const st = inn?.state;
  const batting = inn ? teamOf(view, inn.battingTeam) : match.homeTeam;
  const bowling = inn ? teamOf(view, inn.bowlingTeam) : match.awayTeam;

  const atCrease = st?.battingCard?.filter((b) => !b.out && (b.id === st.striker || b.id === st.nonStriker)) || [];
  const rrr = st?.target != null && st?.ballsRemaining > 0 ? ((st.runsRequired / st.ballsRemaining) * 6).toFixed(2) : null;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-12">
      {/* Top Fan Banner */}
      <header className="sticky top-0 z-40 bg-navy-950 text-white shadow-md border-b border-navy-800">
        <div className="max-w-2xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-red-500 animate-ping" />
            <span className="text-xs font-black uppercase tracking-wider text-red-400">
              {match.status === 'live' ? 'LIVE FAN VIEW' : match.status === 'completed' ? 'MATCH FINISHED' : 'MATCH CENTER'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              <span>Login Scorer</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-3 sm:p-4 space-y-4">
        {/* Match Header */}
        <section className="card p-3.5 flex items-center justify-between gap-2 shadow-xs">
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 truncate">
              {match.homeTeam.name} vs {match.awayTeam.name}
            </h1>
            <p className="text-xs text-slate-500">
              {match.format} · {match.overs} Overs{match.venue ? ` · ${match.venue}` : ''}
            </p>
          </div>
          <StatusBadge status={match.status} />
        </section>

        {/* Live Score Stadium Card */}
        {st && match.status === 'live' && (
          <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 text-white shadow-lg border border-navy-700/60">
            <div className="flex items-center justify-between bg-navy-950/80 px-4 py-2 text-xs border-b border-white/10">
              <span className="text-slate-300">Innings {inn.number} · {bowling.name} bowling</span>
              <span className="badge bg-red-600 text-white font-bold">
                <span className="mr-1 h-1.5 w-1.5 animate-pulse rounded-full bg-white" />LIVE
              </span>
            </div>

            <div className="p-4 sm:p-5 space-y-4">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <TeamLogo team={batting} size={28} />
                    <h2 className="text-lg font-bold text-white">{batting.name}</h2>
                  </div>
                  <p className="mt-1 text-4xl sm:text-5xl font-black text-white tracking-tight">
                    {st.runs}/{st.wickets}
                    <span className="text-base sm:text-lg font-normal text-slate-300 ml-2">
                      ({st.overs} ov)
                    </span>
                  </p>
                </div>

                <div className="text-right text-xs sm:text-sm text-slate-300">
                  <p className="text-sm sm:text-base font-bold text-white">
                    Over {Math.min(st.currentOver + 1, st.maxOvers)} of {st.maxOvers}
                  </p>
                  <p>Run rate: <span className="font-semibold text-white">{st.runRate.toFixed(2)}</span></p>
                  <p>{st.ballsRemaining} balls left</p>
                </div>
              </div>

              {/* Target calculation if Innings 2 */}
              {st.target != null && (
                <div className="rounded-xl bg-white/10 p-3 text-xs sm:text-sm border border-white/10 flex items-center justify-between flex-wrap gap-2">
                  <span>Target: <strong className="text-white">{st.target} runs</strong></span>
                  <span className="font-bold text-pitch-300">
                    Need {st.runsRequired} runs in {st.ballsRemaining} balls
                  </span>
                  {rrr && <span className="text-slate-300">RRR: <strong className="text-white">{rrr}</strong></span>}
                </div>
              )}

              {/* Batters at Crease */}
              {atCrease.length > 0 && <BatTable dark state={{ ...st, battingCard: atCrease }} />}
              {/* Active Bowler */}
              <BowlTable dark state={{ ...st, bowlingCard: st.bowlingCard.filter((b) => b.id === st.bowler || st.bowlingCard.length <= 1) }} />
              {/* Extras & Over by over */}
              <ExtrasLine dark state={st} />
              <OverByOver dark state={st} />
            </div>
          </section>
        )}

        {/* If match is completed, show Winner Banner */}
        {match.status === 'completed' && match.result && (
          <section className="card p-5 text-center bg-gradient-to-b from-navy-950 to-navy-900 text-white rounded-2xl shadow-md border border-navy-700">
            <Trophy className="mx-auto h-12 w-12 text-amber-400" />
            <h2 className="text-xl sm:text-2xl font-black mt-2 text-white">
              {match.result.summary}
            </h2>
            {match.playerOfMatch && (
              <p className="mt-2 text-sm text-amber-300 font-bold flex items-center justify-center gap-1.5">
                <Crown className="h-4 w-4" /> Player of the Match: {match.playerOfMatch.name}
              </p>
            )}
            <div className="grid grid-cols-2 gap-3 mt-4">
              {[match.homeTeam, match.awayTeam].map((t) => {
                const teamInn = view.innings.find((i) => i.battingTeam === t.id);
                return (
                  <div key={t.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <p className="text-xs text-slate-300 font-semibold">{t.name}</p>
                    <p className="text-xl font-bold mt-0.5">
                      {teamInn ? `${teamInn.state.runs}/${teamInn.state.wickets}` : '-'}
                    </p>
                    <p className="text-xs text-slate-400">{teamInn ? `(${teamInn.state.overs} ov)` : ''}</p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Over Chart */}
        <OverBarChart view={view} />

        {/* WhatsApp Share Button */}
        <WhatsAppShareButton view={view} label="Share Live Score on WhatsApp" />

        {/* Full Scorecard Tabs */}
        <section className="card p-4 space-y-3">
          <h3 className="font-bold text-slate-900 text-sm">Full Scorecard & Commentary</h3>
          <ScorecardTabs view={view} />
        </section>

        {/* Footer */}
        <footer className="text-center pt-4 text-xs text-slate-500 space-y-1">
          <p>Cricket Score App · Live Stadium Match View</p>
          <p className="text-[11px] text-slate-400">Live score auto-refreshes every 3 seconds</p>
        </footer>
      </main>
    </div>
  );
}
