import Link from "next/link";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/profile";
import SyllabusBuilder from "@/app/dashboard/syllabus/builder";

export const dynamic = "force-dynamic";

export default async function NewProviderDoc() {
  const { user, profile } = await getProfile();
  if (!user) redirect("/login");
  if (!profile?.is_provider) redirect("/dashboard");

  return (
    <>
      <header>
        <img src="/wordmark-white.png" alt="ClearClaim" height="42" style={{ display: "block" }} />
        <span className="spacer" />
        <Link href="/provider"><button style={{ background: "#ffffff1a", color: "#fff", borderColor: "#ffffff40" }}>← Provider</button></Link>
      </header>
      <main>
        <SyllabusBuilder userId={user.id} provider={profile} providerMode />
      </main>
    </>
  );
}
