# CLAUDE.md - ArenaCrypto

## Project Overview
ArenaCrypto is a premium gaming betting platform building on Next.js, Supabase, and Polygon.

## Technical Stack
- **Frontend**: Next.js (App Router), Vanilla CSS, Framer Motion.
- **Backend/DB**: Supabase (PostgreSQL, Auth, Realtime, Storage).
- **Blockchain**: Polygon Network (via wagmi/viem).
- **AI**: Gemini 1.5 Flash/Pro for automated match evidence validation.

## Governance & Documentation
- **Supervisor Agent**: Responsable de la validación técnica y estética de cada tarea.
- **Modular Skills**: Sistema de instrucciones detalladas en `.claude/skills/`.
- **Daily log**: `DEVLOG.md`
- **Improvements tracker**: `RECUENTO_MEJORAS.md`
- **Phase 0: Requirements & Documentation Setup [x]**
- [x] Initial Requirements Gathering (Chat)
- [x] Formalize Requirements Document (`REQUISITOS.md`)
- [x] Initialize Project Structure (`.claude/`, `DEVLOG.md`, `CLAUDE.md`, etc.)
- [x] Research: Optimal AI prompt for Match Evidence Validation
- [x] Define UX/UI Atomic Components

## Phase 0.5: Multi-Agent Governance & Skills [x]
- [x] Install Modular Skills (`.claude/skills/`)
- [x] Setup Supervisor Agent protocol
- [x] Update Governance in `CLAUDE.md`

## Phase 1: Foundation (Next.js + Supabase) [/]
RLS and Polygon on-chain verification.

## Coding Style
- Use Vanilla CSS modules for components.
- Maintain a "Neon eSports" aesthetic (Dark mode, neon accents).
- High-response spring physics for animations.
- Real-time safety using Supabase RLS and Polygon on-chain verification.

## Commands
- `npm run dev` - Start development server.
- `npm run build` - Build for production.
- `npm run lint` - Run ESLint checks.
