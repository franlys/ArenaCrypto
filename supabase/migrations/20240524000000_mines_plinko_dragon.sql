-- Migration: Mines, Plinko, Dragon Tower mini-games
-- All games use server-side RNG seeded with a server_seed (provably fair)
-- House edge: 3% applied via multiplier calculation

-- ── MINES ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.mines_games (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount      NUMERIC(18,2) NOT NULL CHECK (amount > 0),
  is_test     BOOLEAN NOT NULL DEFAULT false,
  mines_count INT NOT NULL CHECK (mines_count BETWEEN 1 AND 24),  -- how many mines hidden
  server_seed TEXT NOT NULL,                                       -- hidden until game ends
  client_seed TEXT NOT NULL DEFAULT gen_random_uuid()::text,       -- user-visible
  -- board: array of 25 booleans (true=mine), NULL until revealed at end
  board       BOOLEAN[],
  -- tiles revealed so far (indexes 0-24), stored as JSON array
  revealed    INT[] NOT NULL DEFAULT '{}',
  current_multiplier NUMERIC(10,4) NOT NULL DEFAULT 1.0,
  status      TEXT NOT NULL DEFAULT 'active'
              CHECK (status IN ('active','cashed_out','exploded')),
  payout      NUMERIC(18,2),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_mines_user   ON public.mines_games(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mines_status ON public.mines_games(status) WHERE status = 'active';

-- ── PLINKO ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.plinko_drops (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount     NUMERIC(18,2) NOT NULL CHECK (amount > 0),
  is_test    BOOLEAN NOT NULL DEFAULT false,
  risk_level TEXT NOT NULL DEFAULT 'medium' CHECK (risk_level IN ('low','medium','high')),
  rows       INT NOT NULL DEFAULT 16 CHECK (rows IN (8,12,16)),
  -- path: array of L/R decisions (length = rows)
  path       TEXT[] NOT NULL,
  -- slot where ball landed (0 to rows, left to right)
  slot       INT NOT NULL,
  multiplier NUMERIC(10,4) NOT NULL,
  payout     NUMERIC(18,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plinko_user ON public.plinko_drops(user_id, created_at DESC);

-- ── DRAGON TOWER ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.dragon_tower_games (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount       NUMERIC(18,2) NOT NULL CHECK (amount > 0),
  is_test      BOOLEAN NOT NULL DEFAULT false,
  difficulty   TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy','medium','hard','expert')),
  -- difficulty config: tiles_per_row / mines_per_row
  -- easy: 4/1, medium: 3/1, hard: 2/1, expert: 2/2
  server_seed  TEXT NOT NULL,
  current_level INT NOT NULL DEFAULT 0,   -- 0=not started, 1-9=levels
  max_levels   INT NOT NULL DEFAULT 9,
  current_multiplier NUMERIC(10,4) NOT NULL DEFAULT 1.0,
  -- per-level choices: which tile index (0-based) was selected
  path         INT[] NOT NULL DEFAULT '{}',
  status       TEXT NOT NULL DEFAULT 'active'
               CHECK (status IN ('active','cashed_out','dead')),
  payout       NUMERIC(18,2),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  finished_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_dragon_user   ON public.dragon_tower_games(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dragon_status ON public.dragon_tower_games(status) WHERE status = 'active';

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.mines_games        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plinko_drops       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dragon_tower_games ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own mines games"  ON public.mines_games;
DROP POLICY IF EXISTS "Users can read own plinko drops" ON public.plinko_drops;
DROP POLICY IF EXISTS "Users can read own dragon games" ON public.dragon_tower_games;

CREATE POLICY "Users can read own mines games"
  ON public.mines_games FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can read own plinko drops"
  ON public.plinko_drops FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can read own dragon games"
  ON public.dragon_tower_games FOR SELECT USING (auth.uid() = user_id);
