/**
 * StudyOS Workload & Time Multiplier Engine
 * Pure domain logic implementing Section 2 of StudyOS Implementation Plan.
 * Never divides multiplier by playback speed again.
 * Accounts for 239 source runtime hours -> 413.5 effective elapsed hours.
 */

import { LectureCourseVariant, SubjectMetadata } from "./types";

export interface SeedCourseDef {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  category: "gate_core" | "gate_general" | "ese_only";
  baseline: "weak" | "neutral" | "prior_knowledge";
  lecturesCount: number | null;
  sourceRuntimeHours: number;
  effectiveMultiplier: number;
  estimatedElapsedHours: number;
  notes?: string;
}

/**
 * Standard seed subjects and courses specified in Section 1 and Section 2.
 */
export const SEED_SUBJECTS: SubjectMetadata[] = [
  {
    id: "subj-linear-algebra",
    name: "Linear Algebra",
    code: "LA",
    category: "gate_core",
    baseline: "prior_knowledge",
    notes: "Prior knowledge from college. Full playlist available.",
  },
  {
    id: "subj-prob-stats",
    name: "Probability & Statistics",
    code: "P&S",
    category: "gate_core",
    baseline: "weak",
    notes: "Weak subject, especially Permutations & Combinations (PnC). Higher priority.",
  },
  {
    id: "subj-calculus",
    name: "Calculus",
    code: "CALC",
    category: "gate_core",
    baseline: "prior_knowledge",
    notes: "Prior knowledge from college.",
  },
  {
    id: "subj-python-dsa",
    name: "Python + DSA",
    code: "PY_DSA",
    category: "gate_core",
    baseline: "prior_knowledge",
    notes: "Prior knowledge from college and projects.",
  },
  {
    id: "subj-algorithms",
    name: "Algorithms",
    code: "ALGO",
    category: "gate_core",
    baseline: "neutral",
    notes: "Standard gate core algorithms.",
  },
  {
    id: "subj-dwm",
    name: "Data Warehousing & Mining",
    code: "DWM",
    category: "gate_core",
    baseline: "prior_knowledge",
    notes: "Prior knowledge from college coursework.",
  },
  {
    id: "subj-dbms",
    name: "DBMS",
    code: "DBMS",
    category: "gate_core",
    baseline: "weak",
    notes: "Weak subject. Preferred ~35h crash course over 92h full playlist.",
  },
  {
    id: "subj-aptitude",
    name: "General Aptitude",
    code: "GA",
    category: "gate_general",
    baseline: "neutral",
    notes: "Marathons only. Hard lock: Cannot be scheduled before 1 Dec 2026.",
  },
  {
    id: "subj-ml-ai",
    name: "Machine Learning & AI",
    code: "ML_AI",
    category: "gate_core",
    baseline: "prior_knowledge",
    notes: "Previous crash-course completed with some PYQs. Status: lectures_done, NOT mastered.",
  },
  // ESE subjects
  {
    id: "subj-ese-dmm",
    name: "Disaster Management (DMM)",
    code: "DMM",
    category: "ese_only",
    baseline: "prior_knowledge",
    weightESE: 1, // Easiest
    notes: "IA: 19/20, Needs 61/80 in sem exam for 80 total.",
  },
  {
    id: "subj-ese-dl",
    name: "Deep Learning",
    code: "DL",
    category: "ese_only",
    baseline: "prior_knowledge",
    weightESE: 2, // Familiar
    notes: "IA: 14/20, Needs 66/80 in sem exam for 80 total.",
  },
  {
    id: "subj-ese-bda",
    name: "Big Data Analytics",
    code: "BDA",
    category: "ese_only",
    baseline: "neutral",
    weightESE: 4, // New subject
    notes: "IA: 15/20, Needs 65/80 in sem exam for 80 total. High ESE weight.",
  },
  {
    id: "subj-ese-nlp",
    name: "Natural Language Processing",
    code: "NLP",
    category: "ese_only",
    baseline: "prior_knowledge",
    weightESE: 2, // Easier
    notes: "IA: 18/20, Needs 62/80 in sem exam for 80 total.",
  },
  {
    id: "subj-ese-game-theory",
    name: "Game Theory",
    code: "GT",
    category: "ese_only",
    baseline: "weak",
    weightESE: 5, // Confusing, hardest
    notes: "IA: 17/20, Needs 63/80 in sem exam for 80 total. High ESE weight.",
  },
];

/**
 * Seed Course Variants with exact numbers from Section 2
 */
