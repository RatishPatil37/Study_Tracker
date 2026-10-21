/**
 * StudyOS Academic Calendar, Hard Locks & Attendance Grid Engine
 * Strictly enforces constraints from Section 1 & Section 3 of StudyOS Implementation Plan.
 */

import { addDaysIST, diffDaysIST, generateDateRangeIST, getDayOfWeekIST, isWeekendIST } from "./dates";
import { CalendarLockRule, DayCapacity, DayMode, StudyTask, TaskType } from "./types";

export interface AttendanceProfile {
  requiredAttendancePercent: number; // e.g. 75
  totalClassesPerDay: number; // e.g. 5
  classesHeldSoFar: number | null;
  classesAttendedSoFar: number | null;
  recognizedExemptions: number;
}

/**
 * Hard calendar lock rules specified in Section 1
 */
export const SEED_LOCK_RULES: CalendarLockRule[] = [
  {
    id: "lock-laep-presentation",
    name: "LAEP Presentation Focus",
    startDate: "2026-10-21",
    endDate: "2026-10-22",
    lockLevel: "hard",
    allowedTaskTypes: ["video", "notes", "embedded_problems", "ese"],
    bannedTaskTypes: ["mock"], // Avoid adding late scope that jeopardizes presentation
    gateCapacityMinutes: 240,
    description: "LAEP presentation focus (presentation 22 Oct). No heavy 3h mock scheduling.",
  },
  {
    id: "lock-practicals",
    name: "College Practical Exams",
    startDate: "2026-10-26",
    endDate: "2026-10-27",
    lockLevel: "hard",
    allowedTaskTypes: ["ese", "notes", "video"],
    bannedTaskTypes: ["mock"],
    gateCapacityMinutes: 180,
    description: "Practical examinations. Light GATE capacity only.",
  },
  {
    id: "lock-project-freeze",
    name: "Project Work Freeze",
    startDate: "2026-10-29",
    endDate: "2027-02-28",
    lockLevel: "hard",
    allowedTaskTypes: ["video", "notes", "embedded_problems", "independent_pyq", "mock", "analysis", "ese", "revision"],
    bannedTaskTypes: [], // Note: Project development tasks are blocked
    gateCapacityMinutes: 450,
    description: "Project work is frozen for LAEP and SmartSight after 28 Oct.",
  },
  {
    id: "lock-ese-exams",
    name: "End-Semester Examinations (ESE-Only)",
    startDate: "2026-11-16",
    endDate: "2026-11-27",
    lockLevel: "hard",
    allowedTaskTypes: ["ese"],
    bannedTaskTypes: ["video", "notes", "embedded_problems", "independent_pyq", "mock", "analysis", "revision"],
    gateCapacityMinutes: 0, // GATE = 0 minutes
    description: "End-sem exams. Exclusively ESE studying; GATE=0 minutes by user instruction.",
  },
  {
    id: "lock-aptitude-start",
    name: "General Aptitude Eligibility Lock",
    startDate: "2026-10-21",
    endDate: "2026-11-30",
    lockLevel: "hard",
    allowedTaskTypes: ["video", "notes", "embedded_problems", "independent_pyq", "mock", "analysis", "ese", "revision"],
    bannedTaskTypes: [], // Handled by subjectId check: GA cannot be scheduled before 1 Dec 2026
    gateCapacityMinutes: 450,
    description: "General Aptitude study starts December 2026, not before.",
  },
];

/**
 * Public Holidays known in the planning window
 */
export const OFFICIAL_PUBLIC_HOLIDAYS = new Set<string>([
  "2027-01-26", // India Republic Day (User's one confirmed January public holiday)
]);

/**
 * Derives the exact calendar grid and eligible working days for the college resumption phase (11 Jan 2027 to 5 Feb 2027).
 * Never hard-codes 9 days without deriving actual dates.
 * Only applies alternating proposal to eligible WORKING days (excluding weekends & holidays).
 */
