-- Migration: resolve_market_internal
-- Like resolve_bet_market but WITHOUT the admin auth check.
-- Designed to be called server-side via service role (sync endpoint, cron jobs).
-- NOT exposed to public — execute privilege is restricted to postgres/service_role.

CREATE OR REPLACE FUNCTION public.resolve_market_internal(
  p_market_id           UUID,
  p_result_pt_team_id   UUID DEFAULT NULL,
  p_result_pt_player_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_market_status   TEXT;
  v_winner_id       UUID;
  v_total_pool      NUMERIC;
  v_winners_pool    NUMERIC;
  v_won_count       INT;
  v_lost_count      INT;
BEGIN
  -- ── Validate market ──────────────────────────────────────────────────────────
  SELECT status INTO v_market_status FROM public.bet_markets WHERE id = p_market_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Market not found');
  END IF;
  -- If already resolved, still settle any pending bets (idempotent safety net)
  -- This handles the case where sync updates bet_markets first, then calls us

  v_winner_id := COALESCE(p_result_pt_player_id, p_result_pt_team_id);
  IF v_winner_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Must provide result_pt_team_id or result_pt_player_id');
  END IF;

  -- ── Resolve market record ────────────────────────────────────────────────────
  UPDATE public.bet_markets SET
    status               = 'resolved',
    result_pt_team_id    = p_result_pt_team_id,
    result_pt_player_id  = p_result_pt_player_id,
    resolved_at          = NOW(),
    closed_at            = COALESCE(closed_at, NOW())
  WHERE id = p_market_id;

  -- ── Mark test bets won/lost (no wallet credit) ───────────────────────────────
  UPDATE public.tournament_bets SET
    status      = CASE WHEN pt_target_id = v_winner_id
                    THEN 'won'::tournament_bet_status
                    ELSE 'lost'::tournament_bet_status END,
    resolved_at = NOW()
  WHERE market_id = p_market_id
    AND status   = 'pending'::tournament_bet_status
    AND is_test  = true;

  -- ── Mark real bets won/lost ──────────────────────────────────────────────────
  UPDATE public.tournament_bets SET
    status      = CASE WHEN pt_target_id = v_winner_id
                    THEN 'won'::tournament_bet_status
                    ELSE 'lost'::tournament_bet_status END,
    resolved_at = NOW()
  WHERE market_id = p_market_id
    AND status   = 'pending'::tournament_bet_status
    AND is_test  = false;

  -- ── Pool totals (real bets only) ─────────────────────────────────────────────
  SELECT
    COALESCE(SUM(amount), 0),
    COALESCE(SUM(CASE WHEN status = 'won'::tournament_bet_status THEN amount ELSE 0 END), 0)
  INTO v_total_pool, v_winners_pool
  FROM public.tournament_bets
  WHERE market_id = p_market_id
    AND is_test   = false
    AND status   IN ('won'::tournament_bet_status, 'lost'::tournament_bet_status);

  SELECT COUNT(*) INTO v_won_count FROM public.tournament_bets
  WHERE market_id = p_market_id AND status = 'won'::tournament_bet_status AND is_test = false;
  SELECT COUNT(*) INTO v_lost_count FROM public.tournament_bets
  WHERE market_id = p_market_id AND status = 'lost'::tournament_bet_status AND is_test = false;

  -- ── Pari-mutuel payout ───────────────────────────────────────────────────────
  IF v_winners_pool > 0 THEN
    UPDATE public.wallets w
    SET balance_stablecoin = balance_stablecoin
        + ROUND((tb.amount / v_winners_pool) * v_total_pool, 2)
    FROM public.tournament_bets tb
    WHERE tb.market_id = p_market_id
      AND tb.status    = 'won'::tournament_bet_status
      AND tb.is_test   = false
      AND w.user_id    = tb.user_id;

    UPDATE public.tournament_bets SET status = 'paid'::tournament_bet_status
    WHERE market_id = p_market_id
      AND status    = 'won'::tournament_bet_status
      AND is_test   = false;
  END IF;

  RETURN jsonb_build_object(
    'success',      true,
    'total_pool',   v_total_pool,
    'winners_pool', v_winners_pool,
    'won_count',    v_won_count,
    'lost_count',   v_lost_count
  );
END;
$$;

-- Restrict to service_role only — never callable by anon or authenticated users directly
REVOKE ALL ON FUNCTION public.resolve_market_internal FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_market_internal TO postgres;
