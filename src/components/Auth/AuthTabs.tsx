"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, CheckCircle } from "lucide-react";
import { supabase } from "../../lib/supabase";
import styles from "./AuthTabs.module.css";

const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];

export default function AuthTabs() {
  const router = useRouter();
  const [isLogin, setIsLogin]       = useState(true);
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [username, setUsername]     = useState("");
  const [showPass, setShowPass]     = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [registered, setRegistered] = useState(false);

  const switchTab = (login: boolean) => {
    setIsLogin(login);
    setError(null);
    setRegistered(false);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace("/dashboard");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { username } },
        });
        if (error) throw error;
        setRegistered(true);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (registered) {
    return (
      <div className={styles.authCard}>
        <div className={styles.successState}>
          <CheckCircle size={40} color="#00F5FF" />
          <h2 className={`font-orbitron ${styles.successTitle}`}>¡REGISTRO EXITOSO!</h2>
          <p className={styles.successMsg}>
            Hemos enviado un enlace de verificación a <strong>{email}</strong>.
            Revisa tu bandeja de entrada y confirma tu cuenta para entrar.
          </p>
          <button
            className="btn-secondary"
            style={{ fontSize: "0.7rem", letterSpacing: "0.1em" }}
            onClick={() => { setRegistered(false); setIsLogin(true); }}
          >
            YA VERIFIQUÉ MI CORREO
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.authCard} glass-panel`}>

      {/* Tab switcher */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${isLogin ? styles.tabActive : ""}`}
          onClick={() => switchTab(true)}
        >
          LOGIN
        </button>
        <button
          className={`${styles.tab} ${!isLogin ? styles.tabActive : ""}`}
          onClick={() => switchTab(false)}
        >
          REGISTRO
        </button>
        <motion.div
          className={styles.tabIndicator}
          animate={{ x: isLogin ? 0 : "100%" }}
          transition={{ type: "spring", stiffness: 380, damping: 34 }}
        />
      </div>

      <form onSubmit={handleAuth} className={styles.form}>
        <div className={styles.formHeader}>
          <h2 className={`font-orbitron ${styles.formTitle}`}>
            {isLogin ? "BIENVENIDO" : "ÚNETE"}
          </h2>
          <p className={styles.formSub}>
            {isLogin
              ? "Entra a tu cuenta y vuelve al campo de batalla."
              : "Crea tu cuenta de soldado en menos de un minuto."}
          </p>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={isLogin ? "login" : "register"}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.18, ease: EASE_OUT }}
            className={styles.fields}
          >
            {!isLogin && (
              <div className={styles.inputGroup}>
                <label className={styles.label}>USUARIO</label>
                <input
                  className={styles.input}
                  type="text"
                  placeholder="Tu nick de guerra"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
            )}

            <div className={styles.inputGroup}>
              <label className={styles.label}>EMAIL</label>
              <input
                className={styles.input}
                type="email"
                placeholder="soldado@arenacrypto.gg"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>CONTRASEÑA</label>
              <div className={styles.passwordWrap}>
                <input
                  className={`${styles.input} ${styles.inputPassword}`}
                  type={showPass ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  className={styles.eyeBtn}
                  onClick={() => setShowPass((v) => !v)}
                  aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {error && (
          <motion.div
            className={styles.error}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {error}
          </motion.div>
        )}

        <button
          type="submit"
          className="btn-primary"
          disabled={loading}
          style={{ width: "100%", fontSize: "0.8rem", letterSpacing: "0.12em", padding: "0.85rem" }}
        >
          {loading
            ? "PROCESANDO..."
            : isLogin ? "ENTRAR" : "CREAR CUENTA"}
        </button>

        {isLogin && (
          <p className={styles.switchHint}>
            ¿Sin cuenta?{" "}
            <button type="button" className={styles.switchLink} onClick={() => switchTab(false)}>
              Regístrate gratis
            </button>
          </p>
        )}
      </form>
    </div>
  );
}
