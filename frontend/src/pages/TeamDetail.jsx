import { useState, useEffect } from 'react';
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
  Share2,
  Trophy,
  KeyRound,
  ShieldCheck,
  Phone,
  UserCheck,
  Shield,
} from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useFetch } from '../useFetch.js';
import { ConfirmDialog, ErrorBox, Field, Modal, Spinner, SkeletonTeamDetail, SkeletonList, TeamLogo } from '../components/ui.jsx';
import { PlayerCardModal } from '../components/PlayerCardModal.jsx';

const slug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 20);

export default function TeamDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { data, error, loading, reload } = useFetch(`/teams/${id}`);
  const [tab, setTab] = useState('squad');
  const [copied, setCopied] = useState(false);

  if (loading && !data) return <SkeletonTeamDetail />;
  if (error && !data) return <ErrorBox message={error} onRetry={reload} />;
  if (!data?.team) return <ErrorBox message={error || 'Team not found'} onRetry={reload} />;
  const { team, players = [], record = { played: 0, won: 0, lost: 0, tied: 0 } } = data;
  const canSeeCode = user?.role !== 'viewer' && (user?.role === 'superadmin' || user?.role === 'admin' || team.canManage);

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex items-center gap-2">
        <Link to="/teams" className="btn btn-ghost !p-1.5 sm:!p-2" aria-label="Back to teams"><ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" /></Link>
        <h1 className="flex-1 text-lg sm:text-xl font-bold text-slate-900 leading-tight">{team.name}</h1>
        {team.canManage && <Link to={`/teams/${team.id}/edit`} className="btn btn-outline text-xs sm:text-sm !py-1.5 !px-3"><Pencil className="h-3.5 w-3.5 mr-1" /> Update Team</Link>}
      </div>

      <section className="card p-3.5 sm:p-4">
        <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center">
          <TeamLogo team={team} size={56} className="h-14 w-14 sm:h-16 sm:w-16 rounded-xl sm:rounded-2xl shrink-0" />
          <div className="flex-1 text-xs sm:text-sm text-slate-600">
            {team.location && <div className="font-bold text-slate-900 text-sm sm:text-base">{team.location}</div>}
            <div className="mt-0.5">{players.length} players{team.location ? ` · ${team.location}` : ''}</div>
            {team.description && <p className="mt-1 text-slate-500 text-xs">{team.description}</p>}
          </div>
          {team.code && canSeeCode && (
            <div className="rounded-xl border border-pitch-200 bg-pitch-50/70 p-2.5 sm:p-3 sm:text-right">
              <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-pitch-700">Team Code</div>
              <div className="mt-0.5 flex items-center gap-2 sm:justify-end">
                <span className="font-mono text-lg sm:text-xl font-black tracking-widest text-pitch-900">{team.code}</span>
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
      ) : (
        <PlayerStats teamId={team.id} teamName={team.name} teamLogo={team.logo} />
      )}
    </div>
  );
}

