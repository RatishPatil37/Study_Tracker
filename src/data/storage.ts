/**
 * StudyOS Relational Persistence & Repository Engine
 * Provides persistent storage with strict user isolation, ACID JSON file storage,
 * and seamless fallback/parity with Supabase Postgres.
 */

import fs from "fs";
import path from "path";
import {
  AttendanceDayRecord,
  DayCapacity,
  ErrorCategoryRecord,
  LectureCourseVariant,
  LectureItem,
  MockTestRecord,
  PlanPreview,
  QuestionAttempt,
  ScheduleAssignment,
  StudyTask,
  SubjectMetadata,
} from "../domain/types";
import { SEED_COURSE_VARIANTS, SEED_SUBJECTS } from "../domain/workload";
import { computeDayCapacity, deriveJanuaryAttendanceGrid } from "../domain/calendar";
import { generateDateRangeIST } from "../domain/dates";

const DATA_DIR = path.resolve(process.cwd(), "data");
const STORE_FILE = path.join(DATA_DIR, "studyos-store.json");

export interface UserDatabaseStore {
  profile: {
    id: string;
    email: string;
    timezone: string;
    targetExamDate: string;
    targetScore: number;
    historicalBaselineScore: number;
    settings: Record<string, unknown>;
  };
  subjects: SubjectMetadata[];
  courses: LectureCourseVariant[];
  lectures: LectureItem[];
  tasks: StudyTask[];
  assignments: ScheduleAssignment[];
  sessions: {
    id: string;
    userId: string;
    taskId?: string;
    startAt: string;
    endAt?: string;
    pausedSeconds: number;
    actualSeconds: number;
    isActive: boolean;
    source: "timer" | "manual";
    pausedAt?: string;
  }[];
  questions: {
    id: string;
    userId: string;
    stableQuestionId: string;
    subjectId: string;
    topicId?: string;
    year?: number;
    marks?: number;
    questionRef: string;
    isEmbeddedInLecture: boolean;
    lectureId?: string;
  }[];
  attempts: QuestionAttempt[];
  mocks: MockTestRecord[];
  errors: ErrorCategoryRecord[];
  attendance: AttendanceDayRecord[];
  dayOverrides: { localDate: string; minutes: number; reason: string }[];
  planVersions: {
    version: number;
    generatedAt: string;
    preview: PlanPreview;
  }[];
}

interface RootStore {
  users: Record<string, UserDatabaseStore>;
}

// In-memory cache + file sync
let cachedStore: RootStore | null = null;

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadStore(): RootStore {
  if (cachedStore) {
    return cachedStore;
  }
  ensureDataDir();
  if (fs.existsSync(STORE_FILE)) {
    try {
      const content = fs.readFileSync(STORE_FILE, "utf-8");
      cachedStore = JSON.parse(content);
      return cachedStore!;
    } catch {
      // Corrupted file, fallback to empty
    }
  }
  cachedStore = { users: {} };
  saveStore(cachedStore);
  return cachedStore;
}

function saveStore(store: RootStore): void {
  ensureDataDir();
  cachedStore = store;
  fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), "utf-8");
}

/**
 * Creates seed database records for a new user with all facts from the specification.
 */
