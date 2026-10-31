import { useEffect, useState } from 'react';
import { ArrowRight, Sparkles, Trophy } from 'lucide-react';
import { CricketBallIcon } from './ui.jsx';

/**
 * High-octane Cricket Stadium Intro Splash Screen
 * Runs on first visit to Login page for 6 seconds (5-10s range) with cricket animation.
 */
export function CricketIntroSplash({ onFinish, duration = 6000 }) {
  const [progress, setProgress] = useState(0);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(pct);

      if (elapsed >= duration) {
        clearInterval(interval);
        handleExit();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [duration]);

  const handleExit = () => {
    setIsExiting(true);
    setTimeout(() => {
      try {
        sessionStorage.setItem('cricket_intro_seen', '1');
      } catch {}
      if (onFinish) onFinish();
    }, 600);
  };

  const secondsRemaining = Math.max(1, Math.ceil(((100 - progress) / 100) * (duration / 1000)));

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col justify-between overflow-hidden bg-gradient-to-b from-navy-950 via-slate-900 to-navy-950 p-5 sm:p-8 text-white transition-all duration-700 select-none ${
        isExiting ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
      }`}
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to Cricket Score App"
    >
      {/* Stadium Floodlights & Ambient Glow in background */}
      <div className="pointer-events-none absolute -top-24 left-1/4 h-64 w-64 rounded-full bg-blue-500/25 blur-3xl animate-pulse" />
      <div className="pointer-events-none absolute -top-24 right-1/4 h-64 w-64 rounded-full bg-emerald-500/25 blur-3xl animate-pulse" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 h-72 w-96 rounded-full bg-pitch-500/15 blur-3xl" />

      {/* Top Header Bar */}
      <div className="relative z-10 flex items-center justify-between w-full max-w-2xl mx-auto">
        <div className="flex items-center gap-2 rounded-full border border-pitch-500/30 bg-pitch-950/60 backdrop-blur-md px-3.5 py-1 text-xs font-bold text-pitch-300 shadow-glow-pitch">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pitch-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-pitch-500" />
          </span>
          <span className="tracking-wider uppercase text-[11px]">Match Day Ready</span>
        </div>

        <button
          onClick={handleExit}
          className="group flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 hover:bg-white/15 px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white transition shadow-sm backdrop-blur-sm"
          title="Skip to Login"
        >
          <span>Skip</span>
          <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* Center Cricket Arena Showcase */}
      <div className="relative z-10 flex flex-col items-center justify-center my-auto w-full max-w-xl mx-auto text-center">
        {/* Animated App Crest with pulsing aura */}
        <div className="relative mb-4">
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-pitch-500 to-amber-400 blur-xl opacity-50 animate-pulse" />
          <div className="relative flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-navy-900 via-navy-850 to-slate-900 border border-white/20 shadow-2xl p-3">
            <CricketBallIcon className="w-full h-full drop-shadow-lg" />
          </div>
        </div>

        {/* Brand Title with Gradient Glow */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight bg-gradient-to-r from-white via-pitch-200 to-emerald-400 bg-clip-text text-transparent drop-shadow-sm">
          CRICKET SCORE
        </h1>
        <p className="mt-1.5 text-xs sm:text-sm font-medium text-slate-300 max-w-md">
          Live Ball-by-Ball Scoring · Tournament Brackets · Multi-Ground Play
        </p>

        {/* Cricket Pitch & Batsman Hit Action SVG */}
        <div className="relative w-full max-w-[340px] sm:max-w-[420px] h-[190px] sm:h-[230px] flex items-center justify-center mt-3">
          <svg
            viewBox="0 0 320 200"
            className="w-full h-full overflow-visible drop-shadow-2xl"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="splashPitchGrass" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#15803d" />
                <stop offset="60%" stopColor="#166534" />
                <stop offset="100%" stopColor="#14532d" />
              </linearGradient>
              <linearGradient id="splashPitchCrease" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#d97706" />
                <stop offset="50%" stopColor="#b45309" />
                <stop offset="100%" stopColor="#92400e" />
              </linearGradient>
              <radialGradient id="splashBallRed" cx="35%" cy="30%" r="65%">
                <stop offset="0%" stopColor="#f87171" />
                <stop offset="40%" stopColor="#dc2626" />
                <stop offset="85%" stopColor="#991b1b" />
                <stop offset="100%" stopColor="#450a0a" />
              </radialGradient>
              <linearGradient id="splashBatWood" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fef3c7" />
                <stop offset="35%" stopColor="#fde68a" />
                <stop offset="80%" stopColor="#d97706" />
                <stop offset="100%" stopColor="#92400e" />
              </linearGradient>
              <radialGradient id="splashSparkGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="40%" stopColor="#fef08a" />
                <stop offset="80%" stopColor="#f97316" />
                <stop offset="100%" stopColor="transparent" />
              </radialGradient>
            </defs>

            {/* Grass Turf */}
            <ellipse cx="160" cy="178" rx="150" ry="20" fill="url(#splashPitchGrass)" opacity="0.85" />
            <path d="M 40 178 L 280 178" stroke="url(#splashPitchCrease)" strokeWidth="12" strokeLinecap="round" opacity="0.75" />
            <line x1="82" y1="172" x2="135" y2="172" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" opacity="0.9" />
            <line x1="225" y1="172" x2="265" y2="172" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />

            {/* Stumps & Bails */}
            <g transform="translate(68, 118)">
              <ellipse cx="12" cy="56" rx="14" ry="3" fill="#022c22" opacity="0.6" />
              <rect x="2" y="4" width="4" height="52" rx="1.5" fill="#fef08a" stroke="#ca8a04" strokeWidth="0.8" />
              <rect x="10" y="2" width="4" height="54" rx="1.5" fill="#fef08a" stroke="#ca8a04" strokeWidth="0.8" />
              <rect x="18" y="4" width="4" height="52" rx="1.5" fill="#fef08a" stroke="#ca8a04" strokeWidth="0.8" />
              <rect x="0" y="1" width="11" height="2.5" rx="1" fill="#facc15" />
              <rect x="13" y="1" width="11" height="2.5" rx="1" fill="#facc15" />
            </g>

            {/* Bounce Dust */}
            <g transform="translate(165, 172)" className="anim-shot-dust">
              <circle cx="0" cy="0" r="8" fill="#fde68a" opacity="0.6" />
              <circle cx="8" cy="-2" r="5" fill="#fef3c7" opacity="0.5" />
            </g>

            {/* Batsman */}
            <g transform="translate(90, 80)">
              <ellipse cx="26" cy="94" rx="22" ry="5" fill="#022c22" opacity="0.7" />
              <g className="anim-batsman-body">
                <rect x="8" y="55" width="8" height="38" rx="4" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
                <rect x="7" y="60" width="10" height="26" rx="3" fill="#f8fafc" stroke="#94a3b8" strokeWidth="0.8" />
                <rect x="6" y="88" width="12" height="6" rx="2" fill="#059669" />

                <rect x="22" y="52" width="9" height="42" rx="4.5" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
                <rect x="21" y="58" width="11" height="28" rx="3" fill="#f8fafc" stroke="#94a3b8" strokeWidth="0.8" />
                <rect x="22" y="90" width="14" height="6" rx="2" fill="#059669" />

                <path d="M 12 28 C 12 28, 20 22, 32 24 C 40 25, 42 32, 40 54 L 14 54 Z" fill="#059669" />
                <path d="M 16 32 L 36 34 L 34 40 L 16 38 Z" fill="#34d399" />

                <circle cx="32" cy="14" r="11" fill="#064e3b" />
                <path d="M 33 16 L 46 17 L 43 20 Z" fill="#047857" />
                <path d="M 36 17 L 44 21 L 36 24 Z" stroke="#e2e8f0" strokeWidth="1.2" fill="none" />
                <circle cx="37" cy="16" r="3.5" fill="#fed7aa" />
                <path d="M 22 28 Q 28 36, 32 38" stroke="#059669" strokeWidth="6" strokeLinecap="round" />
              </g>

              {/* Bat */}
              <g className="anim-bat-swing">
                <circle cx="33" cy="38" r="4.5" fill="#ffffff" stroke="#ef4444" strokeWidth="1" />
                <circle cx="35" cy="42" r="4" fill="#ffffff" stroke="#ef4444" strokeWidth="1" />
                <rect x="33" y="36" width="4" height="22" rx="1.5" fill="#ffffff" stroke="#1e293b" strokeWidth="0.6" />
                <path d="M 31 56 L 40 56 L 39 104 C 39 107, 32 107, 32 104 Z" fill="url(#splashBatWood)" stroke="#78350f" strokeWidth="1" />
                <rect x="33" y="60" width="5" height="18" rx="1" fill="#dc2626" />
                <rect x="33" y="63" width="5" height="4" fill="#facc15" />
              </g>

              {/* Impact Flash */}
              <g transform="translate(36, 68)" className="anim-impact-spark">
                <circle cx="0" cy="0" r="18" fill="url(#splashSparkGlow)" />
                <path d="M -18 0 L 18 0 M 0 -18 L 0 18 M -12 -12 L 12 12 M -12 12 L 12 -12" stroke="#fef08a" strokeWidth="2.2" strokeLinecap="round" />
              </g>
            </g>

            {/* Ball Delivery */}
            <g transform="translate(100, 148)">
              <g className="anim-ball-delivery">
                <circle cx="0" cy="0" r="8.5" fill="url(#splashBallRed)" />
                <ellipse cx="-2.5" cy="-2.5" rx="3" ry="1.8" transform="rotate(-30 -2.5 -2.5)" fill="#ffffff" opacity="0.45" />
                <path d="M -6 -2 Q 0 4, 6 2" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" fill="none" />
                <path d="M 6 0 L 22 -3" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
              </g>
            </g>
          </svg>
        </div>
      </div>

      {/* Bottom Progress Bar & Loading Indicator */}
      <div className="relative z-10 w-full max-w-md mx-auto space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-400 px-1">
          <span className="flex items-center gap-1.5 text-pitch-300">
            <Sparkles className="h-3.5 w-3.5 text-pitch-400 animate-spin" />
            <span>Loading App Engine...</span>
          </span>
          <span className="font-mono text-slate-300 font-bold">{secondsRemaining}s</span>
        </div>

        {/* Glow Progress Bar */}
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-800/80 border border-white/10 p-0.5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-pitch-400 to-teal-400 transition-all duration-75 shadow-glow-pitch"
            style={{ width: `${progress}%` }}
          />
        </div>

        <p className="text-center text-[11px] text-slate-500 tracking-wide">
          Official Grassroots &amp; Village League Scoring Engine
        </p>
      </div>
    </div>
  );
}
