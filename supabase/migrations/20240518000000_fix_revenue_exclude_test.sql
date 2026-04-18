-- Fix: exclude is_test bets from revenue calculation
-- Test bets use virtual balance and must never count toward real revenue.

CREATE OR REPLACE FUNCTION public.calculate_tournament_revenue(
  p_pt_tournament_id UUID,
  p_tournament_name  TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_volume       NUMERIC;
  v_kronix_volume      NUMERIC;
  v_test_volume        NUMERIC;
  v_commission         NUMERIC;
  v_rate               NUMERIC := 0.01;
BEGIN
  -- Real bets only (is_test = false)
  SELECT
    COALESCE(SUM(amount), 0),
    COALESCE(SUM(CASE WHEN origin_platform = 'kronix' THEN amount ELSE 0 END), 0)
  INTO v_total_volume, v_kronix_volume
  FROM public.tournament_bets
  WHERE pt_tournament_id = p_pt_tournament_id
    AND is_test = false
    AND status NOT IN ('canceled');

  -- Test volume tracked separately (informational only)
  SELECT COALESCE(SUM(amount), 0)
  INTO v_test_volume
  FROM public.tournament_bets
  WHERE pt_tournament_id = p_pt_tournament_id
    AND is_test = true
    AND status NOT IN ('canceled');

  v_commission := v_kronix_volume * v_rate;

  INSERT INTO public.kronix_revenue (
    pt_tournament_id, tournament_name,
    total_volume, kronix_volume,
    commission_rate, commission_amount,
    period_end
  )
  VALUES (
    p_pt_tournament_id, p_tournament_name,
    v_total_volume, v_kronix_volume,
    v_rate, v_commission,
    NOW()
  )
  ON CONFLICT (pt_tournament_id) DO UPDATE SET
    tournament_name   = COALESCE(EXCLUDED.tournament_name, kronix_revenue.tournament_name),
    total_volume      = EXCLUDED.total_volume,
    kronix_volume     = EXCLUDED.kronix_volume,
    commission_amount = EXCLUDED.commission_amount,
    period_end        = NOW(),
    updated_at        = NOW();

  RETURN jsonb_build_object(
    'pt_tournament_id', p_pt_tournament_id,
    'total_volume',     v_total_volume,
    'kronix_volume',    v_kronix_volume,
    'test_volume',      v_test_volume,
    'commission',       v_commission,
    'rate',             v_rate
  );
END;
$$;

REVOKE ALL ON FUNCTION public.calculate_tournament_revenue(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.calculate_tournament_revenue(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.calculate_tournament_revenue(UUID, TEXT) TO postgres;
