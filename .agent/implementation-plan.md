# TypeRacrer — Launch Implementation Plan

> **Target:** Production-ready launch with polished UX, SEO, OAuth, and marketing assets.
> **Created:** February 28, 2026

---

## 1. OAuth (Google & GitHub) + Auth Page Redesign ✅

### 1a. Backend — OAuth Provider Integration

- [x] ~~Install `passport`~~ Used raw OAuth2 flows with `fetch()` (no extra deps needed)
- [x] Add environment variables:
  - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`
  - `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_CALLBACK_URL`
- [x] Create `modules/auth/oauth.service.ts`:
  - `getGoogleAuthUrl()` → redirect to Google consent screen
  - `handleGoogleCallback(code)` → exchange code for tokens, extract email/name/avatar
  - `getGithubAuthUrl()` → redirect to GitHub authorize URL
  - `handleGithubCallback(code)` → exchange code for tokens, fetch `/user` + `/user/emails`
- [x] Create `modules/auth/oauth.routes.ts`:
  - `GET /api/auth/google` → redirect
  - `GET /api/auth/google/callback` → handle callback, upsert user, issue JWT, redirect to frontend
  - `GET /api/auth/github` → redirect
  - `GET /api/auth/github/callback` → same flow
- [x] User model changes:
  - Add `provider` field (`"local" | "google" | "github"`)
  - Add `providerId` field (external user ID)
  - Add `avatarUrl` field (optional, from provider)
  - Make `passwordHash` optional (OAuth users won't have one)
  - Add unique compound index on `(provider, providerId)`
- [x] Handle account linking: if existing email matches, link OAuth to existing account
- [ ] Write integration tests for both flows

### 1b. Frontend — Auth Pages Redesign

- [x] Redesign `/login` page:
  - Split into two sections: OAuth buttons on top, email/password form below
  - Large "Continue with Google" button (Google branding colors/icon)
  - Large "Continue with GitHub" button (GitHub dark/icon)
  - Divider: "or sign in with email"
  - Clean email + password form below
- [x] Redesign `/register` page:
  - Same OAuth buttons on top
  - Divider: "or create an account"
  - Username + email + password form
- [x] Add visual polish:
  - Subtle animated background (matching dark theme)
  - TypeRacrer logo + tagline at top
  - Monospace typing animation in the background or hero area
  - Feature stat tags at bottom
- [x] Handle OAuth redirect flow:
  - After callback, backend sets cookies, redirects to `/auth/callback`
  - Frontend route hydrates auth from cookies, redirects to dashboard
- [x] Error states: OAuth denied, account conflict, provider down

### Estimated effort: 2–3 days ✅ Completed

---

## 2. Landing Page ✅

### 2a. Design & Structure

- [x] Create route `/` (root) as the public landing page (unauthenticated users)
- [x] Redirect authenticated users from `/` to `/dashboard`
- [x] Page sections:

**Hero Section**
- Large heading: "Type faster. Race smarter." (with gradient text)
- Subheading explaining the app in one sentence
- CTA buttons: "Start Racing" + "View Leaderboard"
- Live typing animation demo (auto-typing text with real-time WPM counter)

**Features Bento Grid** (3×2 responsive grid)
- Card 1: ⚡ **Real-time Racing** — "Timed modes from 15s to custom durations"
- Card 2: 🏆 **Leaderboards** — "Compete globally, track your rank"
- Card 3: 👥 **Multiplayer** — "Race friends in real-time rooms"
- Card 4: 📊 **Detailed Stats** — "WPM, accuracy, personal bests by mode"
- Card 5: 🛡️ **Anti-Cheat** — "Fair play enforced with automated detection"
- Card 6: 🎯 **Ranked Matches** — "Elo-based matchmaking, climb the ladder"

Each card: icon, title, 1-line description, gradient background + border glow on hover. Staggered fade-in on scroll.

**How It Works** (3-step horizontal flow)
1. Create an account (or OAuth)
2. Choose your mode and start typing
3. Track progress and climb leaderboards

**Stats/Social Proof Bar**
- Total races completed
- Active users
- Average WPM across platform
- Animated count-up counters, pulls real numbers from API

**Footer**
- Links: GitHub repo, socials, tech stack credit
- "Built with React, Node.js, MongoDB, Socket.IO"

### 2b. Implementation

- [x] Create `apps/web/src/features/landing/pages/LandingPage.tsx`
- [x] Create `apps/web/src/features/landing/components/`:
  - `HeroSection.tsx`
  - `FeaturesGrid.tsx`
  - `HowItWorks.tsx`
  - `StatsBar.tsx`
  - `Footer.tsx`
  - `TypingDemo.tsx` (self-contained auto-typing animation with WPM counter)
- [x] Add public stats API: `GET /api/health/stats` → returns total races, users, avg WPM
- [x] Update router: `/` → `LandingPage` (public), protect `/dashboard` etc.
- [x] Responsive: mobile-first, bento grid collapses to single column
- [x] Animations: fade-in on scroll (Intersection Observer), animated counter, hero glow

### Estimated effort: 2 days ✅ Completed

---

## 3. Full Responsiveness Audit ✅

### Already Done ✅
- [x] Header/navbar — responsive drawer on mobile
- [x] Dashboard mode selector — flex-wrap, smaller buttons on mobile
- [x] Dashboard keyboard shortcuts — hidden on mobile
- [x] Admin panel — all tabs responsive (users, texts, reports, audit logs)

### Audited Pages ✅
- [x] **Leaderboard page** — hide "acc" + "runs" columns on mobile (typing), hide "D" + "win%" on mobile (ranked), responsive grid templates with `sm:` breakpoints
- [x] **Multiplayer page** — room header bar wraps with `flex-wrap`, separator pipes hidden on mobile, result leaderboard row wraps
- [x] **Profile page** — header card stacks vertically on mobile, keyboard layout buttons stack to single column, recent attempts rows wrap
- [x] **Login / Register pages** — already fully responsive (redesigned in Phase 1 with mobile-first approach)
- [x] **Dashboard results panel** — stat numbers scale down (text-4xl on mobile → text-5xl on desktop), gaps reduced on mobile
- [x] **Dashboard recent attempts / personal best** — attempts row wraps on mobile with `sm:flex-row`

### Testing Checklist
- [x] Tables don't overflow — columns hidden at mobile breakpoints
- [x] All flex layouts use `flex-wrap` where needed
- [x] Modals already use `px-4` viewport padding and `max-w-sm` for mobile safety
- [x] All new landing page sections are mobile-first responsive

### Estimated effort: 1 day ✅ Completed

---

## 4. SEO & Meta ✅

### 4a. Favicon & App Icons
- [x] Design favicon: `tr` monogram SVG in accent yellow on dark background
- [x] Add `site.webmanifest` for PWA discoverability (name, theme_color, icons)
- [x] Add favicon links in `index.html` (SVG icon + webmanifest)

### 4b. Open Graph & Twitter Cards
- [x] Add OG meta tags: og:title, og:description, og:image, og:url, og:type, og:site_name, og:locale
- [x] Add Twitter card meta tags: twitter:card (summary_large_image), twitter:title, twitter:description, twitter:image

### 4c. HTML Meta & Structured Data
- [x] Set `<title>` tag: "TypeRacrer — Competitive Typing Races"
- [x] Add `<meta name="description">` with compelling copy
- [x] Add `<meta name="keywords">` — typing test, racing, WPM, multiplayer
- [x] Add `<meta name="theme-color" content="#25282f">`
- [x] Add canonical URL: `<link rel="canonical" href="https://typeracrer.com">`
- [x] Add JSON-LD structured data (WebApplication schema with feature list)
- [x] Add `<noscript>` fallback message with styled content

### 4d. Technical SEO
- [x] Add `robots.txt`: allow all, sitemap reference
- [x] Add `sitemap.xml` (static): `/`, `/login`, `/signup`, `/leaderboard`
- [x] Per-route `<title>` updates via `useDocumentTitle` hook (all 7 pages)
- [x] Google Fonts preconnect links maintained

### Estimated effort: 1 day ✅ Completed

---

## 5. Polish & Launch Readiness ✅

### UI Polish
- [x] Loading states: `PageLoader` component with animated spinner, used as `Suspense` fallback
- [x] Error boundaries: `ErrorBoundary` component wrapping all routes with styled fallback (error icon, message, Refresh/Go Back buttons)
- [x] Empty states: already handled across all pages (leaderboard, attempts, stats)
- [x] Smooth page transitions: `animate-slide-up` CSS animation on AppShell outlet
- [x] Focus management: `focus-visible` rings globally; auto-focus on typing inputs
- [x] Consistent hover/active states: verified across all interactive elements
- [x] Custom scrollbar styling (thin, matching theme)
- [x] Selection color matching brand accent

### Performance
- [x] Code-split routes with `React.lazy()` + `Suspense` (all 10 page components lazy-loaded)
- [x] SVG icons inline (no icon library dependencies to tree-shake)
- [x] Profile images use avatar URL (external, no local images to lazy-load)

### Accessibility
- [x] All buttons/links have accessible names (text labels or aria-label)
- [x] Keyboard navigation: `focus-visible` rings globally via CSS
- [x] ARIA labels on icon-only buttons (hamburger menu, refresh button)
- [x] `noscript` fallback in index.html

### Additional Polish
- [x] Styled 404 Not Found page with Go Home / Go Back buttons
- [x] `useDocumentTitle` hook on all 8 pages (including Admin)
- [x] `RedirectTo` component returns null instead of visible "Redirecting..." text
- [x] Smooth scroll behavior globally via CSS

### Estimated effort: 2 days ✅ Completed

---

## 6. Marketing Strategy

### Assets to Prepare
- [ ] **Demo video** (30–60s): screen recording of a race from start to finish, showing WPM counter, results, leaderboard. Add light editing, music, captions.
- [ ] **Screenshots**: 4–5 polished screenshots of key screens (dashboard, race in progress, results, leaderboard, multiplayer)
- [ ] **GIF**: quick 5–10s loop of the typing experience for Twitter/Reddit embeds
- [ ] **Copy**: one-liner, elevator pitch (2 sentences), full description (1 paragraph)

### Launch Channels

**Twitter/X**
- [ ] Thread: "I built a competitive typing game from scratch. Here's the stack, the journey, and what I learned." (dev story angle)
- [ ] Include demo GIF + link
- [ ] Tag relevant accounts: typing community, indie hackers

**Reddit**
- [ ] r/webdev — "Show off Saturday" post with stack details + screenshots
- [ ] r/reactjs — if architecture is interesting enough
- [ ] r/SideProject — launch post with background story
- [ ] r/typing — direct community reach, share link + ask for feedback

**LinkedIn**
- [ ] "Project showcase" post targeting developer network
- [ ] Focus on technical achievements: real-time multiplayer, anti-cheat, ranked matchmaking

**Dev.to / Hashnode**
- [ ] Technical blog post: "Building a real-time multiplayer typing game with React, Socket.IO, and MongoDB"
- [ ] Cover architecture decisions, anti-cheat system, Elo ranking

**Product Hunt** (optional, if traction is promising)
- [ ] Prepare PH listing: tagline, description, screenshots, first comment
- [ ] Schedule launch on a Tuesday/Wednesday for best visibility

### Post-Launch
- [ ] Monitor feedback, fix reported bugs within 24h
- [ ] Respond to all comments/questions across channels
- [ ] Track metrics: signups, daily active races, retention
- [ ] Plan Week 2 features based on feedback (e.g., themes, more languages, practice mode)

### Estimated effort: 1–2 days (content creation) + ongoing

---

## Priority Order & Timeline

| Day | Focus | Items |
|-----|-------|-------|
| **Day 1** | OAuth backend + user model changes | 1a |
| **Day 2** | OAuth frontend + auth page redesign | 1b |
| **Day 3** | Landing page design + implementation | 2a, 2b |
| **Day 4** | Responsiveness audit + SEO meta | 3, 4 |
| **Day 5** | Polish, favicons, OG image, performance | 4a, 4b, 5 |
| **Day 6** | Final testing, deploy to production | 5 (infra) |
| **Day 7** | Marketing assets + launch posts | 6 |

---

*Total estimated effort: ~7 working days for a polished, launch-ready product.*
