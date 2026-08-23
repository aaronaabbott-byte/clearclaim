import Link from "next/link";

export const metadata = {
  title: "ClearClaim — EFA reimbursements, ready to approve",
  description:
    "Prepare Arkansas EFA reimbursements the right way: check eligibility before you buy, keep receipts sorted by student, build a clean ClassWallet-ready packet, and handle pre-approvals. Works alongside ClassWallet.",
};

// The app lives on its own subdomain; the landing links to it. Set
// NEXT_PUBLIC_APP_URL to https://app.clearclaimapp.com once the subdomain is
// live. Until then it's empty, so links stay relative and work on any domain.
const APP = process.env.NEXT_PUBLIC_APP_URL || "";

/* ---------- icons (inline, no dependencies) ---------- */
const ico = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" };

const IconCheckShield = () => (
  <svg {...ico} aria-hidden="true"><path d="M12 3l7 3v5.5c0 4.2-2.9 7.6-7 9-4.1-1.4-7-4.8-7-9V6l7-3z" /><path d="M9 12l2 2 4-4" /></svg>
);
const IconReceipt = () => (
  <svg {...ico} aria-hidden="true"><path d="M6 3h12v18l-3-1.6-3 1.6-3-1.6L6 21V3z" /><path d="M9 8h6M9 12h6" /></svg>
);
const IconPacket = () => (
  <svg {...ico} aria-hidden="true"><path d="M4 8l8-4 8 4v8l-8 4-8-4V8z" /><path d="M4 8l8 4 8-4M12 12v8" /></svg>
);
const IconForm = () => (
  <svg {...ico} aria-hidden="true"><path d="M5 4h9l5 5v11a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1z" /><path d="M14 4v5h5M8 14h6M8 17h4" /></svg>
);
const IconLetterhead = () => (
  <svg {...ico} aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 9h18M7 13h6M7 16h9" /></svg>
);
const IconChat = () => (
  <svg {...ico} aria-hidden="true"><path d="M20 15a2 2 0 01-2 2H8l-4 3V6a2 2 0 012-2h12a2 2 0 012 2v9z" /><path d="M9 10h6M9 13h4" /></svg>
);
const IconHome = () => (
  <svg {...ico} aria-hidden="true"><path d="M4 11l8-6 8 6" /><path d="M6 10v9h12v-9" /><path d="M10 19v-5h4v5" /></svg>
);
const IconGroup = () => (
  <svg {...ico} aria-hidden="true"><circle cx="9" cy="9" r="3" /><path d="M3 19c0-3 2.7-5 6-5s6 2 6 5" /><path d="M16 7.5a2.8 2.8 0 010 5.4M18 19c0-2.2-.9-3.9-2.4-5" /></svg>
);
const IconTeach = () => (
  <svg {...ico} aria-hidden="true"><path d="M12 4l9 4-9 4-9-4 9-4z" /><path d="M7 10.5V15c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5v-4.5" /></svg>
);
const IconPin = () => (
  <svg {...ico} width="17" height="17" aria-hidden="true"><path d="M12 21s7-5.5 7-11a7 7 0 10-14 0c0 5.5 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>
);
const IconLock = () => (
  <svg {...ico} width="18" height="18" aria-hidden="true"><rect x="4" y="10" width="16" height="10" rx="2" /><path d="M8 10V7.5a4 4 0 018 0V10" /></svg>
);

/* ---------- small building blocks ---------- */
function Card({ icon, gold, title, children }) {
  return (
    <div className="lp-card">
      <div className={gold ? "lp-ic lp-ic-gold" : "lp-ic"}>{icon}</div>
      <h3 className="lp-h3">{title}</h3>
      <p>{children}</p>
    </div>
  );
}

function Step({ n, title, children }) {
  return (
    <div className="lp-step">
      <div className="lp-step-n">{n}</div>
      <h3 className="lp-h3">{title}</h3>
      <p>{children}</p>
    </div>
  );
}

function Lane({ k, children }) {
  return (
    <div className="lp-lane">
      <div className="lp-lane-k">{k}</div>
      <div className="lp-lane-v">{children}</div>
    </div>
  );
}

