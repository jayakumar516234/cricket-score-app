import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Shield,
  Trophy,
  Users,
  ScrollText,
  LogOut,
  Menu,
  X,
  Sparkles,
  Settings as SettingsIcon,
  Medal,
  MessageSquare,
  Bell,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useFetch } from '../useFetch.js';
import { useMenuConfig } from '../context/MenuConfigContext.jsx';
import { CricketBallIcon } from './ui.jsx';
import { APP_VERSION } from '../version.js';

export default function Layout() {
  const { user, logout, isSuper, isAdmin, isViewer } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { isVisible } = useMenuConfig() ?? {};

  // Poll for incoming team opponent requests (updates navbar badge in real time)
  const { data: notifData } = useFetch(user && !isViewer ? '/teams/pending-requests-count' : null, { poll: 20000 });
  const pendingCount = notifData?.count || 0;

  // Poll for pending tournament join requests (organizer only)
  const { data: trnNotifData } = useFetch(user && (isAdmin || user?.role === 'user') ? '/tournaments/pending-join-count' : null, { poll: 25000 });
  const pendingTrnCount = trnNotifData?.count || 0;

  // All possible nav links with visibility keys
  const allAdminLinks = [
    { to: '/', label: t('nav.overview'), icon: LayoutDashboard, end: true, key: 'home' },
    { to: '/teams', label: t('nav.teams'), icon: Shield, key: 'teams' },
    { to: '/matches', label: t('nav.matches'), icon: Trophy, key: 'matches' },
    { to: '/tournaments', label: t('nav.tournaments'), icon: Medal, key: 'tournaments' },
    { to: '/users', label: t('nav.users'), icon: Users, key: 'users' },
    { to: '/support', label: 'Support & Feedback', icon: MessageSquare, key: 'support' },
    ...(isSuper ? [{ to: '/audit', label: t('nav.auditLog'), icon: ScrollText, key: 'audit' }] : []),
    { to: '/settings', label: t('nav.settings'), icon: SettingsIcon, key: 'settings' },
  ];

  const allUserLinks = [
    { to: '/', label: t('nav.home'), icon: LayoutDashboard, end: true, key: 'home' },
    { to: '/teams', label: t('nav.team'), icon: Shield, key: 'teams' },
    { to: '/matches', label: t('nav.matches'), icon: Trophy, key: 'matches' },
    { to: '/tournaments', label: t('nav.tournaments'), icon: Medal, key: 'tournaments' },
    { to: '/support', label: 'Help & Feedback', icon: MessageSquare, key: 'support' },
    { to: '/settings', label: t('nav.settings'), icon: SettingsIcon, key: 'settings' },
  ];

  const rawLinks = isAdmin ? allAdminLinks : allUserLinks;
  // Filter by menu visibility config (home + settings always shown)
  const links = rawLinks.filter(({ key }) => {
    if (key === 'home' || key === 'settings') return true;
    if (!isVisible) return true; // config not yet loaded → show all
    return isVisible(key);
  });

  const doLogout = () => { logout(); navigate('/login'); };
  const userInitials = (user?.name || '?').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const roleLabel = t(`roles.${user?.role}`) || 'Team Admin';
  const roleBadgeStyle = user?.role === 'superadmin'
    ? 'bg-amber-400/15 text-amber-300 border-amber-400/30'
    : user?.role === 'admin'
    ? 'bg-blue-400/15 text-blue-300 border-blue-400/30'
    : user?.role === 'viewer'
    ? 'bg-slate-400/15 text-slate-300 border-slate-400/30'
    : 'bg-pitch-400/15 text-pitch-300 border-pitch-400/30';

  const userProfileCard = (
    <Link
      to="/settings"
      onClick={() => setOpen(false)}
      className="group mx-2.5 my-2 flex items-center gap-2.5 rounded-xl border border-navy-700/60 bg-navy-900/60 p-2.5 hover:border-pitch-500/50 hover:bg-navy-850 transition"
      title={t('nav.settings')}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-tr from-pitch-600 via-pitch-500 to-emerald-400 font-black text-navy-950 text-xs shadow-glow-pitch">
        {userInitials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="truncate text-sm font-bold text-white tracking-tight group-hover:text-pitch-300 transition">{user?.name}</div>
        <span className={`badge border text-[10px] font-bold uppercase tracking-wider py-0 px-1.5 rounded-md ${roleBadgeStyle}`}>
          {roleLabel}
        </span>
      </div>
    </Link>
  );

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 p-2.5" aria-label="Main navigation">
      {userProfileCard}
      <div className="my-1 border-t border-navy-800/80" />

      {links.map(({ to, label, icon: Icon, end, key }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={() => setOpen(false)}
          className={({ isActive }) =>
            `group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-all duration-150 ${
              isActive
                ? 'bg-gradient-to-r from-pitch-600 via-emerald-600 to-teal-600 text-white shadow-glow-pitch'
                : 'text-slate-300 hover:bg-navy-850/80 hover:text-white'
            }`
          }
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <span className="absolute left-1 top-2 bottom-2 w-1 rounded-full bg-white/70" />
              )}
              <Icon
                className={`h-4.5 w-4.5 shrink-0 transition-transform duration-150 group-hover:scale-105 ${
                  isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                }`}
                aria-hidden
              />
              <span className="truncate flex-1">{label}</span>
              {key === 'teams' && pendingCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-black text-white shadow-xs animate-pulse">
                  {pendingCount}
                </span>
              )}
              {key === 'tournaments' && pendingTrnCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-black text-white shadow-xs animate-pulse">
                  {pendingTrnCount}
                </span>
              )}
            </>
          )}
        </NavLink>
      ))}

      <div className="mt-auto flex flex-col gap-1 pt-2.5 border-t border-navy-800/80">
        <button
          onClick={doLogout}
          className="group flex items-center gap-3 rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold text-rose-300 hover:bg-rose-500/15 hover:text-rose-200 transition-all duration-150"
        >
          <LogOut className="h-4 w-4 shrink-0 text-rose-400 group-hover:text-rose-300 group-hover:scale-105 transition-transform" aria-hidden />
          <span>{t('nav.signOut')}</span>
        </button>
        <div className="flex items-center justify-between px-3 py-1 text-[11px] font-medium text-slate-500">
          <span>Cricket Score</span>
          <span className="font-mono text-slate-400">v{APP_VERSION}</span>
        </div>
      </div>
    </nav>
  );

  const brand = (
    <div className="flex items-center justify-between px-4 py-4 text-white border-b border-navy-800/80 bg-navy-950/60">
      <div className="flex items-center gap-2.5">
        <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-pitch-500/20 to-navy-800 border border-pitch-500/30 text-pitch-400 shadow-glow-pitch">
          <CricketBallIcon className="w-6 h-6" />
        </div>
        <div>
          <span className="text-base font-black tracking-tight text-white block leading-tight flex items-center gap-1.5">
            <span>Cricket Score</span>
            <Sparkles className="h-3 w-3 text-pitch-400 animate-pulse" />
          </span>
          <span className="text-[10px] text-pitch-400/90 block font-semibold uppercase tracking-wider">
            Match Center
          </span>
        </div>
      </div>
      <span className="rounded-lg bg-navy-900 px-2 py-0.5 text-[10px] font-bold text-pitch-400 border border-navy-700/80 shadow-2xs">
        v{APP_VERSION}
      </span>
    </div>
  );

  // Quick navigation items for mobile bottom bar (Home, Teams, Matches + More = 4 total)
  const bottomNavItems = [
    { to: '/', label: t('nav.home') || 'Home', icon: LayoutDashboard, end: true },
    { to: '/teams', label: t('nav.teams') || 'Teams', icon: Shield },
    { to: '/matches', label: t('nav.matches') || 'Matches', icon: Trophy },
  ];

  return (
    <div className="flex min-h-dvh bg-slate-100">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col bg-gradient-to-b from-navy-950 via-navy-900 to-navy-950 border-r border-navy-800/80 lg:flex shadow-xl">
        {brand}
        {nav}
      </aside>

      {/* Mobile Drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-navy-950/80 backdrop-blur-sm transition-opacity"
            onClick={() => setOpen(false)}
          />
          <aside className="relative flex h-full w-72 max-w-[85vw] flex-col bg-gradient-to-b from-navy-950 via-navy-900 to-navy-950 shadow-2xl border-r border-navy-800/80">
            <button
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3.5 flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-navy-800 hover:text-white transition"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            {brand}
            {nav}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Modern Glassmorphic Header */}
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-navy-800/80 bg-navy-950/90 px-3.5 pb-2.5 pt-[calc(0.6rem+env(safe-area-inset-top))] text-white backdrop-blur-xl shadow-sm sm:px-5 sm:pb-3">
          <button
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-navy-700/60 bg-navy-900/80 text-slate-300 hover:bg-navy-800 hover:text-white transition lg:hidden shadow-xs"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          
          <div className="flex items-center gap-2 lg:hidden min-w-0">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-pitch-500/20 border border-pitch-500/30 shrink-0">
              <CricketBallIcon className="w-5 h-5" />
            </div>
            <span className="font-black text-sm tracking-tight text-white truncate">Cricket Score</span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {!isViewer && (
              <Link
                to="/teams?tab=opponents"
                className={`relative flex h-8 w-8 items-center justify-center rounded-xl border transition shadow-2xs ${
                  pendingCount > 0
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30'
                    : 'bg-navy-900/80 border-navy-700/60 text-slate-300 hover:bg-navy-800 hover:text-white'
                }`}
                title={pendingCount > 0 ? `${pendingCount} Opponent Request(s) waiting!` : 'Opponent Requests'}
                aria-label="Opponent notifications"
              >
                <Bell className={`h-4 w-4 ${pendingCount > 0 ? 'text-amber-400 animate-pulse' : ''}`} />
                {pendingCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-black text-white shadow-xs animate-bounce">
                    {pendingCount}
                  </span>
                )}
              </Link>
            )}

            <Link
              to="/settings"
              className="flex items-center gap-2 rounded-xl bg-navy-900/90 border border-navy-700/70 p-1 pr-3 text-xs shadow-xs hover:border-pitch-500/50 hover:bg-navy-800 transition"
              title={t('nav.settings')}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-tr from-pitch-600 to-emerald-400 font-black text-navy-950 text-xs shadow-glow-pitch">
                {userInitials}
              </span>
              <span className="font-bold text-slate-200 hidden sm:inline max-w-[130px] truncate">{user?.name}</span>
            </Link>
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-2.5 py-2.5 pb-20 sm:px-6 sm:py-5 lg:pb-8">
          <Outlet />
        </main>

        {/* Mobile App Bottom Navigation Dock - Exactly 4 fields, spacious, sleek & animated */}
        <nav
          className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-navy-800/80 bg-navy-950/95 px-2 pb-[calc(0.55rem+env(safe-area-inset-bottom))] pt-1.5 backdrop-blur-xl shadow-2xl lg:hidden select-none"
          aria-label="Quick navigation"
        >
          {bottomNavItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `group relative flex flex-1 flex-col items-center justify-center py-1 text-[11px] transition-transform duration-200 active:scale-95 ${
                  isActive ? 'text-pitch-400' : 'text-slate-400 hover:text-slate-200'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div
                    className={`relative flex h-8 w-14 items-center justify-center rounded-xl transition-all duration-300 ${
                      isActive
                        ? 'bg-gradient-to-tr from-pitch-600/25 to-emerald-500/20 text-pitch-400 border border-pitch-500/35 shadow-glow-pitch scale-110 -translate-y-0.5'
                        : 'text-slate-400 group-hover:bg-navy-900/60'
                    }`}
                  >
                    <Icon className="h-4.5 w-4.5 shrink-0 transition-transform duration-300" aria-hidden />
                    {to === '/teams' && pendingCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-black text-white shadow-xs animate-bounce">
                        {pendingCount}
                      </span>
                    )}
                    {isActive && (
                      <span className="absolute -top-0.5 right-3 h-1.5 w-1.5 rounded-full bg-pitch-400 shadow-glow-pitch animate-pulse" />
                    )}
                  </div>
                  <span
                    className={`mt-1 tracking-tight text-[10.5px] transition-all duration-200 truncate ${
                      isActive ? 'font-black text-pitch-300 scale-105' : 'font-semibold text-slate-400'
                    }`}
                  >
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
          <button
            onClick={() => setOpen(true)}
            className="group relative flex flex-1 flex-col items-center justify-center py-1 text-[11px] text-slate-400 hover:text-slate-200 transition-transform duration-200 active:scale-95"
            aria-label="Open menu drawer"
          >
            <div className="flex h-8 w-14 items-center justify-center rounded-xl text-slate-400 group-hover:bg-navy-900/60 transition-all duration-200">
              <Menu className="h-4.5 w-4.5 shrink-0" aria-hidden />
            </div>
            <span className="mt-1 tracking-tight text-[10.5px] font-semibold text-slate-400 truncate">More</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
