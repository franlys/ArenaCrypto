-- Enable Supabase Realtime on crash_rounds so clients get instant phase changes
ALTER PUBLICATION supabase_realtime ADD TABLE public.crash_rounds;
