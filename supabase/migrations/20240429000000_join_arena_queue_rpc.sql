-- ArenaCrypto: join_arena_queue stored procedure
-- Inserts user into queue and attempts immediate match.
-- Returns the queue entry UUID.

CREATE OR REPLACE FUNCTION join_arena_queue(
  p_game_id   TEXT,
  p_mode      TEXT,
  p_stake     DECIMAL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id   UUID := auth.uid();
  v_queue_id  UUID;
  v_opponent  RECORD;
  v_match_id  UUID;
BEGIN
  -- Guard: user must be authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Guard: no duplicate active queue entry
  IF EXISTS (
    SELECT 1 FROM matchmaking_queue
    WHERE user_id = v_user_id AND status = 'searching'
  ) THEN
    RAISE EXCEPTION 'Ya estás en cola. Cancela antes de buscar de nuevo.';
  END IF;

  -- Insert into queue
  INSERT INTO matchmaking_queue (user_id, game_id, mode, stake_amount, status)
  VALUES (v_user_id, p_game_id, p_mode, p_stake, 'searching')
  RETURNING id INTO v_queue_id;

  -- Try to find a matching opponent (same game, mode, stake, not same user)
  SELECT * INTO v_opponent
  FROM matchmaking_queue
  WHERE game_id     = p_game_id
    AND mode        = p_mode
    AND stake_amount = p_stake
    AND status      = 'searching'
    AND user_id     <> v_user_id
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  -- If opponent found: create match and update both queue entries
  IF v_opponent.id IS NOT NULL THEN
    INSERT INTO matches (player1_id, player2_id, stake_amount, house_commission, status)
    VALUES (
      v_opponent.user_id,
      v_user_id,
      p_stake,
      p_stake * 0.05,  -- 5% house commission
      'active'
    )
    RETURNING id INTO v_match_id;

    UPDATE matchmaking_queue
    SET status = 'matched'
    WHERE id IN (v_queue_id, v_opponent.id);
  END IF;

  RETURN v_queue_id;
END;
$$;

-- Grant execute to authenticated users only
REVOKE ALL ON FUNCTION join_arena_queue(TEXT, TEXT, DECIMAL) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION join_arena_queue(TEXT, TEXT, DECIMAL) TO authenticated;
