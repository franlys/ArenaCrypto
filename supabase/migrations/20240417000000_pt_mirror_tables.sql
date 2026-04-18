-- PT Mirror Tables
-- AC stores a local copy of PT data pushed via webhooks.
-- All pages query these tables instead of the cross-DB bridge client.
-- Source of truth is always PT; AC mirrors are read-only for pages.

-- ── Tournaments mirror ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ac_tournaments (
  pt_id                 UUID PRIMARY KEY,   -- PT tournaments.id
  name                  TEXT NOT NULL,
  slug                  TEXT NOT NULL,
  status                TEXT NOT NULL DEFAULT 'draft',
  format                TEXT,
  tournament_type       TEXT,
  mode                  TEXT,
  level                 TEXT,
  arena_betting_enabled BOOLEAN DEFAULT false,
  arena_betting_status  TEXT DEFAULT 'closed',
  total_matches         INTEGER DEFAULT 0,
  matches_completed     INTEGER DEFAULT 0,
  logo_url              TEXT,
  start_date            TIMESTAMPTZ,
  end_date              TIMESTAMPTZ,
  prize_1st             NUMERIC(10,2) DEFAULT 0,
  prize_2nd             NUMERIC(10,2) DEFAULT 0,
  prize_3rd             NUMERIC(10,2) DEFAULT 0,
  entry_fee             NUMERIC(10,2) DEFAULT 0,
  synced_at             TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ac_tournaments_slug   ON ac_tournaments(slug);
CREATE INDEX IF NOT EXISTS idx_ac_tournaments_status ON ac_tournaments(status);
CREATE INDEX IF NOT EXISTS idx_ac_tournaments_betting
  ON ac_tournaments(arena_betting_enabled, status);

-- ── Teams mirror ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ac_teams (
  pt_id           UUID PRIMARY KEY,   -- PT teams.id
  pt_tournament_id UUID NOT NULL,
  name            TEXT NOT NULL,
  avatar_url      TEXT,
  stream_url      TEXT,
  synced_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ac_teams_tournament ON ac_teams(pt_tournament_id);

-- ── Participants mirror ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ac_participants (
  pt_id           UUID PRIMARY KEY,   -- PT participants.id
  pt_team_id      UUID,
  pt_tournament_id UUID NOT NULL,
  display_name    TEXT NOT NULL,
  stream_url      TEXT,
  total_kills     INTEGER DEFAULT 0,
  is_captain      BOOLEAN DEFAULT false,
  synced_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ac_participants_team       ON ac_participants(pt_team_id);
CREATE INDEX IF NOT EXISTS idx_ac_participants_tournament ON ac_participants(pt_tournament_id);

-- ── Matches mirror ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ac_matches (
  pt_id           UUID PRIMARY KEY,   -- PT matches.id
  pt_tournament_id UUID NOT NULL,
  name            TEXT NOT NULL,
  match_number    INTEGER NOT NULL,
  round_number    INTEGER DEFAULT 1,
  map_name        TEXT,
  is_completed    BOOLEAN DEFAULT false,
  is_active       BOOLEAN DEFAULT false,
  is_warmup       BOOLEAN DEFAULT false,
  parent_match_id UUID,
  synced_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ac_matches_tournament ON ac_matches(pt_tournament_id);
CREATE INDEX IF NOT EXISTS idx_ac_matches_active
  ON ac_matches(pt_tournament_id, is_active)
  WHERE is_active = true;

-- ── RLS: public read, service_role writes ────────────────────────────────────
ALTER TABLE ac_tournaments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE ac_teams        ENABLE ROW LEVEL SECURITY;
ALTER TABLE ac_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE ac_matches      ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Public read ac_tournaments"  ON ac_tournaments  FOR SELECT USING (true);
  CREATE POLICY "Public read ac_teams"        ON ac_teams        FOR SELECT USING (true);
  CREATE POLICY "Public read ac_participants" ON ac_participants  FOR SELECT USING (true);
  CREATE POLICY "Public read ac_matches"      ON ac_matches      FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DROP POLICY IF EXISTS "Service write ac_tournaments" ON ac_tournaments;
CREATE POLICY "Service write ac_tournaments"  ON ac_tournaments  FOR ALL TO service_role USING (true);

DROP POLICY IF EXISTS "Service write ac_teams" ON ac_teams;
CREATE POLICY "Service write ac_teams"        ON ac_teams        FOR ALL TO service_role USING (true);

DROP POLICY IF EXISTS "Service write ac_participants" ON ac_participants;
CREATE POLICY "Service write ac_participants" ON ac_participants  FOR ALL TO service_role USING (true);

DROP POLICY IF EXISTS "Service write ac_matches" ON ac_matches;
CREATE POLICY "Service write ac_matches"      ON ac_matches      FOR ALL TO service_role USING (true);
