import Link from "next/link";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/profile";

export const dynamic = "force-dynamic";

// After login, accounts with BOTH roles pick which side to work in. Single-role
// accounts skip straight through to the right area.
export default async function Choose() {
  const { user, profile } = await getProfile();
  if (!user) redirect("/login");
  const isParent = profile?.is_parent ?? true;
  const isProvider = profile?.is_provider ?? false;
  if (!(isParent && isProvider)) redirect(isProvider ? "/provider" : "/dashboard");

  const Card = ({ href, emoji, title, desc }) => (
    <Link href={href} style={{ textDecoration: "none", color: "inherit", flex: 1, minWidth: 240 }}>
      <div className="card" style={{ textAlign: "center", padding: "34px 26px", height: "100%", transition: "border-color .15s ease, box-shadow .15s ease" }}>
        <div style={{ fontSize: 44, lineHeight: 1 }}>{emoji}</div>
        <h2 style={{ marginTop: 14 }}>{title}</h2>
        <p className="muted sans" style={{ fontSize: 14, margin: "6px 0 0" }}>{desc}</p>
        <div className="sans" style={{ marginTop: 16, color: "var(--navy2)", fontWeight: 700 }}>Continue →</div>
      </div>
    </Link>
  );

  return (
    <main style={{ maxWidth: 760, minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <div style={{ textAlign: "center", marginBottom: 22 }}>
        <img src="/wordmark.png" alt="ClearClaim" style={{ width: "min(260px,70%)", margin: "0 auto 8px" }} />
        <h2 style={{ margin: 0 }}>Where would you like to go?</h2>
        <p className="muted sans" style={{ fontSize: 14, marginTop: 6 }}>
          Your account has both. Pick one — you can switch anytime from the header.
        </p>
      </div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <Card href="/dashboard" emoji="🏡" title="Parent" desc="Your students, receipts, claims, and pre-approvals." />
        <Card href="/provider" emoji="🎓" title="Provider" desc="Your business profile, classes, documents, and invoices." />
      </div>
    </main>
  );
}
