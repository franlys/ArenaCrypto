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
                <p className="font-orbitron" style={{ fontSize: "0.6rem", letterSpacing: "0.2em", color: "rgba(255,255,255,0.35)" }}>
                  © 2026 ARENACRYPTO · KRONIX
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", padding: "0.3rem 0.7rem", borderRadius: "6px", background: "rgba(0,245,255,0.05)", border: "1px solid rgba(0,245,255,0.12)" }}>
                  <span className="font-orbitron" style={{ fontSize: "0.5rem", letterSpacing: "0.12em", color: "rgba(255,255,255,0.45)", textTransform: "uppercase" }}>Powered by</span>
                  <span className="font-orbitron" style={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.12em", color: "#00F5FF", textTransform: "uppercase", textShadow: "0 0 8px rgba(0,245,255,0.5)" }}>GonzalezLabs</span>
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
