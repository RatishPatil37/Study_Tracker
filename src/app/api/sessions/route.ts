import { NextRequest, NextResponse } from "next/server";
import { StudyOSRepository } from "@/data/storage";

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id") || "default-user";
    const repo = new StudyOSRepository(userId);
    const body = await request.json();
    const { action, taskId, actualSeconds } = body;

    if (action === "start") {
      const session = repo.startSession(taskId);
      return NextResponse.json({ success: true, data: session });
    }

    if (action === "pause") {
      repo.pauseSession();
      return NextResponse.json({ success: true, message: "Session paused" });
    }

    if (action === "resume") {
      repo.resumeSession();
      return NextResponse.json({ success: true, message: "Session resumed" });
    }

    if (action === "end") {
      const result = repo.endSession(actualSeconds);
      return NextResponse.json({ success: true, data: result });
    }

    return NextResponse.json({ success: false, error: `Invalid session action: ${action}` }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed session operation" },
      { status: 500 }
    );
  }
}
