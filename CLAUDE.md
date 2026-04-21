# CLAUDE.md — ArenaCrypto
> Guía maestra para cualquier agente IA que trabaje en este proyecto.
> Léelo **completo** antes de tocar una sola línea de código.

---

## 1. ¿Qué es ArenaCrypto?
Plataforma premium de apuestas deportivas y eSports con cripto, construida sobre **Next.js 14 (App Router)**, **Supabase (PostgreSQL + Auth + Realtime + Storage)** y **Polygon Network (USDC ERC-20)**. Integra dos ecosistemas:

| Sistema | URL / Ref | Rol |
|---|---|---|
| **ArenaCrypto (AC)** | `bcyzskbvcrqbzkuzihtn.supabase.co` | Plataforma principal — wallets, apuestas, mercados, admin |
| **Proyecto-Torneos (PT / Kronix)** | `otssvwinchttedisfqtr.supabase.co` | Motor de torneos externo — fuente de verdad para resultados |
| **SportAPI (RapidAPI)** | `sportapi7.p.rapidapi.com` | Eventos y resultados de deportes reales (fútbol, NBA, MLB) |
| **PandaScore** | `api.pandascore.co` | Torneos profesionales de eSports (LoL, CS2, Valorant) |

---

## 2. Stack Técnico

```
Frontend    → Next.js 14 App Router, Vanilla CSS modules, Framer Motion 11
Auth/DB     → Supabase (PostgreSQL 15, RLS activado en TODAS las tablas)
Blockchain  → Polygon Network, wagmi 2.x, viem, USDC ERC-20
IA          → Gemini 1.5 Flash (validación automática de evidencia de partidas)
Deploy      → Vercel (Hobby plan con Cron Jobs)
Estilos     → CSS Variables HSL, fuente Orbitron/Rajdhani, tema Neon eSports oscuro
```

---

## 3. Estructura del Proyecto

```
src/
├── app/
│   ├── (admin)/         → Panel admin (AdminShell.tsx verifica role='admin')
│   ├── (app)/           → App autenticada (AuthGuard.tsx protege todas las rutas)
│   ├── (marketing)/     → Landing, login, registro (público)
│   └── api/
│       ├── markets/sync/     → Cron Job: sincroniza mercados con Kronix (PT)
│       ├── sports/sync/      → Cron Job: sincroniza eventos deportivos externos
│       ├── sports/bet/       → Coloca apuesta en eventos externos
│       ├── validate-evidence/ → Gemini Vision valida capturas de partida
│       └── webhooks/         → Recibe webhook de Kronix con revenue
├── contexts/
│   └── UserContext.tsx   → user, profile, isAdmin, isPremium, isTestUser, loading
├── lib/
│   ├── supabase.ts       → Singleton anon client (NEVER service_role en client)
│   ├── supabase/tournament-db.ts → Singleton read-only PT bridge client
│   └── sportapi.ts       → Cliente SportAPI (eventos, resultados, búsquedas)
supabase/
└── migrations/           → Historial completo de migraciones SQL
```

---

## 4. Credenciales y Variables de Entorno

El archivo `.env.local` tiene TODAS las claves. Para referencia:

| Variable | Descripción |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL pública de ArenaCrypto |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anon AC (segura para el cliente) |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave admin AC (solo server/migrations) |
| `NEXT_PUBLIC_PT_SUPABASE_URL` | URL pública de PT/Kronix |
| `NEXT_PUBLIC_PT_SUPABASE_ANON_KEY` | Clave anon PT (solo lectura) |
| `RAPIDAPI_KEY` | Key de RapidAPI / SportAPI |
| `SPORTAPI_HOST` | `sportapi7.p.rapidapi.com` |
| `PANDASCORE_API_KEY` | Key de PandaScore (eSports pro) |
| `GEMINI_API_KEY` | Key de Google Gemini (AI evidence) |
| `CRON_SECRET` | Secreto para autorizar Cron Jobs |
| `AC_WEBHOOK_SECRET` | Secreto compartido con Kronix para webhooks |
| `NEXT_PUBLIC_ESCROW_ADDRESS` | Wallet Polygon que recibe USDC |

> ⚠️ **NUNCA** uses `SUPABASE_SERVICE_ROLE_KEY` en código del lado del cliente.


---

## 5. Reglas de Código — OBLIGATORIAS

### 5.1 Base de Datos
- **Siempre** usa `CREATE POLICY IF NOT EXISTS` → verificar primero con `DROP POLICY IF EXISTS`.
- **Siempre** usa `CREATE OR REPLACE FUNCTION` para funciones SQL.
- **Siempre** incluye la firma completa del argumento en `GRANT/REVOKE` si la función está sobrecargada (overloaded).
- Toda función admin debe tener `SECURITY DEFINER` + `SET search_path = public`.
- **Nunca** toques datos reales de la tabla `wallets.balance_stablecoin` sin pasar por una función RPC. Solo `test_balance` puede modificarse directamente.
- Las migraciones son **SIEMPRE idempotentes** — deben poder ejecutarse dos veces sin error.

