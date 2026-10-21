"use client";

import React, { useState } from "react";
import { BookOpen, Plus, AlertCircle, CheckCircle2, TrendingUp } from "lucide-react";
import { AppStateData, recordMockTest } from "@/lib/api";
import { MockTestRecord } from "@/domain/types";
import { formatDisplayDateIST } from "@/domain/dates";

interface MocksViewProps {
  appState: AppStateData;
  onRefresh: () => void;
}

export function MocksView({ appState, onRefresh }: MocksViewProps) {
  const { mocks } = appState;

  const [openModal, setOpenModal] = useState(false);
  const [testNumber, setTestNumber] = useState<number>(1);
  const [paperSource, setPaperSource] = useState("");
  const [rawScore, setRawScore] = useState<number>(45.0);
  const [maxMarks, setMaxMarks] = useState<number>(100.0);
  const [correctCount, setCorrectCount] = useState<number>(25);
  const [incorrectCount, setIncorrectCount] = useState<number>(10);
  const [skippedCount, setSkippedCount] = useState<number>(30);
  const [negativeMarks, setNegativeMarks] = useState<number>(3.33);
  const [analysisCompleted, setAnalysisCompleted] = useState<boolean>(true);
  const [analysisNotes, setAnalysisNotes] = useState("");
  const [testDate, setTestDate] = useState(appState.today);

  // Separate historical baseline (GATE DA 2026 with 21/100) from current preparation mocks!
  const historicalBaseline = mocks.find((m) => m.isHistoricalBaseline);
  const currentMocks = mocks
    .filter((m) => !m.isHistoricalBaseline)
    .sort((a, b) => a.testNumber - b.testNumber);

  // Rolling last-three average
  const lastThree = currentMocks.slice(-3);
  const rollingAverage =
    lastThree.length > 0
      ? Number((lastThree.reduce((sum, m) => sum + m.rawScore, 0) / lastThree.length).toFixed(1))
      : null;

  const handleRecordMock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paperSource.trim()) return;

    if (rawScore > maxMarks || rawScore < -33.33) {
      alert(`Invalid score. Raw score cannot exceed maximum marks (${maxMarks}).`);
      return;
    }

    try {
      await recordMockTest({
        testNumber: Number(testNumber),
        isHistoricalBaseline: false,
        testDate,
        paperSource: paperSource.trim(),
        rawScore: Number(rawScore),
        maxMarks: Number(maxMarks),
        correctCount: Number(correctCount),
        incorrectCount: Number(incorrectCount),
        skippedCount: Number(skippedCount),
        negativeMarks: Number(negativeMarks),
        timeSpentMinutes: 180,
        analysisCompleted,
        analysisNotes: analysisNotes.trim() || undefined,
      });

      setPaperSource("");
      setAnalysisNotes("");
      setOpenModal(false);
      onRefresh();
    } catch (err: any) {
      alert(`Failed to save mock test: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-hairline pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">Mock Score Analytics</h1>
          <p className="text-xs text-muted-light dark:text-muted-dark mt-0.5">
            12 core + 3 stretch mocks target &bull; Real performance only (no fabricated AIR predictions)
          </p>
        </div>

        <button
          onClick={() => setOpenModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 text-white dark:bg-white dark:text-black rounded text-xs font-medium hover:opacity-90 self-start sm:self-center"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Record Mock Result</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div className="p-3 border border-hairline rounded bg-surface-light dark:bg-surface-dark space-y-1">
          <div className="text-[11px] uppercase tracking-wider text-muted-light dark:text-muted-dark">
            Core Mocks Taken
          </div>
          <div className="text-xl font-bold tabular-nums">
            {currentMocks.length} / 12
          </div>
          <div className="text-[10px] text-muted-light dark:text-muted-dark">Target: 12 mandatory</div>
        </div>

        <div className="p-3 border border-hairline rounded bg-surface-light dark:bg-surface-dark space-y-1">
          <div className="text-[11px] uppercase tracking-wider text-muted-light dark:text-muted-dark">
            Rolling Last-3 Average
          </div>
          <div className="text-xl font-bold tabular-nums">
            {rollingAverage !== null ? `${rollingAverage} / 100` : "Not Yet Assessed"}
          </div>
          <div className="text-[10px] text-muted-light dark:text-muted-dark">Recent calibrated pace</div>
        </div>

        <div className="p-3 border border-hairline rounded bg-surface-light dark:bg-surface-dark space-y-1">
          <div className="text-[11px] uppercase tracking-wider text-muted-light dark:text-muted-dark">
            Historical Baseline
          </div>
          <div className="text-xl font-bold tabular-nums font-mono">
            {historicalBaseline ? `${historicalBaseline.rawScore} / 100` : "21 / 100"}
          </div>
          <div className="text-[10px] text-muted-light dark:text-muted-dark">GATE DA 2026 attempt</div>
        </div>

        <div className="p-3 border border-hairline rounded bg-surface-light dark:bg-surface-dark space-y-1">
          <div className="text-[11px] uppercase tracking-wider text-muted-light dark:text-muted-dark">
            Target Goal
          </div>
          <div className="text-xl font-bold tabular-nums">80+ Marks</div>
          <div className="text-[10px] text-muted-light dark:text-muted-dark">Aspirational AIR &lt;100</div>
        </div>
      </div>

      {/* Historical Baseline Card (Explicitly Preserved Separate - Section 4.6) */}
      <div className="p-4 border border-hairline rounded bg-surface-light dark:bg-surface-dark space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold">
            <span className="w-2 h-2 rounded-full bg-neutral-400" />
            <span>Preserved Baseline: GATE DA 2026 Attempt (Score: 21.0 / 100)</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 bg-neutral-200 dark:bg-neutral-800 rounded">
            Historical Baseline Only
          </span>
        </div>
        <p className="text-muted-light dark:text-muted-dark text-[11px] leading-relaxed">
          The user attempted GATE DA 2026 with ~two weeks of preparation and scored 21/100. This is strictly preserved as a historical self-reported reference point and is <strong>never counted</strong> toward current 2027 preparation mock targets or trend calculations.
        </p>
      </div>

      {/* Record Mock Modal */}
      {openModal && (
        <form onSubmit={handleRecordMock} className="p-4 border border-hairline rounded bg-background space-y-3 text-xs">
          <div className="font-semibold text-sm">Record Mock Exam Result</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-medium mb-1">Mock Number (1–15)</label>
              <input
                type="number"
                min={1}
                max={15}
                value={testNumber}
                onChange={(e) => setTestNumber(Number(e.target.value))}
                className="w-full p-2 border border-hairline rounded bg-transparent text-xs"
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-medium mb-1">Paper Source / Test Series</label>
              <input
                type="text"
                placeholder="e.g. Made Easy Mock 1 / GO Classes Full Test 1"
                value={paperSource}
                onChange={(e) => setPaperSource(e.target.value)}
                className="w-full p-2 border border-hairline rounded bg-transparent text-xs"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium mb-1">Raw Score</label>
              <input
                type="number"
                step="0.01"
                min={-33.33}
                max={100}
                value={rawScore}
                onChange={(e) => setRawScore(Number(e.target.value))}
                className="w-full p-2 border border-hairline rounded bg-transparent text-xs"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium mb-1">Maximum Marks</label>
              <input
                type="number"
                value={maxMarks}
                onChange={(e) => setMaxMarks(Number(e.target.value))}
                className="w-full p-2 border border-hairline rounded bg-transparent text-xs"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium mb-1">Negative Marks Lost</label>
              <input
                type="number"
                step="0.01"
                min={0}
                max={50}
                value={negativeMarks}
                onChange={(e) => setNegativeMarks(Number(e.target.value))}
                className="w-full p-2 border border-hairline rounded bg-transparent text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium mb-1">Correct Questions</label>
              <input
                type="number"
                min={0}
                max={65}
                value={correctCount}
                onChange={(e) => setCorrectCount(Number(e.target.value))}
                className="w-full p-2 border border-hairline rounded bg-transparent text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium mb-1">Incorrect Questions</label>
              <input
                type="number"
                min={0}
                max={65}
                value={incorrectCount}
                onChange={(e) => setIncorrectCount(Number(e.target.value))}
                className="w-full p-2 border border-hairline rounded bg-transparent text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium mb-1">Skipped Questions</label>
              <input
                type="number"
                min={0}
                max={65}
                value={skippedCount}
                onChange={(e) => setSkippedCount(Number(e.target.value))}
                className="w-full p-2 border border-hairline rounded bg-transparent text-xs"
              />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-medium mb-1">Analysis & Mistake Notes</label>
            <input
              type="text"
              placeholder="e.g. Lost 6 marks on DBMS Normal Forms; Linear Algebra was solid"
              value={analysisNotes}
              onChange={(e) => setAnalysisNotes(e.target.value)}
              className="w-full p-2 border border-hairline rounded bg-transparent text-xs"
            />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={analysisCompleted}
                onChange={(e) => setAnalysisCompleted(e.target.checked)}
                className="accent-black dark:accent-white"
              />
              <span>Full 2h Mock Analysis Completed</span>
            </label>
            <div className="flex items-center justify-end gap-2">
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
                Save Mock Score
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Mocks Table */}
      <div className="border border-hairline rounded overflow-hidden">
        <div className="p-3 bg-surface-light dark:bg-surface-dark border-b border-hairline font-bold text-xs uppercase tracking-wider">
          GATE DA 2027 Mock Tests Log
        </div>

        {currentMocks.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-light dark:text-muted-dark space-y-1">
            <BookOpen className="w-6 h-6 mx-auto stroke-1" />
            <div>No 2027 preparation mocks logged yet.</div>
            <div className="text-[11px]">
              Full-length mocks will be scheduled as 180-minute uninterrupted sessions with separate review blocks.
            </div>
          </div>
        ) : (
          <div className="divide-y divide-hairline text-xs">
            {currentMocks.map((mock) => (
              <div key={mock.id} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-neutral-50 dark:hover:bg-neutral-900">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">Mock #{mock.testNumber}: {mock.paperSource}</span>
                    {mock.analysisCompleted && (
                      <span className="px-1.5 py-0.2 text-[9px] font-mono bg-neutral-200 dark:bg-neutral-800 rounded flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Analysis Done
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-light dark:text-muted-dark mt-0.5">
                    {formatDisplayDateIST(mock.testDate)} &bull; Correct: {mock.correctCount} &bull; Incorrect: {mock.incorrectCount} &bull; Skipped: {mock.skippedCount}
                  </div>
                  {mock.analysisNotes && (
                    <div className="text-[11px] text-muted-light dark:text-muted-dark italic mt-0.5">
                      {mock.analysisNotes}
                    </div>
                  )}
                </div>

                <div className="text-left sm:text-right font-mono tabular-nums shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-hairline sm:border-transparent">
                  <div className="text-base font-bold">
                    {mock.rawScore} / {mock.maxMarks}
                  </div>
                  <div className="text-[10px] text-muted-light dark:text-muted-dark">
                    - {mock.negativeMarks} negative marks
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
