import { useState } from 'react';

export const teamOf = (view, id) => (view.match.homeTeam.id === id ? view.match.homeTeam : view.match.awayTeam);

export function BatTable({ state, dark }) {
  const th = dark ? 'text-slate-400' : 'text-slate-500';
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[22rem] text-left text-sm">
        <thead className={`text-xs ${th}`}>
          <tr><th className="py-1.5 pr-2">Batter</th><th className="px-2 text-right">R</th><th className="px-2 text-right">B</th><th className="px-2 text-right">4s</th><th className="px-2 text-right">6s</th><th className="pl-2 text-right">SR</th></tr>
        </thead>
        <tbody>
          {state.battingCard.map((b) => (
            <tr key={b.id} className={dark ? 'border-t border-white/10' : 'border-t border-slate-100'}>
              <td className="py-1.5 pr-2">
                <span className="font-semibold">{b.name}{b.onStrike ? '*' : ''}</span>
                <span className={`block text-xs ${th}`}>{b.dismissalText}</span>
              </td>
              <td className="px-2 text-right font-bold">{b.runs}</td>
              <td className="px-2 text-right">{b.balls}</td>
              <td className="px-2 text-right">{b.fours}</td>
              <td className="px-2 text-right">{b.sixes}</td>
              <td className="pl-2 text-right">{b.strikeRate.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function BowlTable({ state, dark }) {
  const th = dark ? 'text-slate-400' : 'text-slate-500';
  if (!state.bowlingCard.length) return <p className={`py-2 text-sm ${th}`}>No overs bowled yet.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[22rem] text-left text-sm">
        <thead className={`text-xs ${th}`}>
          <tr><th className="py-1.5 pr-2">Bowler</th><th className="px-2 text-right">O</th><th className="px-2 text-right">M</th><th className="px-2 text-right">R</th><th className="px-2 text-right">W</th><th className="pl-2 text-right">Eco</th></tr>
        </thead>
        <tbody>
          {state.bowlingCard.map((b) => (
            <tr key={b.id} className={dark ? 'border-t border-white/10' : 'border-t border-slate-100'}>
              <td className="py-1.5 pr-2 font-semibold">{b.name}{state.bowler === b.id ? '*' : ''}</td>
              <td className="px-2 text-right">{b.overs}</td>
              <td className="px-2 text-right">{b.maidens}</td>
              <td className="px-2 text-right">{b.runs}</td>
              <td className="px-2 text-right font-bold">{b.wickets}</td>
              <td className="pl-2 text-right">{b.economy.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ExtrasLine({ state, dark }) {
  const e = state.extras;
  return (
    <p className={`text-sm ${dark ? 'text-slate-300' : 'text-slate-600'}`}>
      <span className="font-semibold">Extras {e.total}</span> (wd {e.wide}, nb {e.noball}, b {e.bye}, lb {e.legbye})
    </p>
  );
}

function chipTone(l, dark) {
  if (l.includes('W') && !l.startsWith('Wd')) return 'bg-red-600 text-white';
  if (l.startsWith('Wd') && l.includes('+W')) return 'bg-red-600 text-white';
  if (l === '4') return 'bg-blue-500 text-white';
  if (l === '6') return 'bg-pitch-600 text-white';
  if (/^(Wd|Nb)/.test(l)) return 'bg-amber-400 text-amber-950';
  return dark ? 'bg-white/15 text-white' : 'bg-slate-200 text-slate-800';
}

export function BallChips({ labels, dark }) {
  if (!labels.length) return <p className={`text-sm ${dark ? 'text-slate-400' : 'text-slate-500'}`}>No balls yet</p>;
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Recent balls">
      {labels.map((l, i) => <li key={i} className={`flex h-8 min-w-8 items-center justify-center rounded-full px-1.5 text-xs font-bold ${chipTone(l, dark)}`}>{l}</li>)}
    </ul>
  );
}

/**
 * Over by over: the over being bowled now is shown big and separate, finished overs are listed
 * below it in a smaller size (most recent first).
 */
export function OverByOver({ state, dark = false }) {
  const [showAll, setShowAll] = useState(false);
  const muted = dark ? 'text-slate-400' : 'text-slate-500';
  const idx = state.currentOver;
  const overs = state.overSummary;
  const current = state.completed ? null : overs[idx] || { number: idx + 1, bowlerName: state.bowlerName, runs: 0, wickets: 0, legalBalls: 0, balls: [] };
  const previous = overs.filter((o) => (state.completed ? true : o.over < idx)).slice().reverse();
  const shown = showAll ? previous : previous.slice(0, 3);
  const empties = current ? Math.max(0, 6 - current.legalBalls) : 0;

  return (
    <div className="space-y-3">
      {current && (
        <div className={`rounded-xl p-3 ${dark ? 'bg-white/10 ring-1 ring-pitch-400/60' : 'bg-green-50 ring-1 ring-green-300'}`} aria-label={`Over ${current.number}, in progress`}>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-bold">
              Over {current.number} <span className={`badge ml-1 ${dark ? 'bg-pitch-600/30 text-pitch-400' : 'bg-green-200 text-green-800'}`}>this over</span>
            </p>
            <p className={`text-xs ${muted}`}>{current.bowlerName ? `${current.bowlerName} bowling` : 'Choose the bowler'} · <span className="font-semibold">{current.runs} run{current.runs === 1 ? '' : 's'}{current.wickets ? `, ${current.wickets} wkt` : ''}</span></p>
          </div>
          <ul className="flex flex-wrap items-center gap-2" aria-label="Balls in this over">
            {current.balls.map((l, i) => <li key={i} className={`flex h-10 min-w-10 items-center justify-center rounded-full px-2 text-sm font-bold ${chipTone(l, dark)}`}>{l}</li>)}
            {Array.from({ length: empties }).map((_, i) => <li key={`e${i}`} aria-hidden className={`h-10 w-10 rounded-full border-2 border-dashed ${dark ? 'border-white/25' : 'border-slate-300'}`} />)}
          </ul>
        </div>
      )}

      {previous.length > 0 && (
        <div>
          <p className={`mb-1 text-xs font-semibold uppercase tracking-wide ${muted}`}>Previous overs</p>
          <ul>
            {shown.map((o) => (
              <li key={o.over} className={`flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm ${dark ? 'border-t border-white/10' : 'border-t border-slate-100'}`}>
                <span className="w-14 shrink-0 font-semibold">Over {o.number}</span>
                <span className={`min-w-0 flex-1 truncate text-xs ${muted}`}>{o.bowlerName}</span>
                <span className="text-xs font-semibold">{o.runs} run{o.runs === 1 ? '' : 's'}{o.wickets ? `, ${o.wickets} wkt` : ''}</span>
                <ul className="flex w-full flex-wrap gap-1 sm:w-auto">
                  {o.balls.map((l, i) => <li key={i} className={`flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-[11px] font-bold ${chipTone(l, dark)}`}>{l}</li>)}
                </ul>
              </li>
            ))}
          </ul>
          {previous.length > 3 && (
            <button type="button" onClick={() => setShowAll(!showAll)} className={`mt-1 text-xs font-semibold ${dark ? 'text-pitch-400' : 'text-blue-600'} hover:underline`}>
              {showAll ? 'Show fewer overs' : `Show all ${previous.length} overs`}
            </button>
          )}
        </div>
      )}
      {!current && previous.length === 0 && <p className={`text-sm ${muted}`}>No balls yet</p>}
    </div>
  );
}

export function InningsScorecard({ inn, teamName }) {
  const s = inn.state;
  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h3 className="font-bold text-slate-900">{teamName} innings</h3>
        <span className="text-lg font-extrabold text-slate-900">{s.runs}/{s.wickets} <span className="text-sm font-medium text-slate-500">({s.overs} ov)</span></span>
      </div>
      <BatTable state={s} />
      <ExtrasLine state={s} />
      {s.yetToBat.length > 0 && <p className="text-sm text-slate-600"><span className="font-semibold">Yet to bat:</span> {s.yetToBat.map((p) => p.name).join(', ')}</p>}
      {s.fow.length > 0 && (
        <p className="text-sm text-slate-600">
          <span className="font-semibold">Fall of wickets:</span> {s.fow.map((f) => `${f.wicket}-${f.runs} (${f.name}, ${f.over} ov)`).join(', ')}
        </p>
      )}
      <BowlTable state={s} />
    </div>
  );
}

export function Commentary({ inn, limit = 60 }) {
  const [all, setAll] = useState(false);
  const list = all ? inn.state.commentary : inn.state.commentary.slice(0, limit);
  if (!list.length) return <p className="py-4 text-sm text-slate-500">No commentary yet.</p>;
  return (
    <div>
      <ul className="divide-y divide-slate-100">
        {list.map((c) => (
          <li key={c.seq} className="flex gap-3 py-2 text-sm">
            <span className="w-9 shrink-0 font-mono text-xs text-slate-400">{c.over}</span>
            <span className={`flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full px-1 text-xs font-bold ${c.wicket ? 'bg-red-600 text-white' : c.boundary ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-700'}`}>{c.label}</span>
            <span className={c.wicket ? 'font-semibold text-red-700' : 'text-slate-700'}>{c.text}</span>
          </li>
        ))}
      </ul>
      {!all && inn.state.commentary.length > limit && <button className="btn btn-outline mt-3 w-full" onClick={() => setAll(true)}>Show all {inn.state.commentary.length} balls</button>}
    </div>
  );
}

/** Tabs: one per innings + commentary. */
export function ScorecardTabs({ view }) {
  const [tab, setTab] = useState(0);
  const [mode, setMode] = useState('card');
  if (!view.innings.length) return <p className="py-6 text-center text-sm text-slate-500">The match has not started yet.</p>;
  const inn = view.innings[Math.min(tab, view.innings.length - 1)];
  const name = teamOf(view, inn.battingTeam).name;
  return (
    <div className="card p-4">
      <div className="mb-4 flex flex-wrap gap-2" role="tablist">
        {view.innings.map((i, idx) => (
          <button key={i.id} role="tab" aria-selected={tab === idx} onClick={() => setTab(idx)} className={`btn !py-1.5 ${tab === idx ? 'btn-green' : 'btn-outline'}`}>{teamOf(view, i.battingTeam).name}</button>
        ))}
        <span className="mx-1 hidden w-px bg-slate-200 sm:block" />
        <button className={`btn !py-1.5 ${mode === 'card' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setMode('card')}>Scorecard</button>
        <button className={`btn !py-1.5 ${mode === 'comm' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setMode('comm')}>Commentary</button>
      </div>
      {mode === 'card' ? <InningsScorecard inn={inn} teamName={name} /> : <Commentary inn={inn} />}
    </div>
  );
}
