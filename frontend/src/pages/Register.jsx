import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Lock, User, Phone, AtSign, Loader2, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { ErrorBox, CricketBallIcon } from '../components/ui.jsx';
import { LanguageSelect } from '../components/LanguageSwitcher.jsx';

const digits = (v) => (v || '').replace(/\D/g, '');

export default function Register() {
  const { register } = useAuth();
  const { t } = useTranslation();
  const [f, setF] = useState({ name: '', username: '', phone: '', password: '' });
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => {
    setF((prev) => ({ ...prev, [k]: e.target.value }));
    if (errors[k]) setErrors((prev) => ({ ...prev, [k]: '' }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const er = {};
    if (f.name.trim().length < 2) er.name = 'Please enter your full name (at least 2 letters)';

    const uname = f.username.trim().toLowerCase();
    if (!/^[a-zA-Z0-9_.]{3,30}$/.test(uname) || !/[a-zA-Z]/.test(uname)) {
      er.username = 'Username must be 3-30 characters (letters, numbers, dot or underscore)';
    }

    let p = digits(f.phone);
    if (p.length === 12 && p.startsWith('91')) p = p.slice(2);
    if (!/^[6-9]\d{9}$/.test(p)) {
      er.phone = 'Please enter a valid 10-digit mobile number';
    }

    if (f.password.length < 4) {
      er.password = 'Password must be at least 4 characters';
    }

    setErrors(er);
    if (Object.keys(er).length) return;

    setBusy(true);
    setError('');
    try {
      await register(f.name.trim(), uname, p, f.password);
    } catch (err) {
      setError(err.message || 'Registration failed');
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-navy-950 via-navy-900 to-navy-800 overflow-hidden select-none px-4 py-3">
      {/* App Branding - compact */}
      <div className="mb-3 flex items-center gap-2.5 text-white">
        <CricketBallIcon className="h-9 w-9 drop-shadow-md shrink-0" />
        <div>
          <h1 className="text-xl font-extrabold tracking-tight leading-tight">Cricket Score</h1>
          <p className="text-[11px] text-slate-300 leading-tight">{t('login.tagline') || 'Live scoring & match management'}</p>
        </div>
      </div>

      {/* Main Register Card */}
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl bg-white px-5 py-4 shadow-2xl" noValidate>
        <div className="mb-3">
          <h2 className="text-lg font-bold text-slate-900 leading-tight">Create Account</h2>
          <p className="text-[11px] text-slate-500 mt-0.5">Enter your details to get started</p>
        </div>

        <ErrorBox message={error} />

        <div className="space-y-2.5">
          {/* 1. Full Name */}
          <div>
            <label className="mb-0.5 block text-[10px] font-bold uppercase tracking-wider text-slate-600" htmlFor="name">
              Your Name *
            </label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" aria-hidden />
              <input
                id="name"
                type="text"
                autoComplete="name"
                className={`w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 shadow-2xs transition focus:border-pitch-500 focus:outline-none focus:ring-2 focus:ring-pitch-500/25 ${errors.name ? 'border-red-400 focus:border-red-500 focus:ring-red-500/30' : ''}`}
                value={f.name}
                onChange={set('name')}
                placeholder="e.g. Suresh Kumar"
                required
              />
            </div>
            {errors.name && <span className="text-[10px] text-red-600 font-semibold mt-0.5 block">{errors.name}</span>}
          </div>

          {/* 2. Username */}
          <div>
            <label className="mb-0.5 block text-[10px] font-bold uppercase tracking-wider text-slate-600" htmlFor="username">
              Username *
            </label>
            <div className="relative">
              <AtSign className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" aria-hidden />
              <input
                id="username"
                type="text"
                autoCapitalize="none"
                autoComplete="username"
                className={`w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 py-2 text-xs font-mono text-slate-900 placeholder-slate-400 shadow-2xs transition focus:border-pitch-500 focus:outline-none focus:ring-2 focus:ring-pitch-500/25 ${errors.username ? 'border-red-400 focus:border-red-500 focus:ring-red-500/30' : ''}`}
                value={f.username}
                onChange={set('username')}
                placeholder="e.g. suresh_cricket"
                required
              />
            </div>
            {errors.username && <span className="text-[10px] text-red-600 font-semibold mt-0.5 block">{errors.username}</span>}
          </div>

          {/* 3. Mobile Number */}
          <div>
            <label className="mb-0.5 block text-[10px] font-bold uppercase tracking-wider text-slate-600" htmlFor="phone">
              Mobile Number *
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" aria-hidden />
              <input
                id="phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                className={`w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 shadow-2xs transition focus:border-pitch-500 focus:outline-none focus:ring-2 focus:ring-pitch-500/25 ${errors.phone ? 'border-red-400 focus:border-red-500 focus:ring-red-500/30' : ''}`}
                value={f.phone}
                onChange={set('phone')}
                placeholder="e.g. 9876543210"
                maxLength={14}
                required
              />
            </div>
            {errors.phone && <span className="text-[10px] text-red-600 font-semibold mt-0.5 block">{errors.phone}</span>}
          </div>

          {/* 4. Password */}
          <div>
            <label className="mb-0.5 block text-[10px] font-bold uppercase tracking-wider text-slate-600" htmlFor="password">
              Password *
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" aria-hidden />
              <input
                id="password"
                type={show ? 'text' : 'password'}
                autoComplete="new-password"
                className={`w-full rounded-xl border border-slate-200 bg-white pl-8 pr-9 py-2 text-xs text-slate-900 placeholder-slate-400 shadow-2xs transition focus:border-pitch-500 focus:outline-none focus:ring-2 focus:ring-pitch-500/25 ${errors.password ? 'border-red-400 focus:border-red-500 focus:ring-red-500/30' : ''}`}
                value={f.password}
                onChange={set('password')}
                placeholder="At least 4 characters"
                required
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                className="absolute right-3 top-2 text-slate-400 hover:text-slate-600"
                aria-label={show ? 'Hide password' : 'Show password'}
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <span className="text-[10px] text-red-600 font-semibold mt-0.5 block">{errors.password}</span>}
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="mt-3 btn btn-primary w-full py-2.5 text-sm font-black shadow-lg shadow-pitch-600/25 flex items-center justify-center gap-2"
          disabled={busy}
        >
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Creating account...</span>
            </>
          ) : (
            <>
              <UserPlus className="h-4 w-4" />
              <span>Create Account</span>
            </>
          )}
        </button>

        {/* Back to Login + Language */}
        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
          <p className="text-[11px] text-slate-600">
            Have an account?{' '}
            <Link to="/login" className="font-extrabold text-pitch-700 hover:text-pitch-800 hover:underline">
              Log in
            </Link>
          </p>
          <LanguageSelect />
        </div>
      </form>
    </div>
  );
}