export function deriveJanuaryAttendanceGrid(
  startDate: string = "2027-01-11",
  endDate: string = "2027-02-05", // Day before provisional exam on 6 Feb
  customHolidays: Set<string> = OFFICIAL_PUBLIC_HOLIDAYS,
  attendFirstWorkingDay: boolean = true
): {
  days: {
    date: string;
    dayOfWeek: number;
    isWeekend: boolean;
    isHoliday: boolean;
    isInstitutionalWorkingDay: boolean;
    proposedAttendance: boolean; // True if alternating working day
    reason: string;
  }[];
  totalInstitutionalWorkingDays: number;
  totalProposedAttendedDays: number;
  totalProposedLeaveDays: number;
} {
  const dates = generateDateRangeIST(startDate, endDate);
  let workingDayCounter = 0;
  let proposedAttendedCounter = 0;
  let proposedLeaveCounter = 0;

  const days = dates.map((date) => {
    const dayOfWeek = getDayOfWeekIST(date);
    const weekend = isWeekendIST(date);
    const holiday = customHolidays.has(date);

    if (weekend) {
      return {
        date,
        dayOfWeek,
        isWeekend: true,
        isHoliday: holiday,
        isInstitutionalWorkingDay: false,
        proposedAttendance: false,
        reason: "Weekend (College Closed)",
      };
    }

    if (holiday) {
      return {
        date,
        dayOfWeek,
        isWeekend: false,
        isHoliday: true,
        isInstitutionalWorkingDay: false,
        proposedAttendance: false,
        reason: "Public Holiday (Republic Day - 26 Jan)",
      };
    }

    // Eligible institutional working day
    workingDayCounter++;
    // Alternating working days: 1st, 3rd, 5th... or 2nd, 4th, 6th...
    const isAttending = attendFirstWorkingDay
      ? workingDayCounter % 2 === 1
      : workingDayCounter % 2 === 0;

    if (isAttending) {
      proposedAttendedCounter++;
    } else {
      proposedLeaveCounter++;
    }

    return {
      date,
      dayOfWeek,
      isWeekend: false,
      isHoliday: false,
      isInstitutionalWorkingDay: true,
      proposedAttendance: isAttending,
      reason: isAttending ? "Proposed College Attendance (Alternating)" : "Proposed Off-College Self-Study Day",
    };
  });

  return {
    days,
    totalInstitutionalWorkingDays: workingDayCounter,
    totalProposedAttendedDays: proposedAttendedCounter,
    totalProposedLeaveDays: proposedLeaveCounter,
  };
}

export interface DayCapacityConfig {
  holidayFocusedMinutes?: number; // Default 450 (7.5 hours)
  collegeDayFocusedMinutes?: number; // Default 105 (provisional 1.5 - 2h)
  offCollegeWeekdayFocusedMinutes?: number; // Default 450 (7.5h)
  bufferPercentage?: number; // Default 0.15 (15%)
  confirmedCollegeDates?: Set<string>; // Dates user confirmed attending
  confirmedLeaveDates?: Set<string>; // Dates user confirmed taking leave
  dayOverrides?: Map<string, { minutes: number; reason: string }>;
}

/**
 * Computes exact capacity and net minutes for any IST calendar date.
 */
