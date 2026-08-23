import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ClaimBuilder from "../builder";

export default async function NewClaim({ searchParams }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: kids } = await supabase.from("kids").select("*")
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });
  const { data: claims } = await supabase.from("claims").select("id,kid_id,category,amount,date,created_at");
  const initialItems = (searchParams?.items || "").toString();
  const initialNote = (searchParams?.note || "").toString();

  return (
    <>
      <header>
        <img src="/wordmark.png" alt="ClearClaim" height="46" style={{ background: "#fff", borderRadius: 10, padding: "6px 13px", display: "block" }} />
        <span className="spacer" />
        <Link href="/dashboard"><button style={{ background: "#ffffff1a", color: "#fff", borderColor: "#ffffff40" }}>← Dashboard</button></Link>
      </header>
      <main>
        <ClaimBuilder kids={kids || []} userId={user.id} claims={claims || []}
          initialItems={initialItems} initialNote={initialNote} />
      </main>
    </>
  );
}
