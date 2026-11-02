import { useState } from 'react';
import { Trophy, X, Loader2, Plus, Calendar, MapPin, Shield, Sparkles, Compass } from 'lucide-react';
import { api } from '../api.js';

export function TournamentCreateModal({ open, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [venue, setVenue] = useState('');
  const [grounds, setGrounds] = useState('Ground 1, Ground 2');
  const [maxTeams, setMaxTeams] = useState(16);
  const [defaultOvers, setDefaultOvers] = useState(8);
  const [format, setFormat] = useState('knockout');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [rules, setRules] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter a tournament name');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const groundsList = grounds
        .split(',')
        .map((g) => g.trim())
        .filter(Boolean);

      const res = await api.post('/tournaments', {
        name: name.trim(),
        venue: venue.trim(),
        grounds: groundsList.length ? groundsList : ['Ground 1', 'Ground 2'],
        maxTeams: Number(maxTeams) || 16,
        defaultOvers: Number(defaultOvers) || 8,
        format,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        rules: rules.trim(),
      });

      if (onCreated) onCreated(res.tournament);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create tournament');
    } finally {
      setLoading(false);
    }
  };

  const handleAddGroundPreset = (groundName) => {
    const list = grounds.split(',').map((g) => g.trim()).filter(Boolean);
    if (!list.includes(groundName)) {
      list.push(groundName);
      setGrounds(list.join(', '));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="w-full max-w-xl rounded-t-3xl sm:rounded-3xl border border-slate-200 bg-white shadow-2xl relative flex flex-col max-h-[94dvh] sm:max-h-[90vh] overflow-hidden my-auto">

        {/* Gradient Header */}
        <div className="relative bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 p-5 sm:p-6 text-white shrink-0">
          <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/10" />
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/20 transition active:scale-95"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-3 relative">
            <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 border border-white/30 backdrop-blur-sm shadow-md">
              <Trophy className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white leading-tight">Create Tournament</h2>
              <p className="text-xs sm:text-sm text-orange-100 mt-0.5">
                Knockout cup · Multi-ground · Village & league bracket
              </p>
            </div>
          </div>
        </div>

        {/* Form Body - Scrollable with large touch-friendly inputs */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-3.5 text-xs sm:text-sm text-red-700 flex items-start gap-2">
              <Shield className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form id="create-tournament-form" onSubmit={handleSubmit} className="space-y-5">
            {/* 1. Tournament Name */}
            <div>
              <label className="label font-black text-slate-800 text-xs sm:text-sm flex items-center gap-1.5 mb-1.5">
                <span>🏆 Tournament Name *</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Kovilpatti Premier League 2026"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input font-bold py-3.5 px-4 text-base sm:text-base border-slate-300 focus:border-amber-500 focus:ring-amber-500/25"
                required
                autoFocus
              />
            </div>

            {/* 2. Total Teams (Bracket Size) - Large friendly touch controls */}
            <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="label font-black text-slate-800 text-xs sm:text-sm mb-0">
                  🏏 Total Teams (Bracket Size)
                </label>
                <span className="text-[11px] font-bold text-pitch-700 bg-pitch-50 border border-pitch-200 px-2 py-0.5 rounded-full">
                  {maxTeams >= 64 ? 'Open (64 Teams)' : `${maxTeams} Teams`}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-white rounded-xl px-3 py-2 border border-slate-300 shadow-2xs">
                  <span className="text-xs font-bold text-slate-500">Slots:</span>
                  <input
                    type="number"
                    min={2}
                    max={128}
                    value={maxTeams}
                    onChange={(e) => setMaxTeams(Math.max(2, Number(e.target.value) || 2))}
                    className="w-16 font-black text-center text-base sm:text-sm text-slate-900 focus:outline-none"
                  />
                </div>

                <div className="flex flex-wrap gap-1.5 flex-1">
                  {[8, 9, 10, 12, 14, 16, 24, 32].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setMaxTeams(num)}
                      className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-black transition-all active:scale-95 ${
                        maxTeams === num
                          ? 'bg-gradient-to-r from-pitch-600 to-emerald-600 text-white shadow-md'
                          : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setMaxTeams(64)}
                    className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-black transition-all active:scale-95 ${
                      maxTeams >= 64
                        ? 'bg-gradient-to-r from-pitch-600 to-emerald-600 text-white shadow-md'
                        : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'
                    }`}
                  >
                    Open
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Tip: Enter any number (e.g. 9 teams, 11 teams) or click a preset. Odd teams automatically get a Bye!
              </p>
            </div>

            {/* 3. Default Overs / Match */}
            <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="label font-black text-slate-800 text-xs sm:text-sm mb-0">
                  ⏱️ Default Overs / Match
                </label>
                <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                  {defaultOvers} Overs
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-white rounded-xl px-3 py-2 border border-slate-300 shadow-2xs">
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={defaultOvers}
                    onChange={(e) => setDefaultOvers(Math.max(1, Number(e.target.value) || 1))}
                    className="w-14 font-black text-center text-base sm:text-sm text-slate-900 focus:outline-none"
                  />
                  <span className="text-xs font-bold text-slate-400">ov</span>
                </div>

                <div className="flex flex-wrap gap-1.5 flex-1">
                  {[4, 6, 8, 10, 12, 15, 20].map((ov) => (
                    <button
                      key={ov}
                      type="button"
                      onClick={() => setDefaultOvers(ov)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-black transition-all active:scale-95 ${
                        defaultOvers === ov
                          ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md'
                          : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {ov} ov
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 4. Venue & Grounds */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label font-black text-slate-800 text-xs sm:text-sm flex items-center gap-1">
                  <MapPin className="h-4 w-4 text-slate-500" />
                  <span>Venue / Town / City</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Govt School Ground, Kanchipuram"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  className="input py-3 px-3.5 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="label font-black text-slate-800 text-xs sm:text-sm flex items-center gap-1">
                  <Compass className="h-4 w-4 text-slate-500" />
                  <span>Grounds (Pitches)</span>
                </label>
                <input
                  type="text"
                  placeholder="Ground 1, Ground 2"
                  value={grounds}
                  onChange={(e) => setGrounds(e.target.value)}
                  className="input py-3 px-3.5 text-sm font-semibold"
                />
                <div className="mt-1.5 flex items-center gap-1 flex-wrap">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Quick Add:</span>
                  {['Ground 1', 'Ground 2', 'Ground 3'].map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => handleAddGroundPreset(g)}
                      className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded-md transition"
                    >
                      +{g}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 5. Tournament Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label font-black text-slate-800 text-xs sm:text-sm flex items-center gap-1">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <span>Start Date</span>
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="input py-2.5 px-3.5 text-sm"
                />
              </div>
              <div>
                <label className="label font-black text-slate-800 text-xs sm:text-sm flex items-center gap-1">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <span>End Date</span>
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="input py-2.5 px-3.5 text-sm"
                />
              </div>
            </div>

            {/* 6. Rules */}
            <div>
              <label className="label font-black text-slate-800 text-xs sm:text-sm">
                📋 Tournament Rules & Guidelines
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Red tennis ball, 2 overs powerplay, bye advances to round 2, umpire decision final"
                value={rules}
                onChange={(e) => setRules(e.target.value)}
                className="input resize-none py-2.5 px-3.5 text-xs sm:text-sm leading-relaxed"
              />
            </div>
          </form>
        </div>

        {/* Footer Actions - Large Touch Targets */}
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 flex gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-outline flex-1 py-3.5 sm:py-3 text-sm sm:text-base font-bold rounded-2xl"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="create-tournament-form"
            disabled={loading}
            className="flex-2 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-sm sm:text-base py-3.5 sm:py-3 px-5 shadow-lg shadow-orange-500/25 transition active:scale-95 disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Sparkles className="h-5 w-5" />
            )}
            <span>Create Tournament</span>
          </button>
        </div>

      </div>
    </div>
  );
}
