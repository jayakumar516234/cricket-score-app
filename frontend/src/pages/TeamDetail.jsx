import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  UserRound,
  BarChart3,
  Check,
  Copy,
  Handshake,
  Clock,
  Trophy,
  ChevronDown,
  ChevronUp,
  Trash2,
  KeyRound,
  ShieldCheck,
  Phone,
  UserCheck,
  Shield,
} from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useFetch } from '../useFetch.js';
import { ConfirmDialog, ErrorBox, Field, Modal, Spinner, TeamLogo } from '../components/ui.jsx';
import { PlayerCardModal } from '../components/PlayerCardModal.jsx';

const slug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 20);

export default function TeamDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { data, error, loading, reload } = useFetch(`/teams/${id}`);
  const [tab, setTab] = useState('squad');
  const [copied, setCopied] = useState(false);

  if (loading) return <Spinner />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  const { team, players, record } = data;
  const canSeeCode = user?.role !== 'viewer' && (user?.role === 'superadmin' || user?.role === 'admin' || team.canManage);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link to="/teams" className="btn btn-ghost !p-2" aria-label="Back to teams"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="flex-1 text-xl font-bold text-slate-900">{team.name}</h1>
        {team.canManage && <Link to={`/teams/${team.id}/edit`} className="btn btn-outline"><Pencil className="h-4 w-4" /> Update Team</Link>}
      </div>

      <section className="card p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <TeamLogo team={team} size={72} />
          <div className="flex-1 text-sm text-slate-600">
            {team.location && <div className="font-medium text-slate-800">{team.location}</div>}
            <div>{team.ballType} · {players.length} players</div>
            {team.description && <p className="mt-1 text-slate-500">{team.description}</p>}
          </div>
          {team.code && canSeeCode && (
            <div className="rounded-xl border border-pitch-200 bg-pitch-50/70 p-3 sm:text-right">
              <div className="text-xs font-semibold uppercase tracking-wider text-pitch-700">Team Code</div>
              <div className="mt-0.5 flex items-center gap-2 sm:justify-end">
                <span className="font-mono text-xl font-bold tracking-widest text-pitch-900">{team.code}</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(team.code);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="inline-flex items-center gap-1 rounded bg-white px-2 py-1 text-xs font-medium text-slate-700 shadow-sm border border-slate-200 hover:bg-slate-50 transition"
                  title="Copy team code"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5 text-slate-500" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <div className="mt-1 text-[11px] text-pitch-600">Give this code to opponents to connect</div>
            </div>
          )}
        </div>
      </section>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 text-center" aria-label="Match record">
        {[
          ['Played', record.played, 'border-blue-200/80 bg-blue-50/40 text-blue-700'],
          ['Won', record.won, 'border-emerald-200/80 bg-emerald-50/40 text-emerald-700'],
          ['Lost', record.lost, 'border-red-200/80 bg-red-50/40 text-red-700'],
          ['Tied', record.tied, 'border-amber-200/80 bg-amber-50/40 text-amber-700'],
        ].map(([l, v, tone]) => (
          <div key={l} className={`card p-3 sm:p-4 border ${tone.split(' ')[0]} ${tone.split(' ')[1]}`}>
            <div className={`text-2xl font-extrabold ${tone.split(' ')[2]}`}>{v}</div>
            <div className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 mt-0.5">{l}</div>
          </div>
        ))}
      </section>

      {team.canManage && <TeamCredentialsManager team={team} />}

      {/* Tab switcher */}
      <div className="flex gap-1.5 rounded-xl bg-slate-200/70 p-1.5 shadow-2xs">
        <button onClick={() => setTab('squad')} className={`flex-1 rounded-lg px-3 py-2 text-xs sm:text-sm font-bold transition ${tab === 'squad' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}>Squad ({players.length})</button>
        <button onClick={() => setTab('stats')} className={`flex-1 rounded-lg px-3 py-2 text-xs sm:text-sm font-bold transition ${tab === 'stats' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}><BarChart3 className="mr-1 inline h-3.5 w-3.5" />Stats</button>
        <button onClick={() => setTab('opponents')} className={`flex-1 rounded-lg px-3 py-2 text-xs sm:text-sm font-bold transition ${tab === 'opponents' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}><Handshake className="mr-1 inline h-3.5 w-3.5" />Opponents</button>
      </div>

      {tab === 'squad' ? (
        <section className="card overflow-hidden border border-slate-200/80">
          {/* Mobile Player Cards (< sm) */}
          <div className="divide-y divide-slate-100 sm:hidden">
            {players.map((p) => (
              <div key={p.id} className="p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative shrink-0">
                    {p.photo ? (
                      <img src={p.photo} alt="" className="h-10 w-10 rounded-full object-cover border border-slate-200" />
                    ) : (
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                        <UserRound className="h-5 w-5" />
                      </span>
                    )}
                    {p.jerseyNumber !== null && p.jerseyNumber !== undefined && (
                      <span className="absolute -bottom-1 -right-1 flex h-4.5 min-w-[1.125rem] px-1 items-center justify-center rounded-full bg-navy-800 text-[10px] font-bold text-white shadow-2xs">
                        #{p.jerseyNumber}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 text-sm truncate">{p.name}</div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {p.battingStyle || p.bowlingStyle ? `${p.battingStyle || ''}${p.battingStyle && p.bowlingStyle ? ' • ' : ''}${p.bowlingStyle || ''}` : p.age ? `Age ${p.age}` : 'Player'}
                    </div>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <span className="badge bg-slate-100 text-slate-700 text-[11px] font-semibold">
                    {p.role}
                  </span>
                  {p.age && <div className="text-[10px] text-slate-400 mt-0.5">{p.age} yrs</div>}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View (>= sm) */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 border-b border-slate-200">
                <tr><th className="p-3">#</th><th className="p-3">Player</th><th className="p-3">Role</th><th className="p-3">Age</th><th className="p-3">Batting</th><th className="p-3">Bowling</th></tr>
              </thead>
              <tbody>
                {players.map((p) => (
                  <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50/60 transition">
                    <td className="p-3 font-mono font-bold text-slate-600">{p.jerseyNumber ?? '-'}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {p.photo ? <img src={p.photo} alt="" className="h-8 w-8 rounded-full object-cover" /> : <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-400"><UserRound className="h-4 w-4" /></span>}
                        <span className="font-medium text-slate-900">{p.name}</span>
                      </div>
                    </td>
                    <td className="p-3"><span className="badge bg-slate-100 text-slate-700 text-xs">{p.role}</span></td>
                    <td className="p-3">{p.age ?? '-'}</td>
                    <td className="p-3 text-xs text-slate-600">{p.battingStyle || '-'}</td>
                    <td className="p-3 text-xs text-slate-600">{p.bowlingStyle || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : tab === 'stats' ? (
        <PlayerStats teamId={team.id} teamName={team.name} teamLogo={team.logo} />
      ) : (
        <OpponentsSection team={team} />
      )}
    </div>
  );
}

// ---- Player Career Stats ----
function PlayerStats({ teamId, teamName, teamLogo }) {
  const { data, error, loading, reload } = useFetch(`/teams/${teamId}/player-stats`);
  const [view, setView] = useState('batting');
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  if (loading) return <Spinner label="Calculating stats..." />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;

  const stats = data.stats || [];
  const hasBatting = stats.some((s) => s.innings > 0);
  const hasBowling = stats.some((s) => s.bowlingInnings > 0);
  const hasFielding = stats.some((s) => s.catches > 0 || s.runOuts > 0 || s.stumpings > 0);

  if (!hasBatting && !hasBowling && !hasFielding) {
    return (
      <div className="card flex flex-col items-center p-8 text-center">
        <BarChart3 className="mb-3 h-10 w-10 text-slate-300" />
        <h3 className="font-semibold text-slate-700">No stats yet</h3>
        <p className="mt-1 text-sm text-slate-500">Player statistics will appear here after matches are played.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Sub-tabs: Batting / Bowling / Fielding & Career Card Hint */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          {['batting', 'bowling', 'fielding'].map((v) => (
            <button key={v} onClick={() => setView(v)} className={`rounded-full px-4 py-1.5 text-xs font-semibold capitalize transition ${view === v ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{v}</button>
          ))}
        </div>
        <div className="text-[11px] text-slate-500 font-medium hidden sm:flex items-center gap-1">
          <span>💡 Click any player row to view career card & share</span>
        </div>
      </div>

      <section className="card overflow-x-auto">
        {view === 'batting' && (
          <table className="w-full min-w-[44rem] text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="p-3">Player</th>
                <th className="p-3 text-center">M</th>
                <th className="p-3 text-center">Inn</th>
                <th className="p-3 text-center">Runs</th>
                <th className="p-3 text-center">Balls</th>
                <th className="p-3 text-center">4s</th>
                <th className="p-3 text-center">6s</th>
                <th className="p-3 text-center">HS</th>
                <th className="p-3 text-center">NO</th>
                <th className="p-3 text-center">Avg</th>
                <th className="p-3 text-center">SR</th>
              </tr>
            </thead>
            <tbody>
              {stats.filter((s) => s.matches > 0).sort((a, b) => b.runs - a.runs).map((s) => (
                <tr key={s.id} onClick={() => setSelectedPlayer(s)} className="border-t border-slate-100 hover:bg-blue-50/60 cursor-pointer transition group">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900 group-hover:text-blue-600 transition">{s.name}</span>
                      <span className="text-[10px] text-blue-600 bg-blue-50 border border-blue-200/60 px-1.5 py-0.2 rounded font-medium opacity-80 group-hover:opacity-100">Card</span>
                    </div>
                  </td>
                  <td className="p-3 text-center">{s.matches}</td>
                  <td className="p-3 text-center">{s.innings}</td>
                  <td className="p-3 text-center font-semibold text-slate-900">{s.runs}</td>
                  <td className="p-3 text-center">{s.ballsFaced}</td>
                  <td className="p-3 text-center">{s.fours}</td>
                  <td className="p-3 text-center">{s.sixes}</td>
                  <td className="p-3 text-center font-semibold">{s.highestScore}</td>
                  <td className="p-3 text-center">{s.notOuts}</td>
                  <td className="p-3 text-center">{s.battingAvg ?? 'N/O'}</td>
                  <td className="p-3 text-center">{s.strikeRate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {view === 'bowling' && (
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="p-3">Player</th>
                <th className="p-3 text-center">M</th>
                <th className="p-3 text-center">Inn</th>
                <th className="p-3 text-center">Overs</th>
                <th className="p-3 text-center">Runs</th>
                <th className="p-3 text-center">Wkts</th>
                <th className="p-3 text-center">Avg</th>
                <th className="p-3 text-center">Econ</th>
              </tr>
            </thead>
            <tbody>
              {stats.filter((s) => s.bowlingInnings > 0).sort((a, b) => b.wickets - a.wickets).map((s) => (
                <tr key={s.id} onClick={() => setSelectedPlayer(s)} className="border-t border-slate-100 hover:bg-blue-50/60 cursor-pointer transition group">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900 group-hover:text-blue-600 transition">{s.name}</span>
                      <span className="text-[10px] text-blue-600 bg-blue-50 border border-blue-200/60 px-1.5 py-0.2 rounded font-medium opacity-80 group-hover:opacity-100">Card</span>
                    </div>
                  </td>
                  <td className="p-3 text-center">{s.matches}</td>
                  <td className="p-3 text-center">{s.bowlingInnings}</td>
                  <td className="p-3 text-center">{s.oversDisplay}</td>
                  <td className="p-3 text-center">{s.runsConceded}</td>
                  <td className="p-3 text-center font-semibold text-slate-900">{s.wickets}</td>
                  <td className="p-3 text-center">{s.bowlingAvg ?? '-'}</td>
                  <td className="p-3 text-center">{s.economyRate ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {view === 'fielding' && (
          <table className="w-full min-w-[28rem] text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="p-3">Player</th>
                <th className="p-3 text-center">M</th>
                <th className="p-3 text-center">Catches</th>
                <th className="p-3 text-center">Run Outs</th>
                <th className="p-3 text-center">Stumpings</th>
                <th className="p-3 text-center">Total</th>
              </tr>
            </thead>
            <tbody>
              {stats.filter((s) => s.catches + s.runOuts + s.stumpings > 0).sort((a, b) => (b.catches + b.runOuts + b.stumpings) - (a.catches + a.runOuts + a.stumpings)).map((s) => (
                <tr key={s.id} onClick={() => setSelectedPlayer(s)} className="border-t border-slate-100 hover:bg-blue-50/60 cursor-pointer transition group">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900 group-hover:text-blue-600 transition">{s.name}</span>
                      <span className="text-[10px] text-blue-600 bg-blue-50 border border-blue-200/60 px-1.5 py-0.2 rounded font-medium opacity-80 group-hover:opacity-100">Card</span>
                    </div>
                  </td>
                  <td className="p-3 text-center">{s.matches}</td>
                  <td className="p-3 text-center">{s.catches}</td>
                  <td className="p-3 text-center">{s.runOuts}</td>
                  <td className="p-3 text-center">{s.stumpings}</td>
                  <td className="p-3 text-center font-semibold text-slate-900">{s.catches + s.runOuts + s.stumpings}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Career Player Card Modal */}
      <PlayerCardModal
        player={selectedPlayer}
        teamName={teamName}
        teamLogo={teamLogo}
        open={!!selectedPlayer}
        onClose={() => setSelectedPlayer(null)}
      />
    </div>
  );
}

// Team Credentials Manager (Manages both View-only login and Team Admin login)
function TeamCredentialsManager({ team }) {
  const { user } = useAuth();
  const [credTab, setCredTab] = useState('viewer'); // 'viewer' or 'admin'
  const { data, loading, error, reload } = useFetch(`/teams/${team.id}/viewer`);

  // Viewer login form states
  const [vUsername, setVUsername] = useState('');
  const [vPassword, setVPassword] = useState('');
  const [vPhone, setVPhone] = useState('');
  const [showVPassword, setShowVPassword] = useState(false);
  const [vBusy, setVBusy] = useState(false);
  const [vMsg, setVMsg] = useState('');
  const [vErr, setVErr] = useState('');
  const [removeOpen, setRemoveOpen] = useState(false);
  const [vCopied, setVCopied] = useState(false);

  // Team Admin login form states
  const [adminModal, setAdminModal] = useState(false);
  const [aName, setAName] = useState('');
  const [aUsername, setAUsername] = useState('');
  const [aPhone, setAPhone] = useState('');
  const [aPassword, setAPassword] = useState('');
  const [showAPassword, setShowAPassword] = useState(false);
  const [aBusy, setABusy] = useState(false);
  const [aMsg, setAMsg] = useState('');
  const [aErr, setAErr] = useState('');

  const viewer = data?.viewer;
  const teamAdmin = data?.teamAdmin;

  const isSuperOrAdmin = user?.role === 'superadmin' || user?.role === 'admin';
  const isTeamOwner = String(user?._id) === String(team.createdBy);
  const canEditTeamAdmin = isSuperOrAdmin || isTeamOwner;

  // Initialize viewer fields when data arrives
  useState(() => {
    if (data?.viewer) {
      setVUsername(data.viewer.username);
      setVPhone(data.viewer.phone || '');
    } else if (data && !data.viewer) {
      setVUsername(`${slug(team.name)}_view`);
    }
  }, [data, team.name]);

  const saveViewer = async (e, extra = {}) => {
    e?.preventDefault();
    setVErr('');
    setVMsg('');
    if (!vUsername.trim() || vUsername.trim().length < 3) {
      return setVErr('Enter a valid username (3+ letters or numbers)');
    }
    if (!viewer && (!vPassword || vPassword.length < 4)) {
      return setVErr('Enter a password (at least 4 characters)');
    }
    if (viewer && vPassword && vPassword.length < 4) {
      return setVErr('New password must be at least 4 characters');
    }

    setVBusy(true);
    try {
      await api(`/teams/${team.id}/viewer`, {
        method: 'PUT',
        body: {
          username: vUsername.trim().toLowerCase(),
          phone: vPhone.trim() || undefined,
          ...(vPassword ? { password: vPassword } : {}),
          ...extra,
        },
      });
      setVMsg(
        viewer
          ? vPassword
            ? 'Viewer credentials and password updated successfully.'
            : 'Viewer credentials updated.'
          : `View login created! Username: ${vUsername.trim().toLowerCase()}, Password: ${vPassword}`
      );
      setVPassword('');
      reload();
    } catch (x) {
      setVErr(x.message);
    } finally {
      setVBusy(false);
    }
  };

  const removeViewer = async () => {
    setVBusy(true);
    try {
      await api(`/teams/${team.id}/viewer`, { method: 'DELETE' });
      setRemoveOpen(false);
      setVMsg('');
      reload();
    } catch (x) {
      setVErr(x.message);
      setRemoveOpen(false);
    } finally {
      setVBusy(false);
    }
  };

  const openAdminEdit = () => {
    setAErr('');
    setAMsg('');
    setShowAPassword(false);
    setAName(teamAdmin?.name || '');
    setAUsername(teamAdmin?.username || '');
    setAPhone(teamAdmin?.phone || '');
    setAPassword('');
    setAdminModal(true);
  };

  const saveAdminCredentials = async (e) => {
    e.preventDefault();
    setAErr('');
    if (!aUsername.trim() || aUsername.trim().length < 3) {
      return setAErr('Username must be at least 3 characters');
    }
    if (aPassword && aPassword.length < 4) {
      return setAErr('Password must be at least 4 characters');
    }
    setABusy(true);
    try {
      await api(`/teams/${team.id}/admin-login`, {
        method: 'PUT',
        body: {
          name: aName.trim() || undefined,
          username: aUsername.trim().toLowerCase(),
          phone: aPhone.trim() || undefined,
          ...(aPassword ? { password: aPassword } : {}),
        },
      });
      setAdminModal(false);
      setAMsg('Team Admin login credentials updated successfully!');
      reload();
    } catch (err) {
      setAErr(err.message);
    } finally {
      setABusy(false);
    }
  };

  const copyViewerCreds = () => {
    const credText = `Team: ${team.name}\nViewer Login Username: ${viewer?.username || vUsername}\nPassword: ${vPassword || '(Use your configured password)'}`;
    navigator.clipboard?.writeText(credText);
    setVCopied(true);
    setTimeout(() => setVCopied(false), 2000);
  };

  return (
    <section className="card p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900 text-base">Team Logins & Access Credentials</h2>
            <p className="text-xs text-slate-500">Manage usernames and passwords for this team's admin and view-only accounts.</p>
          </div>
        </div>

        {/* Tab switch between Viewer and Team Admin */}
        <div className="flex rounded-lg bg-slate-100 p-1 self-start sm:self-auto text-xs font-semibold">
          <button
            type="button"
            onClick={() => setCredTab('viewer')}
            className={`rounded-md px-3 py-1.5 transition ${credTab === 'viewer' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
          >
            👁️ Viewer Login
          </button>
          <button
            type="button"
            onClick={() => setCredTab('admin')}
            className={`rounded-md px-3 py-1.5 transition ${credTab === 'admin' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
          >
            🛡️ Team Admin Login
          </button>
        </div>
      </div>

      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : credTab === 'viewer' ? (
        /* Viewer Login Section */
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">View-Only Account</span>
              <p className="text-xs text-slate-500 mt-0.5">
                Share this login with your players or fans. They can view live scores, squad and match stats, but cannot change anything.
              </p>
            </div>
            {viewer && (
              <span className={`badge shrink-0 self-start sm:self-auto ${viewer.active ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>
                {viewer.active ? 'Active' : 'Switched off'}
              </span>
            )}
          </div>

          <form onSubmit={saveViewer} className="space-y-3" noValidate>
            <ErrorBox message={vErr} />
            {vMsg && <p className="rounded-lg bg-green-50 p-3 text-xs sm:text-sm text-green-800 font-medium" role="status">{vMsg}</p>}

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Viewer Username" htmlFor="v-user" hint="Can be edited anytime">
                <input
                  id="v-user"
                  autoCapitalize="none"
                  autoCorrect="off"
                  className="input font-mono"
                  value={vUsername}
                  onChange={(e) => setVUsername(e.target.value)}
                />
              </Field>

              <Field
                label={viewer ? 'New Password (or leave blank)' : 'Password'}
                htmlFor="v-pass"
                hint="Minimum 4 characters"
              >
                <div className="relative">
                  <input
                    id="v-pass"
                    type={showVPassword ? 'text' : 'password'}
                    autoComplete="off"
                    className="input pr-10"
                    placeholder={viewer ? '•••••••• (leave blank to keep)' : 'Enter password'}
                    value={vPassword}
                    onChange={(e) => setVPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowVPassword(!showVPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    title={showVPassword ? 'Hide password' : 'Show password'}
                  >
                    {showVPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </Field>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button className="btn btn-primary font-bold" disabled={vBusy}>
                {vBusy && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                {viewer ? 'Save Viewer Changes' : 'Create Viewer Login'}
              </button>

              {viewer && (
                <>
                  <button
                    type="button"
                    className="btn btn-outline"
                    disabled={vBusy}
                    onClick={() => saveViewer(null, { active: !viewer.active })}
                  >
                    {viewer.active ? 'Switch Off' : 'Switch On'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={copyViewerCreds}
                    title="Copy viewer credentials"
                  >
                    {vCopied ? <Check className="h-4 w-4 text-emerald-600 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                    {vCopied ? 'Copied!' : 'Copy Login'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost text-red-600 hover:bg-red-50"
                    disabled={vBusy}
                    onClick={() => setRemoveOpen(true)}
                  >
                    Remove Login
                  </button>
                </>
              )}
            </div>
          </form>

          <ConfirmDialog
            open={removeOpen}
            danger
            title="Remove Viewer Login?"
            confirmLabel="Remove Login"
            busy={vBusy}
            onCancel={() => setRemoveOpen(false)}
            onConfirm={removeViewer}
            message="Anyone using this username and password will lose access. You can create a new view login later."
          />
        </div>
      ) : (
        /* Team Admin Login Section */
        <div className="space-y-3">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Team Admin / Scorer Account</span>
            <p className="text-xs text-slate-500 mt-0.5">
              The manager/owner of this team. Can add players, schedule matches, update ball-by-ball score, and manage opponents.
            </p>
          </div>

          {aMsg && <p className="rounded-lg bg-green-50 p-3 text-xs sm:text-sm text-green-800 font-medium" role="status">{aMsg}</p>}

          {teamAdmin ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 font-black text-blue-700 text-sm">
                    {(teamAdmin.name || '?').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-sm">{teamAdmin.name}</div>
                    <div className="text-xs font-mono text-slate-500">@{teamAdmin.username}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`badge text-[11px] font-bold ${teamAdmin.active ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>
                    {teamAdmin.active ? 'Active' : 'Disabled'}
                  </span>
                  {canEditTeamAdmin && (
                    <button
                      type="button"
                      onClick={openAdminEdit}
                      className="btn btn-outline text-xs !py-1.5 !px-3 font-bold"
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1" /> Edit Credentials / Password
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-200/60 text-slate-600">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Phone Number</span>
                  <span className="font-medium text-slate-900">{teamAdmin.phone || 'Not provided'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Last Activity</span>
                  <span className="font-medium text-slate-900">{teamAdmin.lastActiveAt ? timeAgo(teamAdmin.lastActiveAt) : 'Never'}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500">
              No Team Admin assigned directly. This team is managed by the system administrator.
            </div>
          )}

          {/* Edit Team Admin Modal */}
          <Modal open={adminModal} onClose={() => setAdminModal(false)} title={`Edit Team Admin for ${team.name}`}>
            <form onSubmit={saveAdminCredentials} className="space-y-4" noValidate>
              <ErrorBox message={aErr} />

              <Field label="Full Name" required htmlFor="ta-name">
                <input
                  id="ta-name"
                  className="input"
                  value={aName}
                  onChange={(e) => setAName(e.target.value)}
                />
              </Field>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Username" required htmlFor="ta-user" hint="For login">
                  <input
                    id="ta-user"
                    autoCapitalize="none"
                    autoCorrect="off"
                    className="input font-mono"
                    value={aUsername}
                    onChange={(e) => setAUsername(e.target.value)}
                  />
                </Field>

                <Field label="Mobile Phone" htmlFor="ta-phone" hint="10-digit number">
                  <input
                    id="ta-phone"
                    type="tel"
                    className="input"
                    value={aPhone}
                    onChange={(e) => setAPhone(e.target.value)}
                  />
                </Field>
              </div>

              <Field
                label="New Password (leave blank to keep current)"
                htmlFor="ta-pass"
                hint="Minimum 4 characters"
              >
                <div className="relative">
                  <input
                    id="ta-pass"
                    type={showAPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    className="input pr-10"
                    placeholder="•••••••• (leave blank to keep)"
                    value={aPassword}
                    onChange={(e) => setAPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowAPassword(!showAPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    title={showAPassword ? 'Hide password' : 'Show password'}
                  >
                    {showAPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </Field>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button type="button" className="btn btn-outline" onClick={() => setAdminModal(false)}>
                  Cancel
                </button>
                <button className="btn btn-primary font-bold" disabled={aBusy}>
                  {aBusy ? 'Saving...' : 'Save Admin Credentials'}
                </button>
              </div>
            </form>
          </Modal>
        </div>
      )}
    </section>
  );
}

// ---- Connected Opponents & Requests Section ----
function OpponentsSection({ team }) {
  const { data, loading, error, reload } = useFetch(`/teams/${team.id}/connections`);
  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const [formMsg, setFormMsg] = useState('');
  const [formErr, setFormErr] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [expandedOppId, setExpandedOppId] = useState(null);

  const connect = async (e) => {
    e.preventDefault();
    setFormMsg('');
    setFormErr('');
    if (!code.trim()) return setFormErr('Enter a team code');
    setSending(true);
    try {
      const res = await api(`/teams/${team.id}/connect`, {
        method: 'POST',
        body: { code: code.trim() },
      });
      setFormMsg(res.message || 'Opponent request sent successfully!');
      setCode('');
      reload();
    } catch (err) {
      setFormErr(err.message);
    } finally {
      setSending(false);
    }
  };

  const respond = async (connId, status) => {
    setActionBusy(true);
    try {
      await api(`/teams/${team.id}/connections/${connId}`, {
        method: 'PUT',
        body: { status },
      });
      reload();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionBusy(false);
    }
  };

  const remove = async (connId) => {
    if (!confirm('Remove this opponent connection?')) return;
    setActionBusy(true);
    try {
      await api(`/teams/${team.id}/connections/${connId}`, { method: 'DELETE' });
      reload();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionBusy(false);
    }
  };

  if (loading) return <Spinner label="Loading opponents..." />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;

  const { connected = [], incoming = [], outgoing = [] } = data || {};

  return (
    <div className="space-y-4">
      {/* Send request card */}
      {team.canManage && (
        <div className="card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Handshake className="h-5 w-5 text-pitch-600" />
            <h2 className="font-bold text-slate-900">Connect with an Opponent Team</h2>
          </div>
          <p className="text-xs text-slate-500">
            Ask the opponent team admin for their 6-character Team Code, enter it below, and send a request. Once they accept, their team, players and career stats will be available here, and you can play matches together.
          </p>
          <form onSubmit={connect} className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              placeholder="e.g. CSK829"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={10}
              className="input uppercase font-mono tracking-wider sm:w-56"
            />
            <button type="submit" className="btn btn-primary" disabled={sending}>
              {sending && <Loader2 className="h-4 w-4 animate-spin" />}
              Send Opponent Request
            </button>
          </form>
          {formErr && <p className="text-xs font-medium text-red-600">{formErr}</p>}
          {formMsg && <p className="text-xs font-medium text-green-600">{formMsg}</p>}
        </div>
      )}

      {/* Incoming requests (needs acceptance) */}
      {incoming.length > 0 && (
        <div className="card border-amber-200 bg-amber-50/50 p-4 space-y-3">
          <div className="flex items-center gap-2 text-amber-900">
            <Clock className="h-5 w-5 text-amber-600" />
            <h2 className="font-bold">Incoming Opponent Requests ({incoming.length})</h2>
          </div>
          <p className="text-xs text-amber-800">These teams want to connect with you. Accept to allow match scheduling and player stats exchange.</p>
          <div className="space-y-2">
            {incoming.map((inc) => (
              <div key={inc.connectionId} className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <TeamLogo team={inc.fromTeam} size={40} />
                  <div>
                    <div className="font-semibold text-slate-900">{inc.fromTeam.name}</div>
                    <div className="text-xs text-slate-500">{inc.fromTeam.ballType}{inc.fromTeam.location ? ` · ${inc.fromTeam.location}` : ''}</div>
                  </div>
                </div>
                {team.canManage && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={actionBusy}
                      onClick={() => respond(inc.connectionId, 'accepted')}
                      className="btn btn-green text-xs !py-1.5 !px-3"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      disabled={actionBusy}
                      onClick={() => respond(inc.connectionId, 'rejected')}
                      className="btn btn-outline text-xs !py-1.5 !px-3 text-red-600 hover:bg-red-50 hover:border-red-200"
                    >
                      Decline
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Outgoing pending requests */}
      {outgoing.length > 0 && (
        <div className="card p-4 space-y-2">
          <div className="flex items-center gap-2 text-slate-700">
            <Clock className="h-4 w-4 text-slate-400" />
            <h3 className="text-sm font-semibold">Sent Requests (Awaiting Opponent Acceptance)</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {outgoing.map((out) => (
              <div key={out.connectionId} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <TeamLogo team={out.toTeam} size={32} />
                  <span className="text-sm font-medium text-slate-800">{out.toTeam.name}</span>
                </div>
                {team.canManage && (
                  <button
                    type="button"
                    disabled={actionBusy}
                    onClick={() => remove(out.connectionId)}
                    className="btn btn-ghost text-xs text-red-600"
                  >
                    Cancel
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Accepted Connected Opponents */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Handshake className="h-5 w-5 text-pitch-600" />
          Connected Opponents ({connected.length})
        </h2>
        {connected.length === 0 ? (
          <div className="card p-8 text-center text-slate-500">
            <Handshake className="mx-auto mb-2 h-10 w-10 text-slate-300" />
            <p className="font-semibold text-slate-700">No connected opponent teams yet</p>
            <p className="mt-1 text-xs text-slate-500">
              {team.code ? (
                <>Share your Team Code (<strong>{team.code}</strong>) or enter an opponent's code above to connect. </>
              ) : (
                <>Connect with opponents using their Team Code. </>
              )}
              Once accepted, their team, full squad and player stats will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {connected.map((item) => {
              const opp = item.team;
              const isExpanded = expandedOppId === opp.id;
              return (
                <div key={item.connectionId} className="card overflow-hidden">
                  <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <TeamLogo team={opp} size={48} />
                      <div>
                        <div className="font-bold text-slate-900">{opp.name}</div>
                        <div className="text-xs text-slate-500">
                          {opp.playerCount || 0} players · {opp.ballType}{opp.location ? ` · ${opp.location}` : ''}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/matches/new?home=${team.id}&away=${opp.id}`}
                        className="btn btn-green text-xs !py-1.5 !px-3"
                      >
                        <Trophy className="h-3.5 w-3.5" /> Play Match
                      </Link>
                      <button
                        type="button"
                        onClick={() => setExpandedOppId(isExpanded ? null : opp.id)}
                        className="btn btn-outline text-xs !py-1.5 !px-3"
                      >
                        {isExpanded ? 'Hide Players & Stats' : 'View Players & Stats'}
                        {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>
                      {team.canManage && (
                        <button
                          type="button"
                          disabled={actionBusy}
                          onClick={() => remove(item.connectionId)}
                          className="btn btn-ghost text-xs text-red-600 !p-1.5"
                          title="Disconnect opponent"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded Opponent Squad & Player Stats */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50/50 p-4">
                      <OpponentSquadAndStats teamId={opp.id} teamName={opp.name} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// Sub-component to render an opponent's squad and their player career stats
function OpponentSquadAndStats({ teamId, teamName }) {
  const { data: teamData, loading: teamLoading } = useFetch(`/teams/${teamId}`);
  const { data: statsData, loading: statsLoading } = useFetch(`/teams/${teamId}/player-stats`);
  const [subTab, setSubTab] = useState('squad');

  if (teamLoading || statsLoading) return <Spinner label={`Loading ${teamName} squad & stats...`} />;

  const players = teamData?.players || [];
  const stats = statsData?.stats || [];

  return (
    <div className="space-y-3">
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setSubTab('squad')}
          className={`px-3 py-1 text-xs font-semibold rounded-md transition ${subTab === 'squad' ? 'bg-pitch-600 text-white' : 'text-slate-600 hover:bg-slate-200'}`}
        >
          Squad ({players.length})
        </button>
        <button
          onClick={() => setSubTab('stats')}
          className={`px-3 py-1 text-xs font-semibold rounded-md transition ${subTab === 'stats' ? 'bg-pitch-600 text-white' : 'text-slate-600 hover:bg-slate-200'}`}
        >
          Player Career Stats ({stats.length})
        </button>
      </div>

      {subTab === 'squad' ? (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full min-w-[28rem] text-left text-xs">
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="p-2">#</th>
                <th className="p-2">Player</th>
                <th className="p-2">Role</th>
                <th className="p-2">Batting</th>
                <th className="p-2">Bowling</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {players.map((p) => (
                <tr key={p.id}>
                  <td className="p-2 text-slate-400 font-mono">{p.jerseyNumber ?? '-'}</td>
                  <td className="p-2 font-medium text-slate-900">{p.name}</td>
                  <td className="p-2 text-slate-600">{p.role}</td>
                  <td className="p-2 text-slate-600">{p.battingStyle || '-'}</td>
                  <td className="p-2 text-slate-600">{p.bowlingStyle || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full min-w-[34rem] text-left text-xs">
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="p-2">Player</th>
                <th className="p-2 text-center">Mat</th>
                <th className="p-2 text-center">Runs</th>
                <th className="p-2 text-center">HS</th>
                <th className="p-2 text-center">Avg</th>
                <th className="p-2 text-center">SR</th>
                <th className="p-2 text-center">Wkts</th>
                <th className="p-2 text-center">Overs</th>
                <th className="p-2 text-center">Econ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats.map((s) => (
                <tr key={s.id}>
                  <td className="p-2 font-medium text-slate-900">{s.name}</td>
                  <td className="p-2 text-center text-slate-600">{s.matches}</td>
                  <td className="p-2 text-center font-bold text-slate-800">{s.runs}</td>
                  <td className="p-2 text-center text-slate-600">{s.highestScore}</td>
                  <td className="p-2 text-center text-slate-600">{s.battingAvg ?? '-'}</td>
                  <td className="p-2 text-center text-slate-600">{s.strikeRate ?? '-'}</td>
                  <td className="p-2 text-center font-bold text-slate-800">{s.wickets}</td>
                  <td className="p-2 text-center text-slate-600">{s.oversDisplay}</td>
                  <td className="p-2 text-center text-slate-600">{s.economyRate ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