export default function Landing() {
  return (
    <div className="lp">
      {/* ---------- nav ---------- */}
      <nav className="lp-nav">
        <div className="lp-wrap lp-nav-in">
          <img className="lp-logo" src="/wordmark.png" alt="ClearClaim" />
          <span className="lp-sp" />
          <a className="lp-btn lp-btn-clear lp-btn-sm" href={`${APP}/login`}>Log in</a>
          <a className="lp-btn lp-btn-gold lp-btn-sm" href={`${APP}/login`}>Get started</a>
        </div>
      </nav>

      {/* ---------- hero ---------- */}
      <section className="lp-hero">
        <div className="lp-wrap lp-hero-grid">
          <div>
            <span className="lp-eyebrow">Arkansas EFA</span>
            <h1 className="lp-h1">Every claim, ready to approve.</h1>
            <p className="lp-lead">
              ClearClaim helps Education Freedom Account families get reimbursements right the first time — check
              whether an item qualifies before you buy, keep every receipt sorted by student, and hand ClassWallet a
              packet that has everything a reviewer is looking for.
            </p>
            <div className="lp-ctas">
              <a className="lp-btn lp-btn-gold lp-btn-lg" href={`${APP}/login`}>Get started free</a>
              <a className="lp-btn lp-btn-quiet lp-btn-lg" href="#how">See how it works</a>
            </div>
            <p className="lp-trust">
              <IconLock />
              <span>Free during our research preview. Works alongside ClassWallet — we never touch your money.</span>
            </p>
          </div>

          {/* product visual — built in CSS, no image needed */}
          <div className="lp-mockwrap" aria-hidden="true">
            <div className="lp-mock">
              <div className="lp-mock-head">
                <div>
                  <div className="lp-mock-title">Receipt vault</div>
                  <div className="lp-mock-sub">Sorted by student · spring term</div>
                </div>
                <span className="lp-chip">3 ready</span>
              </div>

              <div className="lp-row">
                <div className="lp-av">E</div>
                <div>
                  <div className="lp-row-name">Ella · grade 3</div>
                  <div className="lp-row-meta">Latin primer · $42.10</div>
                </div>
                <span className="lp-pill lp-pill-ok">Core</span>
              </div>
              <div className="lp-row">
                <div className="lp-av">O</div>
                <div>
                  <div className="lp-row-name">Owen · grade 5</div>
                  <div className="lp-row-meta">Chromebook · $299.00</div>
                </div>
                <span className="lp-pill lp-pill-gold">In a claim</span>
              </div>
              <div className="lp-row">
                <div className="lp-av lp-av-gold">S</div>
                <div>
                  <div className="lp-row-name">Shared · art supplies</div>
                  <div className="lp-row-meta">Split across 2 students</div>
                </div>
                <span className="lp-pill lp-pill-navy">Filed</span>
              </div>

              <div className="lp-mock-foot">
                <div className="lp-mock-sub">Receipts, proof of payment, and the use note in one file.</div>
                <span className="lp-btn lp-btn-gold lp-btn-sm" style={{ marginLeft: "auto" }}>Build packet</span>
              </div>
            </div>

            <div className="lp-float">
              <span className="lp-ic lp-ic-gold" style={{ width: 34, height: 34, borderRadius: 10, marginBottom: 0 }}>
                <IconCheckShield />
              </span>
              <div>
                <div className="lp-float-t">Eligible before you buy</div>
                <div className="lp-float-s">Core vs. non-core, in plain English</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- who it's for ---------- */}
      <section className="lp-section">
        <div className="lp-wrap">
          <div className="lp-section-head">
            <p className="lp-kicker">Who it&rsquo;s for</p>
            <h2 className="lp-h2">Built for the way you actually run things</h2>
            <p className="lp-lead">
              Whether you teach your own kids, run a small learning community, or provide a service to EFA families.
            </p>
          </div>
          <div className="lp-grid lp-grid-3">
            <Card icon={<IconHome />} title="Homeschool families">
              Track each student, check items before you buy, and turn a shoebox of receipts into clean submissions —
              with your yearly homeschool deadlines in one place.
            </Card>
            <Card icon={<IconGroup />} title="Microschools &amp; co-ops">
              The reimbursement and documentation back-office for the families you serve, without the spreadsheet
              chaos.
            </Card>
            <Card icon={<IconTeach />} title="Providers &amp; vendors">
              Tutors, music teachers, and class providers: send branded course documents and invoices families can file
              with confidence.
            </Card>
          </div>
        </div>
      </section>

      {/* ---------- features ---------- */}
      <section className="lp-section lp-paper">
        <div className="lp-wrap">
          <div className="lp-section-head">
            <p className="lp-kicker">What you get</p>
            <h2 className="lp-h2">Everything around the reimbursement, in one place</h2>
            <p className="lp-lead">
              ClassWallet moves the money. ClearClaim gets you ready to submit — and keeps you organized all year.
            </p>
          </div>
          <div className="lp-grid lp-grid-3">
            <Card icon={<IconCheckShield />} title="Eligibility check">
              Find out whether an item is core or non-core before you spend, grounded in the actual EFA rule text.
            </Card>
            <Card icon={<IconReceipt />} title="Receipt vault">
              Drop receipts in as they arrive, sorted by student, each with a status so you always know what&rsquo;s
              been claimed.
            </Card>
            <Card icon={<IconPacket />} title="Claim packager">
              Receipt, proof of payment, and an auto-drafted educational-use note — downloaded as one ClassWallet-ready
              PDF.
            </Card>
            <Card icon={<IconForm />} title="Pre-approval help">
              Fill the Department&rsquo;s pre-approval form the right way, with a justification that covers the full
              standard.
            </Card>
            <Card icon={<IconLetterhead />} title="Branded documents">
              Providers create course documents and invoices on their own letterhead — logo, credentials, and contact.
            </Card>
            <Card gold icon={<IconChat />} title="Ask Ann">
              A plain-language helper for your EFA questions, any time — no jargon, no waiting on hold.
            </Card>
          </div>
        </div>
      </section>

      {/* ---------- alongside ClassWallet ---------- */}
      <section className="lp-section">
        <div className="lp-wrap">
          <div className="lp-strip">
            <div className="lp-strip-grid">
              <div>
                <p className="lp-kicker" style={{ color: "#e6bb6a" }}>Alongside ClassWallet</p>
                <h2 className="lp-h2">We don&rsquo;t replace anything. We get you ready.</h2>
                <p className="lp-lead">
                  You keep using ClassWallet exactly as you do today. ClearClaim is the preparation step in front of
                  it — so what you submit is complete the first time.
                </p>
              </div>
              <div>
                <Lane k="ClassWallet">Holds your EFA funds, receives the submission, and pays the reimbursement.</Lane>
                <Lane k="ClearClaim">Checks eligibility, keeps the receipts, and builds the packet you submit.</Lane>
                <Lane k="Never us">Your money, your account numbers, and the submit button. Those stay with you.</Lane>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- how it works ---------- */}
      <section className="lp-section lp-paper" id="how">
        <div className="lp-wrap">
          <div className="lp-section-head">
            <p className="lp-kicker">How it works</p>
            <h2 className="lp-h2">From receipt to reimbursement in three steps</h2>
            <p className="lp-lead">Set it up once. Stay organized all year.</p>
          </div>
          <div className="lp-steps">
            <Step n="1" title="Add your students">
              A minute of setup — first name and grade, nothing sensitive. No account or bank numbers, ever.
            </Step>
            <Step n="2" title="File receipts as you go">
              Snap a photo, tag the student, done. Check eligibility first whenever you&rsquo;re not sure something
              qualifies.
            </Step>
            <Step n="3" title="Build the packet and submit">
              One clean PDF with everything a reviewer needs. You submit it in ClassWallet — we never do that for you.
            </Step>
          </div>
        </div>
      </section>

      {/* ---------- final CTA ---------- */}
      <section className="lp-final">
        <div className="lp-wrap">
          <h2 className="lp-h2">Get your claims ready to approve.</h2>
          <p className="lp-lead">Free during our research preview. Set up takes a few minutes.</p>
          <div className="lp-ctas">
            <a className="lp-btn lp-btn-gold lp-btn-lg" href={`${APP}/login`}>Create your free account</a>
            <a className="lp-btn lp-btn-light lp-btn-lg" href={`${APP}/login`}>Log in</a>
          </div>
          <p className="lp-final-note">Built with Arkansas EFA families during our research preview.</p>
        </div>
      </section>

      {/* ---------- footer ---------- */}
      <footer className="lp-foot">
        <div className="lp-wrap">
          <div className="lp-foot-top">
            <img className="lp-logo" src="/wordmark.png" alt="ClearClaim" />
            <div className="lp-foot-links">
              <Link href="/terms">Terms &amp; full disclaimer</Link>
              <a href={`${APP}/login`}>Log in</a>
            </div>
          </div>
          <p className="lp-foot-place">
            <IconPin />
            <span>Designed and built in Northwest Arkansas, alongside the families who use it.</span>
          </p>
          <p className="lp-disc">
            ClearClaim is an independent tool and is not affiliated with, endorsed by, or connected to ClassWallet, the
            Arkansas Department of Education, or any state EFA or ESA program. It does not guarantee approval or
            reimbursement and is not legal, tax, or financial advice.
          </p>
          <p className="lp-foot-legal">© {new Date().getFullYear()} ClearClaim</p>
        </div>
      </footer>
    </div>
  );
}
