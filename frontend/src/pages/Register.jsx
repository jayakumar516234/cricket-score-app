import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Lock, User, Phone, AtSign, Loader2, UserPlus, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { ErrorBox, CricketBallIcon } from '../components/ui.jsx';
import { LanguageSelect } from '../components/LanguageSwitcher.jsx';
import { APP_VERSION } from '../version.js';

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
      er.phone = 'Please enter a valid 10-digit Indian mobile number';
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
    <div className="flex min-h-full flex-col items-center justify-center bg-gradient-to-b from-navy-950 via-navy-900 to-navy-800 p-4">
      {/* Header Branding */}
      <div className="mb-6 flex flex-col items-center text-white text-center">
        <div className="relative mb-2">
          <div className="absolute inset-0 rounded-full bg-pitch-500/20 blur-lg animate-pulse" />
          <CricketBallIcon className="relative h-16 w-16 drop-shadow-md" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">Cricket Score</h1>
        <p className="text-sm text-slate-300">Create matches, manage squads and score live</p>
      </div>

      {/* Signup Card */}
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow-2xl" noValidate>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-slate-900">Create Account</h2>
            <span className="badge bg-pitch-50 text-pitch-700 border border-pitch-200 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
              New User
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Sign up to manage your team and broadcast live scores
          </p>
        </div>

        <ErrorBox message={error} />

        {/* 1. Full Name */}
        <div>
          <label className="label text-xs font-bold text-slate-700" htmlFor="name">
            Your Name *
          </label>
          <div className="relative">
            <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" aria-hidden />
            <input
              id="name"
              type="text"
              autoComplete="name"
              className={`input pl-9 ${errors.name ? 'input-error' : ''}`}
              value={f.name}
              onChange={set('name')}
              placeholder="e.g. Suresh Kumar"
              required
            />
          </div>
          {errors.name && <span className="text-[11px] text-red-600 font-semibold mt-1 block">{errors.name}</span>}
        </div>

        {/* 2. Username */}
        <div>
          <label className="label text-xs font-bold text-slate-700" htmlFor="username">
            Username *
          </label>
          <div className="relative">
            <AtSign className="absolute left-3 top-3 h-4 w-4 text-slate-400" aria-hidden />
            <input
              id="username"
              type="text"
              autoCapitalize="none"
              autoComplete="username"
              className={`input pl-9 font-mono ${errors.username ? 'input-error' : ''}`}
              value={f.username}
              onChange={set('username')}
              placeholder="e.g. suresh_cricket"
              required
            />
          </div>
          {errors.username ? (
            <span className="text-[11px] text-red-600 font-semibold mt-1 block">{errors.username}</span>
          ) : (
            <span className="text-[10px] text-slate-400 mt-0.5 block">You can login with this username or mobile number</span>
          )}
        </div>

        {/* 3. Mobile Number */}
        <div>
          <label className="label text-xs font-bold text-slate-700" htmlFor="phone">
            Mobile Number (10 Digits) *
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" aria-hidden />
            <input
              id="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              className={`input pl-9 ${errors.phone ? 'input-error' : ''}`}
              value={f.phone}
              onChange={set('phone')}
              placeholder="e.g. 9876543210"
              maxLength={14}
              required
            />
          </div>
          {errors.phone && <span className="text-[11px] text-red-600 font-semibold mt-1 block">{errors.phone}</span>}
        </div>

        {/* 4. Password */}
        <div>
          <label className="label text-xs font-bold text-slate-700" htmlFor="password">
            Password *
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" aria-hidden />
            <input
              id="password"
              type={show ? 'text' : 'password'}
              autoComplete="new-password"
              className={`input pl-9 pr-10 ${errors.password ? 'input-error' : ''}`}
              value={f.password}
              onChange={set('password')}
              placeholder="At least 4 characters"
              required
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
          {errors.password && <span className="text-[11px] text-red-600 font-semibold mt-1 block">{errors.password}</span>}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="btn btn-primary w-full py-3 text-sm sm:text-base font-black shadow-lg shadow-pitch-600/25 flex items-center justify-center gap-2"
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
              <span>Sign Up &amp; Get Started</span>
            </>
          )}
        </button>

        {/* Back to Login */}
        <div className="text-center pt-2 border-t border-slate-100">
          <p className="text-xs sm:text-sm text-slate-600">
            Already have an account?{' '}
            <Link to="/login" className="font-extrabold text-pitch-700 hover:text-pitch-800 hover:underline">
              Log in here
            </Link>
          </p>
        </div>

        {/* Language selector */}
        <div className="pt-1 border-t border-slate-100">
          <LanguageSelect />
        </div>
      </form>

      <p className="mt-4 text-center text-xs text-slate-400">Cricket Score {APP_VERSION}</p>
      <p className="mt-2 text-center text-xs text-slate-500">
        <Link to="/privacy" className="hover:underline">Privacy Policy</Link>
        {' · '}
        <Link to="/terms" className="hover:underline">Terms &amp; Conditions</Link>
      </p>
    </div>
  );
}
