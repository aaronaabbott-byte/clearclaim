import { createAdminClient } from "@/lib/supabase/admin";
import { invoiceTotals, lineTotal } from "@/lib/invoice";
import PrintButton from "../print-button";

export const dynamic = "force-dynamic";

const money = (n) => `$${(Number(n) || 0).toFixed(2)}`;
const esc = (s) => String(s ?? "");

function NotFound({ msg }) {
  return (
    <div style={{ fontFamily: "-apple-system,Segoe UI,Roboto,sans-serif", maxWidth: 520, margin: "12vh auto", padding: "0 20px", color: "#1f2a44" }}>
      <h1 style={{ fontSize: 20 }}>This link isn't available</h1>
      <p style={{ color: "#5b667d" }}>{msg}</p>
      <p style={{ color: "#5b667d" }}>Ask whoever shared it to send a fresh link.</p>
    </div>
  );
}

const SECTIONS = [
  ["description", "Description"], ["objectives", "Learning objectives"], ["standards", "Standards & skills"],
  ["methods", "Instructional methods"], ["materials", "Materials"], ["schedule", "Schedule"],
  ["assessment", "Assessment"], ["resources", "Resources"],
];

export default async function SharedDoc({ params }) {
  const token = String(params?.token || "");
  const admin = createAdminClient();
  if (!admin) return <NotFound msg="Sharing isn't configured on this server." />;

  const { data: share } = await admin.from("doc_shares").select("kind, ref_id, revoked, user_id").eq("token", token).maybeSingle();
  if (!share) return <NotFound msg="The link is invalid." />;
  if (share.revoked) return <NotFound msg="The owner has turned this link off." />;

  const { data: profile } = await admin.from("profiles")
    .select("business_name, provider_name, credentials, contact_email, contact_phone, contact_website, logo_path")
    .eq("user_id", share.user_id).maybeSingle();

  let logoUrl = null;
  if (profile?.logo_path) {
    const { data } = await admin.storage.from("documents").createSignedUrl(profile.logo_path, 3600);
    logoUrl = data?.signedUrl || null;
  }

  const contactLine = [profile?.contact_email, profile?.contact_phone, profile?.contact_website].filter(Boolean).join("   ·   ");
  const sub = [profile?.provider_name, profile?.credentials].filter(Boolean).join(", ");

  const page = {
    fontFamily: "Georgia, 'Times New Roman', serif", color: "#1f2530", background: "#fff",
    maxWidth: 760, margin: "0 auto", padding: "40px 44px", lineHeight: 1.5,
  };

  const Letterhead = (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 16, borderBottom: "2px solid #16324e", paddingBottom: 14, marginBottom: 22 }}>
      {logoUrl && <img src={logoUrl} alt="" style={{ height: 54, maxWidth: 180, objectFit: "contain" }} />}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: "#16324e" }}>{esc(profile?.business_name || "Provider")}</div>
        {sub && <div style={{ fontFamily: "-apple-system,Segoe UI,sans-serif", fontSize: 13, color: "#45506a" }}>{esc(sub)}</div>}
        {contactLine && <div style={{ fontFamily: "-apple-system,Segoe UI,sans-serif", fontSize: 12.5, color: "#6b7280", marginTop: 2 }}>{esc(contactLine)}</div>}
      </div>
    </div>
  );

  let body = null;

  if (share.kind === "invoice") {
    const { data: inv } = await admin.from("invoices").select("*").eq("id", share.ref_id).maybeSingle();
    if (!inv) return <NotFound msg="The invoice could not be found." />;
    const t = invoiceTotals(inv);
    body = (
      <>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 26, fontWeight: 700, color: "#16324e", letterSpacing: ".04em" }}>INVOICE</div>
            {inv.invoice_no && <div style={{ fontFamily: "-apple-system,sans-serif", fontSize: 13, color: "#45506a" }}>#{esc(inv.invoice_no)}</div>}
            {inv.invoice_date && <div style={{ fontFamily: "-apple-system,sans-serif", fontSize: 13, color: "#45506a" }}>{esc(inv.invoice_date)}</div>}
          </div>
          <div style={{ fontFamily: "-apple-system,sans-serif", fontSize: 13, textAlign: "right" }}>
            <div style={{ color: "#6b7280" }}>Bill to</div>
            <div style={{ fontWeight: 600 }}>{esc(inv.parent_name || inv.student_name || "—")}</div>
            {inv.student_name && inv.parent_name && <div style={{ color: "#45506a" }}>Student: {esc(inv.student_name)}</div>}
          </div>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "-apple-system,sans-serif", fontSize: 13.5 }}>
          <thead>
            <tr style={{ background: "#faf8f3", borderBottom: "1px solid #e2ddd0" }}>
              <th style={{ textAlign: "left", padding: "8px 10px" }}>Description</th>
              <th style={{ textAlign: "right", padding: "8px 10px", width: 50 }}>Qty</th>
              <th style={{ textAlign: "right", padding: "8px 10px", width: 90 }}>Unit</th>
              <th style={{ textAlign: "right", padding: "8px 10px", width: 100 }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {(inv.items || []).map((it, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "8px 10px" }}>{esc(it.desc)}</td>
                <td style={{ padding: "8px 10px", textAlign: "right" }}>{esc(it.qty)}</td>
                <td style={{ padding: "8px 10px", textAlign: "right" }}>{money(it.unit_price)}</td>
                <td style={{ padding: "8px 10px", textAlign: "right" }}>{money(lineTotal(it))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
          <table style={{ fontFamily: "-apple-system,sans-serif", fontSize: 13.5 }}>
            <tbody>
              <tr><td style={{ padding: "3px 14px", color: "#6b7280" }}>Subtotal</td><td style={{ padding: "3px 0", textAlign: "right" }}>{money(t.subtotal)}</td></tr>
              {t.shipping > 0 && <tr><td style={{ padding: "3px 14px", color: "#6b7280" }}>Shipping</td><td style={{ padding: "3px 0", textAlign: "right" }}>{money(t.shipping)}</td></tr>}
              {t.tax > 0 && <tr><td style={{ padding: "3px 14px", color: "#6b7280" }}>Tax</td><td style={{ padding: "3px 0", textAlign: "right" }}>{money(t.tax)}</td></tr>}
              <tr style={{ borderTop: "2px solid #16324e" }}><td style={{ padding: "6px 14px", fontWeight: 700, color: "#16324e" }}>Total</td><td style={{ padding: "6px 0", textAlign: "right", fontWeight: 700, color: "#16324e" }}>{money(t.total)}</td></tr>
            </tbody>
          </table>
        </div>

        {inv.notes && <p style={{ fontFamily: "-apple-system,sans-serif", fontSize: 13, color: "#45506a", marginTop: 20, whiteSpace: "pre-wrap" }}>{esc(inv.notes)}</p>}
      </>
    );
  } else {
    const { data: syl } = await admin.from("syllabi").select("*").eq("id", share.ref_id).maybeSingle();
    if (!syl) return <NotFound msg="The document could not be found." />;
    const meta = [syl.subject, syl.grade ? `Grade ${syl.grade}` : null, syl.term, syl.instructor].filter(Boolean).join("   ·   ");
    body = (
      <>
        <div style={{ fontSize: 25, fontWeight: 700, color: "#16324e", marginBottom: 2 }}>{esc(syl.title || syl.subject || "Course document")}</div>
        {meta && <div style={{ fontFamily: "-apple-system,sans-serif", fontSize: 13, color: "#45506a", marginBottom: 18 }}>{esc(meta)}</div>}
        {SECTIONS.filter(([k]) => (syl[k] || "").toString().trim()).map(([k, label]) => (
          <div key={k} style={{ marginBottom: 16 }}>
            <div style={{ fontFamily: "-apple-system,sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "#16324e", marginBottom: 4 }}>{label}</div>
            <div style={{ fontFamily: "-apple-system,sans-serif", fontSize: 14, color: "#2a3140", whiteSpace: "pre-wrap" }}>{esc(syl[k])}</div>
          </div>
        ))}
      </>
    );
  }

  return (
    <div style={{ background: "#eef1f5", minHeight: "100vh", padding: "16px 0" }}>
      <style>{`@media print { body { background:#fff } .no-print { display:none !important } .sheet { box-shadow:none !important; margin:0 !important } }`}</style>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "0 12px 10px", display: "flex", justifyContent: "flex-end" }}>
        <PrintButton />
      </div>
      <div className="sheet" style={{ ...page, boxShadow: "0 6px 24px rgba(20,30,45,.12)", borderRadius: 4 }}>
        {Letterhead}
        {body}
        <p className="no-print" style={{ fontFamily: "-apple-system,sans-serif", fontSize: 11.5, color: "#9aa3b2", marginTop: 28, borderTop: "1px solid #eee", paddingTop: 10 }}>
          Shared with you via ClearClaim. Print or save this page as a PDF to file it with your education program.
        </p>
      </div>
    </div>
  );
}
