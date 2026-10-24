import { useState } from 'react';
import { BarChart2, TrendingUp, ShieldAlert, Award, ChevronRight } from 'lucide-react';
import { teamOf } from './ScoreParts.jsx';

export function OverBarChart({ view }) {
  const [activeInnIndex, setActiveInnIndex] = useState(0);
  const [chartMode, setChartMode] = useState('bars'); // 'bars' | 'worm'
  const [selectedOver, setSelectedOver] = useState(null);

  if (!view || !view.innings || !view.innings.length) {
    return null;
  }

  const inningsList = view.innings.filter((i) => i.state && i.state.overSummary && i.state.overSummary.length > 0);
  if (!inningsList.length) {
    return (
      <div className="card p-6 text-center text-slate-500">
        <BarChart2 className="mx-auto mb-2 h-8 w-8 text-slate-300" />
        <p className="text-sm">No over data available yet.</p>
      </div>
    );
  }

  const currentInn = inningsList[Math.min(activeInnIndex, inningsList.length - 1)] || inningsList[0];
  const currentTeam = teamOf(view, currentInn.battingTeam);
  const overs = currentInn.state.overSummary || [];

  // Metrics for current innings
  const maxOverRuns = Math.max(12, ...overs.map((o) => o.runs || 0));
  const highestOver = overs.reduce((max, o) => (o.runs > (max?.runs || 0) ? o : max), null);
  const totalWickets = overs.reduce((sum, o) => sum + (o.wickets || 0), 0);
  const maidenOvers = overs.filter((o) => o.runs === 0 && o.legalBalls >= 6).length;

  // Calculate cumulative runs for Worm chart
  const getCumulativeData = (inn) => {
    let cumRuns = 0;
    let cumWkts = 0;
    return (inn.state.overSummary || []).map((o) => {
      cumRuns += o.runs || 0;
      cumWkts += o.wickets || 0;
      return {
        over: o.number,
        runs: cumRuns,
        wickets: cumWkts,
        overRuns: o.runs,
        bowler: o.bowlerName,
      };
    });
  };

  const activeCum = getCumulativeData(currentInn);

  return (
    <section className="card p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-4">
      {/* Header & Innings Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-pitch-50 text-pitch-700">
            {chartMode === 'bars' ? <BarChart2 className="h-5 w-5" /> : <TrendingUp className="h-5 w-5" />}
          </div>
          <div>
            <h2 className="font-bold text-slate-900 text-sm sm:text-base">Over-by-Over Analysis</h2>
            <p className="text-xs text-slate-500">Run rate, wickets & over momentum</p>
          </div>
        </div>

        {/* Controls: Mode Switcher & Innings Selector */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Innings selector buttons */}
          {inningsList.length > 1 && (
            <div className="flex rounded-lg bg-slate-100 p-1">
              {inningsList.map((inn, idx) => {
                const team = teamOf(view, inn.battingTeam);
                return (
                  <button
                    key={inn.id}
                    onClick={() => {
                      setActiveInnIndex(idx);
                      setSelectedOver(null);
                    }}
                    className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                      activeInnIndex === idx
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {team.name}
                  </button>
                );
              })}
            </div>
          )}

          {/* Chart mode toggle */}
          <div className="flex rounded-lg bg-slate-100 p-1">
            <button
              onClick={() => setChartMode('bars')}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                chartMode === 'bars' ? 'bg-pitch-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart2 className="h-3.5 w-3.5" />
              <span>Bars</span>
            </button>
            <button
              onClick={() => setChartMode('worm')}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                chartMode === 'worm' ? 'bg-pitch-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Worm</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mini Stats Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
        <div className="rounded-xl bg-slate-50 border border-slate-100 p-2">
          <span className="text-slate-500 text-[11px] block">Overs Bowled</span>
          <span className="font-bold text-slate-800 text-sm">{currentInn.state.overs} ov</span>
        </div>
        <div className="rounded-xl bg-slate-50 border border-slate-100 p-2">
          <span className="text-slate-500 text-[11px] block">Run Rate</span>
          <span className="font-bold text-slate-800 text-sm">
            {currentInn.state.runRate ? currentInn.state.runRate.toFixed(2) : '-'}
          </span>
        </div>
        <div className="rounded-xl bg-slate-50 border border-slate-100 p-2">
          <span className="text-slate-500 text-[11px] block">Highest Over</span>
          <span className="font-bold text-pitch-700 text-sm">
            {highestOver ? `Ov ${highestOver.number} (${highestOver.runs}r)` : '-'}
          </span>
        </div>
        <div className="rounded-xl bg-slate-50 border border-slate-100 p-2">
          <span className="text-slate-500 text-[11px] block">Maidens / Wkts</span>
          <span className="font-bold text-slate-800 text-sm">
            {maidenOvers}M / {totalWickets}W
          </span>
        </div>
      </div>

      {/* CHART CONTENT */}
      {chartMode === 'bars' ? (
        /* ============ OVER BY OVER BAR CHART ============ */
        <div className="space-y-3">
          {/* Scrollable Bar Container */}
          <div className="overflow-x-auto pb-2 pt-6">
            <div
              className="flex items-end gap-2.5 sm:gap-3 px-2"
              style={{ minWidth: `${Math.max(overs.length * 48, 280)}px`, height: '180px' }}
            >
              {overs.map((over) => {
                const runs = over.runs || 0;
                const wkts = over.wickets || 0;
                // Height percentage: min 10% for 0 runs so bar is clickable/visible
                const heightPercent = runs === 0 ? 8 : Math.max(15, Math.round((runs / maxOverRuns) * 85));
                const isSelected = selectedOver?.number === over.number;

                // Color tones
                let barColor = 'bg-blue-500 hover:bg-blue-600';
                if (runs >= 15) barColor = 'bg-rose-500 hover:bg-rose-600';
                else if (runs >= 10) barColor = 'bg-amber-500 hover:bg-amber-600';
                else if (runs === 0) barColor = 'bg-slate-200 hover:bg-slate-300';
                else barColor = 'bg-pitch-600 hover:bg-pitch-700';

                return (
                  <div
                    key={over.number}
                    onClick={() => setSelectedOver(over)}
                    className="flex-1 flex flex-col items-center justify-end h-full cursor-pointer group"
                    title={`Over ${over.number}: ${runs} runs, ${wkts} wkts (${over.bowlerName || 'Bowler'})`}
                  >
                    {/* Top markers: Wicket badge and runs */}
                    <div className="flex flex-col items-center mb-1 transition group-hover:scale-110">
                      {wkts > 0 && (
                        <span className="mb-0.5 inline-flex items-center justify-center rounded-full bg-red-600 text-white font-black text-[10px] px-1.5 py-0.2 shadow-2xs ring-1 ring-white">
                          {wkts === 1 ? 'W' : `${wkts}W`}
                        </span>
                      )}
                      <span className={`text-[11px] font-bold ${runs >= 12 ? 'text-amber-700' : 'text-slate-700'}`}>
                        {runs}
                      </span>
                    </div>

                    {/* Bar */}
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full max-w-[32px] rounded-t-md transition-all duration-200 ${barColor} ${
                        isSelected ? 'ring-2 ring-slate-900 ring-offset-2' : ''
                      }`}
                    />

                    {/* Over Number and bowler */}
                    <div className="mt-2 text-center">
                      <span className="text-[11px] font-bold text-slate-800 block">O{over.number}</span>
                      <span className="text-[9px] text-slate-400 block truncate max-w-[42px]">
                        {over.bowlerName ? over.bowlerName.split(' ')[0] : ''}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2 text-[11px] text-slate-600 border-t border-slate-100">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded bg-pitch-600" />
              <span>Standard (1-9)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded bg-amber-500" />
              <span>10+ Runs</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded bg-rose-500" />
              <span>15+ Big Over</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-red-600 text-white font-bold text-[9px]">W</span>
              <span>Wicket Fallen</span>
            </div>
          </div>

          {/* Selected Over Detail Drawer */}
          {selectedOver && (
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 animate-in fade-in transition duration-150">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm">Over {selectedOver.number} Breakdown</span>
                  <span className="badge bg-slate-200 text-slate-700 text-xs">
                    {selectedOver.bowlerName || 'Bowler'}
                  </span>
                </div>
                <span className="text-xs font-bold text-slate-700">
                  {selectedOver.runs} Runs · {selectedOver.wickets || 0} Wickets
                </span>
              </div>

              {/* Delivery Balls */}
              {selectedOver.balls && selectedOver.balls.length > 0 ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  {selectedOver.balls.map((b, idx) => {
                    const isWicket = b.includes('W') && !b.startsWith('Wd');
                    const isBoundary = b === '4' || b === '6';
                    return (
                      <span
                        key={idx}
                        className={`flex h-7 min-w-7 items-center justify-center rounded-full px-1.5 text-xs font-bold shadow-2xs ${
                          isWicket
                            ? 'bg-red-600 text-white'
                            : isBoundary
                            ? 'bg-blue-600 text-white'
                            : /^(Wd|Nb)/.test(b)
                            ? 'bg-amber-400 text-amber-950'
                            : 'bg-white text-slate-800 border border-slate-200'
                        }`}
                      >
                        {b}
                      </span>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-500">Ball-by-ball details not recorded for this over.</p>
              )}
            </div>
          )}
        </div>
      ) : (
        /* ============ WORM / PROGRESSION CHART ============ */
        <div className="space-y-3">
          <div className="text-xs text-slate-500 flex items-center justify-between">
            <span>Cumulative Score Progression</span>
            <span>Final: {currentInn.state.runs}/{currentInn.state.wickets} ({currentInn.state.overs} ov)</span>
          </div>

          {/* SVG Worm Line */}
          <div className="overflow-x-auto pb-2">
            <svg
              className="w-full min-w-[320px] h-48 bg-slate-50/60 rounded-xl p-2 border border-slate-100"
              viewBox="0 0 500 180"
              preserveAspectRatio="none"
            >
              {/* Grid Lines */}
              <line x1="40" y1="20" x2="490" y2="20" stroke="#e2e8f0" strokeDasharray="3 3" />
              <line x1="40" y1="80" x2="490" y2="80" stroke="#e2e8f0" strokeDasharray="3 3" />
              <line x1="40" y1="140" x2="490" y2="140" stroke="#e2e8f0" strokeDasharray="3 3" />

              {/* Y Axis Labels */}
              <text x="32" y="24" textAnchor="end" fontSize="10" fill="#94a3b8">
                {Math.round(currentInn.state.runs)}
              </text>
              <text x="32" y="84" textAnchor="end" fontSize="10" fill="#94a3b8">
                {Math.round(currentInn.state.runs / 2)}
              </text>
              <text x="32" y="144" textAnchor="end" fontSize="10" fill="#94a3b8">
                0
              </text>

              {/* Worm Progression Polyline */}
              {(() => {
                if (!activeCum.length) return null;
                const totalOvers = Math.max(activeCum.length, 1);
                const maxScore = Math.max(currentInn.state.runs, 20);

                const getCoord = (item, index) => {
                  const x = 50 + (index / (totalOvers - 1 || 1)) * 430;
                  const y = 140 - (item.runs / maxScore) * 120;
                  return { x, y };
                };

                const points = activeCum.map((item, idx) => {
                  const { x, y } = getCoord(item, idx);
                  return `${x},${y}`;
                }).join(' ');

                return (
                  <g>
                    {/* Shaded Area */}
                    <polygon
                      points={`50,140 ${points} ${getCoord(activeCum[activeCum.length - 1], activeCum.length - 1).x},140`}
                      fill="url(#wormGradient)"
                      opacity="0.25"
                    />
                    <defs>
                      <linearGradient id="wormGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#16a34a" />
                        <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                      </linearGradient>
                    </defs>

                    {/* Main Line */}
                    <polyline
                      fill="none"
                      stroke="#16a34a"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={points}
                    />

                    {/* Over Points & Wicket Markers */}
                    {activeCum.map((item, idx) => {
                      const { x, y } = getCoord(item, idx);
                      const hadWicket = (currentInn.state.overSummary[idx]?.wickets || 0) > 0;
                      return (
                        <g key={item.over}>
                          {hadWicket ? (
                            <circle cx={x} cy={y} r="5" fill="#dc2626" stroke="#ffffff" strokeWidth="2" />
                          ) : (
                            <circle cx={x} cy={y} r="3" fill="#16a34a" stroke="#ffffff" strokeWidth="1.5" />
                          )}
                        </g>
                      );
                    })}
                  </g>
                );
              })()}
            </svg>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
            <span>● Green dots: End of Over</span>
            <span className="text-red-600 font-semibold">● Red dot: Wicket fell</span>
          </div>
        </div>
      )}
    </section>
  );
}
