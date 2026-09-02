import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";
import { VENDOR_COUNT, VENDOR_UPDATED } from "@/lib/vendors";
import VendorSearch from "./search";

export default async function VendorsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  // The vendor directory is the Arkansas ClassWallet list, so it's Arkansas-only.
  const { stateConfig } = await getProfile();
  if (!stateConfig?.features?.vendorDirectory) redirect("/dashboard");

  return (
    <>
      <header>
        <img src="/wordmark-white.png" alt="ClearClaim" height="56" style={{ display: "block" }} />
        <span className="spacer" />
        <Link href="/dashboard"><button style={{ background: "#ffffff1a", color: "#fff", borderColor: "#ffffff40" }}>← Dashboard</button></Link>
      </header>
      <main>
        <VendorSearch count={VENDOR_COUNT} updated={VENDOR_UPDATED} />
      </main>
    </>
  );
}
