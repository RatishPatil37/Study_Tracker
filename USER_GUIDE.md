# StudyOS — Complete Operational User Guide

> **An engineering-grade, deterministic study operating system tailored for GATE Data Science & AI (DA) 2027.**

---

## Table of Contents
1. [Core Philosophy & Architecture](#1-core-philosophy--architecture)
2. [The Daily Operating Ritual ("Daily Loop")](#2-the-daily-operating-ritual-daily-loop)
3. [Top Header & Singleton Active Session Timer](#3-top-header--singleton-active-session-timer)
4. [Today Dashboard](#4-today-dashboard)
5. [Plan View (Daily & Weekly Adaptive Scheduler)](#5-plan-view-daily--weekly-adaptive-scheduler)
6. [Subjects & Workload Multipliers](#6-subjects--workload-multipliers)
7. [PYQ Tracker (Embedded vs. Independent Practice)](#7-pyq-tracker-embedded-vs-independent-practice)
8. [Mock Test Analytics & Score Engine](#8-mock-test-analytics--score-engine)
9. [Error Notebook & Spaced Revision System](#9-error-notebook--spaced-revision-system)
10. [January Institutional Attendance & Commute Planner](#10-january-institutional-attendance--commute-planner)
11. [AI Study Assistant (Gemini 3.8 / 3.5)](#11-ai-study-assistant-gemini-38--35)
12. [Backups, CSV Exports & Data Sovereignty](#12-backups-csv-exports--data-sovereignty)
13. [Mobile Power-User Tips](#13-mobile-power-user-tips)
14. [Keyboard Shortcuts & Quick Actions Reference](#14-keyboard-shortcuts--quick-actions-reference)

---

## 1. Core Philosophy & Architecture

StudyOS rejects traditional gamified study apps with decorative streaks, bloated neon cards, and artificial score predictions. Instead, it operates on four strict engineering principles:

1. **Realistic Time Multipliers, Not Playback Illusions:**  
   Watching a 1-hour lecture at 2x speed does not cut study time in half. Pausing, deriving proofs, re-watching difficult moments, and taking notes actually requires **1.5x to 2.0x** the raw lecture runtime. StudyOS calculates effort using **effective elapsed hours** (239h lecture runtime $\to$ 413.5h real effort).
2. **Deterministic, Explainable Scheduling:**  
   The planning engine never shuffles your tasks randomly. It uses a topological sorter and priority queues to allocate work in **25–120 minute chunks** with mandatory **10–15% daily buffers**, atomic 180-minute blocks for full-length mocks, and explicit "Why" notes explaining why each chunk is assigned to a specific date.
3. **Hard Calendar Locks:**  
   Key academic constraints (e.g. End-Sem Exam weeks where `GATE = 0m`, project freezes, presentation days, and the Jan 26 public holiday) cannot be bypassed by wishful thinking.
4. **Dual-Mode Persistence & Zero Data Loss:**  
   Your data is automatically persisted both locally (for offline use) and synchronized in the background to your cloud Supabase PostgreSQL database.

---

## 2. The Daily Operating Ritual ("Daily Loop")

To achieve maximum preparation efficiency without burnout, follow this 3-step daily routine:

```
┌────────────────────────────────────────────────────────┐
│  1. MORNING (2 mins): Check Today View                 │
│     • Review Today's Mode & Net Study Capacity         │
│     • Check Top 3 Priority Tasks                       │
│     • Address any Overdue Warnings                     │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│  2. DURING SESSIONS: Top Bar Timer                     │
│     • Click "Start Session" from top bar or task card  │
│     • Pause during breaks (break time is deducted)     │
│     • Stop and record actual focus minutes             │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│  3. EVENING (5 mins): Daily Reconciliation & Review    │
│     • Mark completed tasks as Done (check icon)        │
│     • Log any errors made into Error Notebook          │
│     • If behind schedule, click "Replan Schedule"      │
└────────────────────────────────────────────────────────┘
```

---

## 3. Top Header & Singleton Active Session Timer

The top navigation header remains accessible on every page and provides real-time tracking:

- **Current Date (Asia/Kolkata):** Always anchored to Indian Standard Time (`YYYY-MM-DD`).
- **Singleton Active Session Timer:**
  - **Start Session (`Play` icon):** Initiates a tracked study block. Only one active session can exist across all open tabs to prevent duplicate accounting.
  - **Pause / Resume (`Pause`/`Play` icon):** Freezes the timer. Paused time is tracked separately and **never counts as study time**.
  - **Stop & Record (`Square` icon):** Finalizes the session, logs the exact focus seconds into your audit database, and reconciles your task progress.
  - **Status Indicator:** A pulsing green dot (`emerald-500`) indicates when a focus session is actively running.

---

## 4. Today Dashboard

Accessible via the **Today** tab (`/`):

- **Exam Countdown Pill:** Displays real days remaining until the provisional GATE DA exam date (**6 February 2027**).
- **Today's Net Capacity Card (`blue`):** Shows your available hours after mandatory buffer deduction (e.g., $4.0\text{h}$ gross $\to 3.4\text{h}$ net).
- **Required Daily Avg Card (`amber`):** Mathematically derived hours per available day needed to complete 100% of the remaining syllabus.
- **Core Mocks Target Card (`rose`):** Tracks your progress toward completing the 12 core full-length tests (independent of your historical 21/100 baseline).
- **Schedule Status Card (`emerald/rose`):**
  - **On Track:** Positive time surplus.
  - **Tight:** Less than 10 hours buffer remaining.
  - **Deficit (Infeasible):** Negative time balance. An alert banner will appear detailing exactly how many hours of deficit exist and guiding you to adjust course variants.
- **Top 3 Priority Tasks:** The three highest-yield tasks for today, prioritized by subject weakness (PnC and DBMS first), deadlines, and calendar locks. You can start a timer directly from any task card.
- **Academic Timeline Milestones:** Highlights the current academic phase (e.g. LAEP Presentation, ESE Exam window, Holiday Mode 450m/day, or College Alternating Attendance).

---

## 5. Plan View (Daily & Weekly Adaptive Scheduler)

Accessible via the **Plan** tab:

### 5.1 Day View vs. Week View
- **Day Mode:** High-resolution breakdown of time blocks for the selected date. Shows a capacity bar comparing assigned minutes against net available minutes.
- **Week Mode:** Complete 7-day Monday–Sunday (IST) view displaying daily capacity totals, assigned subject color bars, and lock badges.

### 5.2 Task Operations
- **Mark Complete (`CheckCircle2` emerald):** Toggles task status between `todo` and `done`, updating completed minutes.
- **Pin to Date (`Pin` blue):** Locks the task to the current date. The automatic scheduler will never move a pinned task during replanning.
- **Split Task (`Split` amber):** If a task is $\ge 60$ minutes, this button automatically splits it into two equal chunks (`Part 1` and `Part 2`) with sequential prerequisites, making it easier to fit into tighter evening capacity windows.
- **Delete (`Trash2` rose):** Removes the task and releases assigned schedule slots.

### 5.3 Quick-Add Task
Click the **`+ Add Task`** button to create a custom study item:
- **Title:** e.g., "Eigenvalues & Diagonalization Practice"
- **Subject:** Choose from your 9 enrolled subjects.
- **Type:** Video, Notes, Embedded Problems, Independent PYQ, Mock, Analysis, ESE, or Revision.
- **Estimated Minutes:** 25 to 180 minutes.
- **Priority:** 1 (Highest / Weakness) to 5 (Lowest).

### 5.4 Day Capacity Override
If life happens (illness, travel, unexpected college events):
1. Navigate to the affected date.
2. Click **`Override Capacity`**.
3. Enter the new available minutes (e.g., `0` for an emergency rest day, or `120` for a partial day).
4. Enter a mandatory reason (e.g., "Family event" or "Migraine").
5. Click **Save Override**. The scheduler immediately recalibrates around this date.

### 5.5 Deterministic Replanning Engine
Whenever your backlog slips or priorities change:
1. Click the **`Replan Schedule`** button.
2. A full-screen diff modal displays:
   - **Assignments Diff:** Shows which tasks were moved, added, or deferred.
   - **Feasibility Verdict:** Confirms whether your new plan is mathematically feasible or in deficit.
   - **Residual Backlog:** Lists any low-priority tasks that could not fit into the available window, along with explicit reasons.
3. Click **Confirm & Commit Plan** to persist the new plan version, or **Cancel** to keep your existing schedule.
4. If you ever need to revert, use the **Rollback** button to restore any previous plan version.

---

## 6. Subjects & Workload Multipliers

Accessible via the **Subjects** tab:

### 6.1 Understanding Quoted Runtime vs. Effective Effort
- **Raw Total:** 239.0 hours of video content across enrolled playlists.
- **Effective Total:** 413.5 hours of actual study effort.
- **Per-Subject Multipliers:**
  - Linear Algebra: $35\text{h} \times 2.0 = 70.0\text{h}$
  - Probability & Statistics (Weak Subject): $43\text{h} \times 2.0 = 86.0\text{h}$
  - Calculus & Optimization: $32\text{h} \times 2.0 = 64.0\text{h}$
  - Python & DSA: $32\text{h} \times 1.5 = 48.0\text{h}$
  - DBMS (Crash Course): $35\text{h} \times 1.5 = 52.5\text{h}$
  - Machine Learning: $38\text{h} \times 1.5 = 57.0\text{h}$
  - Artificial Intelligence: $24\text{h} \times 1.5 = 36.0\text{h}$

### 6.2 The DBMS Course Variant Switcher
StudyOS includes two course options for DBMS:
- **Crash Course (Recommended):** 35 hours raw (52.5h effective effort).
- **Full Comprehensive Playlist:** 92 hours raw (138.0h effective effort).
- **How to Switch:** Click the radio button next to your desired variant. Switching to the Crash Course immediately saves **85.5 hours** of study demand, transforming an infeasible schedule into a feasible one.

### 6.3 ESE University Subject Weights
Tracks your 5 university exam subjects (60–100 marks vs 40–50 marks) to ensure college academic eligibility while protecting GATE study windows.

---

## 7. PYQ Tracker (Embedded vs. Independent Practice)

Accessible via the **PYQs** tab:

### 7.1 Avoiding Double-Counting
StudyOS separates question practice into two distinct categories:
- **Embedded Questions:** Problem sets solved inside video lectures as instructor walkthroughs.
- **Independent PYQs:** Questions solved from GATE exam papers under timed, unassisted conditions.
- Distinct question coverage is tracked separately from repeat attempts.

### 7.2 Logging a Question Attempt
1. Click **`Log PYQ Attempt`**.
2. Select the Subject and Topic.
3. Enter the Question ID / Reference (e.g., `GATE-DA-2024-Q14`).
4. Select the Result:
   - **Correct (`emerald`):** Mastered question.
   - **Incorrect (`rose`):** Automatically flags the question for entry into the Error Notebook.
   - **Skipped (`amber`):** Indicates time pressure or conceptual hesitation.
5. Record your Confidence Level (`Low`, `Medium`, `High`) and Time Taken (seconds).

---

## 8. Mock Test Analytics & Score Engine

Accessible via the **Mocks** tab:

### 8.1 12 Core Mocks + 3 Stretch Mocks
- The target curriculum requires **12 full-length core mocks** (180 minutes uninterrupted each).
- 3 optional stretch mocks are scheduled only if a positive capacity surplus exists.

### 8.2 Preservation of the 2026 Baseline
Your historical 2026 GATE DA score (**21.0 / 100**) is pinned in an independent amber card at the top of the analytics view. It is permanently excluded from your 2027 test series average to ensure honest, unpolluted performance tracking.

### 8.3 Logging a Mock Test Result
1. Click **`Record Mock Result`**.
2. Enter the Test Number and Paper Source (e.g., `Made Easy Full Mock 03`).
3. Enter Question Metrics:
   - Max Marks (usually `100`)
   - Correct Count
   - Incorrect Count (1-mark and 2-mark negative penalty calculated automatically)
   - Skipped Count
   - Raw Score Achieved
4. Check **Analysis Completed** after you have thoroughly analyzed your mistakes.

---

## 9. Error Notebook & Spaced Revision System

Accessible via the **Review** tab:

### 9.1 Error Taxonomy Classification
Every mistake must be classified into one of 5 root-cause categories:
- **Conceptual (`rose`):** Fundamental misunderstanding of theorems or definitions. Requires re-reading theory.
- **Calculation (`amber`):** Arithmetic slip, matrix multiplication error, or sign inversion.
- **Misread (`purple`):** Failing to notice words like "NOT", "FALSE", or units mismatch.
- **Time Management (`blue`):** Rushed answering due to poor clock pacing.
- **Guess (`zinc`):** Unjustified gambling under negative marking conditions.

### 9.2 Leitner Spaced Repetition Queue
Items move through spaced repetition intervals: **1 day $\to$ 3 days $\to$ 7 days $\to$ 14 days $\to$ 30 days**.
- **Due for Review Today:** Items whose review date matches or precedes today appear at the top of your queue.
- **Pass (`CheckCircle2` emerald):** Promotes the item to the next interval (e.g., from 3 days to 7 days). Reaching 30 days marks the concept as **Mastered**.
- **Fail (`RotateCcw` rose):** Resets the item back to the **1-day interval** for immediate re-testing tomorrow.

### 9.3 On-Demand Weekly Review Generator
Click **`Weekly Audit`** to generate an instant review summary showing completed study hours, backlog drift, and weak topics.

---

## 10. January Institutional Attendance & Commute Planner

Accessible via the **Attendance** tab:

### 10.1 The 19 Working Days Math
Between 11 January and 5 February 2027, StudyOS derives exactly **19 institutional working days**:
- Skips all Saturdays and Sundays.
- Skips **26 January 2027 (Republic Day public holiday)**.

### 10.2 Commute Accounting
- College days require a **4-hour roundtrip commute**, leaving only **105 minutes** of realistic evening study capacity.
- Off-college self-study days provide **450 minutes (7.5 hours)** of full focus.

### 10.3 Alternating Attendance Toggle
1. The calendar grid displays the proposed alternating schedule (e.g. Attending Monday/Wednesday/Friday, Self-Study Tuesday/Thursday).
2. Click on any date's status badge (**Attending** vs. **Self-Study**) to toggle your attendance choice for that day.
3. The projected institutional attendance percentage updates in real time. If attendance drops below **75%**, a red compliance warning alert triggers.

---

## 11. AI Study Assistant (Gemini 3.8 / 3.5)

Accessible via the **Settings** tab (or via the Assistant query bar):

### 11.1 Server-Only Architecture & Security
- Uses `gemini-3.8-flash` as primary model with automatic fallback to `gemini-3.5-flash-lite`.
- All requests are proxied securely through the Next.js backend (`/api/gemini`). Your API key is never exposed to browser client JavaScript.

### 11.2 Proposal-Only Execution
The assistant cannot directly mutate your database without your permission. It returns:
1. Factual assessment of current workload vs. remaining days.
2. Actionable study recommendations based on your logged metrics.
3. Suggested priority changes with written rationales.
4. You review the proposal diff and choose whether to apply it.

### 11.3 Effective Prompting Examples
- *"How should I balance Probability & Statistics with DBMS over the next 2 weeks?"*
- *"I missed 3 hours yesterday due to lab work. What should I deprioritize?"*
- *"Evaluate my mock test trajectory across the last 4 tests."*

---

## 12. Backups, CSV Exports & Data Sovereignty

Accessible via the **Settings** tab:

- **Full JSON Backup (`Download` blue):** Generates a schema-versioned (`v1.0.0`) JSON file containing all your tasks, mocks, error items, sessions, overrides, and calendar settings.
- **CSV Data Exports:**
  - `Tasks CSV`: Full table of study tasks, estimated vs completed minutes, and priorities.
  - `Mocks CSV`: Test numbers, raw scores, negative marks, and completion status for spreadsheet charting.
  - `Sessions CSV`: Start timestamps, end timestamps, paused seconds, and net focus time.
- **Dry-Run Import Validator (`Upload` amber):** Before restoring a JSON backup, StudyOS runs a dry-run check to validate version compatibility, record counts, and conflict prevention.

---

## 13. Mobile Power-User Tips

StudyOS is fully optimized for mobile screens (tested on 360px and 390px viewports):

1. **Fixed Bottom Navigation:** Use the 5 bottom touch targets (`Today`, `Plan`, `Mocks`, `Review`, `Attend`) for rapid one-handed tab switching.
2. **Compact Timer Pill:** The active timer in the top header automatically scales down on narrow phones so controls never clip or wrap.
3. **Slide-Over Drawer:** Tap **More** or the hamburger menu to access Subjects, Settings, and Gemini AI without cluttering your main view.
4. **Touch-Friendly Modals:** All replanning diffs, mock forms, and error dialogs support smooth vertical scrolling with sticky action buttons at the bottom.

---

## 14. Keyboard Shortcuts & Quick Actions Reference

| Action | Where | Shortcut / Gesture |
|---|:---:|:---:|
| **Toggle Task Done** | Today / Plan View | Click task checkbox (`CheckCircle2`) |
| **Start Timer on Task** | Today / Plan View | Click task `Play` button |
| **Pause / Resume Timer** | Top Header | Click header `Pause`/`Play` button |
| **Stop Session & Record** | Top Header | Click header `Square` button |
| **Toggle Day / Week View** | Plan View | Click `Day` or `Week` pill |
| **Previous / Next Date** | Plan View | Click `<` / `>` arrow buttons |
| **Pass Spaced Revision** | Review View | Click `Pass` (promotes interval) |
| **Fail Spaced Revision** | Review View | Click `Fail 1d` (resets to 1 day) |
| **Toggle College Attendance** | Attendance View | Tap day card attendance badge |

---

*StudyOS is designed to be your rigorous, quiet, dependable study companion. Trust the math, stick to the daily loop, and let the deterministic scheduler manage the workload while you focus on deep problem solving.*
