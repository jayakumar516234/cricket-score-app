import { useState } from 'react';
import { Trophy, X, Loader2, Plus, Calendar, MapPin, Shield, Sparkles } from 'lucide-react';
import { api } from '../api.js';
import { DropdownSelect } from './ui.jsx';

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl relative my-8 overflow-hidden">

        {/* Gradient Header */}
        <div className="relative bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 p-5 text-white">
          <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10" />
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-1.5 rounded-xl text-white/70 hover:text-white hover:bg-white/20 transition"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-3 relative">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 border border-white/30 backdrop-blur-sm">
              <Trophy className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">Create Tournament</h2>
              <p className="text-xs text-orange-100">Knockout cup · Multi-ground · Village bracket</p>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-5">
          {error && (
            <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700 flex items-start gap-2">
              <Shield className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-sm">
            {/* Tournament Name */}
            <div>
              <label className="label font-bold">Tournament Name *</label>
              <input
                type="text"
                placeholder="e.g. Kovilpatti Premier League 2026"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input font-semibold"
                required
              />
            </div>

            {/* Teams + Overs */}
            <div className="space-y-2">
              <label className="label font-bold flex items-center justify-between">
                <span>Total Teams (Bracket Size)</span>
                <span className="text-[11px] text-pitch-600 font-semibold">Any number or Open</span>
              </label>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 bg-slate-100 rounded-xl px-2.5 py-1.5 border border-slate-200">
                  <span className="text-xs font-bold text-slate-500">Slots:</span>
                  <input
                    type="number"
                    min={2}
                    max={128}
                    value={maxTeams}
                    onChange={(e) => setMaxTeams(Math.max(2, Number(e.target.value) || 2))}
                    className="w-16 bg-white font-black text-center text-sm rounded-lg border border-slate-300 py-1"
                  />
                </div>

                <div className="flex flex-wrap gap-1">
                  {[8, 9, 10, 12, 14, 16, 24, 32].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setMaxTeams(num)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                        maxTeams === num
                          ? 'bg-pitch-600 text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setMaxTeams(64)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                      maxTeams >= 64
                        ? 'bg-pitch-600 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    Open (64)
                  </button>
                </div>
              </div>
              <span className="text-[11px] text-slate-400 block">
                Choose a preset (8, 9, 14, 16) or type any custom number of teams.
              </span>
            </div>

            {/* Overs */}
            <div>
              <label className="label font-bold">Default Overs / Match</label>
              <input
                type="number"
                min={1}
                max={50}
                value={defaultOvers}
                onChange={(e) => setDefaultOvers(Number(e.target.value))}
                className="input font-semibold"
              />
              <span className="text-[11px] text-slate-400 mt-0.5 block">Can be modified per match</span>
            </div>

            {/* Venue + Grounds */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label font-bold">Venue / City</label>
                <input
                  type="text"
                  placeholder="e.g. Govt School Ground"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  className="input"
                />
              </div>

              <div>
                <label className="label font-bold">Grounds (Simultaneous Pitches)</label>
                <input
                  type="text"
                  placeholder="e.g. Ground 1, Ground 2"
                  value={grounds}
                  onChange={(e) => setGrounds(e.target.value)}
                  className="input"
                />
                <span className="text-[11px] text-slate-400 mt-0.5 block">Comma separated</span>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label font-bold flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" /> Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="label font-bold flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" /> End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="input"
                />
              </div>
            </div>

            {/* Rules */}
            <div>
              <label className="label font-bold">Rules & Guidelines</label>
              <textarea
                rows={2}
                placeholder="e.g. Red tennis ball, 2 overs powerplay, bye advances to round 2"
                value={rules}
                onChange={(e) => setRules(e.target.value)}
                className="input resize-none text-xs"
              />
            </div>

            {/* Actions */}
            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-outline flex-1"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-sm px-4 py-2.5 shadow-md transition disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                <span>Create Tournament</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
