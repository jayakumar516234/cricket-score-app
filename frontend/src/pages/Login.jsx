import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Lock, User, Loader2, AlertTriangle, LogIn, WifiOff, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { ErrorBox, CricketBallIcon } from '../components/ui.jsx';
import { LanguageSelect } from '../components/LanguageSwitcher.jsx';

export default function Login() {
  const { login, loginOffline } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [isNetworkError, setIsNetworkError] = useState(() => typeof navigator !== 'undefined' && !navigator.onLine);

  const [sessionNotice] = useState(() => {
    try {
      const msg = sessionStorage.getItem('auth_notice');
      sessionStorage.removeItem('auth_notice');
      return msg || '';
    } catch {
      return '';
    }
  });

  const handleContinueOffline = () => {
    loginOffline(identifier.trim() || 'Offline Scorer');
    navigate('/');
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!identifier.trim() || !password) return setError(t('login.errorEmpty') || 'Enter username and password');
    setBusy(true);
    setError('');
    setIsNetworkError(false);
    try {
      await login(identifier.trim(), password);
    } catch (err) {
      const isOffline =
        !navigator.onLine ||
        err.message?.toLowerCase().includes('fetch') ||
        err.message?.toLowerCase().includes('network') ||
        err.message?.toLowerCase().includes('timeout') ||
        err.status === 502 ||
        err.status === 503 ||
        err.status === 504;

      if (isOffline) {
        setIsNetworkError(true);
        setError('Server is offline or no internet connection available.');
      } else {
        setError(err.message || 'Login failed');
      }
      setBusy(false);
    }
  };

  const noticeMessage = sessionNotice ? (
    sessionNotice.toLowerCase().includes('another device')
      ? (t('login.sessionExpiredAnotherDevice') || sessionNotice)
      : (t('login.sessionExpired') || sessionNotice)
  ) : '';

  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-gradient-to-b from-navy-950 via-navy-900 to-navy-800 p-4 select-none">
      {/* App Branding */}
      <div className="mb-6 flex flex-col items-center text-white text-center">
        <div className="relative mb-2">
          <CricketBallIcon className="h-16 w-16 drop-shadow-md" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">Cricket Score</h1>
        <p className="text-sm text-slate-300">{t('login.tagline') || 'Live scoring & match management'}</p>
      </div>

      {/* Main Login Card - Essential Content Only */}
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow-2xl" noValidate>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{t('login.title') || 'Login'}</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {t('login.subtitle') || 'Enter your username or mobile number to continue'}
          </p>
        </div>

        {noticeMessage && (
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs font-semibold text-amber-900 shadow-xs animate-in fade-in">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{noticeMessage}</div>
          </div>
        )}

        <ErrorBox message={error} />

        {/* 📴 Smart Offline Assistance Card when network error occurs or device is offline */}
        {isNetworkError && (
          <div className="rounded-2xl border-2 border-amber-300 bg-gradient-to-r from-amber-50 via-orange-50/50 to-amber-50 p-3.5 space-y-2.5 shadow-sm animate-in fade-in">
            <div className="flex items-start gap-2.5">
              <WifiOff className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <h3 className="text-xs sm:text-sm font-black text-amber-950">
                  {t('login.offlineTitle') || 'Server Offline / No Internet'}
                </h3>
                <p className="text-[11px] sm:text-xs text-amber-800 font-medium leading-relaxed mt-0.5">
                  {t('login.offlineHelp') || 'You are offline. You can jump straight into the app and score matches with zero internet.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleContinueOffline}
              className="btn w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-xs sm:text-sm py-2.5 shadow-xs flex items-center justify-center gap-2 rounded-xl active:scale-98 transition"
            >
              <Zap className="h-4 w-4 text-yellow-200 fill-current" />
              <span>{t('login.continueOfflineBtn') || '⚡ Continue in Offline Mode'}</span>
            </button>
          </div>
        )}

        {/* Username or Mobile */}
        <div>
          <label className="label text-xs font-bold text-slate-700" htmlFor="identifier">
            {t('login.username') || 'Username or Mobile Number'}
          </label>
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
              placeholder={t('login.usernamePlaceholder') || 'e.g. username or 9876543210'}
              required
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="label text-xs font-bold text-slate-700" htmlFor="password">
            {t('login.password') || 'Password'}
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" aria-hidden />
            <input
              id="password"
              type={show ? 'text' : 'password'}
              autoComplete="current-password"
              className="input pl-9 pr-10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
            <button
              type="button"
              onClick={() => setShow(!show)}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              aria-label={show ? t('login.hidePassword') : t('login.showPassword')}
            >
              {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Login Button */}
        <button
          type="submit"
          className="btn btn-primary w-full py-3 text-sm sm:text-base font-black shadow-lg shadow-pitch-600/25 flex items-center justify-center gap-2"
          disabled={busy}
        >
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Logging in...</span>
            </>
          ) : (
            <>
              <LogIn className="h-4 w-4" />
              <span>{t('login.loginBtn') || 'Login'}</span>
            </>
          )}
        </button>

        {/* Quick Offline Scoring Mode Option */}
        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-slate-200"></div>
          <span className="flex-shrink mx-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">or</span>
          <div className="flex-grow border-t border-slate-200"></div>
        </div>

        <button
          type="button"
          onClick={handleContinueOffline}
          className="w-full rounded-xl border border-amber-300 bg-amber-50/80 hover:bg-amber-100 text-amber-900 py-2.5 px-3 text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition shadow-2xs active:scale-98"
        >
          <WifiOff className="h-4 w-4 text-amber-600 shrink-0" />
          <span>Quick Offline Scoring (No Internet Needed)</span>
        </button>

        {/* Sign Up Link */}
        <div className="pt-2 text-center border-t border-slate-100">
          <p className="text-xs sm:text-sm text-slate-600">
            Don't have an account?{' '}
            <Link to="/register" className="font-extrabold text-pitch-700 hover:text-pitch-800 hover:underline">
              Create Account (Sign Up)
            </Link>
          </p>
        </div>

        {/* Language selector */}
        <div className="pt-1 border-t border-slate-100">
          <LanguageSelect />
        </div>
      </form>
    </div>
  );
}
