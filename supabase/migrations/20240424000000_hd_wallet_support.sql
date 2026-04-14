-- ArenaCrypto: HD Wallet Integration Migration
-- Adds support for unique deposit addresses per user.

-- 1. Upgrade Profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS deposit_address TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS derivation_index SERIAL;

-- 2. Create Deposit Transactions table for tracking and double-spend prevention
CREATE TABLE IF NOT EXISTS public.deposit_transactions (
  tx_hash TEXT PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  amount_usdc DECIMAL NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Note: derivation_index is a serial to automatically increment for every new user, 
-- ensuring unique paths in the HD wallet (m/44'/60'/0'/0/index).
