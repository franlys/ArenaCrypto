-- ============================================================
-- Migration: Fix admin security & schema gaps (Robust Edition)
-- 1. Ensure admin views exist and restrict access
-- 2. Add missing tournament_id column to matches
-- 3. Ensure house_commission defaults to 0
-- 4. Centralize access through SECURITY DEFINER functions
-- ============================================================

-- ── 1. Ensure views exist before we secure them ──────────────
-- (Copied from 20240501 to ensure they exist even if that script failed half-way)

CREATE OR REPLACE VIEW public.admin_economy_stats AS
WITH match_revenue AS (
  SELECT 
    COALESCE(SUM(house_commission), 0) as total_match_commission,
    COUNT(*) as total_matches_resolved
  FROM public.matches
  WHERE status = 'resolved'
),
tournament_revenue AS (
  SELECT 
    COALESCE(SUM(entry_fee * max_participants * commission_rate), 0) as total_tournament_commission,
    COUNT(*) as total_tournaments
  FROM public.tournaments
  WHERE status = 'completed' OR status = 'in_progress'
),
withdrawals_summary AS (
  SELECT 
    COALESCE(SUM(amount), 0) as total_pending_withdrawals
  FROM public.withdrawal_requests
  WHERE status = 'pending'
)
SELECT 
  m.total_match_commission + t.total_tournament_commission as total_platform_revenue,
  m.total_match_commission,
  t.total_tournament_commission,
  m.total_matches_resolved,
  t.total_tournaments,
  w.total_pending_withdrawals
FROM match_revenue m, tournament_revenue t, withdrawals_summary w;

CREATE OR REPLACE VIEW public.admin_pending_withdrawals AS
SELECT 
  wr.id,
  wr.user_id,
  p.username,
  wr.amount,
  wr.to_address,
  wr.created_at,
  wr.status
FROM public.withdrawal_requests wr
JOIN public.profiles p ON wr.user_id = p.id
WHERE wr.status = 'pending';

-- ── 2. Secure views (RPC wrapper) ───────────────────────────

-- Drop the over-permissive grants if they exist
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'admin_economy_stats') THEN
    REVOKE SELECT ON public.admin_economy_stats FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'admin_pending_withdrawals') THEN
    REVOKE SELECT ON public.admin_pending_withdrawals FROM authenticated;
  END IF;
END $$;

-- Create security-definer RPC function
CREATE OR REPLACE FUNCTION get_admin_economy_stats()
RETURNS TABLE (
  total_platform_revenue     NUMERIC,
  total_match_commission     NUMERIC,
  total_tournament_commission NUMERIC,
  total_matches_resolved     BIGINT,
  total_tournaments          BIGINT,
  total_pending_withdrawals  NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate Admin Role
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: Administrador requerido';
  END IF;

  RETURN QUERY SELECT * FROM admin_economy_stats;
END;
$$;

GRANT EXECUTE ON FUNCTION get_admin_economy_stats() TO authenticated;

-- ── 3. Matches Schema Refinement ─────────────────────────────

-- Add tournament_id if missing
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS tournament_id UUID REFERENCES public.tournaments(id) ON DELETE SET NULL;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_matches_tournament_id ON public.matches (tournament_id)
  WHERE tournament_id IS NOT NULL;

-- Set Default for house_commission
ALTER TABLE public.matches
  ALTER COLUMN house_commission SET DEFAULT 0;

-- ── 4. RLS on Withdrawal Requests ────────────────────────────

ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- Standard User access
DROP POLICY IF EXISTS "users read own withdrawals" ON public.withdrawal_requests;
CREATE POLICY "users read own withdrawals"
  ON public.withdrawal_requests FOR SELECT
  USING (user_id = auth.uid());

-- Admin full access
DROP POLICY IF EXISTS "admin read withdrawals" ON public.withdrawal_requests;
CREATE POLICY "admin read withdrawals"
  ON public.withdrawal_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "admin update withdrawal status" ON public.withdrawal_requests;
CREATE POLICY "admin update withdrawal status"
  ON public.withdrawal_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (true);
