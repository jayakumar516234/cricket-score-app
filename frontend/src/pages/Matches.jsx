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
} from 'lucide-react';
import { api, qs } from '../api.js';
import { useFetch } from '../useFetch.js';
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

  useEffect(() => {
    const t = setTimeout(() => {
      setQ(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, error, loading, reload } = useFetch(
    `/matches${qs({ search: q, status, page, limit: 8 })}`,
    { poll: 20000 }
  );

  const doDelete = async () => {
    setBusy(true);
    try {
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
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'completed', label: 'Completed' },
  ];

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

        {data?.canCreate && (
          <Link
            to="/matches/new"
            className="btn btn-green bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs text-xs !py-1.5 !px-3 inline-flex items-center gap-1"
          >
            <Plus className="h-3.5 w-3.5" /> Start Match
          </Link>
        )}
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
      {loading && !data ? (
        <SkeletonMatchCard count={4} />
      ) : error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : data.items.length === 0 ? (
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
            data.canCreate && (
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
            {data.items.map((m) => {
              const isLive = m.status === 'live';
              const isCompleted = m.status === 'completed';
              const isScheduled = m.status === 'scheduled';

              const borderAccent = isLive
                ? 'border-2 border-red-500/90 bg-gradient-to-r from-red-50/50 via-white to-white shadow-xs'
                : isCompleted
                ? 'border border-slate-200/90 bg-white hover:border-emerald-300 shadow-2xs'
                : 'border border-slate-200/90 bg-white hover:border-blue-300 shadow-2xs';

              return (
                <li key={m.id} className={`card p-3 sm:p-3.5 rounded-xl transition ${borderAccent}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {/* Top Header: Title, Format & Status */}
                      <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                        <Link to={`/matches/${m.id}`} className="flex items-center gap-1.5 min-w-0 flex-1 hover:text-emerald-700 transition">
                          <span className={`text-sm sm:text-base truncate ${isLive ? 'font-black text-red-950' : 'font-extrabold text-slate-900'}`}>
                            {m.name}
                          </span>
                          <span className="badge bg-slate-100 text-slate-700 text-[9.5px] uppercase font-bold py-0.2 px-1.5 rounded shrink-0">
                            {m.format} · {m.overs} ov
                          </span>
                        </Link>

                        <div className="flex items-center gap-1.5 shrink-0">
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
                              className="btn btn-green text-xs !py-1 !px-2.5 font-black bg-red-600 hover:bg-red-700 text-white shadow-2xs flex items-center gap-1"
                            >
                              <Radio className="h-3.5 w-3.5 animate-pulse text-white" />
                              <span>Live Scoring</span>
                            </Link>
                          )}

                          {/* Completed match Scorecard PDF button */}
                          {isCompleted && (
                            <button
                              type="button"
                              onClick={() => nav(`/matches/${m.id}/scorecard`)}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/60 px-2 py-1 rounded-md transition"
                            >
                              <FileText className="h-3 w-3 text-rose-600" />
                              <span>Scorecard & PDF</span>
                            </button>
                          )}

                          {/* Scheduled Match action */}
                          {isScheduled && (
                            <Link
                              to={`/matches/${m.id}`}
                              className="btn btn-outline text-xs !py-1 !px-2.5 font-bold text-slate-700 hover:text-emerald-700 flex items-center gap-1"
                            >
                              <span>Enter Match</span> <ArrowRight className="h-3 w-3" />
                            </Link>
                          )}
                        </div>

                        {/* Share and Admin controls */}
                        <div className="flex items-center gap-1.5 ml-auto">
                          <button
                            type="button"
                            onClick={(e) => shareMatchWhatsApp(m, e)}
                            className="btn btn-ghost !p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg text-xs"
                            title="Share Match on WhatsApp"
                          >
                            <Share2 className="h-3.5 w-3.5" />
                          </button>

                          {m.canManage && (
                            <button
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
                              onClick={() => setDel(m)}
                              aria-label={`Delete ${m.name}`}
                              title="Delete Match"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
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

          <Pagination page={data.page} pages={data.pages} total={data.total} onPage={setPage} />
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
