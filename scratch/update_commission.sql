
-- ACTUALIZACIÓN DE COMISIÓN A 3% DEL TOTAL (POOL)
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
  v_final_stake NUMERIC;
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
    RAISE EXCEPTION 'Saldo insuficiente.';
  END IF;

  -- No permitir duplicados en cola
  IF EXISTS (
    SELECT 1 FROM public.matchmaking_queue
    WHERE user_id = v_user_id AND status = 'searching'
  ) THEN
    RAISE EXCEPTION 'Ya estás en cola de búsqueda.';
  END IF;

  -- Descontar saldo
  IF p_is_test THEN
    UPDATE public.wallets SET test_balance = test_balance - p_stake WHERE user_id = v_user_id;
  ELSE
    UPDATE public.wallets SET balance_stablecoin = balance_stablecoin - p_stake WHERE user_id = v_user_id;
  END IF;

  -- Insertar en cola
  INSERT INTO public.matchmaking_queue (user_id, game_id, mode, stake_amount, status, is_test)
  VALUES (v_user_id, p_game_id, p_mode, p_stake, 'searching', p_is_test)
  RETURNING id INTO v_queue_id;

  -- Buscar oponente
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

  -- Si hay oponente: crear partida
  IF v_opponent.id IS NOT NULL THEN
    v_final_stake := LEAST(p_stake, v_opponent.stake_amount);
    
    INSERT INTO public.matches (
      player1_id, 
      player2_id, 
      stake_amount, 
      house_commission, -- 3% del total (pool de 2 personas)
      status, 
      game_id, 
      is_test
    )
    VALUES (
      v_opponent.user_id,
      v_user_id,
      v_final_stake,
      (v_final_stake * 2) * 0.03, -- COMISIÓN DEL 3% SOBRE EL TOTAL
      'active',
      p_game_id,
      p_is_test
    )
    RETURNING id INTO v_match_id;

    UPDATE public.matchmaking_queue
    SET status = 'matched'
    WHERE id IN (v_queue_id, v_opponent.id);
  END IF;

  RETURN v_queue_id;
END;
$$;
