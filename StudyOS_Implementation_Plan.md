# StudyOS — Final Implementation Plan

**Status:** Build-ready engineering specification  
**Audience:** Antigravity IDE autonomous engineering agent  
**Product:** Single-user, desktop-first, responsive, minimal study planning web application  
**Planning timezone:** Asia/Kolkata (`Asia/Kolkata`)  
**Planning range:** 21 October 2026–31 January 2027 (must support arbitrary dates thereafter)  
**Priority:** Correctness, reliability, and deterministic scheduling > feature count > aesthetics  
**No synthetic success metrics, simulated completion, invented schedules, or decorative dashboards.**

## 0. Instructions to the engineering agent (non-negotiable)

1. Implement the product rather than a static visual mockup. Every visible button, input, chart, calendar action, export, and settings control must work. Disabled or unimplemented capabilities must be omitted or explicitly labeled unavailable.
2. Never fabricate lesson metadata, PYQ completions, scores, AI conclusions, lecture URLs, attendance records, or academic calendar information. Seed only the facts explicitly documented here. Unspecified values are `unknown` or user-editable.
3. **The adaptive scheduler and feasibility forecast are the core product.** Build, test, and validate these before adding an AI chatbot or visual polish.
4. The scheduler is deterministic, explainable, reversible and idempotent; the LLM must not write schedules directly or change persisted study plans without explicit confirmation.
5. Deliver incremental, working vertical slices; run lint/typecheck/tests/build after each slice. Inspect the actual running site on desktop and narrow mobile widths. Fix defects; never mark a feature complete solely because a component exists.
6. Use real persistence (Supabase Postgres) with robust row-level security; no indefinite dependence on in-memory state or `localStorage` for canonical data. Offer a local demo mode only if visibly labeled and never mix it with authenticated data.
7. Keep the interface **strictly black-and-white**, editorial, understated, focused, highly interactive, and fast. Do not mimic fashionable AI-generated dashboard templates.
8. Preserve user-created history during rescheduling. No silent deletion, hidden deadline changes, or rewriting of completed sessions.
9. Keep code modular and typed. Avoid a monolithic page, excessive abstractions, speculative microservices, and unnecessary dependencies.
10. Implement a reproducible test suite and supply a final verification report (what was tested, passed, and still limited). Never claim zero bugs or production assurance without evidence.

## 1. User profile and constraints

### Academic goals
- GATE DA 2027 target: **80+ raw marks /100**, aspirational AIR <100; long-term goal M.Tech at IIT Bombay. Admission/category/stipend eligibility are external facts, **not guaranteed by a score** and not to be predicted or represented as assured.
- Baseline: user attempted GATE DA 2026 with ~two weeks of preparation and scored **21/100** (historical self-reported baseline; **not** a current mock).
- AI and ML: previous crash-course lectures completed with some PYQs. Must be listed as `lectures_done`, not `mastered`; 2026 PYQs and revised 2027 syllabus coverage remain to be checked.
- Weak subjects: **Probability & Statistics (especially PnC)** and **DBMS**. Neutral: rest. Prior knowledge: Linear Algebra, Python, DWM, Calculus, ML and AI.
- Videos are question-heavy (~20% theory / ~80% questions, including PYQs); avoid mechanically scheduling duplicate practice hours for questions actually attempted during lectures. Record embedded attempts and independently attempted PYQs separately.
- Target full-length mocks: **12 core**, optional **3 stretch**, configurable.
- General Aptitude study starts **December 2026**, not before; no aptitude tasks in October/November.

### Calendar and availability
- **21–22 Oct:** LAEP presentation focus (presentation 22 October). Avoid adding late scope that jeopardizes it.
- **26–27 Oct:** Practical exams.
- **By 28 Oct:** Project work is frozen for LAEP and SmartSight. No project tasks dated **after 28 Oct**, unless user explicitly overrides lock. Note SmartSight was previously requested by department by 30 Oct: surface this **deadline conflict** prominently; do **not** silently rewrite either date. User's new preference is to cease project work after 28 Oct; allow a submission-only reminder on 29–30 Oct if approved, with no development work.
- **16–27 Nov (tentative):** End-sem examinations, exclusively ESE studying; **GATE=0 minutes** by user instruction. Exact individual exam days are not known and must remain configurable.
- **28 Oct–15 Nov:** Work backwards from ESE topics and GATE available hours; follow any project freeze rules.
- **28 Nov–10 Jan:** Holiday mode, around **7–8 focused study hours/day** as planning target; configurable, not promised actual performance.
- **11 Jan 2027 onward (assumed):** College resumes. Approx. 18 institutional working days between 11 Jan and 6 Feb, user expects to attend roughly 9 alternating days (not verified). Do not hard-code 9 without a date-grid review.
- **College day:** Wake ~07:00, approximately 2 hours one-way commute; home ~18:00; only realistic light evening work (provisional **1.5–2 focused hours**). Commuting is **not** automatically counted as focused study. Enable optional audio/flashcard learning during commute only if the user opts in.
- **Non-college weekday:** provisional **7.5 focused hours**, including any approved leave days. **Weekend/holiday:** provisional **7.5 hours**; adjustable.
- **26 Jan:** user's one January public holiday. All other January holidays are only weekends unless calendar data/user confirms. Weekend is not a college working day.
- **Attendance:** User may attend alternating college days in January. Treat this as a planning assumption, not an attendance approval. Show required attendance inputs and potential compliance risks; **never recommend violating compulsory attendance rules**. Track actual vs planned attendance separately.
- **Examination date:** Use **6 Feb 2027 as a conservative provisional deadline** until the DA paper/session is confirmed. GATE 2027 test days span 6–7, 13–14 and 20–21 February; make this editable.
- Date handling uses India local **calendar days**, not UTC-day truncation.

