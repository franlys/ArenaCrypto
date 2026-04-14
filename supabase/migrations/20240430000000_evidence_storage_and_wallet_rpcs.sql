-- ============================================================
-- ArenaCrypto: Evidence Storage Bucket + Wallet RPCs
-- ============================================================

-- 1. Evidence storage bucket (private, authenticated access only)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'evidence',
  'evidence',
  false,
  52428800,  -- 50 MB max
  ARRAY['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/quicktime']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: only authenticated users can upload
CREATE POLICY "authenticated_upload_evidence"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'evidence');

-- Storage RLS: match participants can read evidence
CREATE POLICY "authenticated_read_evidence"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'evidence');

-- Storage RLS: owner can delete their own evidence
CREATE POLICY "owner_delete_evidence"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'evidence' AND owner = auth.uid());

-- ============================================================
-- 2. credit_deposit RPC
-- Called after on-chain USDC deposit is confirmed.
-- ============================================================
CREATE OR REPLACE FUNCTION credit_deposit(
  p_tx_hash    TEXT,
  p_amount     DECIMAL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  -- Idempotency: skip if tx already processed
  IF EXISTS (
    SELECT 1 FROM wallets WHERE user_id = v_user_id AND last_tx_sync_hash = p_tx_hash
  ) THEN
    RETURN TRUE;  -- already credited
  END IF;

  -- Credit internal balance
  UPDATE wallets
  SET balance_stablecoin = balance_stablecoin + p_amount,
      last_tx_sync_hash  = p_tx_hash,
      updated_at         = NOW()
  WHERE user_id = v_user_id;

  -- Create wallet row if user never deposited before
  IF NOT FOUND THEN
    INSERT INTO wallets (user_id, balance_stablecoin, last_tx_sync_hash)
    VALUES (v_user_id, p_amount, p_tx_hash);
  END IF;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION credit_deposit(TEXT, DECIMAL) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION credit_deposit(TEXT, DECIMAL) TO authenticated;

-- ============================================================
-- 3. request_withdrawal RPC
-- Deducts internal balance and records a pending withdrawal.
-- ============================================================

-- Withdrawals audit table
CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID REFERENCES profiles(id) NOT NULL,
  amount       DECIMAL NOT NULL CHECK (amount > 0),
  to_address   TEXT NOT NULL,
  status       TEXT DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
  tx_hash      TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_read_withdrawals"
  ON withdrawal_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION request_withdrawal(
  p_amount      DECIMAL,
  p_to_address  TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_balance DECIMAL;
  v_request_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT balance_stablecoin INTO v_balance FROM wallets WHERE user_id = v_user_id;

  IF v_balance IS NULL OR v_balance < p_amount THEN
    RAISE EXCEPTION 'Saldo insuficiente. Disponible: %', COALESCE(v_balance, 0);
  END IF;

  -- Deduct from internal balance
  UPDATE wallets
  SET balance_stablecoin = balance_stablecoin - p_amount,
      updated_at         = NOW()
  WHERE user_id = v_user_id;

  -- Record withdrawal request
  INSERT INTO withdrawal_requests (user_id, amount, to_address)
  VALUES (v_user_id, p_amount, p_to_address)
  RETURNING id INTO v_request_id;

  RETURN v_request_id;
END;
$$;

REVOKE ALL ON FUNCTION request_withdrawal(DECIMAL, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION request_withdrawal(DECIMAL, TEXT) TO authenticated;

-- ============================================================
-- 4. resolve_match RPC (called by Gemini validation result)
-- ============================================================
CREATE OR REPLACE FUNCTION resolve_match(
  p_match_id   UUID,
  p_winner_id  UUID,
  p_ai_data    JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_match      RECORD;
  v_payout     DECIMAL;
BEGIN
  SELECT * INTO v_match FROM matches WHERE id = p_match_id;

  IF v_match IS NULL THEN
    RAISE EXCEPTION 'Match not found';
  END IF;

  IF v_match.status NOT IN ('active', 'evidence_pending', 'validating') THEN
    RAISE EXCEPTION 'Match already resolved';
  END IF;

  -- Payout = (stake * 2) - house_commission
  v_payout := (v_match.stake_amount * 2) - v_match.house_commission;

  -- Credit winner
  UPDATE wallets
  SET balance_stablecoin = balance_stablecoin + v_payout,
      updated_at         = NOW()
  WHERE user_id = p_winner_id;

  -- Mark match as resolved
  UPDATE matches
  SET status     = 'resolved',
      winner_id  = p_winner_id,
      updated_at = NOW()
  WHERE id = p_match_id;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION resolve_match(UUID, UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION resolve_match(UUID, UUID, JSONB) TO service_role;
