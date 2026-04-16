"use client";

import { motion } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { BarChart3, Calendar, ClipboardList, Wallet, TrendingUp, LogOut, Megaphone, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import styles from "./AdminSidebar.module.css";

const ADMIN_NAV = [
  { href: "/admin",             label: "ECONOMÍA", icon: BarChart3 },
  { href: "/admin/markets",     label: "MERCADOS", icon: TrendingUp },
  { href: "/admin/events",      label: "EVENTOS",  icon: Calendar },
  { href: "/admin/ads",         label: "ANUNCIOS", icon: Megaphone },
  { href: "/admin/disputes",    label: "DISPUTAS", icon: ClipboardList },
  { href: "/admin/withdrawals", label: "RETIROS",  icon: Wallet },
  { href: "/admin/users",       label: "USUARIOS", icon: Users },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  return (
    <nav className={styles.adminNav}>
      <div className={styles.header}>
        <h2 className="font-orbitron">ADMIN<span className="neon-text-cyan">CORE</span></h2>
      </div>

      <ul className={styles.list}>
        {ADMIN_NAV.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <li key={item.href}>
              <Link href={item.href} className={`${styles.link} ${isActive ? styles.active : ""}`}>
                <Icon size={18} />
                <span className="font-orbitron">{item.label}</span>
                {isActive && (
                  <motion.div 
                    layoutId="admin-nav-indicator"
                    className={styles.indicator}
                  />
                )}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className={styles.footer}>
        <button className={styles.backLink} onClick={handleSignOut}>
          <LogOut size={16} />
          <span>CERRAR SESIÓN</span>
        </button>
      </div>
    </nav>
  );
}
