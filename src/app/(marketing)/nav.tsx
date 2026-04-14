"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./nav.module.css";

export default function MarketingNav() {
  const path = usePathname();
  const isLogin = path === "/login";

  return (
    <nav className={styles.nav}>
      <Link href="/" className={styles.logo}>
        <span className="font-orbitron">ARENA</span>
        <span className={`font-orbitron ${styles.cyan}`}>CRYPTO</span>
      </Link>

      <div className={styles.links}>
        <Link href="/como-funciona" className={styles.link}>Cómo funciona</Link>
        {isLogin ? (
          <Link href="/" className={styles.link}>Inicio</Link>
        ) : (
          <Link href="/login" className={`btn-primary ${styles.ctaBtn}`}>
            ENTRAR
          </Link>
        )}
      </div>
    </nav>
  );
}
