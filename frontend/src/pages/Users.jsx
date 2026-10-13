import { useEffect, useState } from 'react';
import { Pencil, Phone, Plus, Search, Trash2, Users } from 'lucide-react';
import { api, qs } from '../api.js';
import { useFetch } from '../useFetch.js';
import { Link } from 'react-router-dom';
import { ConfirmDialog, Empty, ErrorBox, Field, Modal, Pagination, Spinner, fmtDate } from '../components/ui.jsx';

const blank = { name: '', username: '', phone: '', password: '', active: true };

// Visible to the Super Admin only.
export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(null);
  const [del, setDel] = useState(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    const t = setTimeout(() => { setQ(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, error, loading, reload } = useFetch(`/users${qs({ search: q, page, limit: 10 })}`);

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
        await api(`/users/${form.id}`, { method: 'PUT', body: { name: form.name.trim(), phone: form.phone, active: form.active, ...(form.password ? { password: form.password } : {}) } });
      } else {
        await api('/users', { method: 'POST', body: { name: form.name.trim(), username: form.username.trim(), phone: form.phone, password: form.password } });
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
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Users</h1>
          <p className="text-xs text-slate-500">Everyone who signed up, their teams, and the view-only team logins. Only you can see this page.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setFormError(''); setForm({ ...blank }); }}><Plus className="h-4 w-4" /> Add user</button>
      </div>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" aria-hidden />
        <input className="input pl-9" placeholder="Search by name, username or phone..." aria-label="Search users" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="mb-3"><ErrorBox message={actionError} /></div>
      {loading && !data ? <Spinner /> : error ? <ErrorBox message={error} onRetry={reload} /> : data.items.length === 0 ? (
        <Empty icon={Users} title={q ? 'No users match your search' : 'No users yet'} text="People appear here after they sign up." />
      ) : (
        <>
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="p-3">Name</th><th className="p-3">Phone</th><th className="p-3">Teams</th><th className="p-3">Joined</th><th className="p-3">Status</th><th className="p-3 text-right">Actions</th></tr></thead>
              <tbody>
                {data.items.map((u) => (
                  <tr key={u.id} className="border-t border-slate-100">
                    <td className="p-3"><div className="font-medium text-slate-900">{u.name}</div><div className="text-xs text-slate-500">{u.role === 'superadmin' ? 'Super Admin' : `@${u.username}`}{u.role === 'viewer' && ' · view only'}</div></td>
                    <td className="p-3">{u.phone ? <a href={`tel:${u.phone}`} className="inline-flex items-center gap-1 text-blue-600 hover:underline"><Phone className="h-3.5 w-3.5" aria-hidden />{u.phone}</a> : '-'}</td>
                    <td className="p-3">
                      {u.role === 'viewer' ? (u.viewTeamInfo ? <span className="text-xs text-slate-600">Views <Link to={`/teams/${u.viewTeamInfo.id}`} className="font-semibold text-blue-600 hover:underline">{u.viewTeamInfo.name}</Link></span> : '-')
                        : u.teams?.length ? <div className="flex flex-wrap gap-1">{u.teams.map((t) => <Link key={t.id} to={`/teams/${t.id}`} className="badge bg-blue-50 text-blue-700 hover:bg-blue-100">{t.name}</Link>)}</div> : <span className="text-xs text-slate-400">No team yet</span>}
                    </td>
                    <td className="p-3 text-xs text-slate-500">{fmtDate(u.createdAt)}</td>
                    <td className="p-3"><span className={`badge ${u.active ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>{u.active ? 'Active' : 'Disabled'}</span></td>
                    <td className="p-3 text-right">
                      {u.role !== 'superadmin' && (
                        <>
                          <button className="btn btn-ghost !p-2" onClick={() => { setFormError(''); setForm({ id: u.id, name: u.name, username: u.username, phone: u.phone || '', password: '', active: u.active }); }} aria-label={`Edit ${u.name}`}><Pencil className="h-4 w-4" /></button>
                          <button className="btn btn-ghost !p-2 text-red-600" onClick={() => setDel(u)} aria-label={`Delete ${u.name}`}><Trash2 className="h-4 w-4" /></button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
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