export function computeDayCapacity(
  localDate: string,
  config: DayCapacityConfig = {}
): DayCapacity {
  const {
    holidayFocusedMinutes = 450,
    collegeDayFocusedMinutes = 105,
    offCollegeWeekdayFocusedMinutes = 450,
    bufferPercentage = 0.15,
    confirmedCollegeDates = new Set<string>(),
    confirmedLeaveDates = new Set<string>(),
    dayOverrides = new Map(),
  } = config;

  // 1. Check user override
  const override = dayOverrides.get(localDate);
  if (override !== undefined) {
    const bufferMin = Math.round(override.minutes * bufferPercentage);
    return {
      localDate,
      mode: "user_override",
      grossAvailableMinutes: override.minutes,
      bufferPercentage,
      bufferMinutes: bufferMin,
      netAvailableMinutes: Math.max(0, override.minutes - bufferMin),
      assignedMinutes: 0,
      remainingCapacityMinutes: Math.max(0, override.minutes - bufferMin),
      isLocked: false,
      userOverride: override,
    };
  }

  // 2. Check ESE Exam Lock (16 Nov - 27 Nov 2026) -> GATE = 0 minutes
  if (localDate >= "2026-11-16" && localDate <= "2026-11-27") {
    return {
      localDate,
      mode: "ese_only",
      grossAvailableMinutes: 420, // Dedicated exclusively to ESE
      bufferPercentage,
      bufferMinutes: Math.round(420 * bufferPercentage),
      netAvailableMinutes: Math.round(420 * (1 - bufferPercentage)),
      assignedMinutes: 0,
      remainingCapacityMinutes: Math.round(420 * (1 - bufferPercentage)),
      isLocked: true,
      lockReason: "End-Semester Examinations: Exclusively ESE studying; GATE=0 minutes.",
    };
  }

  // 3. Check LAEP presentation focus (21-22 Oct 2026)
  if (localDate >= "2026-10-21" && localDate <= "2026-10-22") {
    return {
      localDate,
      mode: "project",
      grossAvailableMinutes: 240,
      bufferPercentage,
      bufferMinutes: Math.round(240 * bufferPercentage),
      netAvailableMinutes: Math.round(240 * (1 - bufferPercentage)),
      assignedMinutes: 0,
      remainingCapacityMinutes: Math.round(240 * (1 - bufferPercentage)),
      isLocked: false,
      lockReason: "LAEP Presentation Window",
    };
  }

  // 4. Check College Practicals (26-27 Oct 2026)
  if (localDate >= "2026-10-26" && localDate <= "2026-10-27") {
    return {
      localDate,
      mode: "ese_prep",
      grossAvailableMinutes: 180,
      bufferPercentage,
      bufferMinutes: Math.round(180 * bufferPercentage),
      netAvailableMinutes: Math.round(180 * (1 - bufferPercentage)),
      assignedMinutes: 0,
      remainingCapacityMinutes: Math.round(180 * (1 - bufferPercentage)),
      isLocked: false,
      lockReason: "Practical Examinations",
    };
  }

  // 5. Check Holiday Mode (28 Nov 2026 - 10 Jan 2027)
  if (localDate >= "2026-11-28" && localDate <= "2027-01-10") {
    const gross = holidayFocusedMinutes;
    const bufferMin = Math.round(gross * bufferPercentage);
    return {
      localDate,
      mode: "gate_holiday",
      grossAvailableMinutes: gross,
      bufferPercentage,
      bufferMinutes: bufferMin,
      netAvailableMinutes: gross - bufferMin,
      assignedMinutes: 0,
      remainingCapacityMinutes: gross - bufferMin,
      isLocked: false,
    };
  }

  // 6. Check January College Resumption (11 Jan 2027 onward)
  if (localDate >= "2027-01-11") {
    const weekend = isWeekendIST(localDate);
    const holiday = OFFICIAL_PUBLIC_HOLIDAYS.has(localDate);

    // Holidays and weekends take precedence over normal weekday college capacities
    if (weekend || holiday) {
      // Unless explicitly user-confirmed college attendance event
      if (!confirmedCollegeDates.has(localDate)) {
        const gross = holidayFocusedMinutes;
        const bufferMin = Math.round(gross * bufferPercentage);
        return {
          localDate,
          mode: "gate_holiday",
          grossAvailableMinutes: gross,
          bufferPercentage,
          bufferMinutes: bufferMin,
          netAvailableMinutes: gross - bufferMin,
          assignedMinutes: 0,
          remainingCapacityMinutes: gross - bufferMin,
          isLocked: false,
          lockReason: holiday ? "Republic Day Public Holiday (26 Jan)" : "Weekend Holiday",
        };
      }
    }

    // Weekday during college term
    const isAttendingCollege = confirmedCollegeDates.has(localDate);
    const isTakingLeave = confirmedLeaveDates.has(localDate);

    if (isAttendingCollege || (!isTakingLeave && isAttendingCollege)) {
      // College day: ~4h commute deducted, home ~18:00, provisional 1.5 - 2h focused study
      const gross = collegeDayFocusedMinutes;
      const bufferMin = Math.round(gross * bufferPercentage);
      return {
        localDate,
        mode: "gate_college_day",
        grossAvailableMinutes: gross,
        bufferPercentage,
        bufferMinutes: bufferMin,
        netAvailableMinutes: gross - bufferMin,
        assignedMinutes: 0,
        remainingCapacityMinutes: gross - bufferMin,
        isLocked: false,
        lockReason: "College Working Day (~4h roundtrip commute; light evening study)",
      };
    } else {
      // Off-college self-study day (leave or non-attendance)
      const gross = offCollegeWeekdayFocusedMinutes;
      const bufferMin = Math.round(gross * bufferPercentage);
      return {
        localDate,
        mode: "gate_off_college_day",
        grossAvailableMinutes: gross,
        bufferPercentage,
        bufferMinutes: bufferMin,
        netAvailableMinutes: gross - bufferMin,
        assignedMinutes: 0,
        remainingCapacityMinutes: gross - bufferMin,
        isLocked: false,
        lockReason: "Off-College Self-Study Day",
      };
    }
  }

  // Default pre-exam standard weekday / weekend (28 Oct - 15 Nov 2026)
  const isWeekend = isWeekendIST(localDate);
  const gross = isWeekend ? holidayFocusedMinutes : 360;
  const bufferMin = Math.round(gross * bufferPercentage);
  return {
    localDate,
    mode: isWeekend ? "gate_holiday" : "ese_prep",
    grossAvailableMinutes: gross,
    bufferPercentage,
    bufferMinutes: bufferMin,
    netAvailableMinutes: gross - bufferMin,
    assignedMinutes: 0,
    remainingCapacityMinutes: gross - bufferMin,
    isLocked: false,
  };
}

