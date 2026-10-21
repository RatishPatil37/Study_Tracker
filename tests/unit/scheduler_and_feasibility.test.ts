import { describe, it, expect } from "vitest";
import { generateSchedulePlan } from "../../src/domain/scheduler";
import { computeDayCapacity } from "../../src/domain/calendar";
import { generateDateRangeIST } from "../../src/domain/dates";
import { DayCapacity, StudyTask } from "../../src/domain/types";

describe("Deterministic Adaptive Replanner & Feasibility Engine (Section 3)", () => {
  // Setup 14 days of realistic capacities from 21 Oct to 3 Nov 2026
  const dateRange = generateDateRangeIST("2026-10-21", "2026-11-03");
  const dayCapacities: DayCapacity[] = dateRange.map((date) => computeDayCapacity(date));

  const sampleTasks: StudyTask[] = [
    {
      id: "task-la-1",
      userId: "user-1",
      type: "video",
      subjectId: "subj-linear-algebra",
      title: "Linear Algebra: Eigenvalues & Vectors",
      estimatedMinutes: 180, // Needs chunking (180 > 120)
      completedMinutes: 0,
      status: "todo",
      pinned: false,
      priority: 2,
      prerequisites: [],
      createdAt: "2026-10-21T00:00:00Z",
      updatedAt: "2026-10-21T00:00:00Z",
    },
    {
      id: "task-prob-1",
      userId: "user-1",
      type: "video",
      subjectId: "subj-prob-stats", // Weak subject -> higher priority
      title: "Probability: Permutations & Combinations Core",
      estimatedMinutes: 120,
      completedMinutes: 0,
      status: "todo",
      pinned: false,
      priority: 2,
      prerequisites: [],
      createdAt: "2026-10-21T00:00:00Z",
      updatedAt: "2026-10-21T00:00:00Z",
    },
    {
      id: "task-mock-1",
      userId: "user-1",
      type: "mock",
      subjectId: "subj-gate-mock",
      title: "GATE DA Full-Length Mock 1",
      estimatedMinutes: 180, // Must remain 180 min uninterrupted
      completedMinutes: 0,
      status: "todo",
      pinned: false,
      priority: 1,
      prerequisites: [],
      createdAt: "2026-10-21T00:00:00Z",
      updatedAt: "2026-10-21T00:00:00Z",
    },
  ];

  it("is 100% deterministic: identical inputs produce identical assignments", () => {
    const plan1 = generateSchedulePlan({
      tasks: sampleTasks,
      currentLocalDate: "2026-10-21",
      examDate: "2026-11-03",
      dayCapacities,
    });

    const plan2 = generateSchedulePlan({
      tasks: sampleTasks,
      currentLocalDate: "2026-10-21",
      examDate: "2026-11-03",
      dayCapacities,
    });

    expect(plan1.assignments).toEqual(plan2.assignments);
    expect(plan1.unscheduledTasks).toEqual(plan2.unscheduledTasks);
    expect(plan1.feasibility.surplusOrDeficitMinutes).toBe(plan2.feasibility.surplusOrDeficitMinutes);
  });

  it("strictly enforces daily net capacity invariant: assigned minutes never exceed net available minutes", () => {
    const plan = generateSchedulePlan({
      tasks: sampleTasks,
      currentLocalDate: "2026-10-21",
      examDate: "2026-11-03",
      dayCapacities,
    });

    // Group assigned minutes by date
    const assignedByDate: Record<string, number> = {};
    for (const a of plan.assignments) {
      assignedByDate[a.localDate] = (assignedByDate[a.localDate] || 0) + a.plannedMinutes;
    }

    for (const cap of plan.dayCapacities) {
      const assigned = assignedByDate[cap.localDate] || 0;
      expect(assigned).toBeLessThanOrEqual(cap.netAvailableMinutes);
    }
  });

  it("chunks regular 180-minute study tasks into chunks <= 120 minutes", () => {
    const plan = generateSchedulePlan({
      tasks: sampleTasks,
      currentLocalDate: "2026-10-21",
      examDate: "2026-11-03",
      dayCapacities,
    });

    const laAssignments = plan.assignments.filter((a) => a.taskId === "task-la-1");
    expect(laAssignments.length).toBeGreaterThanOrEqual(2);
    for (const a of laAssignments) {
      expect(a.plannedMinutes).toBeLessThanOrEqual(120);
    }
  });

  it("allocates full-length mocks as exactly 180-minute atomic uninterrupted sessions", () => {
    const plan = generateSchedulePlan({
      tasks: sampleTasks,
      currentLocalDate: "2026-10-21",
      examDate: "2026-11-03",
      dayCapacities,
    });

    const mockAssignments = plan.assignments.filter((a) => a.taskId === "task-mock-1");
    expect(mockAssignments.length).toBe(1);
    expect(mockAssignments[0].plannedMinutes).toBe(180);
  });

  it("prioritizes weak subjects (Probability & Statistics) earlier than regular subjects", () => {
    const plan = generateSchedulePlan({
      tasks: sampleTasks,
      currentLocalDate: "2026-10-21",
      examDate: "2026-11-03",
      dayCapacities,
    });

    const firstProbAssignment = plan.assignments.find((a) => a.taskId === "task-prob-1");
    expect(firstProbAssignment).toBeDefined();
    // Prob & Stats should be placed on the earliest available day (2026-10-21)
    expect(firstProbAssignment?.localDate).toBe("2026-10-21");
  });

  it("preserves manual pinned tasks on their locked dates without moving them", () => {
    const pinnedTask: StudyTask = {
      ...sampleTasks[0],
      id: "task-pinned-1",
      pinned: true,
      lockedToDate: "2026-10-25",
    };

    const existingPinnedAssignment = {
      id: "asgn-pinned",
      userId: "user-1",
      taskId: "task-pinned-1",
      localDate: "2026-10-25",
      plannedMinutes: 120,
      planVersion: 1,
      status: "todo" as const,
      why: "Manual pin",
    };

    const plan = generateSchedulePlan({
      tasks: [pinnedTask, ...sampleTasks.slice(1)],
      currentLocalDate: "2026-10-21",
      examDate: "2026-11-03",
      dayCapacities,
      existingAssignments: [existingPinnedAssignment],
    });

    const pinnedResult = plan.assignments.find((a) => a.taskId === "task-pinned-1");
    expect(pinnedResult).toBeDefined();
    expect(pinnedResult?.localDate).toBe("2026-10-25");
    expect(pinnedResult?.why).toContain("pinned");
  });

  it("honestly leaves excess tasks in unscheduled backlog and flags infeasible when overloaded", () => {
    // Single 1-day capacity of 100 net minutes
    const singleDayCap: DayCapacity = {
      localDate: "2026-10-21",
      mode: "gate_college_day",
      grossAvailableMinutes: 105,
      bufferPercentage: 0.15,
      bufferMinutes: 15,
      netAvailableMinutes: 90,
      assignedMinutes: 0,
      remainingCapacityMinutes: 90,
      isLocked: false,
    };

    // Demand: 400 minutes of work
    const heavyTasks: StudyTask[] = [
      {
        ...sampleTasks[0],
        estimatedMinutes: 400,
      },
    ];

    const plan = generateSchedulePlan({
      tasks: heavyTasks,
      currentLocalDate: "2026-10-21",
      examDate: "2026-10-21",
      dayCapacities: [singleDayCap],
    });

    expect(plan.unscheduledTasks.length).toBe(1);
    expect(plan.unscheduledTasks[0].reason).toContain("Insufficient net study capacity");
    expect(plan.conflicts.length).toBeGreaterThan(0);
    expect(plan.feasibility.status).toBe("infeasible");
    expect(plan.feasibility.surplusOrDeficitMinutes).toBeLessThan(0);
  });
});
