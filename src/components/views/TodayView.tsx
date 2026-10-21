"use client";

import React from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Play,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { AppStateData, controlSession, updateTask } from "@/lib/api";
import { formatDisplayDateIST } from "@/domain/dates";
import { StudyTask } from "@/domain/types";

interface TodayViewProps {
  appState: AppStateData;
  onRefresh: () => void;
  onNavigate: (tab: string) => void;
}

export function TodayView({ appState, onRefresh, onNavigate }: TodayViewProps) {
  const { today, tasks, assignments, dayCapacities, feasibility, mocks } = appState;

  // Find today's capacity
  const todayCap = dayCapacities.find((c) => c.localDate === today) || dayCapacities[0];

  // Find tasks assigned to today or top uncompleted priority tasks
  const todayAssignments = assignments.filter((a) => a.localDate === today);
  const assignedTaskIds = new Set(todayAssignments.map((a) => a.taskId));

  const priorityTasks: StudyTask[] = [];
  // First add tasks assigned to today
  for (const taskId of assignedTaskIds) {
    const t = tasks.find((item) => item.id === taskId);
    if (t && t.status !== "done") priorityTasks.push(t);
  }
  // If fewer than 3, add top priority incomplete tasks
  if (priorityTasks.length < 3) {
    const remainingTasks = tasks
      .filter((t) => t.status !== "done" && !priorityTasks.some((pt) => pt.id === t.id))
      .sort((a, b) => a.priority - b.priority);
    for (const t of remainingTasks) {
      if (priorityTasks.length >= 3) break;
      priorityTasks.push(t);
    }
  }

  // Count due / overdue tasks
  const overdueTasks = tasks.filter(
    (t) => t.status !== "done" && t.dueLocalDate && t.dueLocalDate < today
  );

  // Current mock target calculation (12 core target)
  const coreMocksCompleted = mocks.filter((m) => !m.isHistoricalBaseline).length;

  const handleToggleTaskDone = async (task: StudyTask) => {
    try {
      const newStatus = task.status === "done" ? "todo" : "done";
      await updateTask(task.id, {
        status: newStatus,
        completedMinutes: newStatus === "done" ? task.estimatedMinutes : 0,
      });
      onRefresh();
    } catch (err: any) {
      alert(`Failed to update task: ${err.message}`);
    }
  };

  const handleStartTask = async (taskId: string) => {
    try {
      await controlSession("start", { taskId });
      onRefresh();
    } catch (err: any) {
      alert(`Failed to start session: ${err.message}`);
    }
  };

  // Format mode for human readability
  const getModeLabel = (mode: string) => {
    switch (mode) {
      case "project": return "Project Focus (LAEP Presentation)";
      case "ese_prep": return "ESE Preparation Window";
      case "ese_only": return "End-Sem Exam Window (GATE=0m)";
      case "gate_holiday": return "Holiday Mode (7.5h Study Target)";
      case "gate_college_day": return "College Working Day (Light Evening Study)";
      case "gate_off_college_day": return "Off-College Self-Study Day";
      default: return mode;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-hairline pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">Today</h1>
          <p className="text-xs text-muted-light dark:text-muted-dark mt-0.5">
            {formatDisplayDateIST(today)} &bull; {getModeLabel(todayCap?.mode || "standard")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate("plan")}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-hairline rounded text-xs hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors shadow-2xs"
          >
            <Calendar className="w-3.5 h-3.5 text-blue-500" />
            <span>Open Planner</span>
            <ArrowRight className="w-3.5 h-3.5 text-muted-light dark:text-muted-dark" />
          </button>
        </div>
      </div>

      {/* Critical Overload / Infeasibility Warning Banner (Section 4.1) */}
      {feasibility?.status === "infeasible" && (
        <div className="p-3.5 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/60 rounded text-xs space-y-1">
          <div className="flex items-center gap-2 font-semibold text-rose-700 dark:text-rose-300">
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>Study Capacity Infeasible: Mathematical Time Deficit</span>
          </div>
          <p className="text-muted-light dark:text-muted-dark pl-6 leading-relaxed">
            Remaining study demand exceeds net capacity by{" "}
            <span className="font-semibold text-foreground tabular-nums">
              {Math.abs(Number((feasibility.surplusOrDeficitMinutes / 60).toFixed(1)))} hours
            </span>{" "}
            before exam date {appState.profile.targetExamDate}. Use the Plan tab to review options (switching course variants, reducing stretch mocks, or re-allocating).
          </p>
        </div>
      )}

      {/* Overdue Items Alert */}
      {overdueTasks.length > 0 && (
        <div className="p-3 border border-amber-200 dark:border-amber-900/60 rounded bg-amber-50/40 dark:bg-amber-950/20 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
            <span>
              <strong className="font-semibold">{overdueTasks.length} task(s)</strong> past due date. Yesterday&apos;s missed work is never silently dropped.
            </span>
          </div>
          <button
            onClick={() => onNavigate("plan")}
            className="font-medium underline hover:no-underline ml-4 text-amber-700 dark:text-amber-400 shrink-0"
          >
            Review in Plan
          </button>
        </div>
      )}

      {/* Key Metric Blocks (Restrained, high information density) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 border border-hairline rounded bg-surface-light dark:bg-surface-dark space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-muted-light dark:text-muted-dark">
            <span>Today&apos;s Net Capacity</span>
            <Clock className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="text-xl font-bold tabular-nums">
            {Number((todayCap?.netAvailableMinutes / 60).toFixed(1))}h
          </div>
          <div className="text-[10px] text-muted-light dark:text-muted-dark">
            Gross: {Number((todayCap?.grossAvailableMinutes / 60).toFixed(1))}h (15% buffer)
          </div>
        </div>

        <div className="p-3 border border-hairline rounded bg-surface-light dark:bg-surface-dark space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-muted-light dark:text-muted-dark">
            <span>Required Daily Avg</span>
            <Clock className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-xl font-bold tabular-nums">
            {feasibility?.requiredAverageHoursPerAvailableDay || 0}h
          </div>
          <div className="text-[10px] text-muted-light dark:text-muted-dark">
            Across {feasibility?.totalAvailableDays || 0} available days
          </div>
        </div>

        <div className="p-3 border border-hairline rounded bg-surface-light dark:bg-surface-dark space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-muted-light dark:text-muted-dark">
            <span>Core Mocks Target</span>
            <Calendar className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <div className="text-xl font-bold tabular-nums">
            {coreMocksCompleted} / 12
          </div>
          <div className="text-[10px] text-muted-light dark:text-muted-dark">
            Historical baseline: 21/100 (Separate)
          </div>
        </div>

        <div className="p-3 border border-hairline rounded bg-surface-light dark:bg-surface-dark space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-muted-light dark:text-muted-dark">
            <span>Schedule Status</span>
            {feasibility?.status === "infeasible" ? (
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
            ) : feasibility?.status === "at_risk" ? (
              <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            )}
          </div>
          <div className="text-xl font-bold uppercase tracking-wide">
            {feasibility?.status === "infeasible"
              ? "Deficit"
              : feasibility?.status === "at_risk"
              ? "Tight"
              : "On Track"}
          </div>
          <div className="text-[10px] text-muted-light dark:text-muted-dark truncate">
            {feasibility?.surplusOrDeficitMinutes >= 0
              ? `Surplus: ${Number((feasibility.surplusOrDeficitMinutes / 60).toFixed(1))}h`
              : `Deficit: ${Number((Math.abs(feasibility.surplusOrDeficitMinutes) / 60).toFixed(1))}h`}
          </div>
        </div>
      </div>

      {/* Three Highest Priority Tasks (Section 4.1) */}
      <div className="border border-hairline rounded p-4 bg-background space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-hairline">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider">Top Priority Tasks</h2>
            <p className="text-[11px] text-muted-light dark:text-muted-dark">
              Prioritized by subject weakness, calendar lock windows, and urgency
            </p>
          </div>
          <button
            onClick={() => onNavigate("plan")}
            className="text-xs font-medium hover:underline flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {priorityTasks.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted-light dark:text-muted-dark">
            All priority tasks completed for today.
          </div>
        ) : (
          <div className="space-y-2">
            {priorityTasks.map((task) => {
              const isDone = task.status === "done";
              const isDoing = task.status === "doing";
              const isWeak = task.subjectId === "subj-prob-stats" || task.subjectId === "subj-dbms";

              return (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-3 border border-hairline rounded hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      onClick={() => handleToggleTaskDone(task)}
                      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                        isDone
                          ? "bg-emerald-600 text-white dark:bg-emerald-500 dark:text-black border-transparent"
                          : "border-neutral-400 dark:border-neutral-600 hover:border-emerald-500 dark:hover:border-emerald-400"
                      }`}
                      title={isDone ? "Mark incomplete" : "Mark done"}
                    >
                      {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-white dark:text-black stroke-[3]" />}
                    </button>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-medium truncate ${isDone ? "line-through text-muted-light dark:text-muted-dark" : ""}`}>
                          {task.title}
                        </span>
                        {isWeak && (
                          <span className="px-1.5 py-0.2 text-[9px] font-mono border border-rose-200 dark:border-rose-900 bg-rose-50/60 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 rounded">
                            Weak Subject
                          </span>
                        )}
                        {task.pinned && (
                          <span className="px-1.5 py-0.2 text-[9px] font-mono border border-blue-200 dark:border-blue-900 bg-blue-50/60 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 rounded">
                            Pinned
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-muted-light dark:text-muted-dark mt-0.5">
                        <span className="tabular-nums font-mono">
                          {task.completedMinutes} / {task.estimatedMinutes} min
                        </span>
                        <span>&bull;</span>
                        <span className="capitalize">{task.type.replace("_", " ")}</span>
                        {task.why && (
                          <>
                            <span>&bull;</span>
                            <span className="truncate max-w-[260px]">{task.why}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    {!isDone && (
                      <button
                        onClick={() => handleStartTask(task.id)}
                        className="p-1.5 border border-hairline rounded hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-xs flex items-center gap-1.5 transition-colors text-emerald-700 dark:text-emerald-300 shadow-2xs"
                        title="Start timer for this task"
                      >
                        <Play className="w-3 h-3 fill-emerald-600 text-emerald-600 dark:fill-emerald-400 dark:text-emerald-400" />
                        <span className="hidden sm:inline text-[11px] font-medium">Study</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Week Allocation Overview */}
      <div className="border border-hairline rounded p-4 bg-background space-y-3 shadow-2xs">
        <div className="flex items-center justify-between pb-2 border-b border-hairline">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider">Upcoming Phase Timeline</h2>
            <p className="text-[11px] text-muted-light dark:text-muted-dark">
              Key hard constraints and transition milestones
            </p>
          </div>
          <button
            onClick={() => onNavigate("attendance")}
            className="text-xs font-medium hover:underline flex items-center gap-1 text-teal-600 dark:text-teal-400"
          >
            <span>January Attendance</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <div className="p-2.5 border border-hairline rounded bg-surface-light dark:bg-surface-dark space-y-1">
            <div className="flex items-center gap-1.5 font-semibold">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span>21–22 Oct</span>
            </div>
            <div className="text-muted-light dark:text-muted-dark text-[11px]">
              LAEP Presentation focus. Mocks locked.
            </div>
          </div>
          <div className="p-2.5 border border-hairline rounded bg-surface-light dark:bg-surface-dark space-y-1">
            <div className="flex items-center gap-1.5 font-semibold">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>28 Oct</span>
            </div>
            <div className="text-muted-light dark:text-muted-dark text-[11px]">
              Project Freeze. SmartSight deadline check.
            </div>
          </div>
          <div className="p-2.5 border border-hairline rounded bg-surface-light dark:bg-surface-dark space-y-1">
            <div className="flex items-center gap-1.5 font-semibold">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>16–27 Nov</span>
            </div>
            <div className="text-muted-light dark:text-muted-dark text-[11px]">
              End-Sem Exams (GATE=0m). Exclusively ESE.
            </div>
          </div>
          <div className="p-2.5 border border-hairline rounded bg-surface-light dark:bg-surface-dark space-y-1">
            <div className="flex items-center gap-1.5 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>28 Nov–10 Jan</span>
            </div>
            <div className="text-muted-light dark:text-muted-dark text-[11px]">
              Holiday Mode (~7.5h daily focused capacity).
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
