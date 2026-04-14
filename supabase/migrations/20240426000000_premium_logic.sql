-- ArenaCrypto: Premium Subscription Logic
-- Securely upgrades users to Premium status by deducting a fixed fee.

CREATE OR REPLACE FUNCTION public.upgrade_to_premium()
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_premium_price DECIMAL := 5.00;
  v_current_balance DECIMAL;
  v_is_already_premium BOOLEAN;
BEGIN
  -- 1. Check current status
  SELECT is_premium INTO v_is_already_premium FROM public.profiles WHERE id = v_user_id;
  
  IF v_is_already_premium THEN
    RAISE EXCEPTION 'Ya eres un usuario Premium.';
  END IF;

  -- 2. Check balance
  SELECT balance_stablecoin INTO v_current_balance 
  FROM public.wallets 
  WHERE user_id = v_user_id;

  IF v_current_balance < v_premium_price THEN
    RAISE EXCEPTION 'Saldo insuficiente. Necesitas 5 USDC para activar Premium.';
  END IF;

  -- 3. Execute Transaction
  -- A. Deduct balance
  UPDATE public.wallets 
  SET balance_stablecoin = balance_stablecoin - v_premium_price,
      updated_at = NOW()
  WHERE user_id = v_user_id;

  -- B. Set Premium Flag
  UPDATE public.profiles 
  SET is_premium = TRUE,
      updated_at = NOW()
  WHERE id = v_user_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
