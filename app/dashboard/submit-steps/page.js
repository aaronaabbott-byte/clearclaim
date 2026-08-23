import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PrintButton from "./print-button";

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

const TIPS = [
  "The receipt must show a real date, not 'Today', plus the store name and the payment method.",
  "Always include a proof-of-payment screenshot, and it is essentially required for PayPal orders.",
  "For services, tutoring, and Direct Pay, families report the student's name should be on the invoice — put it in the vendor's \"company\" field or ask the provider to add it. For physical supplies you buy yourself, a receipt with your name and the student's address is generally accepted. This is reported practice, not a written rule, and the Department decides.",
  "If you need to cancel a request, use the cancel option on that request. Be careful not to cancel a tuition payment request, which lives in the same list.",
];

export default async function SubmitSteps() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <>
      <header>
        <img src="/wordmark.png" alt="ClearClaim" height="46" style={{ background: "#fff", borderRadius: 10, padding: "6px 13px", display: "block" }} />
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

          <h3 className="sans" style={{ fontFamily: "var(--serif)", fontSize: 17, color: "var(--navy)", marginTop: 6 }}>What to attach, by submission type</h3>
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
