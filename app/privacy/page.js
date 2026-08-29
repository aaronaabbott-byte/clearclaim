import Link from "next/link";

export const metadata = { title: "Privacy Policy · ClearClaim" };

function H({ children }) {
  return <h3 className="sans" style={{ fontFamily: "var(--serif)", fontSize: 18, margin: "22px 0 6px", color: "var(--navy)" }}>{children}</h3>;
}

export default function Privacy() {
  return (
    <>
      <header>
        <img src="/wordmark-white.png" alt="ClearClaim" height="56" style={{ display: "block" }} />
        <span className="spacer" />
        <Link href="/dashboard"><button style={{ background: "#ffffff1a", color: "#fff", borderColor: "#ffffff40" }}>← Back</button></Link>
      </header>
      <main>
        <div className="card">
          <h2>Privacy Policy</h2>
          <p className="muted sans" style={{ fontSize: 13, marginTop: -4 }}>Last updated August 2026.</p>

          <div className="sans" style={{ fontSize: 14.5, lineHeight: 1.65, color: "var(--ink)" }}>
            <p>This policy explains what ClearClaim collects, how we use it, and the choices you have.
            ClearClaim is provided by A3 Consulting LLC ("we," "us," or "ClearClaim"). It works alongside
            our <Link href="/terms" style={{ color: "var(--navy2)" }}>Terms of Use</Link>. Questions? Email{" "}
            <a href="mailto:clearclaimhelp@gmail.com">clearclaimhelp@gmail.com</a>.</p>

            <p>The short version: we collect only what we need to run the app for you, we do not sell your
            data, we do not run ads or third-party tracking, and we do not share your information with
            ClassWallet, the Arkansas Department of Education, or any program administrator.</p>

            <H>1. Information you give us</H>
            <p>To make ClearClaim work, we store what you enter, which may include: your account email;
            your students' first names and grade (which may identify a minor); the claims, pre-approval
            requests, and syllabi you create; provider business details if you use the provider tools
            (business name, your name, credentials, contact info, logo, and an optional local sales-tax
            rate); and any files you save, such as receipts, booklists, and redacted or annotated documents.
            If you email us for support, we keep that correspondence.</p>

            <H>2. Payment information</H>
            <p>Paid plans are processed by <b>Stripe</b>, our payment processor. When you subscribe, you
            enter your card details directly with Stripe — we never see or store your full card number.
            We store limited billing records needed to manage your subscription, such as your plan, its
            status, and a Stripe customer reference. Stripe's handling of your payment data is governed by
            Stripe's own privacy policy.</p>

            <H>3. Cookies</H>
            <p>ClearClaim uses one kind of cookie: a <b>strictly-necessary session cookie</b> that keeps you
            signed in as you move between pages. It is required for the app to function and is not used to
            track you. We do <b>not</b> use analytics, advertising, or cross-site tracking cookies, and we
            do not embed third-party trackers — which is why you will not see a cookie-consent banner asking
            to track you. If you go through checkout, Stripe may set its own cookies on Stripe's checkout
            pages for fraud prevention; those are controlled by Stripe, not us.</p>

            <H>4. How we use your information</H>
            <p>We use your information only to provide and improve ClearClaim: to sign you in, save and
            display your students, claims, documents, and invoices, generate PDFs and justification drafts,
            run eligibility and price checks, process your subscription, and respond to support requests.
            We do not use your information for advertising, and we do not sell it.</p>

            <H>5. Service providers we rely on</H>
            <p>We use a small number of vendors to run the app, and share information with them only as
            needed to provide the service:</p>
            <p style={{ margin: "6px 0" }}>• <b>Supabase</b> — hosting, database, authentication, and private file storage. Your account data and saved files live here.</p>
            <p style={{ margin: "6px 0" }}>• <b>Vercel</b> — application hosting and delivery.</p>
            <p style={{ margin: "6px 0" }}>• <b>Anthropic</b> — the AI service that drafts justification and reasoning text. When you use an AI feature, the relevant details you entered (such as an item description and a student's first name, grade, and subjects) are sent to generate the draft. Please do not enter health, medical, diagnosis, or financial-account information into these tools; it is not needed.</p>
            <p style={{ margin: "6px 0" }}>• <b>Stripe</b> — payment processing for paid plans (see section 2).</p>
            <p>We do not share your information with ClassWallet, the state, or any program administrator.
            We may disclose information if the law requires it, or to protect the rights, safety, or property
            of ClearClaim or others.</p>

            <H>6. Documents and redaction</H>
            <p>The redaction and annotation tools run in your browser. When you redact a document, the
            original, un-redacted file is <b>not</b> sent to or stored on our servers — only the finished
            file you choose to save is stored. Automated redaction suggestions can miss sensitive
            information, so you are responsible for reviewing every page before saving or submitting. Saved
            files are private to your account.</p>

            <H>7. Students and children's data</H>
            <p>ClearClaim is used by adults — parents, guardians, and education providers — to organize
            expenses for a student's program. In doing so you may enter a minor's first name and grade. That
            information is stored privately under your account, used only to organize your claims and
            documents, and never sold or shared for marketing. ClearClaim is not directed to children, and
            we do not knowingly collect information directly from a child under 13. You can edit or delete
            your students at any time.</p>
            <p style={{ marginTop: 8 }}><b>Health and diagnosis documents.</b> Some expenses — like sensory or
            special-needs learning items — require a copy of a student's medical diagnosis. ClearClaim gives you
            an optional document vault so you can store such a file once and attach it to your submissions instead
            of re-uploading it each time. Uploading these documents is entirely your choice. When you do, they are
            stored privately under your account with the same protections as your other files: isolated by
            per-account access rules, encrypted in transit and at rest, and served only through private,
            time-limited links. We do not read, use, sell, or share these documents, and we use them only to
            provide the storage-and-attach feature you asked for. You can delete any stored document at any time,
            and we recommend uploading only what a submission actually needs.</p>

            <H>8. How your information is protected</H>
            <p>Your data is isolated to your account by per-account access rules (row-level security), so
            other users cannot see it. Data is encrypted in transit and at rest by our hosting providers,
            passwords are hashed, and saved files are served only through private, time-limited links. No
            system is perfectly secure, but we take reasonable measures to protect your information.</p>

            <H>9. How long we keep it</H>
            <p>We keep the information you save until you delete it or close your account. You can remove
            your students, claims, syllabi, receipts, and documents at any time from within the app, and you
            can ask us to delete your account and its data by emailing us. Some limited records (such as
            basic billing history) may be retained where we are required to keep them.</p>

            <H>10. Your choices and rights</H>
            <p>You can view, edit, and delete most of your information directly in the app. Depending on
            where you live, you may have rights to access, correct, delete, or receive a copy of your
            personal information, and to not have it sold or "shared" for cross-context advertising. We do
            not sell or share your information for advertising, and we do not use it to build advertising
            profiles. To exercise any right, email{" "}
            <a href="mailto:clearclaimhelp@gmail.com">clearclaimhelp@gmail.com</a> and we will respond as
            required by applicable law.</p>

            <H>11. Changes to this policy</H>
            <p>We may update this policy as the app changes. When we do, we will update the date at the top
            of this page, and if a change is significant we will make a reasonable effort to let you know.
            Continuing to use ClearClaim after an update means you accept the updated policy.</p>

            <H>12. Contact</H>
            <p>Questions about your privacy or this policy? Email us at{" "}
            <a href="mailto:clearclaimhelp@gmail.com">clearclaimhelp@gmail.com</a>.</p>
          </div>
        </div>
      </main>
    </>
  );
}
