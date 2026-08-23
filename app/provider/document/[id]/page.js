import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";
import SyllabusBuilder from "@/app/dashboard/syllabus/builder";

export const dynamic = "force-dynamic";

export default async function EditProviderDoc({ params }) {
  const { user, profile } = await getProfile();
  if (!user) redirect("/login");
  if (!profile?.is_provider) redirect("/dashboard");

  const supabase = createClient();
  const { data: existing } = await supabase.from("syllabi").select("*").eq("id", params.id).single();
  if (!existing) notFound();

  return (
    <>
      <header>
        <img src="/wordmark-white.png" alt="ClearClaim" height="56" style={{ display: "block" }} />
        <span className="spacer" />
        <Link href="/provider"><button style={{ background: "#ffffff1a", color: "#fff", borderColor: "#ffffff40" }}>← Provider</button></Link>
      </header>
      <main>
        <SyllabusBuilder userId={user.id} existing={existing} provider={profile} providerMode />
      </main>
    </>
  );
}
