import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Lock, User, Loader2, AlertTriangle, Play } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { ErrorBox, CricketBallIcon } from '../components/ui.jsx';
import { LanguageSelect } from '../components/LanguageSwitcher.jsx';
import { CricketIntroSplash } from '../components/CricketIntroSplash.jsx';
import { APP_VERSION } from '../version.js';

export default function Login() {
  const { login } = useAuth();
  const { t } = useTranslation();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Show 6-second cricket stadium intro on first time arriving at login page
  const [showSplash, setShowSplash] = useState(() => {
    try {
      return !sessionStorage.getItem('cricket_intro_seen');
    } catch {
      return false;
    }
  });

  const [sessionNotice] = useState(() => {
    try {
      const msg = sessionStorage.getItem('auth_notice');
      sessionStorage.removeItem('auth_notice');
      return msg || '';
    } catch {
      return '';
    }
  });

  const submit = async (e) => {
    e.preventDefault();
    if (!identifier.trim() || !password) return setError(t('login.errorEmpty'));
    setBusy(true);
    setError('');
    try {
      await login(identifier.trim(), password);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const noticeMessage = sessionNotice ? (
    sessionNotice.toLowerCase().includes('another device')
      ? t('login.sessionExpiredAnotherDevice')
      : (t('login.sessionExpired') || sessionNotice)
  ) : '';

  return (
    <>
      {showSplash && (
        <CricketIntroSplash onFinish={() => setShowSplash(false)} duration={6000} />
      )}

      <div className="flex min-h-full flex-col items-center justify-center bg-gradient-to-b from-navy-950 via-navy-900 to-navy-800 p-4">
        <div className="mb-6 flex flex-col items-center text-white text-center">
          <div className="relative mb-2">
            <div className="absolute inset-0 rounded-full bg-pitch-500/20 blur-lg animate-pulse" />
            <CricketBallIcon className="relative h-16 w-16 drop-shadow-md" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Cricket Score</h1>
          <p className="text-sm text-slate-300">{t('login.tagline')}</p>
        </div>
        <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow-2xl" noValidate>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{t('login.title')}</h2>
            <p className="text-sm text-slate-500">{t('login.subtitle')}</p>
          </div>

          {noticeMessage && (
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs font-semibold text-amber-900 shadow-xs animate-in fade-in">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{noticeMessage}</div>
            </div>
          )}

          <ErrorBox message={error} />
          <div>
            <label className="label" htmlFor="identifier">{t('login.username')}</label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" aria-hidden />
              <input id="identifier" type="text" autoComplete="username" autoCapitalize="none" className="input pl-9" value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder={t('login.usernamePlaceholder')} />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="password">{t('login.password')}</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" aria-hidden />
              <input id="password" type={show ? 'text' : 'password'} autoComplete="current-password" className="input pl-9 pr-10" value={password} onChange={(e) => setPassword(e.target.value)} />
              <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-2.5 text-slate-400" aria-label={show ? t('login.hidePassword') : t('login.showPassword')}>
                {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>
          <button className="btn btn-primary w-full" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} {t('login.loginBtn')}</button>
          <p className="text-center text-xs text-slate-500">{t('login.viewerHint')}</p>
          {/* Language selector on login page */}
          <div className="pt-1 border-t border-slate-100">
            <LanguageSelect />
          </div>
        </form>

        {/* Intro Replay Button */}
        <button
          type="button"
          onClick={() => setShowSplash(true)}
          className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/15 px-3 py-1 text-[11px] font-semibold text-slate-300 hover:text-white transition shadow-sm"
          title="Watch Opening Cricket Animation"
        >
          <Play className="h-3 w-3 text-pitch-400 fill-pitch-400" />
          <span>Replay Intro Animation</span>
        </button>

        <p className="mt-4 text-center text-xs text-slate-400">Cricket Score {APP_VERSION}</p>
        <p className="mt-2 text-center text-xs text-slate-500">
          <Link to="/privacy" className="hover:underline">Privacy Policy</Link>
          {' · '}
          <Link to="/terms" className="hover:underline">Terms &amp; Conditions</Link>
        </p>
      </div>
    </>
  );
}
