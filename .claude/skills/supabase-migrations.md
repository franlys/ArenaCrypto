# Skill: Supabase Migrations — Reglas de Idempotencia

## Principio Fundamental
Toda migración DEBE poder ejecutarse dos o más veces sin producir errores.
Supabase Cloud aplica migraciones de forma acumulativa — si hay un error, el proceso se detiene.

## Plantilla Estándar

### Tablas
```sql
CREATE TABLE IF NOT EXISTS public.nombre_tabla (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- columnas...
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Políticas RLS (SIEMPRE DROP antes de CREATE)
```sql
-- ✅ CORRECTO
DROP POLICY IF EXISTS "Nombre de la política" ON public.tabla;
CREATE POLICY "Nombre de la política"
  ON public.tabla FOR SELECT
  USING (auth.uid() = user_id);

-- ❌ MAL — falla si ya existe
CREATE POLICY "Nombre de la política" ON public.tabla...
```

### Funciones
```sql
-- ✅ CORRECTO — siempre CREATE OR REPLACE
CREATE OR REPLACE FUNCTION public.nombre_funcion(...)
RETURNS tipo
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$ ... $$;
```

### Triggers
```sql
-- Siempre DROP antes de CREATE
DROP TRIGGER IF EXISTS nombre_trigger ON public.tabla;
CREATE TRIGGER nombre_trigger
  AFTER INSERT ON public.tabla
  FOR EACH ROW EXECUTE FUNCTION public.funcion_handler();
```

### Índices
```sql
CREATE INDEX IF NOT EXISTS idx_tabla_columna ON public.tabla(columna);
```

## Funciones con Sobrecarga (Overloading)
Si una función tiene múltiples firmas (overloaded), siempre especifica los tipos en GRANT/REVOKE:

```sql
-- ✅ CORRECTO
GRANT EXECUTE ON FUNCTION public.place_tournament_bet(UUID, UUID, NUMERIC, BOOLEAN) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.place_tournament_bet(UUID, UUID, NUMERIC, BOOLEAN) FROM PUBLIC;

-- ❌ MAL — PostgreSQL no sabe cuál función quieres
GRANT EXECUTE ON FUNCTION public.place_tournament_bet TO authenticated;
```

## Funciones Admin con SECURITY DEFINER
Toda función que acceda a datos sin restricciones RLS debe:
```sql
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER          -- Omite RLS internamente
SET search_path = public  -- Previene ataques de search_path injection
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;
```

## Evitar Recursividad en Policies de Profiles
```sql
-- ❌ MAL — infinita recursión (la policy llama profiles que llama la policy)
CREATE POLICY "Admins can read all profiles"
ON public.profiles FOR SELECT
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' -- ← recursivo!
  OR auth.uid() = id
);

-- ✅ CORRECTO — usar función SECURITY DEFINER
CREATE POLICY "Admins can read all profiles"
ON public.profiles FOR SELECT
USING (public.is_admin() OR auth.uid() = id);
```

## Enum del Status de Torneos en PT/Kronix
El campo `status` en la tabla `tournaments` de PT usa estos valores exactos:
```
'draft'    → Torneo creado, aún no iniciado (equivalente a 'pending')
'active'   → Torneo en progreso
'finished' → Torneo finalizado
```
**NUNCA** uses 'pending', 'upcoming', 'scheduled' — no existen en el enum de PT.

## Flujo de Subida de Migraciones
```bash
# Crear archivo con timestamp único
# supabase/migrations/YYYYMMDDNNNNNN_descripcion.sql

# Verificar que la migración es válida localmente (opcional)
# Luego subir:
npx supabase db push --profile arena   # Para ArenaCrypto
npx supabase db push --profile pt      # Para Proyecto-Torneos
```
