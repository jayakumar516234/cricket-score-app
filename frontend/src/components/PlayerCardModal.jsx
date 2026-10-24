import { useState } from 'react';
import { X, Trophy, Share2, Check, Copy, Shield, Award, Sparkles } from 'lucide-react';

export function generatePlayerWhatsAppText(player, teamName) {
  if (!player) return '';
  let text = `🏏 *${player.name}*`;
  if (player.jerseyNumber != null) text += ` (#${player.jerseyNumber})`;
  if (teamName) text += ` · *${teamName}*\n`;
  else text += `\n`;
  text += `Role: *${player.role || 'Player'}*\n\n`;

  text += `📊 *Career Batting Stats:*\n`;
  text += `• Matches: ${player.matches || 0} | Innings: ${player.innings || 0}\n`;
  text += `• Runs: ${player.runs || 0} | Highest Score: ${player.highestScore || 0}${player.notOuts ? '*' : ''}\n`;
  if (player.battingAvg != null) text += `• Batting Avg: ${player.battingAvg}\n`;
  if (player.strikeRate != null) text += `• Strike Rate: ${player.strikeRate}\n`;
  text += `• Boundaries: ${player.fours || 0} (4s) | ${player.sixes || 0} (6s)\n\n`;

  if (player.legalBallsBowled > 0 || player.wickets > 0) {
    text += `⚾ *Career Bowling Stats:*\n`;
    text += `• Overs: ${player.oversDisplay || '0.0'} | Wickets: ${player.wickets || 0}\n`;
    if (player.bowlingAvg != null) text += `• Bowling Avg: ${player.bowlingAvg}\n`;
    if (player.economyRate != null) text += `• Economy: ${player.economyRate}\n\n`;
  }

  if (player.catches > 0 || player.runOuts > 0 || player.stumpings > 0) {
    text += `🧤 *Fielding:* ${player.catches || 0} Catches · ${player.runOuts || 0} Run Outs\n\n`;
  }

  const url = typeof window !== 'undefined' ? window.location.href : '';
  if (url) text += `📲 *View Stats Online:* ${url}\n`;
  text += `_Cricket Score App_`;

  return text;
}

