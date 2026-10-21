import { describe, it, expect } from "vitest";
import {
  checkTaskEligibilityOnDate,
  computeDayCapacity,
  deriveJanuaryAttendanceGrid,
} from "../../src/domain/calendar";
import { StudyTask } from "../../src/domain/types";

describe("Academic Calendar & Attendance Grid (Section 1 & 4.9)", () => {
  it("derives exact January institutional working days by checking calendar, skipping weekends and Jan 26", () => {
    const grid = deriveJanuaryAttendanceGrid("2027-01-11", "2027-02-05");

    // Must be 19 actual institutional working days in this interval
    expect(grid.totalInstitutionalWorkingDays).toBe(19);

    // Alternating days: 10 attended, 9 leave
    expect(grid.totalProposedAttendedDays).toBe(10);
    expect(grid.totalProposedLeaveDays).toBe(9);

    // Verify 26 Jan 2027 is marked as holiday and NOT an institutional working day
    const republicDay = grid.days.find((d) => d.date === "2027-01-26");
    expect(republicDay).toBeDefined();
    expect(republicDay?.isHoliday).toBe(true);
    expect(republicDay?.isInstitutionalWorkingDay).toBe(false);
    expect(republicDay?.proposedAttendance).toBe(false);

    // Verify weekends are NOT institutional working days
    const weekendDay = grid.days.find((d) => d.date === "2027-01-16");
    expect(weekendDay).toBeDefined();
    expect(weekendDay?.isWeekend).toBe(true);
    expect(weekendDay?.isInstitutionalWorkingDay).toBe(false);
  });

  it("applies holiday & weekend precedence for January capacity", () => {
    // 26 Jan is public holiday -> holiday capacity (450m - buffer)
    const holidayCap = computeDayCapacity("2027-01-26");
    expect(holidayCap.mode).toBe("gate_holiday");
    expect(holidayCap.grossAvailableMinutes).toBe(450);
    expect(holidayCap.netAvailableMinutes).toBe(382); // 450 - 15% buffer (68m) = 382m

    // Sunday 17 Jan is weekend -> holiday capacity
    const weekendCap = computeDayCapacity("2027-01-17");
    expect(weekendCap.mode).toBe("gate_holiday");
    expect(weekendCap.grossAvailableMinutes).toBe(450);
  });

  it("allocates light study capacity (105 min gross) on confirmed college attendance days", () => {
    const collegeCap = computeDayCapacity("2027-01-11", {
      confirmedCollegeDates: new Set(["2027-01-11"]),
    });
    expect(collegeCap.mode).toBe("gate_college_day");
    expect(collegeCap.grossAvailableMinutes).toBe(105);
    expect(collegeCap.netAvailableMinutes).toBeLessThan(105);
    expect(collegeCap.lockReason).toContain("College Working Day");
  });
});

describe("Hard Calendar Locks (Section 1 & 7)", () => {
  const dummyTask: StudyTask = {
    id: "task-1",
    userId: "user-1",
    type: "video",
    subjectId: "subj-prob-stats",
    title: "Probability Lecture 1",
    estimatedMinutes: 90,
    completedMinutes: 0,
    status: "todo",
    pinned: false,
    priority: 1,
    prerequisites: [],
    createdAt: "2026-10-21T00:00:00Z",
    updatedAt: "2026-10-21T00:00:00Z",
  };

  it("strictly bans GATE tasks during ESE exam period (16-27 Nov)", () => {
    // GATE video task on 18 Nov must be blocked
    const result = checkTaskEligibilityOnDate(dummyTask, "2026-11-18");
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("GATE tasks are banned during End-Sem Exam period");

    // ESE task on 18 Nov must be allowed
    const eseTask: StudyTask = { ...dummyTask, type: "ese", subjectId: "subj-ese-dmm" };
    const eseResult = checkTaskEligibilityOnDate(eseTask, "2026-11-18");
    expect(eseResult.allowed).toBe(true);
  });

  it("strictly bans General Aptitude tasks before 1 Dec 2026", () => {
    const aptitudeTask: StudyTask = {
      ...dummyTask,
      subjectId: "subj-aptitude",
      title: "GA Marathon 1",
    };

    // 25 Nov must be blocked
    const resultNov = checkTaskEligibilityOnDate(aptitudeTask, "2026-11-25");
    expect(resultNov.allowed).toBe(false);
    expect(resultNov.reason).toContain("General Aptitude study starts December 2026");

    // 1 Dec must be allowed
    const resultDec = checkTaskEligibilityOnDate(aptitudeTask, "2026-12-01");
    expect(resultDec.allowed).toBe(true);
  });

  it("freezes project development work after 28 Oct 2026", () => {
    const projectTask: StudyTask = {
      ...dummyTask,
      subjectId: "subj-project-laep",
      title: "Project work: LAEP implementation",
    };

    // 28 Oct allowed
    expect(checkTaskEligibilityOnDate(projectTask, "2026-10-28").allowed).toBe(true);

    // 29 Oct blocked
    const resultPost = checkTaskEligibilityOnDate(projectTask, "2026-10-29");
    expect(resultPost.allowed).toBe(false);
    expect(resultPost.reason).toContain("Project work is frozen after 28 Oct");
  });
});
