"use client";

import React, { useState } from "react";
import { HelpCircle, CheckCircle2, XCircle, Clock, Plus, Filter } from "lucide-react";
import { AppStateData } from "@/lib/api";
import { QuestionAttempt } from "@/domain/types";

interface PyqViewProps {
  appState: AppStateData;
  onRefresh: () => void;
}

export function PyqView({ appState, onRefresh }: PyqViewProps) {
  const attempts: QuestionAttempt[] = appState.attempts || [];

  const [filterSubject, setFilterSubject] = useState("all");
  const [filterType, setFilterType] = useState<"all" | "embedded" | "independent">("all");
  const [openModal, setOpenModal] = useState(false);

  // Form state
  const [questionRef, setQuestionRef] = useState("");
  const [subjectId, setSubjectId] = useState("subj-prob-stats");
  const [year, setYear] = useState<number>(2024);
  const [marks, setMarks] = useState<number>(2);
  const [isEmbedded, setIsEmbedded] = useState(false);
  const [result, setResult] = useState<"correct" | "incorrect" | "skipped">("correct");
  const [confidence, setConfidence] = useState<"low" | "medium" | "high">("medium");
  const [timeTaken, setTimeTaken] = useState<number>(180); // seconds
  const [notes, setNotes] = useState("");

  // Distinct questions count
  const distinctQuestionIds = new Set(attempts.map((a: QuestionAttempt) => a.stableQuestionId));

  const filteredAttempts = attempts.filter((a: QuestionAttempt) => {
    if (filterSubject !== "all" && a.subjectId !== filterSubject) return false;
    if (filterType === "embedded" && !a.isEmbeddedInLecture) return false;
    if (filterType === "independent" && a.isEmbeddedInLecture) return false;
    return true;
  });

  const correctAttempts = attempts.filter((a: QuestionAttempt) => a.result === "correct").length;
  const accuracyPercent = attempts.length > 0 ? Math.round((correctAttempts / attempts.length) * 100) : 0;

  const handleRecordAttempt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionRef.trim()) return;

    try {
      // In a full implementation, call /api/attempts or repo.recordAttempt
      const stableId = `q-${subjectId}-${year}-${questionRef.replace(/\s+/g, "_")}`;
      const payload: Omit<QuestionAttempt, "id" | "userId"> = {
        stableQuestionId: stableId,
        subjectId,
        year,
        marks,
        isEmbeddedInLecture: isEmbedded,
        result,
        confidence,
        timeTakenSeconds: Number(timeTaken),
        notes: notes.trim() || undefined,
        attemptedAt: new Date().toISOString(),
      };

      // Call API
      const res = await fetch("/api/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      setQuestionRef("");
      setNotes("");
      setOpenModal(false);
      onRefresh();
    } catch (err: any) {
      alert(`Error saving PYQ attempt: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-hairline pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">PYQ Tracker</h1>
          <p className="text-xs text-muted-light dark:text-muted-dark mt-0.5">
            Topic-wise previous year questions &bull; Distinct question coverage vs total attempts
          </p>
        </div>

        <button
          onClick={() => setOpenModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 text-white dark:bg-white dark:text-black rounded text-xs font-medium hover:opacity-90 self-start sm:self-center shadow-2xs"
        >
          <Plus className="w-3.5 h-3.5 text-emerald-400" />
          <span>Record PYQ Attempt</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div className="p-3 border border-hairline rounded bg-surface-light dark:bg-surface-dark space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-muted-light dark:text-muted-dark">
            <span>Distinct Questions</span>
            <HelpCircle className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="text-xl font-bold tabular-nums font-mono">{distinctQuestionIds.size}</div>
          <div className="text-[10px] text-muted-light dark:text-muted-dark">Separate from attempts</div>
        </div>

        <div className="p-3 border border-hairline rounded bg-surface-light dark:bg-surface-dark space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-muted-light dark:text-muted-dark">
            <span>Total Attempts</span>
            <Clock className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-xl font-bold tabular-nums font-mono">{attempts.length}</div>
          <div className="text-[10px] text-muted-light dark:text-muted-dark">With timestamp history</div>
        </div>

        <div className="p-3 border border-hairline rounded bg-surface-light dark:bg-surface-dark space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-muted-light dark:text-muted-dark">
            <span>Logged Accuracy</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="text-xl font-bold tabular-nums font-mono">
            {attempts.length > 0 ? `${accuracyPercent}%` : "Not Yet Assessed"}
          </div>
          <div className="text-[10px] text-muted-light dark:text-muted-dark">Real data only</div>
        </div>

        <div className="p-3 border border-hairline rounded bg-surface-light dark:bg-surface-dark space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-muted-light dark:text-muted-dark">
            <span>Embedded In Lectures</span>
            <Clock className="w-3.5 h-3.5 text-purple-500" />
          </div>
          <div className="text-xl font-bold tabular-nums font-mono">
            {attempts.filter((a: QuestionAttempt) => a.isEmbeddedInLecture).length}
          </div>
          <div className="text-[10px] text-muted-light dark:text-muted-dark">No double-counted time</div>
        </div>
      </div>

      {/* Record Modal */}
      {openModal && (
        <form onSubmit={handleRecordAttempt} className="p-4 border border-hairline rounded bg-background space-y-3 text-xs">
          <div className="font-semibold text-sm">Record Question Attempt</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-medium mb-1">Question Reference / Name</label>
              <input
                type="text"
                placeholder="e.g. GATE DA 2024 Question 14 (Bayes Theorem)"
                value={questionRef}
                onChange={(e) => setQuestionRef(e.target.value)}
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
              <label className="block text-[11px] font-medium mb-1">Exam Year</label>
              <input
                type="number"
                min={2000}
                max={2026}
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full p-2 border border-hairline rounded bg-transparent text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium mb-1">Marks</label>
              <select
                value={marks}
                onChange={(e) => setMarks(Number(e.target.value))}
                className="w-full p-2 border border-hairline rounded bg-transparent text-xs"
              >
                <option value={1} className="bg-background">1 Mark</option>
                <option value={2} className="bg-background">2 Marks</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium mb-1">Result</label>
              <select
                value={result}
                onChange={(e) => setResult(e.target.value as any)}
                className="w-full p-2 border border-hairline rounded bg-transparent text-xs"
              >
                <option value="correct" className="bg-background">Correct</option>
                <option value="incorrect" className="bg-background">Incorrect</option>
                <option value="skipped" className="bg-background">Skipped</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium mb-1">Time Taken (Seconds)</label>
              <input
                type="number"
                min={10}
                max={1800}
                value={timeTaken}
                onChange={(e) => setTimeTaken(Number(e.target.value))}
                className="w-full p-2 border border-hairline rounded bg-transparent text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium mb-1">Confidence</label>
              <select
                value={confidence}
                onChange={(e) => setConfidence(e.target.value as any)}
                className="w-full p-2 border border-hairline rounded bg-transparent text-xs"
              >
                <option value="high" className="bg-background">High</option>
                <option value="medium" className="bg-background">Medium</option>
                <option value="low" className="bg-background">Low</option>
              </select>
            </div>
            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isEmbedded}
                  onChange={(e) => setIsEmbedded(e.target.checked)}
                  className="accent-black dark:accent-white"
                />
                <span>Embedded in Video Lecture</span>
              </label>
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-medium mb-1">Error notes / learning takeaway</label>
            <input
              type="text"
              placeholder="e.g. Calculation error in conditional denominator"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2 border border-hairline rounded bg-transparent text-xs"
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setOpenModal(false)}
              className="px-3 py-1.5 border border-hairline rounded hover:bg-neutral-100 dark:hover:bg-neutral-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 bg-neutral-900 text-white dark:bg-white dark:text-black rounded font-medium"
            >
              Save Attempt
            </button>
          </div>
        </form>
      )}

      {/* Attempts List */}
      <div className="border border-hairline rounded overflow-hidden">
        <div className="p-3 bg-surface-light dark:bg-surface-dark border-b border-hairline flex items-center justify-between text-xs font-bold uppercase tracking-wider">
          <span>Question Attempts History</span>
          <span className="text-[11px] text-muted-light dark:text-muted-dark normal-case font-normal">
            {filteredAttempts.length} logged attempt(s)
          </span>
        </div>

        {filteredAttempts.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-light dark:text-muted-dark space-y-1">
            <div>No PYQ attempts logged yet.</div>
            <div className="text-[11px]">
              Record questions attempted during lectures or independent problem sessions.
            </div>
          </div>
        ) : (
          <div className="divide-y divide-hairline text-xs">
            {filteredAttempts.map((attempt: QuestionAttempt) => {
              const isCorrect = attempt.result === "correct";
              const isIncorrect = attempt.result === "incorrect";

              return (
                <div key={attempt.id} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors">
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    {isCorrect ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5 sm:mt-0 stroke-[2.5]" />
                    ) : isIncorrect ? (
                      <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5 sm:mt-0 stroke-[2.5]" />
                    ) : (
                      <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5 sm:mt-0" />
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{attempt.stableQuestionId}</span>
                        <span className={`px-1.5 py-0.2 text-[9px] font-mono border rounded uppercase font-semibold ${
                          isCorrect
                            ? "border-emerald-200 dark:border-emerald-900 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300"
                            : isIncorrect
                            ? "border-rose-200 dark:border-rose-900 bg-rose-50/60 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300"
                            : "border-amber-200 dark:border-amber-900 bg-amber-50/60 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300"
                        }`}>
                          {attempt.result}
                        </span>
                        {attempt.isEmbeddedInLecture && (
                          <span className="px-1.5 py-0.2 text-[9px] font-mono border border-blue-200 dark:border-blue-900 bg-blue-50/60 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 rounded">
                            Embedded Attempt
                          </span>
                        )}
                      </div>
                      {attempt.notes && (
                        <div className="text-[11px] text-muted-light dark:text-muted-dark mt-0.5">
                          {attempt.notes}
                        </div>
                      )}
                    </div>
                  </div>

                <div className="text-left sm:text-right text-[11px] shrink-0 font-mono tabular-nums text-muted-light dark:text-muted-dark pt-1 sm:pt-0 border-t sm:border-t-0 border-hairline sm:border-transparent">
                  <div>{attempt.timeTakenSeconds}s &bull; Confidence: {attempt.confidence}</div>
                  <div className="text-[10px]">{new Date(attempt.attemptedAt).toLocaleDateString()}</div>
                </div>
              </div>
            );
          })}
          </div>
        )}
      </div>
    </div>
  );
}
