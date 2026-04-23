-- Habilitar Realtime para el motor de matchmaking y chat
ALTER TABLE public.matchmaking_queue REPLICA IDENTITY FULL;
ALTER TABLE public.matches REPLICA IDENTITY FULL;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.submissions REPLICA IDENTITY FULL;

-- Asegurar que las tablas estén en la publicación de realtime
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE matchmaking_queue, matches, chat_messages, submissions;
