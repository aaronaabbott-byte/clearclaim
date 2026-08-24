import Link from "next/link";
import "./globals.css";

export const metadata = { title: "ClearClaim", description: "Every claim, ready to approve." };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <footer className="sitefoot">
          ClearClaim is an independent tool and is not affiliated with, endorsed by, or connected to
          ClassWallet, the Arkansas Department of Education, or any state EFA or ESA program. It does not
          guarantee approval or reimbursement and is not legal, tax, or financial advice.{" "}
          <Link href="/terms">Terms & full disclaimer</Link>{" · "}<Link href="/privacy">Privacy</Link>
        </footer>
      </body>
    </html>
  );
}
