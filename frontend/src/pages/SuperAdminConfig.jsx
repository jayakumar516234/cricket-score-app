import { useState, useEffect } from 'react';
import { Shield, Eye, EyeOff, Save, RotateCcw, Loader2, CheckCircle2, Info } from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';

const MENU_LABELS = {
  home:        { label: 'Home / Dashboard', desc: 'Main dashboard overview' },
  teams:       { label: 'Teams', desc: 'Team management & squad' },
  matches:     { label: 'Matches', desc: 'Match list & live scoring' },
  tournaments: { label: 'Tournaments', desc: 'Tournament brackets & cups' },
  users:       { label: 'Users', desc: 'User management (admin)' },
  support:     { label: 'Support & Feedback', desc: 'Help & feedback form' },
  audit:       { label: 'Audit Log', desc: 'Activity audit trail (superadmin)' },
  settings:    { label: 'Settings', desc: 'Profile & account settings' },
};

const ROLE_LABELS = {
  superadmin: { label: 'Super Admin', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  admin:      { label: 'Admin', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  teamadmin:  { label: 'Team Admin', color: 'bg-pitch-100 text-pitch-800 border-pitch-300' },
  user:       { label: 'User', color: 'bg-slate-100 text-slate-800 border-slate-300' },
  viewer:     { label: 'Viewer', color: 'bg-purple-100 text-purple-800 border-purple-300' },
};

const DEFAULT_VISIBILITY = {
  superadmin: ['home', 'teams', 'matches', 'tournaments', 'users', 'support', 'audit', 'settings'],
  admin:      ['home', 'teams', 'matches', 'tournaments', 'users', 'support', 'settings'],
  teamadmin:  ['home', 'teams', 'matches', 'tournaments', 'support', 'settings'],
  user:       ['home', 'teams', 'matches', 'tournaments', 'support', 'settings'],
  viewer:     ['home', 'teams', 'matches', 'tournaments', 'support', 'settings'],
};

export default function SuperAdminConfig() {
  const { isSuper } = useAuth();
  const [allKeys, setAllKeys] = useState([]);
  const [visibility, setVisibility] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isSuper) return;
    api('/config/menu-visibility')
      .then((d) => {
        setVisibility(d.visibility);
        setAllKeys(d.allKeys || Object.keys(MENU_LABELS));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [isSuper]);

  const toggle = (role, key) => {
    if (role === 'superadmin') return; // superadmin always sees everything
    setVisibility((prev) => {
      const current = prev[role] || [];
      const next = current.includes(key)
        ? current.filter((k) => k !== key)
        : [...current, key];
      return { ...prev, [role]: next };
    });
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await api('/config/menu-visibility', { method: 'PUT', body: { visibility } });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setVisibility(DEFAULT_VISIBILITY);
    setSaved(false);
  };

  if (!isSuper) {
    return (
      <div className="card p-6 text-center text-slate-500 text-sm">
        <Shield className="h-8 w-8 mx-auto mb-2 text-slate-300" />
        Access restricted to Super Admin only.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  const roles = Object.keys(ROLE_LABELS);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Shield className="h-4 w-4 text-amber-500" />
            Menu Visibility Control
          </h2>
          <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">
            Control which navigation menus are shown to each user role.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="btn btn-outline text-xs !py-1.5 !px-3 text-slate-600"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset Defaults
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="btn btn-primary text-xs !py-1.5 !px-3"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : saved ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
            {saved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700">{error}</div>
      )}

      {/* Info note */}
      <div className="flex items-start gap-2 rounded-xl bg-blue-50 border border-blue-200 p-3">
        <Info className="h-3.5 w-3.5 text-blue-500 mt-0.5 shrink-0" />
        <p className="text-[10px] sm:text-xs text-blue-800">
          Changes take effect immediately when users next load the app. Super Admin always sees all menus and cannot be restricted. 
          <strong> Settings & Home are always visible</strong> to all roles for safe navigation.
        </p>
      </div>

      {/* Grid: rows = menu items, cols = roles */}
      <div className="card overflow-hidden border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 w-44">
                  Menu Item
                </th>
                {roles.map((role) => (
                  <th key={role} className="px-2 py-2.5 text-center min-w-[80px]">
                    <span className={`inline-block rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${ROLE_LABELS[role].color}`}>
                      {ROLE_LABELS[role].label}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allKeys.map((key, idx) => {
                const meta = MENU_LABELS[key] || { label: key, desc: '' };
                return (
                  <tr key={key} className={`border-b border-slate-100 transition ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                    <td className="px-3 py-2.5">
                      <div className="font-semibold text-slate-900 text-xs">{meta.label}</div>
                      <div className="text-[9px] text-slate-400">{meta.desc}</div>
                    </td>
                    {roles.map((role) => {
                      const isLocked = role === 'superadmin';
                      const isAlwaysOn = key === 'home' || key === 'settings';
                      const isOn = isLocked || (visibility?.[role] || []).includes(key);
                      const disabled = isLocked || isAlwaysOn;

                      return (
                        <td key={role} className="px-2 py-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => !disabled && toggle(role, key)}
                            disabled={disabled}
                            title={
                              isLocked ? 'Super Admin always sees all menus'
                              : isAlwaysOn ? `${meta.label} is always visible`
                              : isOn ? `Hide from ${ROLE_LABELS[role].label}`
                              : `Show to ${ROLE_LABELS[role].label}`
                            }
                            className={`mx-auto flex h-7 w-7 items-center justify-center rounded-lg border transition-all ${
                              disabled
                                ? 'bg-slate-100 border-slate-200 text-slate-300 cursor-not-allowed'
                                : isOn
                                ? 'bg-pitch-500 border-pitch-600 text-white hover:bg-pitch-600 shadow-sm'
                                : 'bg-white border-slate-200 text-slate-300 hover:border-red-300 hover:text-red-400'
                            }`}
                          >
                            {isOn ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] text-slate-500 px-1">
        <span className="flex items-center gap-1.5">
          <span className="flex h-4 w-4 items-center justify-center rounded bg-pitch-500 text-white">
            <Eye className="h-2.5 w-2.5" />
          </span>
          Visible to role
        </span>
        <span className="flex items-center gap-1.5">
          <span className="flex h-4 w-4 items-center justify-center rounded border border-slate-200 text-slate-300 bg-white">
            <EyeOff className="h-2.5 w-2.5" />
          </span>
          Hidden from role
        </span>
        <span className="flex items-center gap-1.5">
          <span className="flex h-4 w-4 items-center justify-center rounded bg-slate-100 text-slate-300">
            <Eye className="h-2.5 w-2.5" />
          </span>
          Always on (locked)
        </span>
      </div>
    </div>
  );
}
