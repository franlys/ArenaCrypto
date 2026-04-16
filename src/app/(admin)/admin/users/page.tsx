"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import styles from "./users.module.css";

interface UserRow {
  id: string;
  email: string;
  username: string;
  role: string;
  is_premium: boolean;
  is_test_user: boolean;
  balance: number;
  balance_usdc: number;
  test_balance: number;
  created_at: string;
}

export default function AdminUsersPage() {
  const [users, setUsers]         = useState<UserRow[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [creditInputs, setCreditInputs] = useState<Record<string, string>>({});
  const [busy, setBusy]           = useState<Record<string, boolean>>({});
  const [msg, setMsg]             = useState<Record<string, string>>({});

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("admin_list_users");
      if (error) {
        console.error("[admin_list_users]", error.message);
      } else {
        setUsers((data ?? []).map((p: any) => ({
          id:           p.id,
          email:        p.email ?? "",
          username:     p.username,
          role:         p.role,
          is_premium:   p.is_premium,
          is_test_user: p.is_test_user ?? false,
          balance:      p.balance ?? 0,
          balance_usdc: p.balance_usdc ?? 0,
          test_balance: p.test_balance ?? 0,
          created_at:   p.created_at,
        })));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const flash = (id: string, text: string) => {
    setMsg(m => ({ ...m, [id]: text }));
    setTimeout(() => setMsg(m => ({ ...m, [id]: "" })), 3000);
  };

  const toggleTestUser = async (user: UserRow) => {
    setBusy(b => ({ ...b, [user.id]: true }));
    const { error } = await supabase.rpc("admin_set_test_user", {
      p_user_id: user.id,
      p_is_test: !user.is_test_user,
    });
    if (error) flash(user.id, `Error: ${error.message}`);
    else {
      flash(user.id, user.is_test_user ? "Rol de prueba eliminado" : "Marcado como Test User ✓");
      setUsers(u => u.map(x => x.id === user.id ? { ...x, is_test_user: !x.is_test_user } : x));
    }
    setBusy(b => ({ ...b, [user.id]: false }));
  };

  const grantCredits = async (user: UserRow) => {
    const amount = parseFloat(creditInputs[user.id] ?? "");
    if (!amount || amount <= 0) return;
    setBusy(b => ({ ...b, [user.id]: true }));
    const { error } = await supabase.rpc("admin_grant_test_credits", {
      p_user_id: user.id,
      p_amount:  amount,
    });
    if (error) flash(user.id, `Error: ${error.message}`);
    else {
      flash(user.id, `+${amount} USDT de prueba acreditados ✓`);
      setCreditInputs(c => ({ ...c, [user.id]: "" }));
      setUsers(u => u.map(x => x.id === user.id ? { ...x, test_balance: x.test_balance + amount } : x));
    }
    setBusy(b => ({ ...b, [user.id]: false }));
  };

  const resetTestBalance = async (user: UserRow) => {
    if (!confirm(`¿Resetear saldo de prueba de ${user.username}?`)) return;
    setBusy(b => ({ ...b, [user.id]: true }));
    const { error } = await supabase.rpc("admin_reset_test_balance", { p_user_id: user.id });
    if (error) flash(user.id, `Error: ${error.message}`);
    else {
      flash(user.id, "Saldo de prueba reseteado");
      setUsers(u => u.map(x => x.id === user.id ? { ...x, test_balance: 0 } : x));
    }
    setBusy(b => ({ ...b, [user.id]: false }));
  };

  const filtered = users.filter(u =>
    u.username?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={`font-orbitron ${styles.title}`}>USUARIOS</h1>
        <span className={styles.count}>{users.length} registrados</span>
      </div>

      <input
        className={styles.search}
        placeholder="Buscar por usuario o email..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {loading ? (
        <p className={`font-orbitron ${styles.loading}`}>CARGANDO...</p>
      ) : (
        <div className={styles.list}>
          {filtered.map(user => (
            <div key={user.id} className={`${styles.card} ${user.is_test_user ? styles.cardTest : ""}`}>
              <div className={styles.cardTop}>
                <div className={styles.userInfo}>
                  <div className={styles.username}>
                    {user.username}
                    {user.is_test_user && <span className={styles.testBadge}>TEST</span>}
                    {user.is_premium && <span className={styles.premiumBadge}>PREMIUM</span>}
                    {user.role === "admin" && <span className={styles.adminBadge}>ADMIN</span>}
                  </div>
                  <div className={styles.email}>{user.email || user.id.slice(0, 8) + "…"}</div>
                  <div className={styles.joined}>
                    Registrado: {new Date(user.created_at).toLocaleDateString("es-MX")}
                  </div>
                </div>

                <div className={styles.balances}>
                  <div className={styles.balanceItem}>
                    <span className={styles.balLabel}>SALDO REAL</span>
                    <span className={styles.balValue}>${user.balance.toFixed(2)}</span>
                  </div>
                  <div className={styles.balanceItem}>
                    <span className={styles.balLabel}>USDC WALLET</span>
                    <span className={styles.balValue}>${user.balance_usdc.toFixed(2)}</span>
                  </div>
                  {user.is_test_user && (
                    <div className={`${styles.balanceItem} ${styles.testBalance}`}>
                      <span className={styles.balLabel}>SALDO TEST</span>
                      <span className={styles.balValue}>${user.test_balance.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className={styles.actions}>
                {user.role !== "admin" && (
                  <button
                    className={user.is_test_user ? styles.btnRemoveTest : styles.btnMakeTest}
                    onClick={() => toggleTestUser(user)}
                    disabled={busy[user.id]}
                  >
                    {user.is_test_user ? "QUITAR ROL TEST" : "MARCAR COMO TEST"}
                  </button>
                )}

                {user.is_test_user && (
                  <>
                    <div className={styles.creditRow}>
                      <input
                        type="number"
                        min="1"
                        max="10000"
                        placeholder="Monto USDT"
                        value={creditInputs[user.id] ?? ""}
                        onChange={e => setCreditInputs(c => ({ ...c, [user.id]: e.target.value }))}
                        className={styles.creditInput}
                      />
                      <button
                        className={styles.btnCredit}
                        onClick={() => grantCredits(user)}
                        disabled={busy[user.id] || !creditInputs[user.id]}
                      >
                        + CRÉDITOS TEST
                      </button>
                    </div>
                    {user.test_balance > 0 && (
                      <button
                        className={styles.btnReset}
                        onClick={() => resetTestBalance(user)}
                        disabled={busy[user.id]}
                      >
                        RESETEAR SALDO TEST
                      </button>
                    )}
                  </>
                )}
              </div>

              {msg[user.id] && (
                <div className={styles.flash}>{msg[user.id]}</div>
              )}
            </div>
          ))}

          {filtered.length === 0 && (
            <p className={styles.empty}>No hay usuarios que coincidan con la búsqueda.</p>
          )}
        </div>
      )}
    </div>
  );
}
