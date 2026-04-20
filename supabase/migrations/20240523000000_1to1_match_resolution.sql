-- 1:1 match resolution model
-- Winner gets: their_bet × 2 (or less if winners_pool > losers_pool)
-- PT earns: losers_pool - matched_to_winners
-- AC 1% tracked separately in kronix_revenue

DROP FUNCTION IF EXISTS public.resolve_bet_market(UUID, UUID, UUID);
DROP FUNCTION IF EXISTS public.resolve_bet_market(UUID, UUID, UUID, NUMERIC);

CREATE OR REPLACE FUNCTION public.resolve_bet_market(
  p_market_id           UUID,
  p_result_pt_team_id   UUID    DEFAULT NULL,
  p_result_pt_player_id UUID    DEFAULT NULL,
  p_rake_rate           NUMERIC DEFAULT NULL  -- ignored in 1:1 model, kept for compat
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
  v_caller_role    TEXT;
  v_market_status  TEXT;
  v_winner_id      UUID;
  -- real pools
  v_winners_pool   NUMERIC;
  v_losers_pool    NUMERIC;
  v_matched        NUMERIC;
  v_pt_rake        NUMERIC;
  v_won_count      INT;
  v_lost_count     INT;
  -- test pools
  v_t_winners_pool NUMERIC;
  v_t_losers_pool  NUMERIC;
  v_t_matched      NUMERIC;
BEGIN
  -- ── Auth ─────────────────────────────────────────────────────────────────────
  v_caller_role := (SELECT role FROM public.profiles WHERE id = auth.uid());
  IF LOWER(v_caller_role) IS DISTINCT FROM 'admin' THEN
    RETURN jsonb_build_object('error', 'Unauthorized');
  END IF;

  -- ── Validate market ───────────────────────────────────────────────────────────
  v_market_status := (SELECT status FROM public.bet_markets WHERE id = p_market_id);
  IF v_market_status IS NULL THEN RETURN jsonb_build_object('error', 'Market not found'); END IF;
  IF v_market_status = 'resolved' THEN RETURN jsonb_build_object('error', 'Market already resolved'); END IF;

  v_winner_id := COALESCE(p_result_pt_player_id, p_result_pt_team_id);
  IF v_winner_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Must provide result_pt_team_id or result_pt_player_id');
  END IF;

  -- ── Mark real bets won/lost ───────────────────────────────────────────────────
  UPDATE public.tournament_bets SET
    status      = CASE WHEN pt_target_id = v_winner_id THEN 'won' ELSE 'lost' END ::tournament_bet_status,
    resolved_at = NOW()
  WHERE market_id = p_market_id AND status = 'pending' AND is_test = false;

  -- ── Real pool totals ──────────────────────────────────────────────────────────
  SELECT COALESCE(SUM(amount), 0) INTO v_winners_pool
  FROM public.tournament_bets WHERE market_id = p_market_id AND status = 'won' AND is_test = false;

  SELECT COALESCE(SUM(amount), 0) INTO v_losers_pool
  FROM public.tournament_bets WHERE market_id = p_market_id AND status = 'lost' AND is_test = false;

  -- matched = amount of losers pool that goes to winners (1:1)
  v_matched  := LEAST(v_winners_pool, v_losers_pool);
  -- PT earns everything losers bet that wasn't matched to winners
  v_pt_rake  := v_losers_pool - v_matched;

  -- ── Payout real winners: bet_back + (bet/winners_pool) × matched ──────────────
  IF v_winners_pool > 0 AND v_matched > 0 THEN
    UPDATE public.wallets w
    SET balance_stablecoin = balance_stablecoin
        + tb.amount                                                        -- bet back
        + ROUND((tb.amount / v_winners_pool) * v_matched, 2)              -- 1:1 win
    FROM public.tournament_bets tb
    WHERE tb.market_id = p_market_id AND tb.status = 'won' AND tb.is_test = false
      AND w.user_id = tb.user_id;

    UPDATE public.tournament_bets
    SET status        = 'paid',
        matched_amount = ROUND((amount / v_winners_pool) * v_matched, 6),
        payout_amount  = amount + ROUND((amount / v_winners_pool) * v_matched, 2)
    WHERE market_id = p_market_id AND status = 'won' AND is_test = false;

  ELSIF v_winners_pool > 0 THEN
    -- No losers — refund winners
    UPDATE public.wallets w
    SET balance_stablecoin = balance_stablecoin + tb.amount
    FROM public.tournament_bets tb
    WHERE tb.market_id = p_market_id AND tb.status = 'won' AND tb.is_test = false
      AND w.user_id = tb.user_id;

    UPDATE public.tournament_bets
    SET status = 'paid', matched_amount = 0, payout_amount = amount
    WHERE market_id = p_market_id AND status = 'won' AND is_test = false;
  END IF;

  SELECT COUNT(*) INTO v_won_count  FROM public.tournament_bets WHERE market_id = p_market_id AND status = 'paid' AND is_test = false;
  SELECT COUNT(*) INTO v_lost_count FROM public.tournament_bets WHERE market_id = p_market_id AND status = 'lost' AND is_test = false;

  -- ── TEST BETS: same 1:1 logic using test_balance ─────────────────────────────
  UPDATE public.tournament_bets SET
    status      = CASE WHEN pt_target_id = v_winner_id THEN 'won' ELSE 'lost' END ::tournament_bet_status,
    resolved_at = NOW()
  WHERE market_id = p_market_id AND status = 'pending' AND is_test = true;

  SELECT COALESCE(SUM(amount), 0) INTO v_t_winners_pool
  FROM public.tournament_bets WHERE market_id = p_market_id AND status = 'won' AND is_test = true;

  SELECT COALESCE(SUM(amount), 0) INTO v_t_losers_pool
  FROM public.tournament_bets WHERE market_id = p_market_id AND status = 'lost' AND is_test = true;

  v_t_matched := LEAST(v_t_winners_pool, v_t_losers_pool);

  IF v_t_winners_pool > 0 AND v_t_matched > 0 THEN
    UPDATE public.wallets w
    SET test_balance = test_balance
        + tb.amount
        + ROUND((tb.amount / v_t_winners_pool) * v_t_matched, 2)
    FROM public.tournament_bets tb
    WHERE tb.market_id = p_market_id AND tb.status = 'won' AND tb.is_test = true
      AND w.user_id = tb.user_id;

    UPDATE public.tournament_bets
    SET status        = 'paid',
        matched_amount = ROUND((amount / v_t_winners_pool) * v_t_matched, 6),
        payout_amount  = amount + ROUND((amount / v_t_winners_pool) * v_t_matched, 2)
    WHERE market_id = p_market_id AND status = 'won' AND is_test = true;

  ELSIF v_t_winners_pool > 0 THEN
    UPDATE public.wallets w
    SET test_balance = test_balance + tb.amount
    FROM public.tournament_bets tb
    WHERE tb.market_id = p_market_id AND tb.status = 'won' AND tb.is_test = true
      AND w.user_id = tb.user_id;

    UPDATE public.tournament_bets
    SET status = 'paid', matched_amount = 0, payout_amount = amount
    WHERE market_id = p_market_id AND status = 'won' AND is_test = true;
  END IF;

  -- ── Resolve market ────────────────────────────────────────────────────────────
  UPDATE public.bet_markets SET
    status              = 'resolved',
    result_pt_team_id   = p_result_pt_team_id,
    result_pt_player_id = p_result_pt_player_id,
    resolved_at         = NOW(),
    closed_at           = COALESCE(closed_at, NOW()),
    rake_amount         = v_pt_rake,
    total_volume        = v_winners_pool + v_losers_pool,
    kronix_volume       = (
      SELECT COALESCE(SUM(amount), 0)
      FROM public.tournament_bets
      WHERE market_id = p_market_id AND is_test = false AND origin_platform = 'kronix'
    )
  WHERE id = p_market_id;

  RETURN jsonb_build_object(
    'success',       true,
    'winners_pool',  v_winners_pool,
    'losers_pool',   v_losers_pool,
    'matched',       v_matched,
    'pt_rake',       v_pt_rake,
    'won_count',     v_won_count,
    'lost_count',    v_lost_count
  );
END;
$func$;

REVOKE ALL ON FUNCTION public.resolve_bet_market FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_bet_market TO authenticated;
