import { useState } from 'react';
import { KeyRound, ShieldCheck, Loader2, Sparkles, X, AlertCircle } from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';

export function ScorerLoginModal({ open, onClose, defaultCode = '' }) {
  const { loginWithToken } = useAuth();
  const [code, setCode] = useState(defaultCode);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!code.trim() || !pin.trim()) {
      setError('Please enter both Tournament Code and PIN');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/tournaments/scorer-login', {
        tournamentCode: code.trim().toUpperCase(),
        pin: pin.trim(),
      });

      // Login using token
      if (res.token) {
        setSuccess(res.message || 'Scorer access granted!');
        setTimeout(() => {
          if (loginWithToken) {
            loginWithToken(res.token, res.user);
          } else {
            localStorage.setItem('auth_token', res.token);
            window.location.reload();
          }
          onClose();
        }, 900);
      }
    } catch (err) {
      setError(err.message || 'Invalid Tournament Code or Scorer PIN');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="card w-full max-w-md p-6 border border-slate-200 shadow-2xl relative bg-white">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600">
            <KeyRound className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Multi-Match Scorer Login</h2>
            <p className="text-xs text-slate-500">Score matches on your phone using Tournament PIN</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-xl bg-green-50 border border-green-200 p-3 text-xs text-green-700 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 shrink-0 text-green-500" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Tournament Code</label>
            <input
              type="text"
              placeholder="e.g. TRN-8392"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="input uppercase font-mono tracking-wider font-bold"
              required
            />
          </div>

          <div>
            <label className="label">4-Digit Scorer PIN</label>
            <input
              type="password"
              maxLength={6}
              placeholder="e.g. 1111"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="input font-mono tracking-widest text-lg text-center font-bold"
              required
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Ask your tournament organizer for your Ground/Match PIN.
            </p>
          </div>

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
              className="btn btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              <span>Enter Scorer Mode</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
