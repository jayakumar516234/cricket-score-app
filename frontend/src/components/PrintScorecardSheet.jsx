import { Trophy, Award } from 'lucide-react';
import { teamOf } from './ScoreParts.jsx';

export function PrintScorecardSheet({ view }) {
  if (!view || !view.match) return null;
  const { match, innings = [] } = view;

  return (
    <div className="hidden print:block text-black bg-white p-6 max-w-4xl mx-auto print-avoid-break text-xs">
      {/* Tournament / Match Header */}
      <div className="border-b-2 border-slate-900 pb-3 mb-4 text-center">
        <div className="text-xl font-black uppercase tracking-wider text-slate-900">
          Official Cricket Match Scoresheet
        </div>
        <div className="text-base font-bold text-slate-800 mt-1">
          {match.name || `${match.homeTeam.name} vs ${match.awayTeam.name}`}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-600 mt-1">
          {match.date && <span>📅 Date: {new Date(match.date).toLocaleDateString()}</span>}
          {match.ground && <span>📍 Venue: {match.ground}</span>}
          {match.overs && <span>⏱ Format: {match.overs} Overs Match</span>}
        </div>
      </div>

      {/* Match Result Banner */}
      <div className="border border-slate-300 rounded-lg p-3 bg-slate-50 mb-4 flex items-center justify-between">
        <div>
          <div className="text-sm font-black text-slate-900">
            {match.result ? match.result.summary : 'Match in progress / Result pending'}
          </div>
          {match.toss && (
            <div className="text-[11px] text-slate-600 mt-0.5">
              Toss: {match.toss.winnerName} won the toss and elected to {match.toss.decision}.
            </div>
          )}
        </div>
        {match.playerOfMatch && (
          <div className="text-right text-xs">
            <span className="font-bold text-slate-800 block">⭐ Player of the Match</span>
            <span className="text-slate-700">{match.playerOfMatch.name} {match.playerOfMatch.summary ? `(${match.playerOfMatch.summary})` : ''}</span>
          </div>
        )}
      </div>

      {/* Both Innings Details */}
      <div className="space-y-6">
        {innings.map((inn, idx) => {
          const team = teamOf(view, inn.battingTeam);
          const state = inn.state || {};
          const battingCard = state.battingCard || [];
          const bowlingCard = state.bowlingCard || [];
          const extras = state.extras || { total: 0, wide: 0, noball: 0, bye: 0, legbye: 0 };
          const fow = state.fow || [];

          return (
            <div key={inn.id || idx} className="border border-slate-300 rounded-lg p-3 print-avoid-break">
              {/* Innings Title & Summary */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2">
                <span className="font-black text-sm uppercase tracking-wide">
                  {idx + 1}. {team.name} Innings
                </span>
                <span className="font-black text-base">
                  {state.runs}/{state.wickets} <span className="text-xs font-normal text-slate-600">({state.overs} ov, RR: {state.runRate ? state.runRate.toFixed(2) : '-'})</span>
                </span>
              </div>

              {/* Batting Table */}
              <div className="mb-3">
                <div className="text-[11px] font-bold uppercase text-slate-700 mb-1">Batting</div>
                <table className="w-full text-left text-xs border border-slate-300">
                  <thead className="bg-slate-100 border-b border-slate-300 font-bold">
                    <tr>
                      <th className="p-1.5 border-r border-slate-300">Batter</th>
                      <th className="p-1.5 border-r border-slate-300">How Out</th>
                      <th className="p-1.5 text-right border-r border-slate-300">R</th>
                      <th className="p-1.5 text-right border-r border-slate-300">B</th>
                      <th className="p-1.5 text-right border-r border-slate-300">4s</th>
                      <th className="p-1.5 text-right border-r border-slate-300">6s</th>
                      <th className="p-1.5 text-right">SR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {battingCard.map((b) => (
                      <tr key={b.id} className="border-b border-slate-200">
                        <td className="p-1.5 font-bold border-r border-slate-200">{b.name}</td>
                        <td className="p-1.5 text-slate-600 border-r border-slate-200">{b.dismissalText || 'not out'}</td>
                        <td className="p-1.5 text-right font-black border-r border-slate-200">{b.runs}</td>
                        <td className="p-1.5 text-right border-r border-slate-200">{b.balls}</td>
                        <td className="p-1.5 text-right border-r border-slate-200">{b.fours}</td>
                        <td className="p-1.5 text-right border-r border-slate-200">{b.sixes}</td>
                        <td className="p-1.5 text-right">{b.strikeRate ? b.strikeRate.toFixed(1) : '0.0'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Extras and Fall of Wickets */}
              <div className="text-[11px] space-y-1 mb-3 bg-slate-50 p-2 rounded border border-slate-200">
                <div className="flex justify-between">
                  <span>
                    <strong>Extras: {extras.total}</strong> (wd {extras.wide}, nb {extras.noball}, b {extras.bye}, lb {extras.legbye})
                  </span>
                  <span>
                    <strong>Total: {state.runs}/{state.wickets}</strong> ({state.overs} Overs)
                  </span>
                </div>
                {fow.length > 0 && (
                  <div>
                    <strong>Fall of Wickets: </strong>
                    {fow.map((f) => `${f.wicket}-${f.runs} (${f.name}, ${f.over} ov)`).join(', ')}
                  </div>
                )}
                {state.yetToBat && state.yetToBat.length > 0 && (
                  <div>
                    <strong>Did not bat: </strong>
                    {state.yetToBat.map((p) => p.name).join(', ')}
                  </div>
                )}
              </div>

              {/* Bowling Table */}
              <div>
                <div className="text-[11px] font-bold uppercase text-slate-700 mb-1">Bowling</div>
                <table className="w-full text-left text-xs border border-slate-300">
                  <thead className="bg-slate-100 border-b border-slate-300 font-bold">
                    <tr>
                      <th className="p-1.5 border-r border-slate-300">Bowler</th>
                      <th className="p-1.5 text-right border-r border-slate-300">O</th>
                      <th className="p-1.5 text-right border-r border-slate-300">M</th>
                      <th className="p-1.5 text-right border-r border-slate-300">R</th>
                      <th className="p-1.5 text-right border-r border-slate-300">W</th>
                      <th className="p-1.5 text-right">Econ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bowlingCard.map((bw) => (
                      <tr key={bw.id} className="border-b border-slate-200">
                        <td className="p-1.5 font-bold border-r border-slate-200">{bw.name}</td>
                        <td className="p-1.5 text-right border-r border-slate-200">{bw.overs}</td>
                        <td className="p-1.5 text-right border-r border-slate-200">{bw.maidens}</td>
                        <td className="p-1.5 text-right border-r border-slate-200">{bw.runs}</td>
                        <td className="p-1.5 text-right font-black border-r border-slate-200">{bw.wickets}</td>
                        <td className="p-1.5 text-right">{bw.economy ? bw.economy.toFixed(2) : '0.00'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>

      {/* Official Signatures Box */}
      <div className="mt-8 pt-4 border-t-2 border-slate-400 print-avoid-break">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-6 text-center">
          Official Verification & Match Sign-off
        </div>
        <div className="grid grid-cols-3 gap-6 text-center text-xs">
          <div>
            <div className="border-b border-slate-400 h-8" />
            <div className="mt-1 font-semibold text-slate-800">{match.homeTeam.name} Captain</div>
          </div>
          <div>
            <div className="border-b border-slate-400 h-8" />
            <div className="mt-1 font-semibold text-slate-800">{match.awayTeam.name} Captain</div>
          </div>
          <div>
            <div className="border-b border-slate-400 h-8" />
            <div className="mt-1 font-semibold text-slate-800">Official Scorer</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-12 text-center text-xs mt-6 max-w-md mx-auto">
          <div>
            <div className="border-b border-slate-400 h-8" />
            <div className="mt-1 font-semibold text-slate-800">Main Umpire</div>
          </div>
          <div>
            <div className="border-b border-slate-400 h-8" />
            <div className="mt-1 font-semibold text-slate-800">Leg / Second Umpire</div>
          </div>
        </div>
        <div className="mt-6 text-center text-[10px] text-slate-400">
          Generated via Cricket Score App · Verified Match Record
        </div>
      </div>
    </div>
  );
}
