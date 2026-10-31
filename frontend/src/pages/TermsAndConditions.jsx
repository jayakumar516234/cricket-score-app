import { Link } from 'react-router-dom';
import { ArrowLeft, FileText, Users, ShieldCheck, AlertTriangle, Scale, Mail } from 'lucide-react';

const Section = ({ title, icon: Icon, children }) => (
  <div className="space-y-3">
    <div className="flex items-center gap-2">
      {Icon && <Icon className="h-4 w-4 text-pitch-500 flex-shrink-0" />}
      <h2 className="text-base font-bold text-slate-900">{title}</h2>
    </div>
    <div className="text-sm text-slate-600 space-y-2 pl-6">{children}</div>
  </div>
);

export default function TermsAndConditions() {
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
              <FileText className="h-5 w-5 text-pitch-400" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">Terms &amp; Conditions</h1>
              <p className="text-xs text-slate-400 mt-0.5">Last updated: {updated} · Effective: {effectiveDate}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">

        {/* Agreement Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <p className="text-xs font-semibold text-blue-800 mb-1">📋 Agreement</p>
          <p className="text-xs text-blue-700">
            By downloading, installing, or using Cricket Score App, you agree to these Terms & Conditions.
            Please read them carefully before using the app. If you do not agree, please uninstall and
            discontinue use of the app.
          </p>
        </div>

        <div className="card p-5 sm:p-6 space-y-6">

          <Section title="1. About the App" icon={FileText}>
            <p>
              <strong>Cricket Score App</strong> is a mobile and web application designed for managing
              cricket teams, scheduling matches, recording live ball-by-ball scores, and running
              tournaments for grassroots, village, and amateur cricket leagues across India.
            </p>
            <ul className="list-disc pl-4 space-y-1">
              <li><strong>Developer:</strong> Jayakumar (jayakumar516234)</li>
              <li><strong>Platform:</strong> Progressive Web App (PWA) + Android (Play Store)</li>
              <li><strong>Purpose:</strong> Non-commercial cricket scoring and team management</li>
              <li><strong>Target Users:</strong> Cricket club admins, tournament organizers, scorers, players, and viewers</li>
            </ul>
          </Section>

          <Section title="2. Eligibility" icon={Users}>
            <ul className="list-disc pl-4 space-y-1">
              <li>You must be at least <strong>13 years old</strong> to use this app</li>
              <li>By registering, you confirm all information you provide is accurate and truthful</li>
              <li>Each person may only maintain <strong>one account</strong> unless authorised by an administrator</li>
              <li>Accounts created on behalf of an organisation must have authorisation from that organisation</li>
              <li>This app is intended for use within <strong>India</strong></li>
            </ul>
          </Section>

          <Section title="3. Account Responsibilities" icon={ShieldCheck}>
            <ul className="list-disc pl-4 space-y-1">
              <li>You are responsible for keeping your login credentials (username/phone + password) confidential</li>
              <li>You must not share your account with others or allow unauthorised access</li>
              <li>You are responsible for all activity that occurs under your account</li>
              <li>If you suspect your account has been compromised, notify your administrator immediately</li>
              <li>Logging in from a new device will automatically end your previous session for security</li>
            </ul>
          </Section>

          <Section title="4. User Roles & Permissions">
            <p>Cricket Score App operates with the following user roles:</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border border-slate-200 rounded-xl overflow-hidden">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="text-left p-2 font-semibold text-slate-700">Role</th>
                    <th className="text-left p-2 font-semibold text-slate-700">Key Permissions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr><td className="p-2 font-medium">Super Admin</td><td className="p-2">Full control — users, teams, matches, tournaments, settings</td></tr>
                  <tr><td className="p-2 font-medium">Admin</td><td className="p-2">Manage teams, matches, tournaments within their scope</td></tr>
                  <tr><td className="p-2 font-medium">Team Admin</td><td className="p-2">Manage own team, create and manage matches</td></tr>
                  <tr><td className="p-2 font-medium">Scorer</td><td className="p-2">Record ball-by-ball scores for assigned matches</td></tr>
                  <tr><td className="p-2 font-medium">User</td><td className="p-2">Create/manage one team, view matches and scores</td></tr>
                  <tr><td className="p-2 font-medium">Viewer</td><td className="p-2">View live scores and match summaries only (read-only)</td></tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500">
              Role assignments are managed by Super Admins and Admins. Requesting a role upgrade
              can be done via the Support / Feedback section.
            </p>
          </Section>

          <Section title="5. Acceptable Use" icon={AlertTriangle}>
            <p>You agree <strong>not</strong> to:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Use the app for any unlawful, fraudulent, or malicious purpose</li>
              <li>Enter false, misleading, offensive, or defamatory player or team information</li>
              <li>Attempt to access other users' accounts, data, or private information without permission</li>
              <li>Reverse-engineer, decompile, copy, or exploit any part of the application</li>
              <li>Use automated scripts, bots, or scrapers to interact with the app</li>
              <li>Deliberately disrupt, overload, or attack the app's servers or infrastructure</li>
              <li>Impersonate another person, team, or organisation within the app</li>
              <li>Upload or enter content that is illegal, hateful, or violates any applicable laws</li>
            </ul>
            <p>
              Violation of these rules may result in immediate account suspension or permanent ban
              without prior notice.
            </p>
          </Section>

          <Section title="6. Team & Match Data">
            <ul className="list-disc pl-4 space-y-1">
              <li>You retain ownership of the cricket data you create (teams, players, scores)</li>
              <li>By entering data, you grant us a licence to store and display it within the app</li>
              <li>Team names and match results may be visible to other registered users</li>
              <li>Phone numbers and personal contact details are <strong>never</strong> shown to regular users</li>
              <li>Live scoreboards may be visible to viewers without a login (public matches)</li>
              <li>You are responsible for ensuring player names are entered with their consent</li>
            </ul>
          </Section>

          <Section title="7. Tournaments">
            <ul className="list-disc pl-4 space-y-1">
              <li>Tournaments can be created by Admins and Super Admins</li>
              <li>Tournament brackets are auto-generated based on the number of participating teams</li>
              <li>Tournament data (results, brackets, schedules) is visible to all registered users</li>
              <li>Admins can password-protect tournaments for restricted access</li>
              <li>Tournament results are final once submitted by the scorer and approved by the admin</li>
            </ul>
          </Section>

          <Section title="8. Administrator Rights">
            <p>Super Admins and Admins have the right to:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Create, edit, or delete any team, match, player, or user account</li>
              <li>Disable or permanently remove accounts that violate these Terms</li>
              <li>Access audit logs of all actions taken within the app</li>
              <li>Adjust user roles and team limits at their discretion</li>
              <li>Manage and respond to support tickets submitted by users</li>
            </ul>
          </Section>

          <Section title="9. Payments & Fees">
            <p>
              Cricket Score App is currently provided <strong>free of charge</strong>. There are no subscription
              fees, in-app purchases, or premium plans. We do not collect any payment information.
            </p>
            <p>
              We reserve the right to introduce optional paid features in the future. Any such changes will
              be communicated in advance through the app.
            </p>
          </Section>

          <Section title="10. Service Availability">
            <p>
              We strive to keep Cricket Score App available at all times. However, we do not guarantee
              uninterrupted access. We reserve the right to:
            </p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Perform scheduled or emergency maintenance without prior notice</li>
              <li>Update, modify, or discontinue any feature at any time</li>
              <li>Take the service temporarily offline for technical reasons</li>
            </ul>
            <p>
              We are not liable for any loss (including match data loss) caused by downtime,
              server errors, or technical failures.
            </p>
          </Section>

          <Section title="11. Intellectual Property">
            <p>
              All code, design, branding, and content of Cricket Score App are owned by the developer.
            </p>
            <ul className="list-disc pl-4 space-y-1">
              <li>You may not copy, redistribute, or resell any part of this application</li>
              <li>The app name "Cricket Score App" and its logo may not be used without permission</li>
              <li>User-generated cricket data (teams, scores) belongs to the respective user/organisation</li>
            </ul>
          </Section>

          <Section title="12. Limitation of Liability" icon={Scale}>
            <p>
              Cricket Score App is provided <strong>"as is"</strong> without warranties of any kind,
              express or implied. To the fullest extent permitted by Indian law:
            </p>
            <ul className="list-disc pl-4 space-y-1">
              <li>We are not responsible for any loss of cricket data, missed match recordings, or score errors</li>
              <li>We are not liable for indirect, incidental, or consequential damages arising from app use</li>
              <li>We make no warranty that the app will be error-free, secure, or always available</li>
              <li>Use this app at your own risk for recreational and amateur cricket purposes</li>
            </ul>
          </Section>

          <Section title="13. Termination">
            <p>We may terminate or suspend your account if you:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Violate any of these Terms & Conditions</li>
              <li>Engage in fraudulent, abusive, or illegal behaviour</li>
              <li>Misuse the platform in a way that harms other users or the service</li>
            </ul>
            <p>
              Upon termination, your access to the app will be revoked and your data may be deleted.
              You may also choose to deactivate your own account by contacting an administrator.
            </p>
          </Section>

          <Section title="14. Changes to These Terms">
            <p>
              We reserve the right to update these Terms at any time. When significant changes are made,
              we will update the "Last updated" date at the top of this page. Continued use of the app
              after changes are posted constitutes your acceptance of the revised Terms.
            </p>
          </Section>

          <Section title="15. Governing Law">
            <p>
              These Terms are governed by and construed in accordance with the laws of the
              <strong> Republic of India</strong>, including the Information Technology Act, 2000
              and applicable rules thereunder. Any disputes arising from these Terms shall be
              subject to the exclusive jurisdiction of the courts in <strong>Tamil Nadu, India</strong>.
            </p>
          </Section>

          <Section title="16. Contact Us" icon={Mail}>
            <p>
              If you have any questions about these Terms, or need to report a violation, please contact us:
            </p>
            <ul className="list-disc pl-4 space-y-1">
              <li><strong>In-app:</strong> Go to <em>Support / Feedback</em> in the app menu</li>
              <li><strong>GitHub:</strong> <a href="https://github.com/jayakumar516234" className="text-pitch-600 underline" target="_blank" rel="noopener noreferrer">github.com/jayakumar516234</a></li>
            </ul>
          </Section>

        </div>

        <div className="text-center text-xs text-slate-400 pb-4 space-y-1">
          <div>Cricket Score App · Effective {effectiveDate}</div>
          <div>
            <Link to="/privacy" className="underline hover:text-slate-600">Privacy Policy</Link>
            {' · '}
            <Link to="/login" className="underline hover:text-slate-600">Back to Login</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
