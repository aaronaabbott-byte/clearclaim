import Link from "next/link";

export const metadata = {
  title: "ClearClaim — EFA reimbursements, ready to approve",
  description: "Prepare Arkansas EFA reimbursements the right way: check eligibility, keep receipts sorted by student, build a clean ClassWallet packet, and handle pre-approvals. Works alongside ClassWallet.",
};

// The app lives on its own subdomain; the landing links to it. Set
// NEXT_PUBLIC_APP_URL to https://app.clearclaimapp.com once the subdomain is
// live. Until then it's empty, so links stay relative and work on any domain.
const APP = process.env.NEXT_PUBLIC_APP_URL || "";

function Feature({ icon, title, children }) {
  return (
    <div className="lp-c">
      <div className="lp-ic">{icon}</div>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}

export default function Landing() {
  return (
    <div className="lp">
      <nav className="lp-nav">
        <img src="/wordmark.png" alt="ClearClaim" height="34" style={{ background: "#fff", borderRadius: 9, padding: "5px 10px", display: "block" }} />
        <span className="sp" />
        <a className="lp-btn lp-btn-ghost" href={`${APP}/login`}>Log in</a>
        <a className="lp-btn lp-btn-gold" href={`${APP}/login`}>Get started</a>
      </nav>

      {/* Hero */}
      <header className="lp-hero">
        <div className="lp-wrap lp-hero-grid">
          <div>
            <div className="lp-eyebrow">Arkansas EFA · homeschool · microschool · providers</div>
            <h1 className="lp-h1">Every claim, ready to approve.</h1>
            <p className="lp-sub">
              ClearClaim helps Arkansas Education Freedom Account families prepare reimbursements the right way —
              check if an item qualifies, keep receipts sorted by student, build a clean ClassWallet packet, and
              handle pre-approvals — so nothing gets bounced.
            </p>
            <div className="lp-ctarow">
              <a className="lp-btn lp-btn-gold lp-btn-lg" href={`${APP}/login`}>Get started free</a>
              <a className="lp-btn lp-btn-ghost lp-btn-lg" href="#how">See how it works</a>
            </div>
            <div className="lp-note">Free during our research preview. Works alongside ClassWallet — we never touch your money.</div>
          </div>

          {/* Product mock */}
          <div className="lp-mock" aria-hidden="true">
            <div className="bar" />
            <div className="rowm"><div className="dot">B</div><div><b style={{ fontSize: 14 }}>Banks · grade 3</b><div style={{ color: "var(--muted)", fontSize: 12 }}>Latin primer · $42.10</div></div><span className="pill" style={{ background: "#f2f8f6", color: "var(--teal)" }}>Approved</span></div>
            <div className="rowm"><div className="dot">Be</div><div><b style={{ fontSize: 14 }}>Benton · grade 5</b><div style={{ color: "var(--muted)", fontSize: 12 }}>Chromebook · $299</div></div><span className="pill" style={{ background: "#fbf3e2", color: "var(--gold)" }}>In a claim</span></div>
            <div className="rowm"><div className="dot">✓</div><div><b style={{ fontSize: 14 }}>Shared · art supplies</b><div style={{ color: "var(--muted)", fontSize: 12 }}>Split across 2 students</div></div><span className="pill" style={{ background: "#eef2f7", color: "var(--navy2)" }}>Filed</span></div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8, fontFamily: "var(--sans)" }}>Receipt vault · sorted by student</div>
          </div>
        </div>
      </header>

      {/* Who it's for */}
      <section className="lp-section">
        <div className="lp-wrap">
          <h2 className="lp-h2">Built for the way you actually run things</h2>
          <p className="lp-lead">Whether you teach your own kids, run a small learning community, or provide a service to EFA families.</p>
          <div className="lp-cards">
            <Feature icon="🏡" title="Homeschool families">
              Track each student, check items before you buy, keep receipts sorted, and turn them into clean ClassWallet submissions — plus your yearly homeschool deadlines in one place.
            </Feature>
            <Feature icon="🌱" title="Microschools & co-ops">
              The reimbursement and documentation back-office for the families you serve, without the spreadsheet chaos.
            </Feature>
            <Feature icon="🏛️" title="Providers & vendors">
              Build branded course documents on your own letterhead and keep a class roster — the paperwork families need for their records.
            </Feature>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="lp-section lp-alt">
        <div className="lp-wrap">
          <h2 className="lp-h2">Everything around the reimbursement. In one place.</h2>
          <p className="lp-lead">ClassWallet moves the money. ClearClaim gets you ready to submit — and keeps you organized all year.</p>
          <div className="lp-cards">
            <Feature icon="✅" title="Eligibility check">Find out if an item is core or non-core before you spend, grounded in the actual EFA rule text.</Feature>
            <Feature icon="🧾" title="Receipt vault">Drop receipts in as you get them, sorted by student, with a status so you always know what's been claimed.</Feature>
            <Feature icon="📦" title="Claim packager">Attach the receipt and proof of payment, auto-draft the educational-use note, and download a clean PDF ready for ClassWallet.</Feature>
            <Feature icon="📝" title="Pre-approvals">Fill the Department's pre-approval form the right way, with a justification that covers the full standard.</Feature>
            <Feature icon="🎓" title="Branded documents">Providers create course documents on their own letterhead — logo, credentials, and contact.</Feature>
            <Feature icon="✨" title="Ask Ann">A friendly guide who answers your EFA questions in plain language, any time.</Feature>
          </div>
        </div>
      </section>

      {/* Alongside ClassWallet strip */}
      <section className="lp-section">
        <div className="lp-wrap">
          <div className="lp-strip">🤝 On the EFA? ClearClaim works <b>alongside ClassWallet</b>. ClassWallet handles the money — ClearClaim gets your claim ready to approve.</div>
        </div>
      </section>

      {/* How it works */}
      <section className="lp-section lp-alt" id="how">
        <div className="lp-wrap">
          <h2 className="lp-h2">From receipt to reimbursement in three steps</h2>
          <p className="lp-lead">Set it up once. Stay organized all year.</p>
          <div className="lp-steps">
            <div className="lp-step"><div className="num">1</div><h3 style={{ fontFamily: "var(--serif)", color: "var(--navy)", margin: "0 0 6px", fontSize: 19 }}>Add your students</h3><p style={{ color: "var(--muted)", margin: 0, fontSize: 15 }}>A minute of setup — first name and grade, nothing sensitive. No account or bank numbers, ever.</p></div>
            <div className="lp-step"><div className="num">2</div><h3 style={{ fontFamily: "var(--serif)", color: "var(--navy)", margin: "0 0 6px", fontSize: 19 }}>File receipts as you go</h3><p style={{ color: "var(--muted)", margin: 0, fontSize: 15 }}>Snap a photo, tag the student, done. Check eligibility first when you're not sure something qualifies.</p></div>
            <div className="lp-step"><div className="num">3</div><h3 style={{ fontFamily: "var(--serif)", color: "var(--navy)", margin: "0 0 6px", fontSize: 19 }}>Build the packet & submit</h3><p style={{ color: "var(--muted)", margin: 0, fontSize: 15 }}>One clean PDF with everything a reviewer needs — you submit it in ClassWallet, we never do it for you.</p></div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="lp-final">
        <div className="lp-wrap">
          <h2 className="lp-h2">Get your claims ready to approve.</h2>
          <p className="lp-sub" style={{ margin: "14px auto 24px" }}>Free during our research preview. Set up in minutes.</p>
          <div className="lp-ctarow" style={{ justifyContent: "center" }}>
            <a className="lp-btn lp-btn-gold lp-btn-lg" href={`${APP}/login`}>Create your free account</a>
            <a className="lp-btn lp-btn-ghost lp-btn-lg" href={`${APP}/login`}>Log in</a>
          </div>
          <p className="lp-note" style={{ marginTop: 20 }}>
            ClearClaim is an independent tool and is not affiliated with, endorsed by, or connected to ClassWallet, the
            Arkansas Department of Education, or any state EFA or ESA program. It does not guarantee approval or
            reimbursement and is not legal, tax, or financial advice. <Link href="/terms" style={{ color: "#f0c877" }}>Terms & full disclaimer</Link>.
          </p>
        </div>
      </section>
    </div>
  );
}
