import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ReceiptVault from "./receipt-vault";

export const dynamic = "force-dynamic";

export default async function Receipts() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: kids } = await supabase.from("kids").select("id,first_name,grade")
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });
  const { data: receipts } = await supabase.from("receipts").select("*").order("created_at", { ascending: false });

  return (
    <>
      <header>
        <img src="/wordmark-white.png" alt="ClearClaim" height="56" style={{ display: "block" }} />
        <span className="spacer" />
        <Link href="/dashboard"><button style={{ background: "#ffffff1a", color: "#fff", borderColor: "#ffffff40" }}>← Dashboard</button></Link>
      </header>
      <main>
        <div className="card" style={{ borderColor: "var(--navy2)", background: "linear-gradient(180deg,#f2f6fb,#fff)" }}>
          <h2 style={{ margin: 0 }}>Receipt vault</h2>
          <p className="muted sans" style={{ fontSize: 14, marginTop: 8 }}>
            Your sorted shoebox. File receipts by student as you get them, track what's been claimed, and pull them
            into a claim when you're ready — no more scrambling at submission time.
          </p>
        </div>
        {(!kids || kids.length === 0)
          ? <div className="card"><p className="sans" style={{ fontSize: 14 }}>Add a student first, then start filing receipts.</p></div>
          : <ReceiptVault userId={user.id} kids={kids} initialReceipts={receipts || []} />}
      </main>
    </>
  );
}
