import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Pencil, Plus, Search, Shield, Trash2 } from 'lucide-react';
import { api, qs } from '../api.js';
import { useFetch } from '../useFetch.js';
import { ConfirmDialog, Empty, ErrorBox, Pagination, Spinner, TeamLogo } from '../components/ui.jsx';

const BALLS = ['Leather Ball', 'Tennis Ball', 'Rubber Ball', 'Other'];

export default function Teams() {
  const nav = useNavigate();
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [ball, setBall] = useState('');
  const [page, setPage] = useState(1);
  const [del, setDel] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    const t = setTimeout(() => { setQ(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, error, loading, reload } = useFetch(`/teams${qs({ search: q, ballType: ball, page, limit: 8 })}`);

  const doDelete = async () => {
    setBusy(true);
    try {
      await api(`/teams/${del.id}`, { method: 'DELETE' });
      setDel(null);
      setActionError('');
      reload();
    } catch (e) {
      setDel(null);
      setActionError(e.message);
    } finally { setBusy(false); }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Teams</h1>
        {data?.canCreate ? (
          <Link to="/teams/new" className="btn btn-green"><Plus className="h-4 w-4" /> Create Team</Link>
        ) : data?.myTeam ? (
          <Link to={`/teams/${data.myTeam.id}/edit`} className="btn btn-primary"><Pencil className="h-4 w-4" /> Update Team</Link>
        ) : null}
      </div>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" aria-hidden />
          <input className="input pl-9" placeholder="Search teams..." aria-label="Search teams" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input sm:w-48" aria-label="Filter by ball type" value={ball} onChange={(e) => { setBall(e.target.value); setPage(1); }}>
          <option value="">All ball types</option>
          {BALLS.map((b) => <option key={b}>{b}</option>)}
        </select>
      </div>

      <div className="mb-3"><ErrorBox message={actionError} /></div>
      {loading && !data ? <Spinner /> : error ? <ErrorBox message={error} onRetry={reload} /> : data.items.length === 0 ? (
        <Empty icon={Shield} title={q || ball ? 'No teams match your search' : 'No teams yet'} text={q || ball ? 'Try a different name or filter.' : 'Create a team with 11 players to get started.'}
          action={!q && !ball && data.canCreate && <Link to="/teams/new" className="btn btn-green">Create Team</Link>} />
      ) : (
        <>
          <ul className="space-y-2">
            {data.items.map((t) => (
              <li key={t.id} className="card flex items-center gap-3 p-3">
                <Link to={`/teams/${t.id}`} className="flex flex-1 items-center gap-3">
                  <TeamLogo team={t} size={48} />
                  <div>
                    <div className="font-semibold text-slate-900">{t.name}</div>
                    <div className="text-xs text-slate-500">{t.playerCount} Players{t.location ? ` · ${t.location}` : ''} · {t.ballType}</div>
                  </div>
                </Link>
                {t.canManage && (
                  <div className="flex gap-1">
                    <button className="btn btn-ghost !p-2" onClick={() => nav(`/teams/${t.id}/edit`)} aria-label={`Edit ${t.name}`}><Pencil className="h-4 w-4" /></button>
                    <button className="btn btn-ghost !p-2 text-red-600" onClick={() => setDel(t)} aria-label={`Delete ${t.name}`}><Trash2 className="h-4 w-4" /></button>
                  </div>
                )}
              </li>
            ))}
          </ul>
          <Pagination page={data.page} pages={data.pages} total={data.total} onPage={setPage} />
        </>
      )}

      <ConfirmDialog open={!!del} danger title="Delete team?" confirmLabel="Delete team" busy={busy} onCancel={() => setDel(null)} onConfirm={doDelete}
        message={`This permanently deletes ${del?.name} and all of its players. Teams that have matches cannot be deleted.`} />
    </div>
  );
}