### End-sem subjects and marks
| Subject | IA /20 | Semester exam /80 needed for total 80/100 |
|---|---:|---:|
| Disaster Management (DMM) | 19 | 61 |
| Deep Learning | 14 | 66 |
| Big Data Analytics | 15 | 65 |
| Natural Language Processing | 18 | 62 |
| Game Theory | 17 | 63 |

The thresholds are arithmetic goals, **not confirmed institutional grade boundaries**. User considers DMM easiest, Game Theory confusing, BDA new, NLP easier, DL familiar. For ESE phase weight Game Theory and BDA higher. Use configurable safety margins and user-entered exam dates.

## 2. Lecture workload and **realistic time multipliers**

**Essential distinction:** Quoted lecture hours are **source video runtimes**. User takes longer in real life even at 2× playback because of note-taking/problem-solving. Model the actual real elapsed effort from their personally observed multiplier; do NOT divide the multiplier by playback speed again.

| Subject | Lectures | Source runtime h | Multiplier (effective real time) | Estimated elapsed h |
|---|---:|---:|---:|---:|
| Linear Algebra | 16 | 35 | **2.0×** | **70** |
| Probability & Statistics | 17 | 43 | **2.0×** | **86** |
| Calculus | 16 | 32 | **2.0×** | **64** |
| Python + DSA | 19 | 32 | **1.5×** | **48** |
| Algorithms | 17 | 36 | **1.5×** | **54** |
| Data Warehousing & Mining | 8 | 11 | **1.5×** | **16.5** |
| DBMS crash course | **unknown** | **35 provisional** | **1.5×** | **52.5** |
| General Aptitude marathons | unknown | 15 | **1.5×** | **22.5** |
| **Total provisional** | | **239** | | **413.5 hours** |

- This is the **full-coverage upper-bound plan** from quoted videos, **before any saved time due to prior knowledge**; do not optimistically subtract study time until an actual diagnostic, topic skip, or assessment justifies it.
- The original full DBMS playlist is **26 lectures /92 hours**, leading to **138 effective hours** at 1.5×. User prefers a **~35-hour crash course**. Keep both alternatives as source options, but **do not schedule both**. New crash course lecture count/URLs are unknown; allow manual import/edit. If course not selected, display **provisional estimate**.
- Total *original full-course* runtime = 296 hours; effective original workload = **499 hours** (413.5 + [138−52.5]). Make these distinctions clear on forecasts.
- A video may be skipped only explicitly, labeled `skipped_assessed` or `skipped_unassessed`; lecture hours then excluded from outstanding video workload, but subject mastery is not automatically set to complete.
- If topics from the **revised official 2027 syllabus** are missing from a playlist, add standalone topic tasks and coverage gaps. Do not infer complete GATE coverage from playlists.
- If actual study-session time differs from initial multipliers, forecast remaining effort using a calibrated median of recent comparable sessions, with smoothing/outlier controls and user override. Never overwrite user-set baselines without consent.

## 3. Critical feasibility requirement

**Show the hard constraint mathematically; don't promise it is feasible.** Even the optimized **413.5 hours** of lecture work alone compete with ESE-exclusive period, project deadlines, and January college days; mocks/review/independent practice add time. The planner must present clear required hours/day, overload, and alternative scenarios.

### Capacity model
For each local calendar date `d`, determine:
- `mode`: project, ESE prep, ESE-only, GATE holiday, GATE college day, GATE off-college day, rest, or user override.
- `available_minutes(d)`: user-adjustable *focused* minutes, constrained by mode, commitments and scheduled events. Base: holiday 450, college 90–120 configurable, exam days GATE 0, rest day 0 (unless override).
- `buffer_minutes(d)`: default 10–15% of daily capacity; planned tasks must fit **net** time (`available - buffer`).
- `locks`: ban GATE during 16–27 Nov; ban aptitude before 1 Dec; ban project work after 28 Oct; exam/session preparation windows; protect mock + analysis blocks when feasible.
- Holidays and weekends take precedence over normal weekday college capacities; a *user-confirmed college attendance event* may override a holiday/weekend only if explicitly entered.