/**
 * Validates whether a study task is eligible to be scheduled on a specific local date.
 * Returns { allowed: boolean, reason?: string }
 */
export function checkTaskEligibilityOnDate(
  task: StudyTask,
  localDate: string
): { allowed: boolean; reason?: string } {
  // 1. Aptitude eligibility lock: No General Aptitude tasks before 1 Dec 2026
  if (task.subjectId === "subj-aptitude" && localDate < "2026-12-01") {
    return {
      allowed: false,
      reason: "General Aptitude study starts December 2026, not before (Hard Lock).",
    };
  }

  // 2. ESE-Only lock: 16 Nov - 27 Nov 2026: GATE tasks are strictly banned
  if (localDate >= "2026-11-16" && localDate <= "2026-11-27") {
    if (task.type !== "ese") {
      return {
        allowed: false,
        reason: "GATE tasks are banned during End-Sem Exam period (16-27 Nov). Exclusively ESE tasks allowed.",
      };
    }
  }

  // 3. Project freeze lock: No project development tasks after 28 Oct 2026
  if (localDate > "2026-10-28") {
    if (task.subjectId.includes("project") || task.title.toLowerCase().includes("project work")) {
      return {
        allowed: false,
        reason: "Project work is frozen after 28 Oct (Hard Lock).",
      };
    }
  }

  // 4. Practical exams lock: 26-27 Oct 2026: No heavy 3h full-length mocks
  if (localDate >= "2026-10-26" && localDate <= "2026-10-27") {
    if (task.type === "mock") {
      return {
        allowed: false,
        reason: "Full-length mocks cannot be scheduled during practical exams window (26-27 Oct).",
      };
    }
  }

  // 5. LAEP presentation focus: 21-22 Oct 2026: No heavy 3h full-length mocks
  if (localDate >= "2026-10-21" && localDate <= "2026-10-22") {
    if (task.type === "mock") {
      return {
        allowed: false,
        reason: "Full-length mocks cannot be scheduled during LAEP presentation focus window (21-22 Oct).",
      };
    }
  }

  return { allowed: true };
}