### 5.2 Supabase CLI — Flujo de trabajo
```bash
# ArenaCrypto
npx supabase login --profile arena  # La primera vez
npx supabase link --project-ref bcyzskbvcrqbzkuzihtn --profile arena
npx supabase db push --profile arena

# Proyecto-Torneos (PT)
npx supabase login --token <TOKEN_DE_CHROME> --profile pt
npx supabase link --project-ref otssvwinchttedisfqtr --profile pt
npx supabase db push --profile pt
```
> ¡Usa SIEMPRE `--profile` para no mezclar cuentas! La cuenta de AC abre Edge, la de PT abre Chrome.

### 5.3 UserContext / Sesión
- NUNCA uses `supabase.auth.getSession()` en `UserContext` — causa race conditions. Solo usa `onAuthStateChange`.
- Ignora el evento `TOKEN_REFRESHED` para no re-fetch el perfil y evitar flashes de carga.
- `isAdmin` = `profile?.role?.toLowerCase() === 'admin'` — viene de `public.profiles.role`.
- `isPremium` = `!!profile?.is_premium`.
- `isTestUser` = `!!profile?.is_test_user` — usa `test_balance` en vez de `balance_stablecoin`.

### 5.4 Clientes Supabase
```typescript
// ✅ CORRECTO — usar singletons
import { supabase } from "@/lib/supabase";              // Anon client (frontend)
import { tournamentDb } from "@/lib/supabase/tournament-db"; // PT client (solo lectura)
// En API routes:
const acAdmin = createClient(url, serviceRoleKey);      // Admin AC (instanciar dentro del handler)

// ❌ MAL — nunca crear en top-level de módulo
const acAdmin = createClient(...)  // Esto genera múltiples GoTrueClient warnings
```

### 5.5 RLS y Recursividad
La política `"Admins can read all profiles"` usa `public.is_admin()` con `SECURITY DEFINER` para evitar recursividad infinita. **Nunca** pongas `SELECT ... FROM profiles WHERE id = auth.uid()` dentro de una política `ON profiles`.

---

## 6. Arquitectura de Mercados de Apuestas

### 6.1 Mercados de Torneos PT/Kronix (tabla: `bet_markets`)
```
Ciclo: open → closed → resolved
- open:     apuestas aceptadas
- closed:   partida en vivo / torneo iniciado
- resolved: resultado calculado, apostadores pagados
```
**Tipos de mercado por partida:**
- `round_winner` — equipo ganador de la partida
- `round_top_fragger` — equipo con más kills
- `round_top_placement` — equipo con mejor posición (solo battle_royale)
- `round_player_fragger` — jugador individual con más kills

**Tipos de mercado de torneo:**
- `tournament_winner` — campeón del torneo (solo antes del primer partido)
- `tournament_mvp` — jugador más letal de todo el torneo

### 6.2 Mercados de Deportes Externos (tabla: `external_bet_markets`)
```
Fuente: SportAPI (sportapi7.p.rapidapi.com)
Deportes: football, basketball, baseball
Tipo por defecto: match_winner (homeTeam / awayTeam / draw)
Pago: pari-mutuel con comisión 20% para ArenaCrypto
```

### 6.3 Función de Pago
```sql
-- Torneos PT/Kronix
SELECT resolve_market_internal(p_market_id, p_result_pt_team_id, p_result_pt_player_id);

-- Deportes externos
SELECT resolve_external_market(p_market_id, p_winner_name);
```
Ambas funciones pagan TANTO apuestas reales (`balance_stablecoin`) COMO de prueba (`test_balance`).

---

## 7. Cron Jobs Configurados (vercel.json)

| Horario | Endpoint | Acción |
|---|---|---|
| Cada 15 min | `POST /api/markets/sync` | Sincroniza torneos PT con mercados AC |
| 8:00 AM UTC | `GET /api/sports/sync?mode=open` | Abre mercados de partidos del día |
| 11:00 PM UTC | `GET /api/sports/sync?mode=resolve` | Resuelve mercados y paga apostadores |

> Los Cron Jobs necesitan `Authorization: Bearer <CRON_SECRET>` o `x-cron-secret: <CRON_SECRET>`.

---

## 8. Panel de Administrador

- URL: `/admin` (protegido por `AdminShell.tsx` — verifica `isAdmin`)
- Usuario admin: `elmaestrogonzalez30@gmail.com` (role='admin' en `public.profiles`)
- Secciones: Dashboard Economía · Mercados · Torneos · Retiros · Anuncios · Usuarios de Prueba