### Demand model
Sum each incomplete *remaining* task's estimated minutes (video, notes, embedded problems, independent PYQ, mock, analysis, ESE, revision). No double-counting: if PYQs were solved in a lecture, the lecture session logs those `embedded_attempts` and its time already includes them; add separate practice only as independently assigned and estimated tasks.

**Feasibility outputs**:
- `remaining_work_minutes` and `remaining_capacity_minutes` (by date/phase and overall).
- `surplus_or_deficit_minutes = capacity − work`.
- `required_average_hours_per_available_day`, weighting college/off-college hours honestly.
- `minimum_achievable_completion_date` under current capacity (if one exists before deadline).
- `on_track`, `at_risk`, `infeasible` status with explicit numeric reasons.
- Best-case/base/worst-case scenarios from adjustable completion multipliers and missed-day assumptions; clearly labeled as models, not predictions.
- Projected first-pass syllabus completion, remaining practice/revision hours, and count of mocks plausibly achievable.
- Actionable options: switch course, skip lecture **after diagnostic**, reduce optional mock quantity, reallocate low-impact tasks, increase study capacity *within user-approved bounds*, move soft goals. **Never increase hours silently or move hard deadlines**.
- Distinguish optimistic (video-only) from full plan estimates. Charts must not imply an 80+ score prediction.

### Replanning engine: required algorithm
1. Load user profile, current local date, hard locks, calendar events, plan version, completed/pinned tasks, course metadata, past sessions and baseline capacities.
2. Materialize only **uncompleted and unpinned** planning work; preserve historical completed/skipped session records and manual pinned tasks.
3. Compute available capacity **per day**, subtract fixed events and buffers, and calculate demand. Flag conflicts before placement.
4. Order by hard eligibility constraints, dependencies, urgency, subject weakness, user priority, recency of revision and remaining deadline slack. Use deterministic tie-breakers (stable task ID/date), not randomized sorting.
5. Split tasks into realistic **25–120 min chunks** where possible; do not split 3h full-length mocks. Place chunks without exceeding net daily capacity; track prerequisites and continuous-session constraints.
6. Schedule fixed full-length mocks as **180-minute uninterrupted** sessions; reserve realistic review time separately. Do not schedule 180-minute mocks on days with <180 usable minutes or user-declared conflicts.
7. During ESE-only lock, allocate exclusively ESE. During project lock, no project development. Aptitude not before December.
8. If all work does not fit, leave residual tasks explicitly **unscheduled with reason**, never drop them or stack work beyond capacity.
9. Produce a `plan_preview` with diff, explanations, conflict warnings and the resulting feasibility status. Require user confirmation for broad reshuffles, deadline/setting changes, or nontrivial drops. Single-task rollover may follow user-set auto-rollover preference.
10. Persist atomically with optimistic concurrency/version check; retain a revision snapshot so users can undo. Replanning the same state twice must produce the same schedule and **not duplicate assignments**.
11. When the current date passes, do not move yesterday's planned tasks silently; mark them `overdue` or `deferred` per explicit preference, and schedule new remaining work starting today.
12. Prefer whole-day local date arithmetic (`YYYY-MM-DD`, timezone-aware timestamps for study sessions) to avoid DST/UTC off-by-one bugs.

**Explainability:** Each scheduled task should have a concise `why` description (e.g. weak DBMS topic, 7 days before mock, prerequisite completed) and an `estimated vs actual` value.

## 4. Features and acceptance criteria

### 4.1 Dashboard and countdowns
- Today's mode, max realistic hours, three highest priority tasks, due items, current mock target, GATE date countdown, weekly capacity vs demand, and one clear warning if overloaded.
- No filler metrics, arbitrary streak shame, fake graphs, or 8 simultaneous progress cards.
- Show `not yet assessed` for missing baseline rather than zero accuracy.
- Dashboard actions navigate to working destinations.

### 4.2 Daily planner
- Date navigation and date picker; tasks grouped into sensible contiguous blocks, not rigid 07:00–24:00 schedule.
- Task states: todo, doing, done, deferred, canceled; distinguish scheduled vs actual minutes. Optional session timer.
- Support quick-add, edit, delete with confirmation, reschedule, pin/unpin, split, notes, keyboard shortcuts, and bulk complete/defer only with confirmation.
- If task completion happens offline/during slow network, prevent duplicated writes and reconcile properly; show saving/failed state.
- Date-specific available hours can be overridden with a reason; don't rewrite global defaults.

