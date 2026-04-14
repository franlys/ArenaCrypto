"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/contexts/UserContext";
import { AdminSidebar } from "@/components/Navigation/AdminSidebar";
import styles from "./admin-shell.module.css";

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading } = useUser();
  const router = useRouter();

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
      <aside className={styles.sidebar}>
        <AdminSidebar />
      </aside>
      <main className={styles.content}>
        {children}
      </main>
    </div>
  );
}
