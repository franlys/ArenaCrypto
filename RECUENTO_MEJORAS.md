# RECUENTO_MEJORAS - ArenaCrypto

## Mejoras Resueltas ✅
- **2026-04-10**: Definición de la arquitectura base: Next.js + Supabase + Web3 (Polygon).
- **2026-04-10**: Implementación del estándar de documentación corporativa (.claude/ folder logic).
- **2026-04-10**: Elección de Vanilla CSS p/ diseño premium y flexible.
- **2026-04-10**: Setup de Design System eSports (Neon Cyan/Purple) y Layout principal.
- **2026-04-10**: Hero Section c/ animaciones premium y optimización de imagen generada.
- **2026-04-11**: Implementación de Esquema de Supabase (Profiles, Wallets, Matches).
- **2026-04-11**: Configuración de Seguridad RLS y cliente de Supabase inicializado.

- **2026-04-13**: Fix crítico SSR — `Web3Provider` con `useState(() => getDefaultConfig(...))` lazy init.
- **2026-04-13**: Conflictos de dependencias Web3 resueltos (wagmi 2.x, framer-motion 11.x, @tanstack/react-query 5.x).
- **2026-04-13**: TypeScript `moduleResolution: "bundler"` para compatibilidad viem/ox/TS 5.9.
- **2026-04-13**: Layout CSS Grid 3 columnas (220px · 1fr · 264px) — `app-grid`, sidebars, top-bar glassmorphism.
- **2026-04-13**: `SidebarNav` con spring `layoutId` floating indicator, stagger, `useReducedMotion()`, `scale(0.97)` press.
- **2026-04-13**: Skills `emilkowalski-design` aplicada completa: easings, `@media (hover: hover)`, `prefers-reduced-motion`, `transition` específico.
- **2026-04-13**: Ruta `/wallets` creada (eliminado 404).
- **2026-04-13**: `next.config.js` con `transpilePackages` y webpack aliases para pino-pretty / async-storage.
- **2026-04-13**: `styled-jsx` eliminado de todos los Server Components → CSS modules.

- **2026-04-13**: Arena lobby `/arena` creada con 4 modos de juego.
- **2026-04-13**: Match room `/arena/[matchId]` reescrita — sin styled-jsx, Realtime status, evidencia integrada.
- **2026-04-13**: `EvidenceUpload` — drag-and-drop, Supabase Storage, Gemini Vision, estados animados.
- **2026-04-13**: API route `/api/validate-evidence` — Gemini 1.5 Flash, auto-resolve ≥80% confianza, dispute <80%.
- **2026-04-13**: `resolve_match` RPC — acredita payout al ganador, actualiza match status.
- **2026-04-13**: WalletHub depósito real — wagmi `useWriteContract` → USDC ERC20 transfer → `credit_deposit` RPC.
- **2026-04-13**: WalletHub retiro real — `request_withdrawal` RPC, tabla `withdrawal_requests`.
- **2026-04-13**: Premium page redesign — CSS module, botón gold emilkowalski, sin inline styles.
- **2026-04-13**: Catálogo de 35 juegos en tabla `games` con categorías y emojis.
- **2026-04-13**: Dashboard game selector carga de Supabase + pills de categoría + stake presets.

- **2026-04-14**: Panel admin exclusivo — route group `(admin)` independiente de `(app)`, sin sidebar de usuario, sin anuncios.
- **2026-04-14**: `AdminShell` — guarda `isAdmin`, redirige a `/dashboard` si no autorizado.
- **2026-04-14**: Fix `UserContext` — comparación de rol normalizada con `.toLowerCase()`.
- **2026-04-14**: Página `/profile` — avatar, badges, stats, historial de partidas, botón cerrar sesión.
- **2026-04-14**: Branding GonzalezLabs — pill cyan con glow en 4 ubicaciones del UI.
- **2026-04-14**: Precio Premium corregido 5 → 20 USDT.
- **2026-04-14**: `.gitignore` creado — protección de secrets (`.env.local` excluido).
- **2026-04-14**: `.env.example` documentado con las 8 variables requeridas.
- **2026-04-14**: Primer push a `github.com/franlys/ArenaCrypto`.
- **2026-04-14**: RPC `place_tournament_bet` — transacción atómica PostgreSQL (apuesta + balance en un solo bloque).
- **2026-04-14**: Fix admin DB — INSERT directo en `profiles` + `wallets` para `elmaestrogonzalez30@gmail.com`.

## Mejoras Pendientes 🚀
- Supabase Site URL → cambiar a URL de Vercel en Authentication → URL Configuration (emails redirigen a localhost).
- Registrar dominio en cloud.reown.com (WalletConnect) con la URL de Vercel de ArenaCrypto.
- Verificar todas las env vars en Vercel dashboard (AC y PT).
- Smart contract Polygon para escrow automatizado (actualmente escrow es wallet manual).
- Trigger Supabase `handle_new_user` — crear profile automáticamente al registrarse nuevos usuarios.
