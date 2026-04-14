"use client";

import { useUser } from "../../contexts/UserContext";
import styles from "./AdZone.module.css";
import { motion } from "framer-motion";

interface AdZoneProps {
  slot: "sidebar" | "footer";
}

const ADS = {
  sidebar: {
    image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop",
    title: "UPGRADE TO ELITE",
    desc: "Get 0% commissions on your first 10 matches."
  },
  footer: {
    image: "https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?q=80&w=2071&auto=format&fit=crop",
    title: "THE NEW RAZER KRAKEN",
    desc: "Precision audio for elite performance."
  }
};

export default function AdZone({ slot }: AdZoneProps) {
  const { isPremium, loading } = useUser();

  // 1. Hide ads for Premium users or during loading
  if (loading || isPremium) return null;

  const currentAd = ADS[slot];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`${styles.adContainer} ${styles[slot]} glass-panel`}
    >
      <div 
        className={styles.adBg} 
        style={{ backgroundImage: `url(${currentAd.image})` }}
      ></div>
      <div className={styles.adOverlay}>
        <span className={styles.adBadge}>AD</span>
        <h4>{currentAd.title}</h4>
        <p>{currentAd.desc}</p>
        <button className={styles.adBtn}>LEARN MORE</button>
      </div>
    </motion.div>
  );
}
