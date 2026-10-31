import { useEffect, useRef, useState } from 'react';
import { AlertCircle, ChevronLeft, ChevronRight, ChevronDown, Check, Loader2, Shield, ImagePlus, X } from 'lucide-react';

export const CricketBallIcon = ({ className = "w-10 h-10" }) => (
  <svg
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <defs>
      <radialGradient id="cricketBallGrad" cx="35%" cy="30%" r="65%">
        <stop offset="0%" stopColor="#ef4444" />
        <stop offset="45%" stopColor="#dc2626" />
        <stop offset="85%" stopColor="#991b1b" />
        <stop offset="100%" stopColor="#5f0f0f" />
      </radialGradient>
      <filter id="ballGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#7f1d1d" floodOpacity="0.4" />
      </filter>
    </defs>
    {/* Ball sphere */}
    <circle cx="50" cy="50" r="46" fill="url(#cricketBallGrad)" filter="url(#ballGlow)" />
    {/* Highlight shine */}
    <ellipse cx="38" cy="26" rx="16" ry="10" transform="rotate(-30 38 26)" fill="white" fillOpacity="0.28" />
    
    {/* Cricket Ball Center Seam */}
    <path
      d="M50 4 C 62 28, 62 72, 50 96"
      stroke="#fef08a"
      strokeWidth="3.2"
      strokeLinecap="round"
      fill="none"
    />
    <path
      d="M50 4 C 38 28, 38 72, 50 96"
      stroke="#b91c1c"
      strokeWidth="1.2"
      fill="none"
      opacity="0.6"
    />
    
    {/* Seam stitches */}
    <path
      d="M44 14 L56 16 M47 24 L59 26 M49 35 L61 37 M50 47 L62 49 M49 59 L61 61 M47 71 L59 73 M44 82 L56 84"
      stroke="#ffffff"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

export const CricketShotLoader = ({ label = 'Loading match details...' }) => (
  <div
    className="flex min-h-[55vh] sm:min-h-[65vh] w-full flex-col items-center justify-center p-4 sm:p-8 select-none"
    role="status"
    aria-label={label}
  >
    {/* Stadium backdrop container */}
    <div className="relative w-full max-w-xl rounded-3xl overflow-hidden bg-gradient-to-b from-slate-900 via-navy-950 to-slate-950 p-6 sm:p-10 shadow-2xl ring-1 ring-white/10 flex flex-col items-center justify-center">
      {/* Stadium floodlights glow */}
      <div className="pointer-events-none absolute -top-16 left-1/4 h-36 w-36 rounded-full bg-blue-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -top-16 right-1/4 h-36 w-36 rounded-full bg-emerald-500/20 blur-3xl" />
      
      {/* Stadium boundary light header */}
      <div className="absolute top-3 inset-x-0 flex items-center justify-center gap-2 px-6">
        <span className="h-1 w-12 rounded-full bg-blue-500/30" />
        <span className="text-[10px] uppercase font-bold tracking-widest text-blue-300/70">
          Match Center
        </span>
        <span className="h-1 w-12 rounded-full bg-blue-500/30" />
      </div>

      {/* Main Cricket Scene SVG Animation */}
      <div className="relative w-full max-w-[380px] h-[210px] sm:h-[240px] flex items-center justify-center mt-3">
        <svg
          viewBox="0 0 320 200"
          className="w-full h-full overflow-visible drop-shadow-xl"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Pitch gradient */}
            <linearGradient id="pitchGrass" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#15803d" />
              <stop offset="60%" stopColor="#166534" />
              <stop offset="100%" stopColor="#14532d" />
            </linearGradient>
            <linearGradient id="pitchCrease" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#d97706" />
              <stop offset="50%" stopColor="#b45309" />
              <stop offset="100%" stopColor="#92400e" />
            </linearGradient>
            {/* Red Cricket Ball Gradient */}
            <radialGradient id="ballRed" cx="35%" cy="30%" r="65%">
              <stop offset="0%" stopColor="#f87171" />
              <stop offset="40%" stopColor="#dc2626" />
              <stop offset="85%" stopColor="#991b1b" />
              <stop offset="100%" stopColor="#450a0a" />
            </radialGradient>
            {/* Bat Wood Grain Gradient */}
            <linearGradient id="batWood" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef3c7" />
              <stop offset="35%" stopColor="#fde68a" />
              <stop offset="80%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#92400e" />
            </linearGradient>
            {/* Hit Spark Flash */}
            <radialGradient id="sparkGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="40%" stopColor="#fef08a" />
              <stop offset="80%" stopColor="#f97316" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
          </defs>

          {/* 1. Grass Turf & Crease Base */}
          <ellipse cx="160" cy="178" rx="150" ry="20" fill="url(#pitchGrass)" opacity="0.8" />
          {/* Pitch mat strip */}
          <path d="M 40 178 L 280 178" stroke="url(#pitchCrease)" strokeWidth="12" strokeLinecap="round" opacity="0.75" />
          {/* Popping Crease white line */}
          <line x1="82" y1="172" x2="135" y2="172" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" opacity="0.9" />
          <line x1="225" y1="172" x2="265" y2="172" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity="0.6" />

          {/* 2. Three Stumps and Bails at batsman's end */}
          <g transform="translate(68, 118)">
            {/* Stumps Shadow */}
            <ellipse cx="12" cy="56" rx="14" ry="3" fill="#022c22" opacity="0.6" />
            {/* Stump 1 (Off) */}
            <rect x="2" y="4" width="4" height="52" rx="1.5" fill="#fef08a" stroke="#ca8a04" strokeWidth="0.8" />
            {/* Stump 2 (Middle) */}
            <rect x="10" y="2" width="4" height="54" rx="1.5" fill="#fef08a" stroke="#ca8a04" strokeWidth="0.8" />
            {/* Stump 3 (Leg) */}
            <rect x="18" y="4" width="4" height="52" rx="1.5" fill="#fef08a" stroke="#ca8a04" strokeWidth="0.8" />
            {/* Bails */}
            <rect x="0" y="1" width="11" height="2.5" rx="1" fill="#facc15" />
            <rect x="13" y="1" width="11" height="2.5" rx="1" fill="#facc15" />
          </g>

          {/* 3. Pitch bounce dust cloud */}
          <g transform="translate(165, 172)" className="anim-shot-dust">
            <circle cx="0" cy="0" r="8" fill="#fde68a" opacity="0.6" />
            <circle cx="8" cy="-2" r="5" fill="#fef3c7" opacity="0.5" />
          </g>

          {/* 4. Batsman Character (Body + Legs + Batting Swing) */}
          <g transform="translate(90, 80)">
            {/* Shadow beneath batsman feet */}
            <ellipse cx="26" cy="94" rx="22" ry="5" fill="#022c22" opacity="0.7" />

            {/* Batsman Body (Front foot drive movement) */}
            <g className="anim-batsman-body">
              {/* Back Leg with pads */}
              <rect x="8" y="55" width="8" height="38" rx="4" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
              <rect x="7" y="60" width="10" height="26" rx="3" fill="#f8fafc" stroke="#94a3b8" strokeWidth="0.8" />
              <rect x="6" y="88" width="12" height="6" rx="2" fill="#0284c7" />

              {/* Front Leg (Stepping into the shot) */}
              <rect x="22" y="52" width="9" height="42" rx="4.5" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
              <rect x="21" y="58" width="11" height="28" rx="3" fill="#f8fafc" stroke="#94a3b8" strokeWidth="0.8" />
              <rect x="22" y="90" width="14" height="6" rx="2" fill="#0284c7" />

              {/* Team Jersey / Torso */}
              <path
                d="M 12 28 C 12 28, 20 22, 32 24 C 40 25, 42 32, 40 54 L 14 54 Z"
                fill="#2563eb"
              />
              {/* Jersey accent stripe */}
              <path d="M 16 32 L 36 34 L 34 40 L 16 38 Z" fill="#38bdf8" />

              {/* Cricket Helmet & Face */}
              <circle cx="32" cy="14" r="11" fill="#1e3a8a" />
              {/* Helmet Peak */}
              <path d="M 33 16 L 46 17 L 43 20 Z" fill="#1d4ed8" />
              {/* Steel Grill */}
              <path d="M 36 17 L 44 21 L 36 24 Z" stroke="#e2e8f0" strokeWidth="1.2" fill="none" />
              {/* Player face peek */}
              <circle cx="37" cy="16" r="3.5" fill="#fed7aa" />

              {/* Left Arm / Shoulder */}
              <path d="M 22 28 Q 28 36, 32 38" stroke="#2563eb" strokeWidth="6" strokeLinecap="round" />
            </g>

            {/* Batting Arm & Cricket Bat (Swinging powerfully) */}
            <g className="anim-bat-swing">
              {/* Hands & Batting Gloves */}
              <circle cx="33" cy="38" r="4.5" fill="#ffffff" stroke="#ef4444" strokeWidth="1" />
              <circle cx="35" cy="42" r="4" fill="#ffffff" stroke="#ef4444" strokeWidth="1" />

              {/* Bat Handle with rubber grip */}
              <rect x="33" y="36" width="4" height="22" rx="1.5" fill="#ffffff" stroke="#1e293b" strokeWidth="0.6" />
              <line x1="33" y1="41" x2="37" y2="41" stroke="#ef4444" strokeWidth="1" />
              <line x1="33" y1="47" x2="37" y2="47" stroke="#ef4444" strokeWidth="1" />
              <line x1="33" y1="53" x2="37" y2="53" stroke="#ef4444" strokeWidth="1" />

              {/* Bat Blade (Willow Wood) */}
              <path
                d="M 31 56 L 40 56 L 39 104 C 39 107, 32 107, 32 104 Z"
                fill="url(#batWood)"
                stroke="#78350f"
                strokeWidth="1"
              />
              {/* Bat Colored Stickers */}
              <rect x="33" y="60" width="5" height="18" rx="1" fill="#dc2626" />
              <rect x="33" y="63" width="5" height="4" fill="#facc15" />
            </g>

            {/* Impact Flash Effect right at the bat's sweet spot */}
            <g transform="translate(36, 68)" className="anim-impact-spark">
              {/* Bright glowing burst */}
              <circle cx="0" cy="0" r="16" fill="url(#sparkGlow)" />
              {/* Sharp impact star spikes */}
              <path d="M -18 0 L 18 0 M 0 -18 L 0 18 M -12 -12 L 12 12 M -12 12 L 12 -12" stroke="#fef08a" strokeWidth="2" strokeLinecap="round" />
            </g>
          </g>

          {/* 5. Animated Cricket Ball Delivery, Pitch Bounce & Shot Launch */}
          <g transform="translate(100, 148)">
            <g className="anim-ball-delivery">
              {/* Red Leather Cricket Ball */}
              <circle cx="0" cy="0" r="8" fill="url(#ballRed)" />
              {/* Shiny reflection */}
              <ellipse cx="-2.5" cy="-2.5" rx="3" ry="1.8" transform="rotate(-30 -2.5 -2.5)" fill="#ffffff" opacity="0.45" />
              {/* White seam line */}
              <path d="M -6 -2 Q 0 4, 6 2" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" fill="none" />
              <path d="M -3 0 L -3 3 M 0 1 L 0 4 M 3 0 L 3 3" stroke="#fef08a" strokeWidth="0.8" strokeLinecap="round" />
              
              {/* Speed / motion trail streak behind ball */}
              <path d="M 6 0 L 22 -3" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
            </g>
          </g>

          {/* Boundary Six Star Trails in sky */}
          <g opacity="0.75">
            <path d="M 170 30 Q 230 40, 290 20" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.4" />
          </g>
        </svg>
      </div>

      {/* Loading Status Banner */}
      <div className="mt-6 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md px-4 py-1.5 ring-1 ring-white/15">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-semibold tracking-wider uppercase text-emerald-400">
            Live Action
          </span>
        </div>

        <h3 className="mt-3 text-base sm:text-lg font-bold text-white tracking-wide">
          {label}
        </h3>
        
        <p className="mt-1 text-xs sm:text-sm text-slate-300/80 flex items-center gap-1.5">
          <span>Timing the shot</span>
          <span className="inline-flex gap-1">
            <span className="h-1 w-1 animate-bounce rounded-full bg-red-400 [animation-delay:-0.3s]" />
            <span className="h-1 w-1 animate-bounce rounded-full bg-yellow-400 [animation-delay:-0.15s]" />
            <span className="h-1 w-1 animate-bounce rounded-full bg-emerald-400" />
          </span>
        </p>
      </div>
    </div>
  </div>
);

