import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronDown, Loader2, Plus, Trash2 } from 'lucide-react';
import { api } from '../api.js';
import { ErrorBox, Field, ImagePicker, Spinner } from '../components/ui.jsx';

const ROLES = ['Batsman', 'Bowler', 'All-rounder', 'Wicket Keeper'];
const BALLS = ['Leather Ball', 'Tennis Ball', 'Rubber Ball', 'Other'];
const MIN_SQUAD = 11;
const MAX_SQUAD = 25;

let keySeed = 0;
const blankPlayer = () => ({ _key: `new-${keySeed++}`, name: '', photo: '', jerseyNumber: '', age: '', role: 'Batsman', battingStyle: '', bowlingStyle: '' });

export default function TeamForm() {
  const { id } = useParams();
  const editing = !!id;
  const nav = useNavigate();
  const [loading, setLoading] = useState(editing);
  const [loadError, setLoadError] = useState('');
  const [team, setTeam] = useState({ name: '', logo: '', location: '', description: '', ballType: 'Leather Ball' });
  const [players, setPlayers] = useState(Array.from({ length: MIN_SQUAD }, blankPlayer));
  const [open, setOpen] = useState(0);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!editing) return;
    api(`/teams/${id}`)
      .then((d) => {
        setTeam({ name: d.team.name, logo: d.team.logo || '', location: d.team.location || '', description: d.team.description || '', ballType: d.team.ballType });
        setPlayers(d.players.map((p) => ({ _key: p.id, _id: p.id, name: p.name, photo: p.photo || '', jerseyNumber: p.jerseyNumber ?? '', age: p.age ?? '', role: p.role, battingStyle: p.battingStyle || '', bowlingStyle: p.bowlingStyle || '' })));
      })
      .catch((e) => setLoadError(e.message))
      .finally(() => setLoading(false));
  }, [editing, id]);

  const setP = (i, patch) => setPlayers((ps) => ps.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));

  const validate = () => {
    const er = {};
    if (team.name.trim().length < 2) er.name = 'Team name is required (at least 2 characters)';
    if (players.length < MIN_SQUAD) er.count = `A team needs at least ${MIN_SQUAD} players`;
    const names = new Map();
    const jerseys = new Map();
    players.forEach((p, i) => {
      const key = p.name.trim().toLowerCase();
      if (!key) er[`p${i}.name`] = 'Player name is required';
      else if (names.has(key)) { er[`p${i}.name`] = 'Duplicate player name'; er[`p${names.get(key)}.name`] = 'Duplicate player name'; }
      else names.set(key, i);
      if (p.jerseyNumber !== '') {
        const n = Number(p.jerseyNumber);
        if (!Number.isInteger(n) || n < 0 || n > 999) er[`p${i}.jersey`] = 'Jersey must be 0-999';
        else if (jerseys.has(n)) { er[`p${i}.jersey`] = 'Duplicate jersey number'; er[`p${jerseys.get(n)}.jersey`] = 'Duplicate jersey number'; }
        else jerseys.set(n, i);
      }
      if (p.age !== '') {
        const a = Number(p.age);
        if (!Number.isInteger(a) || a < 5 || a > 100) er[`p${i}.age`] = 'Age must be 5-100';
      }
    });
    return er;
  };

  const submit = async (e) => {
    e.preventDefault();
    const er = validate();
    setErrors(er);
    setFormError('');
    if (Object.keys(er).length) {
      const firstBad = players.findIndex((_, i) => er[`p${i}.name`] || er[`p${i}.jersey`] || er[`p${i}.age`]);
      if (firstBad >= 0) setOpen(firstBad);
      setFormError(er.count || 'Please fix the highlighted fields.');
      return;
    }
    setBusy(true);
    try {
      const body = { ...team, players: players.map(({ _key, ...p }) => ({ ...p, jerseyNumber: p.jerseyNumber === '' ? null : Number(p.jerseyNumber), age: p.age === '' ? null : Number(p.age) })) };
      const res = await api(editing ? `/teams/${id}` : '/teams', { method: editing ? 'PUT' : 'POST', body });
      nav(`/teams/${res.team.id}`);
    } catch (err) {
      setFormError(err.message);
      setBusy(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (loading) return <Spinner />;
  if (loadError) return <ErrorBox message={loadError} />;

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => nav(-1)} className="btn btn-ghost !p-2" aria-label="Go back"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="text-xl font-bold text-slate-900">{editing ? 'Update Team' : 'Create Team'}</h1>
      </div>
      <ErrorBox message={formError} />

      <section className="card space-y-4 p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <ImagePicker value={team.logo} onChange={(logo) => setTeam({ ...team, logo })} label="Add team logo" size={88} />
          <div className="flex-1 space-y-4">
            <Field label="Team Name" required error={errors.name} htmlFor="tname">
              <input id="tname" className={`input ${errors.name ? 'input-error' : ''}`} value={team.name} onChange={(e) => setTeam({ ...team, name: e.target.value })} maxLength={60} />
            </Field>
            <Field label="Location" htmlFor="tloc">
              <input id="tloc" className="input" value={team.location} onChange={(e) => setTeam({ ...team, location: e.target.value })} maxLength={80} />
            </Field>
          </div>
        </div>
        <Field label="Team Description (optional)" htmlFor="tdesc">
          <textarea id="tdesc" rows={2} className="input" value={team.description} onChange={(e) => setTeam({ ...team, description: e.target.value })} maxLength={500} />
        </Field>
        <fieldset>
          <legend className="label">Ball Type</legend>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {BALLS.map((b) => (
              <label key={b} className="flex items-center gap-2 text-sm">
                <input type="radio" name="ball" checked={team.ballType === b} onChange={() => setTeam({ ...team, ballType: b })} className="h-4 w-4 accent-blue-600" /> {b}
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      <section>
        <div className="mb-1 flex items-center justify-between">
          <h2 className="font-bold text-slate-900">Players ({players.length})</h2>
          <button type="button" className="btn btn-primary !py-1.5" disabled={players.length >= MAX_SQUAD} onClick={() => { setPlayers((ps) => [...ps, blankPlayer()]); setOpen(players.length); }}>
            <Plus className="h-4 w-4" /> Add player
          </button>
        </div>
        <p className="mb-3 text-sm text-slate-500">Add {MIN_SQUAD} to {MAX_SQUAD} players. You pick the playing {MIN_SQUAD} for each match when it starts. Name is required; the rest is optional.</p>
        <ul className="space-y-2">
          {players.map((p, i) => {
            const bad = errors[`p${i}.name`] || errors[`p${i}.jersey`] || errors[`p${i}.age`];
            return (
              <li key={p._key} className={`card overflow-hidden ${bad ? 'ring-red-300' : ''}`}>
                <button type="button" onClick={() => setOpen(open === i ? -1 : i)} className="flex w-full items-center gap-3 p-3 text-left" aria-expanded={open === i}>
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-navy-800 text-xs font-bold text-white">{i + 1}</span>
                  <span className="flex-1">
                    <span className={`block text-sm font-semibold ${p.name ? 'text-slate-900' : 'text-slate-400'}`}>{p.name || 'Player name'}</span>
                    <span className="text-xs text-slate-500">{p.role}{p.jerseyNumber !== '' ? ` · #${p.jerseyNumber}` : ''}</span>
                  </span>
                  {bad && <span className="text-xs font-semibold text-red-600">Fix</span>}
                  <ChevronDown className={`h-4 w-4 text-slate-400 transition ${open === i ? 'rotate-180' : ''}`} aria-hidden />
                </button>
                {open === i && (
                  <div className="grid gap-3 border-t border-slate-100 p-3 sm:grid-cols-2">
                    <div className="sm:col-span-2"><ImagePicker round size={56} value={p.photo} onChange={(photo) => setP(i, { photo })} label="Add player photo" /></div>
                    <Field label="Player Name" required error={errors[`p${i}.name`]} htmlFor={`pn${i}`}>
                      <input id={`pn${i}`} className={`input ${errors[`p${i}.name`] ? 'input-error' : ''}`} value={p.name} onChange={(e) => setP(i, { name: e.target.value })} maxLength={60} />
                    </Field>
                    <Field label="Role" htmlFor={`pr${i}`}>
                      <select id={`pr${i}`} className="input" value={p.role} onChange={(e) => setP(i, { role: e.target.value })}>{ROLES.map((r) => <option key={r}>{r}</option>)}</select>
                    </Field>
                    <Field label="Jersey No (optional)" error={errors[`p${i}.jersey`]} htmlFor={`pj${i}`}>
                      <input id={`pj${i}`} inputMode="numeric" className={`input ${errors[`p${i}.jersey`] ? 'input-error' : ''}`} value={p.jerseyNumber} onChange={(e) => setP(i, { jerseyNumber: e.target.value.replace(/\D/g, '') })} />
                    </Field>
                    <Field label="Age (optional)" error={errors[`p${i}.age`]} htmlFor={`pa${i}`}>
                      <input id={`pa${i}`} inputMode="numeric" className={`input ${errors[`p${i}.age`] ? 'input-error' : ''}`} value={p.age} onChange={(e) => setP(i, { age: e.target.value.replace(/\D/g, '') })} />
                    </Field>
                    <Field label="Batting Style (optional)" htmlFor={`pb${i}`}>
                      <input id={`pb${i}`} className="input" placeholder="e.g. Right-hand bat" value={p.battingStyle} onChange={(e) => setP(i, { battingStyle: e.target.value })} maxLength={40} />
                    </Field>
                    <Field label="Bowling Style (optional)" htmlFor={`pw${i}`}>
                      <input id={`pw${i}`} className="input" placeholder="e.g. Right-arm medium" value={p.bowlingStyle} onChange={(e) => setP(i, { bowlingStyle: e.target.value })} maxLength={40} />
                    </Field>
                    {players.length > MIN_SQUAD && (
                      <div className="sm:col-span-2">
                        <button type="button" className="btn btn-ghost text-red-600" onClick={() => { setPlayers((ps) => ps.filter((_, idx) => idx !== i)); setOpen(-1); }}><Trash2 className="h-4 w-4" /> Remove this player</button>
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <button className="btn btn-primary w-full sm:w-auto sm:min-w-48" disabled={busy}>
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} {editing ? 'Update Team' : 'Create Team'}
      </button>
    </form>
  );
}
