# StudyOS

> Single-user, desktop-first, responsive, minimalist study planning web application for GATE DA 2027.

---

## Overview

StudyOS is an autonomous engineering-grade study planning system built according to `StudyOS_Implementation_Plan.md`. It rejects decorative dashboards, arbitrary streaks, and simulated scores in favor of deterministic scheduling algorithms, mathematical capacity forecasting, realistic note-taking multipliers, and strict monochrome aesthetics.

---

## Key System Characteristics

- **Strict Monochrome Design:** Pure editorial aesthetic using `#FFFFFF`, `#FAFAFA`, `#101010`, `#666666`, `#E7E7E7`, `#0B0B0B`. Tabular numerals for all metrics.
- **Realistic Time Multipliers:** Distinguishes 239.0 source video hours from 413.5 effective elapsed hours (1.5x–2.0x multipliers without dividing by playback speed).
- **DBMS Course Switcher:** Preferred ~35h crash course (52.5h effective) vs 92h full playlist (138h effective) with duplicate selection warnings.
- **Deterministic Adaptive Replanner:** 25–120 min chunking for regular study, atomic 180 min uninterrupted blocks for full-length mocks, and explainable why notes for every slot.
- **Academic Calendar & Hard Locks:**
  - 21–22 Oct: LAEP presentation focus (mocks locked).
  - 26–27 Oct: Practical examinations (mocks locked).
  - 28 Oct: Project work frozen.
  - 16–27 Nov: End-Sem Examinations (exclusively ESE; `GATE = 0 min`).
  - 28 Nov–10 Jan: Holiday Mode (450 min / 7.5h daily target).
  - 1 Dec: General Aptitude starts.
  - 11 Jan–5 Feb: College term with alternating attendance proposal (19 working days derived, Republic Day 26 Jan public holiday, 4h roundtrip commute deducted, 105m evening capacity).
- **Preserved Historical Baseline:** 2026 GATE DA attempt (21/100) strictly preserved separate from current 2027 preparation mocks.
- **Singleton Active Session Timer:** Prevents concurrent timers across tabs and deducts paused time accurately.
- **Error Notebook & Spaced Revision:** 1/3/7/14/30 day intervals with Pass/Fail reviews.
- **Server-Only Gemini Proxy:** Configurable `gemini-3.8-flash` assistant with structured Zod schema validation; proposal-only execution.
- **Full Relational Persistence:** 16 normalized tables with Row Level Security (RLS) in `supabase/migrations/20261021000000_init_studyos_schema.sql` plus integrated persistent local store.

---

## Setup & Running Locally

### 1. Prerequisites
- Node.js v18+ (tested on Node v24.14.0)
- npm v10+

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Copy `.env.example` to `.env.local` to configure optional cloud integrations:
```bash
cp .env.example .env.local
```
*(StudyOS runs out of the box in local offline mode without external credentials).*

### 4. Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Production Build & Run
```bash
npm run build
npm start
```

---

## Testing & Quality Gates

Run the test suite across unit, integration, and invariant tests:
```bash
# Run unit & integration tests (26/26 passing)
npm test

# Run TypeScript type check
npm run typecheck
```

---

## Architecture Boundaries

```
src/
├── domain/       # Pure TypeScript: deterministic scheduler, date math, locks, multipliers, forecasting
├── data/         # Storage layer, relational repository, JSON ACID persistence
├── app/          # Next.js App Router (pages and API route handlers)
│   ├── api/      # /api/state, /api/scheduler, /api/tasks, /api/sessions, /api/mocks, /api/export, /api/gemini
├── components/   # Monochromatic UI components and views
│   ├── layout/   # Shell with desktop sidebar, mobile drawer, active session timer
│   └── views/    # TodayView, PlanView, SubjectsView, PyqView, MocksView, ReviewView, AttendanceView, SettingsView
└── lib/          # Typed API client and utilities

supabase/
└── migrations/   # 20261021000000_init_studyos_schema.sql (16 normalized tables + RLS)
```

---

## Documentation

- `StudyOS_Implementation_Plan.md`: Primary specification
- `QA_REPORT.md`: Full verification report with automated test metrics and browser walkthrough details
- `IMPLEMENTATION_STATUS.md`: Phase-by-phase status tracker
