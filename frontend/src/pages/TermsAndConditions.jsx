import { Link } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';

const Section = ({ title, children }) => (
  <div className="space-y-2">
    <h2 className="text-base font-bold text-slate-900">{title}</h2>
    <div className="text-sm text-slate-600 space-y-2">{children}</div>
  </div>
);

export default function TermsAndConditions() {
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
              <FileText className="h-5 w-5 text-pitch-400" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">Terms &amp; Conditions</h1>
              <p className="text-xs text-slate-400 mt-0.5">Last updated: {updated}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
        <div className="card p-5 sm:p-6 space-y-6">

          <p className="text-sm text-slate-600">
            These Terms and Conditions ("Terms") govern your use of the <strong>Cricket Score App</strong>. By accessing or using this application, you agree to be bound by these Terms. If you do not agree, please do not use this app.
          </p>

          <Section title="1. About the App">
            <p>
              Cricket Score App is a platform for managing cricket teams, scheduling matches, and recording live scores. It is intended for recreational and amateur cricket use.
            </p>
          </Section>

          <Section title="2. Eligibility">
            <ul className="list-disc pl-5 space-y-1">
              <li>You must be at least <strong>13 years old</strong> to use this app</li>
              <li>By registering, you confirm that the information you provide is accurate and truthful</li>
              <li>Each person may only maintain one account unless authorised by an administrator</li>
            </ul>
          </Section>

          <Section title="3. Account Responsibilities">
            <ul className="list-disc pl-5 space-y-1">
              <li>You are responsible for maintaining the confidentiality of your login credentials</li>
              <li>You must not share your account with others or allow unauthorised access</li>
              <li>You are responsible for all activity that occurs under your account</li>
              <li>Notify your administrator immediately if you suspect unauthorised access</li>
            </ul>
          </Section>

          <Section title="4. Acceptable Use">
            <p>You agree <strong>not</strong> to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Use the app for any unlawful or fraudulent purpose</li>
              <li>Enter false, misleading, or offensive player or team information</li>
              <li>Attempt to access other users' accounts or data without permission</li>
              <li>Reverse-engineer, copy, or exploit any part of the application</li>
              <li>Use automated scripts or bots to interact with the app</li>
            </ul>
          </Section>

          <Section title="5. Team & Match Data">
            <ul className="list-disc pl-5 space-y-1">
              <li>You retain ownership of the team and match data you create</li>
              <li>By entering data into the app, you grant us a licence to store and display that data within the app</li>
              <li>Team data (name, location, player list) may be visible to other registered users of the app</li>
              <li>Phone numbers and personal contact details are <strong>never</strong> shared with other regular users</li>
            </ul>
          </Section>

          <Section title="6. Administrator Rights">
            <p>
              Super Admins and Admins have the right to:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Create, edit, or delete any team, match, or user account</li>
              <li>Disable or remove accounts that violate these Terms</li>
              <li>Access audit logs of all actions taken within the app</li>
            </ul>
          </Section>

          <Section title="7. Team Limits">
            <ul className="list-disc pl-5 space-y-1">
              <li>Regular users may create a limited number of teams as defined by the platform (default: 1 team)</li>
              <li>Admins may adjust this limit at their discretion</li>
            </ul>
          </Section>

          <Section title="8. Service Availability">
            <p>
              We strive to keep the app available at all times but do not guarantee uninterrupted access. We reserve the right to perform maintenance, updates, or take the service offline without prior notice. We are not liable for any data loss or disruption caused by downtime.
            </p>
          </Section>

          <Section title="9. Intellectual Property">
            <p>
              All code, design, and branding of Cricket Score App are owned by the developer. You may not copy, redistribute, or resell any part of this application without explicit written permission.
            </p>
          </Section>

          <Section title="10. Limitation of Liability">
            <p>
              Cricket Score App is provided "as is" without warranties of any kind. We are not responsible for any loss of data, missed matches, or errors in score recording. Use the app at your own risk.
            </p>
          </Section>

          <Section title="11. Changes to These Terms">
            <p>
              We reserve the right to update these Terms at any time. Changes will be reflected with an updated date at the top of this page. Continued use of the app constitutes your acceptance of the revised Terms.
            </p>
          </Section>

          <Section title="12. Governing Law">
            <p>
              These Terms are governed by the laws of <strong>India</strong>. Any disputes shall be subject to the exclusive jurisdiction of the courts in India.
            </p>
          </Section>

          <Section title="13. Contact">
            <p>
              If you have any questions about these Terms, please contact the app administrator.
            </p>
          </Section>
        </div>

        <div className="text-center text-xs text-slate-400 pb-4">
          Cricket Score App · <Link to="/privacy" className="underline hover:text-slate-600">Privacy Policy</Link>
        </div>
      </div>
    </div>
  );
}
