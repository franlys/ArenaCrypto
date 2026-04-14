# DEVLOG - ArenaCrypto

## 2026-04-10
### Actividad del día:
- Inicio del proyecto ArenaCrypto.
- Definición de "Anatomy of the .claude/ folder" como estándar de documentación.
- Creación de `REQUISITOS.md` formalizando la visión de la plataforma de apuestas.
- Inicialización de la estructura de carpetas básica.
- Planificación de fases en `task.md`.
- **Fase 1: Cimentación**: Configuración de Next.js con Vanilla CSS.
- Definición del Design System (HSL tokens, Orbitron font, Neon theme).
- Creación de `RootLayout` con integración de zonas de publicidad (Ad-Zones).
- Generación e implementación de Hero de alta calidad con Framer Motion.

### Estado:
- **Resuelto**: Estructura base, landing page, esquema de DB y políticas RLS (Seguridad).
- **Pendiente**: Sistema de autenticación y vinculación de perfiles.
- **En curso**: Implementación de Supabase Client y Auth UI.

## 2026-04-13
### Actividad del día:
- **Resolución total de conflictos de dependencias Web3**: wagmi 3→2.x, framer-motion 12→11.x, @tanstack/react-query instalado.
- **Fix crítico SSR**: `Web3Provider` refactorizado con `"use client"` + lazy init via `useState(() => ...)` para evitar crash de `getDefaultConfig` en server.
- **Corrección de imports**: `ConnectButton` agregado a layout, `User` type movido a `@supabase/supabase-js`, `supabase` client importado en dashboard.
- **TypeScript**: `moduleResolution: "bundler"`, `ignoreDeprecations: "6.0"` para compatibilidad con viem/ox/TS 5.9.
- **next.config.js creado**: `transpilePackages: ['framer-motion']`, webpack aliases para suprimir warnings de `pino-pretty` y `@react-native-async-storage`.
- **Rediseño del Layout CSS** (skills: `frontend-design`, `ui-ux-pro-max`):
  - `.app-grid`: CSS Grid 3 columnas (220px · 1fr · 264px) con footer span completo.
  - `.sidebar-left`: Panel oscuro sticky con nav Orbitron y efecto `border-left` activo neon-cyan.
  - `.sidebar-right`: Panel translúcido con scrollbar personalizado.
  - `.top-bar`: Barra superior glassmorphism con `backdrop-filter: blur`.
  - Fuente `Rajdhani` agregada para subtítulos y stats.
  - `styled-jsx` eliminado de page.tsx y premium/page.tsx → CSS modules y globals.css.
  - Hero stats convertidos a `home.module.css` con `flex-direction: row` garantizado.
  - Responsive: colapso a 64px sidebar en tablet, hidden en mobile.

- **SidebarNav.tsx creado** (skill `emilkowalski-design`):
  - `layoutId="nav-active-pill"` spring floating indicator entre items.
  - `layoutId="nav-glow-bar"` neon bar (left edge, 2.5px, box-shadow cyan).
  - Stagger 50ms entre items: `delay: i * 0.05`, slide `x: -10 → 0`.
  - `useReducedMotion()` — zero-duration springs + no initial animation cuando activado.
  - `@media (hover: hover) and (pointer: fine)` guard en hover styles CSS.
  - `link:active { transform: scale(0.97) }` — press feedback responsivo.
  - `transition: color 150ms ease-out` (propiedad específica, nunca `all`).
  - Pulse decorativo en network dot (`animation: pulse 2.5s ease-in-out infinite`).
- **globals.css** (skills: `emilkowalski-design`, `ui-ux-pro-max`):
  - Custom easings: `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)`, `--ease-in-out`, `--ease-drawer`.
  - `.btn-primary:active { transform: scale(0.97) }` — emilkowalski press feedback.
  - `transition: transform 160ms var(--ease-out), box-shadow 160ms var(--ease-out)` (no `all`).
  - `@media (hover: hover)` guard en hover del botón.
  - `@media (prefers-reduced-motion: reduce)` — transitions eliminadas.
  - Hex vars `--color-*` para compatibilidad PostCSS (no `hsl(var() / alpha)`).
- **Ruta `/wallets` creada**: página faltante que causaba 404 desde la nav.
- **Build verificado**: `✓ Compiled successfully`, 8 rutas estáticas generadas (2026-04-13).

### Estado:
- **Resuelto**: Build limpio, layout 3 columnas funcional, skills emilkowalski + frontend-design + ui-ux-pro-max aplicadas completamente.
- **Pendiente**: WalletConnect `projectId` real (actualmente placeholder → 403 en build, no bloquea).
- **En curso**: Auth flow, vinculación de perfil y sistema de matchmaking.

