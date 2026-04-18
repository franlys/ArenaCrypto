-- Migration: game_modes — catálogo de modos por juego
-- Cada fila define un modo disponible para un juego específico.

CREATE TABLE IF NOT EXISTS public.game_modes (
  id          UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  game_slug   TEXT    NOT NULL REFERENCES public.games(slug) ON DELETE CASCADE,
  mode        TEXT    NOT NULL, -- slug interno: '1v1_ranked', '1v1_cash', '2v2', 'battle_royale'
  label       TEXT    NOT NULL, -- texto UI: 'Clasificatoria 1v1'
  icon        TEXT    NOT NULL DEFAULT '⚔️',
  team_size   INT     NOT NULL DEFAULT 1, -- jugadores por lado
  min_stake   NUMERIC NOT NULL DEFAULT 5,
  max_stake   NUMERIC NOT NULL DEFAULT 500,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order  INT     NOT NULL DEFAULT 99,
  UNIQUE (game_slug, mode)
);

ALTER TABLE public.game_modes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "game_modes_public_read" ON public.game_modes FOR SELECT USING (true);

-- ── FPS ──────────────────────────────────────────────────────────────────────
INSERT INTO public.game_modes (game_slug, mode, label, icon, team_size, min_stake, max_stake, sort_order) VALUES
-- Valorant
('valorant','1v1_ranked','Clasificatoria 1v1','⚡',1,5,500,1),
('valorant','1v1_cash',  'Cash Game 1v1',    '💰',1,10,1000,2),
('valorant','2v2',       '2v2 Equipos',      '👥',2,5,300,3),
-- CS2
('cs2','1v1_ranked','Clasificatoria 1v1','💣',1,5,500,1),
('cs2','1v1_cash',  'Cash Game 1v1',    '💰',1,10,1000,2),
('cs2','2v2',       '2v2 Equipos',      '👥',2,5,300,3),
-- COD Warzone
('cod-warzone','1v1_ranked','Clasificatoria 1v1','🪖',1,5,300,1),
('cod-warzone','1v1_cash',  'Cash Game 1v1',    '💰',1,10,500,2),
-- COD MW3
('cod-mw3','1v1_ranked','Clasificatoria 1v1','🔫',1,5,300,1),
('cod-mw3','1v1_cash',  'Cash Game 1v1',    '💰',1,10,500,2),
-- Apex Legends
('apex-legends','1v1_ranked','Clasificatoria 1v1','🔵',1,5,300,1),
('apex-legends','1v1_cash',  'Cash Game 1v1',    '💰',1,10,500,2),
-- Overwatch 2
('overwatch-2','1v1_ranked','Duelo 1v1 Custom','🦸',1,5,200,1),
('overwatch-2','2v2',       '2v2 Equipos',    '👥',2,5,200,2),
-- Rainbow Six Siege
('r6-siege','1v1_ranked','Clasificatoria 1v1','🛡️',1,5,300,1),
('r6-siege','1v1_cash',  'Cash Game 1v1',    '💰',1,10,500,2),
('r6-siege','2v2',       '2v2 Equipos',      '👥',2,5,200,3),
-- Battlefield 2042
('battlefield-2042','1v1_ranked','Clasificatoria 1v1','💥',1,5,200,1),
-- Halo Infinite
('halo-infinite','1v1_ranked','Clasificatoria 1v1','🪐',1,5,300,1),
('halo-infinite','1v1_cash',  'Cash Game 1v1',    '💰',1,10,500,2),
('halo-infinite','2v2',       '2v2 Equipos',      '👥',2,5,200,3),

-- ── MOBA ─────────────────────────────────────────────────────────────────────
('league-of-legends','1v1_ranked','Mid Lane 1v1', '⚔️',1,5,300,1),
('league-of-legends','2v2',       '2v2 Botlane',  '👥',2,5,200,2),
('dota-2','1v1_ranked','Clasificatoria 1v1','🌀',1,5,300,1),
('dota-2','2v2',       '2v2 Equipos',      '👥',2,5,200,2),
('wild-rift','1v1_ranked','Clasificatoria 1v1','📱',1,5,100,1),
('wild-rift','2v2',       '2v2 Botlane',      '👥',2,5,100,2),
('mobile-legends','1v1_ranked','Clasificatoria 1v1','🗡️',1,5,100,1),
('mobile-legends','2v2',       '2v2 Equipos',      '👥',2,5,100,2),
('heroes-of-the-storm','2v2','2v2 Equipos','🌟',2,5,150,1),

