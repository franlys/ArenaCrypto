import Link from "next/link";

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1.5rem",
        padding: "2rem",
        textAlign: "center",
        background: "hsl(var(--bg-primary))",
      }}
    >
      <p
        className="font-orbitron"
        style={{
          fontSize: "clamp(4rem, 15vw, 8rem)",
          lineHeight: 1,
          color: "#00F5FF",
          textShadow: "0 0 40px rgba(0, 245, 255, 0.4)",
          margin: 0,
        }}
      >
        404
      </p>

      <h1
        className="font-orbitron"
        style={{
          fontSize: "clamp(1rem, 3vw, 1.4rem)",
          letterSpacing: "0.15em",
          color: "hsl(var(--text-primary))",
          margin: 0,
        }}
      >
        SECTOR NO ENCONTRADO
      </h1>

      <p
        className="font-rajdhani"
        style={{
          fontSize: "0.95rem",
          color: "hsl(var(--text-muted))",
          letterSpacing: "0.04em",
          maxWidth: "360px",
          lineHeight: 1.6,
        }}
      >
        Esta zona de la arena no existe. Puede que la URL sea incorrecta o que
        la página haya sido eliminada.
      </p>

      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "center" }}>
        <Link href="/" className="btn-primary" style={{ fontSize: "0.75rem", letterSpacing: "0.15em", padding: "0.8rem 2rem" }}>
          IR AL INICIO
        </Link>
        <Link href="/dashboard" className="btn-secondary" style={{ fontSize: "0.75rem", letterSpacing: "0.12em" }}>
          MI DASHBOARD
        </Link>
      </div>
    </div>
  );
}
