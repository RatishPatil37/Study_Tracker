import { NextRequest, NextResponse } from "next/server";
import { StudyOSRepository } from "@/data/storage";
import { computeDayCapacity } from "@/domain/calendar";
import { generateDateRangeIST, getTodayIST } from "@/domain/dates";
import { computeFeasibility } from "@/domain/forecasting";

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id") || "default-user";
    const repo = new StudyOSRepository(userId);

    const profile = repo.getProfile();
    const tasks = repo.getTasks();
    const courses = repo.getCourses();
    const assignments = repo.getAssignments();
    const activeSession = repo.getActiveSession();
    const mocks = repo.getMockTests();
    const errors = repo.getErrorItems();
    const attendance = repo.getAttendanceRecords();
    const dayOverridesList = repo.getDayOverrides();
    const planVersions = repo.getPlanVersions();

    // Build day overrides map
    const dayOverridesMap = new Map<string, { minutes: number; reason: string }>();
    for (const o of dayOverridesList) {
      dayOverridesMap.set(o.localDate, { minutes: o.minutes, reason: o.reason });
    }

    // Build confirmed college dates set from attendance records
    const confirmedCollegeDates = new Set<string>();
    const confirmedLeaveDates = new Set<string>();
    for (const rec of attendance) {
      if (rec.plannedAttendance) {
        confirmedCollegeDates.add(rec.localDate);
      } else {
        confirmedLeaveDates.add(rec.localDate);
      }
    }

    // Generate daily capacities for the entire planning window
    const today = getTodayIST();
    const startDate = "2026-10-21";
    const endDate = profile.targetExamDate || "2027-02-06";
    const dateRange = generateDateRangeIST(startDate, endDate);

    const dayCapacities = dateRange.map((date) =>
      computeDayCapacity(date, {
        confirmedCollegeDates,
        confirmedLeaveDates,
        dayOverrides: dayOverridesMap,
      })
    );

    // Compute live feasibility forecast
    const feasibility = computeFeasibility(tasks, dayCapacities, {
      currentLocalDate: today < startDate ? startDate : today,
      examDate: endDate,
    });

    return NextResponse.json({
      success: true,
      data: {
        today,
        profile,
        tasks,
        courses,
        assignments,
        activeSession,
        mocks,
        errors,
        attendance,
        dayOverrides: dayOverridesList,
        dayCapacities,
        feasibility,
        planVersions,
        questions: repo.getQuestionItems(),
        attempts: repo.getQuestionAttempts(),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load state" },
      { status: 500 }
    );
  }
}