export const SEED_COURSE_VARIANTS: LectureCourseVariant[] = [
  {
    id: "course-la",
    subjectId: "subj-linear-algebra",
    label: "Linear Algebra Playlist",
    isCrashCourse: false,
    totalLectures: 16,
    sourceRuntimeHours: 35,
    effectiveMultiplier: 2.0,
    selected: true,
  },
  {
    id: "course-p-stats",
    subjectId: "subj-prob-stats",
    label: "Probability & Statistics Playlist",
    isCrashCourse: false,
    totalLectures: 17,
    sourceRuntimeHours: 43,
    effectiveMultiplier: 2.0,
    selected: true,
  },
  {
    id: "course-calc",
    subjectId: "subj-calculus",
    label: "Calculus Playlist",
    isCrashCourse: false,
    totalLectures: 16,
    sourceRuntimeHours: 32,
    effectiveMultiplier: 2.0,
    selected: true,
  },
  {
    id: "course-py-dsa",
    subjectId: "subj-python-dsa",
    label: "Python + DSA Playlist",
    isCrashCourse: false,
    totalLectures: 19,
    sourceRuntimeHours: 32,
    effectiveMultiplier: 1.5,
    selected: true,
  },
  {
    id: "course-algo",
    subjectId: "subj-algorithms",
    label: "Algorithms Playlist",
    isCrashCourse: false,
    totalLectures: 17,
    sourceRuntimeHours: 36,
    effectiveMultiplier: 1.5,
    selected: true,
  },
  {
    id: "course-dwm",
    subjectId: "subj-dwm",
    label: "Data Warehousing & Mining Playlist",
    isCrashCourse: false,
    totalLectures: 8,
    sourceRuntimeHours: 11,
    effectiveMultiplier: 1.5,
    selected: true,
  },
  // Preferred DBMS Crash Course (35h provisional)
  {
    id: "course-dbms-crash",
    subjectId: "subj-dbms",
    label: "DBMS Crash Course (Preferred)",
    isCrashCourse: true,
    totalLectures: null, // Unknown count as per spec
    sourceRuntimeHours: 35,
    effectiveMultiplier: 1.5,
    selected: true,
    notes: "Provisional 35h estimate. Selected by default per user preference.",
  },
  // Alternative Full DBMS Course (92h) - NOT selected by default
  {
    id: "course-dbms-full",
    subjectId: "subj-dbms",
    label: "DBMS Full Playlist (Alternative)",
    isCrashCourse: false,
    totalLectures: 26,
    sourceRuntimeHours: 92,
    effectiveMultiplier: 1.5,
    selected: false,
    notes: "Alternative full 92h course (138 effective hours). Not active when crash course is active.",
  },
  // General Aptitude Marathons
  {
    id: "course-aptitude",
    subjectId: "subj-aptitude",
    label: "General Aptitude Marathons",
    isCrashCourse: true,
    totalLectures: null,
    sourceRuntimeHours: 15,
    effectiveMultiplier: 1.5,
    selected: true,
    notes: "Scheduled strictly starting December 2026.",
  },
];

/**
 * Calculates effective elapsed study minutes for a given source runtime and multiplier.
 * Invariant: elapsedMinutes = runtimeMinutes * multiplier
 * Does NOT divide by playback speed.
 */
export function calculateEffectiveMinutes(runtimeMinutes: number, multiplier: number): number {
  if (runtimeMinutes < 0) {
    throw new Error(`Runtime minutes cannot be negative: ${runtimeMinutes}`);
  }
  if (multiplier < 1.0) {
    throw new Error(`Time multiplier cannot be less than 1.0x: ${multiplier}`);
  }
  return Math.round(runtimeMinutes * multiplier);
}

/**
 * Computes the total source runtime hours and effective elapsed hours across selected courses.
 * Validates that exactly one course variant is active per subject (guard against duplicate DBMS scheduling).
 */
export function calculateSelectedWorkload(courses: LectureCourseVariant[]): {
  totalSourceHours: number;
  totalEffectiveHours: number;
  activeCourseCount: number;
  warnings: string[];
} {
  const selected = courses.filter((c) => c.selected);
  const subjectIds = new Set<string>();
  const warnings: string[] = [];

  let totalSourceHours = 0;
  let totalEffectiveHours = 0;

  for (const course of selected) {
    if (subjectIds.has(course.subjectId)) {
      warnings.push(
        `DUPLICATE COURSE SELECTION: Multiple active courses selected for subject "${course.subjectId}". Exactly one variant must be selected.`
      );
    }
    subjectIds.add(course.subjectId);

    totalSourceHours += course.sourceRuntimeHours;
    totalEffectiveHours += course.sourceRuntimeHours * course.effectiveMultiplier;
  }

  return {
    totalSourceHours: Number(totalSourceHours.toFixed(1)),
    totalEffectiveHours: Number(totalEffectiveHours.toFixed(1)),
    activeCourseCount: selected.length,
    warnings,
  };
}
