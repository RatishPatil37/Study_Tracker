import { NextRequest, NextResponse } from "next/server";
import { StudyOSRepository } from "@/data/storage";

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id") || "default-user";
    const repo = new StudyOSRepository(userId);
    const body = await request.json();

    const created = repo.recordErrorItem(body);
    return NextResponse.json({ success: true, data: created });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to record error item" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id") || "default-user";
    const repo = new StudyOSRepository(userId);
    const body = await request.json();
    const { id, isSuccess } = body;

    if (!id || typeof isSuccess !== "boolean") {
      return NextResponse.json({ success: false, error: "Missing id or isSuccess boolean" }, { status: 400 });
    }

    const reviewed = repo.reviewErrorItem(id, isSuccess);
    return NextResponse.json({ success: true, data: reviewed });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to review error item" },
      { status: 500 }
    );
  }
}
