import { useState } from 'react';
import { ScrollText } from 'lucide-react';
import { qs } from '../api.js';
import { useFetch } from '../useFetch.js';
import { Empty, ErrorBox, Pagination, Spinner, SkeletonList, fmtDate } from '../components/ui.jsx';

const FILTERS = [['', 'All activity'], ['score', 'Score changes'], ['match', 'Matches'], ['team', 'Teams'], ['user', 'Users']];

export default function Audit() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const { data, error, loading, reload } = useFetch(`/audit${qs({ action, page, limit: 20 })}`);
  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-900">Audit log</h1>
        <select className="input w-44" aria-label="Filter activity" value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }}>
          {FILTERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      {loading && !data ? <SkeletonList count={6} /> : error ? <ErrorBox message={error} onRetry={reload} /> : data.items.length === 0 ? (
        <Empty icon={ScrollText} title="Nothing recorded yet" text="Team, match, user and score-correction changes will appear here." />
      ) : (
        <>
          <ul className="space-y-2">
            {data.items.map((a) => (
              <li key={a._id} className="card p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-slate-900">{a.action}</span>
                  <span className="text-xs text-slate-500">{fmtDate(a.at)}</span>
                </div>
                <p className="text-xs text-slate-500">by {a.actorName || 'unknown'} ({a.actorRole})</p>
                {a.details && Object.keys(a.details).length > 0 && (
                  <pre className="mt-2 overflow-x-auto rounded bg-slate-50 p-2 text-xs text-slate-600">{JSON.stringify(a.details, null, 2)}</pre>
                )}
              </li>
            ))}
          </ul>
          <Pagination page={data.page} pages={data.pages} total={data.total} onPage={setPage} />
        </>
      )}
    </div>
  );
}
