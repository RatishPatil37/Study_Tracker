import { NextRequest, NextResponse } from "next/server";
import { StudyOSRepository } from "@/data/storage";

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id") || "default-user";
    const repo = new StudyOSRepository(userId);
    const body = await request.json();
    const { schemaVersion, data, dryRun = false } = body;

    if (schemaVersion !== "1.0.0" || !data) {
      return NextResponse.json(
        { success: false, error: "Invalid backup format or unsupported schema version" },
        { status: 400 }
      );
    }

    // Dry run analysis
    const taskCount = data.tasks?.length || 0;
    const mockCount = data.mocks?.length || 0;
    const errorCount = data.errors?.length || 0;
    const sessionCount = data.sessions?.length || 0;

    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        analysis: {
          taskCount,
          mockCount,
          errorCount,
          sessionCount,
          warnings: taskCount === 0 ? ["Import payload contains 0 tasks."] : [],
        },
      });
    }

    const result = repo.importAllData({ schemaVersion, data });
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to import backup data" },
      { status: 500 }
    );
  }
}