### 4.3 Weekly planner
- Monday–Sunday week in IST; show used/available minutes each day, per-subject work allocation, protected mocks and lock days.
- Drag/drop tasks only when destination allows capacity, prerequisites and lock rules; otherwise show why blocked and offer explicit override only for soft constraints.
- Weekly review: completed tasks, actual hours, backlog, forecast drift, strongest/weakest topics and next-week recommendations.

### 4.4 Subject / lecture tracker
- Subject > syllabus topic > playlist/lecture > tasks; URLs, runtimes, runtime source (entered/imported), effective-time multiplier, chapter association.
- Playlist import must handle missing/hidden/deleted videos and YouTube quota/API failure gracefully; manual entry always possible. **Do not assume YouTube metadata extraction is available without credentials.**
- Track watched/partial/skipped status, time spent, notes, embedded question attempts, independent PYQs and mastery as separate dimensions.
- Version syllabus coverage against official 2027 DA topics; alert unknown/out-of-syllabus playlist coverage.

### 4.5 Topic-wise PYQ tracker
- Exam year, subject/topic, question reference/source URL, marks (if known), correct/incorrect/skipped, time taken, confidence, whether embedded in lecture, error code and notes.
- Prevent double counting attempts on the same item. Multiple attempts allowed with timestamps; unique attempt IDs.
- Track **distinct question coverage** separately from **total attempts**; use explicit question IDs or user-generated stable IDs.

### 4.6 Mock score analytics
- 12 mandatory + 3 stretch mock targets, configurable dates; mock source/year, 3h attempt, separate analysis block.
- Record raw score, max marks, subject distribution, right/wrong/skipped, negative marks and optional time segmentation. Validate arithmetic and bounds; allow partial ungraded section data.
- Preserve actual user-provided history (2026 DA 21 marks) separate from current 2027 preparation mocks.
- Time series, rolling last-three average, weak topics; no fabricated trend datapoints.
- Avoid falsely predicting AIR, admissions or stipend from an uncalibrated score model.

### 4.7 Error notebook and spaced revision
- Error item: topic, source, error category (conceptual/calculation/misread/time/guess), correction, revisit due date, status.
- Interval schedule can start with 1/3/7/14/30 days and adapt to recall performance; user-configurable. Do not claim a scientifically validated mastery probability unless model is calibrated.
- The scheduler reserves capacity for due revision, and alerts when backlog is infeasible.

### 4.8 Study sessions
- Start/pause/resume/end timer; log actual minutes (server reconciled), optional manual log and audit metadata.
- Prevent concurrent timers across tabs/devices via server-side active-session guard; handle crash/reload and cross-tab sync.
- Never count paused intervals as study time. Let user correct errors with visible change history.
- Actual time contributes to pace calibration and forecasting, not to automatic mastery.

### 4.9 Attendance-aware January planner
- January 11 tentative restart, weekdays auto-derived from calendar; college days chosen by user individually or alternating-day proposal **previewed and approved**.
- Public holiday only Jan 26 (plus weekends), unless user adds additional holidays.
- Planned attendance vs actually attended; 2h outbound + 2h return commute; ~18:00 home time. Default evening study capacity editable and intentionally modest.
- Input institution's attendance threshold, classes held, classes attended and recognized exemptions. Compute projected percentage **only with complete denominators**; otherwise show insufficient data. Warn if planned leave may breach rules. Never encourage fraudulent or unauthorized attendance recording.
- Switching a day from college to off-college automatically updates capacity via preview; do not silently create study time if leave isn't approved.

### 4.10 Export/backup and weekly review
- JSON export with schema version and related records; CSV for sessions, lectures, tasks and mocks. Import supports dry-run validation, conflict detection and user confirmation.
- Date/number formats stable; backup must not export API secrets. Consider encrypted/host-managed automated DB backups depending on the Supabase plan.
- Weekly summary saved as dated snapshot with clear derived metrics, missing-data warnings and next actions; generated on demand, not dependent on an always-on cron.

### 4.11 AI study assistant
- Gemini API via **server-only** proxy, configurable model ID and key. Never expose the key to the client, logs, telemetry, exports or prompts; enforce server authorization and abuse protections.
- As of 21 Oct 2026, Google documentation indicates `gemini-3.7-flash` has been superseded by `gemini-3.8-flash` in the Gemini API and may auto-route. **Do not hardcode 3.7**; validate the provided key/model against Google's current model listing and let user select a supported model. Relevant docs: https://ai.google.dev/gemini-api/docs/models/gemini-3.7-flash .
- AI may summarize actual trend data, explain why the schedule is overloaded, propose adjusted priorities and help study topics. All metrics must be fetched from validated structured database reads rather than fabricated in prompts.
- Use structured schema-validated output for suggestions and parameter changes. `propose -> compare diff -> user confirms -> deterministic scheduler applies`. AI cannot directly mark work complete, delete records or override hard locks.
- Handle 401 invalid key, 403, 429 quotas, 5xx, timeout, malformed model output and moderation refusal with graceful fallbacks. The planner must remain fully functional without Gemini.
- Provide clear 'AI suggestions may be wrong' labeling and no unverified marks, admissions, or percentile claims.

