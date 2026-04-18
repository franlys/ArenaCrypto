-- Migration: Grant resolve_market_internal to service_role
-- Fixes 500 error in /api/markets/sync caused by permission denied

GRANT EXECUTE ON FUNCTION public.resolve_market_internal(UUID, UUID, UUID) TO service_role;
