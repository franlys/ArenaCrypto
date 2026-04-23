"use client";

// emilkowalski-design: Spring physics nav with layoutId floating indicator
// ui-ux-pro-max: Orbitron font, neon-cyan active state
// vercel-best-practices: usePathname for server-synced active state

import { motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useUser } from "@/contexts/UserContext";
import styles from "./SidebarNav.module.css";

const EASE_OUT = [0.23, 1, 0.32, 1];

interface NavItem {
  href: string;
  label: string;
  icon: string;
  exact?: boolean;
}

interface SidebarNavProps {
  onItemClick?: () => void;
}

export function SidebarNav({ onItemClick }: SidebarNavProps = {}) {
  const pathname = usePathname();
  const { isAdmin } = useUser();
  const shouldReduceMotion = useReducedMotion();

  const navItems: NavItem[] = [
    { href: "/dashboard",    label: "HUB",       icon: "◈",  exact: true },
    { href: "/arena",        label: "ARENA",     icon: "⚔",  exact: true },
    { href: "/arena/sport",  label: "SPORT",     icon: "⚽" },
    { href: "/arena/gaming", label: "GAMING",    icon: "🎮" },
    { href: "/arena/games",  label: "GAMES",     icon: "◈" },
    { href: "/tournaments",  label: "TORNEOS",   icon: "🏆" },
    { href: "/historial",    label: "HISTORIAL", icon: "📋" },
    { href: "/wallets",      label: "WALLET",    icon: "◎" },
    { href: "/premium",      label: "PREMIUM",   icon: "◆" },
    { href: "/profile",      label: "PERFIL",    icon: "◉" },
  ];

  if (isAdmin) {
    navItems.push({ href: "/admin", label: "ADMIN", icon: "⚙" });
  }


  return (
    <nav className={styles.nav}>
      {/* Logo */}
      <div className={styles.logoWrap}>
        <Link href="/" className={`font-orbitron ${styles.logo}`}>
          ARENA<span className={styles.logoDim}>CRYPTO</span>
        </Link>
        {/* Subtle animated underline */}
        <motion.div
          className={styles.logoDivider}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.1 }}
          style={{ transformOrigin: "left" }}
        />
      </div>

      {/* Nav items */}
      <ul className={styles.list}>
        {navItems.map((item, i) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <motion.li
              key={item.href}
              className={styles.listItem}
              // emilkowalski: stagger 50ms between items, slide from left
              initial={shouldReduceMotion ? {} : { opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                delay: i * 0.05,
                duration: 0.3,
                ease: EASE_OUT,
              }}
            >
              <Link href={item.href} className={styles.link} onClick={onItemClick}>
                {/* emilkowalski: layoutId floating pill — springs between items */}
                {isActive && (
                  <motion.div
                    layoutId="nav-active-pill"
                    className={styles.activePill}
                    transition={
                      shouldReduceMotion
                        ? { duration: 0 }
                        : { type: "spring", duration: 0.35, bounce: 0.12 }
                    }
                  />
                )}
                <span className={`${styles.icon} ${isActive ? styles.iconActive : ""}`}>
                  {item.icon}
                </span>
                <span className={`font-orbitron ${styles.label} ${isActive ? styles.labelActive : ""}`}>
                  {item.label}
                </span>
                {/* emilkowalski: neon glow bar on active */}
                {isActive && (
                  <motion.div
                    layoutId="nav-glow-bar"
                    className={styles.glowBar}
                    transition={{ type: "spring", duration: 0.35, bounce: 0.1 }}
                  />
                )}
              </Link>
            </motion.li>
          );
        })}
      </ul>

      {/* Bottom status */}
      <motion.div
        className={styles.navFooter}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.4 }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span className={styles.networkDot} />
          <span className={styles.networkLabel}>Polygon · Mainnet</span>
        </div>
        <div className={styles.glLogo}>
          <span className={styles.glPowered}>Powered by</span>
          <span className={styles.glName}>GonzalezLabs</span>
        </div>
      </motion.div>
    </nav>
  );
}