## 5. Interface / design contract: **premium monochrome**

### Direction
A tool for serious daily study, visually closer to **Linear / a well-designed editorial productivity app** than a gamified habit tracker. Strict monochrome, no beige, sage, terracotta, neon, colored gradients, motivational quotes, glassmorphism, AI-generated decorative illustrations, mascot, animated gauges, or oversized dashboards.

### Tokens
- Light: background `#FFFFFF`, secondary `#FAFAFA`, primary text `#101010`, secondary text `#666666`, borders `#E7E7E7`, strong black `#111111`.
- Dark (optional, if complete): background `#0B0B0B`, panels `#141414`, primary text `#F5F5F5`, muted text `#A3A3A3`, borders `#292929`.
- Status can use text/icons/patterns rather than colors. If accessibility requires semantic color, use it sparingly only for error/success and never as decorative branding.
- Typography: Inter or Geist, restrained 13–15px body; 20–26px page titles; tabular numerals for hours/scores; strong hierarchy without huge headings.
- Grid: max content ~1180px, compact sidebar 220–240px desktop, collapsible; comfortable 16–24px spacing, hairline dividers, minimal shadows or none.
- No fake 3D effects. Smooth <=200ms transitions; respect `prefers-reduced-motion`.
- Keyboard-accessible command palette/search (optional phase 2), intuitive hover/focus, tooltips only where necessary.
- Charts: grayscale, legible patterns, labels and tooltips; line/dot marks with real data only. Zero charts on an empty account until useful information exists.

### Main information architecture
- **Today** (default): today's priorities, actual time remaining, next exam, simple tasks.
- **Plan**: day/week switch, calendar, backlog, drag/drop or accessible move controls, capacity bars and warnings.
- **Subjects**: syllabus coverage, lectures, PYQs, topic proficiency.
- **Mocks**: tests, analytics, mistakes.
- **Review**: revision queue, error notebook, weekly summary.
- **Settings**: calendar, study capacity, subject import, permissions, Gemini, backup.
- Projects/ESE appear as modes/tasks inside Plan, not permanent unused sidebar modules after October/November.

### UX standards
- Desktop at 1440/1280/1024 widths and mobile 390/360; never horizontal-scroll the whole page.
- Accessibility: WCAG AA contrast; visible focus; labels for icon-only actions, semantic headings, ARIA for dialog/progress, screen reader announcements for save/error, touch targets >=44px where possible.
- Loading: skeletons only where useful, no layout shift; responsive optimistic task action with rollback/error, not false success.
- Empty states concise and actionable (`Add your first subject`, `No mocks yet`).
- Destructive actions require confirmation/undo. Clear feedback for offline, API errors and stale data.
- High interaction density without clutter: inline edits, context menus, date jump, filtering/search, multi-select and undo. Do not add inert toggles.

## 6. Tech stack and backend architecture

**Recommended:** Next.js App Router + TypeScript, Tailwind CSS, shadcn/ui primitives customized to monochrome, Supabase (Postgres/Auth/RLS), server-side TypeScript scheduler package, Zod validation, date-fns/tz-aware date library, lightweight charts, Vitest and Playwright. Vercel deployment. Avoid extra backend service unless required by measured workload. Use current stable versions compatible with each other and verify official docs before installing.

### Architectural boundaries
- `domain/`: typed tasks, capacities, deadlines, subjects, projections, pure scheduling and forecasting functions (no Supabase/React dependencies).
- `data/`: repository access, SQL migrations, transactions, authorization/tenant filters, schema validation.
- `api/`: authenticated mutations/queries, rate limiting, input/response validation, request IDs and error handling.
- `features/`: isolated planner, syllabus, sessions, mocks, revision, backup, AI views.
- `tests/`: unit, property-based, integration and browser tests, seeded fixtures.

