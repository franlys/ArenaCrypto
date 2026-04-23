"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../lib/supabase";
import styles from "./EvidenceUpload.module.css";

interface EvidenceUploadProps {
  matchId: string;
  playerId: string;
}

type UploadState = "idle" | "uploading" | "pending_review" | "error";

const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];

export default function EvidenceUpload({ matchId, playerId }: EvidenceUploadProps) {
  const [state, setState]       = useState<UploadState>("idle");
  const [preview, setPreview]   = useState<string | null>(null);
  const [file, setFile]         = useState<File | null>(null);
  const [result, setResult]     = useState<any>(null);
  const [errorMsg, setError]    = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const inputRef                = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    if (!f.type.startsWith("image/") && !f.type.startsWith("video/")) {
      setError("Solo se aceptan imágenes o videos.");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleSubmit = async () => {
    if (!file) return;
    setState("uploading");
    setProgress(0);

    try {
      // 1. Upload to Supabase Storage
      const ext      = file.name.split(".").pop();
      const path     = `${matchId}/${playerId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("evidence")
        .upload(path, file, { upsert: false });

      if (uploadError) throw uploadError;
      setProgress(40);

      // 2. Create submission record
      const { data: sub, error: subError } = await supabase
        .from("submissions")
        .insert({
          match_id:     matchId,
          player_id:    playerId,
          evidence_url: path,
          ai_status:    "pending",
        })
        .select("id")
        .single();

      if (subError) throw subError;
      setProgress(60);

      // 3. Inform user (No longer waiting for AI)
      setState("pending_review");
      setProgress(100);

    } catch (err: any) {
      setError(err.message);
      setState("error");
    }
  };

  const confidencePct = result ? Math.round(result.confidence * 100) : 0;

  return (
    <div className={styles.wrapper}>
      <AnimatePresence mode="wait">

        {/* ── Idle / file pick ── */}
        {(state === "idle" || state === "error") && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE_OUT }}
            className={styles.dropZone}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/*,video/mp4,video/quicktime"
              className={styles.hiddenInput}
              onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
            />

            {preview ? (
              <img src={preview} alt="preview" className={styles.preview} />
            ) : (
              <div className={styles.dropPrompt}>
                <span className={styles.dropIcon}>📸</span>
                <p className={styles.dropLabel}>Arrastra tu captura de pantalla</p>
                <p className={styles.dropHint}>o haz clic para seleccionar · JPG, PNG, MP4 · máx 50 MB</p>
              </div>
            )}
          </motion.div>
        )}

        {/* ── Uploading ── */}
        {state === "uploading" && (
          <motion.div
            key="uploading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={styles.statusCard}
          >
            <span className={styles.statusIcon}>⬆️</span>
            <p className={`font-orbitron ${styles.statusLabel}`}>SUBIENDO EVIDENCIA</p>
            <div className={styles.progressBar}>
              <motion.div
                className={styles.progressFill}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4, ease: EASE_OUT }}
              />
            </div>
          </motion.div>
        )}

        {/* ── Pending Review ── */}
        {state === "pending_review" && (
          <motion.div
            key="pending"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: EASE_OUT }}
            className={styles.statusCard}
          >
            <span className={styles.statusIcon}>⚖️</span>
            <h3 className={`font-orbitron ${styles.statusLabel}`}>
              EVIDENCIA ENVIADA
            </h3>
            <p className={styles.statusHint}>
              Tu captura ha sido recibida correctamente. Un árbitro de ArenaCrypto la revisará en los próximos minutos para confirmar el resultado.
            </p>
            <div className={styles.progressBar} style={{ maxWidth: "100%", marginTop: "1rem" }}>
              <div className={styles.progressFill} style={{ width: "100%", background: "#F59E0B" }} />
            </div>
          </motion.div>
        )}

      </AnimatePresence>

      {/* ── Error message ── */}
      {errorMsg && (
        <p className={styles.errorMsg}>{errorMsg}</p>
      )}

      {/* ── Action buttons ── */}
      {(state === "idle" || state === "error") && (
        <div className={styles.actions}>
          {file && (
            <>
              <button
                className="btn-primary"
                style={{ flex: 1 }}
                onClick={handleSubmit}
              >
                ENVIAR PARA VALIDACIÓN IA
              </button>
              <button
                className={styles.btnClear}
                onClick={() => { setFile(null); setPreview(null); setError(null); }}
              >
                CAMBIAR
              </button>
            </>
          )}
          {!file && (
            <button
              className="btn-primary"
              style={{ width: "100%" }}
              onClick={() => inputRef.current?.click()}
            >
              SELECCIONAR EVIDENCIA
            </button>
          )}
        </div>
      )}
    </div>
  );
}
