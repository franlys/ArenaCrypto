-- Mini Games: Crash + Dice
-- State machine for Crash lives server-side (no cron needed)

-- ── Crash rounds ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.crash_rounds (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_seed TEXT NOT NULL,
  crash_point NUMERIC(10,2) NOT NULL,
  status      TEXT NOT NULL DEFAULT 'waiting'
              CHECK (status IN ('waiting','running','crashed')),
  started_at  TIMESTAMPTZ,
  crashed_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crash_rounds_status  ON public.crash_rounds(status);
CREATE INDEX IF NOT EXISTS idx_crash_rounds_created ON public.crash_rounds(created_at DESC);

-- ── Crash bets ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.crash_bets (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id     UUID NOT NULL REFERENCES public.crash_rounds(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount       NUMERIC(18,2) NOT NULL CHECK (amount > 0),
  is_test      BOOLEAN NOT NULL DEFAULT false,
  auto_cashout NUMERIC(10,2),
  cashout_at   NUMERIC(10,2),
  payout       NUMERIC(18,2),
  status       TEXT NOT NULL DEFAULT 'active'
               CHECK (status IN ('active','won','lost')),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(round_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_crash_bets_round  ON public.crash_bets(round_id);
CREATE INDEX IF NOT EXISTS idx_crash_bets_user   ON public.crash_bets(user_id);

-- ── Dice rolls ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.dice_rolls (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount     NUMERIC(18,2) NOT NULL CHECK (amount > 0),
  is_test    BOOLEAN NOT NULL DEFAULT false,
  target     INT NOT NULL CHECK (target BETWEEN 2 AND 98),
  direction  TEXT NOT NULL CHECK (direction IN ('over','under')),
  result     INT NOT NULL CHECK (result BETWEEN 1 AND 100),
  won        BOOLEAN NOT NULL,
  multiplier NUMERIC(10,4) NOT NULL,
  payout     NUMERIC(18,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dice_rolls_user ON public.dice_rolls(user_id, created_at DESC);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.crash_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crash_bets   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dice_rolls   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read crash rounds"    ON public.crash_rounds;
DROP POLICY IF EXISTS "Anyone can read crash bets"      ON public.crash_bets;
DROP POLICY IF EXISTS "Users can read their dice rolls" ON public.dice_rolls;

CREATE POLICY "Anyone can read crash rounds"
  ON public.crash_rounds FOR SELECT USING (true);

CREATE POLICY "Anyone can read crash bets"
  ON public.crash_bets FOR SELECT USING (true);

CREATE POLICY "Users can read their dice rolls"
  ON public.dice_rolls FOR SELECT USING (auth.uid() = user_id);
