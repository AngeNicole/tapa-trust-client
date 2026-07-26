import { Link } from 'react-router-dom';
import { PublicShell } from '../components/PublicShell.jsx';
import './LegalPage.css';

// Contact address for questions about these terms.
const CONTACT_EMAIL = 'nicole.mukundwa@ist.com';

const LAST_UPDATED = '26 July 2026';

export default function TermsOfService() {
  return (
    <PublicShell>
      <div className="legal-page">
        <h1>Terms of Service</h1>
        <p className="legal-updated">Last updated: {LAST_UPDATED}</p>

        <p>
          These Terms of Service (&ldquo;Terms&rdquo;) govern your use of TaPa Trust, a platform that
          connects people who need work done (&ldquo;requesters&rdquo;) with verified informal skilled
          workers (&ldquo;workers&rdquo;) in Kigali, Rwanda. By using the platform, you agree to these
          Terms.
        </p>

        <div className="legal-note">
          <p>
            TaPa Trust is a project platform built for demonstration and academic evaluation.
            These Terms describe how the platform is intended to work, but they are not legal
            advice and should be reviewed by a qualified professional before any commercial launch.
          </p>
        </div>

        <h2>1. What TaPa Trust is</h2>
        <p>
          TaPa Trust is a marketplace and coordination tool. We help requesters and workers find
          each other, agree terms, and track a job from booking to completion. We are{' '}
          <strong>not</strong> the employer of any worker, and we are not a party to the agreement
          between a requester and a worker. Workers provide their services independently.
        </p>

        <h2>2. Eligibility and accounts</h2>
        <ul>
          <li>You must be at least 18 years old to use TaPa Trust.</li>
          <li>You are responsible for the accuracy of the information you provide and for keeping your account credentials secure.</li>
          <li>You are responsible for all activity that happens under your account.</li>
        </ul>

        <h2>3. Worker verification</h2>
        <p>
          Workers complete an identity check (comparing an ID document with a live selfie, matched
          on their own device) and may submit certificates for administrator review. Only verified,
          admin-approved workers appear in the marketplace and can be booked. Verification supports
          trust but is not a guarantee of any worker&rsquo;s conduct, skill or outcome.
        </p>

        <h2>4. Bookings and the task lifecycle</h2>
        <ul>
          <li>Requesters and workers agree the scope and price of a job through in-app chat before it is accepted.</li>
          <li>Workers record check-in and check-out; a job is completed only when both sides confirm.</li>
          <li>You agree to deal with each other honestly and to honour the terms you agree to.</li>
        </ul>

        <h2>5. Payments</h2>
        <p>
          Payments on TaPa Trust are <strong>simulated for demonstration purposes</strong>. No real
          money is processed through the platform, and any balances, payouts or invoices shown are
          illustrative only.
        </p>

        <h2>6. Acceptable use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Provide false information or impersonate anyone.</li>
          <li>Harass, threaten or discriminate against other users.</li>
          <li>Use the platform for any unlawful purpose or to arrange unlawful work.</li>
          <li>Attempt to disrupt, misuse or gain unauthorised access to the platform.</li>
        </ul>

        <h2>7. Reviews and ratings</h2>
        <p>
          Reviews and ratings must be honest and based on a genuine experience. We may remove
          content that is abusive, fraudulent or violates these Terms.
        </p>

        <h2>8. Disclaimers</h2>
        <p>
          The platform is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;, without warranties of any
          kind. We do not guarantee the quality, safety or legality of any job, or the conduct of
          any user. You use TaPa Trust at your own risk.
        </p>

        <h2>9. Limitation of liability</h2>
        <p>
          To the extent permitted by law, TaPa Trust and its creators are not liable for any
          indirect, incidental or consequential damages, or for any dispute, loss or injury
          arising from interactions or jobs arranged between users.
        </p>

        <h2>10. Termination</h2>
        <p>
          You may stop using the platform and request deletion of your account at any time. We may
          suspend or terminate accounts that violate these Terms or that put other users at risk.
        </p>

        <h2>11. Governing law</h2>
        <p>
          These Terms are governed by the laws of the Republic of Rwanda.
        </p>

        <h2>12. Changes to these Terms</h2>
        <p>
          We may update these Terms from time to time. When we do, we will revise the &ldquo;Last
          updated&rdquo; date at the top of this page. Continued use of the platform means you accept
          the updated Terms.
        </p>

        <h2>13. Contact us</h2>
        <p>
          If you have questions about these Terms, email us at{' '}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>

        <p style={{ marginTop: '2rem' }}>
          See also our <Link to="/privacy">Privacy Policy</Link>.
        </p>
      </div>
    </PublicShell>
  );
}