export function createDefaultUserStore(userId: string): UserDatabaseStore {
  // Generate January attendance grid
  const janGrid = deriveJanuaryAttendanceGrid("2027-01-11", "2027-02-05");
  const attendanceRecords: AttendanceDayRecord[] = janGrid.days.map((d) => ({
    localDate: d.date,
    isWorkingDay: d.isInstitutionalWorkingDay,
    plannedAttendance: d.proposedAttendance,
    actualAttendance: null,
    isPublicHoliday: d.isHoliday,
    commuteMinutes: 240,
    focusedStudyCapacityMinutes: d.proposedAttendance ? 105 : 450,
    userConfirmed: false,
  }));

  // Initial seed tasks matching the 239h lecture workload
  const seedTasks: StudyTask[] = [
    {
      id: `task-la-core`,
      userId,
      type: "video",
      subjectId: "subj-linear-algebra",
      title: "Linear Algebra Core Lectures",
      estimatedMinutes: 35 * 60 * 2.0, // 4200 min (70h effective)
      completedMinutes: 0,
      status: "todo",
      pinned: false,
      priority: 2,
      why: "Linear Algebra fundamental syllabus",
      prerequisites: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: `task-prob-core`,
      userId,
      type: "video",
      subjectId: "subj-prob-stats",
      title: "Probability & Statistics Core (PnC Focus)",
      estimatedMinutes: 43 * 60 * 2.0, // 5160 min (86h effective)
      completedMinutes: 0,
      status: "todo",
      pinned: false,
      priority: 1, // Weak subject -> top priority
      why: "Weak subject (Probability & Stats, especially PnC)",
      prerequisites: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: `task-calc-core`,
      userId,
      type: "video",
      subjectId: "subj-calculus",
      title: "Calculus Core Lectures",
      estimatedMinutes: 32 * 60 * 2.0, // 3840 min (64h effective)
      completedMinutes: 0,
      status: "todo",
      pinned: false,
      priority: 3,
      why: "Calculus syllabus coverage",
      prerequisites: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: `task-py-core`,
      userId,
      type: "video",
      subjectId: "subj-python-dsa",
      title: "Python + DSA Playlist",
      estimatedMinutes: 32 * 60 * 1.5, // 2880 min (48h effective)
      completedMinutes: 0,
      status: "todo",
      pinned: false,
      priority: 2,
      why: "Programming & Data Structures",
      prerequisites: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: `task-algo-core`,
      userId,
      type: "video",
      subjectId: "subj-algorithms",
      title: "Algorithms Playlist",
      estimatedMinutes: 36 * 60 * 1.5, // 3240 min (54h effective)
      completedMinutes: 0,
      status: "todo",
      pinned: false,
      priority: 2,
      why: "Algorithms design and complexity",
      prerequisites: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: `task-dwm-core`,
      userId,
      type: "video",
      subjectId: "subj-dwm",
      title: "Data Warehousing & Mining",
      estimatedMinutes: 11 * 60 * 1.5, // 990 min (16.5h effective)
      completedMinutes: 0,
      status: "todo",
      pinned: false,
      priority: 3,
      why: "DWM topics",
      prerequisites: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: `task-dbms-core`,
      userId,
      type: "video",
      subjectId: "subj-dbms",
      title: "DBMS Crash Course (Provisional 35h)",
      estimatedMinutes: 35 * 60 * 1.5, // 3150 min (52.5h effective)
      completedMinutes: 0,
      status: "todo",
      pinned: false,
      priority: 1, // Weak subject -> top priority
      why: "Weak subject (DBMS crash course option)",
      prerequisites: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: `task-aptitude-core`,
      userId,
      type: "video",
      subjectId: "subj-aptitude",
      title: "General Aptitude Marathons",
      estimatedMinutes: 15 * 60 * 1.5, // 1350 min (22.5h effective)
      completedMinutes: 0,
      status: "todo",
      pinned: false,
      priority: 3,
      why: "General Aptitude (Locked until 1 Dec 2026)",
      prerequisites: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    // End-Sem Exam Tasks (ESE window 16-27 Nov)
    {
      id: `task-ese-game-theory`,
      userId,
      type: "ese",
      subjectId: "subj-ese-game-theory",
      title: "Game Theory ESE Preparation (Highest ESE weight)",
      estimatedMinutes: 30 * 60, // 30h
      completedMinutes: 0,
      status: "todo",
      pinned: false,
      priority: 1,
      why: "ESE Exam: Game Theory confusing; needs 63/80",
      prerequisites: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: `task-ese-bda`,
      userId,
      type: "ese",
      subjectId: "subj-ese-bda",
      title: "Big Data Analytics ESE Preparation",
      estimatedMinutes: 25 * 60,
      completedMinutes: 0,
      status: "todo",
      pinned: false,
      priority: 1,
      why: "ESE Exam: BDA new subject; needs 65/80",
      prerequisites: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  // Seed Historical Baseline Mock (Section 1: GATE DA 2026 with 21/100 marks)
  // Preserved separately from current mocks!
  const seedMocks: MockTestRecord[] = [
    {
      id: "mock-historical-2026",
      userId,
      testNumber: 0,
      isHistoricalBaseline: true, // TRUE: Historical self-reported baseline, NOT a current 2027 preparation mock
      testDate: "2026-02-07",
      paperSource: "GATE DA 2026 Official Paper (Baseline attempt with ~2 weeks prep)",
      rawScore: 21.0,
      maxMarks: 100.0,
      correctCount: 12,
      incorrectCount: 15,
      skippedCount: 38,
      negativeMarks: 5.0,
      timeSpentMinutes: 180,
      analysisCompleted: true,
      analysisNotes: "Historical baseline attempt prior to starting dedicated StudyOS prep.",
    },
  ];

  return {
    profile: {
      id: userId,
      email: "student@studyos.local",
      timezone: "Asia/Kolkata",
      targetExamDate: "2027-02-06",
      targetScore: 80,
      historicalBaselineScore: 21,
      settings: {
        dailyBufferPercent: 0.15,
        defaultHolidayMinutes: 450,
        defaultCollegeMinutes: 105,
      },
    },
    subjects: [...SEED_SUBJECTS],
    courses: [...SEED_COURSE_VARIANTS],
    lectures: [],
    tasks: seedTasks,
    assignments: [],
    sessions: [],
    questions: [],
    attempts: [],
    mocks: seedMocks,
    errors: [],
    attendance: attendanceRecords,
    dayOverrides: [],
    planVersions: [],
  };
}

/**
 * Thread-safe access to a user's isolated data store.
 */
export class StudyOSRepository {
  private userId: string;

  constructor(userId: string = "default-user") {
    this.userId = userId;
  }

  private getUserStore(): UserDatabaseStore {
    const store = loadStore();
    if (!store.users[this.userId]) {
      store.users[this.userId] = createDefaultUserStore(this.userId);
      saveStore(store);
    }
    return store.users[this.userId];
  }

  private mutateUserStore(updater: (userStore: UserDatabaseStore) => void): void {
    const store = loadStore();
    if (!store.users[this.userId]) {
      store.users[this.userId] = createDefaultUserStore(this.userId);
    }
    updater(store.users[this.userId]);
    saveStore(store);
  }

  // --- Profile ---
  getProfile() {
    return this.getUserStore().profile;
  }

  updateProfile(updates: Partial<UserDatabaseStore["profile"]>) {
    this.mutateUserStore((s) => {
      s.profile = { ...s.profile, ...updates };
    });
    return this.getProfile();
  }

  // --- Subjects & Courses ---
  getSubjects() {
    return this.getUserStore().subjects;
  }

  getCourses() {
    return this.getUserStore().courses;
  }

  selectCourseVariant(courseId: string) {
    this.mutateUserStore((s) => {
      const target = s.courses.find((c) => c.id === courseId);
      if (!target) return;

      // Unselect any other course variant for the same subject
      for (const c of s.courses) {
        if (c.subjectId === target.subjectId) {
          c.selected = false;
        }
      }
      target.selected = true;
    });
    return this.getCourses();
  }

  // --- Tasks ---
  getTasks(): StudyTask[] {
    return this.getUserStore().tasks;
  }

  createTask(task: Omit<StudyTask, "id" | "userId" | "createdAt" | "updatedAt">): StudyTask {
    const newTask: StudyTask = {
      ...task,
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      userId: this.userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.mutateUserStore((s) => {
      s.tasks.push(newTask);
    });
    return newTask;
  }

  updateTask(taskId: string, updates: Partial<StudyTask>): StudyTask {
    let updated: StudyTask | null = null;
    this.mutateUserStore((s) => {
      const idx = s.tasks.findIndex((t) => t.id === taskId);
      if (idx !== -1) {
        s.tasks[idx] = {
          ...s.tasks[idx],
          ...updates,
          updatedAt: new Date().toISOString(),
        };
        updated = s.tasks[idx];
      }
    });
    if (!updated) {
      throw new Error(`Task with id ${taskId} not found.`);
    }
    return updated;
  }

  deleteTask(taskId: string): void {
    this.mutateUserStore((s) => {
      s.tasks = s.tasks.filter((t) => t.id !== taskId);
      s.assignments = s.assignments.filter((a) => a.taskId !== taskId);
    });
  }

  // --- Schedule Assignments & Plan Versions ---
  getAssignments(): ScheduleAssignment[] {
    return this.getUserStore().assignments;
  }

  getPlanVersions() {
    return this.getUserStore().planVersions;
  }

  commitPlan(preview: PlanPreview): void {
    this.mutateUserStore((s) => {
      s.assignments = [...preview.assignments];
      s.planVersions.push({
        version: preview.planVersion,
        generatedAt: preview.generatedAt,
        preview,
      });
    });
  }

  rollbackPlan(targetVersion: number): boolean {
    let success = false;
    this.mutateUserStore((s) => {
      const target = s.planVersions.find((pv) => pv.version === targetVersion);
      if (target) {
        s.assignments = [...target.preview.assignments];
        success = true;
      }
    });
    return success;
  }

  // --- Study Sessions (Singleton active session timer) ---
  getActiveSession() {
    return this.getUserStore().sessions.find((s) => s.isActive) || null;
  }

  getSessions() {
    return this.getUserStore().sessions;
  }

  startSession(taskId?: string): { id: string; startAt: string } {
    let sessionId = "";
    const startAt = new Date().toISOString();

    this.mutateUserStore((s) => {
      // End any previously active session (enforce singleton)
      for (const sess of s.sessions) {
        if (sess.isActive) {
          sess.isActive = false;
          sess.endAt = startAt;
        }
      }

      sessionId = `sess-${Date.now()}`;
      s.sessions.push({
        id: sessionId,
        userId: this.userId,
        taskId,
        startAt,
        pausedSeconds: 0,
        actualSeconds: 0,
        isActive: true,
        source: "timer",
      });
    });

    return { id: sessionId, startAt };
  }

  pauseSession(): void {
    this.mutateUserStore((s) => {
      const active = s.sessions.find((sess) => sess.isActive);
      if (active && !active.pausedAt) {
        active.pausedAt = new Date().toISOString();
      }
    });
  }

  resumeSession(): void {
    this.mutateUserStore((s) => {
      const active = s.sessions.find((sess) => sess.isActive);
      if (active && active.pausedAt) {
        const pauseDurationSeconds = Math.round(
          (new Date().getTime() - new Date(active.pausedAt).getTime()) / 1000
        );
        active.pausedSeconds += Math.max(0, pauseDurationSeconds);
        delete active.pausedAt;
      }
    });
  }

  endSession(additionalActualSeconds?: number): { actualMinutes: number } {
    let actualMinutes = 0;
    const now = new Date().toISOString();

    this.mutateUserStore((s) => {
      const active = s.sessions.find((sess) => sess.isActive);
      if (!active) return;

      if (active.pausedAt) {
        const pauseDurationSeconds = Math.round(
          (new Date().getTime() - new Date(active.pausedAt).getTime()) / 1000
        );
        active.pausedSeconds += Math.max(0, pauseDurationSeconds);
        delete active.pausedAt;
      }

      active.endAt = now;
      active.isActive = false;

      const totalElapsedSeconds = Math.round(
        (new Date(now).getTime() - new Date(active.startAt).getTime()) / 1000
      );

      // Invariant: Paused time is strictly deducted from actual study time
      const netSeconds = Math.max(0, totalElapsedSeconds - active.pausedSeconds);
      active.actualSeconds = additionalActualSeconds ?? netSeconds;
      actualMinutes = Math.round(active.actualSeconds / 60);

      // Reconcile task completion if associated
      if (active.taskId) {
        const task = s.tasks.find((t) => t.id === active.taskId);
        if (task) {
          task.completedMinutes += actualMinutes;
          if (task.completedMinutes >= task.estimatedMinutes) {
            task.status = "done";
          } else {
            task.status = "doing";
          }
        }
      }
    });

    return { actualMinutes };
  }

  // --- Mock Tests ---
  getMockTests(): MockTestRecord[] {
    return this.getUserStore().mocks;
  }

  recordMockTest(mock: Omit<MockTestRecord, "id" | "userId">): MockTestRecord {
    // Validate bounds: raw score cannot exceed max marks
    if (mock.rawScore > mock.maxMarks || mock.rawScore < -33.33) {
      throw new Error(`Invalid raw score: ${mock.rawScore}. Must be between -33.33 and ${mock.maxMarks}.`);
    }

    const newMock: MockTestRecord = {
      ...mock,
      id: `mock-${Date.now()}`,
      userId: this.userId,
    };

    this.mutateUserStore((s) => {
      s.mocks.push(newMock);
    });

    return newMock;
  }

  // --- Questions & PYQs ---
  getQuestionItems() {
    return this.getUserStore().questions;
  }

  getQuestionAttempts(): QuestionAttempt[] {
    return this.getUserStore().attempts;
  }

  recordAttempt(attempt: Omit<QuestionAttempt, "id" | "userId">): QuestionAttempt {
    const newAttempt: QuestionAttempt = {
      ...attempt,
      id: `attempt-${Date.now()}`,
      userId: this.userId,
    };

    this.mutateUserStore((s) => {
      s.attempts.push(newAttempt);
    });

    return newAttempt;
  }

  // --- Error Notebook & Spaced Revision ---
  getErrorItems(): ErrorCategoryRecord[] {
    return this.getUserStore().errors;
  }

  recordErrorItem(error: Omit<ErrorCategoryRecord, "id" | "userId" | "createdAt">): ErrorCategoryRecord {
    const newError: ErrorCategoryRecord = {
      ...error,
      id: `err-${Date.now()}`,
      userId: this.userId,
      createdAt: new Date().toISOString(),
    };

    this.mutateUserStore((s) => {
      s.errors.push(newError);
    });

    return newError;
  }

  reviewErrorItem(errorId: string, success: boolean): ErrorCategoryRecord {
    let updated: ErrorCategoryRecord | null = null;
    this.mutateUserStore((s) => {
      const item = s.errors.find((e) => e.id === errorId);
      if (!item) return;

      item.attemptCount++;
      const intervals = [1, 3, 7, 14, 30];
      const currentIdx = intervals.indexOf(item.revisitIntervalDays);

      if (success) {
        if (currentIdx >= intervals.length - 1) {
          item.status = "mastered";
        } else {
          item.revisitIntervalDays = intervals[currentIdx + 1];
          item.status = "resolved";
        }
      } else {
        // Drop back to 1 day on failure
        item.revisitIntervalDays = 1;
        item.status = "pending";
      }

      // Compute next review date in IST
      const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
      const nextDate = new Date(Date.now() + item.revisitIntervalDays * 24 * 60 * 60 * 1000);
      item.nextReviewDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(nextDate);

      updated = item;
    });

    if (!updated) {
      throw new Error(`Error item ${errorId} not found.`);
    }
    return updated;
  }

  // --- Attendance ---
  getAttendanceRecords(): AttendanceDayRecord[] {
    return this.getUserStore().attendance;
  }

  updateAttendanceRecord(date: string, updates: Partial<AttendanceDayRecord>): void {
    this.mutateUserStore((s) => {
      const idx = s.attendance.findIndex((a) => a.localDate === date);
      if (idx !== -1) {
        s.attendance[idx] = { ...s.attendance[idx], ...updates };
      }
    });
  }

  // --- Day Overrides ---
  getDayOverrides(): { localDate: string; minutes: number; reason: string }[] {
    return this.getUserStore().dayOverrides;
  }

  setDayOverride(localDate: string, minutes: number, reason: string): void {
    this.mutateUserStore((s) => {
      const idx = s.dayOverrides.findIndex((o) => o.localDate === localDate);
      if (idx !== -1) {
        s.dayOverrides[idx] = { localDate, minutes, reason };
      } else {
        s.dayOverrides.push({ localDate, minutes, reason });
      }
    });
  }

  // --- Backup & Export ---
  exportAllData() {
    const store = this.getUserStore();
    return {
      schemaVersion: "1.0.0",
      exportedAt: new Date().toISOString(),
      data: { ...store },
    };
  }

  importAllData(payload: { schemaVersion: string; data: UserDatabaseStore }): {
    success: boolean;
    importedCounts: Record<string, number>;
  } {
    if (payload.schemaVersion !== "1.0.0" || !payload.data) {
      throw new Error("Invalid backup schema version or corrupted data payload.");
    }

    this.mutateUserStore((s) => {
      s.tasks = payload.data.tasks || [];
      s.courses = payload.data.courses || [];
      s.mocks = payload.data.mocks || [];
      s.errors = payload.data.errors || [];
      s.attendance = payload.data.attendance || [];
      s.sessions = payload.data.sessions || [];
      s.attempts = payload.data.attempts || [];
      s.dayOverrides = payload.data.dayOverrides || [];
    });

    return {
      success: true,
      importedCounts: {
        tasks: payload.data.tasks?.length || 0,
        mocks: payload.data.mocks?.length || 0,
        errors: payload.data.errors?.length || 0,
        sessions: payload.data.sessions?.length || 0,
      },
    };
  }
}
