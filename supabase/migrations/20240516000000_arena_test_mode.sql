-- Migration: soporte de modo test en join_arena_queue
-- Usa test_balance cuando el usuario es test user (igual que tournament betting)

CREATE OR REPLACE FUNCTION public.join_arena_queue(
  p_game_id   TEXT,
  p_mode      TEXT,
  p_stake     NUMERIC,
  p_is_test   BOOLEAN DEFAULT FALSE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id    UUID := auth.uid();
  v_balance    NUMERIC;
  v_queue_id   UUID;
  v_opponent   RECORD;
  v_match_id   UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  -- Verificar saldo según modo
  IF p_is_test THEN
    SELECT test_balance INTO v_balance FROM public.wallets WHERE user_id = v_user_id;
  ELSE
    SELECT balance_stablecoin INTO v_balance FROM public.wallets WHERE user_id = v_user_id;
  END IF;

  IF v_balance IS NULL OR v_balance < p_stake THEN
    RAISE EXCEPTION 'Saldo insuficiente. Tienes $% y necesitas $%.', COALESCE(v_balance, 0), p_stake;
  END IF;

  -- No permitir duplicados en cola
  IF EXISTS (
    SELECT 1 FROM public.matchmaking_queue
    WHERE user_id = v_user_id AND status = 'searching'
  ) THEN
    RAISE EXCEPTION 'Ya estás en cola de búsqueda. Cancela antes de intentar de nuevo.';
  END IF;

  -- Descontar saldo (bloquear fondos)
  IF p_is_test THEN
    UPDATE public.wallets SET test_balance = test_balance - p_stake WHERE user_id = v_user_id;
  ELSE
    UPDATE public.wallets SET balance_stablecoin = balance_stablecoin - p_stake WHERE user_id = v_user_id;
  END IF;

  -- Insertar en cola
  INSERT INTO public.matchmaking_queue (user_id, game_id, mode, stake_amount, status, is_test)
  VALUES (v_user_id, p_game_id, p_mode, p_stake, 'searching', p_is_test)
  RETURNING id INTO v_queue_id;

  -- Buscar oponente (mismo juego, modo, apuesta ±10%, mismo is_test)
  SELECT * INTO v_opponent
  FROM public.matchmaking_queue
  WHERE game_id      = p_game_id
    AND mode         = p_mode
    AND stake_amount BETWEEN (p_stake * 0.9) AND (p_stake * 1.1)
    AND is_test      = p_is_test
    AND status       = 'searching'
    AND user_id     <> v_user_id
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  -- Si hay oponente: crear partida y marcar ambos como emparejados
  IF v_opponent.id IS NOT NULL THEN
    INSERT INTO public.matches (player1_id, player2_id, stake_amount, house_commission, status)
    VALUES (
      v_opponent.user_id,
      v_user_id,
      LEAST(p_stake, v_opponent.stake_amount),
      LEAST(p_stake, v_opponent.stake_amount) * 0.05,
      'active'
    )
    RETURNING id INTO v_match_id;

    UPDATE public.matchmaking_queue
    SET status = 'matched'
    WHERE id IN (v_queue_id, v_opponent.id);
  END IF;

  RETURN v_queue_id;
END;
$$;

-- Agregar columna is_test a matchmaking_queue si no existe
ALTER TABLE public.matchmaking_queue
  ADD COLUMN IF NOT EXISTS is_test BOOLEAN DEFAULT FALSE;

REVOKE ALL ON FUNCTION public.join_arena_queue(TEXT, TEXT, NUMERIC, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_arena_queue(TEXT, TEXT, NUMERIC, BOOLEAN) TO authenticated;
