# StudyOS — Quality Assurance & Verification Report

**Verification Date:** 21 October 2026  
**Environment:** Windows, Node v24.14.0, Next.js 15.5.28, Vitest 2.1.9, Playwright/Chromium Headless  
**App URL:** `http://localhost:3000`  
**Timezone Verified:** Asia/Kolkata (`Asia/Kolkata`)  

---

## 1. Executive Summary

StudyOS has been implemented as a production-quality, responsive web application adhering to the specification in `StudyOS_Implementation_Plan.md`.
- **Design:** Strict monochrome, minimal black-and-white editorial aesthetic (no gradients, no neon cards, no fake streaks or synthetic progress).
- **Correctness:** Deterministic adaptive scheduling engine with 25–120 min chunking, 180 min atomic mock slots, and hard calendar locks.
- **Workload Math:** Distinguishes 239.0h quoted video runtime from 413.5h effective elapsed effort (1.5x–2.0x multipliers without dividing by playback speed).
- **Calendar & Attendance:** Derives 19 actual January working days (excluding weekends and Jan 26 public holiday).
- **Persistence:** 16 normalized relational tables with Row Level Security (RLS) in `supabase/migrations/20261021000000_init_studyos_schema.sql` plus an integrated local persistence storage engine.
- **AI Integration:** Server-only proxy for Google Gemini (`gemini-3.8-flash`) with structured Zod schema validation and proposal-only execution (zero direct database mutation without user confirmation).

---

## 2. Automated Test Results

### Summary: 4 Test Suites, 26 Passed, 0 Failed (100% Pass Rate)

| Test File | Category | Tests | Status |
|-----------|----------|:-----:|:------:|
| `tests/unit/workload_and_dates.test.ts` | Unit: Workload multipliers & IST date math | 7/7 | PASSED |
| `tests/unit/calendar_and_locks.test.ts` | Unit: Academic locks & Jan attendance grid | 6/6 | PASSED |
| `tests/unit/scheduler_and_feasibility.test.ts` | Unit: Deterministic scheduler & capacity forecasting | 7/7 | PASSED |
| `tests/integration/repository_and_storage.test.ts` | Integration: Persistence, timer & multi-user RLS | 6/6 | PASSED |
| **Total** | **All Invariants Verified** | **26/26** | **PASSED** |

### Verified Domain Invariants:
1. **Workload Multipliers:** `calculateSelectedWorkload` asserts 239 source runtime hours maps to 413.5 effective elapsed hours.
2. **Alternative DBMS Handling:** Selecting the 92h full course variant recalculates total workload to 296h runtime / 499h effective effort, and flags warnings if both variants are active.
3. **IST Date Arithmetic:** Local calendar days (`YYYY-MM-DD`) strictly preserved; midnight IST transitions handled without UTC day shifts.
4. **Calendar Hard Locks:**
   - ESE Window (16–27 Nov 2026): GATE tasks strictly banned (`GATE = 0 min`).
   - Aptitude Lock: Banned before 1 Dec 2026.
   - Project Freeze: Banned after 28 Oct 2026.
   - LAEP Presentation (21–22 Oct) and Practicals (26–27 Oct): Heavy 180m mocks banned.
5. **January Attendance Grid:** Derives 19 institutional working days between 11 Jan and 5 Feb 2027 (skipping weekends and Republic Day 26 Jan).
6. **Deterministic Scheduling:** Identical inputs yield byte-identical normalized assignment outputs across repeated executions (no duplicate task chunks).
7. **Net Capacity Invariant:** Assigned minutes never exceed net available minutes (`available - 15% buffer`).
8. **Uninterrupted 180m Mocks:** Mocks are allocated as atomic 180m blocks and never placed on days with <180m capacity.
9. **Honest Infeasibility & Residual Backlog:** Overloaded demand generates explicit unscheduled backlog entries with mathematical deficit hours.
10. **Singleton Active Session Timer:** Enforces single active session across tabs and strictly deducts paused duration from actual study time.

---

## 3. Browser E2E Verification Results

Visual and interactive validation was conducted using the headless browser subagent at `http://localhost:3000`:

| View / Flow | Viewport | Verified Behaviors | Result |
|-------------|:--------:|---------------------|:------:|
| **Today Dashboard** | 1280x800 | Exam countdown (108 days), net capacity (3.4h/4.0h), 0/12 core mocks, status: On Track, priority tasks. | PASSED |
| **Session Timer** | 1280x800 | Top bar timer starts, increments, pauses, resumes, and ends with task completion reconciliation. | PASSED |
| **Plan (Day & Week)** | 1280x800 | Day/week view toggle, capacity progress bar, quick-add task, pin task, split task. | PASSED |
| **Replanning Modal** | 1280x800 | "Replan Schedule" preview diff, residual backlog display, confirm & persist to storage. | PASSED |
| **Subjects Tracker** | 1280x800 | Quoted runtime 239h vs effective 413.5h, DBMS crash vs full course selector, 5 ESE subjects with marks. | PASSED |
| **PYQ Tracker** | 1280x800 | Distinct questions vs total attempts, embedded vs independent attempts, attempt logging. | PASSED |
| **Mock Score Analytics** | 1280x800 | 12 core + 3 stretch mocks, historical baseline (2026 DA 21/100) card strictly separated. | PASSED |
| **Review & Retention** | 1280x800 | Error notebook, 1/3/7/14/30 day spaced repetition review buttons (Pass/Fail), on-demand weekly report. | PASSED |
| **January Attendance** | 1280x800 | 19 working days grid, Republic Day 26 Jan holiday, weekend closure, interactive college/off-college toggle. | PASSED |
| **Settings & Backup** | 1280x800 | JSON backup export, Tasks/Mocks/Sessions CSV exports, dry-run import validator, Gemini API proxy. | PASSED |
| **Mobile Responsiveness** | 390x844 | Clean single-column layout, zero horizontal overflow, hamburger drawer navigation opens and closes. | PASSED |

---

## 4. Live API & Cloud Endpoints Verification Suite

All 9 live integration endpoints were verified against running server (`http://localhost:3000`) and remote Supabase Cloud:

| Endpoint / Integration | Method / Source | Status | Verified Behavior |
|------------------------|:---------------:|:------:|-------------------|
| **Supabase Cloud Connection** | Admin Client | **PASS** | `profiles` & `study_tasks` tables connected and operational |
| **Gemini API Live Generation** | HTTPS (Google) | **PASS** | `gemini-3.8-flash` tested; auto-fallback to `gemini-3.5-flash-lite` verified |
| **GET /api/state** | HTTP GET | **PASS** | Returns initialized 2026-10-21 state with profile, tasks, courses, and feasibility |
| **POST /api/scheduler** | HTTP POST | **PASS** | Generated 251 deterministic chunk assignments; plan version committed |
| **POST /api/tasks** | HTTP POST | **PASS** | Created new study task with automatic Supabase sync |
| **POST /api/sessions** | HTTP POST | **PASS** | Singleton active timer started and ended cleanly |
| **POST /api/mocks** | HTTP POST | **PASS** | Recorded mock score with negative marking math and Supabase sync |
| **POST /api/gemini** | HTTP POST | **PASS** | Live AI analysis returned valid schema with recommendations |
| **GET /api/export** | HTTP GET | **PASS** | JSON backup (12 tasks) and CSV export (14 lines) generated |

---

## 5. Production Build Verification

```
> npm run build
✓ Compiled successfully in 4.5s
✓ Linting and checking validity of types
✓ Generating static pages (15/15)
✓ Finalizing page optimization
Exit Code: 0
```
- First load JS: 103 kB shared
- All 15 routes generated and operational (Dynamic API routes + Static shell).

---

## 5. Disclosed Limitations & External Confirmations

1. **Tentative ESE Exam Dates:** 16–27 Nov is modeled tentatively with GATE=0 minutes. Once institutional dates for individual papers are released, exact days can be configured via calendar overrides.
2. **Provisional GATE DA Date:** Set to 6 Feb 2027 until official paper slot announcements.
3. **SmartSight Deadline Conflict:** Department requested 30 Oct, whereas project work is frozen after 28 Oct. A submission-only reminder is permitted on 29–30 Oct with no development work.
4. **Gemini API Key:** If `GEMINI_API_KEY` is not set in environment, the assistant gracefully falls back to a deterministic local rule-based heuristic engine with zero runtime errors.
