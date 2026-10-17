import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Pencil, Plus, Search, Shield, Trash2, Handshake, Copy, Check, Clock, Trophy, X, Loader2 } from 'lucide-react';
import { api, qs } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useFetch } from '../useFetch.js';
import { ConfirmDialog, Empty, ErrorBox, Pagination, Spinner, TeamLogo, DropdownSelect } from '../components/ui.jsx';

const BALLS = ['Leather Ball', 'Tennis Ball', 'Rubber Ball', 'Other'];

export default function Teams() {
  const nav = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const isSuper = user?.role === 'superadmin';
  const isAdmin = isSuper || user?.role === 'admin';
  const isViewer = user?.role === 'viewer';
  const canSeeCode = !isViewer && (isSuper || isAdmin || user?.role === 'teamadmin' || user?.role === 'user');

  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [ball, setBall] = useState('');
  const [page, setPage] = useState(1);
  const [del, setDel] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Add Opponent Modal & Code state
  const [showAddOpponent, setShowAddOpponent] = useState(false);
  const [oppCode, setOppCode] = useState('');
  const [oppSending, setOppSending] = useState(false);
  const [oppMsg, setOppMsg] = useState('');
  const [oppErr, setOppErr] = useState('');
  const [copied, setCopied] = useState(false);
  const [copiedTeamCode, setCopiedTeamCode] = useState(null);
  const [connActionBusy, setConnActionBusy] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => { setQ(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  // Open modal if URL has ?add=opponent
  useEffect(() => {
    if (searchParams.get('add') === 'opponent') {
      setShowAddOpponent(true);
      // clean param from URL without reload
      searchParams.delete('add');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const { data, error, loading, reload } = useFetch(`/teams${qs({ search: q, ballType: ball, page, limit: 8 })}`);

  // Fetch connections for user's team if they have one
  const myTeamId = data?.myTeam?.id;
  const { data: connData, reload: reloadConns } = useFetch(myTeamId ? `/teams/${myTeamId}/connections` : null);

  const doDelete = async () => {
    setBusy(true);
    try {
      await api(`/teams/${del.id}`, { method: 'DELETE' });
      setDel(null);
      setActionError('');
      setActionSuccess(`Team ${del.name} deleted successfully.`);
      reload();
    } catch (e) {
      setDel(null);
      setActionError(e.message);
    } finally { setBusy(false); }
  };

  const copyTeamCode = () => {
    if (!data?.myTeam?.code) return;
    navigator.clipboard.writeText(data.myTeam.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sendOpponentRequest = async (e) => {
    e.preventDefault();
    setOppErr('');
    setOppMsg('');
    if (!oppCode.trim()) {
      setOppErr('Please enter the opponent team code');
      return;
    }
    if (!myTeamId) {
      setOppErr('You must create your own team before adding opponents');
      return;
    }
    setOppSending(true);
    try {
      const res = await api(`/teams/${myTeamId}/connect`, {
        method: 'POST',
        body: { code: oppCode.trim().toUpperCase() },
      });
      setOppMsg(res.message || 'Opponent request sent successfully!');
      setOppCode('');
      reload();
      if (reloadConns) reloadConns();
    } catch (err) {
      setOppErr(err.message);
    } finally {
      setOppSending(false);
    }
  };

  const handleRespondRequest = async (connId, status) => {
    if (!myTeamId) return;
    setConnActionBusy(true);
    setActionError('');
    setActionSuccess('');
    try {
      await api(`/teams/${myTeamId}/connections/${connId}`, {
        method: 'PUT',
        body: { status },
      });
      setActionSuccess(status === 'accepted' ? 'Opponent request accepted! You can now schedule matches with them.' : 'Opponent request declined.');
      reload();
      if (reloadConns) reloadConns();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setConnActionBusy(false);
    }
  };

  const handleCancelRequest = async (connId) => {
    if (!myTeamId) return;
    setConnActionBusy(true);
    try {
      await api(`/teams/${myTeamId}/connections/${connId}`, { method: 'DELETE' });
      setActionSuccess('Request cancelled.');
      reload();
      if (reloadConns) reloadConns();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setConnActionBusy(false);
    }
  };

  const incomingRequests = connData?.incoming || [];
  const outgoingRequests = connData?.outgoing || [];

  return (
    <div>
      {/* Header bar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Teams</h1>
          <p className="text-xs text-slate-500">Manage your squad and connect with opponent teams</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {data?.myTeam ? (
            <>
              <button
                type="button"
                onClick={() => { setShowAddOpponent(true); setOppErr(''); setOppMsg(''); }}
                className="btn btn-primary"
              >
                <Handshake className="h-4 w-4" /> Add New Opponent
              </button>
              <Link to={`/teams/${data.myTeam.id}/edit`} className="btn btn-outline">
                <Pencil className="h-4 w-4" /> Update My Team
              </Link>
            </>
          ) : data?.canCreate ? (
            <Link to="/teams/new" className="btn btn-green">
              <Plus className="h-4 w-4" /> Create Team
            </Link>
          ) : null}
        </div>
      </div>

      {/* Own Team Code banner */}
      {data?.myTeam && canSeeCode && data.myTeam.code && (
        <div className="mb-4 rounded-xl border border-pitch-200 bg-pitch-50/70 p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-pitch-700" />
                <span className="font-bold text-slate-900">{data.myTeam.name}</span>
                <span className="badge bg-green-100 text-green-700 text-xs">Your Team</span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Share this unique 6-character team code with opponents so they can send you a match connection request.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-pitch-300 bg-white px-3 py-2 shadow-sm self-start sm:self-auto">
              <div className="text-[11px] font-semibold uppercase text-slate-500">Team Code:</div>
              <span className="font-mono text-lg font-bold tracking-widest text-pitch-900">{data.myTeam.code}</span>
              <button
                type="button"
                onClick={copyTeamCode}
                className="btn btn-ghost !p-1 text-pitch-700 hover:bg-pitch-100"
                title="Copy Team Code"
              >
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Incoming Requests Alert Section */}
      {incomingRequests.length > 0 && (
        <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-amber-900 font-bold mb-1">
            <Clock className="h-5 w-5 text-amber-600" />
            <span>Incoming Opponent Requests ({incomingRequests.length})</span>
          </div>
          <p className="text-xs text-amber-800 mb-3">
            These teams want to connect with you. Accept their request to allow match scheduling and view full squads.
          </p>
          <div className="space-y-2">
            {incomingRequests.map((inc) => (
              <div key={inc.connectionId} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-amber-200 bg-white p-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <TeamLogo team={inc.fromTeam} size={40} />
                  <div>
                    <div className="font-semibold text-slate-900">{inc.fromTeam.name}</div>
                    <div className="text-xs text-slate-500">{inc.fromTeam.ballType}{inc.fromTeam.location ? ` · ${inc.fromTeam.location}` : ''}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleRespondRequest(inc.connectionId, 'accepted')}
                    disabled={connActionBusy}
                    className="btn btn-green text-xs !py-1.5 !px-3"
                  >
                    <Check className="h-3.5 w-3.5" /> Accept
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRespondRequest(inc.connectionId, 'rejected')}
                    disabled={connActionBusy}
                    className="btn btn-outline text-xs !py-1.5 !px-3 text-red-600 hover:bg-red-50 hover:border-red-200"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sent Pending Requests */}
      {outgoingRequests.length > 0 && (
        <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            Sent Opponent Requests (Waiting for them to accept):
          </div>
          <div className="flex flex-wrap gap-2">
            {outgoingRequests.map((out) => (
              <div key={out.connectionId} className="inline-flex items-center gap-2 rounded-lg bg-white border border-slate-200 px-3 py-1.5 text-xs shadow-xs">
                <TeamLogo team={out.toTeam} size={20} />
                <span className="font-medium text-slate-900">{out.toTeam.name}</span>
                <span className="badge bg-amber-100 text-amber-700 text-[10px]">Pending</span>
                <button
                  type="button"
                  onClick={() => handleCancelRequest(out.connectionId)}
                  disabled={connActionBusy}
                  className="text-slate-400 hover:text-red-600 ml-1"
                  title="Cancel Request"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter and search */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" aria-hidden />
          <input className="input pl-9" placeholder="Search teams..." aria-label="Search teams" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="sm:w-48">
          <DropdownSelect
            value={ball}
            onChange={(v) => { setBall(v); setPage(1); }}
            options={BALLS.map((b) => ({ value: b, label: b }))}
            placeholder="All ball types"
          />
        </div>
      </div>

      <div className="mb-3">
        {actionError && <ErrorBox message={actionError} />}
        {actionSuccess && <p className="rounded-lg bg-green-50 p-3 text-sm text-green-800" role="status">{actionSuccess}</p>}
      </div>

      {loading && !data ? <Spinner /> : error ? <ErrorBox message={error} onRetry={reload} /> : data.items.length === 0 ? (
        <Empty
          icon={Shield}
          title={q || ball ? 'No teams match your search' : 'No teams yet'}
          text={q || ball ? 'Try a different name or filter.' : 'Create a team with 11 players to get started.'}
          action={!q && !ball && data.canCreate && <Link to="/teams/new" className="btn btn-green">Create Team</Link>}
        />
      ) : (
        <>
          <ul className="space-y-2">
            {data.items.map((t) => {
              const canEditOrDelete = t.isOwn || isSuper;
              const showCode = canSeeCode && t.code && (t.isOwn || isSuper || t.canManage);
              return (
                <li key={t.id} className="card flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3">
                  <Link to={`/teams/${t.id}`} className="flex flex-1 items-center gap-3 min-w-0">
                    <TeamLogo team={t} size={48} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-900">{t.name}</span>
                        {t.isOwn && (
                          <span className="badge bg-green-100 text-green-700 text-xs">Your Team</span>
                        )}
                        {t.isConnectedOpponent && (
                          <span className="badge bg-blue-100 text-blue-700 text-xs">Connected Opponent</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">
                        {t.playerCount} Players{t.location ? ` · ${t.location}` : ''} · {t.ballType}
                      </div>
                    </div>
                  </Link>

                  {/* Actions & Code: Code is only shown to team managers / admins and never to viewers */}
                  <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
                    {showCode && (
                      <div className="flex items-center gap-1.5 rounded-lg border border-pitch-200 bg-pitch-50/80 px-2.5 py-1 text-xs shadow-xs">
                        <span className="text-[11px] font-semibold text-pitch-700">Code:</span>
                        <span className="font-mono font-bold tracking-widest text-pitch-900">{t.code}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            navigator.clipboard.writeText(t.code);
                            setCopiedTeamCode(t.id);
                            setTimeout(() => setCopiedTeamCode(null), 2000);
                          }}
                          className="text-pitch-700 hover:text-pitch-900 p-0.5 rounded hover:bg-pitch-100 transition"
                          title="Copy Team Code"
                        >
                          {copiedTeamCode === t.id ? (
                            <Check className="h-3.5 w-3.5 text-green-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    )}

                    {t.isConnectedOpponent && myTeamId && (
                      <Link
                        to={`/matches/new?home=${myTeamId}&away=${t.id}`}
                        className="btn btn-green text-xs !py-1.5 !px-2.5"
                        title="Play Match with this Opponent"
                      >
                        <Trophy className="h-3.5 w-3.5" /> Play
                      </Link>
                    )}

                    {canEditOrDelete && (
                      <div className="flex items-center gap-1">
                        <button
                          className="btn btn-ghost !p-2"
                          onClick={() => nav(`/teams/${t.id}/edit`)}
                          aria-label={`Edit ${t.name}`}
                          title="Edit Team"
                        >
                          <Pencil className="h-4 w-4 text-slate-600" />
                        </button>
                        <button
                          className="btn btn-ghost !p-2 text-red-600"
                          onClick={() => setDel(t)}
                          aria-label={`Delete ${t.name}`}
                          title="Delete Team"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          <Pagination page={data.page} pages={data.pages} total={data.total} onPage={setPage} />
        </>
      )}

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={!!del}
        danger
        title="Delete team?"
        confirmLabel="Delete team"
        busy={busy}
        onCancel={() => setDel(null)}
        onConfirm={doDelete}
        message={`This permanently deletes ${del?.name} and all of its players. Teams that have matches cannot be deleted.`}
      />

      {/* Add New Opponent Modal */}
      {showAddOpponent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card w-full max-w-md p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Handshake className="h-5 w-5 text-pitch-600" />
                <h2 className="text-lg font-bold text-slate-900">Add New Opponent</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowAddOpponent(false)}
                className="btn btn-ghost !p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Enter the opponent team's 6-character Team Code. A connection request will be sent to their team admin. Once they accept, they will be listed as your opponent and you can play matches together.
            </p>

            <form onSubmit={sendOpponentRequest} className="space-y-3">
              <div>
                <label className="label" htmlFor="opp-code">Opponent Team Code</label>
                <input
                  id="opp-code"
                  type="text"
                  placeholder="e.g. GCWEXJ"
                  value={oppCode}
                  onChange={(e) => setOppCode(e.target.value.toUpperCase())}
                  maxLength={10}
                  className="input font-mono uppercase tracking-widest text-base"
                  autoFocus
                />
              </div>

              {oppErr && <p className="text-xs font-semibold text-red-600">{oppErr}</p>}
              {oppMsg && <p className="text-xs font-semibold text-green-600">{oppMsg}</p>}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddOpponent(false)}
                  className="btn btn-outline"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={oppSending || !oppCode.trim()}
                  className="btn btn-primary"
                >
                  {oppSending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Send Opponent Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
