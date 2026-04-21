-- Migration: Test User System
-- Adds test_user flag, test_balance, and admin RPCs.
-- Test bets are isolated: don't affect real analytics, can't generate withdrawals.

-- ── 1. Schema additions ───────────────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_test_user BOOLEAN NOT NULL DEFAULT false;

-- Test balance lives in wallets (parallel to balance_stablecoin)
ALTER TABLE public.wallets
  ADD COLUMN IF NOT EXISTS test_balance NUMERIC(12,2) NOT NULL DEFAULT 0
    CHECK (test_balance >= 0);

-- Flag individual bets as test so analytics can exclude them
ALTER TABLE public.tournament_bets
  ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT false;

-- ── 2. Admin RPC: toggle test user flag ──────────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_set_test_user(
  p_user_id uuid,
  p_is_test  boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT role FROM profiles WHERE id = auth.uid()) != 'admin' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  UPDATE profiles SET is_test_user = p_is_test, updated_at = NOW()
  WHERE id = p_user_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_set_test_user TO authenticated;

-- ── 3. Admin RPC: grant test credits ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_grant_test_credits(
  p_user_id uuid,
  p_amount  numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT role FROM profiles WHERE id = auth.uid()) != 'admin' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  -- Upsert: create wallet row if missing
  INSERT INTO wallets (user_id, test_balance)
    VALUES (p_user_id, GREATEST(0, p_amount))
  ON CONFLICT (user_id) DO UPDATE
    SET test_balance = GREATEST(0, wallets.test_balance + p_amount),
        updated_at   = NOW();
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_grant_test_credits TO authenticated;

-- ── 4. Admin RPC: reset test balance ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_reset_test_balance(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT role FROM profiles WHERE id = auth.uid()) != 'admin' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  UPDATE wallets SET test_balance = 0, updated_at = NOW()
  WHERE user_id = p_user_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_reset_test_balance TO authenticated;

-- ── 5. Update place_tournament_bet: support test users ───────────────────────
-- Drop first to allow changing signature/return type if needed
DROP FUNCTION IF EXISTS public.place_tournament_bet(uuid, uuid, numeric, bet_target_type, uuid, text, uuid, text);
-- Test users:
--   - Skip exclusivity check (can always bet)
--   - Use test_balance from wallets instead of profiles.balance
--   - Mark bet as is_test = true
--   - Do NOT update market volumes (keeps real analytics clean)

