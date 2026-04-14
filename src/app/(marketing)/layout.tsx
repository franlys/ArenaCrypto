import type { ReactNode } from "react";
import { Web3Provider } from "@/lib/web3/Web3Provider";
import { UserProvider } from "@/contexts/UserContext";
import MarketingNav from "./nav";
import styles from "./marketing.module.css";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <Web3Provider>
      <UserProvider>
        <div className={styles.shell}>
          <MarketingNav />
          <main className={styles.main}>{children}</main>
        </div>
      </UserProvider>
    </Web3Provider>
  );
}
