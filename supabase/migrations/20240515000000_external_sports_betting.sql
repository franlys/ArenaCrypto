-- Migration: External Sports Betting System
-- Extends ArenaCrypto to support real sports events (Football, Basketball, etc.)
-- via SportAPI (sportapi7.p.rapidapi.com / SofaScore data)

-- ── 1. Tabla de mercados externos (partidos reales) ──────────────────────────
CREATE TABLE IF NOT EXISTS public.external_bet_markets (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_event_id   TEXT NOT NULL,           -- ID del evento en SportAPI
  external_sport      TEXT NOT NULL,           -- "football", "basketball", etc.
  external_tournament TEXT NOT NULL DEFAULT '',
  external_home_team  TEXT NOT NULL,
  external_away_team  TEXT NOT NULL,
  market_type         TEXT NOT NULL DEFAULT 'match_winner',
  status              TEXT NOT NULL DEFAULT 'open'
                        CHECK (status IN ('open','closed','resolved','cancelled')),
  starts_at           TIMESTAMPTZ,
  closed_at           TIMESTAMPTZ,
  resolved_at         TIMESTAMPTZ,
  winner_name         TEXT,                    -- nombre del ganador (team name o "draw")
  home_score          INT,
  away_score          INT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (external_event_id, market_type)
);

-- ── 2. Tabla de apuestas sobre eventos externos ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.external_bets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id     UUID NOT NULL REFERENCES public.external_bet_markets(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  pick_name     TEXT NOT NULL,     -- "Real Madrid", "Liverpool", "draw"
  amount        NUMERIC(18,2) NOT NULL CHECK (amount > 0),
  is_test       BOOLEAN NOT NULL DEFAULT false,
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','won','lost','paid','refunded')),
  resolved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. Índices ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ext_markets_sport_status
  ON public.external_bet_markets(external_sport, status);

CREATE INDEX IF NOT EXISTS idx_ext_bets_market_id
  ON public.external_bets(market_id);

CREATE INDEX IF NOT EXISTS idx_ext_bets_user_id
  ON public.external_bets(user_id);

-- ── 4. RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE public.external_bet_markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_bets        ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read open external markets"   ON public.external_bet_markets;
DROP POLICY IF EXISTS "Users can read their external bets"      ON public.external_bets;
DROP POLICY IF EXISTS "Users can place external bets"           ON public.external_bets;

CREATE POLICY "Anyone can read open external markets"
  ON public.external_bet_markets FOR SELECT USING (true);

CREATE POLICY "Users can read their external bets"
  ON public.external_bets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can place external bets"
  ON public.external_bets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ── 5. Función de liquidación pari-mutuel para mercados externos ──────────────
CREATE OR REPLACE FUNCTION public.resolve_external_market(
  p_market_id   UUID,
  p_winner_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_pool        NUMERIC := 0;
  v_winners_pool      NUMERIC := 0;
  v_test_total_pool   NUMERIC := 0;
  v_test_winners_pool NUMERIC := 0;
  v_won_count         INT := 0;
  v_lost_count        INT := 0;
BEGIN
  -- Marcar bets reales ganadas/perdidas
  UPDATE public.external_bets SET
    status      = CASE WHEN pick_name = p_winner_name THEN 'won' ELSE 'lost' END,
    resolved_at = NOW()
  WHERE market_id = p_market_id
    AND status    = 'pending'
    AND is_test   = false;

  -- Marcar bets de prueba ganadas/perdidas
  UPDATE public.external_bets SET
    status      = CASE WHEN pick_name = p_winner_name THEN 'won' ELSE 'lost' END,
    resolved_at = NOW()
  WHERE market_id = p_market_id
    AND status    = 'pending'
    AND is_test   = true;

  -- Pool real
  SELECT
    COALESCE(SUM(amount), 0),
    COALESCE(SUM(CASE WHEN status = 'won' THEN amount ELSE 0 END), 0)
  INTO v_total_pool, v_winners_pool
  FROM public.external_bets
  WHERE market_id = p_market_id AND is_test = false
    AND status IN ('won','lost');

  -- Pool prueba
  SELECT
    COALESCE(SUM(amount), 0),
    COALESCE(SUM(CASE WHEN status = 'won' THEN amount ELSE 0 END), 0)
  INTO v_test_total_pool, v_test_winners_pool
  FROM public.external_bets
  WHERE market_id = p_market_id AND is_test = true
    AND status IN ('won','lost');

  SELECT COUNT(*) INTO v_won_count  FROM public.external_bets WHERE market_id = p_market_id AND status = 'won'  AND is_test = false;
  SELECT COUNT(*) INTO v_lost_count FROM public.external_bets WHERE market_id = p_market_id AND status = 'lost' AND is_test = false;

  -- Pagar ganadores reales
  IF v_winners_pool > 0 THEN
    UPDATE public.wallets w
    SET balance_stablecoin = balance_stablecoin
        + ROUND((eb.amount / v_winners_pool) * v_total_pool * 0.8, 2) -- 80% al ganador, 20% plataforma
    FROM public.external_bets eb
    WHERE eb.market_id = p_market_id
      AND eb.status    = 'won'
      AND eb.is_test   = false
      AND w.user_id    = eb.user_id;

    UPDATE public.external_bets SET status = 'paid'
    WHERE market_id = p_market_id AND status = 'won' AND is_test = false;
  END IF;

  -- Pagar ganadores de prueba (test_balance)
  IF v_test_winners_pool > 0 THEN
    UPDATE public.wallets w
    SET test_balance = test_balance
        + ROUND((eb.amount / v_test_winners_pool) * v_test_total_pool * 0.8, 2)
    FROM public.external_bets eb
    WHERE eb.market_id = p_market_id
      AND eb.status    = 'won'
      AND eb.is_test   = true
      AND w.user_id    = eb.user_id;

    UPDATE public.external_bets SET status = 'paid'
    WHERE market_id = p_market_id AND status = 'won' AND is_test = true;
  END IF;

  RETURN jsonb_build_object(
    'success',       true,
    'winner',        p_winner_name,
    'total_pool',    v_total_pool,
    'won_count',     v_won_count,
    'lost_count',    v_lost_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_external_market(UUID, TEXT) TO service_role;
