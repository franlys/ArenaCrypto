-- Migration: Sistema de Banners Publicitarios
-- Permite al admin de AC gestionar anuncios dinámicos con imagen, link, posición y vigencia.

-- ── Tabla ads ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ads (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT,
  image_url   TEXT NOT NULL,
  link_url    TEXT NOT NULL,
  position    TEXT NOT NULL CHECK (position IN ('banner_top', 'between_tournaments', 'sidebar', 'tournament_page')),
  is_active   BOOLEAN DEFAULT TRUE,
  starts_at   TIMESTAMPTZ DEFAULT NOW(),
  ends_at     TIMESTAMPTZ,                         -- NULL = sin fecha de expiración
  created_by  UUID REFERENCES auth.users ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;

-- Lectura pública: solo anuncios activos dentro de su vigencia
DROP POLICY IF EXISTS "public_read_active_ads" ON public.ads;
CREATE POLICY "public_read_active_ads" ON public.ads
  FOR SELECT
  USING (
    is_active = TRUE
    AND (starts_at IS NULL OR starts_at <= NOW())
    AND (ends_at   IS NULL OR ends_at   >= NOW())
  );

-- CRUD completo solo para admins
DROP POLICY IF EXISTS "admin_full_access_ads" ON public.ads;
CREATE POLICY "admin_full_access_ads" ON public.ads
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ── Storage bucket "ads" ────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('ads', 'ads', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Admins pueden subir/eliminar archivos
DROP POLICY IF EXISTS "admins_upload_ads" ON storage.objects;
CREATE POLICY "admins_upload_ads" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'ads'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "admins_delete_ads" ON storage.objects;
CREATE POLICY "admins_delete_ads" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'ads'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Lectura pública de imágenes
DROP POLICY IF EXISTS "public_read_ads_images" ON storage.objects;
CREATE POLICY "public_read_ads_images" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'ads');

-- ── updated_at automático ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_ads_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ads_updated_at ON public.ads;
CREATE TRIGGER ads_updated_at
  BEFORE UPDATE ON public.ads
  FOR EACH ROW EXECUTE FUNCTION public.set_ads_updated_at();
