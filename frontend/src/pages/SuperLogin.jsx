import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Eye, EyeOff, Lock, User, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { ErrorBox } from '../components/ui.jsx';

export default function SuperLogin() {
  const { login, logout } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!identifier.trim() || !password) return setError('Enter your Super Admin username/email and password');
    setBusy(true);
    setError('');
    try {
      const u = await login(identifier.trim(), password);
      if (u && u.role !== 'superadmin') {
        logout();
        setError('Access denied. This portal is for Super Admin only. Please use the Team Admin login at /login');
        setBusy(false);
      }
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-gradient-to-b from-slate-950 via-navy-950 to-slate-900 p-4">
      <div className="mb-6 flex flex-col items-center text-white text-center">
        <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 ring-2 ring-amber-400/40">
          <ShieldCheck className="h-9 w-9 text-amber-400" aria-hidden />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Super Admin Portal</h1>
        <p className="mt-1 text-sm text-amber-200/80">Platform Management & Admin Control</p>
      </div>

      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-900/10" noValidate>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Super Login</h2>
          <p className="text-sm text-slate-500">Sign in with master credentials</p>
        </div>

        <ErrorBox message={error} />

        <div>
          <label className="label" htmlFor="identifier">Username or email</label>
          <div className="relative">
            <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" aria-hidden />
            <input
              id="identifier"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              className="input pl-9"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="e.g. superAdmin01"
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="password">Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" aria-hidden />
            <input
              id="password"
              type={show ? 'text' : 'password'}
              autoComplete="current-password"
              className="input pl-9 pr-10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShow(!show)}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              aria-label={show ? 'Hide password' : 'Show password'}
            >
              {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <button className="btn w-full bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 transition" disabled={busy}>
          {busy && <Loader2 className="h-4 w-4 animate-spin text-slate-950" />} Super Admin Login
        </button>

        <p className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
          Team Owner or Match Admin?{' '}
          <Link to="/login" className="font-semibold text-blue-600 hover:underline">
            Go to Team Login
          </Link>
        </p>
      </form>
    </div>
  );
}
