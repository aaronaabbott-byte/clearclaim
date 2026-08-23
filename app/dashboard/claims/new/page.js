import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ClaimBuilder from "../builder";

export default async function NewClaim({ searchParams }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: kids } = await supabase.from("kids").select("*").order("created_at");
  const { data: claims } = await supabase.from("claims").select("id,kid_id,category,amount,date,created_at");
  const initialItems = (searchParams?.items || "").toString();
  const initialNote = (searchParams?.note || "").toString();

  return (
    <>
      <header>
        <img src="/icon.png" alt="" width="38" height="38" style={{ borderRadius: 10, background: "#fff", padding: 3 }} />
        <h1>ClearClaim</h1>
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
