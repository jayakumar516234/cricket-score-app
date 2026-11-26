import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Pencil, Plus, Search, Shield, Trash2, Handshake, Copy, Check, Clock,
  Trophy, X, Loader2, Share2, Users, ExternalLink, ArrowRight, UserCheck,
  Smartphone, WifiOff, Globe
} from 'lucide-react';
import { api, qs } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useMenuConfig } from '../context/MenuConfigContext.jsx';
import { useFetch } from '../useFetch.js';
import { getOfflineTeams, deleteOfflineTeam } from '../utils/offlineStorage.js';
import {
  ConfirmDialog, Empty, ErrorBox, Pagination, Spinner, SkeletonList,
  SkeletonTeamsPage, TeamLogo
} from '../components/ui.jsx';

const createDefaultPlayers = () => [
  { id: 'p1', name: 'Player 1', role: 'Batsman' },
  { id: 'p2', name: 'Player 2', role: 'Batsman' },
  { id: 'p3', name: 'Player 3', role: 'Batsman' },
  { id: 'p4', name: 'Player 4', role: 'Batsman' },
  { id: 'p5', name: 'Player 5', role: 'Wicket Keeper' },
  { id: 'p6', name: 'Player 6', role: 'All-rounder' },
  { id: 'p7', name: 'Player 7', role: 'All-rounder' },
  { id: 'p8', name: 'Player 8', role: 'All-rounder' },
  { id: 'p9', name: 'Player 9', role: 'Bowler' },
  { id: 'p10', name: 'Player 10', role: 'Bowler' },
  { id: 'p11', name: 'Player 11', role: 'Bowler' },
];

