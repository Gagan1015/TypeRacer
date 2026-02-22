# TypeRacrer

Phase 2 baseline for a MERN + TypeScript typing game platform.

## Stack

- Web: React, Vite, TypeScript, Tailwind, Motion, Zustand
- API: Express, TypeScript, MongoDB (Mongoose), Socket.IO, JWT auth
- Shared: common contracts and zod schemas
- Tooling: pnpm workspace, turbo, TypeScript project references

## Quick Start

1. Copy `.env.example` to `.env` and update secrets.
2. Ensure MongoDB is running locally.
3. Install dependencies:

```bash
pnpm install
```

4. Run all apps:

```bash
pnpm dev
```

- Web: `http://localhost:5173`
- API: `http://localhost:4000`

## Current Phase Status

- Completed:
  - Workspace and monorepo scaffold
  - Shared schemas and API envelope
  - Auth routes (`signup`, `login`, `refresh`, `logout`, `me`)
  - Profile routes (`GET/PATCH /api/profile/me`)
  - Web auth pages and protected dashboard/profile shell
  - Single-player race module:
    - `GET /api/race/text?mode=timed_30|timed_60|fixed`
    - `POST /api/race/attempts`
    - `GET /api/race/attempts/me`
    - `GET /api/race/stats/me`
  - Dashboard typing engine with:
    - 30s mode, 60s mode, fixed passage mode
    - Live WPM/raw WPM/accuracy/progress stats
    - Persisted attempt history and personal best cards
  - Multiplayer realtime MVP:
    - Socket-authenticated rooms with `create/join/leave/ready`
    - Countdown start flow and authoritative race lifecycle
    - Live progress and server-finalized multiplayer results persisted as attempts
    - New web route: `/multiplayer`
- Next:
  - Add API integration tests for race/auth/profile + multiplayer socket lifecycle
  - Add frontend unit tests for multiplayer room state transitions
  - Add reconnect/resume behavior and anti-cheat validation for multiplayer
