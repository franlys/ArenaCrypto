-- Tabla de retiros solicitados por Kronix (PT) a ArenaCrypto
CREATE TABLE IF NOT EXISTS public.kronix_withdrawals (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  amount       NUMERIC     NOT NULL,
  status       TEXT        NOT NULL DEFAULT 'pending', -- pending | paid
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at      TIMESTAMPTZ,
  notes        TEXT
);

ALTER TABLE public.kronix_withdrawals ENABLE ROW LEVEL SECURITY;
-- Solo service role accede (nunca expuesto a usuarios)
