/**
 * ArenaCrypto — Games Shared Engine
 * Physics, RNG, formatting helpers.
 */

export const ACGames = {
  /**
   * Mulberry32 — fast, seedable, non-cryptographic RNG
   */
  mulberry32: (seed: number) => {
    let a = seed >>> 0;
    return () => {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  },

  /**
   * Generates an RNG function from a string seed
   */
  rngFromString: (s: string) => {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return ACGames.mulberry32(h);
  },

  /**
   * Formats numbers to money strings
   */
  fmtMoney: (n: number, decimals: number = 2) => {
    if (!isFinite(n)) return '—';
    return n.toLocaleString('en-US', { 
      minimumFractionDigits: decimals, 
      maximumFractionDigits: decimals 
    });
  },

  /**
   * Formats multipliers (e.g., 2.50x)
   */
  fmtMult: (n: number) => {
    if (!isFinite(n)) return '∞';
    if (n >= 100) return n.toFixed(1) + '×';
    return n.toFixed(2) + '×';
  },

  /**
   * Easing functions for animations
   */
  Ease: {
    out: (t: number) => 1 - Math.pow(1 - t, 3),
    inOut: (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
    drawer: (t: number) => (t === 1 ? 1 : 1 - Math.pow(1 - t, 2.2)),
  },

  /**
   * Plinko Multipliers Configuration
   */
  PLINKO_PAYOUTS: {
    8: {
      low:  [5.6, 2.1, 1.1, 1.0, 0.5, 1.0, 1.1, 2.1, 5.6],
      med:  [13, 3, 1.3, 0.7, 0.4, 0.7, 1.3, 3, 13],
      high: [29, 4, 1.5, 0.3, 0.2, 0.3, 1.5, 4, 29]
    },
    10: {
      low:  [8.9, 3, 1.4, 1.1, 1.0, 0.5, 1.0, 1.1, 1.4, 3, 8.9],
      med:  [22, 5, 2, 1.4, 0.6, 0.4, 0.6, 1.4, 2, 5, 22],
      high: [76, 10, 3, 0.9, 0.3, 0.2, 0.3, 0.9, 3, 10, 76]
    },
    12: {
      low:  [10, 3, 1.6, 1.4, 1.1, 1.0, 0.5, 1.0, 1.1, 1.4, 1.6, 3, 10],
      med:  [33, 11, 4, 2, 1.1, 0.6, 0.3, 0.6, 1.1, 2, 4, 11, 33],
      high: [170, 24, 8.1, 2, 0.7, 0.2, 0.2, 0.2, 0.7, 2, 8.1, 24, 170]
    },
    14: {
      low:  [7.1, 4, 1.9, 1.4, 1.3, 1.1, 1.0, 0.5, 1.0, 1.1, 1.3, 1.4, 1.9, 4, 7.1],
      med:  [58, 15, 7, 4, 1.9, 1.2, 0.5, 0.2, 0.5, 1.2, 1.9, 4, 7, 15, 58],
      high: [420, 88, 18, 5, 1.9, 0.3, 0.2, 0.2, 0.2, 0.3, 1.9, 5, 18, 88, 420]
    },
    16: {
      low:  [16, 9, 2, 1.4, 1.4, 1.2, 1.1, 1.0, 0.5, 1.0, 1.1, 1.2, 1.4, 1.4, 2, 9, 16],
      med:  [110, 41, 10, 5, 3, 1.5, 1.0, 0.5, 0.3, 0.5, 1.0, 1.5, 3, 5, 10, 41, 110],
      high: [1000, 130, 26, 9, 4, 2, 0.2, 0.2, 0.2, 0.2, 0.2, 2, 4, 9, 26, 130, 1000]
    }
  } as Record<number, Record<string, number[]>>,

  getBucketColor: (v: number) => {
    if (v >= 10) return '#F87171'; // Red
    if (v >= 3)  return '#F59E0B'; // Gold
    if (v >= 1.1) return '#8B5CF6'; // Purple
    if (v >= 1.0) return 'rgba(255,255,255,0.75)'; // White-ish
    return '#00F5FF'; // Cyan (Worst)
  }
};
