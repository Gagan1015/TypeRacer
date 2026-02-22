# TypeRacer Pro - Long Context Plan

## 1) Product Goals

- Build a best-in-class typing game with both single-player and multiplayer modes.
- Deliver smooth real-time gameplay with strong anti-cheat and fair ranking.
- Create a modern minimalist interface with high-quality clip-path animation and microinteractions.
- Ship with production-ready auth, profile system, leaderboards, admin controls, and analytics.

## 2) Delivery Strategy

- Architecture: monorepo with shared types and validation schemas.
- Release model:
  - Milestone A: Internal alpha (core gameplay loops + auth)
  - Milestone B: Closed beta (ranked + leaderboard + admin moderation)
  - Milestone C: Public launch (stability, anti-cheat, retention loops)
- Quality gates per phase:
  - Feature complete
  - Tests pass (unit/integration/e2e as required)
  - Performance budget and security checks pass

## 3) Monorepo Structure (Concrete)

```txt
typeracrer/
  apps/
    web/                      # React + Vite + TS + Tailwind + Motion
      src/
        app/
        features/
          auth/
          race/
          leaderboard/
          profile/
          dashboard/
          admin/
        components/
          ui/
          animations/
        lib/
          api/
          socket/
          state/
          utils/
        styles/
      public/
      index.html
      package.json
      tsconfig.json
      vite.config.ts
      tailwind.config.ts
      postcss.config.cjs
    api/                      # Express + TS + Mongo + Socket.IO
      src/
        app.ts
        server.ts
        config/
        modules/
          auth/
          users/
          profiles/
          texts/
          races/
          leaderboard/
          admin/
        middleware/
        sockets/
        jobs/
        db/
        utils/
      tests/
      package.json
      tsconfig.json
  packages/
    shared/                   # Shared types/constants/zod schemas
      src/
        types/
        schemas/
        constants/
        contracts/
      package.json
      tsconfig.json
    ui/                       # Shared component primitives (optional in phase 2)
      src/
      package.json
  infra/
    docker/
      api.Dockerfile
      web.Dockerfile
      nginx.conf
    docker-compose.yml
  .github/
    workflows/
      ci.yml
  .agent/
    plan-phases.md
    sprint-board.md           # Optional split doc in phase 1 setup
  package.json                # workspace root
  pnpm-workspace.yaml
  turbo.json
  .env.example
  README.md
```

## 4) Recommended Dependency Plan

### Root workspace

- Tooling:
  - `pnpm`, `turbo`, `typescript`, `eslint`, `prettier`, `lint-staged`, `husky`

### apps/web

- Core:
  - `react`, `react-dom`, `react-router-dom`
- State/data:
  - `@tanstack/react-query`, `zustand`
- Validation/forms:
  - `zod`, `react-hook-form`, `@hookform/resolvers`
- UI/animation:
  - `tailwindcss`, `motion` (Motion One / Framer Motion package choice), `clsx`, `cva`
- Realtime:
  - `socket.io-client`
- Charts/dashboard:
  - `recharts` or `visx` (choose one, start with `recharts`)
- Testing:
  - `vitest`, `@testing-library/react`, `@testing-library/user-event`, `playwright`

### apps/api

- Core:
  - `express`, `cors`, `helmet`, `compression`, `morgan`
- Auth/security:
  - `jsonwebtoken`, `argon2`, `cookie-parser`, `express-rate-limit`
- Validation:
  - `zod`
- DB/cache/jobs:
  - `mongoose`, `redis`, `bullmq`
- Realtime:
  - `socket.io`
- Logging/observability:
  - `pino`, `pino-http`
- Testing:
  - `vitest`, `supertest`, `mongodb-memory-server`

### packages/shared

- `zod`
- TS build tooling (`tsup` or `tsc` project refs)

## 5) System Architecture Snapshot

- Web client:
  - Uses REST for CRUD and Socket.IO for race events.
  - Keeps client-side race state minimal; authoritative state remains on server.
- API server:
  - Handles auth/profile/admin REST endpoints.
  - Manages race rooms over sockets, validates race lifecycle, persists results.
- Redis:
  - Presence, room pub/sub (phase 2 horizontal scale), rate-limit support, job queues.
- MongoDB:
  - Persistent source of truth for users, races, results, leaderboard snapshots.
- Background workers:
  - Recompute leaderboard snapshots, suspicious-score review, daily aggregates.

## 6) Phased Plan

## Phase 0 - Foundation (Week 1)

- Initialize monorepo and CI.
- Configure lint/typecheck/test commands.
- Add env validation and config module templates.
- Add shared package for contracts.

Exit criteria:
- Workspaces build cleanly.
- CI runs lint + typecheck + unit test stub.

## Phase 1 - Auth + Profile + UI System (Week 2)

- Auth flows: signup, login, refresh, logout.
- Role model: `user`, `admin`.
- Profile CRUD and account settings.
- Web design system primitives and motion tokens.

Exit criteria:
- Auth works with refresh rotation.
- Protected routes in web app.
- Profile page and settings saved to DB.

## Phase 2 - Single-Player Core (Week 3)

- Typing engine component and scoring service.
- Modes: timed 30s/60s and fixed text mode.
- Persist race attempts and PB stats.

Exit criteria:
- Stable WPM/accuracy calculation.
- User attempt history visible in dashboard.

## Phase 3 - Multiplayer Realtime (Weeks 4-5)

- Room lifecycle: create/join/ready/countdown/race/finish.
- Live progress stream with interpolation.
- Result finalization with server authority.

