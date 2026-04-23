-- Migration: Fix matches schema to support AI validation and Test Mode resolution

-- 1. Add missing columns to matches
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS game_id TEXT,
  ADD COLUMN IF NOT EXISTS is_test BOOLEAN DEFAULT FALSE;

-- 2. Update existing matches data (best effort)
UPDATE public.matches m
SET 
  game_id = q.game_id,
  is_test = q.is_test
FROM public.matchmaking_queue q
WHERE q.user_id = m.player1_id OR q.user_id = m.player2_id
  AND q.status = 'matched'
  AND m.game_id IS NULL;

-- 3. Update join_arena_queue to populate new columns
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
    INSERT INTO public.matches (player1_id, player2_id, stake_amount, house_commission, status, game_id, is_test)
    VALUES (
      v_opponent.user_id,
      v_user_id,
      LEAST(p_stake, v_opponent.stake_amount),
      LEAST(p_stake, v_opponent.stake_amount) * 0.05,
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

-- 4. Update resolve_match to handle test mode
CREATE OR REPLACE FUNCTION public.resolve_match(
  p_match_id   UUID,
  p_winner_id  UUID,
  p_ai_data    JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_match      RECORD;
  v_payout     NUMERIC;
BEGIN
  SELECT * INTO v_match FROM public.matches WHERE id = p_match_id;

  IF v_match IS NULL THEN
    RAISE EXCEPTION 'Match not found';
  END IF;

  IF v_match.status NOT IN ('active', 'evidence_pending', 'validating', 'disputed') THEN
    RAISE EXCEPTION 'Match already resolved';
  END IF;

  -- Payout = (stake * 2) - house_commission
  v_payout := (v_match.stake_amount * 2) - v_match.house_commission;

  -- Credit winner based on is_test
  IF v_match.is_test THEN
    UPDATE public.wallets
    SET test_balance = test_balance + v_payout,
        updated_at   = NOW()
    WHERE user_id = p_winner_id;
  ELSE
    UPDATE public.wallets
    SET balance_stablecoin = balance_stablecoin + v_payout,
        updated_at         = NOW()
    WHERE user_id = p_winner_id;
  END IF;

  -- Mark match as resolved
  UPDATE public.matches
  SET status     = 'resolved',
      winner_id  = p_winner_id,
      updated_at = NOW()
  WHERE id = p_match_id;

  RETURN TRUE;
END;
$$;
