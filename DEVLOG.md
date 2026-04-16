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
- **Finalización de la Arquitectura de Puente (Bridge)**: Implementación de la conexión segura de lectura hacia Proyecto-Torneos.
- **Sistema de Acceso Exclusivo**: Membresía Premium 20 USDT, códigos de streamers, tabla `tournament_unlocks`.
- **Apuestas Avanzadas**: Tabs Winner vs MVP, payout engine v2, roster de participantes desde PT.
- **Bridge Cleanup**: Códigos centralizados en PT, AC lee via puente.

---

## 2026-04-14 (sesión 4) — Admin exclusivo, perfil de usuario, fix autenticación

### Actividad del día:
- Fix admin DB, route group `(admin)` independiente, `AdminShell`, página `/profile`, branding GonzalezLabs, precio Premium 20 USDT, `.gitignore`, `.env.example`, primer push a GitHub.

### Estado:
- **Resuelto**: Admin exclusivo funcional, perfil de usuario, deploy en Vercel.

---

## 2026-04-15 — Sistema de Mercados de Apuestas y Revenue Share Kronix

### Actividad del día:
- Sistema de mercados `bet_markets` (5 tipos, ciclo open/closed/resolved).
- Origin tracking por apuesta (`'kronix'` / `'arena'`).
- Revenue share: `kronix_revenue`, `calculate_tournament_revenue()`, comisión 1% volumen Kronix.
- `POST /api/markets/sync` — sync + resolución + webhook automático.
- Panel MERCADOS en admin con KPIs y botón SYNC.

---

## 2026-04-16 — UX Apuestas, Anuncios, Tipos de Torneo, Retiros y EN VIVO

### Actividad del día:

#### UX Mercados de Apuestas
- **`BetForm` modo compacto**: Cada equipo/jugador es una fila expandible inline con montos rápidos ($5/$10/$25/$50) en lugar de tarjeta grande. Escala correctamente con 15+ equipos.
- **`AdvancedBettingTabs` rediseñado**: Cada tipo de mercado es una sección colapsable (acordeón) con descripción y botón `i` que explica qué se está apostando.
- **Botón `i` (info)**: Aparece en cada sección de mercado — oculto por defecto, muestra descripción al hacer clic. Aplica también a mercados de torneo (CAMPEÓN, MVP).
- **Nombres clarificados**: GANADOR DE PARTIDA, EQUIPO MÁS LETAL, MEJOR POSICIONAMIENTO, JUGADOR MÁS LETAL, GANADOR DEL TORNEO, MVP DEL TORNEO.

#### Sistema de Banners Publicitarios
- **Migración `20240507000000_ads_system.sql`**: Tabla `ads` con posición, vigencia, toggle activo/inactivo. Bucket Storage `ads` público. RLS: lectura pública de activos, CRUD solo admin.
- **Panel admin `/admin/ads`**: Listar, crear (con upload de imagen), activar/desactivar y eliminar anuncios. Upload directo a Supabase Storage.
- **`AdZone` dinámico**: 4 layouts según posición (`banner_top`, `between_tournaments`, `sidebar`, `tournament_page`). Rotación automática cada 8s si hay varios anuncios. Oculto para usuarios Premium.
- **Integrado en lobby de torneos**: Strip superior (`banner_top`) + tarjeta intercalada en el grid (`between_tournaments`, cada 3 torneos).
- **ANUNCIOS agregado al `AdminSidebar`** con ícono `Megaphone`.

#### Adaptación por Tipo de Torneo
- **Problema detectado**: `round_top_placement` no tiene sentido en un kill race (no hay mecánica de posicionamiento). El sync creaba los 4 mercados de ronda siempre.
- **`ROUND_MARKETS_BY_TYPE`** en `sync/route.ts`: mapeo de tipo → mercados válidos.
  - `kill_race`: solo `round_top_fragger` + `round_player_fragger`
  - `battle_royale`: los 4 mercados
  - `deathmatch`: 3 mercados (sin placement)
  - `eliminacion_directa`: solo `round_winner`
- **`resolveTournamentType()`**: normaliza `tournament_type` o `format` (enum de PT) al key del mapa.
- **Resolución adaptada**: en kill_race el ganador se determina por `kill_count`, no por `rank === 1`.
- **Comandos SQL para PT**: `tournament_type` TEXT, `rank` en submissions, `player_kills` JSONB, `is_warmup` en matches, políticas públicas de lectura.
- **XVI COUP** marcado como `kill_race` en PT. Mercados inválidos (`round_winner`, `round_top_placement`) eliminados de AC.

#### Panel de Retiros Mejorado
- **Migración `20240508000000_withdrawal_paid_fields.sql`**: Columnas `paid_at`, `paid_by`, `notes` en `withdrawal_requests`.
- **RPC `admin_complete_withdrawal`**: Admin marca retiro como completado + guarda TX hash de Polygon. Solo ejecutable por admins.
- **RPC `admin_reject_withdrawal`**: Marca como fallido + devuelve saldo al usuario automáticamente. Solo ejecutable por admins.
- **Panel rediseñado** con 4 pestañas (Pendientes / En proceso / Completados / Rechazados), resumen de USDC total por pagar, flujo paso a paso (copiar dirección → enviar en wallet → pegar TX hash → confirmar), link directo a Polygonscan.

#### Indicador EN VIVO sincronizado con PT
- **PT agrega `is_active BOOLEAN`** a la tabla `matches` — solo una partida activa por torneo a la vez.
- **Sync actualizado**: al detectar `is_active = true` en una partida no completada, cierra sus mercados abiertos (ventana de apuestas cerrada).
- **Página del torneo** fetcha el match activo desde PT y pasa `liveMatchIds` al componente.
- **Tab de partida activa** muestra `🔴 PARTIDA N` en rojo en lugar de `⚔️ PARTIDA N` verde.
- **Banner EN VIVO** dentro del tab con punto pulsante (`@keyframes pulse-dot`) y mensaje explicativo.

### Estado:
- **Resuelto**: UX apuestas escalable, anuncios dinámicos, adaptación por tipo de torneo, retiros con TX hash, indicador EN VIVO.
- **Resuelto (sesión posterior)**: Migración `20240508000000` ejecutada en AC. 6 SQL de PT ejecutados en Kronix. Dominio autorizado en cloud.reown.com.

---

## 2026-04-16 (sesión 2) — Seguridad de sesión y cierre por inactividad

### Actividad del día:
- **Timeout de autenticación**: `getSession()` tiene ahora un cap de 6 segundos. Si Supabase no responde (token expirado, red lenta, sesión colgada), `loading` se fuerza a `false` y el usuario ve la pantalla de login en lugar de quedarse en "AUTENTICANDO…" indefinidamente.
- **Cierre de sesión por inactividad**: `UserContext` ahora rastrea actividad del usuario (mouse, teclado, scroll, touch). Si pasan 30 minutos sin ninguna acción, se ejecuta `supabase.auth.signOut()` automáticamente. El timer se cancela al desloguearse y se reactiva al volver a autenticarse.
- **Implementación limpia**: handler almacenado en `useRef` para mantener referencia estable entre renders. `ACTIVITY_EVENTS` const tipado. Sin stale closures.

### Estado:
- **Resuelto**: Sesión nunca se queda colgada. Inactividad >30min cierra sesión automáticamente.
- **Pendiente**: Smart contract Polygon para escrow automatizado.
- **Pendiente**: Trigger `handle_new_user` para profiles automáticos.
