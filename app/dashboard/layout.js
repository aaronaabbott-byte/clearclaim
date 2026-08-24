import AskAnn from "./ann";
import { userPlan } from "@/lib/plan";

// Wraps every /dashboard/* page. Ask Ann (AI) shows only for Family-plan accounts.
export default async function DashboardLayout({ children }) {
  const { plan } = await userPlan();
  return (
    <>
      {children}
      {plan.family && <AskAnn />}
    </>
  );
}
