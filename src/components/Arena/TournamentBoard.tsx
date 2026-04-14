"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import styles from "./TournamentBoard.module.css";
import { motion } from "framer-motion";

interface TournamentBoardProps {
  tournamentId: string;
}

export default function TournamentBoard({ tournamentId }: TournamentBoardProps) {
  const [standings, setStandings] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTournamentData() {
      // 1. Fetch Standings (Participants ordered by points)
      const { data: participants, error: pError } = await supabase
        .from('tournament_participants')
        .select(`
          *,
          profile:profiles(username, avatar_url)
        `)
        .eq('tournament_id', tournamentId)
        .order('points', { ascending: false });

      if (!pError) setStandings(participants);

      // 2. Fetch Tournament Matches
      const { data: matchData, error: mError } = await supabase
        .from('matches')
        .select(`
          *,
          p1:profiles!player1_id(username),
          p2:profiles!player2_id(username)
        `)
        .eq('tournament_id', tournamentId)
        .order('created_at', { ascending: true });

      if (!mError) setMatches(matchData);
      setLoading(false);
    }

    if (tournamentId) fetchTournamentData();
  }, [tournamentId]);

  if (loading) return <div>Cargando tabla de posiciones...</div>;

  return (
    <div className={styles.boardWrapper}>
      <section className={`${styles.standingsSection} glass-panel`}>
        <h3 className="font-orbitron">TABLA DE POSICIONES</h3>
        <table className={styles.standingsTable}>
          <thead>
            <tr>
              <th>POS</th>
              <th>PLAYER</th>
              <th>Puntos</th>
              <th>W - D - L</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((player, index) => (
              <tr key={player.id} className={index < 3 ? styles.topThree : ""}>
                <td>{index + 1}</td>
                <td className={styles.username}>{player.profile?.username}</td>
                <td className={styles.points}>{player.points} pts</td>
                <td className={styles.stats}>{player.wins} - {player.draws} - {player.losses}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className={`${styles.matchesSection} glass-panel`}>
        <h3 className="font-orbitron">CALENDARIO ROUND ROBIN</h3>
        <div className={styles.matchList}>
          {matches.map((m) => (
            <div key={m.id} className={styles.matchCard}>
              <span className={styles.players}>
                {m.p1?.username} <span className="neon-text-purple">VS</span> {m.p2?.username}
              </span>
              <span className={`${styles.status} ${styles[m.status]}`}>{m.status}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
