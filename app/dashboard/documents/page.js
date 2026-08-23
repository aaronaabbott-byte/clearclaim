import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DocumentLibrary from "./library";

export default async function Documents() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: kids } = await supabase.from("kids").select("id,first_name")
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });
  const { data: documents } = await supabase.from("documents").select("*").order("created_at", { ascending: false });

  return (
    <>
      <header>
        <img src="/wordmark.png" alt="ClearClaim" height="30" style={{ background: "#fff", borderRadius: 10, padding: "5px 10px", display: "block" }} />
        <span className="spacer" />
        <Link href="/dashboard"><button style={{ background: "#ffffff1a", color: "#fff", borderColor: "#ffffff40" }}>← Dashboard</button></Link>
      </header>
      <main>
        <DocumentLibrary userId={user.id} kids={kids || []} documents={documents || []} />
      </main>
    </>
  );
}
