# Skill: Sports Betting Integration — SportAPI + PandaScore

## Proveedores Configurados

### 1. SportAPI (Deportes Reales)
- **Host**: `sportapi7.p.rapidapi.com`
- **Key env**: `RAPIDAPI_KEY`
- **Cobertura**: Fútbol, Baloncesto, Béisbol, Tenis, UFC
- **Datos de SofaScore** — misma estructura, misma fiabilidad
- **Plan**: Gratuito (limitado a peticiones razonables)

#### Endpoints clave:
```
GET /api/v1/sport/{sport}/scheduled-events/{date}  → Eventos del día
GET /api/v1/sport/{sport}/events/live              → Eventos en vivo ahora
GET /api/v1/event/{id}                             → Detalle/resultado de evento
GET /api/v1/search/all?q={query}                   → Buscar ligas/equipos
```

#### Slugs de deporte:
```
football    → Fútbol (soccer)
basketball  → Baloncesto (NBA, EuroLeague)
baseball    → Béisbol (MLB)
tennis      → Tenis (ATP, WTA)
mma         → Artes marciales mixtas (UFC)
```

#### winnerCode en eventos finalizados:
```
1 → Local (homeTeam) gana
2 → Visitante (awayTeam) gana
3 → Empate (draw)
```

#### Torneos destacados (IDs de SofaScore/SportAPI):
```javascript
const FEATURED_TOURNAMENT_IDS = new Set([
  7,    // UEFA Champions League
  679,  // Premier League (Inglaterra)
  8,    // La Liga (España)
  23,   // Serie A (Italia)
  35,   // Bundesliga (Alemania)
  34,   // Ligue 1 (Francia)
  242,  // MLS (USA)
  132,  // NBA
  64,   // MLB
]);
```

### 2. PandaScore (eSports Profesionales)
- **Base URL**: `https://api.pandascore.co`
- **Auth**: `?token=<PANDASCORE_API_KEY>` en query param O `Authorization: Bearer <token>`
- **Plan**: 1,000 peticiones/mes gratuitas
- **Cobertura**: LoL, CS2, Dota 2, Valorant, PUBG, Overwatch, Rocket League

#### Endpoints clave:
```
GET /tournaments?status=running         → Torneos activos
GET /tournaments?status=upcoming        → Próximos torneos
GET /matches?filter[tournament_id]={id} → Partidas de un torneo
GET /matches/{id}                       → Detalle y resultado
```

## Cliente SportAPI (`src/lib/sportapi.ts`)

```typescript
import { getScheduledEvents, getLiveEvents, getEventById } from "@/lib/sportapi";

// Obtener partidos de hoy
const events = await getScheduledEvents("football", "2026-04-21");

// Solo torneos importantes
const featured = events.filter(e => FEATURED_TOURNAMENT_IDS.has(e.tournament.id));

// Resultado de un partido terminado
const event = await getEventById(12345678);
if (event.status.type === "finished" && event.winnerCode) {
  const winner = event.winnerCode === 1 ? event.homeTeam.name
               : event.winnerCode === 2 ? event.awayTeam.name
               : "draw";
}
```

## Tablas de Base de Datos

### `external_bet_markets`
```sql
-- Registro de cada partido apostable
external_event_id TEXT    -- ID del evento en SportAPI
external_sport   TEXT    -- "football", "basketball", etc.
market_type      TEXT    -- 'match_winner' (por defecto)
status           TEXT    -- 'open' | 'closed' | 'resolved' | 'cancelled'
starts_at        TIMESTAMPTZ
winner_name      TEXT    -- nombre del equipo ganador o "draw"
home_score/away_score INT
```

### `external_bets`
```sql
market_id  UUID → external_bet_markets.id
user_id    UUID → profiles.id
pick_name  TEXT  -- "Real Madrid", "Barcelona", "draw"
amount     NUMERIC -- en USDC / saldo de prueba
is_test    BOOLEAN -- true si apostó con saldo de prueba
status     TEXT -- 'pending' | 'won' | 'lost' | 'paid'
```

## Función de Pago: `resolve_external_market(market_id, winner_name)`

Paga de forma **pari-mutuel** con **80% al pozo de ganadores** y **20% a ArenaCrypto**:
```
(apuesta_del_ganador / pozo_total_ganadores) × pozo_total × 0.80
```
- Bets reales → `wallets.balance_stablecoin`
- Bets prueba → `wallets.test_balance`

## Flujo Automático (Cron Jobs en Vercel)

```
8:00 AM UTC  → GET /api/sports/sync?mode=open&secret=...
               - Llama SportAPI para los eventos del día
               - Filtra por FEATURED_TOURNAMENT_IDS
               - Crea registros en external_bet_markets (status='open')

11:00 PM UTC → GET /api/sports/sync?mode=resolve&secret=...
               - Lee todos los external_bet_markets con status='open'
               - Para cada uno, llama getEventById() en SportAPI
               - Si status.type === 'finished' → extrae winnerCode → llama resolve_external_market()
```

## Autorización del Cron
```bash
# En Vercel, el secret va en el URL de la ruta de cron:
GET /api/sports/sync?secret=186e158ec8e...&mode=open

# En API routes programáticas:
POST /api/sports/sync
Headers: { "x-cron-secret": "186e158ec8..." }
```

## Añadir Nuevos Deportes

1. Añadir el slug en `ENABLED_SPORTS` en `sync/route.ts`
2. Si la API usa diferente winnerCode o estructura, adaptar la lógica en `getEventById` o en el resolver
3. Agregar los IDs de ligas importantes en `FEATURED_TOURNAMENT_IDS`
4. Crear un tipo de mercado nuevo si aplica (ej: `set_winner` para tenis)
