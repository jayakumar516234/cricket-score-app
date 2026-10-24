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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api.js';
import { ErrorBox } from '../components/ui.jsx';
import { APP_VERSION } from '../version.js';

export default function Settings() {
  const { user, updateUser, updateToken, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePass, setDeletePass] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');

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
      setTimeout(() => setProfileMsg(''), 4000);
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
      setTimeout(() => setPassMsg(''), 4000);
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
    <div className="mx-auto max-w-3xl space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
          <span>{t('settings.title')}</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">{t('settings.subtitle')}</p>
      </div>

      {/* 1. Profile Information */}
      <section className="card p-5 sm:p-6 space-y-5">
        <div className="flex items-start gap-3 border-b border-slate-100 pb-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <User className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900">{t('settings.profile')}</h2>
            <p className="text-xs text-slate-500">{t('settings.profileDesc')}</p>
          </div>
        </div>

        {profileMsg && (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-semibold text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{profileMsg}</span>
          </div>
        )}
        <ErrorBox message={profileError} />

        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="prof-name">{t('settings.name')}</label>
              <input
                id="prof-name"
                type="text"
                className="input"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                required
                maxLength={80}
              />
            </div>

            <div>
              <label className="label" htmlFor="prof-username">{t('settings.username')}</label>
              <input
                id="prof-username"
                type="text"
                className="input font-mono"
                value={profile.username}
                onChange={(e) => setProfile({ ...profile, username: e.target.value.toLowerCase().trim() })}
                required
                maxLength={30}
              />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="prof-phone">{t('settings.phone')}</label>
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

          <div className="flex justify-end pt-2">
            <button type="submit" className="btn btn-primary" disabled={profileBusy}>
              {profileBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              <span>{t('settings.saveProfile')}</span>
            </button>
          </div>
        </form>
      </section>

      {/* 2. Security / Change Password */}
      <section className="card p-5 sm:p-6 space-y-5">
        <div className="flex items-start gap-3 border-b border-slate-100 pb-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900">{t('settings.security')}</h2>
            <p className="text-xs text-slate-500">{t('settings.securityDesc')}</p>
          </div>
        </div>

        {passMsg && (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-semibold text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{passMsg}</span>
          </div>
        )}
        <ErrorBox message={passError} />

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label className="label" htmlFor="current-pass">{t('settings.currentPassword')}</label>
            <div className="relative">
              <input
                id="current-pass"
                type={showPass ? 'text' : 'password'}
                className="input pr-10"
                value={passForm.currentPassword}
                onChange={(e) => setPassForm({ ...passForm, currentPassword: e.target.value })}
                required
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                aria-label="Toggle password visibility"
              >
                {showPass ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="new-pass">{t('settings.newPassword')}</label>
              <input
                id="new-pass"
                type={showPass ? 'text' : 'password'}
                className="input"
                value={passForm.newPassword}
                onChange={(e) => setPassForm({ ...passForm, newPassword: e.target.value })}
                placeholder="Min 4 characters"
                required
                minLength={4}
              />
            </div>

            <div>
              <label className="label" htmlFor="confirm-pass">{t('settings.confirmPassword')}</label>
              <input
                id="confirm-pass"
                type={showPass ? 'text' : 'password'}
                className="input"
                value={passForm.confirmPassword}
                onChange={(e) => setPassForm({ ...passForm, confirmPassword: e.target.value })}
                placeholder="Re-enter new password"
                required
                minLength={4}
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button type="submit" className="btn btn-primary" disabled={passBusy}>
              {passBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
              <span>{t('settings.changePassword')}</span>
            </button>
          </div>
        </form>
      </section>

      {/* 3. App Preferences */}
      <section className="card p-5 sm:p-6 space-y-5">
        <div className="flex items-start gap-3 border-b border-slate-100 pb-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pitch-50 text-pitch-600">
            <Globe className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900">{t('settings.preferences')}</h2>
            <p className="text-xs text-slate-500">{t('settings.preferencesDesc')}</p>
          </div>
        </div>

        {/* Language Selection */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-100 bg-slate-50/70">
          <div>
            <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Globe className="h-4 w-4 text-slate-500" />
              <span>{t('settings.language')}</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Switch between English and தமிழ் (Tamil)</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => i18n.changeLanguage('en')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                i18n.language === 'en'
                  ? 'bg-pitch-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              🇬🇧 English
            </button>
            <button
              type="button"
              onClick={() => i18n.changeLanguage('ta')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                i18n.language === 'ta'
                  ? 'bg-pitch-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              🇮🇳 தமிழ்
            </button>
          </div>
        </div>

        {/* Scoring Sounds Toggle */}
        <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-100 bg-slate-50/70">
          <div>
            <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
              {soundEnabled ? <Volume2 className="h-4 w-4 text-pitch-600" /> : <VolumeX className="h-4 w-4 text-slate-400" />}
              <span>{t('settings.soundEffects')}</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{t('settings.soundEffectsDesc')}</p>
          </div>
          <button
            type="button"
            onClick={toggleSound}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              soundEnabled ? 'bg-pitch-600' : 'bg-slate-300'
            }`}
            role="switch"
            aria-checked={soundEnabled}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                soundEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </section>

      {/* 4. About & Legal Links */}
      <section className="card p-5 sm:p-6 space-y-4">
        <div className="flex items-start gap-3 border-b border-slate-100 pb-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
            <HelpCircle className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900">{t('settings.about')}</h2>
            <p className="text-xs text-slate-500">Legal policies, version details, and tournament terms</p>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-center">
            <div className="text-[11px] font-semibold text-slate-500">{t('settings.version')}</div>
            <div className="font-mono text-sm font-bold text-slate-800 mt-0.5">v{APP_VERSION}</div>
          </div>

          <Link
            to="/privacy"
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-3 text-center text-xs font-bold text-slate-700 hover:border-blue-400 hover:bg-blue-50/50 transition shadow-2xs"
          >
            <Shield className="h-4 w-4 text-blue-600" />
            <span>{t('settings.privacyPolicy')}</span>
          </Link>

          <Link
            to="/terms"
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-3 text-center text-xs font-bold text-slate-700 hover:border-blue-400 hover:bg-blue-50/50 transition shadow-2xs"
          >
            <FileText className="h-4 w-4 text-blue-600" />
            <span>{t('settings.terms')}</span>
          </Link>
        </div>
      </section>

      {/* Support & Feedback */}
      <section className="card p-5 sm:p-6 space-y-4">
        <div className="flex items-start gap-3 border-b border-slate-100 pb-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900">Support & Feedback</h2>
            <p className="text-xs text-slate-500">Need help or want to suggest a new tournament feature?</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            to="/support"
            className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5 hover:border-blue-400 hover:bg-blue-50/40 transition shadow-2xs"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900">Feedback & Help Desk</div>
              <div className="text-xs text-slate-500">Submit requests and track replies</div>
            </div>
          </Link>

          <a
            href="https://api.whatsapp.com/send?text=Hello%20Cricket%20Score%20Support,%20I%20need%20help%20with%20my%20app"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 hover:border-emerald-400 hover:bg-emerald-50 transition shadow-2xs"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-emerald-950">Chat on WhatsApp</div>
              <div className="text-xs text-emerald-700">Get quick support from administrators</div>
            </div>
          </a>
        </div>
      </section>

      {/* 5. Danger Zone (Delete Account) */}
      {user?.role !== 'superadmin' && (
        <section className="card border-red-200 bg-red-50/20 p-5 sm:p-6 space-y-4">
          <div className="flex items-start gap-3 border-b border-red-100 pb-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-red-950">{t('settings.dangerZone')}</h2>
              <p className="text-xs text-red-600">{t('settings.deleteAccountDesc')}</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div>
              <div className="text-sm font-bold text-slate-900">{t('settings.deleteAccount')}</div>
              <p className="text-xs text-slate-500">Once deleted, your account and profile data cannot be recovered.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="btn btn-danger text-xs !py-2 shrink-0"
            >
              {t('settings.deleteAccount')}
            </button>
          </div>
        </section>
      )}

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center gap-3 text-red-600">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">{t('settings.deleteAccount')}</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete your account (<strong>{user?.username}</strong>)?
              All your login credentials and personal session data will be permanently removed.
            </p>

            <ErrorBox message={deleteError} />

            <form onSubmit={handleDeleteAccount} className="space-y-4 pt-1">
              <div>
                <label className="label" htmlFor="delete-pass">{t('settings.deleteAccountConfirm')}</label>
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

              <div className="flex items-center justify-end gap-2 pt-2">
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
