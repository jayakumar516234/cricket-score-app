import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Lightbulb,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  MessageSquare,
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  Phone,
  Send,
  User as UserIcon,
  Shield,
  MessageCircle,
} from 'lucide-react';
import { api, qs } from '../api.js';
import { useFetch } from '../useFetch.js';
import { useAuth } from '../context/AuthContext.jsx';
import { ConfirmDialog, Empty, ErrorBox, Modal, Pagination, SkeletonList, fmtDate } from '../components/ui.jsx';

function StatusBadge({ status }) {
  if (status === 'accepted') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-xs">
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
        Accepted / Resolved
      </span>
    );
  }
  if (status === 'reviewed') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold bg-blue-50 text-blue-700 border border-blue-300 shadow-xs">
        <Eye className="h-3.5 w-3.5 text-blue-600" />
        Reviewed
      </span>
    );
  }
  if (status === 'rejected') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold bg-rose-50 text-rose-700 border border-rose-300 shadow-xs">
        <XCircle className="h-3.5 w-3.5 text-rose-600" />
        Closed
      </span>
    );
  }
  // Default: pending
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300 shadow-xs">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
      </span>
      <Clock className="h-3.5 w-3.5 text-amber-600" />
      Pending Review
    </span>
  );
}

const blank = { title: '', message: '' };

