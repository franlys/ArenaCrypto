import type { ReactNode } from "react";
import MarketingNav from "./nav";
import styles from "./marketing.module.css";

// Web3Provider is NOT needed on marketing/login pages — it causes a Reown 403
// on unauthenticated domains and freezes the page. WalletConnect is only needed
// inside the (app) layout where users are already logged in.
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.shell}>
      <MarketingNav />
      <main className={styles.main}>{children}</main>
    </div>
  );
}
