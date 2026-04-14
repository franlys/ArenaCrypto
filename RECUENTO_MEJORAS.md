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

## Mejoras Pendientes 🚀
- Configurar 3 secrets: `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `NEXT_PUBLIC_ESCROW_ADDRESS`.
- Ejecutar migraciones en Supabase SQL Editor: `20240428`, `20240429`, `20240430`.
- WalletConnect dominio en cloud.reown.com al deployar a Vercel.
- Smart contract Polygon para escrow automatizado (actualmente escrow es wallet manual).
- Auth flow: crear profile automáticamente al registrarse (trigger Supabase).
