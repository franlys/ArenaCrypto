-- Habilitar Realtime para el motor de matchmaking
ALTER PUBLICATION supabase_realtime ADD TABLE matchmaking_queue;
ALTER PUBLICATION supabase_realtime ADD TABLE matches;
