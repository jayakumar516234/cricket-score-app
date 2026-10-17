import { useEffect, useState } from 'react';
import { Pencil, Phone, Plus, Search, Trash2, Users, Activity, Radio } from 'lucide-react';
import { api, qs } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useFetch } from '../useFetch.js';
import { Link } from 'react-router-dom';
import { ConfirmDialog, Empty, ErrorBox, Field, Modal, Pagination, Spinner, fmtDate } from '../components/ui.jsx';

const blank = { name: '', username: '', phone: '', password: '', role: 'user', active: true };

function timeAgo(date) {
  if (!date) return 'Never';
  const diffSec = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diffSec < 0 || diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDays = Math.floor(diffHour / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function UsersPage() {
  const { user: currentUser, isSuper } = useAuth();
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [filterOnline, setFilterOnline] = useState(false);
  const [form, setForm] = useState(null);
  const [del, setDel] = useState(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    const t = setTimeout(() => { setQ(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, error, loading, reload } = useFetch(
    `/users${qs({ search: q, page, limit: 10, ...(filterOnline ? { online: 'true' } : {}) })}`,
    { poll: 15000 }
  );

  const save = async (e) => {
    e.preventDefault();
    setFormError('');
    if (form.name.trim().length < 2) return setFormError('Enter a name');
    if (!form.id && !/^[a-zA-Z0-9_.]{3,30}$/.test(form.username)) return setFormError('Username: 3-30 letters, numbers, dot or underscore');
    if (!/^(\+?91)?0?[6-9]\d{9}$/.test(form.phone.replace(/[\s-]/g, ''))) return setFormError('Enter a valid 10-digit mobile number');
    if (!form.id && form.password.length < 6) return setFormError('Password must be at least 6 characters');
    if (form.id && form.password && form.password.length < 6) return setFormError('Password must be at least 6 characters');
    setBusy(true);
    try {
      if (form.id) {
        await api(`/users/${form.id}`, { method: 'PUT', body: { name: form.name.trim(), phone: form.phone, role: form.role, active: form.active, ...(form.password ? { password: form.password } : {}) } });
      } else {
        await api('/users', { method: 'POST', body: { name: form.name.trim(), username: form.username.trim(), phone: form.phone, role: form.role, password: form.password } });
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
      await api(`/users/${del.id}`, { method: 'DELETE' });
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
        <div>
          <h1 className="text-xl font-bold text-slate-900">User Management & Activity</h1>
          <p className="text-xs text-slate-500">Track logged in users, view online presence, and check last active time.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setFormError(''); setForm({ ...blank }); }}>
          <Plus className="h-4 w-4" /> Add user
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[16rem]">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" aria-hidden />
          <input className="input pl-9" placeholder="Search by name, username or phone..." aria-label="Search users" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {data && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { setFilterOnline(false); setPage(1); }}
              className={`btn text-xs !py-1.5 !px-3 font-semibold ${!filterOnline ? 'btn-primary' : 'btn-outline text-slate-600'}`}
            >
              All Users ({data.total})
            </button>
            <button
              type="button"
              onClick={() => { setFilterOnline(true); setPage(1); }}
              className={`btn text-xs !py-1.5 !px-3 font-semibold flex items-center gap-1.5 ${filterOnline ? 'btn-green' : 'btn-outline text-slate-600'}`}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Online Now ({data.onlineTotal ?? 0})
            </button>
          </div>
        )}
      </div>

      <div className="mb-3"><ErrorBox message={actionError} /></div>

      {loading && !data ? <Spinner /> : error ? <ErrorBox message={error} onRetry={reload} /> : data.items.length === 0 ? (
        <Empty icon={Users} title={filterOnline ? 'No users currently online' : q ? 'No users match your search' : 'No users yet'} text={filterOnline ? 'None of the users have been active in the last 5 minutes.' : "Add users using the 'Add user' button above."} />
      ) : (
        <>
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[50rem] text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="p-3">User</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Activity Status</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">Teams</th>
                  <th className="p-3">Account</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((u) => {
                  const canManage = isSuper || (u.role !== 'superadmin' && u.role !== 'admin');
                  return (
                    <tr key={u.id} className="border-t border-slate-100 hover:bg-slate-50/60 transition">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {u.isOnline ? (
                            <span className="relative flex h-2.5 w-2.5 shrink-0" title="Online now">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full h-2 w-2 shrink-0 bg-slate-300" title="Offline"></span>
                          )}
                          <div>
                            <div className="font-semibold text-slate-900">{u.name}</div>
                            <div className="text-xs text-slate-500">@{u.username} • Joined {fmtDate(u.createdAt)?.split(',')[0]}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={`badge ${
                          u.role === 'superadmin' ? 'bg-purple-100 text-purple-700 font-semibold' :
                          u.role === 'admin' ? 'bg-indigo-100 text-indigo-700 font-semibold' :
                          u.role === 'viewer' ? 'bg-amber-100 text-amber-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {u.role === 'superadmin' ? 'Super Admin' : u.role === 'admin' ? 'Admin' : u.role === 'viewer' ? 'Viewer' : 'Team Admin'}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          {u.isOnline ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span> Online
                            </span>
                          ) : (
                            <span className="text-xs font-medium text-slate-600" title={u.lastActiveAt ? `Last active: ${fmtDate(u.lastActiveAt)}` : 'Never active'}>
                              {u.lastActiveAt ? `Active ${timeAgo(u.lastActiveAt)}` : 'Never active'}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5" title={u.lastLoginAt ? `Last login: ${fmtDate(u.lastLoginAt)}` : 'No login recorded'}>
                          {u.lastLoginAt ? `Login: ${timeAgo(u.lastLoginAt)}` : 'Never logged in'}
                        </div>
                      </td>
                      <td className="p-3">
                        {u.phone ? (
                          <a href={`tel:${u.phone}`} className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                            <Phone className="h-3 w-3" aria-hidden />{u.phone}
                          </a>
                        ) : '-'}
                      </td>
                      <td className="p-3">
                        {u.role === 'viewer' ? (
                          u.viewTeamInfo ? (
                            <span className="text-xs text-slate-600">Views <Link to={`/teams/${u.viewTeamInfo.id}`} className="font-semibold text-blue-600 hover:underline">{u.viewTeamInfo.name}</Link></span>
                          ) : '-'
                        ) : u.teams?.length ? (
                          <div className="flex flex-wrap gap-1">
                            {u.teams.map((t) => (
                              <Link key={t.id} to={`/teams/${t.id}`} className="badge bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs">
                                {t.name}
                              </Link>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">No team yet</span>
                        )}
                      </td>
                      <td className="p-3">
                        <span className={`badge ${u.active ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>
                          {u.active ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {canManage && u.role !== 'superadmin' && (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              className="btn btn-ghost !p-2"
                              onClick={() => {
                                setFormError('');
                                setForm({ id: u.id, name: u.name, username: u.username, phone: u.phone || '', role: u.role || 'user', password: '', active: u.active });
                              }}
                              aria-label={`Edit ${u.name}`}
                              title="Edit user"
                            >
                              <Pencil className="h-4 w-4 text-slate-600" />
                            </button>
                            {isSuper && (
                              <button
                                className="btn btn-ghost !p-2 text-red-600 hover:bg-red-50"
                                onClick={() => setDel(u)}
                                aria-label={`Delete ${u.name}`}
                                title="Delete user"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} pages={data.pages} total={data.total} onPage={setPage} />
        </>
      )}

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? 'Edit user' : 'Add user'}>
        {form && (
          <form onSubmit={save} className="space-y-4" noValidate>
            <ErrorBox message={formError} />
            <Field label="Name" required htmlFor="u-name"><input id="u-name" className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Username" required htmlFor="u-username"><input id="u-username" className="input" autoCapitalize="none" disabled={!!form.id} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></Field>
            <Field label="Phone number" required htmlFor="u-phone"><input id="u-phone" type="tel" className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            {form.role !== 'superadmin' && (
              <Field label="Role" required htmlFor="u-role">
                <select id="u-role" className="input" value={form.role || 'user'} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  <option value="user">Team Admin (Own team & matches)</option>
                  {isSuper && <option value="admin">Admin (All teams, players & matches)</option>}
                  {form.role === 'viewer' && <option value="viewer">Viewer (Read only)</option>}
                </select>
              </Field>
            )}
            <Field label={form.id ? 'New password (leave blank to keep the old one)' : 'Password'} required={!form.id} htmlFor="u-pass"><input id="u-pass" type="password" autoComplete="new-password" className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
            {form.id && <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-blue-600" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Account is active</label>}
            <div className="flex justify-end gap-2">
              <button type="button" className="btn btn-outline" onClick={() => setForm(null)}>Cancel</button>
              <button className="btn btn-primary" disabled={busy}>{form.id ? 'Save changes' : 'Create user'}</button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmDialog open={!!del} danger title="Delete user?" confirmLabel="Delete user" busy={busy} onCancel={() => setDel(null)} onConfirm={doDelete}
        message={`${del?.name} will lose access immediately. Their teams and matches stay in the app and only you can manage them afterwards.`} />
    </div>
  );
}
