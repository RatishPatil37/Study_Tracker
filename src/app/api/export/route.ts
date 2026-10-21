import { NextRequest, NextResponse } from "next/server";
import { StudyOSRepository } from "@/data/storage";

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id") || "default-user";
    const repo = new StudyOSRepository(userId);
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "json";

    const exportPayload = repo.exportAllData();

    // Redact any sensitive internal keys or secrets
    if (exportPayload.data.profile.settings) {
      delete (exportPayload.data.profile.settings as any).geminiApiKey;
    }

    if (format === "csv") {
      const type = searchParams.get("type") || "tasks";
      let csv = "";

      if (type === "tasks") {
        csv = "id,type,subjectId,title,estimatedMinutes,completedMinutes,status,priority,pinned\n";
        for (const t of exportPayload.data.tasks) {
          csv += `"${t.id}","${t.type}","${t.subjectId}","${t.title.replace(/"/g, '""')}",${t.estimatedMinutes},${t.completedMinutes},"${t.status}",${t.priority},${t.pinned}\n`;
        }
      } else if (type === "mocks") {
        csv = "id,testNumber,isHistorical,testDate,paperSource,rawScore,maxMarks,correct,incorrect,skipped,analysisDone\n";
        for (const m of exportPayload.data.mocks) {
          csv += `"${m.id}",${m.testNumber},${m.isHistoricalBaseline},"${m.testDate}","${m.paperSource.replace(/"/g, '""')}",${m.rawScore},${m.maxMarks},${m.correctCount},${m.incorrectCount},${m.skippedCount},${m.analysisCompleted}\n`;
        }
      } else if (type === "sessions") {
        csv = "id,taskId,startAt,endAt,actualSeconds,pausedSeconds,source\n";
        for (const s of exportPayload.data.sessions) {
          csv += `"${s.id}","${s.taskId || ""}","${s.startAt}","${s.endAt || ""}",${s.actualSeconds},${s.pausedSeconds},"${s.source}"\n`;
        }
      }

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename=studyos-${type}.csv`,
        },
      });
    }

    return NextResponse.json(exportPayload);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to export data" },
      { status: 500 }
    );
  }
}
