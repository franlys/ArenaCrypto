-- Migration: Atomic Place Bet RPC
-- Wraps bet insert + balance deduction in a single transaction to prevent
-- inconsistent state if one operation fails.

CREATE OR REPLACE FUNCTION public.place_tournament_bet(
  p_pt_tournament_id  UUID,
  p_pt_team_id        UUID,
  p_amount            NUMERIC,
  p_target_type       bet_target_type DEFAULT 'winner',
  p_pt_target_id      UUID            DEFAULT NULL,
  p_pt_target_name    TEXT            DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id   UUID := auth.uid();
  v_balance   NUMERIC;
  v_premium   BOOLEAN;
  v_unlock_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'No autenticado');
  END IF;

  -- Load profile in one query
  SELECT balance, is_premium
  INTO v_balance, v_premium
  FROM public.profiles
  WHERE id = v_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Perfil no encontrado');
  END IF;

  -- Exclusivity check
  IF NOT v_premium THEN
    SELECT id INTO v_unlock_id
    FROM public.tournament_unlocks
    WHERE user_id = v_user_id
      AND pt_tournament_id = p_pt_tournament_id;

    IF v_unlock_id IS NULL THEN
      RETURN jsonb_build_object('error', 'Acceso Exclusivo: requiere código de streamer o cuenta Premium.');
    END IF;
  END IF;

  -- Balance check
  IF v_balance < p_amount THEN
    RETURN jsonb_build_object('error', 'Saldo insuficiente');
  END IF;

  -- Atomic: insert bet + deduct balance together
  INSERT INTO public.tournament_bets (
    user_id, pt_tournament_id, pt_team_id,
    amount, target_type, pt_target_id, pt_target_name
  ) VALUES (
    v_user_id, p_pt_tournament_id, p_pt_team_id,
    p_amount, p_target_type, p_pt_target_id, p_pt_target_name
  );

  UPDATE public.profiles
  SET balance    = balance - p_amount,
      updated_at = NOW()
  WHERE id = v_user_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.place_tournament_bet FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.place_tournament_bet TO authenticated;
