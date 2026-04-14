-- Migration: Bridge Cleanup
-- Project: ArenaCrypto (AC)

-- 1. Drop the FK constraint that points to the local streamer_codes table
-- because management moved to Proyecto-Torneos (Bridge).
ALTER TABLE IF EXISTS tournament_unlocks 
DROP CONSTRAINT IF EXISTS tournament_unlocks_streamer_code_id_fkey;

-- 2. Drop the local table as it's no longer the source of truth
DROP TABLE IF EXISTS streamer_codes CASCADE;

-- 3. Ensure the column name is consistent with the new bridge action
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tournament_unlocks' AND column_name='streamer_code_id') THEN
        ALTER TABLE tournament_unlocks RENAME COLUMN streamer_code_id TO code_id;
    END IF;
END $$;