export const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse rounded-lg bg-slate-200/90 ${className}`} aria-hidden="true" />
);

export const SkeletonCard = ({ count = 3 }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="card p-4 border border-slate-200/80 space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-11 w-11 rounded-xl shrink-0" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-36 sm:w-48" />
              <Skeleton className="h-3 w-20 sm:w-28" />
            </div>
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
        <div className="space-y-1.5 pt-1">
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    ))}
  </div>
);

export const SkeletonList = ({ count = 4 }) => (
  <ul className="space-y-2">
    {Array.from({ length: count }).map((_, i) => (
      <li key={i} className="card p-3.5 flex items-center justify-between gap-3 border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2 min-w-0">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-36 sm:w-52" />
              <Skeleton className="h-4 w-12 rounded-md" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Skeleton className="h-8 w-16 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
      </li>
    ))}
  </ul>
);

export const SkeletonMatchCard = ({ count = 3 }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="card p-4 border border-slate-200/80 space-y-3.5 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-16 rounded-md" />
          </div>
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-5 w-16" />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-4 w-28" />
            </div>
            <Skeleton className="h-5 w-16" />
          </div>
        </div>
        <div className="pt-1 flex items-center justify-between border-t border-slate-100">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-7 w-20 rounded-lg" />
        </div>
      </div>
    ))}
  </div>
);

export const SkeletonScorecard = () => (
  <div className="space-y-4">
    <div className="rounded-2xl bg-gradient-to-br from-navy-950 to-navy-900 p-5 text-white shadow-lg space-y-4 border border-navy-800">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-28 bg-navy-800" />
        <Skeleton className="h-5 w-16 bg-navy-800 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Skeleton className="h-6 w-36 bg-navy-800" />
          <Skeleton className="h-8 w-24 bg-navy-800" />
        </div>
        <div className="space-y-2 text-right flex flex-col items-end">
          <Skeleton className="h-6 w-36 bg-navy-800" />
          <Skeleton className="h-8 w-24 bg-navy-800" />
        </div>
      </div>
    </div>
    <div className="flex gap-2">
      <Skeleton className="h-10 w-28 rounded-xl" />
      <Skeleton className="h-10 w-28 rounded-xl" />
    </div>
    <div className="card p-4 space-y-3">
      <Skeleton className="h-5 w-40 mb-3" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <Skeleton className="h-7 w-7 rounded-full" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex items-center gap-4">
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-4 w-12" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const SkeletonTeamDetail = () => (
  <div className="space-y-4">
    <div className="rounded-2xl bg-gradient-to-br from-navy-950 to-navy-900 p-5 text-white shadow-lg space-y-3 border border-navy-800">
      <div className="flex items-center gap-3.5">
        <Skeleton className="h-16 w-16 rounded-2xl bg-navy-800 shrink-0" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-44 bg-navy-800" />
          <Skeleton className="h-4 w-32 bg-navy-800/80" />
        </div>
      </div>
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="card p-3 space-y-1.5 shadow-xs">
          <Skeleton className="h-6 w-12" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
    <SkeletonList count={5} />
  </div>
);

export const SkeletonForm = () => (
  <div className="card p-5 max-w-xl mx-auto space-y-4 shadow-sm border border-slate-200/80">
    <Skeleton className="h-6 w-44 mb-4" />
    <div className="space-y-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-10 w-full rounded-lg" />
    </div>
    <div className="space-y-2">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-10 w-full rounded-lg" />
    </div>
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
    </div>
    <Skeleton className="h-11 w-full rounded-xl mt-4" />
  </div>
);

export const Spinner = ({ label = 'Loading...', size = 'default' }) => {
  if (size === 'sm') {
    return (
      <div className="inline-flex items-center gap-2 text-slate-500" role="status">
        <div className="cricket-ball-spin shrink-0">
          <CricketBallIcon className="h-5 w-5" />
        </div>
        {label && <span className="text-xs font-medium">{label}</span>}
      </div>
    );
  }

  // Modern Skeleton fallback instead of jarring animated spinner
  return <SkeletonList count={3} />;
};


export const ErrorBox = ({ message, onRetry }) =>
  message ? (
    <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="flex-1">{message}</div>
      {onRetry && <button onClick={onRetry} className="font-semibold underline">Try again</button>}
    </div>
  ) : null;

export const Empty = ({ icon: Icon = Shield, title, text, action }) => (
  <div className="flex flex-col items-center rounded-xl border-2 border-dashed border-slate-300 bg-white px-6 py-12 text-center">
    <Icon className="mb-3 h-10 w-10 text-slate-300" aria-hidden />
    <h3 className="font-semibold text-slate-700">{title}</h3>
    {text && <p className="mt-1 max-w-sm text-sm text-slate-500">{text}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export function Modal({ open, onClose, title, children, wide }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs p-0 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className={`max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-xl sm:rounded-2xl sm:pb-5 ${wide ? 'sm:max-w-2xl' : 'sm:max-w-md'}`}>
        <div className="mx-auto mb-3 h-1.5 w-12 shrink-0 rounded-full bg-slate-300 sm:hidden" aria-hidden />
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', danger, busy, onConfirm, onCancel, children }) {
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <p className="text-sm text-slate-600">{message}</p>
      {children}
      <div className="mt-5 flex justify-end gap-2">
        <button className="btn btn-outline" onClick={onCancel} disabled={busy}>Cancel</button>
        <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm} disabled={busy}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

export const Field = ({ label, error, required, hint, children, htmlFor }) => (
  <div>
    <label className="label" htmlFor={htmlFor}>{label}{required && <span className="text-red-500"> *</span>}</label>
    {children}
    {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    {error && <p className="mt-1 text-xs text-red-600" role="alert">{error}</p>}
  </div>
);

export function TeamLogo({ team, size = 40 }) {
  const style = { width: size, height: size };
  if (team?.logo) return <img src={team.logo} alt="" style={style} className="shrink-0 rounded-lg bg-slate-100 object-cover" />;
  const initials = (team?.name || '?').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div style={{ ...style, fontSize: size * 0.38 }} className="flex shrink-0 items-center justify-center rounded-lg bg-navy-700 font-bold text-pitch-400" aria-hidden>
      {initials}
    </div>
  );
}

export function Pagination({ page, pages, total, onPage }) {
  if (pages <= 1) return total ? <p className="mt-3 text-center text-xs text-slate-500">{total} result{total === 1 ? '' : 's'}</p> : null;
  return (
    <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
      <span>Page {page} of {pages} ({total} total)</span>
      <div className="flex gap-2">
        <button className="btn btn-outline !px-3 !py-1.5" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></button>
        <button className="btn btn-outline !px-3 !py-1.5" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page"><ChevronRight className="h-4 w-4" /></button>
      </div>
    </div>
  );
}

const STATUS_CONFIGS = {
  live: {
    className: 'bg-red-500/10 text-red-600 border border-red-500/30 shadow-xs shadow-red-500/10',
    dot: 'bg-red-600',
    pulse: true,
    label: 'LIVE',
  },
  completed: {
    className: 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/30 shadow-xs shadow-emerald-500/10',
    dot: 'bg-emerald-600',
    pulse: false,
    label: 'COMPLETED',
  },
  scheduled: {
    className: 'bg-blue-500/10 text-blue-700 border border-blue-500/30 shadow-xs',
    dot: 'bg-blue-600',
    pulse: false,
    label: 'UPCOMING',
  },
  abandoned: {
    className: 'bg-slate-500/10 text-slate-600 border border-slate-300',
    dot: 'bg-slate-400',
    pulse: false,
    label: 'ABANDONED',
  },
};

export const StatusBadge = ({ status }) => {
  const conf = STATUS_CONFIGS[status] || STATUS_CONFIGS.scheduled;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-wide transition ${conf.className}`}>
      {conf.pulse ? (
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-red-600" />
        </span>
      ) : (
        <span className={`h-1.5 w-1.5 rounded-full ${conf.dot}`} />
      )}
      {conf.label}
    </span>
  );
};


