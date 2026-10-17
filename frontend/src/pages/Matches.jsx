import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Trash2, Trophy } from 'lucide-react';
import { api, qs } from '../api.js';
import { useFetch } from '../useFetch.js';
import { ConfirmDialog, Empty, ErrorBox, Pagination, Spinner, StatusBadge, TeamLogo, DropdownSelect, fmtDate } from '../components/ui.jsx';

export function MatchScoreLine({ match }) {
  const sc = (teamId) => match.scores?.find((s) => s.team === teamId);
  const Side = ({ team }) => {
    const s = sc(team.id);
    return (
      <div className="flex flex-1 items-center gap-2">
        <TeamLogo team={team} size={28} />
        <div>
          <div className="text-sm font-medium text-slate-800">{team.name}</div>
          <div className="text-xs text-slate-500">{s ? `${s.runs}/${s.wickets}${s.overs ? ` (${s.overs})` : ''}` : 'Yet to bat'}</div>
        </div>
      </div>
    );
  };
  return (
    <>
      <div className="mt-2 flex items-center gap-2"><Side team={match.homeTeam} /><span className="text-xs text-slate-400">vs</span><Side team={match.awayTeam} /></div>
      {match.resultSummary && <p className="mt-2 text-xs font-semibold text-pitch-700">{match.resultSummary}</p>}
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
        {data?.canCreate && <Link to="/matches/new" className="btn btn-primary"><Plus className="h-4 w-4" /> Create Match</Link>}
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
      {loading && !data ? <Spinner /> : error ? <ErrorBox message={error} onRetry={reload} /> : data.items.length === 0 ? (
        <Empty icon={Trophy} title={q || status ? 'No matches found' : 'No matches yet'} text={q || status ? 'Try a different search or filter.' : 'Create a match between two teams to start scoring.'}
          action={!q && !status && data.canCreate && <Link to="/matches/new" className="btn btn-primary">Create Match</Link>} />
      ) : (
        <>
          <ul className="space-y-2">
            {data.items.map((m) => (
              <li key={m.id} className="card p-3">
                <div className="flex items-start gap-2">
                  <Link to={`/matches/${m.id}`} className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">{m.name}</span>
                      <StatusBadge status={m.status} />
                    </div>
                    <div className="text-xs text-slate-500">{m.format} · {m.overs} overs{m.venue ? ` · ${m.venue}` : ''}{m.date ? ` · ${fmtDate(m.date)}` : ''}</div>
                    <MatchScoreLine match={m} />
                  </Link>
                  {m.canManage && (
                    <button className="btn btn-ghost !p-2 text-red-600" onClick={() => setDel(m)} aria-label={`Delete ${m.name}`}><Trash2 className="h-4 w-4" /></button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <Pagination page={data.page} pages={data.pages} total={data.total} onPage={setPage} />
        </>
      )}
      <ConfirmDialog open={!!del} danger title="Delete match?" confirmLabel="Delete match" busy={busy} onCancel={() => setDel(null)} onConfirm={doDelete}
        message={`This permanently deletes "${del?.name}" including every ball scored. ${del?.status === 'completed' ? 'Only the Super Admin can delete completed matches.' : ''}`} />
    </div>
  );
}
