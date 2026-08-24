import Link from "next/link";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/profile";
import RedeemCode from "./redeem";
import { CheckoutButtons, ManageBilling } from "./plan-actions";

export const dynamic = "force-dynamic";

const FAMILY = ["Ask Ann, any time", "AI-drafted educational-use notes", "Smart eligibility with reasoning",
  "The full pre-approval tool + log", "Unlimited students", "Full receipt vault", "Syllabus builder", "Document redaction & annotation"];
const PROVIDER = ["Branded course documents on your letterhead", "Class roster with family contacts", "Invoice generator + saved products menu"];

function PlanCard({ title, price, per, features, active, accent, children }) {
  return (
    <div className="card" style={{ flex: 1, minWidth: 260, borderColor: accent ? "var(--gold)" : "var(--line)", borderWidth: accent ? 2 : 1, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <h2 style={{ margin: 0 }}>{title}</h2>
        {active && <span className="sans" style={{ fontSize: 12, fontWeight: 700, color: "var(--teal)" }}>✓ Active</span>}
      </div>
      <div className="sans" style={{ margin: "6px 0 12px" }}>
        <span style={{ fontSize: 26, fontWeight: 700, color: "var(--navy)" }}>{price}</span>
        <span className="muted" style={{ fontSize: 14 }}> {per}</span>
      </div>
      <ul className="sans" style={{ fontSize: 14, lineHeight: 1.7, paddingLeft: 18, margin: 0, color: "var(--ink)", flex: 1 }}>
        {features.map((f, i) => <li key={i}>{f}</li>)}
      </ul>
      {children}
    </div>
  );
}

export default async function Upgrade() {
  const { user, plan } = await getProfile();
  if (!user) redirect("/login");

  return (
    <>
      <header>
        <img src="/wordmark-white.png" alt="ClearClaim" height="56" style={{ display: "block" }} />
        <span className="spacer" />
        <Link href="/dashboard"><button style={{ background: "#ffffff1a", color: "#fff", borderColor: "#ffffff40" }}>← Dashboard</button></Link>
      </header>
      <main>
        <div className="card" style={{ textAlign: "center", background: "linear-gradient(180deg,#f2f6fb,#fff)", borderColor: "var(--navy2)" }}>
          <h2 style={{ margin: 0 }}>Unlock the full ClearClaim</h2>
          <p className="muted sans" style={{ fontSize: 14.5, maxWidth: 560, margin: "8px auto 0" }}>
            The free plan covers one student, up to 10 receipts, and the core tools. Upgrade for AI, unlimited students,
            and everything below.
          </p>
        </div>

        <div className="row" style={{ marginTop: 4 }}>
          <PlanCard title="Family" price="$10" per="/mo — or $99/yr (2 months free)" features={FAMILY} active={plan.family} accent>
            {plan.family ? <ManageBilling /> : <CheckoutButtons tier="family" monthly="$10" yearly="$99" />}
          </PlanCard>
          <PlanCard title="Provider" price="$19" per="/mo — or $189/yr (2 months free)" features={PROVIDER} active={plan.provider}>
            {plan.provider ? <ManageBilling /> : <CheckoutButtons tier="provider" monthly="$19" yearly="$189" />}
          </PlanCard>
        </div>

        <div className="card">
          <h2>Have an access code?</h2>
          <p className="muted sans" style={{ fontSize: 14, marginTop: -4, marginBottom: 12 }}>
            Enter it to unlock your plan right away — no card needed.
          </p>
          <RedeemCode />
        </div>

        <div className="card">
          <p className="sans" style={{ fontSize: 14, margin: 0 }}>
            Secure checkout is handled by Stripe — we never see your card number. Cancel anytime from Manage billing.
            Questions? Email{" "}
            <a href="mailto:clearclaimhelp@gmail.com" style={{ color: "var(--navy2)" }}>clearclaimhelp@gmail.com</a>.
          </p>
        </div>
      </main>
    </>
  );
}
