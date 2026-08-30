import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStateConfig } from "@/lib/states";
import PrintButton from "./print-button";

// Arizona ESA submission walkthrough (the four ClassWallet spending methods).
const AZ_STEPS = [
  { t: "Pick how you'll pay", d: "ClassWallet gives you four ways to spend: Marketplace, Pay Vendor, Debit Card, and Reimbursement. Choose the one that fits the purchase." },
  { t: "Marketplace", d: "Order from a vendor inside the ClassWallet Marketplace. After ESA staff approve it, the order ships to the address on file." },
  { t: "Pay Vendor", d: "For a registered school or provider (tutor, therapist). Upload a complete invoice; ESA pays them directly, usually in 2–10 business days. No accreditation needed — registered vendors are already vetted." },
  { t: "Debit Card", d: "Use the ClassWallet prepaid card at point of sale, PayPal, or Square/Venmo. Keep every receipt and upload it (plus the tutor's credential, if any) by the quarterly deadline — miss it and you have to repay the purchase." },
  { t: "Reimbursement", d: "For things you paid out of pocket. Upload the itemized receipt AND proof of payment. An invoice alone is denied." },
  { t: "Categorize it", d: "Pick the one ESA category that fits from the allowable list. ClearClaim shows the categories for your state." },
  { t: "Attach the documentation", d: "Include everything under 'What every submission must show'. For supplemental material, attach a curriculum showing the item is required or recommended — ClearClaim's syllabus builder generates one." },
  { t: "Watch the deadline", d: "Upload receipts and documentation by the end of the month after the quarter. Late debit-card receipts must be repaid." },
];
const AZ_TIPS = [
  "Spend a portion across all five core subjects — reading, grammar, math, social studies, and science — for each student. Missing one can suspend the account.",
  "Supplemental material (instruments, PE and home-ec equipment, camps, memberships, event tickets) needs a curriculum showing it's required or recommended.",
  "Tutors and therapists need an accreditation or credential on file for Debit Card and Reimbursement — not for Pay Vendor. Screenshots aren't accepted.",
  "Memberships and subscriptions must be individual to your student — no family memberships, and online subscriptions must be itemized per student.",
  "Don't buy while enrolled in a public school, don't also take an STO or tax-credit scholarship the same year, don't resell ESA items, and don't pay yourself.",
];

const STEPS = [
  { t: "Before you start (one time per student)", d: "Each student needs a bank account linked in ClassWallet before any reimbursement, and you must accept that student's affidavit for the year. If you have not linked a bank account, do that first. You never share bank numbers with ClearClaim, and you enter them yourself in ClassWallet." },
  { t: "Log in and pick the student", d: "Sign in to ClassWallet. If you have more than one student, make sure you are in the right one, since reimbursements are per student." },
  { t: "Start a new reimbursement", d: "On the ClassWallet home, in the Reimbursements box, click START A NEW REIMBURSEMENT. This is the pathway for things you already paid for out of pocket. You will move through five steps: Add Details, Upload Images, Choose Purse, Review, then Complete." },
  { t: "Step 1, Add Details", d: "Enter the Store name and the Amount. If the receipt was split across students, enter only this student's portion, not the whole receipt total. That is expected, and your annotated packet shows which items are theirs. Click NEXT." },
  { t: "Step 2, Upload Images", d: "Drag and drop your ClearClaim packet, or click BROWSE FILES. The packet already has the itemized receipt and the proof of payment together, flattened and under the page limit. For textbooks, also attach the booklist. If ClearClaim split the packet into more than one file, upload all of them here. Click NEXT." },
  { t: "Step 3, Choose Purse", d: "Pick the ONE category that fits, for example Educational Supplies for supplies or Curriculum for textbooks. ClassWallet reminds you to choose only one per submission." },
  { t: "Step 4, Review", d: "Check everything, then paste your educational-use note into the Comments box. This is the short, specific explanation of how the student uses the items, and ClearClaim generated it for you." },
  { t: "Step 5, Complete", d: "Read the affidavit or certification, check it if it is accurate, and submit. This is the only legally binding step, and it is yours to do. ClearClaim never submits for you." },
  { t: "Confirm it posted", d: "The student's balance should drop by exactly the amount you submitted. One submission per receipt, so repeat these steps for each receipt and each student." },
];

