"use client";

import React, { useState } from "react";
import { FileText, Plus, Check, RotateCcw, AlertTriangle, Layers, Calendar } from "lucide-react";
import { AppStateData, recordErrorItem, reviewErrorItem } from "@/lib/api";
import { ErrorCategoryRecord } from "@/domain/types";
import { formatDisplayDateIST } from "@/domain/dates";

interface ReviewViewProps {
  appState: AppStateData;
  onRefresh: () => void;
}

export function ReviewView({ appState, onRefresh }: ReviewViewProps) {
  const { errors, tasks, assignments, today } = appState;

  const [activeTab, setActiveTab] = useState<"notebook" | "weekly">("notebook");
  const [openAddModal, setOpenAddModal] = useState(false);

  // Error form state
  const [source, setSource] = useState("");
  const [subjectId, setSubjectId] = useState("subj-prob-stats");
  const [errorCategory, setErrorCategory] = useState<"conceptual" | "calculation" | "misread" | "time" | "guess">("conceptual");
  const [correctionNotes, setCorrectionNotes] = useState("");

  // Filter due reviews for today or past
  const dueErrors = errors.filter((e) => e.status !== "mastered" && e.nextReviewDate <= today);
  const upcomingErrors = errors.filter((e) => e.status !== "mastered" && e.nextReviewDate > today);
  const masteredErrors = errors.filter((e) => e.status === "mastered");

  const handleAddError = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!source.trim() || !correctionNotes.trim()) return;

    try {
      await recordErrorItem({
        subjectId,
        source: source.trim(),
        errorCategory,
        correctionNotes: correctionNotes.trim(),
        revisitIntervalDays: 1,
        nextReviewDate: today,
        attemptCount: 1,
        status: "pending",
      });

      setSource("");
      setCorrectionNotes("");
      setOpenAddModal(false);
      onRefresh();
    } catch (err: any) {
      alert(`Failed to record error item: ${err.message}`);
    }
  };

  const handleReview = async (errorId: string, isSuccess: boolean) => {
    try {
      await reviewErrorItem(errorId, isSuccess);
      onRefresh();
    } catch (err: any) {
      alert(`Failed to review item: ${err.message}`);
    }
  };

  // Weekly Review Metrics Calculation (On-Demand)
  const completedTasks = tasks.filter((t) => t.status === "done");
  const completedMinutesTotal = tasks.reduce((sum, t) => sum + (t.completedMinutes || 0), 0);
  const completedHoursTotal = Number((completedMinutesTotal / 60).toFixed(1));

  // Remaining tasks backlog
  const backlogTasks = tasks.filter((t) => t.status !== "done");
  const remainingWorkMinutes = backlogTasks.reduce((sum, t) => sum + Math.max(0, t.estimatedMinutes - t.completedMinutes), 0);
  const remainingWorkHours = Number((remainingWorkMinutes / 60).toFixed(1));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 border-b border-hairline pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">Review & Retention</h1>
          <p className="text-xs text-muted-light dark:text-muted-dark mt-0.5">
            Error notebook &bull; 1/3/7/14/30 day spaced repetition &bull; On-demand weekly audit
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center border border-hairline rounded p-0.5 text-xs bg-surface-light dark:bg-surface-dark">
            <button
              onClick={() => setActiveTab("notebook")}
              className={`px-3 py-1 rounded transition-colors ${
                activeTab === "notebook"
                  ? "bg-solid-black text-solid-white dark:bg-solid-black dark:text-background font-medium"
                  : "text-muted-light dark:text-muted-dark hover:text-foreground"
              }`}
            >
              Error Notebook
            </button>
            <button
              onClick={() => setActiveTab("weekly")}
              className={`px-3 py-1 rounded transition-colors ${
                activeTab === "weekly"
                  ? "bg-solid-black text-solid-white dark:bg-solid-black dark:text-background font-medium"
                  : "text-muted-light dark:text-muted-dark hover:text-foreground"
              }`}
            >
              Weekly Report
            </button>
          </div>

          {activeTab === "notebook" && (
            <button
              onClick={() => setOpenAddModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 text-white dark:bg-white dark:text-black rounded text-xs font-medium hover:opacity-90"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Log Mistake</span>
            </button>
          )}
        </div>
      </div>

      {activeTab === "notebook" && (
        <div className="space-y-6">
          {/* Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="p-3 border border-hairline rounded bg-surface-light dark:bg-surface-dark space-y-1">
              <div className="text-[11px] uppercase tracking-wider text-muted-light dark:text-muted-dark">
                Due Reviews Today
              </div>
              <div className="text-xl font-bold tabular-nums">{dueErrors.length}</div>
              <div className="text-[10px] text-muted-light dark:text-muted-dark">Awaiting recall review</div>
            </div>

            <div className="p-3 border border-hairline rounded bg-surface-light dark:bg-surface-dark space-y-1">
              <div className="text-[11px] uppercase tracking-wider text-muted-light dark:text-muted-dark">
                Scheduled Next
              </div>
              <div className="text-xl font-bold tabular-nums">{upcomingErrors.length}</div>
              <div className="text-[10px] text-muted-light dark:text-muted-dark">In 3/7/14/30 day queue</div>
            </div>

            <div className="p-3 border border-hairline rounded bg-surface-light dark:bg-surface-dark space-y-1">
              <div className="text-[11px] uppercase tracking-wider text-muted-light dark:text-muted-dark">
                Mastered Mistakes
              </div>
              <div className="text-xl font-bold tabular-nums">{masteredErrors.length}</div>
              <div className="text-[10px] text-muted-light dark:text-muted-dark">Completed 30-day cycle</div>
            </div>

            <div className="p-3 border border-hairline rounded bg-surface-light dark:bg-surface-dark space-y-1">
              <div className="text-[11px] uppercase tracking-wider text-muted-light dark:text-muted-dark">
                Total Mistakes Tracked
              </div>
              <div className="text-xl font-bold tabular-nums">{errors.length}</div>
              <div className="text-[10px] text-muted-light dark:text-muted-dark">Categorized errors</div>
            </div>
          </div>

          {/* Add Error Modal */}
          {openAddModal && (
            <form onSubmit={handleAddError} className="p-4 border border-hairline rounded bg-background space-y-3 text-xs">
              <div className="font-semibold text-sm">Log New Error / Mistake</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-medium mb-1">Source / Question Context</label>
                  <input
                    type="text"
                    placeholder="e.g. PYQ 2024 Q18 / Lecture 4 Quiz / Mock 1 Q34"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className="w-full p-2 border border-hairline rounded bg-transparent text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium mb-1">Subject</label>
                  <select
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
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
                  <label className="block text-[11px] font-medium mb-1">Error Category</label>
                  <select
                    value={errorCategory}
                    onChange={(e) => setErrorCategory(e.target.value as any)}
                    className="w-full p-2 border border-hairline rounded bg-transparent text-xs"
                  >
                    <option value="conceptual" className="bg-background">Conceptual (Did not understand theory)</option>
                    <option value="calculation" className="bg-background">Calculation (Algebra/Arithmetic slip)</option>
                    <option value="misread" className="bg-background">Misread (Missed &apos;NOT&apos;, wrong variable)</option>
                    <option value="time" className="bg-background">Time Pressure (Rushed attempt)</option>
                    <option value="guess" className="bg-background">Guesswork (Blind guess)</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-medium mb-1">Correction / Key Learning Takeaway</label>
                  <input
                    type="text"
                    placeholder="e.g. For Bayes formula, sum all partition terms in denominator; do not forget P(B|A2)"
                    value={correctionNotes}
                    onChange={(e) => setCorrectionNotes(e.target.value)}
                    className="w-full p-2 border border-hairline rounded bg-transparent text-xs"
                    required
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpenAddModal(false)}
                  className="px-3 py-1.5 border border-hairline rounded hover:bg-neutral-100 dark:hover:bg-neutral-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-neutral-900 text-white dark:bg-white dark:text-black rounded font-medium"
                >
                  Save Mistake
                </button>
              </div>
            </form>
          )}

          {/* Due for Review Section */}
          <div className="border border-hairline rounded overflow-hidden">
            <div className="p-3 bg-surface-light dark:bg-surface-dark border-b border-hairline font-bold text-xs uppercase tracking-wider flex items-center justify-between">
              <span>Due for Spaced Review Today ({dueErrors.length})</span>
              <span className="text-[11px] text-muted-light dark:text-muted-dark normal-case font-normal">
                Pass &rarr; next interval (1 &rarr; 3 &rarr; 7 &rarr; 14 &rarr; 30) &bull; Fail &rarr; reset to 1d
              </span>
            </div>

            {dueErrors.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-light dark:text-muted-dark">
                No mistakes due for review today. Good job staying on top of spaced repetition.
              </div>
            ) : (
              <div className="divide-y divide-hairline text-xs">
                {dueErrors.map((item) => (
                  <div key={item.id} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-neutral-50 dark:hover:bg-neutral-900">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{item.source}</span>
                        <span className="px-1.5 py-0.2 text-[9px] font-mono border border-hairline rounded uppercase">
                          {item.errorCategory}
                        </span>
                        <span className="text-[10px] text-muted-light dark:text-muted-dark tabular-nums font-mono">
                          Current interval: {item.revisitIntervalDays}d &bull; Attempt #{item.attemptCount}
                        </span>
                      </div>
                      <div className="text-[11px] text-foreground leading-relaxed">
                        {item.correctionNotes}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        onClick={() => handleReview(item.id, false)}
                        className="flex items-center gap-1 px-2.5 py-1.5 border border-hairline rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 text-[11px]"
                        title="Failed recall: Reset to 1 day interval"
                      >
                        <RotateCcw className="w-3 h-3 text-red-600 dark:text-red-400" />
                        <span>Fail (1d)</span>
                      </button>
                      <button
                        onClick={() => handleReview(item.id, true)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-neutral-900 text-white dark:bg-white dark:text-black rounded text-[11px] font-medium hover:opacity-90"
                        title="Passed recall: Advance to next interval"
                      >
                        <Check className="w-3 h-3" />
                        <span>Pass</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Review Items */}
          {upcomingErrors.length > 0 && (
            <div className="border border-hairline rounded overflow-hidden">
              <div className="p-3 bg-surface-light dark:bg-surface-dark border-b border-hairline font-bold text-xs uppercase tracking-wider">
                Upcoming Spaced Reviews ({upcomingErrors.length})
              </div>
              <div className="divide-y divide-hairline text-xs">
                {upcomingErrors.map((item) => (
                  <div key={item.id} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold">{item.source}</div>
                      <div className="text-[11px] text-muted-light dark:text-muted-dark">{item.correctionNotes}</div>
                    </div>
                    <div className="text-left sm:text-right text-[11px] font-mono tabular-nums text-muted-light dark:text-muted-dark pt-1 sm:pt-0 border-t sm:border-t-0 border-hairline sm:border-transparent">
                      <div>Due: {formatDisplayDateIST(item.nextReviewDate)}</div>
                      <div className="text-[10px]">Interval: {item.revisitIntervalDays} days</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "weekly" && (
        <div className="space-y-4">
          <div className="p-4 border border-hairline rounded bg-surface-light dark:bg-surface-dark space-y-2 text-xs">
            <div className="font-semibold text-xs uppercase tracking-wider">
              On-Demand Weekly Review & Audit Report
            </div>
            <p className="text-[11px] text-muted-light dark:text-muted-dark leading-relaxed">
              Section 4.10: Generated on demand rather than requiring an always-on background server cron. Summarizes actual hours logged, backlog status, and topic recommendations.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 border border-hairline rounded bg-background space-y-1">
              <div className="text-[11px] text-muted-light dark:text-muted-dark uppercase tracking-wider">
                Total Actual Study Logged
              </div>
              <div className="text-xl font-bold tabular-nums">{completedHoursTotal} hours</div>
              <div className="text-[10px] text-muted-light dark:text-muted-dark">
                {completedTasks.length} tasks marked complete
              </div>
            </div>

            <div className="p-3 border border-hairline rounded bg-background space-y-1">
              <div className="text-[11px] text-muted-light dark:text-muted-dark uppercase tracking-wider">
                Outstanding Backlog
              </div>
              <div className="text-xl font-bold tabular-nums">{remainingWorkHours} hours</div>
              <div className="text-[10px] text-muted-light dark:text-muted-dark">
                {backlogTasks.length} tasks remaining
              </div>
            </div>

            <div className="p-3 border border-hairline rounded bg-background space-y-1">
              <div className="text-[11px] text-muted-light dark:text-muted-dark uppercase tracking-wider">
                Feasibility Status
              </div>
              <div className="text-xl font-bold uppercase tracking-wider">
                {appState.feasibility.status}
              </div>
              <div className="text-[10px] text-muted-light dark:text-muted-dark">
                {appState.feasibility.surplusOrDeficitMinutes >= 0 ? "Surplus capacity" : "Deficit capacity"}
              </div>
            </div>
          </div>

          <div className="border border-hairline rounded p-4 bg-background space-y-3 text-xs">
            <div className="font-semibold text-xs uppercase tracking-wider pb-1 border-b border-hairline">
              Next-Week Priority Recommendations
            </div>
            <ul className="space-y-2 text-muted-light dark:text-muted-dark text-[11px] leading-relaxed list-disc pl-4">
              <li>
                <strong className="text-foreground">Probability & Statistics Focus:</strong> Complete Permutations & Combinations (PnC) before starting full mock testing.
              </li>
              <li>
                <strong className="text-foreground">DBMS Crash Course:</strong> Ensure the ~35h crash playlist is scheduled instead of the 92h full playlist to conserve 85.5 hours.
              </li>
              <li>
                <strong className="text-foreground">End-Sem Window (16–27 Nov):</strong> Ensure Game Theory and Big Data Analytics have completed course readings before 16 Nov.
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