export function PlayerCardModal({ player, teamName, teamLogo, open, onClose }) {
  const [copied, setCopied] = useState(false);
  if (!open || !player) return null;

  const handleWhatsApp = () => {
    const text = generatePlayerWhatsAppText(player, teamName);
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleCopy = async () => {
    const text = generatePlayerWhatsAppText(player, teamName);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-gradient-to-b from-navy-950 via-navy-900 to-navy-950 text-white shadow-2xl border border-navy-700/80">
        {/* Ambient Top Glow */}
        <div className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 h-36 w-36 rounded-full bg-pitch-500/25 blur-3xl" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-slate-300 hover:bg-white/20 hover:text-white transition"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Player Header Banner */}
        <div className="p-6 text-center border-b border-navy-800/80 relative">
          <div className="mx-auto relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-tr from-pitch-600 to-emerald-400 text-navy-950 font-black text-2xl shadow-glow-pitch border-2 border-pitch-400/30 overflow-hidden">
            {player.photo ? (
              <img src={player.photo} alt={player.name} className="h-full w-full object-cover" />
            ) : (
              <span>{player.name.slice(0, 2).toUpperCase()}</span>
            )}
            {player.jerseyNumber != null && (
              <span className="absolute bottom-1 right-1 rounded-md bg-navy-950/90 px-1 text-[10px] font-black text-pitch-300 border border-pitch-500/40">
                #{player.jerseyNumber}
              </span>
            )}
          </div>

          <h3 className="mt-3 text-xl font-black text-white tracking-tight">{player.name}</h3>
          <div className="flex items-center justify-center gap-2 mt-1">
            <span className="badge bg-pitch-500/20 text-pitch-300 text-[11px] font-bold uppercase tracking-wider py-0.5 px-2.5 border border-pitch-500/30">
              {player.role || 'Player'}
            </span>
            {teamName && (
              <span className="text-xs text-slate-400 font-medium">
                {teamName}
              </span>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Batting Highlights */}
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-pitch-400 mb-2 flex items-center gap-1.5">
              <Trophy className="h-3.5 w-3.5" />
              <span>Career Batting</span>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="rounded-xl border border-navy-800 bg-navy-900/60 p-2.5">
                <div className="text-lg font-black text-white">{player.matches || 0}</div>
                <div className="text-[10px] font-semibold text-slate-400">Matches</div>
              </div>
              <div className="rounded-xl border border-navy-800 bg-navy-900/60 p-2.5">
                <div className="text-lg font-black text-white">{player.runs || 0}</div>
                <div className="text-[10px] font-semibold text-slate-400">Runs</div>
              </div>
              <div className="rounded-xl border border-navy-800 bg-navy-900/60 p-2.5">
                <div className="text-lg font-black text-pitch-400">{player.highestScore || 0}{player.notOuts ? '*' : ''}</div>
                <div className="text-[10px] font-semibold text-slate-400">High Score</div>
              </div>
              <div className="rounded-xl border border-navy-800 bg-navy-900/60 p-2.5">
                <div className="text-lg font-black text-white">{player.battingAvg ?? '-'}</div>
                <div className="text-[10px] font-semibold text-slate-400">Avg</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center mt-2">
              <div className="rounded-xl border border-navy-800/80 bg-navy-900/40 p-2">
                <div className="text-sm font-bold text-slate-200">{player.strikeRate ?? 0}</div>
                <div className="text-[10px] font-semibold text-slate-400">Strike Rate</div>
              </div>
              <div className="rounded-xl border border-navy-800/80 bg-navy-900/40 p-2">
                <div className="text-sm font-bold text-amber-300">{player.fours || 0}</div>
                <div className="text-[10px] font-semibold text-slate-400">4s (Fours)</div>
              </div>
              <div className="rounded-xl border border-navy-800/80 bg-navy-900/40 p-2">
                <div className="text-sm font-bold text-amber-400">{player.sixes || 0}</div>
                <div className="text-[10px] font-semibold text-slate-400">6s (Sixes)</div>
              </div>
            </div>
          </div>

          {/* Bowling Highlights */}
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-pitch-400 mb-2 flex items-center gap-1.5">
              <Award className="h-3.5 w-3.5" />
              <span>Career Bowling & Fielding</span>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="rounded-xl border border-navy-800 bg-navy-900/60 p-2.5">
                <div className="text-lg font-black text-white">{player.wickets || 0}</div>
                <div className="text-[10px] font-semibold text-slate-400">Wickets</div>
              </div>
              <div className="rounded-xl border border-navy-800 bg-navy-900/60 p-2.5">
                <div className="text-lg font-black text-white">{player.oversDisplay || '0.0'}</div>
                <div className="text-[10px] font-semibold text-slate-400">Overs</div>
              </div>
              <div className="rounded-xl border border-navy-800 bg-navy-900/60 p-2.5">
                <div className="text-lg font-black text-white">{player.economyRate ?? '-'}</div>
                <div className="text-[10px] font-semibold text-slate-400">Economy</div>
              </div>
              <div className="rounded-xl border border-navy-800 bg-navy-900/60 p-2.5">
                <div className="text-lg font-black text-emerald-300">{player.catches || 0}</div>
                <div className="text-[10px] font-semibold text-slate-400">Catches</div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-navy-950 border-t border-navy-800/80 flex items-center gap-2">
          <button
            type="button"
            onClick={handleWhatsApp}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:from-emerald-500 hover:to-teal-500 transition active:scale-[0.98]"
          >
            <Share2 className="h-4 w-4" />
            <span>Share Stats on WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-navy-700 bg-navy-900 px-3.5 py-2.5 text-xs font-semibold text-slate-300 hover:bg-navy-800 hover:text-white transition active:scale-[0.98]"
            title="Copy stats text"
          >
            {copied ? (
              <Check className="h-4 w-4 text-emerald-400" />
            ) : (
              <Copy className="h-4 w-4 text-slate-400" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
