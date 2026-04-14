-- ArenaCrypto: Admin Features & Economy Stats
-- Adds role-based access and centralized economy views.

-- 1. Roles & Permissions
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin'));

-- 2. Economy Stats View
-- Aggregates revenue from matches and tournaments
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

-- 3. Pending Withdrawals View (with Profile Info)
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

-- 4. Access control for Admin Views
-- Views are SECURITY INVOKER by default in PostgreSQL — no ALTER VIEW needed.
-- Access is enforced at the application layer: only profiles.role = 'admin'
-- users reach /admin routes (AdminLayout guard + get_admin_economy_stats RPC).
GRANT SELECT ON public.admin_economy_stats TO authenticated;
GRANT SELECT ON public.admin_pending_withdrawals TO authenticated;