### Database design (suggested normalized tables)
- `profiles`: user_id PK, timezone, exam_date/status, settings JSON version, created/updated.
- `calendar_events`: id, user_id, type, local_date/start/end, lock_level, details, tentative flag.
- `day_capacity_overrides`: user_id, local_date, minutes, reason, source, approval flag.
- `subjects`: id, user_id, name, code, priority, baseline_status, syllabus_version.
- `syllabus_topics`: id, subject_id, parent_id, official_topic_ref, status, prerequisite metadata.
- `playlists`: id, subject_id, label, source_url, status, selected boolean, runtime provenance.
- `lectures`: id, playlist_id, topic_id nullable, ordinal, url, runtime_seconds nullable, estimated_effective_seconds, status, note.
- `study_tasks`: id, user_id, type, subject/topic/lecture reference, total_remaining_minutes, due_local_date nullable, status, pinned, priority, source, created/updated.
- `schedule_assignments`: id, user_id, task_id, local_date, planned_minutes, plan_version, status; stable unique identities for generated task chunks.
- `study_sessions`: id, user_id, task_id, start_at, end_at, paused_seconds, actual_seconds, source, revision/version.
- `question_items` / `question_attempts`: stable item ref, metadata, distinct per-attempt results/time/error.
- `mock_tests` / `mock_sections`: user_id, date, paper ID, actual results and review time.
- `error_items` / `revision_items`: due dates, learning status, attempt history.
- `attendance_records`: planned, actual and institutional counts separately.
- `plan_versions` / `replan_events`: snapshot reference, algorithm version, inputs hash, diff, audit trail, confirmation.
- `ai_requests`: metadata/usage only, redact messages and keys unless explicit user consent and retention policy.

Use proper foreign keys/indexes on `(user_id, local_date)`, `(user_id, status)`, `(subject_id, topic_id)` and unique constraints to prevent duplicate generated chunks. Prefer immutable session event history and soft delete/tombstones where audit is required.

### Security and consistency
- Every user-owned table requires RLS, default deny, policies bound to `auth.uid()`. Nested foreign-key references must belong to the same user; enforce via composite keys, triggers or secure transaction functions where appropriate. Test direct REST/API unauthorized access.
- **Never use a Supabase service-role key in browser bundles**; use environment secrets on server. Minimize server privileges; parameterize SQL. No SQL built from raw Gemini output.
- Validate all writes with schemas: nonnegative minutes, valid state transitions, valid foreign IDs, realistic date/time bounds, scores within maximum, finite numbers. Reject NaN/Infinity and malformed date strings.
- Mutations: idempotency key and/or unique request identity, atomic transactions for plan commits, optimistic concurrency with version/revision. If conflict: refresh and prompt to reapply changes, not last-write-wins silently.
- Backup/export respects row ownership and excludes tokens/secrets. Implement structured error categories and non-sensitive server logs with request IDs.
- Input sanitization for user notes/URLs; safe rendering; CSP and secure cookie/session handling. API endpoint rate limiting and AI cost cap. Protect against prompt injection in external lecture notes or imported text.
- DB migrations are versioned and reversible where possible; transactional and tested on clean + existing data.
- If external service is unavailable, reading cached current plan may work, but any unsynced mutations must be visibly queued/erroring, never silently assumed saved.

## 7. Failure-mode / bug prevention matrix

| Failure mode | Required prevention / test |
|---|---|
| Old lecture estimate ignores note-taking multiplier | Store original and actual effective time separately; assert 239 video hours -> 413.5 effective hours with current choices. |
| Playback 2× divides time twice | Multiplier applies to **source runtime** directly; speed is informational or recalibrated only from real sessions. |
| Full DBMS and crash course both scheduled | Exactly one active course variant for same coverage; duplicate-coverage warning. |
| PYQs repeated in lecture count twice | Distinct embedded vs independent practice attempts and time accounting. |
| Planner loads tasks during ESE-only window | Hard exclusion unit/integration tests for every day 16–27 Nov. |
| Aptitude appears in November | Date-bound eligibility test; no aptitude before Dec 1. |
| Project work appears after 28 Oct | Hard lock; separate deadline discrepancy warning (30 Oct departmental request). |
| January Jan 26 treated as college | Holiday calendar and local-day precedence tests. |
| January alternating attendance falls on weekend | Only apply alternating proposal to eligible **working** days, not simple every-other-date rotation. |
| Unauthorized/unsupported college leave modeled as free time | Require user approval, mark assumption clearly and warn attendance compliance. |
| Commute incorrectly counted as focused hours | Available study minutes computed independently from commute event. |
| Study > 24h/day or negative remaining time | Server-side invariants, bounds, overlap checks, net capacity. |
| Overloaded days silently create task pileup | Keep explicit unscheduled backlog, display deficit and replan choices. |
| Replanner runs twice and duplicates assignments | Idempotent plan key/version, deterministic task chunk identity and uniqueness constraints. |
| Two tabs update plan simultaneously | Optimistic concurrency; conflict notice and safe retry. |
| Manual pinned task moved by replan | Pin lock invariants and snapshot comparison test. |
| Completed tasks become incomplete on replan | Immutable completion/session history and snapshot regression tests. |
| Deleted subject leaves orphan tasks | FK restrictions/cascades specified carefully, soft-delete or reassignment dialog. |
| Imported playlists have missing durations | Unknown duration state; manual input; do not forecast as zero. |
| Bad YouTube links/403/quota | Validate URLs, safe fetch, graceful metadata fallback. |
| Empty charts show fabricated zeros/trends | Render documented empty states; stats only from persisted user data. |
| Mock scores exceed 100 or arithmetic inconsistent | Server validation; explicitly reconcile sections/negative marks. |
| Historical 21/100 counted as new mock | Distinct `historical_baseline` type, exclude from current mock-completion count. |
| Timer duplicates across tabs, pause time counted | Active-session singleton, pause state, recovery logic and concurrency tests. |
| Midnight/UTC shifts tasks one day | IST local-date storage + timezone-aware timestamps; boundary tests at 00:00 IST. |
| Low internet or mutation timeout leads false saved state | Pending/failed indicators, optimistic rollback, request-id retry safety. |
| Import duplicates all user data | Dry run, schema/version checks, deduplication and explicit merge/replace preview. |
| RLS leakage between accounts | Two-user automated cross-account CRUD/foreign-key tests. |
| Gemini key leaks to browser/logs | Server-only secret, redact errors, static bundle scan, no unapproved export. |
| Gemini hallucinates scores or schedule commitments | Grounded typed reads, schema validation, proposal-only workflow. |
| Gemini unavailable/rate-limited | Core deterministic scheduler remains unaffected, clear fallback message. |
| AI-proposed time violates locks | Same domain rule validator as manual changes; reject and explain. |
| UI task checkbox appears done but server rejected | Revert optimistic state, show error and retry; cross-device reconciliation. |
| DnD mouse-only or mobile broken | Keyboard move actions and tested touch/click alternatives. |
| Inaccessible monochrome low contrast | WCAG AA checks, focus styles, labels and semantics. |
| Bad cache causes stale capacity preview | Invalidate only affected queries; version all forecasts with input hash. |
| Scheduling slow at scale | Benchmark at 100+ subjects, 5000 tasks, 365 dates; profile pure scheduler; avoid N+1 queries. |
| Forecast oscillates after every task edit | Stable tie-break, immutable preview, small-change scheduling preference and user-controlled commit. |
| Changes to exam date corrupt history | Recompute future assignments only, preserve past completions and audit. |
| Browser refresh loses input | Autosave drafts for nonsecret work with unsaved-changes indicators; canonical save in DB. |

