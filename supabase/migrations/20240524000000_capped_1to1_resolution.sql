-- Capped 1:1 resolution model
-- Step 1: cap all communities to MIN(community_pool) → refund excess
-- Step 2: winner gets 2× their matched bet (1:1 against losers)
-- Step 3: PT earns losers_matched - winners_matched (the rest)

DROP FUNCTION IF EXISTS public.resolve_bet_market(UUID, UUID, UUID);
DROP FUNCTION IF EXISTS public.resolve_bet_market(UUID, UUID, UUID, NUMERIC);

CREATE OR REPLACE FUNCTION public.resolve_bet_market(
  p_market_id           UUID,
  p_result_pt_team_id   UUID    DEFAULT NULL,
  p_result_pt_player_id UUID    DEFAULT NULL,
  p_rake_rate           NUMERIC DEFAULT NULL  -- unused, kept for compatibility
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
  v_caller_role    TEXT;
  v_market_status  TEXT;
  v_winner_id      UUID;
  -- cap calculation
  v_cap            NUMERIC;
  v_n_communities  INT;
  -- real pools
  v_winners_matched NUMERIC;
  v_losers_matched  NUMERIC;
  v_pt_rake         NUMERIC;
  v_won_count       INT;
  v_lost_count      INT;
  v_refund_count    INT;
  -- test pools
  v_t_cap            NUMERIC;
  v_t_n_communities  INT;
  v_t_winners_matched NUMERIC;
  v_t_losers_matched  NUMERIC;
BEGIN
  -- ── Auth ─────────────────────────────────────────────────────────────────────
  v_caller_role := (SELECT role FROM public.profiles WHERE id = auth.uid());
  IF LOWER(v_caller_role) IS DISTINCT FROM 'admin' THEN
    RETURN jsonb_build_object('error', 'Unauthorized');
  END IF;

  -- ── Validate market ───────────────────────────────────────────────────────────
  v_market_status := (SELECT status FROM public.bet_markets WHERE id = p_market_id);
  IF v_market_status IS NULL     THEN RETURN jsonb_build_object('error', 'Market not found'); END IF;
  IF v_market_status = 'resolved' THEN RETURN jsonb_build_object('error', 'Market already resolved'); END IF;

  v_winner_id := COALESCE(p_result_pt_player_id, p_result_pt_team_id);
  IF v_winner_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Must provide result_pt_team_id or result_pt_player_id');
  END IF;

  -- ── STEP 1: Cap real bets to MIN(community_pool) ─────────────────────────────
  SELECT MIN(community_pool), COUNT(*)
  INTO v_cap, v_n_communities
  FROM (
    SELECT SUM(amount) AS community_pool
    FROM public.tournament_bets
    WHERE market_id = p_market_id AND status = 'pending' AND is_test = false
    GROUP BY pt_target_id
  ) pools;

  -- Edge: no real bets or single community → refund everyone
  IF v_cap IS NULL OR v_cap = 0 OR v_n_communities < 2 THEN
    UPDATE public.bet_markets SET
      status = 'resolved', result_pt_team_id = p_result_pt_team_id,
      result_pt_player_id = p_result_pt_player_id,
      resolved_at = NOW(), closed_at = COALESCE(closed_at, NOW()), rake_amount = 0
    WHERE id = p_market_id;

    UPDATE public.wallets w
    SET balance_stablecoin = balance_stablecoin + tb.amount
    FROM public.tournament_bets tb
    WHERE tb.market_id = p_market_id AND tb.status = 'pending' AND tb.is_test = false
      AND w.user_id = tb.user_id;

    UPDATE public.tournament_bets
    SET status = 'refunded', matched_amount = 0, refund_amount = amount, resolved_at = NOW()
    WHERE market_id = p_market_id AND status = 'pending' AND is_test = false;

    -- refund test bets too
    UPDATE public.wallets w
    SET test_balance = test_balance + tb.amount
    FROM public.tournament_bets tb
    WHERE tb.market_id = p_market_id AND tb.status = 'pending' AND tb.is_test = true
      AND w.user_id = tb.user_id;
    UPDATE public.tournament_bets
    SET status = 'refunded', matched_amount = 0, refund_amount = amount, resolved_at = NOW()
    WHERE market_id = p_market_id AND status = 'pending' AND is_test = true;

    RETURN jsonb_build_object('success', true, 'note', 'refunded_no_match');
  END IF;

  -- Set matched_amount = bet × (cap / community_pool), refund excess
  UPDATE public.tournament_bets tb
  SET matched_amount = ROUND(tb.amount * (v_cap / pools.community_pool), 6),
      refund_amount  = ROUND(tb.amount - tb.amount * (v_cap / pools.community_pool), 6)
  FROM (
    SELECT pt_target_id, SUM(amount) AS community_pool
    FROM public.tournament_bets
    WHERE market_id = p_market_id AND status = 'pending' AND is_test = false
    GROUP BY pt_target_id
  ) pools
  WHERE tb.market_id = p_market_id AND tb.status = 'pending' AND tb.is_test = false
    AND tb.pt_target_id = pools.pt_target_id;

  -- Refund excess to real bettors
  UPDATE public.wallets w
  SET balance_stablecoin = balance_stablecoin + tb.refund_amount
  FROM public.tournament_bets tb
  WHERE tb.market_id = p_market_id AND tb.status = 'pending' AND tb.is_test = false
    AND tb.refund_amount > 0 AND w.user_id = tb.user_id;

  GET DIAGNOSTICS v_refund_count = ROW_COUNT;

  -- Mark real bets won/lost
  UPDATE public.tournament_bets SET
    status      = CASE WHEN pt_target_id = v_winner_id THEN 'won' ELSE 'lost' END ::tournament_bet_status,
    resolved_at = NOW()
  WHERE market_id = p_market_id AND status = 'pending' AND is_test = false;

  -- ── STEP 2: 1:1 payout — winner gets matched_amount × 2 ──────────────────────
  SELECT COALESCE(SUM(matched_amount), 0) INTO v_winners_matched
  FROM public.tournament_bets WHERE market_id = p_market_id AND status = 'won' AND is_test = false;

  SELECT COALESCE(SUM(matched_amount), 0) INTO v_losers_matched
  FROM public.tournament_bets WHERE market_id = p_market_id AND status = 'lost' AND is_test = false;

  -- PT earns losers_matched - winners_matched (since winner only gets 1:1)
  v_pt_rake := v_losers_matched - LEAST(v_winners_matched, v_losers_matched);

  IF v_winners_matched > 0 THEN
    UPDATE public.wallets w
    SET balance_stablecoin = balance_stablecoin
        + tb.matched_amount  -- their matched bet back
        + ROUND((tb.matched_amount / v_winners_matched) * LEAST(v_winners_matched, v_losers_matched), 2)  -- 1:1 win
    FROM public.tournament_bets tb
    WHERE tb.market_id = p_market_id AND tb.status = 'won' AND tb.is_test = false
      AND w.user_id = tb.user_id;

    UPDATE public.tournament_bets
    SET status        = 'paid',
        payout_amount = matched_amount
                      + ROUND((matched_amount / v_winners_matched) * LEAST(v_winners_matched, v_losers_matched), 2)
    WHERE market_id = p_market_id AND status = 'won' AND is_test = false;
  END IF;

  SELECT COUNT(*) INTO v_won_count  FROM public.tournament_bets WHERE market_id = p_market_id AND status = 'paid' AND is_test = false;
  SELECT COUNT(*) INTO v_lost_count FROM public.tournament_bets WHERE market_id = p_market_id AND status = 'lost' AND is_test = false;

  -- ── TEST BETS: same capped 1:1 logic ─────────────────────────────────────────
  SELECT MIN(community_pool), COUNT(*) INTO v_t_cap, v_t_n_communities
  FROM (
    SELECT SUM(amount) AS community_pool
    FROM public.tournament_bets
    WHERE market_id = p_market_id AND status = 'pending' AND is_test = true
    GROUP BY pt_target_id
  ) tpools;

  IF v_t_cap IS NOT NULL AND v_t_cap > 0 AND v_t_n_communities >= 2 THEN
    UPDATE public.tournament_bets tb
    SET matched_amount = ROUND(tb.amount * (v_t_cap / tpools.community_pool), 6),
        refund_amount  = ROUND(tb.amount - tb.amount * (v_t_cap / tpools.community_pool), 6)
    FROM (
      SELECT pt_target_id, SUM(amount) AS community_pool
      FROM public.tournament_bets
      WHERE market_id = p_market_id AND status = 'pending' AND is_test = true
      GROUP BY pt_target_id
    ) tpools
    WHERE tb.market_id = p_market_id AND tb.status = 'pending' AND tb.is_test = true
      AND tb.pt_target_id = tpools.pt_target_id;

    -- Refund excess to test_balance
    UPDATE public.wallets w
    SET test_balance = test_balance + tb.refund_amount
    FROM public.tournament_bets tb
    WHERE tb.market_id = p_market_id AND tb.status = 'pending' AND tb.is_test = true
      AND tb.refund_amount > 0 AND w.user_id = tb.user_id;

    UPDATE public.tournament_bets SET
      status      = CASE WHEN pt_target_id = v_winner_id THEN 'won' ELSE 'lost' END ::tournament_bet_status,
      resolved_at = NOW()
    WHERE market_id = p_market_id AND status = 'pending' AND is_test = true;

    SELECT COALESCE(SUM(matched_amount), 0) INTO v_t_winners_matched
    FROM public.tournament_bets WHERE market_id = p_market_id AND status = 'won' AND is_test = true;
    SELECT COALESCE(SUM(matched_amount), 0) INTO v_t_losers_matched
    FROM public.tournament_bets WHERE market_id = p_market_id AND status = 'lost' AND is_test = true;

    IF v_t_winners_matched > 0 THEN
      UPDATE public.wallets w
      SET test_balance = test_balance
          + tb.matched_amount
          + ROUND((tb.matched_amount / v_t_winners_matched) * LEAST(v_t_winners_matched, v_t_losers_matched), 2)
      FROM public.tournament_bets tb
      WHERE tb.market_id = p_market_id AND tb.status = 'won' AND tb.is_test = true
        AND w.user_id = tb.user_id;

      UPDATE public.tournament_bets
      SET status        = 'paid',
          payout_amount = matched_amount
                        + ROUND((matched_amount / v_t_winners_matched) * LEAST(v_t_winners_matched, v_t_losers_matched), 2)
      WHERE market_id = p_market_id AND status = 'won' AND is_test = true;
    END IF;
  ELSE
    -- Single test community → refund all
    UPDATE public.wallets w
    SET test_balance = test_balance + tb.amount
    FROM public.tournament_bets tb
    WHERE tb.market_id = p_market_id AND tb.status = 'pending' AND tb.is_test = true
      AND w.user_id = tb.user_id;
    UPDATE public.tournament_bets
    SET status = 'refunded', matched_amount = 0, refund_amount = amount, resolved_at = NOW()
    WHERE market_id = p_market_id AND status = 'pending' AND is_test = true;
  END IF;

  -- ── Resolve market ────────────────────────────────────────────────────────────
  UPDATE public.bet_markets SET
    status              = 'resolved',
    result_pt_team_id   = p_result_pt_team_id,
    result_pt_player_id = p_result_pt_player_id,
    resolved_at         = NOW(),
    closed_at           = COALESCE(closed_at, NOW()),
    rake_amount         = v_pt_rake,
    total_volume        = v_n_communities * v_cap,
    kronix_volume       = (
      SELECT COALESCE(SUM(matched_amount), 0)
      FROM public.tournament_bets
      WHERE market_id = p_market_id AND is_test = false AND origin_platform = 'kronix'
    )
  WHERE id = p_market_id;

  RETURN jsonb_build_object(
    'success',          true,
    'n_communities',    v_n_communities,
    'cap',              v_cap,
    'winners_matched',  v_winners_matched,
    'losers_matched',   v_losers_matched,
    'pt_rake',          v_pt_rake,
    'won_count',        v_won_count,
    'lost_count',       v_lost_count,
    'refund_count',     v_refund_count
  );
END;
$func$;

REVOKE ALL ON FUNCTION public.resolve_bet_market FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_bet_market TO authenticated;
