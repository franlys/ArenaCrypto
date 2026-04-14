"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import styles from "../admin.module.css";
import { motion } from "framer-motion";

const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];

type Withdrawal = {
  id: string;
  user_id: string;
  amount: number;
  to_address: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  profiles?: { username: string };
};

export default function WithdrawalsPage() {
  const [rows, setRows]       = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("withdrawal_requests")
      .select(`id, user_id, amount, to_address, status, created_at,
               profiles(username)`)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setRows((data as unknown as Withdrawal[]) ?? []);
        setLoading(false);
      });
  }, []);

  const updateStatus = async (id: string, status: "approved" | "rejected") => {
    const { error } = await supabase
      .from("withdrawal_requests")
      .update({ status })
      .eq("id", id);

    if (!error) {
      setRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status } : r))
      );
    } else {
      alert("Error: " + error.message);
    }
  };

  if (loading)
    return <p className={styles.loadingText}>CARGANDO RETIROS...</p>;

  const pending = rows.filter((r) => r.status === "pending");

  return (
    <div className={styles.dashboard}>
      <header className={styles.pageHeader}>
        <div>
          <h1 className="font-orbitron" style={{ fontSize: "1.8rem" }}>
            WITHDRAWAL <span className="neon-text-cyan">MANAGER</span>
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
            Solicitudes de retiro pendientes de aprobación manual.
          </p>
        </div>
        {pending.length > 0 && (
          <span
            style={{
              fontFamily: "Rajdhani, sans-serif",
              fontSize: "0.72rem",
              fontWeight: 700,
              padding: "0.3rem 0.8rem",
              borderRadius: "20px",
              background: "rgba(245,158,11,0.1)",
              border: "1px solid rgba(245,158,11,0.3)",
              color: "#f59e0b",
            }}
          >
            {pending.length} PENDIENTE{pending.length !== 1 ? "S" : ""}
          </span>
        )}
      </header>

      {rows.length === 0 ? (
        <div className="glass-panel" style={{ padding: "3rem", textAlign: "center" }}>
          <p
            style={{
              fontFamily: "Rajdhani, sans-serif",
              color: "var(--text-muted)",
              fontSize: "0.9rem",
              letterSpacing: "0.1em",
            }}
          >
            SIN SOLICITUDES DE RETIRO ✓
          </p>
        </div>
      ) : (
        <motion.div
          className="glass-panel"
          style={{ overflow: "hidden" }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ease: EASE_OUT, duration: 0.35 }}
        >
          <table className={styles.withdrawalTable}>
            <thead>
              <tr>
                <th>USUARIO</th>
                <th>MONTO</th>
                <th>DIRECCIÓN</th>
                <th>FECHA</th>
                <th>ESTADO</th>
                <th>ACCIÓN</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td style={{ color: "white", fontWeight: 600 }}>
                    {row.profiles?.username ?? row.user_id.slice(0, 8) + "…"}
                  </td>
                  <td style={{ color: "white", fontWeight: 700 }}>
                    ${row.amount} USDC
                  </td>
                  <td
                    style={{
                      fontFamily: "monospace",
                      fontSize: "0.75rem",
                      color: "hsl(var(--text-muted))",
                    }}
                  >
                    {row.to_address.slice(0, 8)}…{row.to_address.slice(-6)}
                  </td>
                  <td>
                    {new Date(row.created_at).toLocaleDateString("es-ES", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td>
                    <span
                      className={`${styles.statusBadge} ${
                        row.status === "pending"
                          ? styles.statusPending
                          : row.status === "approved"
                          ? styles.statusApproved
                          : styles.statusRejected
                      }`}
                    >
                      {row.status === "pending"
                        ? "PENDIENTE"
                        : row.status === "approved"
                        ? "APROBADO"
                        : "RECHAZADO"}
                    </span>
                  </td>
                  <td>
                    {row.status === "pending" ? (
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button
                          className={styles.btnApprove}
                          onClick={() => updateStatus(row.id, "approved")}
                        >
                          APROBAR
                        </button>
                        <button
                          className={styles.btnReject}
                          onClick={() => updateStatus(row.id, "rejected")}
                        >
                          RECHAZAR
                        </button>
                      </div>
                    ) : (
                      <span
                        style={{
                          fontSize: "0.65rem",
                          color: "hsl(var(--text-muted))",
                          fontFamily: "Rajdhani, sans-serif",
                        }}
                      >
                        —
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}
    </div>
  );
}
