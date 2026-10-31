import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, Lock, Eye, Trash2, Mail, Database, Globe, Smartphone } from 'lucide-react';

const Section = ({ title, icon: Icon, children }) => (
  <div className="space-y-3">
    <div className="flex items-center gap-2">
      {Icon && <Icon className="h-4 w-4 text-pitch-500 flex-shrink-0" />}
      <h2 className="text-base font-bold text-slate-900">{title}</h2>
    </div>
    <div className="text-sm text-slate-600 space-y-2 pl-6">{children}</div>
  </div>
);

const InfoCard = ({ label, value }) => (
  <div className="flex gap-2 bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
    <span className="text-slate-500 text-xs w-28 flex-shrink-0 mt-0.5">{label}</span>
    <span className="text-slate-800 text-xs font-medium">{value}</span>
  </div>
);

export default function PrivacyPolicy() {
  const updated = 'October 31, 2026';
  const effectiveDate = 'November 1, 2026';

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
              <p className="text-xs text-slate-400 mt-0.5">Last updated: {updated} · Effective: {effectiveDate}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">

        {/* Quick Summary Card */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
          <p className="text-xs font-semibold text-emerald-800 mb-2">🔒 Quick Summary</p>
          <ul className="text-xs text-emerald-700 space-y-1">
            <li>✅ We collect only what is needed to run the app</li>
            <li>✅ We never sell or share your data with advertisers</li>
            <li>✅ Your password is always encrypted — never stored as plain text</li>
            <li>✅ You can request account deletion at any time</li>
            <li>✅ No payment data is ever collected</li>
          </ul>
        </div>

        <div className="card p-5 sm:p-6 space-y-6">

          <p className="text-sm text-slate-600">
            Welcome to <strong>Cricket Score App</strong> ("we", "our", "us"). This Privacy Policy explains
            how we collect, use, store, and protect your personal information when you use our application.
            By registering or using this app, you agree to the practices described in this policy.
          </p>

          {/* App Info */}
          <div className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">App Information</h2>
            <div className="space-y-2">
              <InfoCard label="App Name" value="Cricket Score App" />
              <InfoCard label="Purpose" value="Live ball-by-ball cricket scoring, team & tournament management for grassroots cricket" />
              <InfoCard label="Developer" value="Jayakumar (jayakumar516234)" />
              <InfoCard label="Country" value="India" />
              <InfoCard label="Contact" value="Available via in-app Support / Feedback" />
            </div>
          </div>

          <Section title="1. Information We Collect" icon={Database}>
            <p>We collect the following information when you register or use our app:</p>
            <div className="space-y-2">
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-1.5">
                <p className="font-semibold text-slate-700 text-xs uppercase tracking-wide">Personal Info</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li><strong>Full Name</strong> — to identify your account and display on scoreboards</li>
                  <li><strong>Username</strong> — your unique login identifier</li>
                  <li><strong>Phone Number</strong> — used for login and account management only</li>
                  <li><strong>Password</strong> — stored as a secure bcrypt hash (never plain text)</li>
                </ul>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-1.5">
                <p className="font-semibold text-slate-700 text-xs uppercase tracking-wide">Cricket Data (User-Created)</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Team names, logos, and player names you create</li>
                  <li>Match scores, ball-by-ball entries, and tournament brackets</li>
                  <li>Ground/venue names and match schedules</li>
                </ul>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-1.5">
                <p className="font-semibold text-slate-700 text-xs uppercase tracking-wide">Automatically Collected</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Login timestamps and session activity (for security)</li>
                  <li>Device type (mobile/desktop) via browser — not stored permanently</li>
                  <li>Support tickets and feedback messages you submit</li>
                </ul>
              </div>
            </div>
            <p className="text-xs text-slate-500 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              ⚠️ We do <strong>not</strong> collect payment information, location data, camera access, microphone,
              contacts, or any sensitive device permissions.
            </p>
          </Section>

          <Section title="2. How We Use Your Information" icon={Eye}>
            <p>Your information is used <strong>only</strong> to:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Authenticate you and manage your account securely</li>
              <li>Store and display your cricket teams, players, and match scores</li>
              <li>Allow team admins and scorers to record and view live match data</li>
              <li>Show tournament brackets and live scoreboards to authorised users</li>
              <li>Respond to your support requests and feedback</li>
              <li>Detect and prevent abuse or unauthorised access</li>
              <li>Improve app functionality and fix technical issues</li>
            </ul>
            <p className="font-semibold text-slate-700">
              We do <strong className="text-red-600">not</strong> sell, rent, or share your personal data
              with third parties for advertising, marketing, or commercial purposes — ever.
            </p>
          </Section>

          <Section title="3. Data Storage & Security" icon={Lock}>
            <ul className="list-disc pl-4 space-y-1">
              <li>Your data is stored in a <strong>MongoDB database</strong> hosted on <strong>Render</strong> (cloud infrastructure)</li>
              <li>The frontend app is hosted on <strong>Vercel</strong> (static CDN hosting)</li>
              <li>Passwords are hashed using <strong>bcrypt</strong> — never stored as plain text</li>
              <li>Authentication uses <strong>JSON Web Tokens (JWT)</strong> stored in your browser's localStorage</li>
              <li>All data transfers occur over <strong>HTTPS</strong> (TLS-encrypted connection)</li>
              <li>Server infrastructure is secured and not publicly accessible</li>
            </ul>
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-1.5">
              <p className="font-semibold text-slate-700 text-xs uppercase tracking-wide">Third-Party Services Used</p>
              <ul className="list-disc pl-4 space-y-1">
                <li><strong>Render.com</strong> — Backend hosting (Node.js / Express API)</li>
                <li><strong>Vercel.com</strong> — Frontend hosting (React PWA)</li>
                <li><strong>MongoDB Atlas</strong> — Database storage</li>
                <li><strong>Google Play Store</strong> — App distribution (Android)</li>
              </ul>
              <p className="text-xs text-slate-500">Each of these services has their own privacy policies and security standards.</p>
            </div>
          </Section>

          <Section title="4. Phone Number Policy" icon={Smartphone}>
            <p>
              Your phone number is used <strong>only</strong> as your login credential. It is:
            </p>
            <ul className="list-disc pl-4 space-y-1">
              <li><strong>Never visible</strong> to other regular users of the app</li>
              <li><strong>Never shared</strong> with third parties</li>
              <li>Only accessible by <strong>Super Admins</strong> for account management purposes</li>
              <li>Not used for SMS marketing or promotional messages</li>
            </ul>
          </Section>

          <Section title="5. Cookies & Local Storage" icon={Globe}>
            <p>
              We use <strong>browser localStorage</strong> (not cookies) to store:
            </p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Your login session token (JWT) — to keep you logged in</li>
              <li>Cached app data — to speed up loading and enable offline access</li>
              <li>Your preferred settings (e.g. UI preferences)</li>
            </ul>
            <p>
              <strong>No third-party cookies, tracking pixels, or advertising SDKs</strong> are used in this app.
              No cross-site tracking occurs.
            </p>
          </Section>

          <Section title="6. Data Retention">
            <ul className="list-disc pl-4 space-y-1">
              <li>Your account data is retained as long as your account is active</li>
              <li>If your account is deleted by an administrator, all associated data may be removed</li>
              <li>Deleted match data and scores cannot be recovered once removed</li>
              <li>Support tickets may be retained for up to 90 days for quality review</li>
            </ul>
          </Section>

          <Section title="7. Your Rights">
            <p>As a user, you have the right to:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li><strong>Access</strong> — View the personal data stored about you</li>
              <li><strong>Correction</strong> — Request correction of inaccurate personal data</li>
              <li><strong>Deletion</strong> — Request deletion of your account and all associated data</li>
              <li><strong>Portability</strong> — Request an export of your cricket data</li>
              <li><strong>Objection</strong> — Object to any use of your data beyond what is described here</li>
            </ul>
            <p>
              To exercise any of these rights, please submit a request through the
              <strong> Support / Feedback</strong> section within the app, or contact the app administrator directly.
              We will respond within <strong>7 business days</strong>.
            </p>
          </Section>

          <Section title="8. Children's Privacy">
            <p>
              This app is not intended for children under the age of <strong>13</strong>. We do not knowingly
              collect personal information from children. If you believe a child under 13 has registered,
              please contact us immediately and we will delete their account.
            </p>
          </Section>

          <Section title="9. Changes to This Policy">
            <p>
              We may update this Privacy Policy from time to time. When we make significant changes,
              we will update the "Last updated" date at the top of this page. Your continued use of the
              app after changes constitutes your acceptance of the updated policy.
            </p>
          </Section>

          <Section title="10. Contact Us" icon={Mail}>
            <p>
              If you have any questions, concerns, or requests regarding this Privacy Policy or your
              personal data, please reach out through:
            </p>
            <ul className="list-disc pl-4 space-y-1">
              <li><strong>In-app</strong>: Go to <em>Support / Feedback</em> in the app menu</li>
              <li><strong>GitHub</strong>: <a href="https://github.com/jayakumar516234" className="text-pitch-600 underline" target="_blank" rel="noopener noreferrer">github.com/jayakumar516234</a></li>
            </ul>
            <p className="text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
              For data deletion requests, please use the subject: <strong>"Data Deletion Request – Cricket Score App"</strong>
            </p>
          </Section>

        </div>

        <div className="text-center text-xs text-slate-400 pb-4 space-y-1">
          <div>Cricket Score App · Effective {effectiveDate}</div>
          <div>
            <Link to="/terms" className="underline hover:text-slate-600">Terms &amp; Conditions</Link>
            {' · '}
            <Link to="/login" className="underline hover:text-slate-600">Back to Login</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
