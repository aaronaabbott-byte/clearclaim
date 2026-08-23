import Link from "next/link";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/profile";
import ProviderProfileForm from "@/app/dashboard/provider-profile";

export const dynamic = "force-dynamic";

export default async function ProviderSetup() {
  const { user, profile } = await getProfile();
  if (!user) redirect("/login");

  return (
    <>
      <header>
        <img src="/wordmark.png" alt="ClearClaim" height="46" style={{ background: "#fff", borderRadius: 10, padding: "6px 13px", display: "block" }} />
        <span className="spacer" />
        <Link href="/provider"><button style={{ background: "#ffffff1a", color: "#fff", borderColor: "#ffffff40" }}>Skip for now →</button></Link>
      </header>
      <main>
        <div className="card">
          <h2>Set up your business profile</h2>
          <p className="muted sans" style={{ fontSize: 14, marginTop: -4, marginBottom: 12 }}>
            This becomes the letterhead on every course document you create — logo, business name, your name and
            credentials, and contact info. You can change it any time in Settings.
          </p>
          <ProviderProfileForm profile={profile} userId={user.id} redirectTo="/provider" />
        </div>
      </main>
    </>
  );
}
