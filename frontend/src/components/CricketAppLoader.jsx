export default function CricketAppLoader({ text = 'Preparing Cricket Arena...' }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-[#060d19] via-[#0a1628] to-[#040810] text-white p-6 select-none overflow-hidden">
      {/* Stadium Floodlight Glows */}
      <div className="pointer-events-none absolute -top-24 left-1/4 h-56 w-56 rounded-full bg-emerald-500/20 blur-3xl animate-pulse" />
      <div className="pointer-events-none absolute -top-24 right-1/4 h-56 w-56 rounded-full bg-blue-500/20 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

      {/* Main Cricket Scene Animation Container */}
      <div className="relative flex flex-col items-center justify-center">
        {/* Animated Cricket Ball & Pitch Illustration */}
        <div className="relative h-28 w-28 sm:h-32 sm:w-32 flex items-center justify-center">
          {/* Pitch grass circle with pulse */}
          <div className="absolute inset-0 rounded-full border-2 border-emerald-500/30 bg-emerald-950/40 animate-ping opacity-25" />
          <div className="absolute inset-2 rounded-full border border-pitch-500/40 bg-gradient-to-br from-emerald-900/60 to-navy-950/80 shadow-2xl backdrop-blur-md" />

          {/* SVG Cricket Bat & Bouncing Ball */}
          <svg viewBox="0 0 100 100" className="relative h-20 w-20 sm:h-24 sm:w-24 drop-shadow-[0_10px_20px_rgba(16,185,129,0.35)]">
            {/* 3 Stumps */}
            <line x1="38" y1="35" x2="38" y2="72" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="45" y1="35" x2="45" y2="72" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="52" y1="35" x2="52" y2="72" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" />
            {/* Bails */}
            <line x1="36" y1="34" x2="45" y2="34" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="45" y1="34" x2="54" y2="34" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" />

            {/* Cricket Bat (Swinging) */}
            <g className="origin-[75px_70px] animate-[swingBat_1.4s_ease-in-out_infinite]">
              <rect x="68" y="24" width="7" height="38" rx="2" fill="#b45309" stroke="#78350f" strokeWidth="1" />
              <rect x="70" y="14" width="3" height="11" rx="1" fill="#f8fafc" stroke="#64748b" strokeWidth="0.8" />
              <circle x="71.5" y="13" r="1.5" fill="#f59e0b" />
            </g>

            {/* Cricket Ball with Seam (Bouncing & Spinning) */}
            <g className="animate-[bounceBall_1.4s_cubic-bezier(0.28,0.84,0.42,1)_infinite]">
              <circle cx="28" cy="50" r="10" fill="#dc2626" filter="drop-shadow(0 2px 5px rgba(220,38,38,0.6))" />
              {/* Ball Shine */}
              <circle cx="25" cy="46" r="3" fill="#f87171" opacity="0.6" />
              {/* Ball Seams */}
              <path d="M 23 42 Q 28 50 23 58" fill="none" stroke="#ffffff" strokeWidth="1.2" strokeDasharray="1.5,1" />
              <path d="M 33 42 Q 28 50 33 58" fill="none" stroke="#ffffff" strokeWidth="1.2" strokeDasharray="1.5,1" />
            </g>
          </svg>
        </div>

        {/* Cricket Pitch Ground Shadow */}
        <div className="h-2 w-24 rounded-full bg-emerald-500/20 blur-[3px] mt-2 animate-pulse" />

        {/* Branding & App Title */}
        <div className="mt-5 text-center space-y-1.5">
          <div className="flex items-center justify-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping" />
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white drop-shadow-md">
              CRICKET SCORE
            </h1>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400/90">
            {text}
          </p>
        </div>

        {/* Mini Ball Over Dots Animation */}
        <div className="flex items-center gap-1.5 mt-5">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <span
              key={i}
              className="h-2 w-2 rounded-full bg-emerald-500"
              style={{
                animation: 'pulse 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                animationDelay: `${i * 0.18}s`,
                opacity: 0.35 + (i * 0.1),
              }}
            />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes swingBat {
          0%, 100% { transform: rotate(-8deg); }
          50% { transform: rotate(18deg); }
        }
        @keyframes bounceBall {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(16px, -14px) scale(1.1); }
        }
      `}</style>
    </div>
  );
}
