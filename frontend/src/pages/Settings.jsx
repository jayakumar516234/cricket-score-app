import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  Globe,
  Volume2,
  VolumeX,
  ShieldAlert,
  Save,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  FileText,
  Shield,
  HelpCircle,
  MessageSquare,
  MessageCircle,
  Pencil,
  ChevronRight,
  KeyRound,
  Check,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api.js';
import { ErrorBox, Modal } from '../components/ui.jsx';
import { APP_VERSION } from '../version.js';

export default function Settings() {
  const { user, updateUser, updateToken, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  // Modal Open States (Popups eliminate long scrolling!)
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [passModalOpen, setPassModalOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Profile Form State
  const [profile, setProfile] = useState({
    name: user?.name || '',
    username: user?.username || '',
    phone: user?.phone || '',
  });
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [profileError, setProfileError] = useState('');

  // Password Form State
  const [passForm, setPassForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPass, setShowPass] = useState(false);
  const [passBusy, setPassBusy] = useState(false);
  const [passMsg, setPassMsg] = useState('');
  const [passError, setPassError] = useState('');

  // Preferences State
  const [soundEnabled, setSoundEnabled] = useState(
    localStorage.getItem('cricket_sound_effects') !== 'false'
  );

  // Danger Zone / Delete Account State
  const [deletePass, setDeletePass] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const userInitials = (user?.name || '?')
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const roleLabel =
    user?.role === 'superadmin'
      ? 'SUPER ADMIN'
      : user?.role === 'admin'
      ? 'TEAM ADMIN'
      : (user?.role || 'USER').toUpperCase();

  // Handle Profile Update
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileMsg('');
    setProfileError('');
    if (!profile.name.trim() || profile.name.trim().length < 2) {
      return setProfileError('Name must be at least 2 characters');
    }
    setProfileBusy(true);
    try {
      const res = await api('/auth/profile', {
        method: 'PUT',
        body: {
          name: profile.name.trim(),
          username: profile.username.trim(),
          phone: profile.phone.trim(),
        },
      });
      updateUser(res.user);
      setProfileMsg('Profile updated successfully!');
      setTimeout(() => {
        setProfileMsg('');
        setProfileModalOpen(false);
      }, 1500);
    } catch (err) {
      setProfileError(err.message || 'Failed to update profile');
    } finally {
      setProfileBusy(false);
    }
  };

  // Handle Password Update
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPassMsg('');
    setPassError('');
    if (!passForm.currentPassword) {
      return setPassError('Please enter your current password');
    }
    if (passForm.newPassword.length < 4) {
      return setPassError('New password must be at least 4 characters');
    }
    if (passForm.newPassword !== passForm.confirmPassword) {
      return setPassError('New passwords do not match');
    }
    setPassBusy(true);
    try {
      const res = await api('/auth/password', {
        method: 'PUT',
        body: {
          currentPassword: passForm.currentPassword,
          newPassword: passForm.newPassword,
        },
      });
      if (res.token) updateToken(res.token);
      setPassMsg('Password changed successfully!');
      setPassForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => {
        setPassMsg('');
        setPassModalOpen(false);
      }, 1500);
    } catch (err) {
      setPassError(err.message || 'Failed to change password');
    } finally {
      setPassBusy(false);
    }
  };

  // Toggle Sound Effects
  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem('cricket_sound_effects', String(next));
  };

  // Handle Account Deletion
  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    setDeleteError('');
    if (!deletePass) return setDeleteError('Password is required');
    setDeleteBusy(true);
    try {
      await api('/auth/account', {
        method: 'DELETE',
        body: { password: deletePass },
      });
      logout();
      navigate('/login');
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete account');
      setDeleteBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-3.5 pb-8">
      {/* ─── Compact Header ─── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
            {t('settings.title')}
          </h1>
          <p className="text-[11px] sm:text-xs text-slate-500">
            Account, security, language and preferences
          </p>
        </div>
        <span className="rounded-lg bg-slate-200/70 px-2 py-0.5 text-[10px] font-bold text-slate-600">
          v{APP_VERSION}
        </span>
      </div>

      {/* ─── User Profile Card with Quick Edit Button ─── */}
      <section className="card p-3.5 sm:p-4 bg-gradient-to-br from-navy-950 via-navy-900 to-navy-850 text-white shadow-md border border-navy-800 relative overflow-hidden">
        <div className="pointer-events-none absolute -right-6 -bottom-6 h-24 w-24 rounded-full bg-pitch-500/15 blur-xl" />

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-pitch-600 to-emerald-400 font-black text-navy-950 text-base sm:text-lg shadow-glow-pitch">
              {userInitials}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-white truncate leading-tight">
                  {user?.name}
                </h2>
                <span className="badge bg-pitch-500/25 text-pitch-300 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider py-0.2 px-1.5 border border-pitch-500/30">
                  {roleLabel}
                </span>
              </div>
              <p className="text-xs text-slate-300 font-mono mt-0.5 truncate">
                @{user?.username} {user?.phone ? `· ${user.phone}` : ''}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setProfileError('');
              setProfileMsg('');
              setProfileModalOpen(true);
            }}
            className="btn btn-outline bg-white/10 text-white border-white/20 hover:bg-white/20 text-xs !py-1.5 !px-3 shrink-0 shadow-2xs font-semibold"
          >
            <Pencil className="h-3.5 w-3.5 mr-1 text-pitch-400" />
            <span>Edit Profile</span>
          </button>
        </div>
      </section>

      {/* ─── Security & Credentials (Popup-driven: No Long Scroll) ─── */}
      <section className="card p-3.5 sm:p-4 space-y-3 border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-slate-100">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Lock className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-slate-900 text-xs sm:text-sm">
                Password & Security
              </h3>
              <p className="text-[11px] text-slate-500 truncate">
                Manage your secret password and login credentials
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setPassError('');
              setPassMsg('');
              setPassForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
              setPassModalOpen(true);
            }}
            className="btn btn-primary text-xs !py-1.5 !px-3 shrink-0 font-bold shadow-2xs"
          >
            <KeyRound className="h-3.5 w-3.5 mr-1" />
            <span>Change Password</span>
          </button>
        </div>

        {/* ─── Language & Preferences (Clean In-line Rows) ─── */}
        <div className="divide-y divide-slate-100 space-y-2">
          {/* Language Toggle */}
          <div className="pt-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-slate-500" />
              <div>
                <span className="text-xs sm:text-sm font-bold text-slate-800 block leading-tight">
                  {t('settings.language')}
                </span>
                <span className="text-[10px] text-slate-400">English / தமிழ்</span>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => i18n.changeLanguage('en')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  i18n.language === 'en'
                    ? 'bg-pitch-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                🇬🇧 EN
              </button>
              <button
                type="button"
                onClick={() => i18n.changeLanguage('ta')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  i18n.language === 'ta'
                    ? 'bg-pitch-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                🇮🇳 தமிழ்
              </button>
            </div>
          </div>

          {/* Sound Effects Toggle */}
          <div className="pt-2.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {soundEnabled ? (
                <Volume2 className="h-4 w-4 text-pitch-600" />
              ) : (
                <VolumeX className="h-4 w-4 text-slate-400" />
              )}
              <div>
                <span className="text-xs sm:text-sm font-bold text-slate-800 block leading-tight">
                  {t('settings.soundEffects')}
                </span>
                <span className="text-[10px] text-slate-400">Audio on runs, fours and sixes</span>
              </div>
            </div>
            <button
              type="button"
              onClick={toggleSound}
              className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                soundEnabled ? 'bg-pitch-600' : 'bg-slate-300'
              }`}
              role="switch"
              aria-checked={soundEnabled}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  soundEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </section>

      {/* ─── Support & Legal Hub (Compact 2-Col Grid) ─── */}
      <section className="card p-3 sm:p-3.5 space-y-2 border border-slate-200/80 shadow-xs">
        <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
          Support & Legal
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Link
            to="/support"
            className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition shadow-2xs"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <MessageSquare className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-slate-800 block truncate">Help Desk</span>
              <span className="text-[10px] text-slate-400 block truncate">Submit requests</span>
            </div>
          </Link>

          <a
            href="https://api.whatsapp.com/send?text=Hello%20Cricket%20Score%20Support,%20I%20need%20help%20with%20my%20app"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50 transition shadow-2xs"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <MessageCircle className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-emerald-950 block truncate">WhatsApp</span>
              <span className="text-[10px] text-emerald-700 block truncate">Chat with admin</span>
            </div>
          </a>

          <Link
            to="/privacy"
            className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition shadow-2xs"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
              <Shield className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-slate-800 block truncate">Privacy Policy</span>
              <span className="text-[10px] text-slate-400 block truncate">Data safety</span>
            </div>
          </Link>

          <Link
            to="/terms"
            className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition shadow-2xs"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
              <FileText className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-slate-800 block truncate">Terms</span>
              <span className="text-[10px] text-slate-400 block truncate">Usage rules</span>
            </div>
          </Link>
        </div>
      </section>

      {/* ─── Danger Zone (Compact Footer Link) ─── */}
      {user?.role !== 'superadmin' && (
        <div className="pt-1 flex items-center justify-between px-2 text-xs">
          <span className="text-slate-400 text-[11px]">Need to close your account?</span>
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="text-red-600 hover:text-red-700 font-semibold underline text-xs"
          >
            Delete Account
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ─── POPUP 1: Change Password Modal ─── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <Modal
        open={passModalOpen}
        onClose={() => setPassModalOpen(false)}
        title={t('settings.changePassword')}
      >
        <form onSubmit={handlePasswordSubmit} className="space-y-3.5">
          {passMsg && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-2.5 text-xs font-semibold text-emerald-800">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{passMsg}</span>
            </div>
          )}
          <ErrorBox message={passError} />

          <div>
            <label className="label" htmlFor="current-pass">
              {t('settings.currentPassword')}
            </label>
            <div className="relative">
              <input
                id="current-pass"
                type={showPass ? 'text' : 'password'}
                className="input pr-10"
                value={passForm.currentPassword}
                onChange={(e) =>
                  setPassForm({ ...passForm, currentPassword: e.target.value })
                }
                required
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                aria-label="Toggle password visibility"
              >
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="new-pass">
                {t('settings.newPassword')}
              </label>
              <input
                id="new-pass"
                type={showPass ? 'text' : 'password'}
                className="input"
                value={passForm.newPassword}
                onChange={(e) =>
                  setPassForm({ ...passForm, newPassword: e.target.value })
                }
                placeholder="Min 4 characters"
                required
                minLength={4}
              />
            </div>

            <div>
              <label className="label" htmlFor="confirm-pass">
                {t('settings.confirmPassword')}
              </label>
              <input
                id="confirm-pass"
                type={showPass ? 'text' : 'password'}
                className="input"
                value={passForm.confirmPassword}
                onChange={(e) =>
                  setPassForm({ ...passForm, confirmPassword: e.target.value })
                }
                placeholder="Re-enter password"
                required
                minLength={4}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              className="btn btn-outline text-xs !py-2"
              onClick={() => setPassModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary text-xs !py-2"
              disabled={passBusy}
            >
              {passBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Lock className="h-3.5 w-3.5" />}
              <span>{t('settings.changePassword')}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ─── POPUP 2: Edit Profile Modal ─── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <Modal
        open={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        title="Edit Profile"
      >
        <form onSubmit={handleProfileSubmit} className="space-y-3.5">
          {profileMsg && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-2.5 text-xs font-semibold text-emerald-800">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{profileMsg}</span>
            </div>
          )}
          <ErrorBox message={profileError} />

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="prof-name">
                {t('settings.name')}
              </label>
              <input
                id="prof-name"
                type="text"
                className="input"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                required
                maxLength={80}
                autoFocus
              />
            </div>

            <div>
              <label className="label" htmlFor="prof-username">
                {t('settings.username')}
              </label>
              <input
                id="prof-username"
                type="text"
                className="input font-mono"
                value={profile.username}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    username: e.target.value.toLowerCase().trim(),
                  })
                }
                required
                maxLength={30}
              />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="prof-phone">
              {t('settings.phone')}
            </label>
            <input
              id="prof-phone"
              type="tel"
              className="input font-mono"
              value={profile.phone}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              placeholder="e.g. 9876543210"
              maxLength={15}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              className="btn btn-outline text-xs !py-2"
              onClick={() => setProfileModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary text-xs !py-2"
              disabled={profileBusy}
            >
              {profileBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              <span>Save Profile</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ─── POPUP 3: Delete Account Confirmation Modal ─── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl space-y-3.5 border border-slate-200">
            <div className="flex items-center gap-2.5 text-red-600">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-100">
                <AlertTriangle className="h-4.5 w-4.5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                {t('settings.deleteAccount')}
              </h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete your account (<strong>{user?.username}</strong>)?
              All your credentials will be removed.
            </p>

            <ErrorBox message={deleteError} />

            <form onSubmit={handleDeleteAccount} className="space-y-3 pt-1">
              <div>
                <label className="label" htmlFor="delete-pass">
                  {t('settings.deleteAccountConfirm')}
                </label>
                <input
                  id="delete-pass"
                  type="password"
                  className="input"
                  value={deletePass}
                  onChange={(e) => setDeletePass(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeletePass('');
                    setDeleteError('');
                  }}
                  className="btn btn-outline text-xs !py-2"
                  disabled={deleteBusy}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-danger text-xs !py-2"
                  disabled={deleteBusy}
                >
                  {deleteBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>{t('settings.confirmDeleteBtn')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
