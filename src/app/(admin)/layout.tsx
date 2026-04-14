import type { ReactNode } from "react";
import { Web3Provider } from "@/lib/web3/Web3Provider";
import { UserProvider } from "@/contexts/UserContext";
import AdminShell from "./AdminShell";

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return (
    <Web3Provider>
      <UserProvider>
        <AdminShell>{children}</AdminShell>
      </UserProvider>
    </Web3Provider>
  );
}
