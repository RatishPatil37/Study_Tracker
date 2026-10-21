import { NextRequest, NextResponse } from "next/server";
import { StudyOSRepository } from "@/data/storage";

export async function PUT(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id") || "default-user";
    const repo = new StudyOSRepository(userId);
    const body = await request.json();
    const { date, plannedAttendance, actualAttendance, userConfirmed } = body;

    if (!date) {
      return NextResponse.json({ success: false, error: "Missing local date" }, { status: 400 });
    }

    const updates: any = {};
    if (typeof plannedAttendance === "boolean") {
      updates.plannedAttendance = plannedAttendance;
      // Also update study capacity according to college vs off-college day
      updates.focusedStudyCapacityMinutes = plannedAttendance ? 105 : 450;
    }
    if (typeof actualAttendance === "boolean" || actualAttendance === null) {
      updates.actualAttendance = actualAttendance;
    }
    if (typeof userConfirmed === "boolean") {
      updates.userConfirmed = userConfirmed;
    }

    repo.updateAttendanceRecord(date, updates);
    return NextResponse.json({ success: true, message: `Attendance for ${date} updated` });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update attendance" },
      { status: 500 }
    );
  }
}
