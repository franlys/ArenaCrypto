-- ArenaCrypto: Round Robin Tournament Engine
-- Handles scheduling, points (3W, 1D, 0L), and 20% house commission.

-- 1. Tournament Configuration
CREATE TABLE IF NOT EXISTS public.tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  game_id TEXT NOT NULL,
  entry_fee DECIMAL NOT NULL,
  max_participants INTEGER NOT NULL,
  commission_rate DECIMAL DEFAULT 0.20, -- 20% House cut
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed')),
  total_prize_pool DECIMAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- 2. Participants
CREATE TABLE IF NOT EXISTS public.tournament_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  points INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  draws INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tournament_id, user_id)
);

-- 3. Round Robin Scheduler (Algorithm del Círculo)
CREATE OR REPLACE FUNCTION public.generate_round_robin_matches(p_tournament_id UUID)
RETURNS VOID AS $$
DECLARE
  v_users UUID[];
  v_count INTEGER;
  v_rounds INTEGER;
  v_matches_per_round INTEGER;
  i INTEGER;
  j INTEGER;
  v_p1 UUID;
  v_p2 UUID;
BEGIN
  -- Get active players
  SELECT ARRAY_AGG(user_id) INTO v_users FROM public.tournament_participants WHERE tournament_id = p_tournament_id;
  v_count := ARRAY_LENGTH(v_users, 1);
  
  -- Add a "Bye" if odd (not needed here if we enforce even, but let's be robust)
  IF v_count % 2 != 0 THEN
    v_users := v_users || NULL::UUID;
    v_count := v_count + 1;
  END IF;

  v_rounds := v_count - 1;
  v_matches_per_round := v_count / 2;

  FOR i IN 0..v_rounds-1 LOOP
    FOR j IN 0..v_matches_per_round-1 LOOP
      v_p1 := v_users[j + 1];
      v_p2 := v_users[v_count - j];
      
      IF v_p1 IS NOT NULL AND v_p2 IS NOT NULL THEN
        INSERT INTO public.matches (player1_id, player2_id, tournament_id, status, stake_amount)
        VALUES (v_p1, v_p2, p_tournament_id, 'searching', 0); -- Stake is 0 because entry fee covers it
      END IF;
    END LOOP;
    
    -- Rotate array (Keep index 0 fixed)
    v_users := v_users[1:1] || v_users[v_count:v_count] || v_users[2:v_count-1];
  END LOOP;

  UPDATE public.tournaments SET status = 'in_progress', started_at = NOW() WHERE id = p_tournament_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