**Si el admin pierde su rol**, ejecutar:
```bash
node set_admin.mjs  # Script en la raíz del proyecto
```

---

## 9. Sistema de Usuarios de Prueba

Los usuarios con `is_test_user = true` en `profiles`:
- Usan `wallets.test_balance` en lugar de `balance_stablecoin`
- **No pueden** retirar fondos reales
- Las apuestas se marcan con `is_test = true` en `tournament_bets` y `external_bets`
- Los pagos van a `test_balance`, nunca a `balance_stablecoin`

---

## 10. Diseño y Estética

```css
/* Fuentes */
--font-primary: 'Orbitron', sans-serif;   /* Títulos, header */
--font-secondary: 'Rajdhani', sans-serif; /* Subtítulos, stats */
--font-body: 'Inter', sans-serif;         /* Cuerpo */

/* Colores principales */
--color-neon-cyan:   hsl(185, 100%, 50%);
--color-neon-purple: hsl(270, 80%, 60%);
--color-neon-gold:   hsl(45, 100%, 55%);
--color-bg-dark:     hsl(220, 20%, 6%);
--color-bg-card:     hsl(220, 16%, 10%);

/* Reglas */
- Dark mode siempre
- Glassmorphism en cards: backdrop-filter blur + border translúcido
- Micro-animaciones: scale(0.97) en :active, spring physics Framer Motion
- NUNCA usar 'transition: all' — siempre propiedades específicas
- @media (prefers-reduced-motion) SIEMPRE implementado
- @media (hover: hover) guard en hovers
```

---

## 11. Comandos de Desarrollo

```bash
npm run dev       # Servidor de desarrollo local (http://localhost:3000)
npm run build     # Build de producción (verificar antes de push)
npm run lint      # ESLint

# Base de datos
npx supabase db push --profile arena  # Sube migraciones a AC
npx supabase db push --profile pt     # Sube migraciones a PT

# Scripts útiles
node set_admin.mjs     # Restaurar rol admin a elmaestrogonzalez30@gmail.com
node verify_admin.mjs  # Verificar perfil del admin en Supabase
node test_apis.mjs     # Probar conectividad con SportAPI / PandaScore
node test_sync.mjs     # Probar sincronización de mercados con PT
```

---

## 12. Skills Disponibles en `.claude/skills/`

| Skill | Propósito |
|---|---|
| `emilkowalski-design.md` | Micro-animaciones, spring physics, press feedback |
| `frontend-design.md` | Sistema de diseño, CSS tokens, layout grid |
| `ui-ux-pro-max.md` | UX premium, glassmorphism, neon aesthetics |
| `vercel-best-practices.md` | Deploy, env vars, Cron Jobs en Vercel |
| `supervisor-agent.md` | Protocolo de revisión y validación de código |
| `supabase-migrations.md` | Reglas para migraciones SQL idempotentes |
| `sports-betting-integration.md` | Integración SportAPI, PandaScore, mercados externos |

---

## 13. Flujo de Trabajo Estándar para Nuevas Features

1. **Migración SQL primero** → archivo en `supabase/migrations/YYYYMMDDNNNNNN_nombre.sql` (idempotente)
2. **API Route** → `src/app/api/feature/route.ts` (instanciar clientes dentro del handler)
3. **Componente UI** → CSS module en `src/app/(app)/feature/feature.module.css`
4. **Build local** → `npm run build` debe pasar sin errores TypeScript
5. **Push a GitHub** → Vercel hace auto-deploy
6. **Push de migración** → `npx supabase db push --profile arena`

---

## 14. Historial de Problemas Conocidos y Soluciones

| Problema | Causa | Solución |
|---|---|---|
| `role 'admin'` se pierde tras `db push` | Migración re-aplica DEFAULT 'user' | `node set_admin.mjs` |
| `isAdmin` falso aunque rol=admin en DB | Recursividad infinita en RLS de profiles | Migración `20240512` usa `is_admin()` SECURITY DEFINER |
| `/api/markets/sync` 500 | `status enum` de PT no tiene 'pending'/'upcoming' | Usar `['draft', 'active', 'finished']` y `tournamentDb` singleton |
| GoTrueClient warnings | Clientes instanciados en top-level de módulo | Instanciar dentro del handler de la API route |
| `Cannot find package 'dotenv'` en scripts `.mjs` | ESM no resuelve dotenv | Leer `.env.local` manualmente con `fs.readFileSync` |
| Supabase CLI 403 profile mismatch | Dos cuentas distintas de Supabase | Login con `--profile arena` / `--profile pt` |
