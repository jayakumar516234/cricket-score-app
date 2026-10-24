import { useEffect, useState } from 'react';
import { Pencil, Phone, Plus, Search, Trash2, Users, Activity, Radio, Eye, EyeOff, MessageSquare, Shield, Check, Copy } from 'lucide-react';
import { api, qs } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useFetch } from '../useFetch.js';
import { Link } from 'react-router-dom';
import { ConfirmDialog, Empty, ErrorBox, Field, Modal, Pagination, Spinner, fmtDate } from '../components/ui.jsx';

const blank = { name: '', username: '', phone: '', password: '', role: 'user', viewTeam: '', assignTeam: '', active: true };

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
  const [showPassword, setShowPassword] = useState(false);
  const [del, setDel] = useState(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [actionError, setActionError] = useState('');
  const [teamsList, setTeamsList] = useState([]);

  useEffect(() => {
    const t = setTimeout(() => { setQ(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  // Load available teams for assignment dropdown
  useEffect(() => {
    api('/users/teams-list')
      .then((d) => setTeamsList(d.teams || []))
      .catch(() => {});
  }, []);

  const { data, error, loading, reload } = useFetch(
    `/users${qs({ search: q, page, limit: 10, ...(filterOnline ? { online: 'true' } : {}) })}`,
    { poll: 15000 }
  );

  const save = async (e) => {
    e.preventDefault();
    setFormError('');
    if (form.name.trim().length < 2) return setFormError('Enter a name (at least 2 characters)');
    if (!/^[a-zA-Z0-9_.]{3,30}$/.test(form.username.trim())) {
      return setFormError('Username must be 3-30 letters, numbers, dot or underscore');
    }
    const cleanPhone = form.phone.replace(/[\s-]/g, '');
    if (!/^(\+?91)?0?[6-9]\d{9}$/.test(cleanPhone)) {
      return setFormError('Enter a valid 10-digit mobile number');
    }
    if (!form.id && (!form.password || form.password.length < 4)) {
      return setFormError('Password must be at least 4 characters');
    }
    if (form.id && form.password && form.password.length < 4) {
      return setFormError('Password must be at least 4 characters');
    }
    if (form.role === 'viewer' && !form.viewTeam) {
      return setFormError('Please select a team for this Viewer user');
    }

    setBusy(true);
    try {
      const payload = {
        name: form.name.trim(),
        username: form.username.trim().toLowerCase(),
        phone: cleanPhone,
        role: form.role,
        viewTeam: form.role === 'viewer' ? form.viewTeam : null,
        assignTeam: (form.role === 'user' || form.role === 'teamadmin') && form.assignTeam ? form.assignTeam : null,
        ...(form.password ? { password: form.password } : {}),
      };

      if (form.id) {
        await api(`/users/${form.id}`, { method: 'PUT', body: { ...payload, active: form.active } });
      } else {
        await api('/users', { method: 'POST', body: payload });
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
      await api(`/users/${del.id}`, { method: 'DELETE' });
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
    <div>
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">User Management & Accounts</h1>
          <p className="text-xs text-slate-500 mt-0.5">Create and manage Team Admins and Viewers, edit usernames, passwords and view presence.</p>
        </div>
        <button
          className="btn btn-primary self-start sm:self-auto !py-2.5 !px-4 shadow-sm"
          onClick={() => {
            setFormError('');
            setShowPassword(false);
            setForm({ ...blank });
          }}
        >
          <Plus className="h-4 w-4" /> Add New User
        </button>
      </div>

      <div className="mb-4 flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" aria-hidden />
          <input
            className="input pl-9"
            placeholder="Search by name, username or phone..."
            aria-label="Search users"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {data && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { setFilterOnline(false); setPage(1); }}
              className={`btn flex-1 sm:flex-none text-xs !py-2 !px-3.5 font-bold ${!filterOnline ? 'btn-primary' : 'btn-outline text-slate-600'}`}
            >
              All Users ({data.total})
            </button>
            <button
              type="button"
              onClick={() => { setFilterOnline(true); setPage(1); }}
              className={`btn flex-1 sm:flex-none text-xs !py-2 !px-3.5 font-bold flex items-center justify-center gap-1.5 ${filterOnline ? 'btn-green' : 'btn-outline text-slate-600'}`}
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

      {loading && !data ? (
        <Spinner />
      ) : error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : data.items.length === 0 ? (
        <Empty
          icon={Users}
          title={filterOnline ? 'No users currently online' : q ? 'No users match your search' : 'No users yet'}
          text={filterOnline ? 'None of the users have been active in the last 5 minutes.' : "Create users using the 'Add New User' button above."}
        />
      ) : (
        <>
          {/* Mobile User Cards (< md) */}
          <div className="space-y-3 md:hidden">
            {data.items.map((u) => {
              const canManage = isSuper || (u.role !== 'superadmin' && u.role !== 'admin');
              const userInit = (u.name || '?').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
              return (
                <div key={u.id} className="card p-4 space-y-3 border border-slate-200/80 shadow-xs">
                  {/* Top Header */}
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl font-black text-sm shadow-2xs ${
                        u.role === 'superadmin' ? 'bg-purple-100 text-purple-700' :
                        u.role === 'admin' ? 'bg-indigo-100 text-indigo-700' :
                        u.role === 'viewer' ? 'bg-amber-100 text-amber-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {userInit}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-900 text-sm truncate">{u.name}</span>
                          {u.isOnline && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                              <span className="relative flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                              </span>
                              Online
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-mono font-medium text-slate-500 truncate">@{u.username}</div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`badge text-[11px] font-bold ${
                        u.role === 'superadmin' ? 'bg-purple-100 text-purple-700 border border-purple-200' :
                        u.role === 'admin' ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' :
                        u.role === 'viewer' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                        'bg-blue-100 text-blue-700 border border-blue-200'
                      }`}>
                        {u.role === 'superadmin' ? 'Super Admin' : u.role === 'admin' ? 'Admin' : u.role === 'viewer' ? 'Viewer' : 'Team Admin'}
                      </span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${u.active ? 'text-green-700 bg-green-50 border border-green-200' : 'text-slate-500 bg-slate-100'}`}>
                        {u.active ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                  </div>

                  {/* Info Grid: Phone, Teams, Activity */}
                  <div className="grid grid-cols-2 gap-2.5 text-xs pt-2 border-t border-slate-100">
                    <div className="space-y-1">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Phone Number</div>
                      {u.phone ? (
                        <div className="flex items-center gap-1.5">
                          <a href={`tel:${u.phone}`} className="inline-flex items-center gap-1 font-bold text-blue-600 hover:underline">
                            <Phone className="h-3 w-3 shrink-0" /> {u.phone}
                          </a>
                          <a
                            href={`https://wa.me/91${u.phone.replace(/\D/g, '').slice(-10)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-600 hover:text-emerald-700 p-0.5"
                            title="Chat on WhatsApp"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      ) : <span className="text-slate-400">-</span>}
                    </div>

                    <div className="space-y-1">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Team / Access</div>
                      {u.role === 'viewer' ? (
                        u.viewTeamInfo ? (
                          <Link to={`/teams/${u.viewTeamInfo.id}`} className="font-bold text-blue-600 hover:underline truncate block">
                            👁️ {u.viewTeamInfo.name}
                          </Link>
                        ) : <span className="text-slate-400">No team assigned</span>
                      ) : u.teams?.length ? (
                        <div className="flex flex-wrap gap-1">
                          {u.teams.map((t) => (
                            <Link key={t.id} to={`/teams/${t.id}`} className="badge bg-blue-50 text-blue-700 text-[10px] py-0 font-semibold">
                              {t.name}
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400">No team yet</span>
                      )}
                    </div>

                    <div className="space-y-0.5 col-span-2 flex items-center justify-between text-slate-500 pt-1 border-t border-slate-50">
                      <span>Last active: <strong className="text-slate-700">{u.lastActiveAt ? timeAgo(u.lastActiveAt) : 'Never'}</strong></span>
                      <span>Joined: {fmtDate(u.createdAt)?.split(',')[0]}</span>
                    </div>
                  </div>

                  {/* Mobile Action Buttons */}
                  {canManage && u.role !== 'superadmin' && (
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          setFormError('');
                          setShowPassword(false);
                          setForm({
                            id: u.id,
                            name: u.name,
                            username: u.username || '',
                            phone: u.phone || '',
                            role: u.role || 'user',
                            viewTeam: u.viewTeam || '',
                            assignTeam: u.teams?.[0]?.id || '',
                            password: '',
                            active: u.active,
                          });
                        }}
                        className="btn btn-outline flex-1 text-xs !py-2.5 justify-center font-bold text-slate-700"
                      >
                        <Pencil className="h-3.5 w-3.5 mr-1 text-slate-600" /> Edit User / Password
                      </button>
                      {isSuper && (
                        <button
                          type="button"
                          onClick={() => setDel(u)}
                          className="btn btn-ghost text-xs !py-2.5 px-3 text-red-600 hover:bg-red-50 border border-red-200 rounded-xl"
                          title="Delete user"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Desktop Table View (>= md) */}
          <div className="card overflow-x-auto hidden md:block">
            <table className="w-full min-w-[50rem] text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="p-3.5 font-semibold">User</th>
                  <th className="p-3.5 font-semibold">Role</th>
                  <th className="p-3.5 font-semibold">Activity Status</th>
                  <th className="p-3.5 font-semibold">Phone</th>
                  <th className="p-3.5 font-semibold">Team Assignment</th>
                  <th className="p-3.5 font-semibold">Account</th>
                  <th className="p-3.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((u) => {
                  const canManage = isSuper || (u.role !== 'superadmin' && u.role !== 'admin');
                  return (
                    <tr key={u.id} className="border-t border-slate-100 hover:bg-slate-50/70 transition">
                      <td className="p-3.5">
                        <div className="flex items-center gap-2.5">
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
                            <div className="text-xs text-slate-500 font-mono">@{u.username} • Joined {fmtDate(u.createdAt)?.split(',')[0]}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span className={`badge ${
                          u.role === 'superadmin' ? 'bg-purple-100 text-purple-700 font-semibold' :
                          u.role === 'admin' ? 'bg-indigo-100 text-indigo-700 font-semibold' :
                          u.role === 'viewer' ? 'bg-amber-100 text-amber-700 font-semibold' :
                          'bg-blue-100 text-blue-700 font-semibold'
                        }`}>
                          {u.role === 'superadmin' ? 'Super Admin' : u.role === 'admin' ? 'Admin' : u.role === 'viewer' ? 'Viewer' : 'Team Admin'}
                        </span>
                      </td>
                      <td className="p-3.5">
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
                      <td className="p-3.5">
                        {u.phone ? (
                          <div className="flex items-center gap-2">
                            <a href={`tel:${u.phone}`} className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline">
                              <Phone className="h-3 w-3" aria-hidden />{u.phone}
                            </a>
                            <a
                              href={`https://wa.me/91${u.phone.replace(/\D/g, '').slice(-10)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-emerald-600 hover:text-emerald-700"
                              title="Chat on WhatsApp"
                            >
                              <MessageSquare className="h-3.5 w-3.5" />
                            </a>
                          </div>
                        ) : '-'}
                      </td>
                      <td className="p-3.5">
                        {u.role === 'viewer' ? (
                          u.viewTeamInfo ? (
                            <span className="text-xs text-slate-600">Views <Link to={`/teams/${u.viewTeamInfo.id}`} className="font-semibold text-blue-600 hover:underline">{u.viewTeamInfo.name}</Link></span>
                          ) : '-'
                        ) : u.teams?.length ? (
                          <div className="flex flex-wrap gap-1">
                            {u.teams.map((t) => (
                              <Link key={t.id} to={`/teams/${t.id}`} className="badge bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-medium">
                                {t.name}
                              </Link>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">No team yet</span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <span className={`badge ${u.active ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>
                          {u.active ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        {canManage && u.role !== 'superadmin' && (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              className="btn btn-ghost !p-2"
                              onClick={() => {
                                setFormError('');
                                setShowPassword(false);
                                setForm({
                                  id: u.id,
                                  name: u.name,
                                  username: u.username || '',
                                  phone: u.phone || '',
                                  role: u.role || 'user',
                                  viewTeam: u.viewTeam || '',
                                  assignTeam: u.teams?.[0]?.id || '',
                                  password: '',
                                  active: u.active,
                                });
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

      {/* Add / Edit User Modal */}
      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? 'Edit User Credentials' : 'Add New User'}>
        {form && (
          <form onSubmit={save} className="space-y-4" noValidate>
            <ErrorBox message={formError} />

            <Field label="Full Name" required htmlFor="u-name">
              <input
                id="u-name"
                className="input"
                placeholder="e.g. Ramesh Kumar"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Username" required htmlFor="u-username" hint="Used to sign in">
                <input
                  id="u-username"
                  className="input font-mono"
                  autoCapitalize="none"
                  autoCorrect="off"
                  placeholder="e.g. ramesh_score"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                />
              </Field>

              <Field label="Mobile Phone" required htmlFor="u-phone" hint="10-digit mobile number">
                <input
                  id="u-phone"
                  type="tel"
                  className="input"
                  placeholder="e.g. 9876543210"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </Field>
            </div>

            {form.role !== 'superadmin' && (
              <Field label="Role" required htmlFor="u-role">
                <select
                  id="u-role"
                  className="input"
                  value={form.role || 'user'}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  <option value="user">Team Admin (Own team & score update)</option>
                  <option value="viewer">Viewer (Read-only for one team)</option>
                  {isSuper && <option value="admin">Admin (All teams, players & matches)</option>}
                </select>
              </Field>
            )}

            {/* Team assignment dropdown */}
            {form.role === 'viewer' && (
              <Field label="Assign Team to View" required htmlFor="u-viewteam" hint="The team this viewer will see">
                <select
                  id="u-viewteam"
                  className="input"
                  value={form.viewTeam || ''}
                  onChange={(e) => setForm({ ...form, viewTeam: e.target.value })}
                >
                  <option value="">-- Choose a team --</option>
                  {teamsList.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.code || 'No code'}{t.location ? ` - ${t.location}` : ''})
                    </option>
                  ))}
                </select>
              </Field>
            )}

            {(form.role === 'user' || form.role === 'teamadmin') && teamsList.length > 0 && (
              <Field label="Assign to Existing Team (Optional)" htmlFor="u-assignteam" hint="Link this team admin to an existing team">
                <select
                  id="u-assignteam"
                  className="input"
                  value={form.assignTeam || ''}
                  onChange={(e) => setForm({ ...form, assignTeam: e.target.value })}
                >
                  <option value="">-- None (user can create their own team) --</option>
                  {teamsList.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.code || 'No code'})
                    </option>
                  ))}
                </select>
              </Field>
            )}

            {/* Password Field with Show/Hide toggle */}
            <Field
              label={form.id ? 'Password (leave blank to keep current)' : 'Password'}
              required={!form.id}
              htmlFor="u-pass"
              hint="Minimum 4 characters"
            >
              <div className="relative">
                <input
                  id="u-pass"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className="input pr-10"
                  placeholder={form.id ? '•••••••• (unchanged)' : 'Enter password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-hidden"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>

            {form.id && (
              <label className="flex items-center gap-2 text-sm pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded-sm accent-blue-600"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                />
                <span className="font-semibold text-slate-800">Account is Active (can log in)</span>
              </label>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button type="button" className="btn btn-outline" onClick={() => setForm(null)}>
                Cancel
              </button>
              <button className="btn btn-primary font-bold" disabled={busy}>
                {busy ? 'Saving...' : form.id ? 'Save Changes' : 'Create User'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={!!del}
        danger
        title="Delete user account?"
        confirmLabel="Delete User"
        busy={busy}
        onCancel={() => setDel(null)}
        onConfirm={doDelete}
        message={`${del?.name} (@${del?.username}) will lose access immediately. Their teams and matches stay in the app.`}
      />
    </div>
  );
}
