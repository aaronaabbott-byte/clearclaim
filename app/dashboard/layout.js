import AskAnn from "./ann";

// Wraps every /dashboard/* page so the Ask Ann bubble is available app-wide.
export default function DashboardLayout({ children }) {
  return (
    <>
      {children}
      <AskAnn />
    </>
  );
}
