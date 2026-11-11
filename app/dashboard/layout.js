import AskAnn from "./ann";
import UpdateModal from "./update-modal";
import { userPlan } from "@/lib/plan";

// Wraps every /dashboard/* page. Ask Ann (AI) shows only for Family-plan accounts.
// UpdateModal is a one-time "what's new" popup (shows once per browser).
export default async function DashboardLayout({ children }) {
  const { plan } = await userPlan();
  return (
    <>
      {children}
      {plan.family && <AskAnn />}
      <UpdateModal />
    </>
  );
}