const DOC_MATRIX = [
  ["Mileage to a class", "Mileage log, a Google Maps route screenshot, and proof of attendance."],
  ["Mileage to a field trip", "Mileage log, a Google Maps route screenshot, and a receipt or other proof of attendance."],
  ["Reimbursement to a vendor", "Receipt showing a $0 balance (paid in full), plus a note on how it fits the student's educational goals."],
  ["Reimbursement to a non-vendor", "Receipt showing a $0 balance, plus a secondary proof of payment (a bank or card statement screenshot)."],
  ["Reimbursement of supplies", "Receipt showing a $0 balance — circle the last four of the card if it's clearly shown, otherwise add a secondary proof of payment — plus how the supplies are used or proof the curriculum requires them."],
  ["Reimbursement of curriculum", "Receipt showing a $0 balance. If the card info isn't clear enough to circle or highlight, add a secondary proof of payment."],
  ["Field trip reimbursement", "Confirm the trip is on the approved trip list first (get it added if not; pre-approval is usually needed if it isn't a vendor). Receipt with a $0 balance and the card info circled, or a secondary proof of payment if the card isn't visible."],
  ["Direct Pay — a service", "Link the vendor with a payment request when you can. Otherwise a precise invoice with the student's name, service date, line-item descriptions, and the charge per service. Check whether it's co-curricular or extracurricular first."],
  ["Direct Pay / Marketplace — a product", "Link the vendor with a payment request when you can. Otherwise a precise invoice with each item described, plus proof of need — a curriculum supply list, or how the item meets specific learning objectives."],
];

// Baseline documentation ClassWallet requires on every submission, per the EFA
// program guidance. Reimbursement receipts must also prove payment; direct-pay
// invoices don't (they aren't paid yet).
const RECEIPT_REQ = [
  "Vendor's name",
  "Student's name (required for services)",
  "A clear name or description of the expense",
  "Itemized prices and a total",
  "Confirmation of payment (method, amount paid, etc.)",
  "Date of payment",
];
const INVOICE_REQ = [
  "Vendor's name",
  "Student's name (required for services)",
  "A clear name or description of the expense",
  "Itemized prices and a total",
];

const TIPS = [
  "The receipt must show a real date, not 'Today', plus the store name and the payment method.",
  "Always include a proof-of-payment screenshot, and it is essentially required for PayPal orders.",
  "For services, tutoring, and Direct Pay, families report the student's name should be on the invoice — put it in the vendor's \"company\" field or ask the provider to add it. For physical supplies you buy yourself, a receipt with your name and the student's address is generally accepted. This is reported practice, not a written rule, and the Department decides.",
  "If you need to cancel a request, use the cancel option on that request. Be careful not to cancel a tuition payment request, which lives in the same list.",
];

// Utah Fits All submission walkthrough (Odyssey — not ClassWallet).
const UT_STEPS = [
  { t: "Pick how you'll pay", d: "Utah Fits All runs on Odyssey. It offers three ways to spend: the Odyssey Marketplace, Reimbursement, and Pay a Provider. Choose the one that fits the purchase." },
  { t: "Marketplace", d: "Order pre-approved items and offerings inside the Odyssey Marketplace — the simplest path since eligibility is already checked." },
  { t: "Reimbursement", d: "Paid out of pocket? Upload the itemized receipt and proof of payment. The purchase/service date must fall within the scholarship year (July 1 – June 30)." },
  { t: "Pay a Provider", d: "For a school or provider (tutor, therapist, class). Upload a complete invoice that shows the service start and end dates." },
  { t: "Check eligibility first (optional)", d: "Not sure about an item? Submit an eligibility request / use Odyssey's Smart Assistant before you buy. Guidance is conditional until a receipt is reviewed." },
  { t: "Categorize it", d: "Pick the category that fits. ClearClaim shows Utah's categories." },
  { t: "Keep your student portfolio", d: "Utah Fits All expects families to keep a student portfolio — samples of the student's work over the year. Save it as you go." },
  { t: "Timing", d: "Complete reimbursement submissions are processed within about 10 business days, with payment within about 10 business days of approval." },
];
const UT_TIPS = [
  "Utah funds items that are inherently educational. A general-purpose item you happen to use for school (power tools, gym equipment, general electronics) usually isn't eligible.",
  "Instruments: rentals are eligible, purchases are not. Furniture (including desks), apparel and uniforms, and playground equipment are not eligible.",
  "Electronics have price caps: computers, printers, and tablets up to $1,500; monitors and cameras up to $500; headphones up to $200 — plus quantity caps.",
  "Extracurricular and physical-education spending are each capped at 20% of the student's scholarship. Transportation is fee-for-service to a provider, up to $750/year.",
  "Some ineligible items are set by Utah state code and can't be appealed; other general-purpose items can be appealed case-by-case through Odyssey.",
];

