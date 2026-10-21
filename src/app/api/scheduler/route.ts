import { NextRequest, NextResponse } from "next/server";
import { StudyOSRepository } from "@/data/storage";
import { computeDayCapacity } from "@/domain/calendar";
import { generateDateRangeIST, getTodayIST } from "@/domain/dates";
import { generateSchedulePlan } from "@/domain/scheduler";
import { PlanPreview } from "@/domain/types";

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id") || "default-user";
    const repo = new StudyOSRepository(userId);
    const body = await request.json();
    const { action, planPreview, targetVersion } = body;

    if (action === "preview") {
      const profile = repo.getProfile();
      const tasks = repo.getTasks();
      const existingAssignments = repo.getAssignments();
      const planVersions = repo.getPlanVersions();
      const attendance = repo.getAttendanceRecords();
      const dayOverridesList = repo.getDayOverrides();

      const dayOverridesMap = new Map<string, { minutes: number; reason: string }>();
      for (const o of dayOverridesList) {
        dayOverridesMap.set(o.localDate, { minutes: o.minutes, reason: o.reason });
      }

      const confirmedCollegeDates = new Set<string>();
      const confirmedLeaveDates = new Set<string>();
      for (const rec of attendance) {
        if (rec.plannedAttendance) {
          confirmedCollegeDates.add(rec.localDate);
        } else {
          confirmedLeaveDates.add(rec.localDate);
        }
      }

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

      const currentVersion = planVersions.length > 0 ? planVersions[planVersions.length - 1].version : 0;

      const preview = generateSchedulePlan({
        tasks,
        currentLocalDate: today < startDate ? startDate : today,
        examDate: endDate,
        dayCapacities,
        existingAssignments,
        currentPlanVersion: currentVersion,
      });

      return NextResponse.json({ success: true, data: preview });
    }

    if (action === "commit") {
      if (!planPreview) {
        return NextResponse.json({ success: false, error: "Missing planPreview to commit" }, { status: 400 });
      }
      repo.commitPlan(planPreview as PlanPreview);
      return NextResponse.json({ success: true, message: "Plan committed successfully" });
    }

    if (action === "rollback") {
      if (typeof targetVersion !== "number") {
        return NextResponse.json({ success: false, error: "Missing targetVersion" }, { status: 400 });
      }
      const success = repo.rollbackPlan(targetVersion);
      if (!success) {
        return NextResponse.json({ success: false, error: `Version ${targetVersion} not found` }, { status: 404 });
      }
      return NextResponse.json({ success: true, message: `Rolled back to plan version ${targetVersion}` });
    }

    return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Scheduler operation failed" },
      { status: 500 }
    );
  }
}
