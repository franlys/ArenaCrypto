# Task List: Tournament Engine Integration

## Phase 1: Preparation & Documentation
- [/] Initialize project documentation (DEVLOG, RECUENTO_MEJORAS) <!-- id: 0 -->
- [ ] Create consolidated environment variables template <!-- id: 1 -->

## Phase 2: Database Migration (Fusion)
- [x] Create schema migration for Tournament Core (from PT) <!-- id: 2 -->
    - [x] Rename `matches` to `tournament_matches` <!-- id: 3 -->
    - [x] Rename `submissions` to `tournament_submissions` <!-- id: 4 -->
- [x] Create schema migration for Betting & Betting Config <!-- id: 5 -->
- [x] Create schema migration for Stream Metadata (Audience) <!-- id: 6 -->
- [/] Apply migrations to local Supabase instance (Awaiting User) <!-- id: 7 -->

## Phase 3: Service Integration
- [x] Port `tournament-actions.ts` and refactor for new schema <!-- id: 8 -->
- [x] Port `ai-vision.ts` (Upgrade existing AC version) <!-- id: 9 -->
- [x] Implement `stream-aggregator.ts` service <!-- id: 10 -->
- [x] Port `scoring-engine` ports <!-- id: 10.1 -->

## Phase 4: UI Integration
- [ ] Port `TournamentForm` with "Enable Betting" toggle <!-- id: 11 -->
- [ ] Port public `LeaderboardClient` with AC Neon Theme <!-- id: 12 -->
- [ ] Integrate "Total Audience" badge in Leaderboard <!-- id: 13 -->
- [ ] Implement "Bet on Team" UI for spectators <!-- id: 14 -->

## Phase 5: Testing & Payout Logic
- [ ] Implement automatic payout logic when tournament finishes <!-- id: 15 -->
- [ ] Manual verification of E2E flow (Create -> Bet -> Play -> Payout) <!-- id: 16 -->
