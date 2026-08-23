import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Redactor from "./redactor";

export default async function Redact() {
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
        <Redactor userId={user.id} />
      </main>
    </>
  );
}
