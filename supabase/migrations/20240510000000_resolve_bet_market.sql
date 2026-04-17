-- Migration: resolve_bet_market function
-- Marks all bets in a market as won/lost and credits winners (pari-mutuel, no house cut)

CREATE OR REPLACE FUNCTION public.resolve_bet_market(
  p_market_id          UUID,
  p_result_pt_team_id   UUID DEFAULT NULL,
  p_result_pt_player_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_caller_role     TEXT;
  v_market_status   TEXT;
  v_winner_id       UUID;
  v_total_pool      NUMERIC;
  v_winners_pool    NUMERIC;
  v_won_count       INT;
  v_lost_count      INT;
BEGIN
  -- ── Auth check ──────────────────────────────────────────────────────────────
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF LOWER(v_caller_role) IS DISTINCT FROM 'admin' THEN
    RETURN jsonb_build_object('error', 'Unauthorized');
  END IF;

  -- ── Validate market ──────────────────────────────────────────────────────────
  SELECT status INTO v_market_status FROM public.bet_markets WHERE id = p_market_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Market not found');
  END IF;
  IF v_market_status = 'resolved' THEN
    RETURN jsonb_build_object('error', 'Market already resolved');
  END IF;

  -- Winner ID is the player (for fragger/MVP markets) or team (for the rest)
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
    status       = CASE WHEN pt_target_id = v_winner_id THEN 'won' ELSE 'lost' END,
    resolved_at  = NOW()
  WHERE market_id = p_market_id
    AND status   = 'pending'
    AND is_test  = true;

  -- ── Mark real bets won/lost ──────────────────────────────────────────────────
  UPDATE public.tournament_bets SET
    status       = CASE WHEN pt_target_id = v_winner_id THEN 'won' ELSE 'lost' END,
    resolved_at  = NOW()
  WHERE market_id = p_market_id
    AND status   = 'pending'
    AND is_test  = false;

  -- ── Pool totals (real bets only) ─────────────────────────────────────────────
  SELECT
    COALESCE(SUM(amount), 0),
    COALESCE(SUM(CASE WHEN status = 'won' THEN amount ELSE 0 END), 0)
  INTO v_total_pool, v_winners_pool
  FROM public.tournament_bets
  WHERE market_id = p_market_id
    AND is_test   = false
    AND status   IN ('won', 'lost');

  SELECT COUNT(*) INTO v_won_count  FROM public.tournament_bets
  WHERE market_id = p_market_id AND status = 'won'  AND is_test = false;
  SELECT COUNT(*) INTO v_lost_count FROM public.tournament_bets
  WHERE market_id = p_market_id AND status = 'lost' AND is_test = false;

  -- ── Pari-mutuel payout: winners split the entire pool proportionally ─────────
  -- Payout per winner = (their_bet / winners_pool) × total_pool
  IF v_winners_pool > 0 THEN
    UPDATE public.wallets w
    SET balance_stablecoin = balance_stablecoin
        + ROUND((tb.amount / v_winners_pool) * v_total_pool, 2)
    FROM public.tournament_bets tb
    WHERE tb.market_id = p_market_id
      AND tb.status    = 'won'
      AND tb.is_test   = false
      AND w.user_id    = tb.user_id;

    -- Mark paid
    UPDATE public.tournament_bets SET status = 'paid'
    WHERE market_id = p_market_id AND status = 'won' AND is_test = false;
  END IF;

  RETURN jsonb_build_object(
    'success',        true,
    'total_pool',     v_total_pool,
    'winners_pool',   v_winners_pool,
    'won_count',      v_won_count,
    'lost_count',     v_lost_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_bet_market FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_bet_market TO authenticated;
