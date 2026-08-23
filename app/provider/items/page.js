import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";
import ItemsEditor from "@/app/provider/items-editor";

export const dynamic = "force-dynamic";

export default async function ProviderItems() {
  const { user, profile } = await getProfile();
  if (!user) redirect("/login");
  if (!profile?.is_provider) redirect("/dashboard");
  const supabase = createClient();
  const { data: items } = await supabase.from("provider_items").select("*").order("created_at");

  return (
    <>
      <header>
        <img src="/wordmark.png" alt="ClearClaim" height="46" style={{ background: "#fff", borderRadius: 10, padding: "6px 13px", display: "block" }} />
        <span className="spacer" />
        <Link href="/provider"><button style={{ background: "#ffffff1a", color: "#fff", borderColor: "#ffffff40" }}>← Provider</button></Link>
      </header>
      <main>
        <div className="card">
          <h2>Products & services</h2>
          <p className="muted sans" style={{ fontSize: 14, marginTop: -4, marginBottom: 12 }}>
            Save the things you charge for once. Then you can drop them into any invoice with a tap instead of typing them each time.
          </p>
          <ItemsEditor userId={user.id} initial={items || []} />
        </div>
      </main>
    </>
  );
}
