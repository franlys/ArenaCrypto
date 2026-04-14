"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Trophy, Play, CheckCircle } from "lucide-react";
import styles from "../admin.module.css";
import { motion } from "framer-motion";

export default function EventManager() {
  const [games, setGames] = useState<any[]>([]);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    title: "",
    game_id: "",
    entry_fee: 10,
    max_participants: 8
  });

  useEffect(() => {
    async function fetchData() {
      const [{ data: gData }, { data: tData }] = await Promise.all([
        supabase.from('games').select('*').order('name'),
        supabase.from('tournaments').select('*').order('created_at', { ascending: false })
      ]);

      if (gData) setGames(gData);
      if (tData) setTournaments(tData);
      setLoading(false);
    }

    fetchData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data, error } = await supabase
      .from('tournaments')
      .insert([form])
      .select();

    if (!error && data) {
      setTournaments([data[0], ...tournaments]);
      setForm({ title: "", game_id: "", entry_fee: 10, max_participants: 8 });
      alert("Torneo creado exitosamente");
    } else {
      alert("Error al crear torneo: " + error.message);
    }
  };

  const startTournament = async (id: string) => {
    const { error } = await supabase.rpc('generate_round_robin_matches', { p_tournament_id: id });
    if (!error) {
      alert("Torneo iniciado. Partidas generadas.");
      window.location.reload();
    } else {
      alert("Error al iniciar: " + error.message);
    }
  };

  if (loading) return <div>Cargando Arena Engine...</div>;

  return (
    <div className={styles.dashboard}>
      <header style={{ marginBottom: '2.5rem' }}>
        <h1 className="font-orbitron" style={{ fontSize: '1.8rem' }}>
          EVENT <span className="neon-text-cyan">MANAGER</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Crea y orquestra competiciones Round Robin.</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem' }}>
        {/* Create Form */}
        <div className={styles.eventForm}>
          <h3 className="font-orbitron" style={{ marginBottom: '2rem', fontSize: '1rem' }}>NUEVO TORNEO</h3>
          <form onSubmit={handleCreate}>
            <div className={styles.formGroup}>
              <label>NOMBRE DEL EVENTO</label>
              <input 
                type="text" 
                className={styles.inputField}
                placeholder="Ej: Copa Diamante Valorant"
                value={form.title}
                onChange={e => setForm({...form, title: e.target.value})}
                required
              />
            </div>
            
            <div className={styles.formGroup}>
              <label>JUEGO</label>
              <select 
                className={`${styles.inputField} ${styles.selectField}`}
                value={form.game_id}
                onChange={e => setForm({...form, game_id: e.target.value})}
                required
              >
                <option value="">Selecciona un juego</option>
                {games.map(g => (
                  <option key={g.id} value={g.slug}>{g.name}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className={styles.formGroup}>
                <label>ENTRADA (USDC)</label>
                <input 
                  type="number" 
                  className={styles.inputField}
                  value={form.entry_fee}
                  onChange={e => setForm({...form, entry_fee: Number(e.target.value)})}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>PARTICIPANTES</label>
                <input 
                  type="number" 
                  className={styles.inputField}
                  value={form.max_participants}
                  onChange={e => setForm({...form, max_participants: Number(e.target.value)})}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
              <Plus size={18} /> CREAR EVENTO
            </button>
          </form>
        </div>

        {/* List of Tournaments */}
        <div>
          <h3 className="font-orbitron" style={{ marginBottom: '2rem', fontSize: '1rem' }}>TORNEOS RECIENTES</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {tournaments.map((t, i) => (
              <motion.div 
                key={t.id} 
                className="glass-panel" 
                style={{ padding: '1.2rem' }}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 className="font-orbitron" style={{ fontSize: '0.9rem' }}>{t.title}</h4>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{t.game_id.toUpperCase()} · {t.status}</span>
                  </div>
                  {t.status === 'open' ? (
                    <button className="btn-secondary" onClick={() => startTournament(t.id)} style={{ padding: '0.5rem 1rem', fontSize: '0.7rem' }}>
                      <Play size={12} /> INICIAR
                    </button>
                  ) : (
                    <CheckCircle size={18} color="#10b981" />
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