CREATE OR REPLACE FUNCTION public.place_tournament_bet(
  p_pt_tournament_id  UUID,
  p_pt_team_id        UUID,
  p_amount            NUMERIC,
  p_target_type       bet_target_type DEFAULT 'winner',
  p_pt_target_id      UUID            DEFAULT NULL,
  p_pt_target_name    TEXT            DEFAULT NULL,
  p_market_id         UUID            DEFAULT NULL,
  p_origin_code       TEXT            DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id         UUID := auth.uid();
  v_balance         NUMERIC;
  v_is_premium      BOOLEAN;
  v_is_test_user    BOOLEAN;
  v_test_balance    NUMERIC;
  v_unlock          RECORD;
  v_origin_platform TEXT := 'arena';
  v_market_status   TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'No autenticado');
  END IF;

  -- Load profile
  SELECT p.is_premium, p.is_test_user, COALESCE(w.test_balance, 0)
  INTO v_is_premium, v_is_test_user, v_test_balance
  FROM public.profiles p
  LEFT JOIN public.wallets w ON w.user_id = p.id
  WHERE p.id = v_user_id;

  -- Load real balance separately (kept in profiles.balance)
  SELECT balance INTO v_balance FROM public.profiles WHERE id = v_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Perfil no encontrado');
  END IF;

  -- ── TEST USER FLOW ────────────────────────────────────────────────────────
  IF v_is_test_user THEN
    IF v_test_balance < p_amount THEN
      RETURN jsonb_build_object('error', 'Saldo de prueba insuficiente');
    END IF;

    -- Market open check (still enforced for test users)
    IF p_market_id IS NOT NULL THEN
      SELECT status INTO v_market_status FROM public.bet_markets WHERE id = p_market_id;
      IF v_market_status IS DISTINCT FROM 'open' THEN
        RETURN jsonb_build_object('error', 'Este mercado ya está cerrado.');
      END IF;
    END IF;

    -- Insert test bet
    INSERT INTO public.tournament_bets (
      user_id, pt_tournament_id, pt_team_id,
      amount, target_type, pt_target_id, pt_target_name,
      market_id, origin_code, origin_platform, is_test
    ) VALUES (
      v_user_id, p_pt_tournament_id, p_pt_team_id,
      p_amount, p_target_type, p_pt_target_id, p_pt_target_name,
      p_market_id, p_origin_code, 'test', true
    );

    -- Deduct test_balance (never touches real balance)
    UPDATE public.wallets
    SET test_balance = test_balance - p_amount,
        updated_at   = NOW()
    WHERE user_id = v_user_id;

    -- NOTE: market volumes intentionally NOT updated for test bets

    RETURN jsonb_build_object('success', true, 'origin_platform', 'test', 'is_test', true);
  END IF;

  -- ── REAL USER FLOW ────────────────────────────────────────────────────────

  -- Exclusivity check
  IF NOT v_is_premium THEN
    SELECT tu.id, tu.origin_platform, tu.origin_code
    INTO v_unlock
    FROM public.tournament_unlocks tu
    WHERE tu.user_id = v_user_id
      AND tu.pt_tournament_id = p_pt_tournament_id;

    IF v_unlock IS NULL THEN
      RETURN jsonb_build_object('error', 'Acceso Exclusivo: requiere código de streamer o cuenta Premium.');
    END IF;

    v_origin_platform := COALESCE(v_unlock.origin_platform, 'arena');
  END IF;

  IF p_origin_code IS NOT NULL AND v_origin_platform = 'arena' THEN
    SELECT tu.origin_platform INTO v_origin_platform
    FROM public.tournament_unlocks tu
    WHERE tu.user_id = v_user_id
      AND tu.pt_tournament_id = p_pt_tournament_id
      AND tu.origin_code = p_origin_code
    LIMIT 1;
    v_origin_platform := COALESCE(v_origin_platform, 'arena');
  END IF;

  -- Market open check
  IF p_market_id IS NOT NULL THEN
    SELECT status INTO v_market_status FROM public.bet_markets WHERE id = p_market_id;
    IF v_market_status IS DISTINCT FROM 'open' THEN
      RETURN jsonb_build_object('error', 'Este mercado ya está cerrado.');
    END IF;
  END IF;

  -- Balance check
  IF v_balance < p_amount THEN
    RETURN jsonb_build_object('error', 'Saldo insuficiente');
  END IF;

  -- Atomic: insert bet + deduct balance + update market volume
  INSERT INTO public.tournament_bets (
    user_id, pt_tournament_id, pt_team_id,
    amount, target_type, pt_target_id, pt_target_name,
    market_id, origin_code, origin_platform, is_test
  ) VALUES (
    v_user_id, p_pt_tournament_id, p_pt_team_id,
    p_amount, p_target_type, p_pt_target_id, p_pt_target_name,
    p_market_id, p_origin_code, v_origin_platform, false
  );

  UPDATE public.profiles
  SET balance    = balance - p_amount,
      updated_at = NOW()
  WHERE id = v_user_id;

  IF p_market_id IS NOT NULL THEN
    UPDATE public.bet_markets
    SET total_volume  = total_volume + p_amount,
        kronix_volume = kronix_volume + CASE WHEN v_origin_platform = 'kronix' THEN p_amount ELSE 0 END
    WHERE id = p_market_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'origin_platform', v_origin_platform, 'is_test', false);
END;
$$;

REVOKE ALL ON FUNCTION public.place_tournament_bet(UUID, UUID, NUMERIC, bet_target_type, UUID, TEXT, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.place_tournament_bet(UUID, UUID, NUMERIC, bet_target_type, UUID, TEXT, UUID, TEXT) TO authenticated;

-- ── 6. Block withdrawals for test users ──────────────────────────────────────
DROP FUNCTION IF EXISTS public.request_withdrawal(numeric, text);

CREATE OR REPLACE FUNCTION public.request_withdrawal(
  p_amount     NUMERIC,
  p_to_address TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id     UUID := auth.uid();
  v_balance     NUMERIC;
  v_is_test     BOOLEAN;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'No autenticado');
  END IF;

  SELECT is_test_user INTO v_is_test FROM profiles WHERE id = v_user_id;

  IF v_is_test THEN
    RETURN jsonb_build_object('error', 'Las cuentas de prueba no pueden solicitar retiros.');
  END IF;

  SELECT balance_stablecoin INTO v_balance FROM wallets WHERE user_id = v_user_id;

  IF v_balance IS NULL OR v_balance < p_amount THEN
    RETURN jsonb_build_object('error', 'Saldo insuficiente. Disponible: ' || COALESCE(v_balance::text, '0'));
  END IF;

  -- Deduct and register withdrawal request
  UPDATE wallets
  SET balance_stablecoin = balance_stablecoin - p_amount,
      updated_at         = NOW()
  WHERE user_id = v_user_id;

  INSERT INTO withdrawal_requests (user_id, amount, to_address, status)
  VALUES (v_user_id, p_amount, p_to_address, 'pending');

  RETURN jsonb_build_object('success', true, 'amount', p_amount, 'to_address', p_to_address);
END;
$$;

REVOKE ALL ON FUNCTION public.request_withdrawal(NUMERIC, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_withdrawal(NUMERIC, TEXT) TO authenticated;

-- ── 7. RLS: admins can read all profiles for the users panel ─────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'profiles'
      AND policyname = 'Admins can read all profiles'
  ) THEN
    CREATE POLICY "Admins can read all profiles"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (
      (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
      OR auth.uid() = id
    );
  END IF;
END;
$$;
