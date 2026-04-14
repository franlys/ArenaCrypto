-- ArenaCrypto: Games Catalog
-- Full list of supported games for matchmaking

CREATE TABLE IF NOT EXISTS games (
  id          UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT    UNIQUE NOT NULL,
  slug        TEXT    UNIQUE NOT NULL,
  category    TEXT    NOT NULL CHECK (category IN ('FPS','MOBA','Sports','Battle Royale','Fighting','RTS','Other')),
  icon        TEXT    NOT NULL DEFAULT '🎮',
  platform    TEXT    NOT NULL DEFAULT 'PC/Console', -- 'PC', 'Mobile', 'PC/Console'
  is_active   BOOLEAN DEFAULT TRUE,
  sort_order  INT     DEFAULT 99,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Update matchmaking_queue to reference games table
ALTER TABLE matchmaking_queue
  ADD COLUMN IF NOT EXISTS game_slug TEXT;

-- Seed: 35 juegos cubriendo todas las categorías populares de eSports
INSERT INTO games (name, slug, category, icon, platform, sort_order) VALUES

-- ── FPS ──────────────────────────────────────────────────────────────────────
('Valorant',              'valorant',          'FPS',           '⚡', 'PC',         1),
('Counter-Strike 2',      'cs2',               'FPS',           '💣', 'PC',         2),
('Call of Duty: Warzone', 'cod-warzone',        'FPS',           '🪖', 'PC/Console', 3),
('Call of Duty: MW3',     'cod-mw3',            'FPS',           '🔫', 'PC/Console', 4),
('Apex Legends',          'apex-legends',       'FPS',           '🔵', 'PC/Console', 5),
('Overwatch 2',           'overwatch-2',        'FPS',           '🦸', 'PC/Console', 6),
('Rainbow Six Siege',     'r6-siege',           'FPS',           '🛡️', 'PC/Console', 7),
('Battlefield 2042',      'battlefield-2042',   'FPS',           '💥', 'PC/Console', 8),
('Halo Infinite',         'halo-infinite',      'FPS',           '🪐', 'PC/Console', 9),

-- ── MOBA ─────────────────────────────────────────────────────────────────────
('League of Legends',     'league-of-legends',  'MOBA',          '⚔️', 'PC',        10),
('Dota 2',                'dota-2',             'MOBA',          '🌀', 'PC',        11),
('Wild Rift',             'wild-rift',          'MOBA',          '📱', 'Mobile',    12),
('Mobile Legends',        'mobile-legends',     'MOBA',          '🗡️', 'Mobile',    13),
('Heroes of the Storm',   'heroes-of-the-storm','MOBA',          '🌟', 'PC',        14),

-- ── Sports ───────────────────────────────────────────────────────────────────
('EA Sports FC 25',       'ea-sports-fc-25',    'Sports',        '⚽', 'PC/Console',15),
('EA Sports FC 24',       'ea-sports-fc-24',    'Sports',        '⚽', 'PC/Console',16),
('NBA 2K25',              'nba-2k25',           'Sports',        '🏀', 'PC/Console',17),
('Rocket League',         'rocket-league',      'Sports',        '🚀', 'PC/Console',18),
('eFootball 2025',        'efootball-2025',     'Sports',        '🥅', 'PC/Console',19),
('NHL 25',                'nhl-25',             'Sports',        '🏒', 'PC/Console',20),
('Madden NFL 25',         'madden-25',          'Sports',        '🏈', 'PC/Console',21),

-- ── Battle Royale ────────────────────────────────────────────────────────────
('Fortnite',              'fortnite',           'Battle Royale', '🏗️', 'PC/Console',22),
('PUBG: Battlegrounds',   'pubg',               'Battle Royale', '🪂', 'PC/Console',23),
('Free Fire',             'free-fire',          'Battle Royale', '🔥', 'Mobile',    24),
('PUBG Mobile',           'pubg-mobile',        'Battle Royale', '📲', 'Mobile',    25),
('Warcraft Rumble',       'warcraft-rumble',    'Battle Royale', '⚔️', 'Mobile',    26),

-- ── Fighting ─────────────────────────────────────────────────────────────────
('Street Fighter 6',      'street-fighter-6',   'Fighting',      '👊', 'PC/Console',27),
('Tekken 8',              'tekken-8',           'Fighting',      '🥊', 'PC/Console',28),
('Mortal Kombat 1',       'mortal-kombat-1',    'Fighting',      '🩸', 'PC/Console',29),
('Super Smash Bros. Ultimate','smash-ultimate', 'Fighting',      '💫', 'PC/Console',30),

-- ── RTS ──────────────────────────────────────────────────────────────────────
('StarCraft II',          'starcraft-2',        'RTS',           '🛸', 'PC',        31),
('Age of Empires IV',     'aoe-4',              'RTS',           '🏰', 'PC',        32),

-- ── Other ────────────────────────────────────────────────────────────────────
('Clash Royale',          'clash-royale',       'Other',         '👑', 'Mobile',    33),
('Brawl Stars',           'brawl-stars',        'Other',         '⭐', 'Mobile',    34),
('Minecraft',             'minecraft',          'Other',         '🧱', 'PC/Console',35)

ON CONFLICT (slug) DO NOTHING;
