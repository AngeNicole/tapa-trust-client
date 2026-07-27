import { Link } from 'react-router-dom';
import { PublicShell } from '../components/PublicShell.jsx';
import './LegalPage.css';

// Contact address for privacy questions and data requests.
const CONTACT_EMAIL = 'nicole.mukundwa@ist.com';

const LAST_UPDATED = '27 July 2026';

export default function PrivacyPolicy() {
  return (
    <PublicShell>
      <div className="legal-page">
        <h1>Privacy Policy</h1>
        <p className="legal-updated">Last updated: {LAST_UPDATED}</p>

        <p>
          This Privacy Policy explains how TaPa Trust (&ldquo;we&rdquo;, &ldquo;us&rdquo;) collects, uses and
          protects your information when you use our platform to find, offer or book informal
          skilled services in Kigali, Rwanda.
        </p>

        <div className="legal-note">
          <p>
            TaPa Trust is a project platform built for demonstration and academic evaluation.
            This policy describes our actual data practices, but it is not legal advice and
            should be reviewed by a qualified professional before any commercial launch.
          </p>
        </div>

        <h2>1. Information we collect</h2>
        <ul>
          <li><strong>Account details</strong> — your name, email address, phone number, location and a password (stored only as a secure hash, never in plain text).</li>
          <li><strong>Worker profile</strong> — if you register as a worker: your bio, skills, profile photo and any certificates you upload for admin review.</li>
          <li><strong>Activity</strong> — bookings you create or accept, chat messages, agreed prices, check-in / check-out timestamps, and ratings and reviews.</li>
          <li><strong>Technical data</strong> — information your browser stores locally (see Cookies &amp; local storage below).</li>
        </ul>

        <h2>2. Identity verification and biometrics</h2>
        <p>
          To become verified, workers complete a face check that compares a photo of their ID
          document with a live selfie. This comparison happens <strong>entirely in your browser,
          on your own device</strong>.
        </p>
        <ul>
          <li>Your ID image and selfie are <strong>never uploaded to or stored on our servers</strong>. They are matched locally and then discarded.</li>
          <li>Only the <strong>result of the check</strong> (a match score and pass/fail verdict) is transmitted to us — never the images themselves.</li>
          <li><strong>Certificates</strong> you choose to upload (e.g. trade qualifications) <em>are</em> stored, so an administrator can review them as part of verification.</li>
        </ul>

        <h2>3. How we use your information</h2>
        <ul>
          <li>To create and operate your account and profile.</li>
          <li>To match requesters with verified workers and manage the booking lifecycle.</li>
          <li>To display ratings and reviews that help build trust between users.</li>
          <li>To verify worker identity and keep the marketplace safe.</li>
          <li>To respond to your questions and support requests.</li>
        </ul>

        <h2>4. How we share information</h2>
        <p>
          We do not sell your personal information. Limited profile information (such as a
          worker&rsquo;s name, photo, skills, ratings and location area) is shown to other users so
          they can decide whether to book. When a booking is made, the two parties can see the
          details needed to complete the job. We share data with the service providers that host
          our platform (below) and where required by law.
        </p>

        <h2>5. Data storage and hosting</h2>
        <p>
          The application front end is hosted on Vercel and the back end on Render. The PostgreSQL
          database is hosted by Railway. Your data may be processed on servers operated by these
          providers.
        </p>

        <h2>6. Cookies and local storage</h2>
        <p>
          We use your browser&rsquo;s local storage rather than tracking cookies. We store a session
          token to keep you signed in, your language preference, and small flags such as whether
          you have dismissed the welcome screen. We do not use third-party advertising trackers.
        </p>

        <h2>7. Payments</h2>
        <p>
          Payments on TaPa Trust are <strong>simulated for demonstration purposes</strong>. We do
          not collect card numbers or bank details, and no real money changes hands through the
          platform.
        </p>

        <h2>8. Data retention</h2>
        <p>
          We keep your account and activity data for as long as your account is active. You may
          ask us to delete your account and associated data at any time using the contact details
          below.
        </p>

        <h2>9. Your rights</h2>
        <p>
          You can access and update most of your information directly in your profile settings.
          You may also request a copy of your data, or its correction or deletion, by contacting
          us.
        </p>

        <h2>10. Children</h2>
        <p>
          TaPa Trust is not intended for anyone under 18. We do not knowingly collect information
          from children.
        </p>

        <h2>11. Changes to this policy</h2>
        <p>
          We may update this policy from time to time. When we do, we will revise the &ldquo;Last
          updated&rdquo; date at the top of this page.
        </p>

        <h2>12. Contact us</h2>
        <p>
          For any privacy questions or data requests, email us at{' '}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>

        <p style={{ marginTop: '2rem' }}>
          See also our <Link to="/terms">Terms of Service</Link>.
        </p>
      </div>
    </PublicShell>
  );
}
