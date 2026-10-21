import { NextRequest, NextResponse } from "next/server";
import { StudyOSRepository } from "@/data/storage";

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id") || "default-user";
    const repo = new StudyOSRepository(userId);
    const body = await request.json();

    const created = repo.recordMockTest(body);
    return NextResponse.json({ success: true, data: created });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to record mock test" },
      { status: 500 }
    );
  }
}
