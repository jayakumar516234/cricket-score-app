import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { LayoutDashboard, Shield, Trophy, Users, ScrollText, Lightbulb, LogOut, Menu, X, CircleDot } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

import { APP_VERSION } from '../version.js';

export default function Layout() {
  const { user, logout, isSuper, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const links = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/teams', label: 'Teams', icon: Shield },
    { to: '/matches', label: 'Matches', icon: Trophy },
    ...(isAdmin ? [{ to: '/users', label: 'Users', icon: Users }] : []),
    ...(isSuper ? [{ to: '/audit', label: 'Audit log', icon: ScrollText }] : []),
  ];

  const doLogout = () => { logout(); navigate('/login'); };
  const userInitials = (user?.name || '?').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const roleLabel = user?.role === 'superadmin' ? 'Super Admin' : user?.role === 'admin' ? 'Admin' : user?.role === 'viewer' ? 'Viewer' : 'Team Admin';

  const userProfileCard = (
    <div className="mx-3 my-2 flex items-center gap-3 rounded-xl border border-navy-700/60 bg-navy-800/80 p-3 shadow-xs">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-pitch-500 to-pitch-700 text-sm font-bold text-navy-950 shadow-xs">
        {userInitials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="truncate text-sm font-bold text-white">{user?.name}</div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[11px] font-semibold text-pitch-400">{roleLabel}</span>
        </div>
      </div>
    </div>
  );

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 p-3" aria-label="Main">
      {userProfileCard}
      <div className="my-1 border-t border-navy-800/80" />
      {links.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={() => setOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${
              isActive
                ? 'bg-gradient-to-r from-pitch-600 to-pitch-700 text-white shadow-sm'
                : 'text-slate-300 hover:bg-navy-800/80 hover:text-white'
            }`
          }
        >
          <Icon className="h-5 w-5 shrink-0" aria-hidden /> {label}
        </NavLink>
      ))}
      <div className="mt-auto flex flex-col gap-1 pt-3 border-t border-navy-800/80">
        <button
          onClick={doLogout}
          className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-red-400 hover:bg-red-500/10 hover:text-red-300 transition"
        >
          <LogOut className="h-5 w-5 shrink-0" aria-hidden /> Sign out
        </button>
        <div className="px-3 py-1.5 text-center text-[11px] font-medium text-slate-500">
          Cricket Score App • v{APP_VERSION}
        </div>
      </div>
    </nav>
  );

  const brand = (
    <div className="flex items-center justify-between px-4 py-4 text-white border-b border-navy-800/70">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-pitch-500/20 text-pitch-400">
          <CircleDot className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <span className="text-base font-bold tracking-tight text-white block leading-tight">Cricket Score</span>
          <span className="text-[10px] text-slate-400 block font-medium">Tournament Manager</span>
        </div>
      </div>
      <span className="rounded-md bg-navy-800 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 border border-navy-700/60">
        v{APP_VERSION}
      </span>
    </div>
  );

  // Quick navigation items for mobile bottom bar
  const bottomNavItems = isAdmin ? links.slice(0, 4) : links.slice(0, 3);

  return (
    <div className="flex min-h-dvh bg-slate-100">
      <aside className="hidden w-64 shrink-0 flex-col bg-navy-950 border-r border-navy-800/80 lg:flex">
        {brand}
        {nav}
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-xs transition-opacity" onClick={() => setOpen(false)} />
          <aside className="relative flex h-full w-72 max-w-[85vw] flex-col bg-navy-950 shadow-2xl">
            <button
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3.5 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-navy-800 hover:text-white transition"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            {brand}
            {nav}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-navy-800/70 bg-navy-950/95 px-3.5 pb-2.5 pt-[calc(0.6rem+env(safe-area-inset-top))] text-white backdrop-blur-md shadow-xs sm:px-4 sm:pb-3">
          <button
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 hover:bg-navy-800 transition lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-1.5 lg:hidden min-w-0">
            <CircleDot className="h-5 w-5 text-pitch-400 shrink-0" aria-hidden />
            <span className="font-bold text-sm tracking-tight text-white truncate">Cricket Score</span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-lg bg-navy-900/80 border border-navy-800 px-2.5 py-1 text-xs">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-pitch-500/20 font-bold text-pitch-400 text-[11px]">
                {userInitials}
              </span>
              <span className="font-semibold text-slate-200 hidden sm:inline max-w-[120px] truncate">{user?.name}</span>
              <span className="badge bg-pitch-500/20 text-pitch-300 text-[10px] font-bold uppercase tracking-wider py-0.5 px-1.5 border border-pitch-500/30">
                {roleLabel}
              </span>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-3.5 py-4 pb-24 sm:px-6 sm:py-6 lg:pb-8">
          <Outlet />
        </main>

        {/* Mobile App Bottom Navigation Bar */}
        <nav
          className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-navy-800/80 bg-navy-950/95 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-1.5 backdrop-blur-md shadow-lg lg:hidden"
          aria-label="Quick navigation"
        >
          {bottomNavItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center justify-center py-1 text-[11px] font-semibold transition ${
                  isActive ? 'text-pitch-400' : 'text-slate-400 hover:text-slate-200'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div
                    className={`flex h-7 w-12 items-center justify-center rounded-full transition ${
                      isActive ? 'bg-pitch-500/20 text-pitch-400' : 'text-slate-400'
                    }`}
                  >
                    <Icon className="h-4.5 w-4.5" aria-hidden />
                  </div>
                  <span className="mt-0.5 tracking-tight">{label}</span>
                </>
              )}
            </NavLink>
          ))}
          <button
            onClick={() => setOpen(true)}
            className="flex flex-1 flex-col items-center justify-center py-1 text-[11px] font-semibold text-slate-400 hover:text-slate-200 transition"
          >
            <div className="flex h-7 w-12 items-center justify-center rounded-full text-slate-400">
              <Menu className="h-4.5 w-4.5" aria-hidden />
            </div>
            <span className="mt-0.5 tracking-tight">More</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