-- ── Sports ───────────────────────────────────────────────────────────────────
('ea-sports-fc-25','1v1_ranked','Clasificatoria 1v1','⚽',1,5,500,1),
('ea-sports-fc-25','1v1_cash',  'Cash Game 1v1',    '💰',1,10,1000,2),
('ea-sports-fc-24','1v1_ranked','Clasificatoria 1v1','⚽',1,5,300,1),
('ea-sports-fc-24','1v1_cash',  'Cash Game 1v1',    '💰',1,10,500,2),
('nba-2k25','1v1_ranked','Clasificatoria 1v1','🏀',1,5,500,1),
('nba-2k25','1v1_cash',  'Cash Game 1v1',    '💰',1,10,1000,2),
('rocket-league','1v1_ranked','Clasificatoria 1v1','🚀',1,5,300,1),
('rocket-league','1v1_cash',  'Cash Game 1v1',    '💰',1,10,500,2),
('rocket-league','2v2',       '2v2 Equipos',      '👥',2,5,200,3),
('efootball-2025','1v1_ranked','Clasificatoria 1v1','🥅',1,5,300,1),
('efootball-2025','1v1_cash',  'Cash Game 1v1',    '💰',1,10,500,2),
('nhl-25','1v1_ranked','Clasificatoria 1v1','🏒',1,5,300,1),
('nhl-25','1v1_cash',  'Cash Game 1v1',    '💰',1,10,500,2),
('madden-25','1v1_ranked','Clasificatoria 1v1','🏈',1,5,300,1),
('madden-25','1v1_cash',  'Cash Game 1v1',    '💰',1,10,500,2),

-- ── Battle Royale ────────────────────────────────────────────────────────────
('fortnite','1v1_ranked','Clasificatoria 1v1','🏗️',1,5,300,1),
('fortnite','1v1_cash',  'Cash Game 1v1',    '💰',1,10,500,2),
('pubg','1v1_ranked','Clasificatoria 1v1','🪂',1,5,200,1),
('free-fire','1v1_ranked','Clasificatoria 1v1','🔥',1,5,200,1),
('free-fire','1v1_cash',  'Cash Game 1v1',    '💰',1,10,300,2),
('pubg-mobile','1v1_ranked','Clasificatoria 1v1','📲',1,5,200,1),
('warcraft-rumble','1v1_ranked','Clasificatoria 1v1','⚔️',1,5,100,1),

-- ── Fighting ─────────────────────────────────────────────────────────────────
('street-fighter-6','1v1_ranked','Clasificatoria FT3','👊',1,5,500,1),
('street-fighter-6','1v1_cash',  'Cash Game FT5',    '💰',1,10,1000,2),
('tekken-8','1v1_ranked','Clasificatoria FT3','🥊',1,5,500,1),
('tekken-8','1v1_cash',  'Cash Game FT5',    '💰',1,10,1000,2),
('mortal-kombat-1','1v1_ranked','Clasificatoria FT3','🩸',1,5,500,1),
('mortal-kombat-1','1v1_cash',  'Cash Game FT5',    '💰',1,10,1000,2),
('smash-ultimate','1v1_ranked','Clasificatoria FT3','💫',1,5,300,1),
('smash-ultimate','1v1_cash',  'Cash Game FT5',    '💰',1,10,500,2),

-- ── RTS ──────────────────────────────────────────────────────────────────────
('starcraft-2','1v1_ranked','Clasificatoria 1v1','🛸',1,5,500,1),
('starcraft-2','1v1_cash',  'Cash Game 1v1',    '💰',1,10,1000,2),
('starcraft-2','2v2',       '2v2 Equipo',       '👥',2,5,300,3),
('aoe-4','1v1_ranked','Clasificatoria 1v1','🏰',1,5,300,1),
('aoe-4','1v1_cash',  'Cash Game 1v1',    '💰',1,10,500,2),
('aoe-4','2v2',       '2v2 Equipo',       '👥',2,5,200,3),

-- ── Other / Mobile ────────────────────────────────────────────────────────────
('clash-royale','1v1_ranked','Clasificatoria 1v1','👑',1,5,200,1),
('clash-royale','1v1_cash',  'Cash Game 1v1',    '💰',1,10,300,2),
('brawl-stars','1v1_ranked','Clasificatoria 1v1','⭐',1,5,100,1),
('brawl-stars','2v2',       '2v2 Duos',         '👥',2,5,100,2),
('minecraft','1v1_ranked','Clasificatoria 1v1','🧱',1,5,100,1)

ON CONFLICT (game_slug, mode) DO NOTHING;
