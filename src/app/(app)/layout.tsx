import type { ReactNode } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Web3Provider } from "@/lib/web3/Web3Provider";
import { UserProvider } from "@/contexts/UserContext";
import { SidebarNav } from "@/components/Navigation/SidebarNav";
import AdZone from "@/components/Marketing/AdZone";
import AuthGuard from "./AuthGuard";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <Web3Provider>
      <UserProvider>
        <AuthGuard>
          <div className="app-grid">
            <aside className="sidebar-left">
              <SidebarNav />
            </aside>

            <main className="main-content">
              <header className="top-bar">
                <ConnectButton
                  label="CONECTAR"
                  accountStatus="address"
                  showBalance={false}
                />
              </header>
              {children}
            </main>

            <aside className="sidebar-right">
              <AdZone slot="sidebar" />
              <div className="social-feed">
                <h4>ACTIVIDAD RECIENTE</h4>
              </div>
            </aside>

            <footer className="main-footer">
              <div className="footer-content">
                <p className="font-orbitron" style={{ fontSize: "0.6rem", letterSpacing: "0.2em", color: "rgba(255,255,255,0.2)" }}>
                  © 2026 ARENACRYPTO · KRONIX
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", opacity: 0.35 }}>
                  <span className="font-orbitron" style={{ fontSize: "0.55rem", letterSpacing: "0.15em", color: "rgba(255,255,255,0.6)", textTransform: "uppercase" }}>Powered by</span>
                  <span className="font-orbitron" style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.15em", color: "#00F5FF", textTransform: "uppercase" }}>GonzalezLabs</span>
                </div>
                <AdZone slot="footer" />
              </div>
            </footer>
          </div>
        </AuthGuard>
      </UserProvider>
    </Web3Provider>
  );
}
