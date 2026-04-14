-- Migration: Community Betting for Tournaments
-- Project: ArenaCrypto (AC)

-- 1. Enum for Bet Status
DO $$ BEGIN
    CREATE TYPE tournament_bet_status AS ENUM ('pending', 'won', 'lost', 'canceled', 'paid');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Tournament Bets Table
-- Note: tournament_id and team_id refer to UUIDs in the EXTERNAL Proyecto-torneos DB.
CREATE TABLE IF NOT EXISTS tournament_bets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    pt_tournament_id UUID NOT NULL,
    pt_team_id UUID NOT NULL,
    amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    odds NUMERIC(5,2) DEFAULT 1.0, -- Multiplier (to be calculated based on pool)
    status tournament_bet_status DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now(),
    resolved_at TIMESTAMPTZ
);

-- 3. Indices for fast lookup during payout listener
CREATE INDEX IF NOT EXISTS idx_tournament_bets_pt_tournament ON tournament_bets(pt_tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_bets_user_id ON tournament_bets(user_id);

-- 4. RLS Policies (Users can only see THEIR bets)
ALTER TABLE tournament_bets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tournament bets"
ON tournament_bets FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create tournament bets"
ON tournament_bets FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 5. Comment for documentation
COMMENT ON TABLE tournament_bets IS 'Community bets placed in ArenaCrypto on teams participating in external tournaments (Proyecto-torneos)';
