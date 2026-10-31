import { useState } from 'react';
import { Medal, X, Loader2, Plus, Calendar, MapPin, Shield } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="card w-full max-w-lg p-6 border border-slate-200 shadow-2xl relative bg-white my-8">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600">
            <Medal className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Create New Tournament</h2>
            <p className="text-xs text-slate-500">Configure village / knockout cup and multi-ground rules</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          <div>
            <label className="label">Tournament Name *</label>
            <input
              type="text"
              placeholder="e.g. Kovilpatti Premier League 2026"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input font-semibold"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Total Teams (Bracket Size)</label>
              <DropdownSelect
                value={maxTeams}
                onChange={(val) => setMaxTeams(Number(val))}
                options={[
                  { value: 8, label: '8 Teams' },
                  { value: 12, label: '12 Teams' },
                  { value: 14, label: '14 Teams' },
                  { value: 16, label: '16 Teams (Standard Village Cup)' },
                  { value: 24, label: '24 Teams' },
                  { value: 32, label: '32 Teams' },
                ]}
                buttonClassName="font-semibold"
              />
            </div>

            <div>
              <label className="label">Default Overs (Per Match)</label>
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
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Venue / City</label>
              <input
                type="text"
                placeholder="e.g. Govt School Ground, Kovilpatti"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                className="input"
              />
            </div>

            <div>
              <label className="label">Grounds (Simultaneous Pitches)</label>
              <input
                type="text"
                placeholder="e.g. Ground 1, Ground 2"
                value={grounds}
                onChange={(e) => setGrounds(e.target.value)}
                className="input"
              />
              <span className="text-[11px] text-slate-400 mt-0.5 block">Comma separated list</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="label">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="input"
              />
            </div>
          </div>

          <div>
            <label className="label">Tournament Rules & Guidelines</label>
            <textarea
              rows={2}
              placeholder="e.g. Red tennis ball, 2 overs powerplay, bye advances to round 2"
              value={rules}
              onChange={(e) => setRules(e.target.value)}
              className="input resize-none text-xs"
            />
          </div>

          <div className="pt-3 flex gap-2">
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
              className="btn btn-green flex-1 flex items-center justify-center gap-2 shadow-sm"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              <span>Create Tournament</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
