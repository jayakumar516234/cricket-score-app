import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import { Spinner } from './components/ui.jsx';
import Login from './pages/Login.jsx';
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

function Protected({ children, superOnly, adminOnly, noViewer }) {
  const { user, loading, isSuper, isAdmin, isViewer } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (superOnly && !isSuper) return <Navigate to="/" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />;
  if (noViewer && isViewer) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/super-login" element={user ? <Navigate to="/" replace /> : <SuperLogin />} />
      <Route path="/register" element={<Navigate to="/login" replace />} />
      <Route path="/signup" element={<Navigate to="/login" replace />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsAndConditions />} />
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
        {/* <Route path="suggestions" element={<Suggestions />} /> */}
        <Route path="users" element={<Protected adminOnly><UsersPage /></Protected>} />
        <Route path="audit" element={<Protected superOnly><Audit /></Protected>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
