import Link from "next/link";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/profile";
import ClassEditor from "@/app/provider/class-editor";

export const dynamic = "force-dynamic";

function parseServices(s) {
  return (s || "").split(/[\n,]+/).map(x => x.trim()).filter(Boolean);
}

export default async function NewClass() {
  const { user, profile } = await getProfile();
  if (!user) redirect("/login");
  if (!profile?.is_provider) redirect("/dashboard");

  return (
    <>
      <header>
        <img src="/wordmark-white.png" alt="ClearClaim" height="56" style={{ display: "block" }} />
        <span className="spacer" />
        <Link href="/provider"><button style={{ background: "#ffffff1a", color: "#fff", borderColor: "#ffffff40" }}>← Provider</button></Link>
      </header>
      <main>
        <ClassEditor userId={user.id} services={parseServices(profile.services)} />
      </main>
    </>
  );
}