export default function Suggestions() {
  const { user, isSuper, isAdmin } = useAuth();
  const hasAdminPrivileges = isSuper || isAdmin;

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

  const { data, error, loading, reload } = useFetch(
    `/suggestions${qs({ status: statusFilter, page, limit: 10 })}`
  );

  const openCreate = () => {
    setForm({ ...blank });
    setFormError('');
  };

  const openEdit = (s) => {
    setForm({ id: s._id, title: s.title, message: s.message });
    setEditStatus(s.status || 'pending');
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
      const body = hasAdminPrivileges && form.id
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
    } finally {
      setBusy(false);
    }
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
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Link to="/settings" className="btn btn-ghost !p-2 rounded-xl" aria-label="Back to settings">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Support &amp; Feedback Desk</h1>
            <p className="text-xs text-slate-500">
              {hasAdminPrivileges
                ? 'Review user feedback, answer support tickets, and update resolution status'
                : 'Submit feature requests or get help directly from app administrators'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {hasAdminPrivileges && (
            <select
              className="input w-36 rounded-xl font-medium text-xs"
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="reviewed">Reviewed</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Closed</option>
            </select>
          )}
          <button
            className="btn btn-green bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md rounded-xl text-xs sm:text-sm"
            onClick={openCreate}
          >
            <Plus className="h-4 w-4" /> New Ticket / Feedback
          </button>
        </div>
      </div>

      {actionError && <ErrorBox message={actionError} />}

      {loading && !data ? (
        <SkeletonList count={4} />
      ) : error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : data.items.length === 0 ? (
        <Empty
          icon={Lightbulb}
          title={statusFilter ? 'No tickets match this filter' : 'No feedback or tickets yet'}
          text={
            hasAdminPrivileges
              ? 'When users submit feedback or support requests, they will show up here.'
              : 'Share your ideas, feature requests, or report issues to the team!'
          }
          action={
            <button className="btn btn-green bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md rounded-xl" onClick={openCreate}>
              <Plus className="h-4 w-4" /> Submit a Ticket
            </button>
          }
        />
      ) : (
        <>
          <ul className="space-y-3.5">
            {data.items.map((s) => {
              const authorPhone = s.userPhone || s.user?.phone || '';
              const authorUsername = s.userUsername || s.user?.username || '';
              const authorTeam = s.userTeamName || '';
              const cleanPhone = authorPhone.replace(/\D/g, '');

              return (
                <li key={s._id} className="card p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-2">
                      {/* Ticket Title & Status Badge */}
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h2 className="font-extrabold text-slate-900 text-base sm:text-lg tracking-tight">{s.title}</h2>
                        <StatusBadge status={s.status} />
                      </div>

                      {/* Ticket Message */}
                      <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
                        {s.message}
                      </p>

                      {/* Submitter Info Card (Especially for Admins to know who asked!) */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-2 text-xs text-slate-600 border-t border-slate-100/80">
                        {/* Submitter Name & Role */}
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-navy-900 text-white text-[11px] font-black shadow-xs">
                            {(s.userName || '?')[0].toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900">{s.userName}</span>
                            <span className="ml-1.5 badge bg-slate-100 text-slate-700 border border-slate-200 text-[10px] uppercase font-bold py-0.5 px-2">
                              {s.userRole || 'User'}
                            </span>
                          </div>
                        </div>

                        {/* Team Name if applicable */}
                        {authorTeam && (
                          <div className="flex items-center gap-1.5 text-pitch-700 font-semibold bg-pitch-50 px-2 py-0.5 rounded-lg border border-pitch-200">
                            <Shield className="h-3.5 w-3.5" />
                            <span>{authorTeam}</span>
                          </div>
                        )}

                        {/* Admin Action: Quick Phone & WhatsApp Buttons */}
                        {hasAdminPrivileges && cleanPhone && (
                          <div className="flex items-center gap-2">
                            <a
                              href={`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(`Hello ${s.userName}, regarding your cricket app ticket "${s.title}":`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition"
                              title="Chat on WhatsApp"
                            >
                              <MessageCircle className="h-3 w-3 text-emerald-600" />
                              WhatsApp
                            </a>
                            <a
                              href={`tel:${authorPhone}`}
                              className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700 border border-blue-200 hover:bg-blue-100 transition"
                              title="Call user"
                            >
                              <Phone className="h-3 w-3 text-blue-600" />
                              {authorPhone}
                            </a>
                          </div>
                        )}

                        {/* Time */}
                        <div className="text-slate-400 text-[11px] ml-auto">
                          {fmtDate(s.createdAt)}
                        </div>
                      </div>

                      {/* Admin Reply Section (Visible to both user & admin) */}
                      {s.adminReply && (
                        <div className="mt-3 rounded-2xl bg-gradient-to-br from-blue-50/90 to-sky-50/50 p-3.5 sm:p-4 text-sm border border-blue-200/80 shadow-xs space-y-1.5">
                          <div className="flex items-center justify-between text-xs font-bold text-blue-900">
                            <span className="flex items-center gap-1.5">
                              <MessageSquare className="h-4 w-4 text-blue-600" />
                              Admin Response {s.repliedBy ? `by ${s.repliedBy}` : ''}
                            </span>
                            {s.repliedAt && <span className="text-blue-500 font-normal text-[11px]">{fmtDate(s.repliedAt)}</span>}
                          </div>
                          <p className="text-slate-800 whitespace-pre-wrap leading-relaxed pl-5 border-l-2 border-blue-400">
                            {s.adminReply}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Actions: Edit / Status / Delete */}
                    <div className="flex sm:flex-col gap-1 shrink-0 self-end sm:self-start">
                      {(hasAdminPrivileges || s.status === 'pending') && (
                        <button
                          onClick={() => openEdit(s)}
                          className="btn btn-outline !py-1.5 !px-2.5 text-xs rounded-xl font-bold flex items-center gap-1 text-slate-700 hover:text-blue-600"
                          title={hasAdminPrivileges ? 'Reply / Change Status' : 'Edit Ticket'}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          <span>{hasAdminPrivileges ? 'Manage' : 'Edit'}</span>
                        </button>
                      )}
                      {hasAdminPrivileges && (
                        <button
                          onClick={() => setDel(s)}
                          className="btn btn-ghost !p-2 text-rose-500 hover:bg-rose-50 rounded-xl"
                          aria-label="Delete Ticket"
                          title="Delete Ticket"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          <Pagination page={data.page} pages={data.pages} total={data.total} onPage={setPage} />
        </>
      )}

      {/* Create / Edit modal */}
      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        title={form?.id ? (hasAdminPrivileges ? 'Manage Ticket & Reply' : 'Edit Feedback') : 'New Support Ticket / Feedback'}
      >
        <form onSubmit={save} className="space-y-4">
          <ErrorBox message={formError} />
          <div>
            <label className="label" htmlFor="sg-title">Ticket Subject / Title</label>
            <input
              id="sg-title"
              className="input rounded-xl"
              value={form?.title || ''}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Need help with match scoring or New feature idea"
              disabled={hasAdminPrivileges && form?.id}
            />
          </div>
          <div>
            <label className="label" htmlFor="sg-message">Ticket Description</label>
            <textarea
              id="sg-message"
              className="input rounded-xl"
              rows={4}
              value={form?.message || ''}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Please provide details of your feedback or issue..."
              disabled={hasAdminPrivileges && form?.id}
            />
          </div>

          {/* Admin Status & Reply Section */}
          {hasAdminPrivileges && form?.id && (
            <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4 space-y-3.5">
              <div className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-blue-600" />
                Admin Action &amp; User Response
              </div>
              <div>
                <label className="label" htmlFor="sg-status">Update Ticket Status</label>
                <select
                  id="sg-status"
                  className="input rounded-xl font-bold"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                >
                  <option value="pending">⏳ Pending Review</option>
                  <option value="reviewed">👀 Reviewed</option>
                  <option value="accepted">✅ Accepted / In Progress</option>
                  <option value="rejected">❌ Closed / Rejected</option>
                </select>
              </div>
              <div>
                <label className="label" htmlFor="sg-reply">Reply to User (Visible to submitter)</label>
                <textarea
                  id="sg-reply"
                  className="input rounded-xl bg-white"
                  rows={3}
                  value={editReply}
                  onChange={(e) => setEditReply(e.target.value)}
                  placeholder="Type an official reply to the user..."
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn btn-outline rounded-xl" onClick={() => setForm(null)} disabled={busy}>
              Cancel
            </button>
            <button
              className="btn btn-green bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md rounded-xl"
              disabled={busy}
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {form?.id ? (hasAdminPrivileges ? 'Save & Send Reply' : 'Update Ticket') : 'Submit Feedback'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete confirm dialog */}
      <ConfirmDialog
        open={!!del}
        title="Delete ticket"
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
