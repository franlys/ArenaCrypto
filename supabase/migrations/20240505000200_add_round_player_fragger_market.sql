-- Migration: Add round_player_fragger market type
-- Apuesta a qué JUGADOR INDIVIDUAL hace más kills en una ronda específica.
-- Se resuelve con submissions.player_kills (JSONB {participant_id: kills}).

ALTER TYPE market_type_enum ADD VALUE IF NOT EXISTS 'round_player_fragger';
