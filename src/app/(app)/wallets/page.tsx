"use client";

import WalletHub from "@/components/Wallet/WalletHub";
import { motion } from "framer-motion";

const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];

export default function WalletsPage() {
  return (
    <div style={{ padding: "2rem", maxWidth: "720px" }}>
      <motion.header
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE_OUT }}
        style={{ marginBottom: "2rem" }}
      >
        <h1 className="font-orbitron" style={{ fontSize: "2rem", lineHeight: 1 }}>
          Mi <span className="neon-text-cyan">Wallet</span>
        </h1>
        <p
          style={{
            fontFamily: "'Rajdhani', sans-serif",
            fontSize: "1rem",
            color: "hsl(var(--text-secondary))",
            marginTop: "0.5rem",
            letterSpacing: "0.03em",
          }}
        >
          Gestiona tus fondos, depósitos y retiros de la Arena.
        </p>
      </motion.header>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1, ease: EASE_OUT }}
      >
        <WalletHub />
      </motion.div>
    </div>
  );
}
