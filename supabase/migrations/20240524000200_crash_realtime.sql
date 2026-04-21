-- Enable Supabase Realtime on crash_rounds (idempotent)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.crash_rounds;
EXCEPTION WHEN duplicate_object THEN
  NULL; -- already in publication, ignore
END $$;