## 8. Tests: mandatory automated coverage

### Unit tests (pure scheduling/forecasting)
- 239h runtime and 413.5h effective-time math; old DBMS option vs crash-course alternative; missing/zero duration validation.
- Allowed task categories for 21 Oct, 22 Oct, 26–27 Oct, 29 Oct, 16–27 Nov, 1 Dec, 11 Jan, weekend, 26 Jan, 31 Jan, and provisional exam day.
- College attendance plan with weekends and holidays; verify ~18 eligible workdays **only after deriving actual date/calendar**; never assert assumed count without deriving it.
- Determinism: same input -> byte-identical normalized output. Idempotency: repeated replan -> no new tasks.
- Capacity: sum assigned minutes <= net available day minutes; unfinished work remains in backlog; no task scheduled before prerequisites, after hard deadline unless labeled overdue, or inside a lock.
- Incremental update: completion/defer/revise duration/college-day override changes forecasts but does not change immutable history.
- Revisions and duplicate lecture/PYQ coverage guardrails.
- Date boundaries: start/end local dates; midnight IST; year transition; weekends and leap years in generalized code.
- Property-based tests: randomized tasks/dates, preserved invariants under replan, no negative minutes, no duplicate task chunks.

### Integration tests
- Auth session, RLS isolation with two users and cross-user IDs, and foreign key ownership enforcement.
- Plan preview vs confirmed commit and stale-plan conflict.
- End-to-end persist task -> log session -> complete -> replan -> check backup/export/import.
- Invalid mock import, invalid lecture URLs, missing data, duplicate requests, external API failures.
- Gemini service mocked with valid, malformed, malicious, rate-limited and timeout responses; no unvalidated writes.

### Browser end-to-end tests (Playwright)
- Onboarding (actual study baseline not assumed) -> first real daily plan -> mark completion -> verify persistence after refresh and new login.
- Week navigation, add/edit/defer/pin task, preview replan, approve/reject, undo, mock analytics entry, import/export.
- January calendar scenario: select 9 attendance dates, verify daily capacity and commute, then change a day and verify forecast update.
- Slow network/failed request error UI, empty states, mobile 360/390, desktop 1280/1440, keyboard-only use and automated accessibility checks.

### Performance/reliability targets (measure, don't guess)
- Typical authenticated dashboard initial load <2s on reasonable broadband after warmup where feasible; record actual measurements and environment.
- Normal plan preview <500ms for typical ~1000 chunks on local development hardware (adjust target based on measured profiling).
- No unhandled runtime exceptions or console errors in all core Playwright paths.
- Graceful failure for unavailable Supabase, YouTube and Gemini without loss of committed data.

## 9. Implementation sequence (vertical slices + quality gates)

