import { describe, it, expect } from "vitest";
import {
  calculateEffectiveMinutes,
  calculateSelectedWorkload,
  SEED_COURSE_VARIANTS,
} from "../../src/domain/workload";
import {
  addDaysIST,
  diffDaysIST,
  formatDisplayDateIST,
  formatToISTDateString,
  getDayOfWeekIST,
  getTodayIST,
  isWeekendIST,
  parseISTDate,
} from "../../src/domain/dates";

describe("Workload and Multiplier Engine (Section 2)", () => {
  it("computes exactly 239 source runtime hours -> 413.5 effective elapsed hours with default crash course", () => {
    const workload = calculateSelectedWorkload(SEED_COURSE_VARIANTS);
    expect(workload.warnings).toHaveLength(0);
    expect(workload.totalSourceHours).toBe(239);
    expect(workload.totalEffectiveHours).toBe(413.5);
    expect(workload.activeCourseCount).toBe(8);
  });

  it("computes 296 source runtime hours -> 499 effective hours when full DBMS course is selected", () => {
    const fullDbmsVariants = SEED_COURSE_VARIANTS.map((c) => {
      if (c.id === "course-dbms-crash") return { ...c, selected: false };
      if (c.id === "course-dbms-full") return { ...c, selected: true };
      return c;
    });

    const workload = calculateSelectedWorkload(fullDbmsVariants);
    expect(workload.warnings).toHaveLength(0);
    expect(workload.totalSourceHours).toBe(296);
    expect(workload.totalEffectiveHours).toBe(499);
  });

  it("warns if both crash course and full course are activated simultaneously", () => {
    const bothActive = SEED_COURSE_VARIANTS.map((c) => {
      if (c.id === "course-dbms-full") return { ...c, selected: true };
      return c;
    });

    const workload = calculateSelectedWorkload(bothActive);
    expect(workload.warnings.length).toBeGreaterThan(0);
    expect(workload.warnings[0]).toContain("DUPLICATE COURSE SELECTION");
  });

  it("multiplies source runtime directly by multiplier without dividing by playback speed", () => {
    // 35 hours * 2.0 = 70 hours = 4200 minutes
    const effective = calculateEffectiveMinutes(35 * 60, 2.0);
    expect(effective).toBe(4200);

    // Negative minutes throws error
    expect(() => calculateEffectiveMinutes(-10, 1.5)).toThrow();
    // Multiplier below 1.0 throws error
    expect(() => calculateEffectiveMinutes(60, 0.5)).toThrow();
  });
});

describe("IST Date Arithmetic (Section 1 & 8)", () => {
  it("preserves exact calendar date in Asia/Kolkata timezone", () => {
    const d = parseISTDate("2026-10-21");
    expect(formatToISTDateString(d)).toBe("2026-10-21");
  });

  it("adds days accurately across month and year boundaries", () => {
    expect(addDaysIST("2026-10-21", 1)).toBe("2026-10-22");
    expect(addDaysIST("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDaysIST("2026-12-31", 1)).toBe("2027-01-01");
    expect(diffDaysIST("2026-10-21", "2027-02-06")).toBe(108);
  });

  it("accurately identifies weekends and day of week in IST", () => {
    // 2026-10-21 is Wednesday (3)
    expect(getDayOfWeekIST("2026-10-21")).toBe(3);
    expect(isWeekendIST("2026-10-21")).toBe(false);

    // 2026-10-24 is Saturday (6)
    expect(getDayOfWeekIST("2026-10-24")).toBe(6);
    expect(isWeekendIST("2026-10-24")).toBe(true);

    // 2026-10-25 is Sunday (0)
    expect(getDayOfWeekIST("2026-10-25")).toBe(0);
    expect(isWeekendIST("2026-10-25")).toBe(true);

    // 2027-01-26 is Tuesday (2), India Republic Day public holiday
    expect(getDayOfWeekIST("2027-01-26")).toBe(2);
    expect(isWeekendIST("2027-01-26")).toBe(false);
  });
});
