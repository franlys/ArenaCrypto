-- Limbo Game Table
CREATE TABLE IF NOT EXISTS public.limbo_games (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount      NUMERIC(18,2) NOT NULL CHECK (amount > 0),
  is_test     BOOLEAN NOT NULL DEFAULT false,
  target      NUMERIC(10,2) NOT NULL CHECK (target >= 1.01),
  result      NUMERIC(10,2) NOT NULL,
  won         BOOLEAN NOT NULL,
  payout      NUMERIC(18,2) NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.limbo_games ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their limbo games" ON public.limbo_games;
CREATE POLICY "Users can read their limbo games"
  ON public.limbo_games FOR SELECT USING (auth.uid() = user_id);
