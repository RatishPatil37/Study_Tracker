/**
 * StudyOS Supabase Cloud Synchronization & Persistence Adapter
 * Dual-mode persistence layer bridging Next.js serverless runtimes with Supabase Postgres.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import dns from "dns";
import {
  AttendanceDayRecord,
  ErrorCategoryRecord,
  MockTestRecord,
  StudyTask,
} from "../domain/types";

try {
  dns.setDefaultResultOrder("ipv4first");
} catch {}

let supabaseAdmin: SupabaseClient | null = null;
let defaultUserId: string = "4a90a283-a833-43e6-b027-b63574c04926";
let subjectCodeToIdMap: Record<string, string> = {};

export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseAdmin) return supabaseAdmin;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key || url.includes("your-project-ref")) {
    return null;
  }

  supabaseAdmin = createClient(url, key, {
    auth: { persistSession: false },
  });

  return supabaseAdmin;
}

export async function ensureSupabaseBootstrapped(): Promise<string | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    // 1. Verify or create default student user in auth
    const { data: usersData } = await client.auth.admin.listUsers();
    let user = usersData?.users?.find((u) => u.email === "student@studyos.local") || undefined;

    if (!user) {
      const { data: newUser } = await client.auth.admin.createUser({
        email: "student@studyos.local",
        password: "studyos-secure-2027",
        email_confirm: true,
        user_metadata: { name: "GATE DA Student" },
      });
      user = newUser?.user || undefined;
    }

    if (user?.id) {
      defaultUserId = user.id;
    }

    // 2. Ensure profile exists
    await client.from("profiles").upsert(
      {
        id: defaultUserId,
        email: "student@studyos.local",
        timezone: "Asia/Kolkata",
        target_exam_date: "2027-02-06",
        target_score: 80,
        historical_baseline_score: 21,
        settings: { autoReplan: true },
      },
      { onConflict: "id" }
    );

    // 3. Ensure subjects exist and cache their UUIDs
    const subjects = [
      { user_id: defaultUserId, name: "Linear Algebra", code: "LA", category: "gate_core", baseline: "neutral" },
      { user_id: defaultUserId, name: "Probability & Statistics", code: "PS", category: "gate_core", baseline: "weak" },
      { user_id: defaultUserId, name: "Calculus & Optimization", code: "CALC", category: "gate_core", baseline: "neutral" },
      { user_id: defaultUserId, name: "Programming & DSA", code: "PY_DSA", category: "gate_core", baseline: "neutral" },
      { user_id: defaultUserId, name: "DBMS", code: "DBMS", category: "gate_core", baseline: "weak" },
      { user_id: defaultUserId, name: "Machine Learning", code: "ML", category: "gate_core", baseline: "neutral" },
      { user_id: defaultUserId, name: "Artificial Intelligence", code: "AI", category: "gate_core", baseline: "neutral" },
      { user_id: defaultUserId, name: "General Aptitude", code: "GA", category: "gate_general", baseline: "neutral" },
      { user_id: defaultUserId, name: "ESE University Subjects", code: "ESE", category: "ese_only", baseline: "neutral" },
    ];

    const { data: subData } = await client
      .from("subjects")
      .upsert(subjects, { onConflict: "user_id,code" })
      .select("id, code");

    if (subData) {
      for (const s of subData) {
        subjectCodeToIdMap[s.code] = s.id;
        // Map friendly subject IDs used in domain
        if (s.code === "LA") subjectCodeToIdMap["subj-linear-algebra"] = s.id;
        if (s.code === "PS") subjectCodeToIdMap["subj-prob-stats"] = s.id;
        if (s.code === "CALC") subjectCodeToIdMap["subj-calculus"] = s.id;
        if (s.code === "PY_DSA") subjectCodeToIdMap["subj-python-dsa"] = s.id;
        if (s.code === "DBMS") subjectCodeToIdMap["subj-dbms"] = s.id;
        if (s.code === "ML") subjectCodeToIdMap["subj-ml"] = s.id;
        if (s.code === "AI") subjectCodeToIdMap["subj-ai"] = s.id;
        if (s.code === "GA") subjectCodeToIdMap["subj-aptitude"] = s.id;
        if (s.code === "ESE") subjectCodeToIdMap["subj-ese"] = s.id;
      }
    }

    return defaultUserId;
  } catch (err: any) {
    console.warn("Supabase bootstrap warning:", err.message);
    return defaultUserId;
  }
}

export async function syncTaskToSupabase(task: StudyTask): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  try {
    const subjectUuid =
      subjectCodeToIdMap[task.subjectId] ||
      subjectCodeToIdMap["subj-linear-algebra"] ||
      defaultUserId;

    await client.from("study_tasks").upsert(
      {
        user_id: defaultUserId,
        title: task.title,
        subject_id: subjectUuid,
        type: task.type,
        estimated_minutes: task.estimatedMinutes,
        completed_minutes: task.completedMinutes,
        status: task.status,
        pinned: task.pinned,
        priority: task.priority,
        why: task.why || null,
        due_local_date: task.dueLocalDate || null,
        locked_to_date: task.lockedToDate || null,
      },
      { onConflict: "user_id,title" }
    );
  } catch (err) {
    // Non-blocking background sync
  }
}

export async function deleteTaskFromSupabase(taskId: string, title?: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  try {
    if (title) {
      await client.from("study_tasks").delete().eq("user_id", defaultUserId).eq("title", title);
    }
  } catch (err) {
    // Non-blocking
  }
}

export async function syncMockToSupabase(mock: MockTestRecord): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  try {
    await client.from("mock_tests").upsert(
      {
        user_id: defaultUserId,
        test_number: mock.testNumber,
        is_historical_baseline: mock.isHistoricalBaseline,
        test_date: mock.testDate,
        paper_source: mock.paperSource,
        raw_score: mock.rawScore,
        max_marks: mock.maxMarks,
        correct_count: mock.correctCount,
        incorrect_count: mock.incorrectCount,
        skipped_count: mock.skippedCount,
        negative_marks: mock.negativeMarks,
        time_spent_minutes: mock.timeSpentMinutes,
        analysis_completed: mock.analysisCompleted,
        analysis_notes: mock.analysisNotes || null,
      },
      { onConflict: "user_id,test_number,is_historical_baseline" }
    );
  } catch (err) {
    // Non-blocking
  }
}

export async function syncAttendanceToSupabase(record: AttendanceDayRecord): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  try {
    await client.from("attendance_records").upsert(
      {
        user_id: defaultUserId,
        local_date: record.localDate,
        is_working_day: record.isWorkingDay,
        planned_attendance: record.plannedAttendance,
        actual_attendance: record.actualAttendance,
        is_public_holiday: record.isPublicHoliday,
        commute_minutes: record.commuteMinutes,
        focused_study_capacity_minutes: record.focusedStudyCapacityMinutes,
        user_confirmed: record.userConfirmed,
      },
      { onConflict: "user_id,local_date" }
    );
  } catch (err) {
    // Non-blocking
  }
}

export async function syncErrorToSupabase(error: ErrorCategoryRecord): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  try {
    await client.from("error_items").insert({
      user_id: defaultUserId,
      question_ref: error.source,
      taxonomy_category: error.errorCategory,
      description: error.correctionNotes,
      review_count: error.attemptCount,
      next_review_date: error.nextReviewDate,
      status: error.status,
    });
  } catch (err) {
    // Non-blocking
  }
}

export async function syncDayOverrideToSupabase(override: {
  localDate: string;
  minutes: number;
  reason: string;
}): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  try {
    await client.from("day_capacity_overrides").upsert(
      {
        user_id: defaultUserId,
        local_date: override.localDate,
        minutes: override.minutes,
        reason: override.reason,
        approved: true,
      },
      { onConflict: "user_id,local_date" }
    );
  } catch (err) {
    // Non-blocking
  }
}
