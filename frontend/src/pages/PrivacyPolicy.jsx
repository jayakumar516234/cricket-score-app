import { Link } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';

const Section = ({ title, children }) => (
  <div className="space-y-2">
    <h2 className="text-base font-bold text-slate-900">{title}</h2>
    <div className="text-sm text-slate-600 space-y-2">{children}</div>
  </div>
);

export default function PrivacyPolicy() {
  const updated = 'October 21, 2026';
  return (
    <div className="min-h-full bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 text-white px-4 py-8">
        <div className="mx-auto max-w-2xl">
          <Link to="/login" className="inline-flex items-center gap-1.5 text-slate-300 hover:text-white text-sm mb-4 transition">
            <ArrowLeft className="h-4 w-4" /> Back to Login
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pitch-500/20 border border-pitch-500/30">
              <Shield className="h-5 w-5 text-pitch-400" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">Privacy Policy</h1>
              <p className="text-xs text-slate-400 mt-0.5">Last updated: {updated}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
        <div className="card p-5 sm:p-6 space-y-6">

          <p className="text-sm text-slate-600">
            Welcome to <strong>Cricket Score App</strong>. This Privacy Policy explains how we collect, use, and protect your personal information when you use our application. By using this app, you agree to the terms described below.
          </p>

          <Section title="1. Information We Collect">
            <p>We collect the following information when you register or use our app:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Name</strong> — to identify your account</li>
              <li><strong>Username</strong> — your unique login identifier</li>
              <li><strong>Phone number</strong> — used for login and account recovery</li>
              <li><strong>Password</strong> — stored securely as an encrypted hash (never stored in plain text)</li>
              <li><strong>Cricket data</strong> — teams, player names, match scores you enter</li>
            </ul>
          </Section>

          <Section title="2. How We Use Your Information">
            <p>Your information is used solely to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Authenticate you and manage your account</li>
              <li>Store and display your cricket teams, players, and match scores</li>
              <li>Allow other users to view team and match information you've created</li>
              <li>Improve app functionality and fix issues</li>
            </ul>
            <p>We <strong>do not</strong> sell, rent, or share your personal data with third parties for marketing purposes.</p>
          </Section>

          <Section title="3. Data Storage & Security">
            <ul className="list-disc pl-5 space-y-1">
              <li>Your data is stored securely in a MongoDB database hosted on a private cloud server</li>
              <li>Passwords are encrypted using <strong>bcrypt</strong> hashing — never stored as plain text</li>
              <li>Authentication is managed using <strong>JSON Web Tokens (JWT)</strong></li>
              <li>All data is transmitted over <strong>HTTPS</strong> (encrypted connection)</li>
            </ul>
          </Section>

          <Section title="4. Phone Numbers">
            <p>
              Your phone number is used only for login purposes. It is <strong>never visible to other users</strong> of the app. Only Super Admins can view phone numbers for account management purposes.
            </p>
          </Section>

          <Section title="5. Cookies & Local Storage">
            <p>
              We use <strong>browser localStorage</strong> to store your login session token and your preferred language setting. No third-party cookies or tracking technologies are used.
            </p>
          </Section>

          <Section title="6. Data Retention">
            <p>
              Your data is retained as long as your account is active. If your account is deleted by an administrator, all associated data (teams, players, match scores) may also be removed.
            </p>
          </Section>

          <Section title="7. Children's Privacy">
            <p>
              This app is not intended for children under the age of 13. We do not knowingly collect personal information from children. If you believe a child has provided us with their data, please contact us immediately.
            </p>
          </Section>

          <Section title="8. Your Rights">
            <p>You have the right to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your account and associated data</li>
            </ul>
            <p>To exercise these rights, contact your team administrator or the app owner.</p>
          </Section>

          <Section title="9. Changes to This Policy">
            <p>
              We may update this Privacy Policy from time to time. Changes will be reflected with an updated date at the top of this page. Continued use of the app after changes constitutes your acceptance of the new policy.
            </p>
          </Section>

          <Section title="10. Contact">
            <p>
              If you have any questions about this Privacy Policy, please contact the app administrator or reach out through the platform you downloaded this app from.
            </p>
          </Section>
        </div>

        <div className="text-center text-xs text-slate-400 pb-4">
          Cricket Score App · <Link to="/terms" className="underline hover:text-slate-600">Terms &amp; Conditions</Link>
        </div>
      </div>
    </div>
  );
}
