import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Trash2, Trophy } from 'lucide-react';
import { api, qs } from '../api.js';
import { useFetch } from '../useFetch.js';
import { ConfirmDialog, Empty, ErrorBox, Pagination, Spinner, SkeletonMatchCard, StatusBadge, TeamLogo, DropdownSelect, fmtDate } from '../components/ui.jsx';

export function MatchScoreLine({ match }) {
  const sc = (teamId) => match.scores?.find((s) => s.team === teamId);
  const Side = ({ team }) => {
    const s = sc(team?.id);
    return (
      <div className="flex flex-1 items-center gap-2 min-w-0">
        <TeamLogo team={team} size={28} />
        <div className="min-w-0 flex-1">
          <div className="text-xs sm:text-sm font-bold text-slate-800 truncate">{team?.name}</div>
          <div className="text-xs font-semibold text-slate-600">
            {s ? (
              <span className="inline-flex items-center gap-1">
                <span className="font-mono text-slate-900">{s.runs}/{s.wickets}</span>
                {s.overs ? <span className="text-[10px] text-slate-400">({s.overs} ov)</span> : null}
              </span>
            ) : (
              <span className="text-slate-400 font-normal text-[11px]">Yet to bat</span>
            )}
          </div>
        </div>
      </div>
    );
  };
  return (
    <>
      <div className="mt-2.5 flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200/60">
        <Side team={match.homeTeam} />
        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-extrabold text-slate-500">VS</div>
        <Side team={match.awayTeam} />
      </div>
      {match.resultSummary && (
        <p className="mt-2 text-xs font-bold text-pitch-700 bg-pitch-50/80 px-2.5 py-1 rounded-md border border-pitch-200 inline-block">
          {match.resultSummary}
        </p>
      )}
    </>
  );
}

export default function Matches() {
  const nav = useNavigate();
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [del, setDel] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    const t = setTimeout(() => { setQ(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, error, loading, reload } = useFetch(`/matches${qs({ search: q, status, page, limit: 8 })}`, { poll: 20000 });

  const doDelete = async () => {
    setBusy(true);
    try {
      await api(`/matches/${del.id}`, { method: 'DELETE' });
      setDel(null);
      reload();
    } catch (e) {
      setDel(null);
      setActionError(e.message);
    } finally { setBusy(false); }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Matches</h1>
        {data?.canCreate && <Link to="/matches/new" className="btn font-bold shadow-xs" style={{ backgroundColor: '#f59e0b', color: '#ffffff' }}><Plus className="h-4 w-4" /> Create Match</Link>}
      </div>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" aria-hidden />
          <input className="input pl-9" placeholder="Search by match, team or venue..." aria-label="Search matches" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="sm:w-44">
          <DropdownSelect
            value={status}
            onChange={(v) => { setStatus(v); setPage(1); }}
            options={[
              { value: '', label: 'All statuses' },
              { value: 'scheduled', label: 'Scheduled' },
              { value: 'live', label: 'Live' },
              { value: 'completed', label: 'Completed' },
              { value: 'abandoned', label: 'Abandoned' },
            ]}
            placeholder="All statuses"
          />
        </div>
      </div>
      <div className="mb-3"><ErrorBox message={actionError} /></div>
      {loading && !data ? <SkeletonMatchCard count={4} /> : error ? <ErrorBox message={error} onRetry={reload} /> : data.items.length === 0 ? (
        <Empty icon={Trophy} title={q || status ? 'No matches found' : 'No matches yet'} text={q || status ? 'Try a different search or filter.' : 'Create a match between two teams to start scoring.'}
          action={!q && !status && data.canCreate && <Link to="/matches/new" className="btn font-bold" style={{ backgroundColor: '#f59e0b', color: '#ffffff' }}>Create Match</Link>} />
      ) : (
        <>
          <ul className="space-y-3">
            {data.items.map((m) => {
              const borderAccent =
                m.status === 'live'
                  ? 'border-l-4 border-l-red-500 border-red-200/80 bg-gradient-to-r from-red-50/25 to-white'
                  : m.status === 'completed'
                  ? 'border-l-4 border-l-emerald-500 border-emerald-200/70 bg-gradient-to-r from-emerald-50/20 to-white'
                  : 'border-l-4 border-l-blue-500 border-slate-200/80';

              return (
                <li key={m.id} className={`card p-3.5 sm:p-4 hover:shadow-md transition ${borderAccent}`}>
                  <div className="flex items-start justify-between gap-2">
                    <Link to={`/matches/${m.id}`} className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-bold text-slate-900 text-sm sm:text-base truncate">{m.name}</span>
                          <span className="badge bg-slate-100 text-slate-600 text-[10px] uppercase font-bold py-0.5 px-2">
                            {m.format} • {m.overs} ov
                          </span>
                        </div>
                        <StatusBadge status={m.status} />
                      </div>
                      {(m.venue || m.date) && (
                        <div className="text-[11px] text-slate-400 mt-1">
                          {m.venue ? `${m.venue}` : ''}{m.venue && m.date ? ' • ' : ''}{m.date ? `${fmtDate(m.date)}` : ''}
                        </div>
                      )}
                      <MatchScoreLine match={m} />
                    </Link>
                    {m.canManage && (
                      <button
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
                        onClick={() => setDel(m)}
                        aria-label={`Delete ${m.name}`}
                        title="Delete Match"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          <Pagination page={data.page} pages={data.pages} total={data.total} onPage={setPage} />
        </>
      )}
      <ConfirmDialog open={!!del} danger title="Delete match?" confirmLabel="Delete match" busy={busy} onCancel={() => setDel(null)} onConfirm={doDelete}
        message={`This permanently deletes "${del?.name}" including every ball scored. ${del?.status === 'completed' ? 'Only the Super Admin can delete completed matches.' : ''}`} />
    </div>
  );
}
