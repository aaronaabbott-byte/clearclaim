import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";
import ClassEditor from "@/app/provider/class-editor";

export const dynamic = "force-dynamic";

function parseServices(s) {
  return (s || "").split(/[\n,]+/).map(x => x.trim()).filter(Boolean);
}

export default async function EditClass({ params }) {
  const { user, profile } = await getProfile();
  if (!user) redirect("/login");
  if (!profile?.is_provider) redirect("/dashboard");

  const supabase = createClient();
  const { data: existing } = await supabase.from("classes").select("*").eq("id", params.id).single();
  if (!existing) notFound();

  return (
    <>
      <header>
        <img src="/wordmark-white.png" alt="ClearClaim" height="42" style={{ display: "block" }} />
        <span className="spacer" />
        <Link href="/provider"><button style={{ background: "#ffffff1a", color: "#fff", borderColor: "#ffffff40" }}>← Provider</button></Link>
      </header>
      <main>
        <ClassEditor userId={user.id} existing={existing} services={parseServices(profile.services)} />
      </main>
    </>
  );
}
