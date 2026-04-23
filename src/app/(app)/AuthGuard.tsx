"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/contexts/UserContext";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, profile, isAdmin, loading } = useUser();
  const router = useRouter();
  const pathname = typeof window !== "undefined" ? window.location.pathname : "";

  useEffect(() => {
    if (loading) return;
    if (!user) {
      const t = setTimeout(() => router.replace("/login"), 400);
      return () => clearTimeout(t);
    }

    // Auto-redirect Admin to the administrative dashboard
    // Only redirect if they are on a non-admin page and it's the root app entry
    if (isAdmin && !pathname.startsWith("/admin") && (pathname === "/dashboard" || pathname === "/")) {
      router.replace("/admin");
    }
  }, [user, isAdmin, loading, router, pathname]);

  // While loading — show a minimal spinner so there's no flash of content
  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          minHeight: "60vh",
        }}
      >
        <p
          className="font-orbitron"
          style={{
            fontSize: "0.75rem",
            letterSpacing: "0.2em",
            color: "hsl(var(--text-muted))",
            animation: "pulse 1.4s ease-in-out infinite",
          }}
        >
          AUTENTICANDO...
        </p>
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 0.4; }
            50%       { opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  // Not authenticated — redirect already triggered, render nothing
  if (!user) return null;

  return <>{children}</>;
}