export default async function SubmitSteps() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: prof } = await supabase.from("profiles").select("state").eq("user_id", user.id).single();
  const cfg = getStateConfig(prof?.state);

  if (cfg.code === "UT") {
    return (
      <>
        <header>
          <img src="/wordmark-white.png" alt="ClearClaim" height="56" style={{ display: "block" }} />
          <span className="spacer" />
          <Link href="/dashboard"><button style={{ background: "#ffffff1a", color: "#fff", borderColor: "#ffffff40" }}>← Dashboard</button></Link>
        </header>
        <main>
          <div className="card">
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <h2 style={{ margin: 0 }}>How to submit on Odyssey · Utah Fits All</h2>
              <span className="spacer" />
              <PrintButton />
            </div>
            <p className="muted sans" style={{ fontSize: 14, marginTop: 8 }}>
              A walkthrough for submitting after you've built your packet in ClearClaim. Utah Fits All runs on Odyssey,
              not ClassWallet. This is a guide only, kept separate from your packet.
            </p>

            <ol style={{ listStyle: "none", padding: 0, marginTop: 16, counterReset: "s" }}>
              {UT_STEPS.map((s, i) => (
                <li key={i} style={{ display: "grid", gridTemplateColumns: "34px 1fr", gap: 12, marginBottom: 16 }}>
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--navy2)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontFamily: "var(--sans)", fontSize: 14 }}>{i + 1}</div>
                  <div>
                    <div className="sans" style={{ fontWeight: 700, fontSize: 15 }}>{s.t}</div>
                    <div className="sans" style={{ fontSize: 14, color: "var(--ink)", lineHeight: 1.55, marginTop: 2 }}>{s.d}</div>
                  </div>
                </li>
              ))}
            </ol>

            <h3 className="sans" style={{ fontFamily: "var(--serif)", fontSize: 17, color: "var(--navy)", marginTop: 6 }}>What every submission must show</h3>
            <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
              <div style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "12px 14px" }}>
                <div className="sans" style={{ fontWeight: 700, fontSize: 14, color: "var(--navy)" }}>Receipts (Reimbursement)</div>
                <ul className="sans" style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--ink)", margin: "6px 0 0", paddingLeft: 18 }}>
                  {cfg.docs.receipt.map((r, i) => <li key={i} style={{ marginBottom: 3 }}>{r}</li>)}
                </ul>
              </div>
              <div style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "12px 14px" }}>
                <div className="sans" style={{ fontWeight: 700, fontSize: 14, color: "var(--navy)" }}>Invoices (Pay a Provider)</div>
                <ul className="sans" style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--ink)", margin: "6px 0 0", paddingLeft: 18 }}>
                  {cfg.docs.invoice.map((r, i) => <li key={i} style={{ marginBottom: 3 }}>{r}</li>)}
                </ul>
              </div>
            </div>

            <h3 className="sans" style={{ fontFamily: "var(--serif)", fontSize: 17, color: "var(--navy)", marginTop: 18 }}>A few things that prevent rejections</h3>
            <ul className="sans" style={{ fontSize: 14, lineHeight: 1.6, color: "var(--ink)" }}>
              {UT_TIPS.map((t, i) => <li key={i} style={{ marginBottom: 6 }}>{t}</li>)}
            </ul>

            <p className="finenote" style={{ marginTop: 14 }}>
              ClearClaim is independent and not affiliated with Odyssey or the Utah State Board of Education. Steps can
              change as Odyssey and the Utah Fits All program update. The program manager makes the final decision on every claim.
            </p>
          </div>
        </main>
      </>
    );
  }

  if (cfg.code === "AZ") {
    return (
      <>
        <header>
          <img src="/wordmark-white.png" alt="ClearClaim" height="56" style={{ display: "block" }} />
          <span className="spacer" />
          <Link href="/dashboard"><button style={{ background: "#ffffff1a", color: "#fff", borderColor: "#ffffff40" }}>← Dashboard</button></Link>
        </header>
        <main>
          <div className="card">
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <h2 style={{ margin: 0 }}>How to submit on ClassWallet · Arizona ESA</h2>
              <span className="spacer" />
              <PrintButton />
            </div>
            <p className="muted sans" style={{ fontSize: 14, marginTop: 8 }}>
              A walkthrough for submitting after you've built your packet in ClearClaim. This is a guide only, kept
              separate from your packet so it never gets uploaded with your claim.
            </p>

            <ol style={{ listStyle: "none", padding: 0, marginTop: 16, counterReset: "s" }}>
              {AZ_STEPS.map((s, i) => (
                <li key={i} style={{ display: "grid", gridTemplateColumns: "34px 1fr", gap: 12, marginBottom: 16 }}>
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--navy2)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontFamily: "var(--sans)", fontSize: 14 }}>{i + 1}</div>
                  <div>
                    <div className="sans" style={{ fontWeight: 700, fontSize: 15 }}>{s.t}</div>
                    <div className="sans" style={{ fontSize: 14, color: "var(--ink)", lineHeight: 1.55, marginTop: 2 }}>{s.d}</div>
                  </div>
                </li>
              ))}
            </ol>

            <h3 className="sans" style={{ fontFamily: "var(--serif)", fontSize: 17, color: "var(--navy)", marginTop: 6 }}>What every submission must show</h3>
            <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
              <div style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "12px 14px" }}>
                <div className="sans" style={{ fontWeight: 700, fontSize: 14, color: "var(--navy)" }}>Receipts (Debit Card / Reimbursement)</div>
                <ul className="sans" style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--ink)", margin: "6px 0 0", paddingLeft: 18 }}>
                  {cfg.docs.receipt.map((r, i) => <li key={i} style={{ marginBottom: 3 }}>{r}</li>)}
                </ul>
              </div>
              <div style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "12px 14px" }}>
                <div className="sans" style={{ fontWeight: 700, fontSize: 14, color: "var(--navy)" }}>Invoices (Pay Vendor)</div>
                <ul className="sans" style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--ink)", margin: "6px 0 0", paddingLeft: 18 }}>
                  {cfg.docs.invoice.map((r, i) => <li key={i} style={{ marginBottom: 3 }}>{r}</li>)}
                </ul>
              </div>
            </div>

            <h3 className="sans" style={{ fontFamily: "var(--serif)", fontSize: 17, color: "var(--navy)", marginTop: 18 }}>Documentation deadlines</h3>
            <p className="muted sans" style={{ fontSize: 13.5, marginTop: 2, marginBottom: 8 }}>
              Upload receipts and documentation by the end of the month after each quarter, or you may have to repay the purchase.
            </p>
            <div style={{ display: "grid", gap: 6 }}>
              {(cfg.deadlines || []).map(d => (
                <div key={d.q} className="sans" style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, border: "1px solid var(--line)", borderRadius: 10, padding: "9px 12px" }}>
                  <span style={{ fontSize: 13.5 }}>Quarter {d.q} · {d.dates}</span>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--navy)" }}>Due {d.due}</span>
                </div>
              ))}
            </div>

            <h3 className="sans" style={{ fontFamily: "var(--serif)", fontSize: 17, color: "var(--navy)", marginTop: 18 }}>Curriculum documentation</h3>
            <p className="sans" style={{ fontSize: 14, lineHeight: 1.6, color: "var(--ink)" }}>
              Supplemental material must be tied to a curriculum. The curriculum you attach should show the student's name,
              the course of study, learning objectives, the method of teaching and lesson plans, and the item as required or
              recommended material. ClearClaim's syllabus builder produces exactly this.
            </p>

            <h3 className="sans" style={{ fontFamily: "var(--serif)", fontSize: 17, color: "var(--navy)", marginTop: 18 }}>A few things that prevent rejections</h3>
            <ul className="sans" style={{ fontSize: 14, lineHeight: 1.6, color: "var(--ink)" }}>
              {AZ_TIPS.map((t, i) => <li key={i} style={{ marginBottom: 6 }}>{t}</li>)}
            </ul>

            <p className="finenote" style={{ marginTop: 14 }}>
              ClearClaim is independent and not affiliated with ClassWallet or the Arizona Department of Education. Steps
              can change as ClassWallet and the ESA program update. The Department makes the final decision on every claim.
            </p>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <header>
        <img src="/wordmark-white.png" alt="ClearClaim" height="56" style={{ display: "block" }} />
        <span className="spacer" />
        <Link href="/dashboard"><button style={{ background: "#ffffff1a", color: "#fff", borderColor: "#ffffff40" }}>← Dashboard</button></Link>
      </header>
      <main>
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h2 style={{ margin: 0 }}>How to submit on ClassWallet</h2>
            <span className="spacer" />
            <PrintButton />
          </div>
          <p className="muted sans" style={{ fontSize: 14, marginTop: 8 }}>
            A walkthrough for submitting a reimbursement after you have built your packet in ClearClaim. This is a
            guide only. It is kept separate from your packet on purpose, so it never gets uploaded with your claim.
          </p>

          <ol style={{ listStyle: "none", padding: 0, marginTop: 16, counterReset: "s" }}>
            {STEPS.map((s, i) => (
              <li key={i} style={{ display: "grid", gridTemplateColumns: "34px 1fr", gap: 12, marginBottom: 16 }}>
                <div style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--navy2)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontFamily: "var(--sans)", fontSize: 14 }}>{i + 1}</div>
                <div>
                  <div className="sans" style={{ fontWeight: 700, fontSize: 15 }}>{s.t}</div>
                  <div className="sans" style={{ fontSize: 14, color: "var(--ink)", lineHeight: 1.55, marginTop: 2 }}>{s.d}</div>
                </div>
              </li>
            ))}
          </ol>

          <h3 className="sans" style={{ fontFamily: "var(--serif)", fontSize: 17, color: "var(--navy)", marginTop: 6 }}>What every submission must show</h3>
          <p className="muted sans" style={{ fontSize: 13.5, marginTop: 2, marginBottom: 8 }}>
            Whatever the expense, ClassWallet requires this information to be present on your documentation before it
            can be approved. Some expenses need more (for example, a photo of the curriculum an item supports), but
            these are the baseline.
          </p>
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
            <div style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "12px 14px" }}>
              <div className="sans" style={{ fontWeight: 700, fontSize: 14, color: "var(--navy)" }}>Receipts (for reimbursement)</div>
              <ul className="sans" style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--ink)", margin: "6px 0 0", paddingLeft: 18 }}>
                {RECEIPT_REQ.map((r, i) => <li key={i} style={{ marginBottom: 3 }}>{r}</li>)}
              </ul>
            </div>
            <div style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "12px 14px" }}>
              <div className="sans" style={{ fontWeight: 700, fontSize: 14, color: "var(--navy)" }}>Invoices (for direct pay)</div>
              <ul className="sans" style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--ink)", margin: "6px 0 0", paddingLeft: 18 }}>
                {INVOICE_REQ.map((r, i) => <li key={i} style={{ marginBottom: 3 }}>{r}</li>)}
              </ul>
              <p className="finenote" style={{ marginTop: 8 }}>An invoice isn't paid yet, so it doesn't need proof of payment or a payment date.</p>
            </div>
          </div>

          <h3 className="sans" style={{ fontFamily: "var(--serif)", fontSize: 17, color: "var(--navy)", marginTop: 18 }}>What to attach, by submission type</h3>
          <div style={{ display: "grid", gap: 8, marginTop: 6 }}>
            {DOC_MATRIX.map(([type, docs], i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "minmax(160px, 220px) 1fr", gap: 12, border: "1px solid var(--line)", borderRadius: 10, padding: "9px 12px", alignItems: "start" }}>
                <div className="sans" style={{ fontWeight: 700, fontSize: 13.5, color: "var(--navy)" }}>{type}</div>
                <div className="sans" style={{ fontSize: 13.5, color: "var(--ink)", lineHeight: 1.5 }}>{docs}</div>
              </div>
            ))}
          </div>

          <h3 className="sans" style={{ fontFamily: "var(--serif)", fontSize: 17, color: "var(--navy)", marginTop: 18 }}>A few things that prevent rejections</h3>
          <ul className="sans" style={{ fontSize: 14, lineHeight: 1.6, color: "var(--ink)" }}>
            {TIPS.map((t, i) => <li key={i} style={{ marginBottom: 6 }}>{t}</li>)}
          </ul>

          <p className="finenote" style={{ marginTop: 14 }}>
            ClearClaim is independent and not affiliated with ClassWallet or the Department. Steps can change as
            ClassWallet updates its site. The Department makes the final decision on every claim.
          </p>
        </div>
      </main>
    </>
  );
}
