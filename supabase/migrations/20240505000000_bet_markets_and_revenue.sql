-- Migration: Bet Markets, Origin Tracking & Kronix Revenue
-- Project: ArenaCrypto (AC)
-- Sprint: Monetización / Revenue Share con Kronix

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. BET MARKETS
--    Un mercado = una pregunta apostable en un momento específico.
--    Ej: "Ganador del torneo X", "Top Fragger de Ronda 2 del torneo X"
-- ─────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE market_type_enum AS ENUM (
    'tournament_winner',       -- Quién gana el torneo completo
    'tournament_mvp',          -- Top fragger acumulado del torneo
    'round_winner',            -- Quién gana una ronda específica
    'round_top_fragger',       -- Más kills en una ronda
    'round_top_placement'      -- Equipo llega al Top (pot_top)
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE market_status_enum AS ENUM ('open', 'closed', 'resolved', 'canceled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.bet_markets (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pt_tournament_id  UUID NOT NULL,                        -- ID externo de Kronix
  market_type       market_type_enum NOT NULL,
  pt_match_id       UUID,                                 -- Solo para mercados por ronda
  round_number      INTEGER,                              -- Solo para mercados por ronda
  status            market_status_enum DEFAULT 'open',
  result_pt_team_id UUID,                                 -- Equipo ganador (post-resolución)
  result_pt_player_id UUID,                               -- Jugador ganador (MVP/fragger)
  total_volume      NUMERIC(14,2) DEFAULT 0,              -- Volumen total apostado
  kronix_volume     NUMERIC(14,2) DEFAULT 0,              -- Volumen de apuestas con código Kronix
  opened_at         TIMESTAMPTZ DEFAULT NOW(),
  closed_at         TIMESTAMPTZ,
  resolved_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bet_markets_tournament ON bet_markets(pt_tournament_id);
CREATE INDEX IF NOT EXISTS idx_bet_markets_status ON bet_markets(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_bet_markets_unique_round
  ON bet_markets(pt_tournament_id, market_type, pt_match_id)
  WHERE pt_match_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_bet_markets_unique_tournament
  ON bet_markets(pt_tournament_id, market_type)
  WHERE pt_match_id IS NULL;

ALTER TABLE bet_markets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can read open markets" ON bet_markets;
CREATE POLICY "Authenticated can read open markets"
  ON bet_markets FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Service role manages markets" ON bet_markets;
CREATE POLICY "Service role manages markets"
  ON bet_markets FOR ALL TO service_role USING (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. AÑADIR TRACKING DE ORIGEN A tournament_bets
--    origin_platform: 'kronix' si el unlock vino de código Kronix, 'arena' si es propio
--    origin_code: el código literal que usó el usuario
--    market_id: referencia al mercado específico
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.tournament_bets
  ADD COLUMN IF NOT EXISTS market_id       UUID REFERENCES bet_markets(id),
  ADD COLUMN IF NOT EXISTS origin_code     TEXT,
  ADD COLUMN IF NOT EXISTS origin_platform TEXT DEFAULT 'arena'
    CHECK (origin_platform IN ('kronix', 'arena'));

CREATE INDEX IF NOT EXISTS idx_tournament_bets_market ON tournament_bets(market_id);
CREATE INDEX IF NOT EXISTS idx_tournament_bets_origin ON tournament_bets(origin_platform);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. AÑADIR origin_platform A tournament_unlocks
--    Registra si el código fue validado contra Kronix o era código propio de AC
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.tournament_unlocks
  ADD COLUMN IF NOT EXISTS origin_platform TEXT DEFAULT 'arena'
    CHECK (origin_platform IN ('kronix', 'arena')),
  ADD COLUMN IF NOT EXISTS origin_code     TEXT;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. KRONIX REVENUE
--    Registro de comisiones calculadas y su estado de pago/reporte
-- ─────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE revenue_status_enum AS ENUM ('pending', 'sent', 'confirmed', 'failed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.kronix_revenue (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pt_tournament_id  UUID NOT NULL UNIQUE,
  tournament_name   TEXT,
  period_start      TIMESTAMPTZ,
  period_end        TIMESTAMPTZ DEFAULT NOW(),
  total_volume      NUMERIC(14,2) DEFAULT 0,   -- Volumen total del torneo en AC
  kronix_volume     NUMERIC(14,2) DEFAULT 0,   -- Volumen originado por códigos Kronix
  commission_rate   NUMERIC(5,4) DEFAULT 0.01, -- 1% por defecto
  commission_amount NUMERIC(14,2) DEFAULT 0,   -- kronix_volume * commission_rate
  status            revenue_status_enum DEFAULT 'pending',
  webhook_sent_at   TIMESTAMPTZ,
  webhook_response  JSONB,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE kronix_revenue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can read revenue" ON kronix_revenue;
CREATE POLICY "Admins can read revenue"
  ON kronix_revenue FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ));
DROP POLICY IF EXISTS "Service role manages revenue" ON kronix_revenue;
CREATE POLICY "Service role manages revenue"
  ON kronix_revenue FOR ALL TO service_role USING (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. FUNCIÓN: Calcular y registrar revenue de un torneo
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.calculate_tournament_revenue(
  p_pt_tournament_id UUID,
  p_tournament_name  TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_volume   NUMERIC;
  v_kronix_volume  NUMERIC;
  v_commission     NUMERIC;
  v_rate           NUMERIC := 0.01;
BEGIN
  -- Sumar volumen total y volumen Kronix para este torneo
  SELECT
    COALESCE(SUM(amount), 0),
    COALESCE(SUM(CASE WHEN origin_platform = 'kronix' THEN amount ELSE 0 END), 0)
  INTO v_total_volume, v_kronix_volume
  FROM public.tournament_bets
  WHERE pt_tournament_id = p_pt_tournament_id
    AND status NOT IN ('canceled');

  v_commission := v_kronix_volume * v_rate;

  -- Upsert en kronix_revenue
  INSERT INTO public.kronix_revenue (
    pt_tournament_id, tournament_name,
    total_volume, kronix_volume,
    commission_rate, commission_amount,
    period_end
  )
  VALUES (
    p_pt_tournament_id, p_tournament_name,
    v_total_volume, v_kronix_volume,
    v_rate, v_commission,
    NOW()
  )
  ON CONFLICT (pt_tournament_id) DO UPDATE SET
    total_volume      = EXCLUDED.total_volume,
    kronix_volume     = EXCLUDED.kronix_volume,
    commission_amount = EXCLUDED.commission_amount,
    period_end        = NOW(),
    updated_at        = NOW();

  RETURN jsonb_build_object(
    'pt_tournament_id',  p_pt_tournament_id,
    'total_volume',      v_total_volume,
    'kronix_volume',     v_kronix_volume,
    'commission_rate',   v_rate,
    'commission_amount', v_commission
  );
END;
$$;

REVOKE ALL ON FUNCTION public.calculate_tournament_revenue(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.calculate_tournament_revenue(UUID, TEXT) TO service_role;
