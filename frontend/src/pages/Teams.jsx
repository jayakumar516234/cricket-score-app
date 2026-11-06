import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Pencil, Plus, Search, Shield, Trash2, Handshake, Copy, Check, Clock,
  Trophy, X, Loader2, Share2, Users, ExternalLink, ArrowRight, UserCheck
} from 'lucide-react';
import { api, qs } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useFetch } from '../useFetch.js';
import {
  ConfirmDialog, Empty, ErrorBox, Pagination, Spinner, SkeletonList,
  SkeletonTeamsPage, TeamLogo, DropdownSelect
} from '../components/ui.jsx';

const BALLS = ['Leather Ball', 'Tennis Ball', 'Rubber Ball', 'Other'];

export default function Teams() {
  const nav = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const isSuper = user?.role === 'superadmin';
  const isAdmin = isSuper || user?.role === 'admin';
  const isViewer = user?.role === 'viewer';
  const canSeeCode = !isViewer && (isSuper || isAdmin || user?.role === 'teamadmin' || user?.role === 'user');

  // Active view tab: 'all' | 'my-team' | 'opponents'
  const [tab, setTab] = useState('all');

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
      searchParams.delete('add');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const { data, error, loading, reload } = useFetch(`/teams${qs({ search: q, ballType: ball, page, limit: 8 })}`);

  // Fetch connections for user's team if they have one
  const myTeamId = data?.myTeam?.id;
  const { data: connData, reload: reloadConns } = useFetch(myTeamId ? `/teams/${myTeamId}/connections` : null);

  const connectedOpponents = connData?.connected || [];
  const incomingRequests = connData?.incoming || [];
  const outgoingRequests = connData?.outgoing || [];

  const myTeamItem = data?.items?.find((t) => t.isOwn);
  const myTeamData = data?.myTeam ? {
    ...data.myTeam,
    playerCount: myTeamItem?.playerCount ?? 11,
  } : null;

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

  const copyTeamCode = (code) => {
    const codeToCopy = code || data?.myTeam?.code;
    if (!codeToCopy) return;
    navigator.clipboard.writeText(codeToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareTeamCodeWhatsApp = (team) => {
    const t = team || data?.myTeam;
    if (!t?.code) return;
    const text = encodeURIComponent(
      `🏏 Connect with *${t.name}* on Cricket Score!\nTeam Code: *${t.code}*\nUse this code in the app to connect and play matches with us!`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
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

  const handleDisconnectOpponent = async (connId, oppName) => {
    if (!myTeamId) return;
    if (!window.confirm(`Disconnect ${oppName || 'this team'} from your opponents?`)) return;
    setConnActionBusy(true);
    try {
      await api(`/teams/${myTeamId}/connections/${connId}`, { method: 'DELETE' });
      setActionSuccess(`Disconnected from ${oppName || 'opponent'}.`);
      reload();
      if (reloadConns) reloadConns();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setConnActionBusy(false);
    }
  };

  if (loading && !data) return <SkeletonTeamsPage />;

  return (
    <div className="space-y-3.5">
      {/* ─── Header bar ─── */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-base sm:text-lg font-black text-slate-900 leading-tight tracking-tight flex items-center gap-1.5">
            <span>Teams & Opponents</span>
          </h1>
          <p className="text-[10px] sm:text-[11px] text-slate-500">
            Manage your squad, connect with rival teams and schedule matches
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {data?.myTeam ? (
            <>
              <button
                type="button"
                onClick={() => { setShowAddOpponent(true); setOppErr(''); setOppMsg(''); }}
                className="btn btn-primary text-xs !py-1.5 !px-2.5 shadow-xs"
              >
                <Handshake className="h-3.5 w-3.5" /> Add Opponent
              </button>
              <Link to={`/teams/${data.myTeam.id}/edit`} className="btn btn-outline text-xs !py-1.5 !px-2.5">
                <Pencil className="h-3.5 w-3.5" /> Edit Squad
              </Link>
            </>
          ) : data?.canCreate ? (
            <Link to="/teams/new" className="btn btn-green bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md text-xs !py-1.5 !px-2.5">
              <Plus className="h-3.5 w-3.5" /> Create Team
            </Link>
          ) : null}
        </div>
      </div>

      {/* ─── Tabs Switcher (All Teams / My Squad / Opponents) ─── */}
      <div className="flex rounded-xl bg-slate-200/70 p-1 gap-1 text-xs font-bold text-slate-600 shadow-2xs">
        <button
          type="button"
          onClick={() => setTab('all')}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 px-2.5 text-xs transition-all ${
            tab === 'all'
              ? 'bg-white text-slate-900 shadow-xs font-black'
              : 'hover:text-slate-900 text-slate-600'
          }`}
        >
          <span>All Teams</span>
          {data?.total > 0 && (
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${tab === 'all' ? 'bg-slate-100 text-slate-800' : 'bg-slate-300/60 text-slate-700'}`}>
              {data.total}
            </span>
          )}
        </button>

        {myTeamData && (
          <button
            type="button"
            onClick={() => setTab('my-team')}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 px-2.5 text-xs transition-all ${
              tab === 'my-team'
                ? 'bg-emerald-600 text-white shadow-xs font-black'
                : 'hover:text-slate-900 text-slate-600'
            }`}
          >
            <Shield className="h-3.5 w-3.5" />
            <span>My Squad</span>
            <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${tab === 'my-team' ? 'bg-emerald-700 text-emerald-100' : 'bg-emerald-100 text-emerald-800'}`}>
              Own
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setTab('opponents')}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 px-2.5 text-xs transition-all ${
            tab === 'opponents'
              ? 'bg-blue-600 text-white shadow-xs font-black'
              : 'hover:text-slate-900 text-slate-600'
          }`}
        >
          <Handshake className="h-3.5 w-3.5" />
          <span>Opponents</span>
          {connectedOpponents.length > 0 && (
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${tab === 'opponents' ? 'bg-blue-700 text-blue-100' : 'bg-blue-100 text-blue-800'}`}>
              {connectedOpponents.length}
            </span>
          )}
          {incomingRequests.length > 0 && (
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping inline-block" title={`${incomingRequests.length} incoming request(s)`} />
          )}
        </button>
      </div>

      {/* ─── Incoming Requests Alert Section ─── */}
      {incomingRequests.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-3 shadow-xs">
          <div className="flex items-center gap-2 text-amber-900 font-bold mb-1 text-xs">
            <Clock className="h-4 w-4 text-amber-600 shrink-0" />
            <span>Incoming Match Connection Requests ({incomingRequests.length})</span>
          </div>
          <p className="text-[10px] text-amber-800 mb-2">
            These teams want to connect as opponents. Accept to unlock instant match scheduling!
          </p>
          <div className="space-y-2">
            {incomingRequests.map((inc) => (
              <div key={inc.connectionId} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl border border-amber-200 bg-white p-2.5 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <TeamLogo team={inc.fromTeam} size={36} />
                  <div>
                    <div className="font-bold text-slate-900 text-xs">{inc.fromTeam.name}</div>
                    <div className="text-[10px] text-slate-500">{inc.fromTeam.ballType}{inc.fromTeam.location ? ` · ${inc.fromTeam.location}` : ''}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 pt-1.5 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleRespondRequest(inc.connectionId, 'accepted')}
                    disabled={connActionBusy}
                    className="btn btn-green flex-1 sm:flex-none text-xs !py-1.5 !px-3 font-bold"
                  >
                    <Check className="h-3 w-3" /> Accept
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRespondRequest(inc.connectionId, 'rejected')}
                    disabled={connActionBusy}
                    className="btn btn-outline flex-1 sm:flex-none text-xs !py-1.5 !px-3 text-red-600 hover:bg-red-50 hover:border-red-200 font-bold"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Sent Pending Requests ─── */}
      {outgoingRequests.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
          <div className="text-[11px] font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            Sent Requests (Waiting for opponent to accept):
          </div>
          <div className="flex flex-wrap gap-2">
            {outgoingRequests.map((out) => (
              <div key={out.connectionId} className="inline-flex items-center gap-2 rounded-lg bg-white border border-slate-200 px-2.5 py-1 text-xs shadow-xs">
                <TeamLogo team={out.toTeam} size={20} />
                <span className="font-medium text-slate-900 text-[11px]">{out.toTeam.name}</span>
                <span className="badge bg-amber-100 text-amber-700 text-[9px] font-bold">Pending</span>
                <button
                  type="button"
                  onClick={() => handleCancelRequest(out.connectionId)}
                  disabled={connActionBusy}
                  className="text-slate-400 hover:text-red-600 ml-1"
                  title="Cancel Request"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action status alerts */}
      <div className="empty:hidden">
        {actionError && <ErrorBox message={actionError} />}
        {actionSuccess && <p className="rounded-lg bg-green-50 p-2.5 text-xs text-green-800 font-medium" role="status">{actionSuccess}</p>}
      </div>

      {/* ══════════════════════════════════════════════════════════
          TAB 1: MY TEAM (OWN SQUAD SHOWCASE)
      ══════════════════════════════════════════════════════════ */}
      {tab === 'my-team' && (
        <div className="space-y-3">
          {myTeamData ? (
            <div className="rounded-2xl border-2 border-emerald-500/80 bg-gradient-to-br from-emerald-50 via-pitch-50/50 to-white p-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-emerald-200/80">
                <div className="flex items-center gap-3">
                  <TeamLogo team={myTeamData} size={54} />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base sm:text-lg font-black text-emerald-950 tracking-tight">{myTeamData.name}</span>
                      <span className="badge bg-emerald-600 text-white text-[9.5px] font-black uppercase tracking-wider py-0.5 px-2 rounded-md shadow-2xs flex items-center gap-1">
                        <Shield className="h-3 w-3" /> Your Team
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-800/80 mt-0.5">
                      {myTeamData.playerCount || 11} Players · {myTeamData.ballType}{myTeamData.location ? ` · ${myTeamData.location}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <Link
                    to={`/teams/${myTeamData.id}`}
                    className="btn btn-outline text-xs !py-1.5 !px-3 font-bold text-emerald-900 border-emerald-300 hover:bg-emerald-100/60"
                  >
                    <Users className="h-3.5 w-3.5 mr-1" /> View Squad
                  </Link>
                  <Link
                    to={`/teams/${myTeamData.id}/edit`}
                    className="btn btn-primary text-xs !py-1.5 !px-3 font-bold"
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Edit Squad
                  </Link>
                </div>
              </div>

              {/* Unique Team Code & Quick Share bar */}
              {canSeeCode && myTeamData.code && (
                <div className="mt-3.5 rounded-xl border border-emerald-300/80 bg-white/90 p-3 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-900">
                        Your Unique Team Code:
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Share this code with rival teams so they can send you a match connection request.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                      <div className="flex items-center gap-2 rounded-xl bg-emerald-950 text-emerald-300 px-3.5 py-1.5 shadow-2xs border border-emerald-800">
                        <span className="font-mono text-base font-black tracking-widest">{myTeamData.code}</span>
                        <button
                          type="button"
                          onClick={() => copyTeamCode(myTeamData.code)}
                          className="flex h-6 w-6 items-center justify-center rounded text-emerald-300 hover:text-white hover:bg-emerald-800 transition"
                          title="Copy Code"
                        >
                          {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => shareTeamCodeWhatsApp(myTeamData)}
                        className="btn btn-green text-xs !py-1.5 !px-2.5 font-bold flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white"
                        title="Share on WhatsApp"
                      >
                        <Share2 className="h-3.5 w-3.5" /> Share Code
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="card p-6 text-center space-y-2 border-dashed border-2 border-slate-200">
              <Shield className="h-8 w-8 text-slate-400 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">You haven't created a team yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">Create your club squad with 11 players to start scoring and playing matches.</p>
              {data?.canCreate && (
                <Link to="/teams/new" className="btn btn-green mt-2 text-xs !py-1.5 !px-3 font-bold inline-flex items-center gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> Create My Team
                </Link>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 2: OPPONENT TEAMS (CONNECTED OPPONENTS)
      ══════════════════════════════════════════════════════════ */}
      {tab === 'opponents' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-xs sm:text-sm font-extrabold text-blue-950 flex items-center gap-1.5">
                <Handshake className="h-4 w-4 text-blue-600" />
                <span>Connected Opponent Teams ({connectedOpponents.length})</span>
              </h2>
              <p className="text-[10px] text-slate-500">Teams you have linked with. You can play official matches together.</p>
            </div>
            <button
              type="button"
              onClick={() => { setShowAddOpponent(true); setOppErr(''); setOppMsg(''); }}
              className="btn btn-outline text-xs !py-1.5 !px-2.5 text-blue-800 border-blue-300 hover:bg-blue-50 font-bold"
            >
              <Plus className="h-3.5 w-3.5" /> Add Opponent
            </button>
          </div>

          {connectedOpponents.length === 0 ? (
            <div className="card p-8 text-center space-y-3 border-2 border-dashed border-blue-200 bg-blue-50/20 rounded-2xl">
              <div className="h-12 w-12 rounded-2xl bg-blue-100 flex items-center justify-center mx-auto text-blue-600">
                <Handshake className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">No Opponent Teams Connected Yet</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  Ask rival team admins for their 6-character Team Code and connect with them to schedule and score matches.
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setShowAddOpponent(true); setOppErr(''); setOppMsg(''); }}
                className="btn btn-primary text-xs !py-2 !px-4 font-bold shadow-xs inline-flex items-center gap-1.5"
              >
                <Handshake className="h-4 w-4" /> Connect with Opponent Team
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {connectedOpponents.map((conn) => {
                const opp = conn.team;
                return (
                  <div
                    key={conn.connectionId || opp.id}
                    className="rounded-xl border-2 border-blue-400/80 bg-gradient-to-r from-blue-50/70 via-indigo-50/25 to-white p-3 shadow-xs space-y-2.5 hover:shadow-sm transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <Link to={`/teams/${opp.id}`} className="flex items-center gap-2.5 min-w-0 flex-1">
                        <TeamLogo team={opp} size={42} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-extrabold text-blue-950 text-sm truncate">{opp.name}</span>
                            <span className="badge bg-blue-600 text-white text-[9px] font-bold uppercase tracking-wider py-0.2 px-1.5 rounded shadow-2xs">
                              Opponent
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            {opp.playerCount || 11} Players · {opp.ballType}{opp.location ? ` · ${opp.location}` : ''}
                          </div>
                        </div>
                      </Link>

                      {opp.code && canSeeCode && (
                        <span className="font-mono text-[11px] font-bold bg-blue-100/80 text-blue-900 border border-blue-200 px-2 py-0.5 rounded-lg shrink-0">
                          {opp.code}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-blue-100 flex-wrap">
                      <div className="flex items-center gap-1">
                        <Link
                          to={`/teams/${opp.id}`}
                          className="btn btn-ghost text-xs !py-1 !px-2 text-slate-600 hover:text-slate-900"
                        >
                          View Squad
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDisconnectOpponent(conn.connectionId, opp.name)}
                          disabled={connActionBusy}
                          className="btn btn-ghost text-xs !py-1 !px-2 text-red-500 hover:bg-red-50 hover:text-red-700"
                          title="Disconnect Opponent"
                        >
                          Remove
                        </button>
                      </div>

                      {myTeamId && (
                        <Link
                          to={`/matches/new?home=${myTeamId}&away=${opp.id}`}
                          className="btn btn-green text-xs !py-1.5 !px-3.5 font-black shadow-xs bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
                        >
                          <Trophy className="h-3.5 w-3.5" /> Play Match
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 3: ALL TEAMS (OVERVIEW & COMMUNITY DIRECTORY)
      ══════════════════════════════════════════════════════════ */}
      {tab === 'all' && (
        <div className="space-y-3.5">
          {/* If user is not actively searching, show My Team Featured Card at top */}
          {!q && !ball && myTeamData && (
            <div className="rounded-xl border-2 border-emerald-500/80 bg-gradient-to-r from-emerald-500/10 via-pitch-50/40 to-white p-3 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                <div className="flex items-center gap-2.5">
                  <TeamLogo team={myTeamData} size={42} />
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-extrabold text-emerald-950 text-sm">{myTeamData.name}</span>
                      <span className="badge bg-emerald-600 text-white text-[9.5px] font-black uppercase tracking-wider py-0.2 px-1.5 rounded shadow-2xs flex items-center gap-1">
                        <Shield className="h-3 w-3" /> Your Team
                      </span>
                    </div>
                    <p className="text-[10px] text-emerald-800/80 mt-0.5">
                      {myTeamData.playerCount || 11} Players · {myTeamData.ballType} · Share code to challenge rivals
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                  {canSeeCode && myTeamData.code && (
                    <div className="flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-2.5 py-1 text-xs shadow-2xs">
                      <span className="text-[10px] font-bold text-emerald-800">Code:</span>
                      <span className="font-mono text-xs font-black tracking-widest text-emerald-950">{myTeamData.code}</span>
                      <button
                        type="button"
                        onClick={() => copyTeamCode(myTeamData.code)}
                        className="flex h-5 w-5 items-center justify-center rounded text-emerald-700 hover:bg-emerald-50"
                        title="Copy Code"
                      >
                        {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => shareTeamCodeWhatsApp(myTeamData)}
                        className="text-emerald-700 hover:text-emerald-900 ml-0.5"
                        title="Share on WhatsApp"
                      >
                        <Share2 className="h-3 w-3" />
                      </button>
                    </div>
                  )}

                  <Link to={`/teams/${myTeamData.id}/edit`} className="btn btn-outline text-xs !py-1 !px-2.5 font-bold">
                    Edit
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Connected Opponents quick preview strip when not searching */}
          {!q && !ball && connectedOpponents.length > 0 && (
            <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-2.5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-blue-900 flex items-center gap-1.5">
                  <Handshake className="h-3.5 w-3.5 text-blue-600" />
                  <span>Connected Opponents ({connectedOpponents.length})</span>
                </span>
                <button
                  type="button"
                  onClick={() => setTab('opponents')}
                  className="text-[11px] font-bold text-blue-700 hover:text-blue-900 hover:underline flex items-center gap-0.5"
                >
                  View All <ArrowRight className="h-3 w-3" />
                </button>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                {connectedOpponents.slice(0, 4).map((conn) => {
                  const opp = conn.team;
                  return (
                    <div
                      key={conn.connectionId || opp.id}
                      className="shrink-0 flex items-center gap-2 rounded-lg bg-white border border-blue-200 px-2.5 py-1.5 shadow-2xs min-w-[200px]"
                    >
                      <TeamLogo team={opp} size={26} />
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-blue-950 text-xs truncate">{opp.name}</div>
                        <div className="text-[9px] text-slate-500">{opp.ballType}</div>
                      </div>
                      {myTeamId && (
                        <Link
                          to={`/matches/new?home=${myTeamId}&away=${opp.id}`}
                          className="btn btn-green text-[10px] !py-1 !px-2 font-bold shrink-0"
                          title="Play Match"
                        >
                          <Trophy className="h-3 w-3" /> Play
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Search & Filter section */}
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" aria-hidden />
              <input
                className="input !pl-9 text-xs sm:text-sm"
                placeholder="Search teams by name or location..."
                aria-label="Search teams"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="sm:w-44">
              <DropdownSelect
                value={ball}
                onChange={(v) => { setBall(v); setPage(1); }}
                options={BALLS.map((b) => ({ value: b, label: b }))}
                placeholder="All ball types"
              />
            </div>
          </div>

          {/* Teams List */}
          {loading && !data ? (
            <SkeletonList count={6} />
          ) : error ? (
            <ErrorBox message={error} onRetry={reload} />
          ) : data.items.length === 0 ? (
            <Empty
              icon={Shield}
              title={q || ball ? 'No teams match your search' : 'No teams yet'}
              text={q || ball ? 'Try a different name or ball filter.' : 'Create a team with 11 players to get started.'}
              action={!q && !ball && data.canCreate && <Link to="/teams/new" className="btn btn-green bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md">Create Team</Link>}
            />
          ) : (
            <>
              <ul className="space-y-2">
                {data.items.map((t) => {
                  const canEditOrDelete = t.isOwn || isSuper;
                  const showCode = canSeeCode && t.code && (t.isOwn || isSuper || t.canManage);

                  // Distinct Styling:
                  // 1. Own Team: Emerald green border & gradient
                  // 2. Opponent Team: Blue border & gradient with prominent Play button
                  // 3. Other Team: Neutral slate border
                  const cardStyle = t.isOwn
                    ? 'border-2 border-emerald-500/90 bg-gradient-to-r from-emerald-50/70 via-pitch-50/30 to-white shadow-xs'
                    : t.isConnectedOpponent
                    ? 'border-2 border-blue-400/90 bg-gradient-to-r from-blue-50/70 via-indigo-50/30 to-white shadow-xs'
                    : 'border border-slate-200/90 bg-white hover:border-slate-300';

                  return (
                    <li
                      key={t.id}
                      className={`card p-3 space-y-2 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-3 transition ${cardStyle}`}
                    >
                      <Link to={`/teams/${t.id}`} className="flex flex-1 items-center gap-2.5 min-w-0">
                        <TeamLogo team={t} size={40} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-sm truncate ${t.isOwn ? 'font-black text-emerald-950' : t.isConnectedOpponent ? 'font-extrabold text-blue-950' : 'font-bold text-slate-900'}`}>
                              {t.name}
                            </span>

                            {t.isOwn && (
                              <span className="badge bg-emerald-600 text-white text-[9px] font-black uppercase tracking-wider py-0.2 px-1.5 rounded shadow-2xs flex items-center gap-0.5">
                                <Shield className="h-2.5 w-2.5" /> Your Team
                              </span>
                            )}

                            {t.isConnectedOpponent && (
                              <span className="badge bg-blue-600 text-white text-[9px] font-bold uppercase tracking-wider py-0.2 px-1.5 rounded shadow-2xs flex items-center gap-0.5">
                                <Handshake className="h-2.5 w-2.5" /> Opponent
                              </span>
                            )}

                            {!t.isOwn && !t.isConnectedOpponent && (
                              <span className="badge bg-slate-100 text-slate-600 text-[9px] font-medium border border-slate-200">
                                Club
                              </span>
                            )}
                          </div>

                          <div className="text-[10px] text-slate-500 mt-0.5">
                            {t.playerCount} Players{t.location ? ` · ${t.location}` : ''} · {t.ballType}
                          </div>
                        </div>
                      </Link>

                      {/* Actions Bar */}
                      <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 flex-wrap">
                        {showCode && (
                          <div className="flex items-center gap-1.5 rounded-lg border border-pitch-200 bg-pitch-50/80 px-2 py-0.5 text-xs shadow-2xs">
                            <span className="text-[10px] font-bold text-pitch-700">Code:</span>
                            <span className="font-mono text-xs font-bold tracking-widest text-pitch-900">{t.code}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                navigator.clipboard.writeText(t.code);
                                setCopiedTeamCode(t.id);
                                setTimeout(() => setCopiedTeamCode(null), 2000);
                              }}
                              className="flex h-5 w-5 items-center justify-center rounded text-pitch-700 hover:bg-pitch-100 transition"
                              title="Copy Team Code"
                            >
                              {copiedTeamCode === t.id ? (
                                <Check className="h-3 w-3 text-green-600" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                            {t.isOwn && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  shareTeamCodeWhatsApp(t);
                                }}
                                className="text-pitch-700 hover:text-pitch-900"
                                title="Share on WhatsApp"
                              >
                                <Share2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        )}

                        <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
                          {/* Play Match Button for Connected Opponents */}
                          {t.isConnectedOpponent && myTeamId && (
                            <Link
                              to={`/matches/new?home=${myTeamId}&away=${t.id}`}
                              className="btn btn-green text-xs !py-1.5 !px-3 font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                              title="Play Match with this Opponent"
                            >
                              <Trophy className="h-3.5 w-3.5" /> Play
                            </Link>
                          )}

                          {canEditOrDelete && (
                            <div className="flex items-center gap-1">
                              <button
                                className="btn btn-outline text-xs !py-1 !px-2.5 text-slate-700 font-medium"
                                onClick={() => nav(`/teams/${t.id}/edit`)}
                                aria-label={`Edit ${t.name}`}
                                title="Edit Team"
                              >
                                <Pencil className="h-3 w-3 mr-1" /> Edit
                              </button>
                              <button
                                className="btn btn-ghost !p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                                onClick={() => setDel(t)}
                                aria-label={`Delete ${t.name}`}
                                title="Delete Team"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
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
        </div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-2xs">
          <div className="card w-full max-w-md p-5 shadow-xl space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-pitch-500/15 text-pitch-700">
                  <Handshake className="h-4 w-4" />
                </div>
                <h2 className="text-base font-bold text-slate-900">Add New Opponent Team</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowAddOpponent(false)}
                className="btn btn-ghost !p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-[11px] text-slate-600 leading-relaxed">
              Enter the opponent team's 6-character Team Code. A connection request will be sent to their manager. Once accepted, they appear as your opponent and you can schedule matches together.
            </p>

            <form onSubmit={sendOpponentRequest} className="space-y-3">
              <div>
                <label className="label text-xs" htmlFor="opp-code">Opponent Team Code</label>
                <input
                  id="opp-code"
                  type="text"
                  placeholder="e.g. GCWEXJ"
                  value={oppCode}
                  onChange={(e) => setOppCode(e.target.value.toUpperCase())}
                  maxLength={10}
                  className="input font-mono uppercase tracking-widest text-base font-bold !py-2"
                  autoFocus
                />
              </div>

              {oppErr && <p className="text-xs font-semibold text-red-600">{oppErr}</p>}
              {oppMsg && <p className="text-xs font-semibold text-green-600">{oppMsg}</p>}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddOpponent(false)}
                  className="btn btn-outline text-xs !py-1.5 !px-3"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={oppSending || !oppCode.trim()}
                  className="btn btn-primary text-xs !py-1.5 !px-3.5"
                >
                  {oppSending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                  Send Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
