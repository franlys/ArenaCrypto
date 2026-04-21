-- Parimutuel matched-pool resolution
-- Each community (pt_target_id) contributes equally: cap = MIN(pool per community)
-- Excess bets are refunded. Rake goes to PT (tracked in bet_markets.rake_amount).
-- Winners split the net matched pool proportionally.
-- Test bets mirror real logic but use test_balance.

ALTER TABLE public.bet_markets
  ADD COLUMN IF NOT EXISTS rake_rate   NUMERIC DEFAULT 0.05,
  ADD COLUMN IF NOT EXISTS rake_amount NUMERIC DEFAULT 0;

ALTER TABLE public.tournament_bets
  ADD COLUMN IF NOT EXISTS matched_amount  NUMERIC,
  ADD COLUMN IF NOT EXISTS refund_amount   NUMERIC;

-- Drop both signatures so CREATE OR REPLACE works unambiguously
DROP FUNCTION IF EXISTS public.resolve_bet_market(UUID, UUID, UUID);
DROP FUNCTION IF EXISTS public.resolve_bet_market(UUID, UUID, UUID, NUMERIC);

CREATE OR REPLACE FUNCTION public.resolve_bet_market(
  p_market_id           UUID,
  p_result_pt_team_id   UUID    DEFAULT NULL,
  p_result_pt_player_id UUID    DEFAULT NULL,
  p_rake_rate           NUMERIC DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_caller_role         TEXT;
  v_market_status       TEXT;
  v_winner_id           UUID;
  v_rake_rate           NUMERIC;
  -- real pools
  v_cap                 NUMERIC;
  v_n_communities       INT;
  v_winners_cap         NUMERIC;
  v_losers_matched      NUMERIC;
  v_total_matched       NUMERIC;
  v_rake_amount         NUMERIC;
  v_losers_net          NUMERIC;
  v_won_count           INT;
  v_lost_count          INT;
  v_refund_count        INT;
  -- test pools
  v_test_cap            NUMERIC;
  v_test_n_communities  INT;
  v_test_winners_cap    NUMERIC;
  v_test_losers_matched NUMERIC;
  v_test_rake           NUMERIC;
  v_test_losers_net     NUMERIC;
BEGIN
  -- ── Auth ─────────────────────────────────────────────────────────────────────
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF LOWER(v_caller_role) IS DISTINCT FROM 'admin' THEN
    RETURN jsonb_build_object('error', 'Unauthorized');
  END IF;

  -- ── Validate market ───────────────────────────────────────────────────────────
  SELECT status, COALESCE(rake_rate, 0.05)
  INTO v_market_status, v_rake_rate
  FROM public.bet_markets WHERE id = p_market_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Market not found');
  END IF;
  IF v_market_status = 'resolved' THEN
    RETURN jsonb_build_object('error', 'Market already resolved');
  END IF;

  IF p_rake_rate IS NOT NULL THEN
    v_rake_rate := p_rake_rate;
  END IF;

  v_winner_id := COALESCE(p_result_pt_player_id, p_result_pt_team_id);
  IF v_winner_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Must provide result_pt_team_id or result_pt_player_id');
  END IF;

  -- ── Cap: min pool across real communities ─────────────────────────────────────
  SELECT MIN(community_pool), COUNT(*)
  INTO v_cap, v_n_communities
  FROM (
    SELECT SUM(amount) AS community_pool
    FROM public.tournament_bets
    WHERE market_id = p_market_id AND status = 'pending' AND is_test = false
    GROUP BY pt_target_id
  ) pools;

  -- ── Edge: < 2 real communities → refund all ───────────────────────────────────
  IF v_cap IS NULL OR v_cap = 0 OR v_n_communities < 2 THEN
    UPDATE public.bet_markets SET
      status              = 'resolved',
      result_pt_team_id   = p_result_pt_team_id,
      result_pt_player_id = p_result_pt_player_id,
      resolved_at         = NOW(),
      closed_at           = COALESCE(closed_at, NOW()),
      rake_amount         = 0
    WHERE id = p_market_id;

    UPDATE public.wallets w
    SET balance_stablecoin = balance_stablecoin + tb.amount
    FROM public.tournament_bets tb
    WHERE tb.market_id = p_market_id AND tb.status = 'pending' AND tb.is_test = false
      AND w.user_id = tb.user_id;

    UPDATE public.tournament_bets
    SET status = 'refunded', matched_amount = 0, refund_amount = amount, resolved_at = NOW()
    WHERE market_id = p_market_id AND status = 'pending' AND is_test = false;

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

  -- ── matched_amount and refund_amount per real bet ─────────────────────────────
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

  -- ── Refund excess to real bettors ─────────────────────────────────────────────
  UPDATE public.wallets w
  SET balance_stablecoin = balance_stablecoin + tb.refund_amount
  FROM public.tournament_bets tb
  WHERE tb.market_id = p_market_id AND tb.status = 'pending' AND tb.is_test = false
    AND tb.refund_amount > 0 AND w.user_id = tb.user_id;

  GET DIAGNOSTICS v_refund_count = ROW_COUNT;

  -- ── Mark real bets won/lost ───────────────────────────────────────────────────
  UPDATE public.tournament_bets SET
    status      = CASE WHEN pt_target_id = v_winner_id THEN 'won' ELSE 'lost' END ::tournament_bet_status,
    resolved_at = NOW()
  WHERE market_id = p_market_id AND status = 'pending' AND is_test = false;

  -- ── Pool calculations for real payout ────────────────────────────────────────
  SELECT COALESCE(SUM(matched_amount), 0) INTO v_winners_cap
  FROM public.tournament_bets
  WHERE market_id = p_market_id AND status = 'won' AND is_test = false;

  v_total_matched  := v_n_communities * v_cap;
  v_losers_matched := v_total_matched - v_winners_cap;
  v_rake_amount    := ROUND(v_total_matched * v_rake_rate, 2);
  v_losers_net     := v_losers_matched - v_rake_amount;

  -- ── Payout to real winners ────────────────────────────────────────────────────
  IF v_winners_cap > 0 AND v_losers_net > 0 THEN
    UPDATE public.wallets w
    SET balance_stablecoin = balance_stablecoin
        + tb.matched_amount
        + ROUND((tb.matched_amount / v_winners_cap) * v_losers_net, 2)
    FROM public.tournament_bets tb
    WHERE tb.market_id = p_market_id AND tb.status = 'won' AND tb.is_test = false
      AND w.user_id = tb.user_id;

    UPDATE public.tournament_bets
    SET status = 'paid',
        payout_amount = matched_amount + ROUND((matched_amount / v_winners_cap) * v_losers_net, 2)
    WHERE market_id = p_market_id AND status = 'won' AND is_test = false;
  ELSIF v_winners_cap > 0 THEN
    UPDATE public.wallets w
    SET balance_stablecoin = balance_stablecoin + tb.matched_amount
    FROM public.tournament_bets tb
    WHERE tb.market_id = p_market_id AND tb.status = 'won' AND tb.is_test = false
      AND w.user_id = tb.user_id;

    UPDATE public.tournament_bets
    SET status = 'paid', payout_amount = matched_amount
    WHERE market_id = p_market_id AND status = 'won' AND is_test = false;
  END IF;

  -- ── TEST BETS: same matched-pool logic using test_balance ─────────────────────
  SELECT MIN(community_pool), COUNT(*)
  INTO v_test_cap, v_test_n_communities
  FROM (
    SELECT SUM(amount) AS community_pool
    FROM public.tournament_bets
    WHERE market_id = p_market_id AND status = 'pending' AND is_test = true
    GROUP BY pt_target_id
  ) tpools;

  IF v_test_cap IS NOT NULL AND v_test_cap > 0 AND v_test_n_communities >= 2 THEN
    -- matched_amount per test bet
    UPDATE public.tournament_bets tb
    SET matched_amount = ROUND(tb.amount * (v_test_cap / tpools.community_pool), 6),
        refund_amount  = ROUND(tb.amount - tb.amount * (v_test_cap / tpools.community_pool), 6)
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

    -- Mark test bets won/lost
    UPDATE public.tournament_bets SET
      status      = CASE WHEN pt_target_id = v_winner_id THEN 'won' ELSE 'lost' END ::tournament_bet_status,
      resolved_at = NOW()
    WHERE market_id = p_market_id AND status = 'pending' AND is_test = true;

    -- Test payout
    SELECT COALESCE(SUM(matched_amount), 0) INTO v_test_winners_cap
    FROM public.tournament_bets
    WHERE market_id = p_market_id AND status = 'won' AND is_test = true;

    v_test_losers_matched := v_test_n_communities * v_test_cap - v_test_winners_cap;
    v_test_rake           := ROUND(v_test_n_communities * v_test_cap * v_rake_rate, 2);
    v_test_losers_net     := v_test_losers_matched - v_test_rake;

    IF v_test_winners_cap > 0 AND v_test_losers_net > 0 THEN
      UPDATE public.wallets w
      SET test_balance = test_balance
          + tb.matched_amount
          + ROUND((tb.matched_amount / v_test_winners_cap) * v_test_losers_net, 2)
      FROM public.tournament_bets tb
      WHERE tb.market_id = p_market_id AND tb.status = 'won' AND tb.is_test = true
        AND w.user_id = tb.user_id;

      UPDATE public.tournament_bets
      SET status = 'paid',
          payout_amount = matched_amount + ROUND((matched_amount / v_test_winners_cap) * v_test_losers_net, 2)
      WHERE market_id = p_market_id AND status = 'won' AND is_test = true;
    ELSIF v_test_winners_cap > 0 THEN
      UPDATE public.wallets w
      SET test_balance = test_balance + tb.matched_amount
      FROM public.tournament_bets tb
      WHERE tb.market_id = p_market_id AND tb.status = 'won' AND tb.is_test = true
        AND w.user_id = tb.user_id;

      UPDATE public.tournament_bets
      SET status = 'paid', payout_amount = matched_amount
      WHERE market_id = p_market_id AND status = 'won' AND is_test = true;
    END IF;
  ELSE
    -- Single test community or none → refund all test bets
    UPDATE public.wallets w
    SET test_balance = test_balance + tb.amount
    FROM public.tournament_bets tb
    WHERE tb.market_id = p_market_id AND tb.status = 'pending' AND tb.is_test = true
      AND w.user_id = tb.user_id;

    UPDATE public.tournament_bets
    SET status = 'refunded', matched_amount = 0, refund_amount = amount, resolved_at = NOW()
    WHERE market_id = p_market_id AND status = 'pending' AND is_test = true;
  END IF;

  -- ── Counts ────────────────────────────────────────────────────────────────────
  SELECT COUNT(*) INTO v_won_count  FROM public.tournament_bets WHERE market_id = p_market_id AND status = 'paid' AND is_test = false;
  SELECT COUNT(*) INTO v_lost_count FROM public.tournament_bets WHERE market_id = p_market_id AND status = 'lost' AND is_test = false;

  -- ── Resolve market ────────────────────────────────────────────────────────────
  UPDATE public.bet_markets SET
    status              = 'resolved',
    result_pt_team_id   = p_result_pt_team_id,
    result_pt_player_id = p_result_pt_player_id,
    resolved_at         = NOW(),
    closed_at           = COALESCE(closed_at, NOW()),
    rake_amount         = v_rake_amount,
    total_volume        = v_total_matched,
    kronix_volume       = (
      SELECT COALESCE(SUM(matched_amount), 0)
      FROM public.tournament_bets
      WHERE market_id = p_market_id AND is_test = false AND origin_platform = 'kronix'
    )
  WHERE id = p_market_id;

  RETURN jsonb_build_object(
    'success',        true,
    'n_communities',  v_n_communities,
    'cap',            v_cap,
    'total_matched',  v_total_matched,
    'rake_amount',    v_rake_amount,
    'losers_net',     v_losers_net,
    'winners_cap',    v_winners_cap,
    'won_count',      v_won_count,
    'lost_count',     v_lost_count,
    'refund_count',   v_refund_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_bet_market FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_bet_market TO authenticated;
