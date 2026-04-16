-- Migration: Campos de pago en withdrawal_requests
-- Agrega trazabilidad de quién pagó, cuándo y el hash de la TX en Polygon.

ALTER TABLE public.withdrawal_requests
  ADD COLUMN IF NOT EXISTS paid_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS paid_by   UUID REFERENCES auth.users ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS notes     TEXT;   -- Motivo de rechazo o nota del admin

-- RPC: admin marca retiro como completado (después de enviar TX manualmente)
CREATE OR REPLACE FUNCTION public.admin_complete_withdrawal(
  p_withdrawal_id UUID,
  p_tx_hash       TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Solo admins
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Acceso denegado';
  END IF;

  UPDATE withdrawal_requests
  SET status     = 'completed',
      tx_hash    = p_tx_hash,
      paid_at    = NOW(),
      paid_by    = auth.uid(),
      updated_at = NOW()
  WHERE id = p_withdrawal_id
    AND status IN ('pending', 'processing');
END;
$$;

-- RPC: admin rechaza retiro y devuelve el saldo al usuario
CREATE OR REPLACE FUNCTION public.admin_reject_withdrawal(
  p_withdrawal_id UUID,
  p_notes         TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_amount  DECIMAL;
BEGIN
  -- Solo admins
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Acceso denegado';
  END IF;

  SELECT user_id, amount
  INTO v_user_id, v_amount
  FROM withdrawal_requests
  WHERE id = p_withdrawal_id
    AND status IN ('pending', 'processing');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Retiro no encontrado o ya procesado';
  END IF;

  -- Devolver saldo al usuario
  UPDATE wallets
  SET balance_stablecoin = balance_stablecoin + v_amount,
      updated_at         = NOW()
  WHERE user_id = v_user_id;

  -- Marcar como fallido
  UPDATE withdrawal_requests
  SET status     = 'failed',
      notes      = p_notes,
      updated_at = NOW()
  WHERE id = p_withdrawal_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_complete_withdrawal(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reject_withdrawal(UUID, TEXT)   TO authenticated;
