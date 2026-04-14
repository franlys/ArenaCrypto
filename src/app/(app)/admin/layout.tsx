"use client";

import { useUser } from "@/contexts/UserContext";
import { AdminSidebar } from "@/components/Navigation/AdminSidebar";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import styles from "./admin.module.css";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAdmin, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.push("/dashboard");
    }
  }, [isAdmin, loading, router]);

  if (loading) {
    return (
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <p className="font-orbitron neon-text-purple">AUTENTICANDO ADMIN...</p>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className={styles.adminLayout}>
      <aside className={styles.adminSidebar}>
        <AdminSidebar />
      </aside>
      <main className={styles.adminContent}>
        {children}
      </main>
    </div>
  );
}
