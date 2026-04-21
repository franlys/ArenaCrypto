-- Migration: Update place_tournament_bet to capture origin + market_id
-- Project: ArenaCrypto (AC)

CREATE OR REPLACE FUNCTION public.place_tournament_bet(
  p_pt_tournament_id  UUID,
  p_pt_team_id        UUID,
  p_amount            NUMERIC,
  p_target_type       bet_target_type DEFAULT 'winner',
  p_pt_target_id      UUID            DEFAULT NULL,
  p_pt_target_name    TEXT            DEFAULT NULL,
  p_market_id         UUID            DEFAULT NULL,  -- mercado específico
  p_origin_code       TEXT            DEFAULT NULL   -- código usado para unlock
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id         UUID := auth.uid();
  v_balance         NUMERIC;
  v_is_premium      BOOLEAN;
  v_unlock          RECORD;
  v_origin_platform TEXT := 'arena';
  v_market_status   TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'No autenticado');
  END IF;

  -- Load profile
  SELECT balance, is_premium
  INTO v_balance, v_is_premium
  FROM public.profiles
  WHERE id = v_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Perfil no encontrado');
  END IF;

  -- Exclusivity + origin check
  IF NOT v_is_premium THEN
    SELECT tu.id, tu.origin_platform, tu.origin_code
    INTO v_unlock
    FROM public.tournament_unlocks tu
    WHERE tu.user_id = v_user_id
      AND tu.pt_tournament_id = p_pt_tournament_id;

    IF v_unlock IS NULL THEN
      RETURN jsonb_build_object('error', 'Acceso Exclusivo: requiere código de streamer o cuenta Premium.');
    END IF;

    -- Inherit origin from the unlock record
    v_origin_platform := COALESCE(v_unlock.origin_platform, 'arena');
  END IF;

  -- If origin_code passed explicitly, trust it (for premium users who also used a code)
  IF p_origin_code IS NOT NULL AND v_origin_platform = 'arena' THEN
    -- Check if it matches a Kronix-origin unlock
    SELECT tu.origin_platform INTO v_origin_platform
    FROM public.tournament_unlocks tu
    WHERE tu.user_id = v_user_id
      AND tu.pt_tournament_id = p_pt_tournament_id
      AND tu.origin_code = p_origin_code
    LIMIT 1;
    v_origin_platform := COALESCE(v_origin_platform, 'arena');
  END IF;

  -- Market open check
  IF p_market_id IS NOT NULL THEN
    SELECT status INTO v_market_status
    FROM public.bet_markets
    WHERE id = p_market_id;

    IF v_market_status IS DISTINCT FROM 'open' THEN
      RETURN jsonb_build_object('error', 'Este mercado ya está cerrado.');
    END IF;
  END IF;

  -- Balance check
  IF v_balance < p_amount THEN
    RETURN jsonb_build_object('error', 'Saldo insuficiente');
  END IF;

  -- Atomic: insert bet + deduct balance + update market volume
  INSERT INTO public.tournament_bets (
    user_id, pt_tournament_id, pt_team_id,
    amount, target_type, pt_target_id, pt_target_name,
    market_id, origin_code, origin_platform
  ) VALUES (
    v_user_id, p_pt_tournament_id, p_pt_team_id,
    p_amount, p_target_type, p_pt_target_id, p_pt_target_name,
    p_market_id, p_origin_code, v_origin_platform
  );

  UPDATE public.profiles
  SET balance    = balance - p_amount,
      updated_at = NOW()
  WHERE id = v_user_id;

  -- Update market volume counters
  IF p_market_id IS NOT NULL THEN
    UPDATE public.bet_markets
    SET total_volume  = total_volume + p_amount,
        kronix_volume = kronix_volume + CASE WHEN v_origin_platform = 'kronix' THEN p_amount ELSE 0 END
    WHERE id = p_market_id;
  END IF;

  RETURN jsonb_build_object(
    'success',         true,
    'origin_platform', v_origin_platform
  );
END;
$$;

REVOKE ALL ON FUNCTION public.place_tournament_bet(UUID, UUID, NUMERIC, bet_target_type, UUID, TEXT, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.place_tournament_bet(UUID, UUID, NUMERIC, bet_target_type, UUID, TEXT, UUID, TEXT) TO authenticated;