export default function Teams() {
  const nav = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { features } = useMenuConfig() || {};
  const showOfflineFeature = Boolean(features?.offlineModeEnabled);
  const isSuper = user?.role === 'superadmin';
  const isAdmin = isSuper || user?.role === 'admin';
  const isViewer = user?.role === 'viewer';
  const canSeeCode = !isViewer && (isSuper || isAdmin || user?.role === 'teamadmin' || user?.role === 'user');

  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [del, setDel] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Add Opponent Modal & Code state
  const [showAddOpponent, setShowAddOpponent] = useState(false);
  const [oppTab, setOppTab] = useState('code'); // 'code' | 'manual'
  const [oppCode, setOppCode] = useState('');
  const [oppSending, setOppSending] = useState(false);
  const [oppMsg, setOppMsg] = useState('');
  const [oppErr, setOppErr] = useState('');
  const [manualName, setManualName] = useState('Guest Team 1');
  const [manualLocation, setManualLocation] = useState('');
  const [manualPlayers, setManualPlayers] = useState(createDefaultPlayers);
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

  const { data, error, loading, reload } = useFetch(`/teams${qs({ search: q, page, limit: 8 })}`);

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

  // Calculate next default guest team name (Guest Team 1, Guest Team 2, ...)
  const computeNextGuestName = useCallback(() => {
    const allTeams = [...(data?.items || []), ...(connData?.connected?.map((c) => c.team) || [])];
    const guestNums = new Set();
    const regex = /^guest\s*team(?:\s*(\d+))?$/i;

    for (const tm of allTeams) {
      const n = (tm?.name || '').trim();
      const m = n.match(regex);
      if (m) {
        guestNums.add(m[1] ? parseInt(m[1], 10) : 1);
      }
    }

    let n = 1;
    while (guestNums.has(n)) n++;
    return `Guest Team ${n}`;
  }, [data?.items, connData?.connected]);

  // Synchronize default guest team name whenever the modal is opened
  useEffect(() => {
    if (showAddOpponent && oppTab === 'manual') {
      const nextName = computeNextGuestName();
      setManualName((prev) => {
        if (!prev || prev === 'Fire Boys' || /^guest\s*team(?:\s*\d+)?$/i.test(prev.trim())) {
          return nextName;
        }
        return prev;
      });
    }
  }, [showAddOpponent, oppTab, computeNextGuestName]);

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

  const addManualPlayer = () => {
    if (manualPlayers.length >= 15) return;
    const nextIdx = manualPlayers.length + 1;
    setManualPlayers((prev) => [
      ...prev,
      { id: `p-${Date.now()}-${nextIdx}`, name: `Player ${nextIdx}`, role: 'All-rounder' },
    ]);
  };

  const removeManualPlayer = (idx) => {
    if (manualPlayers.length <= 11) return;
    setManualPlayers((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateManualPlayer = (idx, field, val) => {
    setManualPlayers((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, [field]: val } : p))
    );
  };

  const createManualOpponent = async (e) => {
    e.preventDefault();
    setOppErr('');
    setOppMsg('');
    if (!myTeamId) {
      return setOppErr('Please create your own team first before adding opponents.');
    }
    if (!manualName.trim() || manualName.trim().length < 2) {
      return setOppErr('Team name must be at least 2 characters.');
    }
    if (manualPlayers.length < 11) {
      return setOppErr('At least 11 players are required.');
    }
    const emptyPlayer = manualPlayers.find((p) => !p.name.trim());
    if (emptyPlayer) {
      return setOppErr('All players must have a name.');
    }

    setOppSending(true);
    try {
      const res = await api(`/teams/${myTeamId}/manual-opponent`, {
        method: 'POST',
        body: {
          name: manualName.trim(),
          location: manualLocation.trim() || undefined,
          players: manualPlayers.map((p, idx) => ({
            name: p.name.trim(),
            role: p.role,
            jerseyNumber: idx + 1,
          })),
        },
      });
      setActionSuccess(res.message || `Opponent team "${manualName.trim()}" added!`);
      setShowAddOpponent(false);
      setManualName(computeNextGuestName());
      setManualLocation('');
      setManualPlayers(createDefaultPlayers());
      reload();
      if (reloadConns) reloadConns();
    } catch (err) {
      setOppErr(err.message || 'Failed to create opponent team');
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

  const [localTeams, setLocalTeams] = useState(() => getOfflineTeams());
  const reloadLocal = () => setLocalTeams(getOfflineTeams());

  const handleDeleteLocalTeam = (e, t) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm(`Delete local team "${t.name}"?`)) return;
    deleteOfflineTeam(t.id);
    reloadLocal();
    setActionSuccess(`Local team "${t.name}" deleted.`);
  };

  if (loading && !data && localTeams.length === 0) return <SkeletonTeamsPage />;

  const sortedItems = [...(data?.items || [])].sort((a, b) => {
    if (a.isOwn && !b.isOwn) return -1;
    if (!a.isOwn && b.isOwn) return 1;
    if (a.isConnectedOpponent && !b.isConnectedOpponent) return -1;
    if (!a.isConnectedOpponent && b.isConnectedOpponent) return 1;
    return 0;
  });

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

      {/* Action status alerts */}
      <div className="empty:hidden">
        {actionError && <ErrorBox message={actionError} />}
        {actionSuccess && <p className="rounded-lg bg-green-50 p-2.5 text-xs text-green-800 font-medium" role="status">{actionSuccess}</p>}
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
                    <div className="text-[10px] text-slate-500">{inc.fromTeam.location || 'Cricket Team'}</div>
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

      {/* ─── Local / Offline Teams Section (Only visible when Super Admin turns ON Offline Mode) ─── */}
      {showOfflineFeature && (
        <div className="rounded-2xl border border-purple-200/90 bg-gradient-to-br from-purple-50/70 via-slate-50 to-white p-3.5 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-100 text-purple-700">
                <Smartphone className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-xs sm:text-sm font-black text-slate-900 leading-tight flex items-center gap-1.5">
                  <span>Local / Offline Teams</span>
                  <span className="badge bg-purple-200/80 text-purple-900 text-[9px] font-bold py-0.5 px-1.5 rounded-full">
                    {localTeams.length}
                  </span>
                </h2>
                <p className="text-[10px] text-slate-500">
                  Teams saved locally on this device
                </p>
              </div>
            </div>
            <Link
              to="/teams/new"
              className="btn btn-primary bg-purple-600 hover:bg-purple-700 text-white text-[11px] !py-1 !px-2.5 shadow-xs font-bold flex items-center gap-1"
            >
              <Plus className="h-3 w-3" /> New Local Squad
            </Link>
          </div>

          {localTeams.length === 0 ? (
            <div className="rounded-xl border border-dashed border-purple-200 bg-white/70 p-3 text-center">
              <p className="text-[11px] text-slate-500">
                No local teams created yet.
              </p>
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {localTeams.map((lt) => (
                <div
                  key={lt.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-purple-100 bg-white p-2.5 shadow-2xs hover:border-purple-300 transition"
                >
                  <Link to={`/teams/${lt.id}`} className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-800 font-black text-xs">
                      {lt.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-900 text-xs truncate">{lt.name}</div>
                      <div className="text-[10px] text-slate-500">
                        {lt.playerCount || lt.players?.length || 11} Players{lt.location ? ` · ${lt.location}` : ''}
                      </div>
                    </div>
                  </Link>
                  <div className="flex items-center gap-1">
                    <Link
                      to={`/matches/new?home=${lt.id}`}
                      className="btn btn-green text-[11px] !py-1 !px-2 font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs"
                      title="Start Match"
                    >
                      Play
                    </Link>
                    <Link
                      to={`/teams/${lt.id}/edit`}
                      className="btn btn-outline text-[11px] !py-1 !px-2 text-slate-700"
                      title="Edit Squad"
                    >
                      <Pencil className="h-3 w-3" />
                    </Link>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteLocalTeam(e, lt)}
                      className="btn btn-ghost !p-1 text-red-500 hover:bg-red-50 rounded-lg"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Teams List Section ─── */}
      <div className={`space-y-2.5 ${showOfflineFeature ? 'pt-2 border-t border-slate-200' : ''}`}>
        {showOfflineFeature && (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
                <Globe className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-xs sm:text-sm font-black text-slate-900 leading-tight">
                  Online Server Teams
                </h2>
                <p className="text-[10px] text-slate-500">
                  Clubs and registered squads
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ─── Search Bar (Directly below Add Opponent / Edit Squad) ─── */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" aria-hidden />
          <input
            className="input !pl-9 text-xs sm:text-sm"
            placeholder="Search teams by name or location..."
            aria-label="Search teams"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* ─── Teams List (Logged-in User's Team First in Green, Opponents below) ─── */}
        {error || (!navigator.onLine && (!data || (data?.items || []).length === 0)) ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/90 p-5 text-center">
            <WifiOff className="h-6 w-6 text-slate-400 mx-auto mb-1.5" />
            <div className="font-bold text-slate-700 text-xs sm:text-sm">
              Connect to Network to View Online Cloud Teams
            </div>
            <p className="text-[10px] sm:text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              சர்வர் டீம்களைக் காணவும் ஆன்லைனில் விளையாடவும் இணைய இணைப்பு தேவை. உங்கள் லோக்கல் டீம்களுடன் ஆஃப்லைனிலேயே எப்போது வேண்டுமானாலும் மேட்ச் விளையாடலாம்!
            </p>
            <button type="button" onClick={reload} className="btn btn-outline text-xs !py-1 !px-3 mt-3">
              Try Reconnecting
            </button>
          </div>
        ) : loading && !data ? (
          <SkeletonList count={6} />
        ) : (data?.items || []).length === 0 ? (
          <Empty
            icon={Shield}
            title={q ? 'No teams match your search' : 'No teams yet'}
            text={q ? 'Try a different name or location.' : 'Create a team with 11 players to get started.'}
            action={!q && data?.canCreate && <Link to="/teams/new" className="btn btn-green bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md">Create Team</Link>}
          />
        ) : (
          <>
            <ul className="space-y-2">
              {sortedItems.map((t) => {
                const canEditOrDelete = isAdmin; // Only admin can edit server teams
                const showCode = canSeeCode && t.code && (t.isOwn || isSuper || t.canManage);

              // Distinct Styling:
              // 1. Own Team: Highlighted Green border & background gradient
              // 2. Opponent Team: Blue border & gradient with Play button
              // 3. Other Team: Neutral slate border
              const cardStyle = t.isOwn
                ? 'border-2 border-emerald-500 bg-gradient-to-r from-emerald-50/90 via-pitch-50/40 to-white shadow-xs ring-1 ring-emerald-500/20'
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

                        {(t.isGuest || t.isOpponent) && !t.isOwn && (
                          <span className="badge bg-amber-500/15 text-amber-800 border border-amber-300 text-[9px] font-bold uppercase tracking-wider py-0.2 px-1.5 rounded shadow-2xs flex items-center gap-1">
                            <Users className="h-2.5 w-2.5 text-amber-600" /> Guest Team
                          </span>
                        )}

                        {t.isConnectedOpponent && (
                          <span className="badge bg-blue-600 text-white text-[9px] font-bold uppercase tracking-wider py-0.2 px-1.5 rounded shadow-2xs flex items-center gap-0.5">
                            <Handshake className="h-2.5 w-2.5" /> Opponent
                          </span>
                        )}

                        {!t.isOwn && !t.isConnectedOpponent && !t.isGuest && !t.isOpponent && (
                          <span className="badge bg-slate-100 text-slate-600 text-[9px] font-medium border border-slate-200">
                            Club
                          </span>
                        )}

                        {t.allowOnlineScoring && (
                          <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-300 text-[9px] font-bold py-0.2 px-1.5 rounded flex items-center gap-0.5">
                            <Globe className="h-2.5 w-2.5" /> Online Live
                          </span>
                        )}
                      </div>

                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {t.playerCount} Players{t.location ? ` · ${t.location}` : ''}
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
                      {/* Play Match Button for Connected Opponents / Guest Teams */}
                      {t.isConnectedOpponent && myTeamId && !t.isOwn && (
                        <Link
                          to={`/matches/new?home=${myTeamId}&away=${t.id}`}
                          className="btn btn-green text-xs !py-1.5 !px-3 font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs flex items-center gap-1"
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
                          {/* Super Admin can delete any team; user can delete their manual guest/opponent teams! */}
                          {(isSuper || t.canDelete || ((t.isGuest || t.isOpponent) && (t.canManage || String(t.createdBy) === String(user?.id)))) && !t.isOwn && (
                            <button
                              className="btn btn-ghost !p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                              onClick={() => setDel(t)}
                              aria-label={`Delete ${t.name}`}
                              title="Delete Guest Team"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4 backdrop-blur-2xs">
          <div className="card w-full max-w-lg p-4 sm:p-5 shadow-xl space-y-3.5 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-pitch-500/15 text-pitch-700">
                  <Handshake className="h-4 w-4" />
                </div>
                <h2 className="text-base font-bold text-slate-900">Add Opponent Team</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowAddOpponent(false)}
                className="btn btn-ghost !p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Tab selection: Code vs Manual */}
            <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-semibold gap-1 shrink-0">
              <button
                type="button"
                onClick={() => { setOppTab('code'); setOppErr(''); setOppMsg(''); }}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 transition ${oppTab === 'code' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
              >
                <Handshake className="h-3.5 w-3.5" /> By Team Code
              </button>
              <button
                type="button"
                onClick={() => { setOppTab('manual'); setOppErr(''); setOppMsg(''); }}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 transition ${oppTab === 'manual' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
              >
                <Users className="h-3.5 w-3.5" /> Create Guest Team
              </button>
            </div>

            {oppTab === 'code' ? (
              <form onSubmit={sendOpponentRequest} className="space-y-3">
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Enter the opponent team's 6-character Team Code. A connection request will be sent to their manager. Once accepted, you can schedule and score matches together.
                </p>

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

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
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
            ) : (
              <form onSubmit={createManualOpponent} className="space-y-3 flex-1 overflow-hidden flex flex-col">
                <div className="space-y-3 overflow-y-auto pr-1 flex-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="label text-xs font-bold text-slate-700" htmlFor="m-team-name">Guest Opponent Team Name *</label>
                      <input
                        id="m-team-name"
                        type="text"
                        placeholder="e.g. Guest Team 1"
                        value={manualName}
                        onChange={(e) => setManualName(e.target.value)}
                        className="input text-xs font-bold"
                        required
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="label text-xs font-bold text-slate-700" htmlFor="m-team-loc">Location (Optional)</label>
                      <input
                        id="m-team-loc"
                        type="text"
                        placeholder="e.g. Local Ground"
                        value={manualLocation}
                        onChange={(e) => setManualLocation(e.target.value)}
                        className="input text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800">Squad Players</span>
                        <span className={`badge text-[10px] font-bold ${manualPlayers.length >= 11 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                          {manualPlayers.length}/15 Players
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={addManualPlayer}
                        disabled={manualPlayers.length >= 15}
                        className="btn btn-outline text-[11px] !py-1 !px-2 font-bold flex items-center gap-1 disabled:opacity-40"
                      >
                        <Plus className="h-3 w-3" /> Add Player
                      </button>
                    </div>

                    <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                      {manualPlayers.map((p, idx) => (
                        <div key={p.id} className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                          <span className="text-[10px] font-mono font-bold text-slate-400 w-5 text-center">#{idx + 1}</span>
                          <input
                            type="text"
                            value={p.name}
                            onChange={(e) => updateManualPlayer(idx, 'name', e.target.value)}
                            placeholder={`Player ${idx + 1} Name`}
                            className="input !py-1 text-xs flex-1 bg-white"
                            required
                          />
                          <select
                            value={p.role}
                            onChange={(e) => updateManualPlayer(idx, 'role', e.target.value)}
                            className="input !py-1 text-[11px] w-28 bg-white"
                          >
                            <option value="Batsman">Batsman</option>
                            <option value="Bowler">Bowler</option>
                            <option value="All-rounder">All-rounder</option>
                            <option value="Wicket Keeper">Wicket Keeper</option>
                          </select>
                          {manualPlayers.length > 11 && (
                            <button
                              type="button"
                              onClick={() => removeManualPlayer(idx)}
                              className="text-slate-400 hover:text-red-600 p-1 rounded"
                              title="Remove player"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {oppErr && <p className="text-xs font-semibold text-red-600 shrink-0">{oppErr}</p>}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowAddOpponent(false)}
                    className="btn btn-outline text-xs !py-1.5 !px-3"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={oppSending || !manualName.trim() || manualPlayers.length < 11}
                    className="btn btn-primary text-xs !py-1.5 !px-3.5 font-bold"
                  >
                    {oppSending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                    Create Guest Opponent
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
