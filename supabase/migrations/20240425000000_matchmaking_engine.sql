-- ArenaCrypto: Matchmaking Engine Procedures
-- Ensures atomic pairing, balance locking, and state transitions.

-- 1. Function to safely JOIN the queue
CREATE OR REPLACE FUNCTION public.join_arena_queue(
  p_game_id TEXT,
  p_mode TEXT,
  p_stake DECIMAL
)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_current_balance DECIMAL;
  v_queue_id UUID;
BEGIN
  -- A. Validate Balance
  SELECT balance_stablecoin INTO v_current_balance 
  FROM public.wallets 
  WHERE user_id = v_user_id;

  IF v_current_balance < p_stake THEN
    RAISE EXCEPTION 'Saldo insuficiente para esta apuesta.';
  END IF;

  -- B. Lock Funds (Subtract from ledger)
  UPDATE public.wallets 
  SET balance_stablecoin = balance_stablecoin - p_stake,
      updated_at = NOW()
  WHERE user_id = v_user_id;

  -- C. Add to Queue
  INSERT INTO public.matchmaking_queue (user_id, game_id, mode, stake_amount, status)
  VALUES (v_user_id, p_game_id, p_mode, p_stake, 'searching')
  RETURNING id INTO v_queue_id;

  RETURN v_queue_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Function to FIND and LOCK a match (Atomic)
-- Designed to be called either by trigger or periodically.
CREATE OR REPLACE FUNCTION public.find_match_for_queue(p_queue_id UUID)
RETURNS UUID AS $$
DECLARE
  v_origin_row public.matchmaking_queue%ROWTYPE;
  v_opponent_row public.matchmaking_queue%ROWTYPE;
  v_match_id UUID;
BEGIN
  -- A. Get origin request
  SELECT * INTO v_origin_row FROM public.matchmaking_queue WHERE id = p_queue_id;

  -- B. Search for opponent (Exact Game/Mode, Stake ±10%, Atomically)
  SELECT * INTO v_opponent_row
  FROM public.matchmaking_queue
  WHERE game_id = v_origin_row.game_id 
    AND mode = v_origin_row.mode
    AND status = 'searching'
    AND user_id != v_origin_row.user_id
    AND stake_amount BETWEEN (v_origin_row.stake_amount * 0.9) AND (v_origin_row.stake_amount * 1.1)
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED; -- THE SECRET SAUCE: Prevents double-matching

  -- C. If found, transition both to pending
  IF v_opponent_row.id IS NOT NULL THEN
    -- Final Adjusted Stake (Minimum)
    DECLARE
      v_final_stake DECIMAL := LEAST(v_origin_row.stake_amount, v_opponent_row.stake_amount);
    BEGIN
      -- Create the Match record (Pending until both accept)
      INSERT INTO public.matches (player1_id, player2_id, stake_amount, house_commission, status)
      VALUES (v_origin_row.user_id, v_opponent_row.user_id, v_final_stake, v_final_stake * 0.10, 'evidence_pending') -- Using evidence_pending as a proxy for 'awaiting confirmation'
      RETURNING id INTO v_match_id;

      -- Update queue statuses to matched
      UPDATE public.matchmaking_queue SET status = 'matched' WHERE id IN (v_origin_row.id, v_opponent_row.id);
      
      RETURN v_match_id;
    END;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
