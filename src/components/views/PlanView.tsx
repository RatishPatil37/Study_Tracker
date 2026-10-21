"use client";

import React, { useState } from "react";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Pin,
  Split,
  Trash2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Lock,
  Layers,
} from "lucide-react";
import {
  AppStateData,
  commitSchedulePlan,
  createTask,
  deleteTask,
  previewSchedulePlan,
  rollbackSchedulePlan,
  setDayCapacityOverride,
  updateTask,
} from "@/lib/api";
import { addDaysIST, formatDisplayDateIST, getDayOfWeekIST } from "@/domain/dates";
import { PlanPreview, StudyTask, TaskStatus, TaskType } from "@/domain/types";

interface PlanViewProps {
  appState: AppStateData;
  onRefresh: () => void;
}

export function PlanView({ appState, onRefresh }: PlanViewProps) {
  const { today, tasks, assignments, dayCapacities, planVersions } = appState;

  const [viewMode, setViewMode] = useState<"day" | "week">("day");
  const [selectedDate, setSelectedDate] = useState<string>(today);

  // Replanning modal state
  const [replanning, setReplanning] = useState(false);
  const [planPreviewData, setPlanPreviewData] = useState<PlanPreview | null>(null);
  const [replanLoading, setReplanLoading] = useState(false);

  // Quick-add task state
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSubject, setNewSubject] = useState("subj-prob-stats");
  const [newMinutes, setNewMinutes] = useState(60);
  const [newType, setNewType] = useState<TaskType>("video");
  const [newPriority, setNewPriority] = useState(2);

  // Day capacity override state
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideMinutes, setOverrideMinutes] = useState(450);
  const [overrideReason, setOverrideReason] = useState("");

  const currentCap = dayCapacities.find((c) => c.localDate === selectedDate) || dayCapacities[0];

  // Daily planner items for selectedDate
  const currentAssignments = assignments.filter((a) => a.localDate === selectedDate);
  const assignedMinutes = currentAssignments.reduce((sum, a) => sum + a.plannedMinutes, 0);

  // Weekly planner date range (Monday - Sunday of the week containing selectedDate)
  const dayOfWeek = getDayOfWeekIST(selectedDate); // 0=Sun, 1=Mon, ..., 6=Sat
  // Offset to Monday: if Sun (0), offset is -6; else 1 - dayOfWeek
  const offsetToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const mondayDate = addDaysIST(selectedDate, offsetToMonday);
  const weekDates = [0, 1, 2, 3, 4, 5, 6].map((i) => addDaysIST(mondayDate, i));

  const handlePrevDate = () => {
    setSelectedDate(addDaysIST(selectedDate, viewMode === "day" ? -1 : -7));
  };

  const handleNextDate = () => {
    setSelectedDate(addDaysIST(selectedDate, viewMode === "day" ? 1 : 7));
  };

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      await createTask({
        title: newTitle.trim(),
        subjectId: newSubject,
        type: newType,
        estimatedMinutes: Number(newMinutes),
        completedMinutes: 0,
        status: "todo",
        priority: Number(newPriority),
        pinned: false,
        prerequisites: [],
      });
      setNewTitle("");
      setQuickAddOpen(false);
      onRefresh();
    } catch (err: any) {
      alert(`Failed to add task: ${err.message}`);
    }
  };

  const handleToggleTaskStatus = async (taskId: string, currentStatus: TaskStatus) => {
    try {
      const next: TaskStatus = currentStatus === "done" ? "todo" : "done";
      const target = tasks.find((t) => t.id === taskId);
      await updateTask(taskId, {
        status: next,
        completedMinutes: next === "done" ? (target?.estimatedMinutes || 60) : 0,
      });
      onRefresh();
    } catch (err: any) {
      alert(`Error updating task: ${err.message}`);
    }
  };

  const handleTogglePin = async (task: StudyTask) => {
    try {
      await updateTask(task.id, {
        pinned: !task.pinned,
        lockedToDate: !task.pinned ? selectedDate : undefined,
      });
      onRefresh();
    } catch (err: any) {
      alert(`Error pinning task: ${err.message}`);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      await deleteTask(taskId);
      onRefresh();
    } catch (err: any) {
      alert(`Error deleting task: ${err.message}`);
    }
  };

  const handleSplitTask = async (task: StudyTask) => {
    if (task.estimatedMinutes <= 60) {
      alert("Task is already 60 minutes or less; no split required.");
      return;
    }
    const half = Math.round(task.estimatedMinutes / 2);
    try {
      await updateTask(task.id, {
        title: `${task.title} (Part 1)`,
        estimatedMinutes: half,
      });
      await createTask({
        title: `${task.title} (Part 2)`,
        subjectId: task.subjectId,
        type: task.type,
        estimatedMinutes: task.estimatedMinutes - half,
        completedMinutes: 0,
        status: "todo",
        priority: task.priority,
        pinned: false,
        prerequisites: [task.id],
      });
      onRefresh();
    } catch (err: any) {
      alert(`Failed to split task: ${err.message}`);
    }
  };

  const handleTriggerReplan = async () => {
    try {
      setReplanLoading(true);
      const preview = await previewSchedulePlan();
      setPlanPreviewData(preview);
      setReplanning(true);
    } catch (err: any) {
      alert(`Replanning failed: ${err.message}`);
    } finally {
      setReplanLoading(false);
    }
  };

  const handleCommitPlan = async () => {
    if (!planPreviewData) return;
    try {
      setReplanLoading(true);
      await commitSchedulePlan(planPreviewData);
      setReplanning(false);
      setPlanPreviewData(null);
      onRefresh();
    } catch (err: any) {
      alert(`Failed to commit plan: ${err.message}`);
    } finally {
      setReplanLoading(false);
    }
  };

  const handleRollback = async (version: number) => {
    if (!confirm(`Rollback schedule to plan version ${version}?`)) return;
    try {
      await rollbackSchedulePlan(version);
      onRefresh();
    } catch (err: any) {
      alert(`Rollback failed: ${err.message}`);
    }
  };

  const handleSetOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideReason.trim()) {
      alert("A reason is required when overriding available capacity.");
      return;
    }
    try {
      await setDayCapacityOverride(selectedDate, Number(overrideMinutes), overrideReason.trim());
      setOverrideOpen(false);
      setOverrideReason("");
      onRefresh();
    } catch (err: any) {
      alert(`Failed to set override: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-hairline pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">Plan</h1>
          <p className="text-xs text-muted-light dark:text-muted-dark mt-0.5">
            Deterministic, explainable adaptive scheduler &bull; Net daily capacity enforcement
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Day / Week Toggle */}
          <div className="flex items-center border border-hairline rounded p-0.5 text-xs bg-surface-light dark:bg-surface-dark">
            <button
              onClick={() => setViewMode("day")}
              className={`px-3 py-1 rounded transition-colors ${
                viewMode === "day"
                  ? "bg-solid-black text-solid-white dark:bg-solid-black dark:text-background font-medium"
                  : "text-muted-light dark:text-muted-dark hover:text-foreground"
              }`}
            >
              Day
            </button>
            <button
              onClick={() => setViewMode("week")}
              className={`px-3 py-1 rounded transition-colors ${
                viewMode === "week"
                  ? "bg-solid-black text-solid-white dark:bg-solid-black dark:text-background font-medium"
                  : "text-muted-light dark:text-muted-dark hover:text-foreground"
              }`}
            >
              Week
            </button>
          </div>

          {/* Replan Schedule Action */}
          <button
            onClick={handleTriggerReplan}
            disabled={replanLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 text-white dark:bg-white dark:text-black rounded text-xs font-medium hover:opacity-90 disabled:opacity-50 shadow-2xs transition-all"
          >
            <RotateCcw className={`w-3.5 h-3.5 text-blue-400 dark:text-blue-600 ${replanLoading ? "animate-spin" : ""}`} />
            <span>Replan Schedule</span>
          </button>

          {/* Quick-add task */}
          <button
            onClick={() => setQuickAddOpen(!quickAddOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-hairline rounded text-xs font-medium hover:bg-neutral-100 dark:hover:bg-neutral-900 shadow-2xs transition-all"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-500" />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {/* Date Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border border-hairline rounded bg-surface-light dark:bg-surface-dark text-xs gap-2">
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <button
            onClick={handlePrevDate}
            className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded"
            title="Previous"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setSelectedDate(today)}
            className="px-2 py-0.5 border border-hairline rounded hover:bg-neutral-200 dark:hover:bg-neutral-800"
          >
            Today
          </button>
          <button
            onClick={handleNextDate}
            className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded"
            title="Next"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <span className="font-semibold tabular-nums ml-1 sm:ml-2">
            {viewMode === "day"
              ? formatDisplayDateIST(selectedDate)
              : `${formatDisplayDateIST(weekDates[0])} — ${formatDisplayDateIST(weekDates[6])}`}
          </span>
        </div>

        {viewMode === "day" && (
          <div className="flex items-center justify-between sm:justify-end gap-3 pt-1 sm:pt-0 border-t sm:border-t-0 border-hairline sm:border-transparent">
            <span className="text-muted-light dark:text-muted-dark">
              Assigned: <strong className="text-foreground tabular-nums">{assignedMinutes}m</strong> /{" "}
              <strong className="text-foreground tabular-nums">{currentCap?.netAvailableMinutes || 0}m net</strong>
            </span>
            <button
              onClick={() => setOverrideOpen(true)}
              className="underline hover:no-underline text-muted-light dark:text-muted-dark shrink-0"
            >
              Override Capacity
            </button>
          </div>
        )}
      </div>

      {/* Capacity Override Modal */}
      {overrideOpen && (
        <form onSubmit={handleSetOverride} className="p-4 border border-hairline rounded bg-background space-y-3 text-xs">
          <div className="font-semibold text-sm">
            Override Study Capacity for {formatDisplayDateIST(selectedDate)}
          </div>
          <p className="text-muted-light dark:text-muted-dark">
            Date-specific overrides require an explicit reason and will not silently rewrite global defaults.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium mb-1">Available Minutes (0–1440)</label>
              <input
                type="number"
                min={0}
                max={1440}
                value={overrideMinutes}
                onChange={(e) => setOverrideMinutes(Number(e.target.value))}
                className="w-full p-2 border border-hairline rounded bg-transparent text-xs"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium mb-1">Reason for Override</label>
              <input
                type="text"
                placeholder="e.g. Approved college leave, festival holiday"
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                className="w-full p-2 border border-hairline rounded bg-transparent text-xs"
                required
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setOverrideOpen(false)}
              className="px-3 py-1.5 border border-hairline rounded hover:bg-neutral-100 dark:hover:bg-neutral-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 bg-neutral-900 text-white dark:bg-white dark:text-black rounded font-medium"
            >
              Save Override
            </button>
          </div>
        </form>
      )}

      {/* Quick-add task form */}
      {quickAddOpen && (
        <form onSubmit={handleQuickAdd} className="p-4 border border-hairline rounded bg-background space-y-3 text-xs">
          <div className="font-semibold text-sm">Add New Study Task</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-medium mb-1">Task Title</label>
              <input
                type="text"
                placeholder="e.g. DBMS Crash Course: Concurrency Control"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full p-2 border border-hairline rounded bg-transparent text-xs"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium mb-1">Subject</label>
              <select
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                className="w-full p-2 border border-hairline rounded bg-transparent text-xs"
              >
                {appState.courses.map((c) => (
                  <option key={c.subjectId} value={c.subjectId} className="bg-background">
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium mb-1">Estimated Minutes</label>
              <input
                type="number"
                min={15}
                max={600}
                value={newMinutes}
                onChange={(e) => setNewMinutes(Number(e.target.value))}
                className="w-full p-2 border border-hairline rounded bg-transparent text-xs"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium mb-1">Task Type</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as TaskType)}
                className="w-full p-2 border border-hairline rounded bg-transparent text-xs"
              >
                <option value="video" className="bg-background">Video Lecture</option>
                <option value="notes" className="bg-background">Notes / Theory</option>
                <option value="embedded_problems" className="bg-background">Embedded Problems</option>
                <option value="independent_pyq" className="bg-background">Independent PYQ</option>
                <option value="mock" className="bg-background">Full Mock (180m)</option>
                <option value="analysis" className="bg-background">Mock Analysis</option>
                <option value="ese" className="bg-background">End-Sem Subject</option>
                <option value="revision" className="bg-background">Spaced Revision</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium mb-1">Priority (1 = Highest)</label>
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(Number(e.target.value))}
                className="w-full p-2 border border-hairline rounded bg-transparent text-xs"
              >
                <option value={1} className="bg-background">1 - Critical / Weak</option>
                <option value={2} className="bg-background">2 - High</option>
                <option value={3} className="bg-background">3 - Normal</option>
                <option value={4} className="bg-background">4 - Low</option>
                <option value={5} className="bg-background">5 - Optional</option>
              </select>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setQuickAddOpen(false)}
              className="px-3 py-1.5 border border-hairline rounded hover:bg-neutral-100 dark:hover:bg-neutral-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 bg-neutral-900 text-white dark:bg-white dark:text-black rounded font-medium"
            >
              Create Task
            </button>
          </div>
        </form>
      )}

      {/* VIEW: DAY PLANNER */}
      {viewMode === "day" && (
        <div className="space-y-4">
          {/* Day Capacity Bar */}
          <div className="p-3 border border-hairline rounded bg-background space-y-2 shadow-2xs">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-500" />
                <span>Daily Net Capacity &bull; {currentCap?.mode.replace("_", " ")}</span>
              </span>
              <span className="tabular-nums font-mono">
                {assignedMinutes} / {currentCap?.netAvailableMinutes || 0} min ({Math.round(((assignedMinutes || 0) / Math.max(1, currentCap?.netAvailableMinutes || 1)) * 100)}%)
              </span>
            </div>
            <div className="w-full h-2 bg-neutral-200 dark:bg-neutral-800 rounded overflow-hidden">
              <div
                className={`h-full transition-all ${
                  assignedMinutes > (currentCap?.netAvailableMinutes || 0)
                    ? "bg-rose-600 dark:bg-rose-500"
                    : "bg-blue-600 dark:bg-blue-500"
                }`}
                style={{
                  width: `${Math.min(100, Math.round(((assignedMinutes || 0) / Math.max(1, currentCap?.netAvailableMinutes || 1)) * 100))}%`,
                }}
              />
            </div>
            {currentCap?.lockReason && (
              <div className="text-[11px] text-amber-700 dark:text-amber-400 flex items-center gap-1.5 pt-1">
                <Lock className="w-3 h-3 text-amber-500 shrink-0" />
                <span>{currentCap.lockReason}</span>
              </div>
            )}
          </div>

          {/* Assignments List */}
          <div className="space-y-2">
            {currentAssignments.length === 0 ? (
              <div className="p-8 border border-hairline rounded text-center text-xs text-muted-light dark:text-muted-dark space-y-2">
                <Calendar className="w-6 h-6 mx-auto stroke-1 text-muted-light dark:text-muted-dark" />
                <div>No tasks scheduled for {formatDisplayDateIST(selectedDate)}.</div>
                <button
                  onClick={handleTriggerReplan}
                  className="font-medium underline hover:no-underline text-blue-600 dark:text-blue-400"
                >
                  Run Replanner to allocate available capacity
                </button>
              </div>
            ) : (
              currentAssignments.map((assignment) => {
                const task = tasks.find((t) => t.id === assignment.taskId);
                if (!task) return null;
                const isDone = task.status === "done";

                return (
                  <div
                    key={assignment.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border border-hairline rounded hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors gap-2 shadow-2xs"
                  >
                    <div className="flex items-start sm:items-center gap-3 min-w-0">
                      <button
                        onClick={() => handleToggleTaskStatus(task.id, task.status)}
                        className={`w-4 h-4 mt-0.5 sm:mt-0 rounded border flex items-center justify-center shrink-0 transition-colors ${
                          isDone
                            ? "bg-emerald-600 text-white dark:bg-emerald-500 dark:text-black border-transparent"
                            : "border-neutral-400 dark:border-neutral-600 hover:border-emerald-500 dark:hover:border-emerald-400"
                        }`}
                      >
                        {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-white dark:text-black stroke-[3]" />}
                      </button>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs font-medium ${isDone ? "line-through text-muted-light dark:text-muted-dark" : ""}`}>
                            {task.title}
                          </span>
                          <span className="px-1.5 py-0.2 text-[9px] font-mono border border-hairline rounded uppercase">
                            {task.type.replace("_", " ")}
                          </span>
                          {task.pinned && (
                            <span className="px-1.5 py-0.2 text-[9px] font-mono border border-blue-200 dark:border-blue-900 bg-blue-50/60 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 rounded flex items-center gap-1">
                              <Pin className="w-2.5 h-2.5 text-blue-500" /> Pinned
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-muted-light dark:text-muted-dark mt-0.5 flex items-center gap-2">
                          <span className="tabular-nums font-mono font-semibold text-foreground">{assignment.plannedMinutes} min planned</span>
                          <span>&bull;</span>
                          <span className="tabular-nums font-mono">Total: {task.completedMinutes}/{task.estimatedMinutes}m</span>
                          {assignment.why && (
                            <>
                              <span>&bull;</span>
                              <span className="italic truncate max-w-[280px]">{assignment.why}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                      <button
                        onClick={() => handleTogglePin(task)}
                        className={`p-1.5 border border-hairline rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 text-xs transition-colors ${
                          task.pinned ? "border-blue-300 dark:border-blue-800 text-blue-600 dark:text-blue-400" : "text-muted-light dark:text-muted-dark"
                        }`}
                        title={task.pinned ? "Unpin task" : "Pin task to this day"}
                      >
                        <Pin className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleSplitTask(task)}
                        className="p-1.5 border border-hairline rounded hover:bg-amber-50 dark:hover:bg-amber-950/30 text-xs transition-colors text-amber-600 dark:text-amber-400"
                        title="Split task in half"
                      >
                        <Split className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="p-1.5 border border-hairline rounded hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs text-rose-600 dark:text-rose-400 transition-colors"
                        title="Delete task"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* VIEW: WEEKLY PLANNER */}
      {viewMode === "week" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
            {weekDates.map((date) => {
              const cap = dayCapacities.find((c) => c.localDate === date);
              const dayAssignments = assignments.filter((a) => a.localDate === date);
              const dayMinutes = dayAssignments.reduce((sum, a) => sum + a.plannedMinutes, 0);
              const isSelected = date === selectedDate;
              const isToday = date === today;

              return (
                <div
                  key={date}
                  onClick={() => setSelectedDate(date)}
                  className={`p-2.5 border rounded cursor-pointer transition-colors space-y-2 min-h-[140px] sm:min-h-[160px] flex flex-col justify-between ${
                    isSelected
                      ? "border-black dark:border-white bg-neutral-50 dark:bg-neutral-900"
                      : "border-hairline bg-background hover:bg-neutral-50 dark:hover:bg-neutral-900"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className={`font-semibold ${isToday ? "underline decoration-2" : ""}`}>
                        {formatDisplayDateIST(date).split(",")[0]}
                      </span>
                      <span className="text-[10px] text-muted-light dark:text-muted-dark tabular-nums">
                        {date.substring(8)}
                      </span>
                    </div>

                    <div className="text-[10px] text-muted-light dark:text-muted-dark truncate">
                      {cap?.mode.replace("gate_", "")}
                    </div>

                    {/* Progress bar */}
                    <div className="w-full h-1 bg-neutral-200 dark:bg-neutral-800 rounded overflow-hidden">
                      <div
                        className="h-full bg-black dark:bg-white"
                        style={{
                          width: `${Math.min(100, Math.round(((dayMinutes || 0) / Math.max(1, cap?.netAvailableMinutes || 1)) * 100))}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Tasks count & planned time */}
                  <div className="text-[11px] pt-2 border-t border-hairline">
                    <div className="tabular-nums font-semibold">{dayAssignments.length} task(s)</div>
                    <div className="text-[10px] text-muted-light dark:text-muted-dark tabular-nums">
                      {dayMinutes}m / {cap?.netAvailableMinutes || 0}m
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* INTERACTIVE REPLANNING MODAL (Section 3 & 4.3) */}
      {replanning && planPreviewData && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-2.5 sm:p-4 backdrop-blur-sm">
          <div className="max-w-2xl w-full bg-background border border-hairline rounded-lg shadow-xl p-4 sm:p-5 space-y-4 max-h-[92vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between border-b border-hairline pb-3">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider">
                  Replanning Preview (Plan Version {planPreviewData.planVersion})
                </h2>
                <p className="text-[11px] text-muted-light dark:text-muted-dark">
                  Inspect proposed assignments, capacity diff, and residual backlog before persisting.
                </p>
              </div>
              <button
                onClick={() => setReplanning(false)}
                className="text-muted-light dark:text-muted-dark hover:text-foreground font-semibold"
              >
                Close
              </button>
            </div>

            {/* Feasibility Summary */}
            <div className="p-3 border border-hairline rounded bg-surface-light dark:bg-surface-dark space-y-1 shadow-2xs">
              <div className="flex items-center justify-between font-semibold">
                <span className="flex items-center gap-1.5">
                  {planPreviewData.feasibility.status === "infeasible" ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  )}
                  <span>Feasibility Status:</span>
                </span>
                <span className={`uppercase tracking-wider font-bold ${
                  planPreviewData.feasibility.status === "infeasible"
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-emerald-600 dark:text-emerald-400"
                }`}>
                  {planPreviewData.feasibility.status}
                </span>
              </div>
              <div className="text-[11px] text-muted-light dark:text-muted-dark space-y-0.5">
                <div>
                  Net Capacity: <span className="font-mono">{Number((planPreviewData.feasibility.totalRemainingCapacityMinutes / 60).toFixed(1))}h</span> &bull; Work Demand: <span className="font-mono">{Number((planPreviewData.feasibility.totalRemainingWorkMinutes / 60).toFixed(1))}h</span>
                </div>
                <div>
                  Surplus / Deficit: <span className="font-mono font-semibold">{Number((planPreviewData.feasibility.surplusOrDeficitMinutes / 60).toFixed(1))}h</span>
                </div>
              </div>
            </div>

            {/* Conflicts & Residual Backlog Alerts */}
            {planPreviewData.unscheduledTasks.length > 0 && (
              <div className="p-3 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/60 rounded space-y-2">
                <div className="flex items-center gap-2 font-semibold text-rose-700 dark:text-rose-300">
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>Residual Backlog ({planPreviewData.unscheduledTasks.length} unplaced tasks)</span>
                </div>
                <p className="text-[11px] text-muted-light dark:text-muted-dark">
                  The scheduler never drops tasks or overfills days. The following tasks exceeded available capacity:
                </p>
                <div className="space-y-1 pl-4 max-h-36 overflow-y-auto">
                  {planPreviewData.unscheduledTasks.map((item, idx) => (
                    <div key={idx} className="text-[11px] text-muted-light dark:text-muted-dark">
                      &bull; <strong className="text-foreground">{item.task.title}</strong>: {item.reason}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Proposed Assignments Preview List */}
            <div className="space-y-2">
              <div className="font-semibold text-[11px] uppercase tracking-wider">
                Proposed Chunk Assignments ({planPreviewData.assignments.length} slots)
              </div>
              <div className="border border-hairline rounded divide-y divide-hairline max-h-48 overflow-y-auto">
                {planPreviewData.assignments.slice(0, 20).map((a) => (
                  <div key={a.id} className="p-2 flex items-center justify-between">
                    <div>
                      <span className="font-medium">{formatDisplayDateIST(a.localDate)}</span>: {a.why}
                    </div>
                    <div className="font-mono tabular-nums font-semibold shrink-0 ml-2">
                      {a.plannedMinutes} min
                    </div>
                  </div>
                ))}
                {planPreviewData.assignments.length > 20 && (
                  <div className="p-2 text-center text-muted-light dark:text-muted-dark text-[11px]">
                    ...and {planPreviewData.assignments.length - 20} more chunk assignments.
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between border-t border-hairline pt-3">
              <div className="text-[11px] text-muted-light dark:text-muted-dark">
                Deterministic & Reversible. Snapshot will be archived.
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setReplanning(false)}
                  className="px-3 py-1.5 border border-hairline rounded hover:bg-neutral-100 dark:hover:bg-neutral-900"
                >
                  Discard Preview
                </button>
                <button
                  onClick={handleCommitPlan}
                  disabled={replanLoading}
                  className="px-4 py-1.5 bg-neutral-900 text-white dark:bg-white dark:text-black rounded font-medium hover:opacity-90"
                >
                  Confirm & Persist Plan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Plan Version History / Undo */}
      {planVersions.length > 0 && (
        <div className="border border-hairline rounded p-4 bg-background space-y-2 text-xs">
          <div className="flex items-center justify-between pb-1 border-b border-hairline">
            <span className="font-bold uppercase tracking-wider text-[11px]">
              Plan Revision History ({planVersions.length} snapshots)
            </span>
            <span className="text-muted-light dark:text-muted-dark text-[11px]">
              Rollback if replanning is unsatisfactory
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap pt-1">
            {planVersions.slice(-5).map((pv) => (
              <button
                key={pv.version}
                onClick={() => handleRollback(pv.version)}
                className="px-2.5 py-1 border border-hairline rounded hover:bg-neutral-100 dark:hover:bg-neutral-900 flex items-center gap-1.5"
                title={`Rollback to version ${pv.version}`}
              >
                <RotateCcw className="w-3 h-3" />
                <span>v{pv.version} ({new Date(pv.generatedAt).toLocaleDateString()})</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