/** Resizes a picked image in the browser so only a small data URL is sent to the server. */
export function resizeImage(file, max = 256, quality = 0.82) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('Please choose an image file'));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the image'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('That file is not a valid image'));
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export function ImagePicker({ value, onChange, label = 'Add image', size = 72, round }) {
  const ref = useRef();
  const [err, setErr] = useState('');
  const pick = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try { setErr(''); onChange(await resizeImage(f)); } catch (x) { setErr(x.message); }
  };
  return (
    <div className="flex items-center gap-3">
      <button type="button" onClick={() => ref.current.click()} style={{ width: size, height: size }} className={`flex shrink-0 items-center justify-center overflow-hidden border-2 border-dashed border-slate-300 bg-slate-50 text-slate-400 hover:border-blue-400 ${round ? 'rounded-full' : 'rounded-xl'}`} aria-label={label}>
        {value ? <img src={value} alt="" className="h-full w-full object-cover" /> : <ImagePlus className="h-6 w-6" />}
      </button>
      <div className="text-xs text-slate-500">
        <button type="button" onClick={() => ref.current.click()} className="font-semibold text-blue-600 hover:underline">{value ? 'Change' : label}</button>
        {value && <button type="button" onClick={() => onChange('')} className="ml-3 text-slate-500 hover:text-red-600">Remove</button>}
        {err && <p className="text-red-600">{err}</p>}
      </div>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={pick} />
    </div>
  );
}

