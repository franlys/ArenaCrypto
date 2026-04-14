"use client";

import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { BarChart3, Calendar, ClipboardList, Wallet, ArrowLeft } from "lucide-react";
import styles from "./AdminSidebar.module.css";

const ADMIN_NAV = [
  { href: "/admin", label: "ECONOMÍA", icon: BarChart3 },
  { href: "/admin/events", label: "EVENTOS", icon: Calendar },
  { href: "/admin/disputes", label: "DISPUTAS", icon: ClipboardList },
  { href: "/admin/withdrawals", label: "RETIROS", icon: Wallet },
];

export function AdminSidebar() {
  const pathname = usePathname();

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
        <Link href="/dashboard" className={styles.backLink}>
          <ArrowLeft size={16} />
          <span>VOLVER AL HUB</span>
        </Link>
      </div>
    </nav>
  );
}