### Slice A — Foundation, data model and calendar
Create project, design tokens, auth, migrations/RLS, IST date utilities, profile wizard, source-of-truth academic calendar. Seed only actual user facts from this document. Establish lint, formatter, TS strict mode, tests, E2E harness and CI checks. **Gate:** two-user RLS tests, initial DB migrations and responsive app shell pass.

### Slice B — Scheduler + feasibility core (**highest priority**)
Implement pure deterministic engine, time multipliers, locks, daily capacities, detailed forecast and explainable plan preview/diff. Add realistic test fixtures matching 2026–27 milestones. **Gate:** all invariants and scenario tests pass; see clear numeric deficit if all work cannot fit.

### Slice C — Real study tracking
Subject/lecture/topic management, daily + weekly planner, task edits, carry-forward, study session timer, persistence and schedule versioning. **Gate:** a task can be created, scheduled, performed, completed and reforecast with consistent state after refresh.

### Slice D — Readiness engine
PYQs, mocks, error notebook, spaced revision and weekly reports. **Gate:** readiness indicators are derived from *real logged attempts* and never fabricated.

### Slice E — Attendance and backup
January alternating-attendance proposal, holiday/weekend precedence, approval-aware capacity, projected attendance with missing-data warnings; JSON/CSV export and safe import. **Gate:** reassigning a college date correctly changes capacity, attendance warning and feasible plan.

### Slice F — Gemini assistant
Server-only Gemini client, configurable supported model, validated suggestions, rate limiting and proposal/confirmation mechanism. **Gate:** failure tests and lock validation pass; scheduler works identically if AI is disabled.

### Slice G — Refinement, accessibility, hardening
Real browser interactions, mobile layout, loading/empty/error states, accessibility, data-integrity profiling, security checks, visual regression screenshots and dead-code removal. **Gate:** tests/build pass; no inert controls or unsupported claims.

**Agent working rule:** At the end of each slice, update `IMPLEMENTATION_STATUS.md`: implemented modules, endpoints/migrations, tests passed, test commands, unresolved defects, next slice. Never report `done` without checking deployment/runtime paths.

## 10. Definition of Done

The application is done **only when**:
- All 15 selected features have real working implementations, or explicitly documented and clearly demarcated limitations agreed by user.
- Planner enforces every hard lock and January holiday/college capacity correctly; no tasks exceed daily net capacity without an explicit user-confirmed override.
- Actual video runtime (239h) and effective effort (413.5h) are distinguished everywhere; PYQs embedded in lectures aren't double-counted.
- Missed work moves through explainable previews; residual backlog/feasibility deficit never disappears.
- Completing/moving a task updates calendar, progress and forecast consistently, persists across sessions and is reversible/auditable.
- Mocks and marks are actual entered data; historical 21 score not misrepresented as recent progress.
- RLS tests pass; secrets are never exposed; the application operates without Gemini.
- Export can be imported back into a clean account with no silent corruption (validate round-trip in tests).
- All core routes are mobile-usable, keyboard-accessible and genuinely interactive.
- `typecheck`, `lint`, unit, integration, Playwright E2E and production build pass, and failed cases are documented and fixed or explicitly disclosed.
- Final screenshots show an austere, functional black-and-white interface—not a template full of decorative metric cards.

## 11. Engineering deliverables to hand back

1. Running local application and clear setup commands.
2. Versioned migrations, RLS policies, seed fixture for real constraints, and `.env.example` with **no secrets**.
3. Deterministic scheduler implementation + standalone test suite and documented invariants.
4. Forecast methodology with traceable assumptions and examples (including infeasible cases).
5. Fully implemented UI and browser verification screenshots at desktop and mobile sizes.
6. README: deployment instructions, configuration, external API setup and data backup procedure.
7. `IMPLEMENTATION_STATUS.md` and `QA_REPORT.md` with exact test results, limitations and remaining work.
8. A short explanation of which assumptions require confirmation (exact January attendance dates, exact ESE paper dates, final DA session, selected DBMS crash course, lecture-to-topic map and subject diagnostics).

## 12. Final instruction to Antigravity

**Do not optimize for a demo. Optimize for a reliable daily driver that accurately accounts for scarce study time.** Begin with the scheduling math and tests, proceed in vertical slices, continuously inspect the deployed/running experience, and fix defects before claiming completion. Prefer fewer reliable interactions over more half-implemented features. The final interface must feel intentional, quiet, precise, and premium—almost entirely black, white, and grayscale.

---

### References (verify changes during implementation)
- Official GATE 2027 syllabi: https://gate2027.iitm.ac.in/exam_papers_and_syllabus
- Official GATE 2027 key dates: https://gate2027.iitm.ac.in/important_dates
- Gemini model availability and deprecation: https://ai.google.dev/gemini-api/docs/models/gemini-3.7-flash
