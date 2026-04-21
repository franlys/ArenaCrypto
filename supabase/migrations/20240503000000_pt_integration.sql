-- Phase 2: Tournament Engine Integration (Ported from Proyecto-torneos)
-- Consolidates all core tournament features into ArenaCrypto schema.

-- 1. ENUMS
DO $$ BEGIN
    CREATE TYPE tournament_mode AS ENUM ('individual', 'duos', 'trios', 'cuartetos');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE competition_format AS ENUM (
      'battle_royale_clasico', 'kill_race', 'custom_rooms',
      'eliminacion_directa', 'fase_de_grupos'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE tournament_level AS ENUM ('casual', 'profesional');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE tournament_status AS ENUM ('draft', 'active', 'finished');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE tournament_submission_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. TOURNAMENTS
CREATE TABLE IF NOT EXISTS public.tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  rules_text TEXT CHECK (char_length(rules_text) <= 5000),
  slug VARCHAR(100) UNIQUE NOT NULL,
  mode tournament_mode NOT NULL,
  format competition_format NOT NULL,
  level tournament_level NOT NULL DEFAULT 'casual',
  status tournament_status NOT NULL DEFAULT 'draft',
  total_matches INTEGER NOT NULL CHECK (total_matches > 0),
  matches_completed INTEGER NOT NULL DEFAULT 0,
  kill_rate_enabled BOOLEAN NOT NULL DEFAULT true,
  pot_top_enabled BOOLEAN NOT NULL DEFAULT true,
  vip_enabled BOOLEAN NOT NULL DEFAULT false,
  tiebreaker_match_enabled BOOLEAN NOT NULL DEFAULT false,
  kill_race_time_limit_minutes INTEGER,
  default_rounds_per_match INTEGER DEFAULT 1,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  logo_url TEXT,
  champion_image_url TEXT,
  
  -- Arena Betting Integration
  arena_betting_enabled BOOLEAN NOT NULL DEFAULT false,
  arena_betting_status TEXT DEFAULT 'closed' CHECK (arena_betting_status IN ('open', 'closed', 'paused')),
  
  -- Audience Metrics
  total_live_viewers INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. SCORING RULES
CREATE TABLE IF NOT EXISTS public.scoring_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  kill_points NUMERIC(6,2) NOT NULL CHECK (kill_points >= 0),
  placement_points JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. TEAMS
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  avatar_url TEXT,
  stream_url TEXT,
  vip_score NUMERIC(8,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, name)
);

-- 5. PARTICIPANTS
CREATE TABLE IF NOT EXISTS public.participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.profiles(id), -- Link to ArenaCrypto profile
  display_name VARCHAR(100) NOT NULL,
  avatar_url TEXT,
  stream_url TEXT,
  stream_platform TEXT, -- 'twitch', 'youtube', 'kick'
  stream_id TEXT, -- Numeric/String ID for API calls
  is_captain BOOLEAN NOT NULL DEFAULT false,
  total_kills INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, display_name)
);

-- 6. TOURNAMENT MATCHES (Renamed from matches to avoid conflict)
CREATE TABLE IF NOT EXISTS public.tournament_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  parent_match_id UUID REFERENCES public.tournament_matches(id) ON DELETE CASCADE,
  match_number INTEGER NOT NULL,
  round_number INTEGER DEFAULT 1,
  name VARCHAR(100),
  map_name TEXT,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, match_number, round_number)
);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_parent ON tournament_matches(parent_match_id);

-- 7. TOURNAMENT SUBMISSIONS (Renamed from submissions to avoid conflict)
CREATE TABLE IF NOT EXISTS public.tournament_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES public.tournament_matches(id) ON DELETE CASCADE,
  submitted_by UUID NOT NULL REFERENCES public.participants(id),
  kill_count INTEGER NOT NULL CHECK (kill_count >= 0),
  pot_top BOOLEAN NOT NULL DEFAULT false,
  status tournament_submission_status NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  
  -- AI Vision Data
  ai_status TEXT DEFAULT 'pending' CHECK (ai_status IN ('pending', 'processing', 'completed', 'failed')),
  ai_data JSONB,
  ai_confidence FLOAT,
  ai_error TEXT,
  
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id)
);
CREATE INDEX IF NOT EXISTS idx_tournament_submissions_ai ON tournament_submissions(ai_status) WHERE ai_status = 'pending';

-- 8. EVIDENCE FILES
CREATE TABLE IF NOT EXISTS public.tournament_evidence_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.tournament_submissions(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. TEAM STANDINGS
CREATE TABLE IF NOT EXISTS public.team_standings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  total_points NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_kills INTEGER NOT NULL DEFAULT 0,
  kill_rate NUMERIC(6,2) NOT NULL DEFAULT 0,
  pot_top_count INTEGER NOT NULL DEFAULT 0,
  vip_score NUMERIC(8,2) NOT NULL DEFAULT 0,
  rank INTEGER,
  previous_rank INTEGER,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, team_id)
);

-- 10. LEADERBOARD THEMES
CREATE TABLE IF NOT EXISTS public.leaderboard_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL UNIQUE REFERENCES public.tournaments(id) ON DELETE CASCADE,
  preset_name VARCHAR(50),
  primary_color VARCHAR(7),
  background_type VARCHAR(20),
  background_value TEXT,
  background_mobile_value TEXT,
  background_opacity FLOAT DEFAULT 1.0,
  font_family VARCHAR(100),
  logo_url TEXT,
  banner_url TEXT,
  column_order JSONB,
  visible_columns JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. TOURNAMENT BETS has been moved to 20240504000000_community_betting.sql

-- 12. BRACKETS & GROUPS
CREATE TABLE IF NOT EXISTS public.bracket_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  round_name VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bracket_matchups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES public.bracket_rounds(id) ON DELETE CASCADE,
  team_a_id UUID REFERENCES public.teams(id),
  team_b_id UUID REFERENCES public.teams(id),
  winner_id UUID REFERENCES public.teams(id),
  is_bye BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  name VARCHAR(10) NOT NULL,
  advance_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.group_teams (
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  PRIMARY KEY (group_id, team_id)
);

-- RLS POLICIES (Preliminary)
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_standings ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE tournament_bets ENABLE ROW LEVEL SECURITY;

-- Public READ for tournaments and standings
CREATE POLICY "Public read tournaments" ON tournaments FOR SELECT USING (true);
CREATE POLICY "Public read team_standings" ON team_standings FOR SELECT USING (true);
CREATE POLICY "Public read teams" ON teams FOR SELECT USING (true);
CREATE POLICY "Public read participants" ON participants FOR SELECT USING (true);

-- Betting policies moved to 20240504000000_community_betting.sql
