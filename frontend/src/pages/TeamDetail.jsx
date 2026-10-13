import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Eye, Loader2, Pencil, UserRound } from 'lucide-react';
import { api } from '../api.js';
import { useFetch } from '../useFetch.js';
import { ConfirmDialog, ErrorBox, Field, Spinner, TeamLogo } from '../components/ui.jsx';

const slug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 20);

export default function TeamDetail() {
  const { id } = useParams();
  const { data, error, loading, reload } = useFetch(`/teams/${id}`);
  if (loading) return <Spinner />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  const { team, players, record } = data;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link to="/teams" className="btn btn-ghost !p-2" aria-label="Back to teams"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="flex-1 text-xl font-bold text-slate-900">{team.name}</h1>
        {team.canManage && <Link to={`/teams/${team.id}/edit`} className="btn btn-outline"><Pencil className="h-4 w-4" /> Edit</Link>}
      </div>
      <section className="card flex items-center gap-4 p-4">
        <TeamLogo team={team} size={72} />
        <div className="flex-1 text-sm text-slate-600">
          {team.location && <div>{team.location}</div>}
          <div>{team.ballType} · {players.length} players</div>
          {team.description && <p className="mt-1 text-slate-500">{team.description}</p>}
        </div>
      </section>

      <section className="grid grid-cols-4 gap-2 text-center" aria-label="Match record">
        {[['Played', record.played], ['Won', record.won], ['Lost', record.lost], ['Tied', record.tied]].map(([l, v]) => (
          <div key={l} className="card p-3"><div className="text-xl font-bold text-slate-900">{v}</div><div className="text-xs text-slate-500">{l}</div></div>
        ))}
      </section>

      {team.canManage && <ViewerLogin team={team} />}

      <section className="card overflow-x-auto">
        <table className="w-full min-w-[34rem] text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr><th className="p-3">#</th><th className="p-3">Player</th><th className="p-3">Role</th><th className="p-3">Age</th><th className="p-3">Batting</th><th className="p-3">Bowling</th></tr>
          </thead>
          <tbody>
            {players.map((p) => (
              <tr key={p.id} className="border-t border-slate-100">
                <td className="p-3 text-slate-500">{p.jerseyNumber ?? '-'}</td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    {p.photo ? <img src={p.photo} alt="" className="h-8 w-8 rounded-full object-cover" /> : <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-400"><UserRound className="h-4 w-4" /></span>}
                    <span className="font-medium text-slate-900">{p.name}</span>
                  </div>
                </td>
                <td className="p-3">{p.role}</td>
                <td className="p-3">{p.age ?? '-'}</td>
                <td className="p-3">{p.battingStyle || '-'}</td>
                <td className="p-3">{p.bowlingStyle || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

// Owner / Super Admin: one view-only login per team, to share with players and fans.
function ViewerLogin({ team }) {
  const { data, loading, error, reload } = useFetch(`/teams/${team.id}/viewer`);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [removeOpen, setRemoveOpen] = useState(false);
  const viewer = data?.viewer;

  useEffect(() => { if (data && !data.viewer) setUsername(`${slug(team.name)}_view`); }, [data, team.name]);

  const save = async (e, extra = {}) => {
    e?.preventDefault();
    setErr(''); setMsg('');
    if (!viewer && (username.trim().length < 3 || password.length < 4)) return setErr('Enter a username (3+ characters) and a password (4+ characters)');
    if (viewer && !password && extra.active === undefined) return setErr('Enter a new password');
    setBusy(true);
    try {
      await api(`/teams/${team.id}/viewer`, { method: 'PUT', body: { ...(viewer ? {} : { username: username.trim() }), ...(password ? { password } : {}), ...extra } });
      setMsg(viewer ? (password ? 'Password changed.' : 'Saved.') : `View login created. Share this with your players: username ${username.trim().toLowerCase()}, password ${password}`);
      setPassword('');
      reload();
    } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };

  const remove = async () => {
    setBusy(true);
    try { await api(`/teams/${team.id}/viewer`, { method: 'DELETE' }); setRemoveOpen(false); setMsg(''); reload(); }
    catch (x) { setErr(x.message); setRemoveOpen(false); } finally { setBusy(false); }
  };

  return (
    <section className="card space-y-3 p-4">
      <div className="flex items-center gap-2">
        <Eye className="h-5 w-5 text-blue-600" aria-hidden />
        <h2 className="font-bold text-slate-900">View-only login for {team.name}</h2>
      </div>
      <p className="text-sm text-slate-500">Give this username and a simple password to your players or fans. They can log in and see this team, its players and its matches with live scores, but they cannot change anything.</p>
      {loading ? <Spinner /> : error ? <ErrorBox message={error} onRetry={reload} /> : (
        <form onSubmit={save} className="space-y-3" noValidate>
          <ErrorBox message={err} />
          {msg && <p className="rounded-lg bg-green-50 p-3 text-sm text-green-800" role="status">{msg}</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Username" htmlFor="v-user">
              <input id="v-user" autoCapitalize="none" className="input" value={viewer ? viewer.username : username} disabled={!!viewer} onChange={(e) => setUsername(e.target.value)} />
            </Field>
            <Field label={viewer ? 'New password' : 'Password'} htmlFor="v-pass" hint="Simple, 4 or more characters">
              <input id="v-pass" type="text" autoComplete="off" className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
            </Field>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button className="btn btn-primary" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} {viewer ? 'Change password' : 'Create view login'}</button>
            {viewer && (
              <>
                <button type="button" className="btn btn-outline" disabled={busy} onClick={() => save(null, { active: !viewer.active })}>{viewer.active ? 'Switch off' : 'Switch on'}</button>
                <button type="button" className="btn btn-ghost text-red-600" disabled={busy} onClick={() => setRemoveOpen(true)}>Remove</button>
                <span className={`badge ${viewer.active ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>{viewer.active ? 'Active' : 'Switched off'}</span>
              </>
            )}
          </div>
        </form>
      )}
      <ConfirmDialog open={removeOpen} danger title="Remove view login?" confirmLabel="Remove" busy={busy} onCancel={() => setRemoveOpen(false)} onConfirm={remove}
        message="Anyone using this username and password will lose access. You can create a new one later." />
    </section>
  );
}
