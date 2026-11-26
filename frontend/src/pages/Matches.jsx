import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Trash2,
  Trophy,
  FileText,
  Share2,
  Radio,
  Check,
  Calendar,
  ArrowRight,
  MapPin,
  Clock,
  Sparkles,
  WifiOff,
} from 'lucide-react';
import { api, qs } from '../api.js';
import { useFetch } from '../useFetch.js';
import { getOfflineMatches, deleteOfflineMatch } from '../utils/offlineStorage.js';
import {
  ConfirmDialog,
  Empty,
  ErrorBox,
  Pagination,
  Spinner,
  SkeletonMatchCard,
  SkeletonMatchesPage,
  StatusBadge,
  TeamLogo,
  DropdownSelect,
  fmtDate,
} from '../components/ui.jsx';

export function MatchScoreLine({ match }) {
  const sc = (teamId) => match.scores?.find((s) => s.team === teamId);

  const Side = ({ team }) => {
    const s = sc(team?.id);
    return (
      <div className="flex flex-1 items-center gap-2 min-w-0">
        <TeamLogo team={team} size={30} />
        <div className="min-w-0 flex-1">
          <div className="text-xs sm:text-sm font-bold text-slate-900 truncate">{team?.name}</div>
          <div className="text-xs font-semibold text-slate-700">
            {s ? (
              <span className="inline-flex items-center gap-1">
                <span className="font-mono font-extrabold text-slate-900">{s.runs}/{s.wickets}</span>
                {s.overs ? <span className="text-[10px] text-slate-500 font-medium">({s.overs} ov)</span> : null}
              </span>
            ) : (
              <span className="text-slate-400 font-normal text-[10.5px]">Yet to bat</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="mt-2 flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-50/80 border border-slate-200/60">
        <Side team={match.homeTeam} />
        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[9.5px] font-black text-slate-500">
          VS
        </div>
        <Side team={match.awayTeam} />
      </div>

      {match.resultSummary && (
        <div className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200/80">
          <Trophy className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
          <span className="truncate">{match.resultSummary}</span>
        </div>
      )}
    </>
  );
}

export default function Matches() {
  const nav = useNavigate();
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [del, setDel] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [offlineTick, setOfflineTick] = useState(0);

  const offlineMatches = useMemo(() => {
    return getOfflineMatches().map((m) => {
      const inn1 = m.innings?.[0]?.state;
      const inn2 = m.innings?.[1]?.state;
      const scores = [];
      if (inn1) scores.push({ team: m.innings[0].battingTeam, runs: inn1.runs, wickets: inn1.wickets, overs: inn1.overs });
      if (inn2) scores.push({ team: m.innings[1].battingTeam, runs: inn2.runs, wickets: inn2.wickets, overs: inn2.overs });
      return {
        ...m,
        isOffline: true,
        canManage: true,
        scores,
        resultSummary: m.result?.summary,
      };
    });
  }, [offlineTick]);

  useEffect(() => {
    const t = setTimeout(() => {
      setQ(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, error, loading, reload } = useFetch(
    `/matches${qs({ search: q, status: status === 'offline' ? '' : status, page, limit: 8 })}`,
    { poll: 20000 }
  );

  const combinedItems = useMemo(() => {
    const serverItems = data?.items || [];
    let off = offlineMatches;
    if (q) {
      const lower = q.toLowerCase();
      off = off.filter((m) => m.name?.toLowerCase().includes(lower) || m.homeTeam?.name?.toLowerCase().includes(lower) || m.awayTeam?.name?.toLowerCase().includes(lower));
    }
    if (status === 'offline') return off;
    if (status && status !== 'offline') {
      off = off.filter((m) => m.status === status);
    }
    return [...off, ...serverItems];
  }, [data?.items, offlineMatches, q, status]);

  const doDelete = async () => {
    setBusy(true);
    try {
      if (del?.isOffline) {
        deleteOfflineMatch(del.id);
        setDel(null);
        setOfflineTick((t) => t + 1);
        return;
      }
      await api(`/matches/${del.id}`, { method: 'DELETE' });
      setDel(null);
      reload();
    } catch (e) {
      setDel(null);
      setActionError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const shareMatchWhatsApp = (m, e) => {
    e.preventDefault();
    e.stopPropagation();
    const home = m.homeTeam?.name || 'Home';
    const away = m.awayTeam?.name || 'Away';
    const isLive = m.status === 'live';
    const isCompleted = m.status === 'completed';

    let text = `🏏 *${m.name}*\n${home} vs ${away} (${m.format || 'Match'})\n`;
    if (isLive) {
      text += `🔴 LIVE SCORE IN PROGRESS! Follow live score here:\n${window.location.origin}/live/${m.id}`;
    } else if (isCompleted) {
      text += `🏆 Result: ${m.resultSummary || 'Match Completed'}\nView full match scorecard:\n${window.location.origin}/matches/${m.id}/scorecard`;
    } else {
      text += `📅 Scheduled match. Venue: ${m.venue || 'TBD'}\nMatch center link:\n${window.location.origin}/live/${m.id}`;
    }
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const copyLiveLink = (m, e) => {
    e.preventDefault();
    e.stopPropagation();
    const link = `${window.location.origin}/live/${m.id}`;
    navigator.clipboard?.writeText(link);
    setCopiedId(m.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading && !data) return <SkeletonMatchesPage />;

  const statusChips = [
    { value: '', label: 'All Matches' },
    { value: 'live', label: 'Live', isLive: true },
    { value: 'offline', label: 'Offline Local', isOfflineChip: true },
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'completed', label: 'Completed' },
  ];

  const currentLiveMatch = (data?.items || []).find((m) => m.status === 'live');

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* ─── Header bar ─── */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-base sm:text-lg font-black text-slate-900 leading-tight tracking-tight flex items-center gap-1.5">
            <Trophy className="h-4.5 w-4.5 text-emerald-600" />
            <span>Matches & Fixtures</span>
          </h1>
          <p className="text-[10px] sm:text-[11px] text-slate-500">
            Live ball-by-ball scoring, scheduled matches and completed scorecards
          </p>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {currentLiveMatch ? (
            <Link
              to={`/matches/${currentLiveMatch.id}`}
              className="btn bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white font-black shadow-xs text-xs !py-1.5 !px-3.5 inline-flex items-center gap-1.5 rounded-xl border border-amber-400/30"
            >
              <Radio className="h-3.5 w-3.5 animate-pulse text-amber-100" />
              <span>Update Match</span>
            </Link>
          ) : data?.canCreate ? (
            <Link
              to="/matches/new"
              className="btn btn-green bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs text-xs !py-1.5 !px-3.5 inline-flex items-center gap-1.5 rounded-xl"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Start Match</span>
            </Link>
          ) : null}
        </div>
      </div>

      {/* ─── Quick Status Filter Pills (1-Tap Switching) ─── */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar select-none">
        {statusChips.map((chip) => {
          const active = status === chip.value;
          return (
            <button
              key={chip.value}
              type="button"
              onClick={() => {
                setStatus(chip.value);
                setPage(1);
              }}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition shadow-2xs shrink-0 ${
                active
                  ? chip.isLive
                    ? 'bg-red-600 text-white shadow-sm font-black'
                    : 'bg-emerald-700 text-white shadow-sm font-black'
                  : 'bg-white text-slate-600 border border-slate-200/90 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {chip.isLive && (
                <span
                  className={`h-2 w-2 rounded-full ${
                    active ? 'bg-white animate-ping' : 'bg-red-500'
                  }`}
                />
              )}
              <span>{chip.label}</span>
            </button>
          );
        })}
      </div>

      {/* ─── Search and Dropdown Bar ─── */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" aria-hidden />
          <input
            className="input !pl-9 text-xs sm:text-sm"
            placeholder="Search by match, club or ground..."
            aria-label="Search matches"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="sm:w-44">
          <DropdownSelect
            value={status}
            onChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
            options={[
              { value: '', label: 'All statuses' },
              { value: 'live', label: 'Live' },
              { value: 'scheduled', label: 'Scheduled' },
              { value: 'completed', label: 'Completed' },
              { value: 'abandoned', label: 'Abandoned' },
            ]}
            placeholder="All statuses"
          />
        </div>
      </div>

      <div className="empty:hidden">
        {actionError && <ErrorBox message={actionError} />}
      </div>

      {/* ─── Matches List ─── */}
      {loading && !data && combinedItems.length === 0 ? (
        <SkeletonMatchCard count={4} />
      ) : error && combinedItems.length === 0 ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : combinedItems.length === 0 ? (
        <Empty
          icon={Trophy}
          title={q || status ? 'No matches match your filter' : 'No matches yet'}
          text={
            q || status
              ? 'Try selecting a different status or changing search keywords.'
              : 'Create a match between two teams to begin live scoring.'
          }
          action={
            !q &&
            !status &&
            !currentLiveMatch &&
            data?.canCreate && (
              <Link
                to="/matches/new"
                className="btn btn-green bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs text-xs !py-1.5 !px-3.5 inline-flex items-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" /> Start First Match
              </Link>
            )
          }
        />
      ) : (
        <>
          <ul className="space-y-2.5 sm:space-y-3">
            {combinedItems.map((m) => {
              const isLive = m.status === 'live';
              const isCompleted = m.status === 'completed';
              const isScheduled = m.status === 'scheduled';
              const isAbandoned = m.status === 'abandoned';

              const borderAccent = isLive
                ? 'border-2 border-amber-400/90 bg-gradient-to-r from-amber-50/50 via-white to-white shadow-xs'
                : isCompleted
                ? 'border border-slate-200/90 bg-white hover:border-emerald-300 shadow-2xs'
                : isAbandoned
                ? 'border border-slate-300 bg-slate-50/50 shadow-2xs'
                : 'border border-slate-200/90 bg-white hover:border-blue-300 shadow-2xs';

              return (
                <li key={m.id} className={`card p-3 sm:p-3.5 rounded-xl transition ${borderAccent}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {/* Top Header: Title, Format & Status */}
                      <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                        <Link to={`/matches/${m.id}`} className="flex items-center gap-1.5 min-w-0 flex-1 hover:text-emerald-700 transition">
                          <span className={`text-sm sm:text-base truncate ${isLive ? 'font-black text-amber-950' : 'font-extrabold text-slate-900'}`}>
                            {m.name}
                          </span>
                          <span className="badge bg-slate-100 text-slate-700 text-[9.5px] uppercase font-bold py-0.2 px-1.5 rounded shrink-0">
                            {m.format} · {m.overs} ov
                          </span>
                        </Link>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {m.isOffline && (
                            <span className="badge bg-amber-100 text-amber-950 border border-amber-300 text-[9px] font-black py-0.2 px-1.5 rounded shrink-0 flex items-center gap-1">
                              <WifiOff className="h-3 w-3 text-amber-600" /> Offline
                            </span>
                          )}
                          <StatusBadge status={m.status} />
                        </div>
                      </div>

                      {/* Venue and Date meta */}
                      {(m.venue || m.date) && (
                        <div className="flex items-center gap-2 text-[10.5px] text-slate-400 mb-1 flex-wrap">
                          {m.venue && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-slate-400" />
                              <span className="truncate max-w-[180px]">{m.venue}</span>
                            </span>
                          )}
                          {m.venue && m.date && <span>•</span>}
                          {m.date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-slate-400" />
                              <span>{fmtDate(m.date)}</span>
                            </span>
                          )}
                        </div>
                      )}

                      {/* Scoreboard Block */}
                      <Link to={`/matches/${m.id}`} className="block">
                        <MatchScoreLine match={m} />
                      </Link>

                      {/* Bottom Action Strip */}
                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Live match indicator / Action */}
                          {isLive && (
                            <Link
                              to={`/matches/${m.id}`}
                              className="btn min-h-[38px] text-xs sm:text-sm !py-2 !px-3.5 font-black bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white shadow-2xs flex items-center gap-1.5 rounded-xl border border-amber-400/40"
                            >
                              <Radio className="h-4 w-4 animate-pulse text-amber-100" />
                              <span>Update Match</span>
                            </Link>
                          )}

                          {/* Completed or Abandoned match Scorecard PDF button */}
                          {(isCompleted || isAbandoned) && (
                            <button
                              type="button"
                              onClick={() => nav(`/matches/${m.id}/scorecard`)}
                              className="min-h-[38px] inline-flex items-center gap-1.5 text-xs sm:text-sm font-black text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 px-3.5 py-2 rounded-xl transition"
                            >
                              <FileText className="h-4 w-4 text-rose-600" />
                              <span>Scorecard & PDF</span>
                            </button>
                          )}

                          {/* Scheduled Match action */}
                          {isScheduled && (
                            <Link
                              to={`/matches/${m.id}`}
                              className="btn btn-outline min-h-[38px] text-xs sm:text-sm !py-2 !px-3.5 font-black text-slate-700 hover:text-emerald-700 flex items-center gap-1.5 rounded-xl"
                            >
                              <span>Enter Match</span> <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                          )}
                        </div>

                        {/* Share and Admin controls */}
                        <div className="flex items-center gap-2 ml-auto">
                          <button
                            type="button"
                            onClick={(e) => shareMatchWhatsApp(m, e)}
                            className="min-h-[38px] min-w-[38px] flex items-center justify-center p-2 text-emerald-700 hover:bg-emerald-50 rounded-xl transition border border-emerald-200/60"
                            title="Share Match on WhatsApp"
                          >
                            <Share2 className="h-4 w-4" />
                          </button>

                          {m.canManage && (
                            <button
                              className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-600 transition border border-slate-200/60 hover:border-red-200"
                              onClick={() => setDel(m)}
                              aria-label={`Delete ${m.name}`}
                              title="Delete Match"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {data && <Pagination page={data.page} pages={data.pages} total={data.total} onPage={setPage} />}
        </>
      )}

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={!!del}
        danger
        title="Delete match?"
        confirmLabel="Delete match"
        busy={busy}
        onCancel={() => setDel(null)}
        onConfirm={doDelete}
        message={`This permanently deletes "${del?.name}" including every ball scored. ${
          del?.status === 'completed' ? 'Only the Super Admin can delete completed matches.' : ''
        }`}
      />
    </div>
  );
}