// ---- Player Career Stats ----
function PlayerStats({ teamId, teamName, teamLogo }) {
  const { data, error, loading, reload } = useFetch(`/teams/${teamId}/player-stats`);
  const [view, setView] = useState('batting');
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  if (loading && !data) return <SkeletonList count={4} />;
  if (error && !data) return <ErrorBox message={error} onRetry={reload} />;

  const stats = data?.stats || [];
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

// Team Credentials & Share Manager
function TeamCredentialsManager({ team }) {
  const { user } = useAuth();
  const [credTab, setCredTab] = useState('share'); // 'share' or 'admin'
  const { data, loading, error, reload } = useFetch(`/teams/${team.id}/viewer`);

  const [vCopied, setVCopied] = useState(false);

  // Team Admin form states
  const [adminModal, setAdminModal] = useState(false);
  const [aName, setAName] = useState('');
  const [aUsername, setAUsername] = useState('');
  const [aPhone, setAPhone] = useState('');
  const [aPassword, setAPassword] = useState('');
  const [showAPassword, setShowAPassword] = useState(false);
  const [aBusy, setABusy] = useState(false);
  const [aMsg, setAMsg] = useState('');
  const [aErr, setAErr] = useState('');

  const teamAdmin = data?.teamAdmin;
  const isSuperOrAdmin = user?.role === 'superadmin' || user?.role === 'admin';
  const isTeamOwner = !!user?._id && !!team?.createdBy && String(user._id) === String(team.createdBy);
  const canEditTeamAdmin = isSuperOrAdmin || isTeamOwner;

  const viewCode = team.code || team.id;
  const viewUrl = `${window.location.origin}/view/${viewCode}`;

  const copyViewLink = () => {
    navigator.clipboard?.writeText(viewUrl);
    setVCopied(true);
    setTimeout(() => setVCopied(false), 2000);
  };

  const shareWhatsApp = () => {
    const text = `🏏 Follow *${team.name}* live scores, squad and match stats!\n\n👉 Open view link:\n${viewUrl}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
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
      setAMsg('Admin credentials updated successfully');
      reload();
    } catch (err) {
      setAErr(err.message);
    } finally {
      setABusy(false);
    }
  };

  return (
    <section className="card p-3.5 sm:p-4 border border-slate-200/80 shadow-xs space-y-3">
      {/* Tab Switcher: Share Link / Admin Login */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
        <div className="flex rounded-lg bg-slate-100 p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setCredTab('share')}
            className={`rounded-md px-3 py-1.5 transition ${credTab === 'share' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
          >
            🔗 Viewer Share Link
          </button>
          <button
            type="button"
            onClick={() => setCredTab('admin')}
            className={`rounded-md px-3 py-1.5 transition ${credTab === 'admin' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
          >
            🛡️ Admin Login
          </button>
        </div>
      </div>

      {loading && !data ? (
        <SkeletonList count={2} />
      ) : error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : credTab === 'share' ? (
        /* Viewer Share Link Section */
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700">Viewer Share Link</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              readOnly
              value={viewUrl}
              onClick={(e) => e.target.select()}
              className="input font-mono text-xs flex-1 bg-slate-50 cursor-pointer"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={copyViewLink}
                className="btn btn-outline text-xs !py-2 !px-3 font-bold flex-1 sm:flex-none justify-center"
              >
                {vCopied ? <Check className="h-4 w-4 text-emerald-600 mr-1" /> : <Copy className="h-4 w-4 mr-1 text-slate-500" />}
                {vCopied ? 'Copied!' : 'Copy Link'}
              </button>
              <button
                type="button"
                onClick={shareWhatsApp}
                className="btn bg-[#25D366] hover:bg-[#20ba59] text-white text-xs !py-2 !px-3 font-bold flex-1 sm:flex-none justify-center"
              >
                <Share2 className="h-4 w-4 mr-1" />
                WhatsApp
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Team Admin Login Section */
        <div className="space-y-3">
          {aMsg && <p className="rounded-lg bg-green-50 p-2.5 text-xs text-green-800 font-medium">{aMsg}</p>}

          {teamAdmin ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 font-bold text-blue-700 text-xs">
                  {(teamAdmin.name || '?').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-sm">{teamAdmin.name}</div>
                  <div className="text-xs font-mono text-slate-500">@{teamAdmin.username} {teamAdmin.phone ? `· ${teamAdmin.phone}` : ''}</div>
                </div>
              </div>

              {canEditTeamAdmin && (
                <button
                  type="button"
                  onClick={openAdminEdit}
                  className="btn btn-outline text-xs !py-1.5 !px-3 font-bold self-start sm:self-auto"
                >
                  <Pencil className="h-3.5 w-3.5 mr-1" /> Edit Admin Credentials
                </button>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 p-3 text-center text-xs text-slate-500">
              No Team Admin assigned.
            </div>
          )}

          {/* Edit Team Admin Modal */}
          <Modal open={adminModal} onClose={() => setAdminModal(false)} title={`Edit Admin - ${team.name}`}>
            <form onSubmit={saveAdminCredentials} className="space-y-3" noValidate>
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
                <Field label="Username" required htmlFor="ta-user">
                  <input
                    id="ta-user"
                    autoCapitalize="none"
                    autoCorrect="off"
                    className="input font-mono"
                    value={aUsername}
                    onChange={(e) => setAUsername(e.target.value)}
                  />
                </Field>

                <Field label="Mobile Phone" htmlFor="ta-phone">
                  <input
                    id="ta-phone"
                    type="tel"
                    className="input"
                    value={aPhone}
                    onChange={(e) => setAPhone(e.target.value)}
                  />
                </Field>
              </div>

              <Field label="New Password (optional)" htmlFor="ta-pass">
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
                  {aBusy ? 'Saving...' : 'Save Credentials'}
                </button>
              </div>
            </form>
          </Modal>
        </div>
      )}
    </section>
  );
}
