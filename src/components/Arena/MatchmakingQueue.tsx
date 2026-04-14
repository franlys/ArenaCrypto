"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import styles from "./MatchmakingQueue.module.css";

interface MatchmakingQueueProps {
  gameId: string;
  mode: string;
  stake: number;
}

export default function MatchmakingQueue({ gameId, mode, stake }: MatchmakingQueueProps) {
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'searching' | 'found' | 'confirming'>('idle');
  const [queueId, setQueueId] = useState<string | null>(null);
  const [matchData, setMatchData] = useState<any>(null);
  const [timer, setTimer] = useState(45);
  const [loading, setLoading] = useState(false);

  // 1. Join the Queue
  const joinQueue = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Debes iniciar sesión para buscar partida.");

      // Try stored procedure first; fall back to direct insert if not deployed yet
      const rpcResult = await supabase.rpc('join_arena_queue', {
        p_game_id: gameId,
        p_mode: mode,
        p_stake: stake,
      });

      if (rpcResult.error) {
        // Fallback: direct insert (works without the stored procedure)
        const { data: row, error: insertError } = await supabase
          .from('matchmaking_queue')
          .insert({
            user_id: user.id,
            game_id: gameId,
            mode,
            stake_amount: stake,
            status: 'searching',
          })
          .select('id')
          .single();
        if (insertError) throw insertError;
        setQueueId(row.id);
      } else {
        setQueueId(rpcResult.data);
      }

      setStatus('searching');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 2. Listen for Realtime Updates
  useEffect(() => {
    if (!queueId) return;

    const channel = supabase
      .channel(`queue_${queueId}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'matchmaking_queue',
        filter: `id=eq.${queueId}` 
      }, (payload) => {
        if (payload.new.status === 'matched') {
          setStatus('found');
          // In a real app, we'd fetch the match details here
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queueId]);

  // 3. Confirm Timer
  useEffect(() => {
    let interval: any;
    if (status === 'found' && timer > 0) {
      interval = setInterval(() => setTimer(t => t - 1), 1000);
    } else if (timer === 0) {
      setStatus('idle');
      alert("Match expired. You have been removed from the queue.");
    }
    return () => clearInterval(interval);
  }, [status, timer]);

  return (
    <div className={styles.queueWrapper}>
      <AnimatePresence mode="wait">
        {status === 'idle' && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className={styles.idleState}
          >
            <button className="btn-primary" onClick={joinQueue} disabled={loading}>
              {loading ? "PREPARANDO..." : `BUSCAR PARTIDA ($${stake})`}
            </button>
          </motion.div>
        )}

        {status === 'searching' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className={styles.searchingState}
          >
            <div className={styles.orbitalContainer}>
              <motion.div 
                className={styles.orbit}
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              />
              <div className={styles.searchCore}>
                <span className="font-orbitron">BUSCANDO RIVAL</span>
                <small>{gameId} • {mode}</small>
              </div>
            </div>
            <button className={styles.cancelBtn} onClick={() => setStatus('idle')}>CANCELAR BÚSQUEDA</button>
          </motion.div>
        )}

        {status === 'found' && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }}
            className={`${styles.foundCard} glass-panel`}
          >
            <div className={styles.matchAlert}>
              <h2 className="font-orbitron neon-text-cyan">¡COMBATE ENCONTRADO!</h2>
              <div className={styles.timerRing}>
                <svg>
                  <circle cx="30" cy="30" r="28" />
                </svg>
                <span>{timer}</span>
              </div>
            </div>
            
            <div className={styles.matchDetails}>
              <p>Apuesta Ajustada: <strong className="neon-text-cyan">${stake} USDC</strong></p>
              <p className={styles.terms}>Al aceptar, confirmas que ArenaCrypto gestione los fondos y declaras conocer las reglas del combate.</p>
            </div>

            <div className={styles.actions}>
              <button 
                className="btn-primary" 
                onClick={async () => {
                  setStatus('confirming');
                  // In a real flow, matchData.id would come from the Realtime payload
                  // For now, let's assume we fetch the latest match for the user
                  const { data } = await supabase
                    .from('matches')
                    .select('id')
                    .or(`player1_id.eq.${(await supabase.auth.getUser()).data.user?.id},player2_id.eq.${(await supabase.auth.getUser()).data.user?.id}`)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();
                  
                  if (data) router.push(`/arena/${data.id}`);
                }}
              >
                ACEPTAR RETA
              </button>
              <button className={styles.declineBtn} onClick={() => setStatus('idle')}>RECHAZAR</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
