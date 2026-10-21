/**
 * StudyOS Core Domain Types
 * Pure TypeScript — zero UI or external DB dependencies.
 */

export type PlanningTimezone = "Asia/Kolkata";
export const DEFAULT_TIMEZONE: PlanningTimezone = "Asia/Kolkata";

export type DayMode =
  | "project"
  | "ese_prep"
  | "ese_only"
  | "gate_holiday"
  | "gate_college_day"
  | "gate_off_college_day"
  | "rest"
  | "user_override";

export type TaskType =
  | "video"
  | "notes"
  | "embedded_problems"
  | "independent_pyq"
  | "mock"
  | "analysis"
  | "ese"
  | "revision";

export type TaskStatus = "todo" | "doing" | "done" | "deferred" | "canceled";

export type SkipStatus = "not_skipped" | "skipped_assessed" | "skipped_unassessed";

export type MasteryStatus = "not_started" | "lectures_done" | "practicing" | "mastered";

export type BaselineStatus = "unknown" | "weak" | "neutral" | "prior_knowledge";

export interface SubjectMetadata {
  id: string;
  name: string;
  code: string;
  category: "gate_core" | "gate_general" | "ese_only";
  baseline: BaselineStatus;
  notes?: string;
  weightESE?: number; // Higher for Game Theory and BDA
}

export interface SyllabusTopic {
  id: string;
  subjectId: string;
  title: string;
  officialRef?: string;
  prerequisiteTopicIds: string[];
  status: MasteryStatus;
}

export interface LectureCourseVariant {
  id: string;
  subjectId: string;
  label: string; // e.g. "Crash Course (35h provisional)" vs "Full Playlist (92h)"
  isCrashCourse: boolean;
  totalLectures: number | null;
  sourceRuntimeHours: number;
  effectiveMultiplier: number;
  selected: boolean;
  notes?: string;
}

export interface LectureItem {
  id: string;
  courseVariantId: string;
  subjectId: string;
  topicId?: string;
  ordinal: number;
  title: string;
  sourceUrl?: string;
  runtimeMinutes: number | null; // Null if unknown
  effectiveMultiplier: number;
  skipStatus: SkipStatus;
  isCompleted: boolean;
  notes?: string;
}

export interface StudyTask {
  id: string;
  userId: string;
  type: TaskType;
  subjectId: string;
  topicId?: string;
  lectureId?: string;
  title: string;
  estimatedMinutes: number;
  completedMinutes: number;
  dueLocalDate?: string; // YYYY-MM-DD
  status: TaskStatus;
  pinned: boolean;
  priority: number; // 1 = highest, 5 = lowest
  why?: string; // Explainability
  prerequisites: string[]; // Task IDs that must complete first
  lockedToDate?: string; // If pinned to a specific day
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleAssignment {
  id: string;
  userId: string;
  taskId: string;
  localDate: string; // YYYY-MM-DD
  plannedMinutes: number;
  planVersion: number;
  status: TaskStatus;
  why: string;
  isOverdue?: boolean;
}

export interface DayCapacity {
  localDate: string; // YYYY-MM-DD
  mode: DayMode;
  grossAvailableMinutes: number;
  bufferPercentage: number; // e.g. 0.15 (15%)
  bufferMinutes: number;
  netAvailableMinutes: number;
  assignedMinutes: number;
  remainingCapacityMinutes: number;
  isLocked: boolean;
  lockReason?: string;
  userOverride?: {
    minutes: number;
    reason: string;
  };
}

export interface CalendarLockRule {
  id: string;
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  lockLevel: "hard" | "soft";
  allowedTaskTypes: TaskType[];
  bannedTaskTypes: TaskType[];
  gateCapacityMinutes: number;
  description: string;
}

export interface PlanPreview {
  planVersion: number;
  generatedAt: string;
  assignments: ScheduleAssignment[];
  unscheduledTasks: {
    task: StudyTask;
    reason: string;
  }[];
  dayCapacities: DayCapacity[];
  conflicts: {
    type: "overload" | "lock_violation" | "deadline_conflict" | "prerequisite_unmet";
    date?: string;
    description: string;
    isHardConflict: boolean;
  }[];
  feasibility: FeasibilitySummary;
}

export interface FeasibilitySummary {
  status: "on_track" | "at_risk" | "infeasible";
  totalRemainingWorkMinutes: number;
  totalRemainingCapacityMinutes: number;
  surplusOrDeficitMinutes: number;
  requiredAverageHoursPerAvailableDay: number;
  minimumAchievableCompletionDate: string | null;
  totalAvailableDays: number;
  scenarios: {
    bestCase: ScenarioProjection;
    baseCase: ScenarioProjection;
    worstCase: ScenarioProjection;
  };
  reasons: string[];
}

export interface ScenarioProjection {
  label: string;
  multiplierAdjustment: number; // 0.85 best, 1.0 base, 1.25 worst
  missedDaysAssumption: number; // e.g. 0, 3, 7
  projectedCompletionDate: string | null;
  feasibleMocksCount: number;
  status: "on_track" | "at_risk" | "infeasible";
}

export interface ErrorCategoryRecord {
  id: string;
  userId: string;
  subjectId: string;
  topicId?: string;
  source: string;
  errorCategory: "conceptual" | "calculation" | "misread" | "time" | "guess";
  correctionNotes: string;
  revisitIntervalDays: number; // 1, 3, 7, 14, 30
  nextReviewDate: string; // YYYY-MM-DD
  attemptCount: number;
  status: "pending" | "resolved" | "mastered";
  createdAt: string;
}

export interface QuestionAttempt {
  id: string;
  userId: string;
  stableQuestionId: string;
  subjectId: string;
  topicId?: string;
  year?: number;
  isEmbeddedInLecture: boolean;
  lectureId?: string;
  marks?: number;
  result: "correct" | "incorrect" | "skipped";
  confidence: "low" | "medium" | "high";
  timeTakenSeconds: number;
  errorCode?: string;
  notes?: string;
  attemptedAt: string;
}

export interface MockTestRecord {
  id: string;
  userId: string;
  testNumber: number; // 1..15
  isHistoricalBaseline: boolean; // TRUE only for the 2026 DA 21/100 score
  testDate: string; // YYYY-MM-DD
  paperSource: string;
  rawScore: number;
  maxMarks: number;
  correctCount: number;
  incorrectCount: number;
  skippedCount: number;
  negativeMarks: number;
  sectionBreakdown?: Record<string, { rawScore: number; maxMarks: number }>;
  timeSpentMinutes: number;
  analysisCompleted: boolean;
  analysisNotes?: string;
}

export interface AttendanceDayRecord {
  localDate: string; // YYYY-MM-DD
  isWorkingDay: boolean;
  plannedAttendance: boolean; // Proposed / chosen by user
  actualAttendance: boolean | null; // Logged after the fact
  isPublicHoliday: boolean;
  commuteMinutes: number; // ~240 min roundtrip (4 hours)
  focusedStudyCapacityMinutes: number; // 90-120 min on college days, 450 min on off days
  userConfirmed: boolean;
}
