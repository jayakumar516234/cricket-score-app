import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { api, pingServer } from './api.js';
import { useAuth } from './context/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import CricketAppLoader from './components/CricketAppLoader.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import SuperLogin from './pages/SuperLogin.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Teams from './pages/Teams.jsx';
import TeamForm from './pages/TeamForm.jsx';
import TeamDetail from './pages/TeamDetail.jsx';
import Matches from './pages/Matches.jsx';
import CreateMatch from './pages/CreateMatch.jsx';
import MatchPage from './pages/MatchPage.jsx';
import Scorecard from './pages/Scorecard.jsx';
import UsersPage from './pages/Users.jsx';
import Audit from './pages/Audit.jsx';
import Suggestions from './pages/Suggestions.jsx';
import PrivacyPolicy from './pages/PrivacyPolicy.jsx';
import TermsAndConditions from './pages/TermsAndConditions.jsx';
import Settings from './pages/Settings.jsx';
import SuperAdminConfig from './pages/SuperAdminConfig.jsx';
import TournamentsList from './pages/TournamentsList.jsx';
import TournamentDetail from './pages/TournamentDetail.jsx';
import PublicLiveMatch from './pages/PublicLiveMatch.jsx';

function Protected({ children, superOnly, adminOnly, noViewer }) {
  const { user, loading, isSuper, isAdmin, isViewer } = useAuth();
  if (loading) return <CricketAppLoader text="Verifying Access..." />;
  if (!user) return <Navigate to="/login" replace />;
  if (superOnly && !isSuper) return <Navigate to="/" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />;
  if (noViewer && isViewer) return <Navigate to="/" replace />;
  return children;
}

function ViewTeamRedirect() {
  const { code } = useParams();
  const { user, loginWithToken } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancel = false;
    api(`/auth/view-access/${code}`)
      .then((res) => {
        if (cancel) return;
        if (user && (user.role === 'superadmin' || user.role === 'admin' || (user.role === 'teamadmin' && String(user.viewTeam) === String(res.teamId)))) {
          navigate(`/teams/${res.teamId}`, { replace: true });
          return;
        }
        loginWithToken(res.token, res.user);
        navigate(`/teams/${res.teamId}`, { replace: true });
      })
      .catch((err) => {
        if (!cancel) setError(err.message || 'Unable to open view link');
      });
    return () => { cancel = true; };
  }, [code, user, loginWithToken, navigate]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-slate-900 text-white">
        <div className="max-w-md w-full bg-slate-800 rounded-2xl p-6 text-center border border-slate-700 space-y-4">
          <div className="text-red-400 font-bold text-lg">Unable to View Team</div>
          <p className="text-sm text-slate-300">{error}</p>
          <button onClick={() => navigate('/login')} className="btn btn-primary w-full">Go to Login</button>
        </div>
      </div>
    );
  }

  return <CricketAppLoader text="Opening Team View..." />;
}

export default function App() {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Proactive warmup ping to wake up and keep Render server awake
  useEffect(() => {
    pingServer();

    const handleWakeup = () => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        pingServer();
      }
    };

    window.addEventListener('visibilitychange', handleWakeup);
    window.addEventListener('focus', handleWakeup);
    window.addEventListener('online', handleWakeup);

    const timer = setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        pingServer();
      }
    }, 8 * 60 * 1000); // every 8 minutes while tab is active

    return () => {
      window.removeEventListener('visibilitychange', handleWakeup);
      window.removeEventListener('focus', handleWakeup);
      window.removeEventListener('online', handleWakeup);
      clearInterval(timer);
    };
  }, []);

  // Save current route for seamless app restoration
  useEffect(() => {
    if (user && location.pathname && !location.pathname.startsWith('/login') && !location.pathname.startsWith('/register') && !location.pathname.startsWith('/signup') && !location.pathname.startsWith('/super-login')) {
      try {
        localStorage.setItem('cricket_last_path', location.pathname);
      } catch {}
    }
  }, [location, user]);

  const isAuthRoute =
    location.pathname === '/login' ||
    location.pathname === '/register' ||
    location.pathname === '/signup' ||
    location.pathname === '/super-login' ||
    location.pathname.startsWith('/view');

  if (loading && !isAuthRoute) return <CricketAppLoader text="Loading Cricket Arena..." />;
  return (
    <Routes>
      <Route path="/view/:code" element={<ViewTeamRedirect />} />
      <Route path="/view-team/:code" element={<ViewTeamRedirect />} />
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/super-login" element={user ? <Navigate to="/" replace /> : <SuperLogin />} />
      <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />
      <Route path="/signup" element={user ? <Navigate to="/" replace /> : <Register />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsAndConditions />} />
      <Route path="/live/:id" element={<PublicLiveMatch />} />
      <Route element={<Protected><Layout /></Protected>}>
        <Route index element={<Dashboard />} />
        <Route path="teams" element={<Teams />} />
        <Route path="teams/new" element={<Protected noViewer><TeamForm /></Protected>} />
        <Route path="teams/:id" element={<TeamDetail />} />
        <Route path="teams/:id/edit" element={<Protected noViewer><TeamForm /></Protected>} />
        <Route path="matches" element={<Matches />} />
        <Route path="matches/new" element={<Protected noViewer><CreateMatch /></Protected>} />
        <Route path="matches/:id" element={<MatchPage />} />
        <Route path="matches/:id/scorecard" element={<Scorecard />} />
        <Route path="tournaments" element={<TournamentsList />} />
        <Route path="tournaments/:id" element={<TournamentDetail />} />
        <Route path="support" element={<Suggestions />} />
        <Route path="suggestions" element={<Suggestions />} />
        <Route path="users" element={<Protected adminOnly><UsersPage /></Protected>} />
        <Route path="audit" element={<Protected superOnly><Audit /></Protected>} />
        <Route path="settings" element={<Settings />} />
        <Route path="superadmin/config" element={<Protected superOnly><SuperAdminConfig /></Protected>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
