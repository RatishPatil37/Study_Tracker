/**
 * StudyOS Frontend API Client
 * Typed communication with Next.js App Router API endpoints.
 */

import {
  AttendanceDayRecord,
  ErrorCategoryRecord,
  MockTestRecord,
  PlanPreview,
  QuestionAttempt,
  StudyTask,
} from "@/domain/types";

export interface AppStateData {
  today: string;
  profile: any;
  tasks: StudyTask[];
  courses: any[];
  assignments: any[];
  activeSession: any;
  mocks: MockTestRecord[];
  errors: ErrorCategoryRecord[];
  attendance: AttendanceDayRecord[];
  dayOverrides: any[];
  dayCapacities: any[];
  feasibility: any;
  planVersions: any[];
  questions?: any[];
  attempts?: QuestionAttempt[];
}

export async function fetchAppState(): Promise<AppStateData> {
  const res = await fetch("/api/state", { cache: "no-store" });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "Failed to load state");
  return json.data;
}

export async function previewSchedulePlan(): Promise<PlanPreview> {
  const res = await fetch("/api/scheduler", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "preview" }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "Failed to preview plan");
  return json.data;
}

export async function commitSchedulePlan(planPreview: PlanPreview): Promise<void> {
  const res = await fetch("/api/scheduler", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "commit", planPreview }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "Failed to commit plan");
}

export async function rollbackSchedulePlan(targetVersion: number): Promise<void> {
  const res = await fetch("/api/scheduler", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "rollback", targetVersion }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "Failed to rollback plan");
}

export async function createTask(task: Partial<StudyTask>): Promise<StudyTask> {
  const res = await fetch("/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(task),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "Failed to create task");
  return json.data;
}

export async function updateTask(id: string, updates: Partial<StudyTask>): Promise<StudyTask> {
  const res = await fetch("/api/tasks", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, ...updates }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "Failed to update task");
  return json.data;
}

export async function deleteTask(id: string): Promise<void> {
  const res = await fetch(`/api/tasks?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "Failed to delete task");
}

export async function controlSession(
  action: "start" | "pause" | "resume" | "end",
  options?: { taskId?: string; actualSeconds?: number }
): Promise<any> {
  const res = await fetch("/api/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...options }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "Session control failed");
  return json.data;
}

export async function recordMockTest(mock: Partial<MockTestRecord>): Promise<MockTestRecord> {
  const res = await fetch("/api/mocks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(mock),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "Failed to record mock");
  return json.data;
}

export async function recordErrorItem(error: Partial<ErrorCategoryRecord>): Promise<ErrorCategoryRecord> {
  const res = await fetch("/api/errors", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(error),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "Failed to record error item");
  return json.data;
}

export async function reviewErrorItem(id: string, isSuccess: boolean): Promise<ErrorCategoryRecord> {
  const res = await fetch("/api/errors", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, isSuccess }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "Failed to review error item");
  return json.data;
}

export async function updateAttendance(
  date: string,
  options: { plannedAttendance?: boolean; actualAttendance?: boolean | null; userConfirmed?: boolean }
): Promise<void> {
  const res = await fetch("/api/attendance", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ date, ...options }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "Failed to update attendance");
}

export async function setDayCapacityOverride(
  localDate: string,
  minutes: number,
  reason: string
): Promise<void> {
  const res = await fetch("/api/overrides", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ localDate, minutes, reason }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "Failed to set day override");
}

export async function askGeminiAssistant(prompt: string, model?: string): Promise<any> {
  const res = await fetch("/api/gemini", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, model }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "Failed to contact Gemini");
  return json.data;
}
