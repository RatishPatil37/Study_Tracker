import { NextRequest, NextResponse } from "next/server";
import { StudyOSRepository } from "@/data/storage";

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id") || "default-user";
    const repo = new StudyOSRepository(userId);
    const body = await request.json();
    const { localDate, minutes, reason } = body;

    if (!localDate || typeof minutes !== "number" || !reason) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: localDate, minutes, reason" },
        { status: 400 }
      );
    }

    if (minutes < 0 || minutes > 1440) {
      return NextResponse.json(
        { success: false, error: "Minutes must be between 0 and 1440 (24h)" },
        { status: 400 }
      );
    }

    repo.setDayOverride(localDate, minutes, reason);
    return NextResponse.json({ success: true, message: `Capacity override for ${localDate} set to ${minutes}m` });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to set capacity override" },
      { status: 500 }
    );
  }
}