export const fmtDate = (d) => (d ? new Date(d).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '');
 
export function DropdownSelect({
  id,
  value,
  onChange,
  options = [],
  placeholder = 'Select option',
  disabled = false,
  className = '',
  error = false,
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('touchstart', handleClick);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('touchstart', handleClick);
    };
  }, [open]);

  const normalizedOptions = options.map((opt) =>
    typeof opt === 'object' && opt !== null ? opt : { value: opt, label: String(opt) }
  );

  const selectedOption = normalizedOptions.find((opt) => String(opt.value) === String(value));

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={`input flex w-full items-center justify-between text-left ${error ? 'input-error' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span className={`truncate ${!selectedOption && (value === '' || value === undefined) ? 'text-slate-400' : 'text-slate-900 font-medium'}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-xl">
          {placeholder && (
            <div
              onClick={() => { onChange(''); setOpen(false); }}
              className="cursor-pointer px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 transition"
            >
              {placeholder}
            </div>
          )}
          {normalizedOptions.map((opt) => {
            const isSelected = String(opt.value) === String(value);
            return (
              <div
                key={String(opt.value)}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`flex cursor-pointer items-center justify-between px-3 py-2 text-sm transition ${
                  isSelected ? 'bg-blue-50 font-semibold text-blue-700' : 'text-slate-800 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="truncate">{opt.label}</span>
                  {opt.badge && <span className="badge bg-blue-100 text-blue-700 text-[10px]">{opt.badge}</span>}
                </div>
                {isSelected && <Check className="h-4 w-4 text-blue-600 shrink-0" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

