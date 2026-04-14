# Implementation Plan - Admin Dashboard (Economy & Events)

Este plan detalla la creación de un panel administrativo premium para gestionar la economía de la plataforma (ganancias, comisiones, retiros) y la creación de eventos (torneos).

## User Review Required

> [!IMPORTANT]
> Propongo añadir una columna `role` a la tabla `profiles` para gestionar el acceso. ¿Deseas que asigne automáticamente el rol `admin` a tu usuario actual?

> [!NOTE]
> La economía se basará en la comisión del 20% ya definida en los esquemas de bases de datos existentes.

## Proposed Changes

### Database & Security

#### [MODIFY] [20240421000000_arenacrypto_schema.sql](file:///c:/Users/elmae/.gemini/antigravity/scratch/ArenaCrypto/supabase/migrations/20240421000000_arenacrypto_schema.sql)
- Añadir columna `role` (TEXT) a la tabla `profiles` con valores `user` (default) y `admin`.

#### [NEW] [20240501000000_admin_views_and_roles.sql](file:///c:/Users/elmae/.gemini/antigravity/scratch/ArenaCrypto/supabase/migrations/20240501000000_admin_views_and_roles.sql)
- Crear vista `admin_stats`: Suma de `house_commission` de partidas resueltas y torneos completados.
- Crear vista `pending_withdrawals`: Lista de solicitudes de retiro con estado `pending`.
- RLS: Restringir acceso a estas vistas solo a usuarios con `role = 'admin'`.

---

### UI Components (Admin Dashboard)

#### [NEW] [AdminLayout.tsx](file:///c:/Users/elmae/.gemini/antigravity/src/app/admin/layout.tsx)
- Sidebar especializado para administración.
- Verificación de sesión y rol de administrador.

#### [NEW] [EconomyOverview.tsx](file:///c:/Users/elmae/.gemini/antigravity/src/components/Admin/EconomyOverview.tsx)
- Widgets de métricas: Total Revenue, Pending Payouts, Active Stakes.
- Visualización de flujo de caja (Gráficos minimalistas con CSS/SVG).

#### [NEW] [EventManager.tsx](file:///c:/Users/elmae/.gemini/antigravity/src/components/Admin/EventManager.tsx)
- Formulario de creación de torneos (Título, Juego, Entrada, Cupos).
- Integración con la tabla `games` para selección de títulos.
- Botón de "Empezar Torneo" (Llama a la función RPC `generate_round_robin_matches`).

---

### Routes

#### [NEW] [admin/page.tsx](file:///c:/Users/elmae/.gemini/antigravity/src/app/admin/page.tsx)
- Dashboard principal de economía.

#### [NEW] [admin/events/page.tsx](file:///c:/Users/elmae/.gemini/antigravity/src/app/admin/events/page.tsx)
- Interfaz de gestión de torneos y eventos.

## Open Questions

- **Acceso Inicial**: ¿Cuál es el ID de usuario o correo que debemos marcar como admin inicialmente para que puedas entrar?
- **Gráficos**: ¿Prefieres simplicidad con barras CSS o que instale una librería como `recharts` para gráficos más complejos?

## Verification Plan

### Automated Tests
- Verificar que un usuario con `role = 'user'` sea redirigido fuera de `/admin`.
- Simular la creación de un torneo y verificar su aparición en la base de datos.

### Manual Verification
- Acceder como admin y verificar que las ganancias coincidan con la suma de las comisiones de las partidas simuladas.
- Crear un torneo de prueba y verificar que los usuarios puedan verlo en su dashboard.