Exit criteria:
- 2-20 players race reliably.
- Completion order and official scores persisted.

## Phase 4 - Leaderboard + Ranked (Weeks 6-7)

- Global and seasonal leaderboards.
- ELO/Glicko-style ranked updates (pick one, recommend Glicko-2 later).
- Queue-based recomputation for heavy operations.

Exit criteria:
- Leaderboard updates are deterministic.
- Ranked match result updates verified by tests.

## Phase 5 - Admin + Moderation + Anti-Cheat V1 (Week 8)

- Admin dashboard for users, texts, reports.
- Anti-cheat rule checks:
  - Impossible cadence
  - Paste-like bursts
  - Statistical timing anomalies
- Manual review workflow with audit logs.

Exit criteria:
- Suspicious races can be flagged and reviewed.
- Admin actions logged with actor + timestamp.

## Phase 6 - Polish + Performance + Beta Launch (Weeks 9-10)

- Motion polish, clip-path transitions, microinteraction refinement.
- Performance budget and load testing.
- Closed beta rollout and telemetry review.

Exit criteria:
- p95 API latency target met.
- Realtime race experience stable under expected concurrent load.

## 7) Sprint 1 Ticket Board (Exact Backlog)

Sprint length: 2 weeks
Sprint goal: establish production-ready foundation and complete auth/profile MVP.

## Epic A - Monorepo and Tooling

1. TPR-001 Setup pnpm workspace and turbo pipelines
- Acceptance:
  - Root scripts: `dev`, `build`, `test`, `lint`, `typecheck`
  - `apps/web`, `apps/api`, `packages/shared` wired in workspace

2. TPR-002 Configure TypeScript project references
- Acceptance:
  - Root + package tsconfigs compile without circular refs

3. TPR-003 Configure ESLint/Prettier + pre-commit hooks
- Acceptance:
  - `lint-staged` runs on staged TS/TSX/JSON/MD files

4. TPR-004 Add GitHub Actions CI
- Acceptance:
  - PR pipeline runs lint, typecheck, tests

## Epic B - Shared Contracts

5. TPR-005 Create `packages/shared` with user/auth/profile schemas
- Acceptance:
  - Zod schemas exported and consumed by web/api

6. TPR-006 Add error and API response contract utilities
- Acceptance:
  - Standard response envelope used in one auth endpoint

## Epic C - API Auth and Profile

7. TPR-007 Bootstrap Express server with security middleware
- Acceptance:
  - Helmet, CORS, cookie parser, rate limit enabled

8. TPR-008 Implement Mongo user model and profile model
- Acceptance:
  - Indexes for email/username uniqueness present

9. TPR-009 Signup endpoint with Argon2 hashing
- Acceptance:
  - Validates payload via Zod and stores hashed password only

10. TPR-010 Login endpoint with JWT access+refresh cookies
- Acceptance:
  - Access and refresh tokens issued and refresh stored/rotated

11. TPR-011 Refresh and logout endpoints
- Acceptance:
  - Refresh rotation invalidates old token

12. TPR-012 Auth middleware and role guard
- Acceptance:
  - User route and admin-only sample route protected

13. TPR-013 Profile read/update endpoints
- Acceptance:
  - Authenticated user can update own profile fields safely

## Epic D - Web Auth UX + Dashboard Shell

14. TPR-014 Initialize Vite React app with Tailwind and base theme tokens
- Acceptance:
  - Theme variables include typography, spacing, motion timing

15. TPR-015 Implement auth pages (signup/login) with form validation
- Acceptance:
  - Client and server validation errors rendered clearly

16. TPR-016 Setup route guards and auth store
- Acceptance:
  - Protected routes redirect unauthenticated users

17. TPR-017 Create profile settings page
- Acceptance:
  - Edit display name, avatar URL, bio, keyboard layout

18. TPR-018 Build dashboard shell with navigation and placeholder cards
- Acceptance:
  - Includes areas for stats, recent races, leaderboard preview

## Epic E - Test and Quality Gates

19. TPR-019 API integration tests for signup/login/refresh/logout
- Acceptance:
  - Happy path + invalid credentials + expired token scenarios

20. TPR-020 Web unit tests for auth form and route guard
- Acceptance:
  - Tests run in CI and cover basic auth UX flow

21. TPR-021 Add observability baseline (request logging + error handler)
- Acceptance:
  - Request ID and structured errors visible in logs

## 8) Definition of Done (Per Ticket)

- Code merged with review.
- Typecheck/lint/tests pass in CI.
- Feature behind stable API contracts.
- Security basics validated for new endpoints.
- Minimal docs updated in `README.md`.

## 9) Design Direction Notes (for your "best ever" goal)

- Theme: refined minimalism with high-contrast typography and one electric accent.
- Signature effect: clip-path "speed lane" transition for race start/result reveal.
- Motion grammar:
  - Fast interactions: 120-180ms
  - Layout transitions: 220-320ms
  - Hero state changes: 450-650ms
- Microinteractions to prioritize:
  - Keystroke precision pulse
  - Combo streak glow
  - Personal best confetti line burst (minimal, not noisy)
  - Rank-up card morph animation

## 10) Immediate Next Actions

1. Scaffold monorepo directories and package manifests.
2. Install base dependencies and setup turbo pipelines.
3. Implement Sprint 1 tickets TPR-001 through TPR-004 first (foundation).
4. Start API auth vertical slice (TPR-007 through TPR-011) before polishing UI.
