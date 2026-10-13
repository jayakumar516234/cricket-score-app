import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { LayoutDashboard, Shield, Trophy, Users, ScrollText, LogOut, Menu, X, CircleDot } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Layout() {
  const { user, logout, isSuper } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const links = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/teams', label: 'Teams', icon: Shield },
    { to: '/matches', label: 'Matches', icon: Trophy },
    ...(isSuper ? [{ to: '/users', label: 'Users', icon: Users }, { to: '/audit', label: 'Audit log', icon: ScrollText }] : []),
  ];

  const doLogout = () => { logout(); navigate('/login'); };

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 p-3" aria-label="Main">
      {links.map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)}
          className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${isActive ? 'bg-pitch-600 text-white' : 'text-slate-300 hover:bg-navy-800 hover:text-white'}`}>
          <Icon className="h-5 w-5" aria-hidden /> {label}
        </NavLink>
      ))}
      <button onClick={doLogout} className="mt-auto flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-navy-800 hover:text-white">
        <LogOut className="h-5 w-5" aria-hidden /> Sign out
      </button>
    </nav>
  );

  const brand = (
    <div className="flex items-center gap-2 px-4 py-4 text-white">
      <CircleDot className="h-6 w-6 text-pitch-400" aria-hidden />
      <span className="text-lg font-bold tracking-tight">Cricket Score</span>
    </div>
  );

  return (
    <div className="flex min-h-full">
      <aside className="hidden w-60 shrink-0 flex-col bg-navy-900 lg:flex">
        {brand}
        {nav}
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <aside className="relative flex h-full w-64 flex-col bg-navy-900">
            <button onClick={() => setOpen(false)} className="absolute right-3 top-4 text-slate-300" aria-label="Close menu"><X className="h-5 w-5" /></button>
            {brand}
            {nav}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 bg-navy-900 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] text-white shadow">
          <button className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu className="h-6 w-6" /></button>
          <span className="font-bold lg:hidden">Cricket Score</span>
          <div className="ml-auto flex items-center gap-2 text-sm">
            <span className="hidden text-slate-300 sm:inline">{user?.name}</span>
            <span className="badge bg-pitch-600/20 text-pitch-400 capitalize">{user?.role === 'superadmin' ? 'Super Admin' : user?.role === 'viewer' ? 'View only' : 'Player'}</span>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 p-4 pb-24 sm:p-6 lg:pb-6">
          <Outlet />
        </main>
        <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-white/10 bg-navy-900 pb-[env(safe-area-inset-bottom)] lg:hidden" aria-label="Quick navigation">
          {links.slice(0, 3).map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium ${isActive ? 'text-pitch-400' : 'text-slate-400'}`}>
              <Icon className="h-5 w-5" aria-hidden /> {label}
            </NavLink>
          ))}
          <button onClick={() => setOpen(true)} className="flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium text-slate-400"><Menu className="h-5 w-5" aria-hidden /> More</button>
        </nav>
      </div>
    </div>
  );
}
