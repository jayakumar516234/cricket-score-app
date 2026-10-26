import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Crown, Printer, Download, Image as ImageIcon, Loader2, QrCode, Sparkles } from 'lucide-react';
import { useFetch } from '../useFetch.js';
import { ErrorBox, Spinner, StatusBadge } from '../components/ui.jsx';
import { ScorecardTabs, teamOf } from '../components/ScoreParts.jsx';
import { WhatsAppShareButton } from '../components/WhatsAppShare.jsx';
import { OverBarChart } from '../components/OverBarChart.jsx';
import { PrintScorecardSheet } from '../components/PrintScorecardSheet.jsx';
import { downloadScorecardImage } from '../utils/scorecardImage.js';
import { downloadMatchPoster } from '../utils/matchPoster.js';
import { QRCodeModal } from '../components/QRCodeModal.jsx';

export default function Scorecard() {
  const { id } = useParams();
  const { data: view, error, loading, reload } = useFetch(`/matches/${id}`);
  const [downloading, setDownloading] = useState(false);
  const [posterLoading, setPosterLoading] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  if (loading) return <Spinner />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  const { match } = view;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadImage = () => {
    setDownloading(true);
    try {
      downloadScorecardImage(view);
    } finally {
      setTimeout(() => setDownloading(false), 800);
    }
  };

  const handleDownloadPoster = () => {
    setPosterLoading(true);
    try {
      downloadMatchPoster(view);
    } finally {
      setTimeout(() => setPosterLoading(false), 800);
    }
  };

  return (
    <>
      {/* Web Interactive View (Hidden when printing) */}
      <div className="space-y-4 print:hidden">
        <div className="flex items-center gap-2">
          <Link to={`/matches/${id}`} className="btn btn-ghost !p-2" aria-label="Back to match">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="flex-1 text-lg font-bold text-slate-900 truncate">{match.name}</h1>
          <StatusBadge status={match.status} />
        </div>

        <section className="card grid grid-cols-2 gap-3 p-4 text-center">
          {[match.homeTeam, match.awayTeam].map((t) => {
            const inn = view.innings.find((i) => i.battingTeam === t.id);
            return (
              <div key={t.id}>
                <p className="text-sm font-semibold text-slate-700">{t.name}</p>
                <p className="text-2xl font-extrabold text-slate-900">
                  {inn ? `${inn.state.runs}/${inn.state.wickets}` : '-'}
                </p>
                <p className="text-xs text-slate-500">{inn ? `(${inn.state.overs} ov)` : 'Yet to bat'}</p>
              </div>
            );
          })}
          {match.result && (
            <p className="col-span-2 text-sm font-semibold text-pitch-700">{match.result.summary}</p>
          )}
          {match.playerOfMatch && (
            <p className="col-span-2 flex items-center justify-center gap-1.5 text-sm text-slate-600">
              <Crown className="h-4 w-4 text-amber-500" aria-hidden /> Player of the Match:{' '}
              <span className="font-semibold">{match.playerOfMatch.name}</span>
              {match.playerOfMatch.summary ? ` (${match.playerOfMatch.summary})` : ''}
            </p>
          )}
        </section>

        {/* Action Buttons: WhatsApp Share, Download Image, Winner Poster, QR Code & Print / Save PDF */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <WhatsAppShareButton view={view} label="Share Score" />
          <button
            type="button"
            onClick={handleDownloadImage}
            disabled={downloading}
            className="btn btn-outline flex items-center justify-center gap-1.5 border-emerald-300 bg-emerald-50/50 text-emerald-800 hover:bg-emerald-100/60 shadow-2xs font-bold text-xs !py-2.5"
          >
            {downloading ? <Loader2 className="h-4 w-4 animate-spin text-emerald-600" /> : <ImageIcon className="h-4 w-4 text-emerald-600" />}
            <span>Scorecard Image</span>
          </button>
          {match.status === 'completed' ? (
            <button
              type="button"
              onClick={handleDownloadPoster}
              disabled={posterLoading}
              className="btn btn-outline flex items-center justify-center gap-1.5 border-amber-300 bg-amber-50/60 text-amber-900 hover:bg-amber-100/70 shadow-2xs font-bold text-xs !py-2.5"
            >
              {posterLoading ? <Loader2 className="h-4 w-4 animate-spin text-amber-600" /> : <Sparkles className="h-4 w-4 text-amber-600" />}
              <span>Winner Poster</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setQrOpen(true)}
              className="btn btn-outline flex items-center justify-center gap-1.5 border-blue-300 bg-blue-50/60 text-blue-900 hover:bg-blue-100/70 shadow-2xs font-bold text-xs !py-2.5"
            >
              <QrCode className="h-4 w-4 text-blue-600" />
              <span>Fan QR Code</span>
            </button>
          )}
          <button
            type="button"
            onClick={handlePrint}
            className="btn btn-outline flex items-center justify-center gap-1.5 border-slate-300 text-slate-800 hover:bg-slate-50 shadow-2xs font-bold text-xs !py-2.5"
          >
            <Printer className="h-4 w-4 text-slate-600" />
            <span>Print / PDF</span>
          </button>
        </div>

        {/* QR Code Modal */}
        <QRCodeModal open={qrOpen} onClose={() => setQrOpen(false)} match={match} matchId={id} />

        {/* Over-by-Over Bar Chart & Worm Chart */}
        <OverBarChart view={view} />

        {/* Detailed Scorecard Tabs (Batting, Bowling, Extras, Commentary) */}
        <ScorecardTabs view={view} />
      </div>

      {/* Official Print Layout (Only rendered during window.print) */}
      <PrintScorecardSheet view={view} />
    </>
  );
}
