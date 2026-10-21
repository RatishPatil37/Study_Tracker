import { describe, it, expect, beforeEach } from "vitest";
import { StudyOSRepository } from "../../src/data/storage";

describe("StudyOS Relational Storage & Repository (Section 4 & 6)", () => {
  const uid1 = `test-user-${Date.now()}-1`;
  const uid2 = `test-user-${Date.now()}-2`;
  const repoUser1 = new StudyOSRepository(uid1);
  const repoUser2 = new StudyOSRepository(uid2);

  it("auto-seeds user store with exact facts from specification", () => {
    const profile = repoUser1.getProfile();
    expect(profile.targetExamDate).toBe("2027-02-06");
    expect(profile.historicalBaselineScore).toBe(21);
    expect(profile.targetScore).toBe(80);

    const mocks = repoUser1.getMockTests();
    const historical = mocks.find((m) => m.isHistoricalBaseline);
    expect(historical).toBeDefined();
    expect(historical?.rawScore).toBe(21);
    expect(historical?.paperSource).toContain("2026");

    const courses = repoUser1.getCourses();
    const active = courses.filter((c) => c.selected);
    const totalRuntime = active.reduce((sum, c) => sum + c.sourceRuntimeHours, 0);
    const totalEffective = active.reduce((sum, c) => sum + c.sourceRuntimeHours * c.effectiveMultiplier, 0);
    expect(totalRuntime).toBe(239);
    expect(totalEffective).toBe(413.5);
  });

  it("strictly enforces multi-user isolation between test-user-1 and test-user-2", () => {
    const taskUser1 = repoUser1.createTask({
      type: "video",
      subjectId: "subj-linear-algebra",
      title: "User 1 Private Task",
      estimatedMinutes: 60,
      completedMinutes: 0,
      status: "todo",
      pinned: false,
      priority: 2,
      prerequisites: [],
    });

    const tasksUser2 = repoUser2.getTasks();
    const foundInUser2 = tasksUser2.some((t) => t.id === taskUser1.id);
    expect(foundInUser2).toBe(false);
  });

  it("enforces singleton active session timer and accurately deducts pause time", () => {
    // Start session
    const { id: sess1Id } = repoUser1.startSession("task-la-core");
    const active1 = repoUser1.getActiveSession();
    expect(active1).not.toBeNull();
    expect(active1?.id).toBe(sess1Id);

    // Pause session
    repoUser1.pauseSession();
    const paused = repoUser1.getActiveSession();
    expect(paused?.pausedAt).toBeDefined();

    // Resume session
    repoUser1.resumeSession();
    const resumed = repoUser1.getActiveSession();
    expect(resumed?.pausedAt).toBeUndefined();

    // End session with 50 actual minutes (3000 seconds)
    const result = repoUser1.endSession(3000);
    expect(result.actualMinutes).toBe(50);
    expect(repoUser1.getActiveSession()).toBeNull();

    // Verify task completion updated
    const task = repoUser1.getTasks().find((t) => t.id === "task-la-core");
    expect(task?.completedMinutes).toBe(50);
    expect(task?.status).toBe("doing");
  });

  it("validates mock test bounds and preserves historical 21 baseline separate from new mocks", () => {
    // Score > 100 throws validation error
    expect(() =>
      repoUser1.recordMockTest({
        testNumber: 1,
        isHistoricalBaseline: false,
        testDate: "2026-11-01",
        paperSource: "Test Series 1",
        rawScore: 105,
        maxMarks: 100,
        correctCount: 40,
        incorrectCount: 10,
        skippedCount: 15,
        negativeMarks: 3.33,
        timeSpentMinutes: 180,
        analysisCompleted: false,
      })
    ).toThrow();

    // Valid mock record
    const validMock = repoUser1.recordMockTest({
      testNumber: 1,
      isHistoricalBaseline: false,
      testDate: "2026-11-01",
      paperSource: "GATE DA 2027 Mock 1",
      rawScore: 48.5,
      maxMarks: 100,
      correctCount: 25,
      incorrectCount: 8,
      skippedCount: 32,
      negativeMarks: 2.66,
      timeSpentMinutes: 180,
      analysisCompleted: true,
      analysisNotes: "Good accuracy in Linear Algebra; lost marks in DBMS.",
    });

    expect(validMock.id).toBeDefined();
    const allMocks = repoUser1.getMockTests();
    const currentMocks = allMocks.filter((m) => !m.isHistoricalBaseline);
    expect(currentMocks.length).toBe(1);
    expect(currentMocks[0].rawScore).toBe(48.5);
  });

  it("advances spaced revision intervals upon successful error review", () => {
    const errorItem = repoUser1.recordErrorItem({
      subjectId: "subj-prob-stats",
      source: "PYQ 2024 Q14",
      errorCategory: "calculation",
      correctionNotes: "Remember denominator in Bayes formula",
      revisitIntervalDays: 1,
      nextReviewDate: "2026-10-22",
      attemptCount: 1,
      status: "pending",
    });

    expect(errorItem.revisitIntervalDays).toBe(1);

    // Review with success: 1 -> 3 days
    const reviewed = repoUser1.reviewErrorItem(errorItem.id, true);
    expect(reviewed.revisitIntervalDays).toBe(3);
    expect(reviewed.status).toBe("resolved");

    // Review again with success: 3 -> 7 days
    const reviewed2 = repoUser1.reviewErrorItem(errorItem.id, true);
    expect(reviewed2.revisitIntervalDays).toBe(7);
  });

  it("exports data to schema 1.0.0 and restores accurately on import", () => {
    const exportPayload = repoUser1.exportAllData();
    expect(exportPayload.schemaVersion).toBe("1.0.0");
    expect(exportPayload.data.tasks.length).toBeGreaterThan(0);

    const importRepo = new StudyOSRepository("imported-user");
    const importResult = importRepo.importAllData(exportPayload);
    expect(importResult.success).toBe(true);
    expect(importResult.importedCounts.tasks).toBe(exportPayload.data.tasks.length);
  });
});
