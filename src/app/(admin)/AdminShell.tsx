"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/contexts/UserContext";
import { AdminSidebar } from "@/components/Navigation/AdminSidebar";
import styles from "./admin-shell.module.css";

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    if (!loading && !isAdmin) router.replace("/dashboard");
  }, [isAdmin, loading, router]);

  if (loading) {
    return (
      <div className={styles.loading}>
        <span className="font-orbitron" style={{ color: "hsl(var(--neon-purple))", letterSpacing: "0.2em", fontSize: "0.8rem" }}>
          AUTENTICANDO...
        </span>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className={styles.shell}>
      {/* Mobile Hamburger Toggle */}
      <button 
        className={styles.mobileToggle}
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        aria-label="Toggle Menu"
      >
        <div className={styles.hamburgerIcon + (isMenuOpen ? " " + styles.open : "")}>
          <span></span>
          <span></span>
          <span></span>
        </div>
      </button>

      {/* Overlay for mobile */}
      {isMenuOpen && (
        <div 
          className={styles.overlay} 
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      <aside className={styles.sidebar + (isMenuOpen ? " " + styles.sidebarOpen : "")}>
        <div className={styles.sidebarInner}>
          <AdminSidebar onNavigate={() => setIsMenuOpen(false)} />
        </div>
      </aside>

      <main className={styles.content}>
        {children}
      </main>
    </div>
  );
}
