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

const TIPS = [
  "The receipt must show a real date, not 'Today', plus the store name and the payment method.",
  "Always include a proof-of-payment screenshot, and it is essentially required for PayPal orders.",
  "If you need to cancel a request, use the cancel option on that request. Be careful not to cancel a tuition payment request, which lives in the same list.",
];

export default async function SubmitSteps() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <>
      <header>
        <img src="/wordmark.png" alt="ClearClaim" height="30" style={{ background: "#fff", borderRadius: 10, padding: "5px 10px", display: "block" }} />
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

          <h3 className="sans" style={{ fontFamily: "var(--serif)", fontSize: 17, color: "var(--navy)", marginTop: 6 }}>A few things that prevent rejections</h3>
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
