import { useState } from 'react';
import { Lightbulb, Plus, Pencil, Trash2, Loader2, MessageSquare } from 'lucide-react';
import { api, qs } from '../api.js';
import { useFetch } from '../useFetch.js';
import { useAuth } from '../context/AuthContext.jsx';
import { ConfirmDialog, Empty, ErrorBox, Modal, Pagination, Spinner, fmtDate } from '../components/ui.jsx';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-700',
  reviewed: 'bg-blue-100 text-blue-700',
  accepted: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

const blank = { title: '', message: '' };

export default function Suggestions() {
  const { isSuper } = useAuth();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [form, setForm] = useState(null);
  const [del, setDel] = useState(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [actionError, setActionError] = useState('');

  // Admin edit extras
  const [editStatus, setEditStatus] = useState('pending');
  const [editReply, setEditReply] = useState('');

  const { data, error, loading, reload } = useFetch(`/suggestions${qs({ status: statusFilter, page, limit: 10 })}`);

  const openCreate = () => { setForm({ ...blank }); setFormError(''); };
  const openEdit = (s) => {
    setForm({ id: s._id, title: s.title, message: s.message });
    setEditStatus(s.status);
    setEditReply(s.adminReply || '');
    setFormError('');
  };

  const save = async (e) => {
    e.preventDefault();
    setFormError('');
    if (form.title.trim().length < 3) return setFormError('Title must be at least 3 characters');
    if (form.message.trim().length < 5) return setFormError('Message must be at least 5 characters');
    setBusy(true);
    try {
      const body = isSuper && form.id
        ? { title: form.title.trim(), message: form.message.trim(), status: editStatus, adminReply: editReply.trim() }
        : { title: form.title.trim(), message: form.message.trim() };
      if (form.id) {
        await api(`/suggestions/${form.id}`, { method: 'PUT', body });
      } else {
        await api('/suggestions', { method: 'POST', body });
      }
      setForm(null);
      reload();
    } catch (err) {
      setFormError(err.message);
    } finally { setBusy(false); }
  };

  const doDelete = async () => {
    setBusy(true);
    try {
      await api(`/suggestions/${del._id}`, { method: 'DELETE' });
      setDel(null);
      reload();
    } catch (e) {
      setDel(null);
      setActionError(e.message);
    } finally { setBusy(false); }
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-900">Suggestions</h1>
        <div className="flex items-center gap-2">
          {isSuper && (
            <select className="input w-36" aria-label="Filter by status" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="reviewed">Reviewed</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
            </select>
          )}
          <button className="btn btn-primary" onClick={openCreate}><Plus className="h-4 w-4" /> New suggestion</button>
        </div>
      </div>

      {actionError && <div className="mb-3"><ErrorBox message={actionError} /></div>}

      {loading && !data ? <Spinner /> : error ? <ErrorBox message={error} onRetry={reload} /> : data.items.length === 0 ? (
        <Empty icon={Lightbulb} title="No suggestions yet" text="Share your ideas to improve the app!" action={<button className="btn btn-primary" onClick={openCreate}><Plus className="h-4 w-4" /> Submit a suggestion</button>} />
      ) : (
        <>
          <ul className="space-y-3">
            {data.items.map((s) => (
              <li key={s._id} className="card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-slate-900">{s.title}</h3>
                      <span className={`badge ${STATUS_COLORS[s.status] || STATUS_COLORS.pending}`}>{s.status}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600 whitespace-pre-wrap">{s.message}</p>
                    <p className="mt-2 text-xs text-slate-400">by {s.userName} ({s.userRole}) · {fmtDate(s.createdAt)}</p>
                    {s.adminReply && (
                      <div className="mt-2 rounded-lg bg-blue-50 p-3 text-sm">
                        <p className="text-xs font-semibold text-blue-700 mb-1"><MessageSquare className="inline h-3 w-3 mr-1" />Admin reply</p>
                        <p className="text-slate-700 whitespace-pre-wrap">{s.adminReply}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {(isSuper || s.status === 'pending') && (
                      <button onClick={() => openEdit(s)} className="btn btn-ghost !p-2" aria-label="Edit"><Pencil className="h-4 w-4" /></button>
                    )}
                    {isSuper && (
                      <button onClick={() => setDel(s)} className="btn btn-ghost !p-2 text-red-500" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <Pagination page={data.page} pages={data.pages} total={data.total} onPage={setPage} />
        </>
      )}

      {/* Create / Edit modal */}
      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? 'Edit suggestion' : 'New suggestion'}>
        <form onSubmit={save} className="space-y-4">
          <ErrorBox message={formError} />
          <div>
            <label className="label" htmlFor="sg-title">Title</label>
            <input id="sg-title" className="input" value={form?.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Brief title for your suggestion" />
          </div>
          <div>
            <label className="label" htmlFor="sg-message">Details</label>
            <textarea id="sg-message" className="input" rows={4} value={form?.message || ''} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Describe your idea or feedback..." />
          </div>
          {isSuper && form?.id && (
            <>
              <div>
                <label className="label" htmlFor="sg-status">Status</label>
                <select id="sg-status" className="input" value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                  <option value="pending">Pending</option>
                  <option value="reviewed">Reviewed</option>
                  <option value="accepted">Accepted</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div>
                <label className="label" htmlFor="sg-reply">Admin reply</label>
                <textarea id="sg-reply" className="input" rows={3} value={editReply} onChange={(e) => setEditReply(e.target.value)} placeholder="Optional reply to the user..." />
              </div>
            </>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-outline" onClick={() => setForm(null)} disabled={busy}>Cancel</button>
            <button className="btn btn-primary" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} {form?.id ? 'Save' : 'Submit'}</button>
          </div>
        </form>
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!del}
        title="Delete suggestion"
        message={`Delete "${del?.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        busy={busy}
        onConfirm={doDelete}
        onCancel={() => setDel(null)}
      />
    </div>
  );
}
