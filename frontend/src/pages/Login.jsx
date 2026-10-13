import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CircleDot, Eye, EyeOff, Lock, User, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { ErrorBox } from '../components/ui.jsx';

export default function Login() {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!identifier.trim() || !password) return setError('Enter your username or phone number and your password');
    setBusy(true);
    setError('');
    try {
      await login(identifier.trim(), password);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-gradient-to-b from-navy-950 via-navy-900 to-navy-800 p-4">
      <div className="mb-6 flex flex-col items-center text-white">
        <CircleDot className="mb-2 h-14 w-14 text-pitch-400" aria-hidden />
        <h1 className="text-3xl font-extrabold tracking-tight">Cricket Score</h1>
        <p className="text-sm text-slate-300">Teams, matches and live scores</p>
      </div>
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow-2xl" noValidate>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Login</h2>
          <p className="text-sm text-slate-500">Sign in to continue</p>
        </div>
        <ErrorBox message={error} />
        <div>
          <label className="label" htmlFor="identifier">Username or phone number</label>
          <div className="relative">
            <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" aria-hidden />
            <input id="identifier" type="text" autoComplete="username" autoCapitalize="none" className="input pl-9" value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="username or 10-digit mobile" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" aria-hidden />
            <input id="password" type={show ? 'text' : 'password'} autoComplete="current-password" className="input pl-9 pr-10" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-2.5 text-slate-400" aria-label={show ? 'Hide password' : 'Show password'}>
              {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>
        <button className="btn btn-primary w-full" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Login</button>
        <p className="text-center text-xs text-slate-500">Team view login? Use the username and password your team owner gave you.</p>
        <p className="text-center text-sm text-slate-500">
          New here? <Link to="/register" className="font-semibold text-blue-600 hover:underline">Sign up with your phone number</Link>
        </p>
      </form>
    </div>
  );
}