## 2026-04-13 (sesión 2)
### Actividad del día — Eliminación total de mocks:
- **`/arena` page**: Creada página lobby con 4 modos (1v1 Ranked, 1v1 Cash, 2v2, Torneo).
- **`/arena/[matchId]` reescrita**: Sin styled-jsx, CSS module completo, Realtime status updates, EvidenceUpload integrado.
- **EvidenceUpload component**: Drag-and-drop, upload a Supabase Storage bucket `evidence`, llamada a API route de Gemini, estados animados (idle → uploading → validating → resolved/disputed).
- **`/api/validate-evidence`**: API route real con `@google/generative-ai` (gemini-1.5-flash), prompt de juez eSports, auto-resolve si confidence ≥ 0.80, dispute si < 0.80.
- **WalletHub**: Depósito real con `useWriteContract` → USDC ERC20 `transfer()` → `credit_deposit` RPC. Retiro con `request_withdrawal` RPC.
- **Premium page**: Reescrita sin inline styles, CSS module gold, emilkowalski `scale(0.97)` en `:active`.
- **Migraciones SQL**: `evidence` Storage bucket + RLS, `credit_deposit`, `request_withdrawal`, `resolve_match`, `withdrawal_requests` table.
- **Catálogo de juegos**: 35 juegos en tabla `games` con categorías FPS/MOBA/Sports/BR/Fighting/RTS/Other.
- **Dashboard**: Game selector carga de Supabase (fallback a 5 hardcoded), category pills, stake presets $5/$10/$25/$50/$100, wallet chip.
- **Games catalog migration**: `20240428000000_games_catalog.sql`.
- **`join_arena_queue` RPC**: Matchmaking engine con fallback a direct insert.
- **Singleton WalletConnect**: Módulo-level para evitar double-init en React StrictMode.

### Estado:
- **Resuelto**: 0 mocks funcionales. Build limpio. Todas las features conectadas a Supabase + Polygon.
- **Pendiente (3 secrets)**: `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `NEXT_PUBLIC_ESCROW_ADDRESS` en `.env.local`.
- **Pendiente (SQL)**: Ejecutar las 3 migraciones nuevas en Supabase SQL Editor.
- **Pendiente**: Dominio en cloud.reown.com al deployar a Vercel.

---

## 2026-04-13 (sesión 3) — Integración con Motor de Torneos (Proyecto-torneos)
### Actividad del día:
- **Planificación de Fusión**: Definición de la arquitectura de "Conexión Selectiva" para permitir apuestas de espectadores solo en torneos gestionados.
- **Diseño del Agregador**: Especificación del servicio `StreamAggregator` para sumar audiencia de Twitch, YouTube y Kick.
- **Preparación de Schema**: Planificación de migraciones SQL para portar el motor de PT a la DB de ArenaCrypto (renombrando tablas conflictivas a `tournament_matches` y `tournament_submissions`).
- **Estado Inicial**: Task list creada y plan de implementación aprobado.

### Estado:
- **Resuelto**: Plan de arquitectura definido.
- **En curso**: Creación de la migración SQL de consolidación.
- **Pendiente**: Portar componentes de UI y servicios de IA.

---

## 2026-04-14
### Actividad del día — Arquitectura de Puente y Exclusividad:
- **Finalización de la Arquitectura de Puente (Bridge)**: Implementación de la conexión segura de lectura hacia Proyecto-Torneos para sincronizar torneos en tiempo real sin duplicación de datos.
- **Sistema de Acceso Exclusivo (Gatekeeping)**:
    - **Membresía Premium**: Actualizado el costo de activación de 5 USDT a **20 USDT** en la función RPC `upgrade_to_premium`.
    - **Códigos de Streamers**: Creación de la tabla `streamer_codes` y lógica de desbloqueo. Los fans pueden usar códigos (ej: `ARENA2026`) para acceder gratis a las apuestas.
    - **Persistencia de Desbloqueo**: Tabla `tournament_unlocks` para mantener el acceso de un usuario a un torneo específico tras usar un código.
- **Apuestas Avanzadas (Winner vs MVP)**:
    - **Tabs de Apuestas**: Refactorización de la UI de apuestas para permitir mercados múltiples.
    - **MVP del Torneo**: Integración de apuestas por jugadores individuales (Top Fragger), extrayendo el roster de participantes directamente desde PT.
    - **Payout Engine v2**: Actualizado el motor de pagos para resolver automáticamente apuestas por Ganador y MVP usando los standings y kills de la base de datos puente.
- **Bridge Cleanup**: Eliminada la tabla local de `streamer_codes` en AC. Ahora AC lee los códigos directamente desde la DB de Proyecto-Torneos a través del puente, centralizando la gestión en el panel administrativo de PT.

### Estado:
- **Resuelto**: Integración de puente finalizada. Sistema de códigos centralizado en PT. Apuestas avanzadas operativas.
- **Pendiente**: Configurar variables de entorno `NEXT_PUBLIC_PT_SUPABASE_URL` y `NEXT_PUBLIC_PT_SUPABASE_ANON_KEY` en producción.
