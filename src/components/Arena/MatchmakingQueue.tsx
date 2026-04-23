"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import styles from "./MatchmakingQueue.module.css";

interface MatchmakingQueueProps {
  gameId: string;
  mode: string;
  modeLabel?: string;
  stake: number;
  isTest?: boolean;
  onCancel: () => void;
}

export default function MatchmakingQueue({
  gameId, mode, modeLabel, stake, isTest = false, onCancel,
}: MatchmakingQueueProps) {
  const router = useRouter();
  const [status, setStatus]   = useState<'joining' | 'searching' | 'found' | 'confirming' | 'error'>('joining');
  const [queueId, setQueueId] = useState<string | null>(null);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [timer, setTimer]     = useState(45);
  const cancelledRef          = useRef(false);

  // Auto-join on mount
  useEffect(() => {
    joinQueue();
    return () => { cancelledRef.current = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const joinQueue = async () => {
    cancelledRef.current = false;
    setStatus('joining');
    setErrorMsg('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Debes iniciar sesión para buscar partida.");

      const rpcResult = await supabase.rpc('join_arena_queue', {
        p_game_id: gameId,
        p_mode: mode,
        p_stake: stake,
        p_is_test: isTest,
      });

      if (rpcResult.error) {
        // PGRST202 = función no existe aún — fallback sin descuento de saldo
        if (rpcResult.error.code !== 'PGRST202') throw new Error(rpcResult.error.message);
        const { data: row, error: insertError } = await supabase
          .from('matchmaking_queue')
          .insert({ user_id: user.id, game_id: gameId, mode, stake_amount: stake, status: 'searching', is_test: isTest })
          .select('id')
          .single();
        if (insertError) throw insertError;
        if (!cancelledRef.current) setQueueId(row.id);
      } else {
        if (!cancelledRef.current) setQueueId(rpcResult.data);
      }

      if (!cancelledRef.current) setStatus('searching');
    } catch (err: any) {
      if (!cancelledRef.current) {
        // If already in queue, try to recover the ID
        if (err.message?.includes('Ya estás en cola')) {
          const { data: existing } = await supabase
            .from('matchmaking_queue')
            .select('id')
            .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
            .eq('status', 'searching')
            .maybeSingle();
          
          if (existing) {
            setQueueId(existing.id);
            setStatus('searching');
            return;
          }
        }

        setErrorMsg(err.message);
        setStatus('error');
      }
    }
  };

  // Escuchar cambio a 'matched' en Realtime
  useEffect(() => {
    if (!queueId) return;

    const channel = supabase
      .channel(`queue_${queueId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'matchmaking_queue',
        filter: `id=eq.${queueId}`,
      }, async (payload) => {
        if (payload.new.status === 'matched') {
          // Buscar el match creado
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;
          const { data } = await supabase
            .from('matches')
            .select('id')
            .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          if (data) setMatchId(data.id);
          setStatus('found');
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queueId]);

  // Countdown al encontrar rival
  useEffect(() => {
    if (status !== 'found') return;
    if (timer <= 0) {
      cancelQueue();
      return;
    }
    const interval = setInterval(() => setTimer(t => t - 1), 1000);
    return () => clearInterval(interval);
  }, [status, timer]);

  const cancelQueue = async () => {
    cancelledRef.current = true;
    if (queueId) {
      await supabase
        .from('matchmaking_queue')
        .update({ status: 'cancelled' })
        .eq('id', queueId);
    }
    onCancel();
  };

  const handleForceCancel = async () => {
    setStatus('joining');
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('matchmaking_queue')
        .update({ status: 'cancelled' })
        .eq('user_id', user.id)
        .eq('status', 'searching');
    }
    joinQueue();
  };

  return (
    <div className={styles.queueWrapper}>
      <AnimatePresence mode="wait">

        {(status === 'joining') && (
          <motion.div key="joining"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className={styles.searchingState}
          >
            <p className="font-orbitron" style={{ fontSize: '0.65rem', letterSpacing: '0.15em', color: 'hsl(var(--text-muted))' }}>
              CONECTANDO A LA COLA...
            </p>
          </motion.div>
        )}

        {status === 'searching' && (
          <motion.div key="searching"
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className={styles.searchingState}
          >
            {isTest && (
              <span style={{ fontSize: '0.55rem', fontFamily: 'Orbitron, sans-serif', letterSpacing: '0.12em',
                color: '#f59e0b', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
                padding: '0.15rem 0.6rem', borderRadius: '20px', marginBottom: '1rem', display: 'inline-block' }}>
                MODO TEST · SALDO VIRTUAL
              </span>
            )}
            <div className={styles.orbitalContainer}>
              <motion.div
                className={styles.orbit}
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              />
              <div className={styles.searchCore}>
                <span className="font-orbitron">BUSCANDO RIVAL</span>
                <small>{gameId} · {modeLabel ?? mode}</small>
                <small style={{ color: 'hsl(var(--text-muted))' }}>
                  Apuesta: {isTest ? '🧪' : '$'}{stake}{isTest ? ' (test)' : ' USDC'}
                </small>
              </div>
            </div>
            <button className={styles.cancelBtn} onClick={cancelQueue}>CANCELAR BÚSQUEDA</button>
          </motion.div>
        )}

        {status === 'found' && (
          <motion.div key="found"
            initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }}
            className={`${styles.foundCard} glass-panel`}
          >
            <div className={styles.matchAlert}>
              <h2 className="font-orbitron neon-text-cyan">¡RIVAL ENCONTRADO!</h2>
              <div className={styles.timerRing}>
                <svg viewBox="0 0 60 60">
                  <circle cx="30" cy="30" r="28" />
                </svg>
                <span>{timer}</span>
              </div>
            </div>
            <div className={styles.matchDetails}>
              <p>Apuesta: <strong className="neon-text-cyan">
                {isTest ? `🧪 ${stake} (test)` : `$${stake} USDC`}
              </strong></p>
              <p className={styles.terms}>
                Al aceptar confirmas que ArenaCrypto gestione los fondos y conoces las reglas del combate.
              </p>
            </div>
            <div className={styles.actions}>
              <button
                className="btn-primary"
                onClick={() => {
                  setStatus('confirming');
                  if (matchId) router.push(`/arena/${matchId}`);
                }}
              >
                ACEPTAR COMBATE
              </button>
              <button className={styles.declineBtn} onClick={cancelQueue}>RECHAZAR</button>
            </div>
          </motion.div>
        )}

        {status === 'error' && (
          <motion.div key="error"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ textAlign: 'center', padding: '1rem' }}
          >
            <p style={{ fontFamily: 'Rajdhani, sans-serif', color: '#f87171', marginBottom: '1.25rem', fontSize: '0.9rem', lineHeight: 1.5 }}>
              {errorMsg}
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              {errorMsg.includes('Ya estás en cola') ? (
                <button className="btn-primary" onClick={handleForceCancel}>CANCELAR COLA Y REINTENTAR</button>
              ) : (
                <button className="btn-primary" onClick={joinQueue}>REINTENTAR</button>
              )}
              <button className={styles.cancelBtn} onClick={onCancel}>VOLVER</button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
