import AskAnn from "./ann";
import UpdateModal from "./update-modal";
import CsatPopup from "./csat-popup";
import { userPlan } from "@/lib/plan";

// Wraps every /dashboard/* page. Ask Ann (AI) shows only for Family-plan accounts.
// UpdateModal is a one-time "what's new" popup; CsatPopup is a periodic (~monthly)
// satisfaction prompt that waits until the what's-new popup has been seen.
export default async function DashboardLayout({ children }) {
  const { plan } = await userPlan();
  return (
    <>
      {children}
      {plan.family && <AskAnn />}
      <UpdateModal />
      <CsatPopup />
    </>
  );
}
