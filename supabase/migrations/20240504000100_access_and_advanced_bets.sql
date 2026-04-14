-- Migration: Access Control (Codes & Premium) and Advanced Bet Types
-- Project: ArenaCrypto (AC)

-- 1. Update Premium Price logic (Now 20 USDT/Stablecoin)
CREATE OR REPLACE FUNCTION public.upgrade_to_premium()
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_premium_price DECIMAL := 20.00; -- Updated from 5.00
  v_current_balance DECIMAL;
  v_is_already_premium BOOLEAN;
BEGIN
  -- Check current status
  SELECT is_premium INTO v_is_already_premium FROM public.profiles WHERE id = v_user_id;
  IF v_is_already_premium THEN
    RAISE EXCEPTION 'Ya eres un usuario Premium.';
  END IF;

  -- Check balance
  SELECT balance_stablecoin INTO v_current_balance 
  FROM public.wallets 
  WHERE user_id = v_user_id;

  IF v_current_balance < v_premium_price THEN
    RAISE EXCEPTION 'Saldo insuficiente. Necesitas 20 USDT para activar Premium.';
  END IF;

  -- Execute Transaction
  UPDATE public.wallets 
  SET balance_stablecoin = balance_stablecoin - v_premium_price,
      updated_at = NOW()
  WHERE user_id = v_user_id;

  UPDATE public.profiles 
  SET is_premium = TRUE,
      updated_at = NOW()
  WHERE id = v_user_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Streamer Codes Table
CREATE TABLE IF NOT EXISTS public.streamer_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    streamer_name TEXT NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert sample codes
INSERT INTO public.streamer_codes (streamer_name, code)
VALUES 
('Franlys', 'ARENA2026'),
('StreamerVIP', 'PRO20'),
('Community-X', 'WINNER-X')
ON CONFLICT (code) DO NOTHING;

-- 3. Tournament Unlocks Table
CREATE TABLE IF NOT EXISTS public.tournament_unlocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    pt_tournament_id UUID NOT NULL, -- External ID from Proyecto-torneos
    streamer_code_id UUID REFERENCES streamer_codes(id),
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, pt_tournament_id)
);

-- 4. Update tournament_bets for Advanced Types
DO $$ BEGIN
    CREATE TYPE bet_target_type AS ENUM ('winner', 'top_fragger_tournament', 'top_fragger_match');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Drop and recreate column with enum if needed (safety check)
ALTER TABLE tournament_bets DROP COLUMN IF EXISTS target_type;
ALTER TABLE tournament_bets ADD COLUMN target_type bet_target_type DEFAULT 'winner';
ALTER TABLE tournament_bets ADD COLUMN IF NOT EXISTS pt_target_id UUID; -- Player ID or Match ID
ALTER TABLE tournament_bets ADD COLUMN IF NOT EXISTS pt_target_name TEXT; -- Display name of target

-- 5. RLS for new tables
ALTER TABLE streamer_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_unlocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can check if a code is valid" ON streamer_codes;
CREATE POLICY "Anyone can check if a code is valid" ON streamer_codes FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Users can see their own unlocks" ON tournament_unlocks;
CREATE POLICY "Users can see their own unlocks" ON tournament_unlocks FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own unlocks" ON tournament_unlocks;
CREATE POLICY "Users can insert their own unlocks" ON tournament_unlocks FOR INSERT WITH CHECK (auth.uid() = user_id);
