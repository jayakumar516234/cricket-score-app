import { useState } from 'react';
import { Share2, Check, Copy } from 'lucide-react';

export function generateWhatsAppMessage(view) {
  if (!view || !view.match) return '';
  const { match } = view;
  const home = match.homeTeam?.name || 'Team 1';
  const away = match.awayTeam?.name || 'Team 2';
  const inn1 = view.innings?.[0];
  const inn2 = view.innings?.[1];

  let text = `🏏 *${home} vs ${away}*\n`;

  if (match.status === 'completed') {
    text += `🏆 *${match.result?.summary || 'Match Completed'}*\n\n`;
  } else if (match.status === 'live') {
    text += `🔴 *LIVE MATCH SCORE*\n\n`;
  } else {
    text += `📅 *Upcoming Match*\n\n`;
  }

  if (inn1?.state) {
    const s1 = inn1.state;
    const t1 = inn1.battingTeam === match.homeTeam?.id ? home : away;
    text += `📊 *${t1}:* ${s1.runs}/${s1.wickets} (${s1.overs} ov)\n`;
  }

  if (inn2?.state && (match.currentInnings >= 2 || match.status === 'completed')) {
    const s2 = inn2.state;
    const t2 = inn2.battingTeam === match.homeTeam?.id ? home : away;
    text += `📊 *${t2}:* ${s2.runs}/${s2.wickets} (${s2.overs} ov)\n`;
  }

  if (match.status === 'live' && inn2?.state && inn2.state.target) {
    text += `🎯 *Target:* ${inn2.state.target} runs (${inn2.state.runsRequired} needed in ${inn2.state.ballsRemaining} balls)\n`;
  }

  if (match.playerOfMatch) {
    text += `\n⭐ *Player of the Match:* ${match.playerOfMatch.name}`;
    if (match.playerOfMatch.summary) text += ` (${match.playerOfMatch.summary})`;
    text += `\n`;
  }

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
  if (currentUrl) {
    text += `\n📲 *Full Scorecard Link:* ${currentUrl}\n`;
  }
  text += `_Scored via Cricket Score App_`;

  return text;
}

export function WhatsAppShareButton({ view, className = '', label = 'Share on WhatsApp' }) {
  const [copied, setCopied] = useState(false);

  const handleWhatsAppShare = () => {
    const text = generateWhatsAppMessage(view);
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleCopy = async () => {
    const text = generateWhatsAppMessage(view);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={handleWhatsAppShare}
        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-3.5 py-2 text-xs sm:text-sm font-bold text-white shadow-xs hover:from-emerald-500 hover:to-teal-500 hover:shadow transition active:scale-[0.98]"
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 fill-current" aria-hidden="true">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
        <span>{label}</span>
      </button>

      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition active:scale-[0.98]"
        title="Copy match score text"
      >
        {copied ? (
          <>
            <Check className="h-4 w-4 text-emerald-600" />
            <span className="text-emerald-700 font-bold text-xs">Copied!</span>
          </>
        ) : (
          <>
            <Copy className="h-4 w-4 text-slate-500" />
            <span className="hidden sm:inline text-xs">Copy</span>
          </>
        )}
      </button>
    </div>
  );
}
