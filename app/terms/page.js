import Link from "next/link";

export const metadata = { title: "Terms & Disclaimer · ClearClaim" };

function H({ children }) {
  return <h3 className="sans" style={{ fontFamily: "var(--serif)", fontSize: 18, margin: "22px 0 6px", color: "var(--navy)" }}>{children}</h3>;
}

export default function Terms() {
  return (
    <>
      <header>
        <img src="/wordmark.png" alt="ClearClaim" height="30" style={{ background: "#fff", borderRadius: 10, padding: "5px 10px", display: "block" }} />
        <span className="spacer" />
        <Link href="/dashboard"><button style={{ background: "#ffffff1a", color: "#fff", borderColor: "#ffffff40" }}>← Back</button></Link>
      </header>
      <main>
        <div className="card">
          <h2>Terms of Use and Disclaimer</h2>
          <p className="muted sans" style={{ fontSize: 13, marginTop: -4 }}>Last updated August 2026.</p>

          <div className="sans" style={{ fontSize: 14.5, lineHeight: 1.65, color: "var(--ink)" }}>
            <p>ClearClaim is provided by A3 Consulting LLC ("we," "us," or "ClearClaim"). These terms are an
            agreement between you and A3 Consulting LLC. By creating an account or using the app, you agree
            to them. If you do not agree, please do not use ClearClaim. You can reach us at{" "}
            <a href="mailto:clearclaimhelp@gmail.com">clearclaimhelp@gmail.com</a>.</p>

            <H>1. What ClearClaim is</H>
            <p>ClearClaim is an independent tool that helps families organize purchases, prepare
            documentation, and write clear justifications for education funding programs. It is not
            affiliated with, endorsed by, or connected to ClassWallet, the Arkansas Department of Education,
            or any state Education Freedom Account, Education Savings Account, or similar program. Any
            program or vendor names are used only to describe how the tool helps you.</p>

            <H>2. Eligibility and your account</H>
            <p>You must be at least 18 years old and able to enter a binding agreement to use ClearClaim.
            You are responsible for keeping your login credentials secure and for everything that happens
            under your account. Please let us know promptly if you believe your account has been used
            without your permission.</p>

            <H>3. The program administrator decides</H>
            <p>ClearClaim helps you prepare and organize submissions. It does not review, approve, or pay
            claims. Every approval, denial, and reimbursement decision is made solely by the program
            administrator. We do not guarantee that any claim will be approved or reimbursed, in whole or
            in part.</p>

            <H>4. Guidance can change</H>
            <p>The rules, price figures, categories, and checks in ClearClaim are based on publicly
            available program documentation. That documentation can change at any time without notice, and
            any figures shown are recommended amounts, not guarantees. You are responsible for verifying
            the current program rules before you buy or submit.</p>

            <H>5. Your submissions are your responsibility</H>
            <p>You are responsible for the accuracy and completeness of everything you submit, including
            receipts, amounts, dates, and the justifications you send. Please review and edit anything
            ClearClaim drafts so it fits your student and your actual purchase.</p>

            <H>6. Acceptable use</H>
            <p>Please use ClearClaim only for lawful, personal, family use. Do not use it to submit false or
            misleading information, to break program rules or the law, to disrupt or reverse engineer the
            service, or to access another person's account or data. We may suspend accounts that misuse the
            service.</p>

            <H>7. Not legal, tax, or financial advice</H>
            <p>ClearClaim does not provide legal, tax, or financial advice, and it does not connect to,
            log in to, or access any bank or financial account. We never ask for banking credentials or
            account access, and we do not interpret, categorize, or analyze your financial data. For
            decisions that need professional advice, please consult a qualified professional.</p>

            <H>8. Document uploads and redaction</H>
            <p>ClearClaim includes a tool that helps you black out parts of a document, such as a bank or
            card statement, that a reviewer does not need. You control what you upload and which regions are
            removed. The tool can suggest regions to redact, but those suggestions are automated and may
            miss sensitive information or mark the wrong thing. They are only a starting point. You are
            solely responsible for reviewing every page of the finished document and confirming it before
            you add it to a packet or submit it anywhere. Redaction runs in your browser and permanently
            removes the covered areas from the file it produces, but it only removes what you choose to
            cover. You are also responsible for complying with your financial institution's terms about
            sharing or altering statement documents.</p>

            <H>9. Your content, privacy, and what we store</H>
            <p>To make the app work, we store the information you enter: your students' first names and
            grade (which may identify a minor), the claims and syllabi you create, and any files you save,
            such as receipts, booklists, and redacted documents. This information is kept private to your
            account and protected by per-account access rules. We do not sell it, and we do not share it
            with ClassWallet, the state, or other third parties, except service providers that help us run
            the app (such as hosting and AI drafting) and only as needed to provide the service, or if the
            law requires it.</p>
            <p>If you use the pre-approval tool, we store the request you build (the students listed, the item
            description, the anticipated cost, and the justification text) in a log for your own reference. We
            do not submit the Department's form for you and we have no connection to the Department's systems,
            so any approval status in the log is what you enter yourself.</p>

            <p>Documents you put through the redaction tool are processed in your browser. The original,
            un-redacted file is not sent to or stored on our servers. Only items you choose to save are
            stored, and we keep them until you delete them or close your account. You keep ownership of your
            content, and you can edit or delete your students, claims, syllabi, and documents at any time.
            You grant us permission to store and process your content only to provide ClearClaim to you.</p>

            <H>10. Our intellectual property</H>
            <p>ClearClaim, including its software, design, text, and branding, belongs to A3 Consulting LLC.
            We give you a personal, non-transferable, revocable permission to use the app while these terms
            are in effect. Please do not copy, resell, or rebrand it.</p>

            <H>11. Fees</H>
            <p>ClearClaim is free to use during this period. We may introduce paid features or plans in the
            future. If we do, we will make the pricing and what it covers clear before you are charged, and
            those paid terms will apply only if you choose to buy.</p>

            <H>12. Service "as is"</H>
            <p>ClearClaim is provided "as is" and "as available," without warranties of any kind, express or
            implied, including any implied warranties of merchantability, fitness for a particular purpose,
            accuracy, or non-infringement. We do not warrant that the app will be uninterrupted, error free,
            that its guidance will match every current program rule, or that automated redaction will catch
            every piece of sensitive information.</p>

            <H>13. Limitation of liability</H>
            <p>To the fullest extent allowed by law, A3 Consulting LLC will not be liable for any indirect,
            incidental, special, or consequential damages, or for any lost reimbursements, denied claims,
            or lost profits, arising from your use of ClearClaim. Our total liability for any claim relating
            to the service will not exceed the greater of the amount you paid us for the service in the
            twelve months before the claim, or fifty US dollars.</p>

            <H>14. Indemnification</H>
            <p>You agree to defend and hold harmless A3 Consulting LLC from claims and costs arising out of
            your use of ClearClaim, your submissions, or your violation of these terms, to the extent
            allowed by law.</p>

            <H>15. Termination</H>
            <p>You may stop using ClearClaim and delete your account at any time. We may suspend or end
            access if you violate these terms or misuse the service. Sections that by their nature should
            survive, such as disclaimers, limitation of liability, and governing law, will continue to
            apply after termination.</p>

            <H>16. Changes to these terms</H>
            <p>We may update these terms as the app and the programs it supports change. When we do, we will
            update the date at the top of this page. If a change is significant, we will make a reasonable
            effort to let you know. Continuing to use ClearClaim after an update means you accept the
            updated terms.</p>

            <H>17. Governing law</H>
            <p>These terms are governed by the laws of the State of Arkansas, without regard to its conflict
            of laws rules. Any dispute will be handled in the state or federal courts located in Arkansas,
            and you agree to that venue.</p>

            <H>18. Contact</H>
            <p>Questions about these terms? Email us at{" "}
            <a href="mailto:clearclaimhelp@gmail.com">clearclaimhelp@gmail.com</a>.</p>

            <p className="muted" style={{ fontSize: 13, marginTop: 18 }}>By using ClearClaim you acknowledge
            that you have read and understood these terms and the disclaimer above.</p>
          </div>
        </div>
      </main>
    </>
  );
}
