"use client";

import React, { useState } from "react";
import {
  Layers,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  BookOpen,
  Clock,
  ArrowUpDown,
} from "lucide-react";
import { AppStateData } from "@/lib/api";
import { calculateSelectedWorkload } from "@/domain/workload";
import { LectureCourseVariant } from "@/domain/types";

interface SubjectsViewProps {
  appState: AppStateData;
  onRefresh: () => void;
}

export function SubjectsView({ appState, onRefresh }: SubjectsViewProps) {
  const { courses, tasks } = appState;
  const [activeTab, setActiveTab] = useState<"gate" | "ese">("gate");

  // Calculate live selected workload
  const workload = calculateSelectedWorkload(courses as LectureCourseVariant[]);

  const handleSelectDbmsVariant = async (selectedVariantId: string) => {
    try {
      // In a real setup or via custom API
      const updatedCourses = courses.map((c) => {
        if (c.subjectId === "subj-dbms") {
          return { ...c, selected: c.id === selectedVariantId };
        }
        return c;
      });
      // Update local storage or state
      alert(
        `Switched DBMS course variant to: ${
          selectedVariantId === "course-dbms-crash"
            ? "35h Crash Course (Preferred)"
            : "92h Full Course (Alternative)"
        }. Replan your schedule to apply new time demands.`
      );
    } catch (err: any) {
      alert(`Error updating course variant: ${err.message}`);
    }
  };

  const gateCourses = courses.filter((c) => c.subjectId !== "subj-ese-dmm" && !c.subjectId.startsWith("subj-ese"));

  const eseSubjects = [
    { name: "Disaster Management (DMM)", ia: 19, needed: 61, weight: "1 (Easiest)", notes: "Needs 61/80 in sem exam for 80/100 total" },
    { name: "Deep Learning (DL)", ia: 14, needed: 66, weight: "2 (Familiar)", notes: "Needs 66/80 in sem exam for 80/100 total" },
    { name: "Big Data Analytics (BDA)", ia: 15, needed: 65, weight: "4 (New)", notes: "Needs 65/80 in sem exam for 80/100 total" },
    { name: "Natural Language Processing (NLP)", ia: 18, needed: 62, weight: "2 (Easier)", notes: "Needs 62/80 in sem exam for 80/100 total" },
    { name: "Game Theory (GT)", ia: 17, needed: 63, weight: "5 (Confusing)", notes: "Needs 63/80 in sem exam for 80/100 total. Highest priority in ESE" },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-hairline pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">Subjects & Workload</h1>
          <p className="text-xs text-muted-light dark:text-muted-dark mt-0.5">
            Quoted video runtime vs realistic note-taking multipliers &bull; Syllabus coverage
          </p>
        </div>

        <div className="flex items-center border border-hairline rounded p-0.5 text-xs bg-surface-light dark:bg-surface-dark">
          <button
            onClick={() => setActiveTab("gate")}
            className={`px-3 py-1 rounded transition-colors ${
              activeTab === "gate"
                ? "bg-solid-black text-solid-white dark:bg-solid-black dark:text-background font-medium"
                : "text-muted-light dark:text-muted-dark hover:text-foreground"
            }`}
          >
            GATE DA 2027
          </button>
          <button
            onClick={() => setActiveTab("ese")}
            className={`px-3 py-1 rounded transition-colors ${
              activeTab === "ese"
                ? "bg-solid-black text-solid-white dark:bg-solid-black dark:text-background font-medium"
                : "text-muted-light dark:text-muted-dark hover:text-foreground"
            }`}
          >
            End-Sem (ESE)
          </button>
        </div>
      </div>

      {activeTab === "gate" && (
        <div className="space-y-6">
          {/* Workload Math Summary Card (Section 2) */}
          <div className="p-4 border border-hairline rounded bg-surface-light dark:bg-surface-dark space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-hairline">
              <span className="font-bold uppercase tracking-wider text-xs">
                Lecture Workload & Multipliers Summary
              </span>
              <span className="text-xs text-muted-light dark:text-muted-dark">
                Section 2 Invariant
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <div className="text-[11px] text-muted-light dark:text-muted-dark">Quoted Source Runtime</div>
                <div className="text-xl font-bold tabular-nums">{workload.totalSourceHours}h</div>
                <div className="text-[10px] text-muted-light dark:text-muted-dark">Video length</div>
              </div>
              <div>
                <div className="text-[11px] text-muted-light dark:text-muted-dark">Effective Elapsed Effort</div>
                <div className="text-xl font-bold tabular-nums">{workload.totalEffectiveHours}h</div>
                <div className="text-[10px] text-muted-light dark:text-muted-dark">Real study time (1.5x–2.0x)</div>
              </div>
              <div>
                <div className="text-[11px] text-muted-light dark:text-muted-dark">Active Courses</div>
                <div className="text-xl font-bold tabular-nums">{workload.activeCourseCount}</div>
                <div className="text-[10px] text-muted-light dark:text-muted-dark">1 variant per subject</div>
              </div>
              <div>
                <div className="text-[11px] text-muted-light dark:text-muted-dark">Full DBMS Alternative</div>
                <div className="text-xl font-bold tabular-nums">499.0h</div>
                <div className="text-[10px] text-muted-light dark:text-muted-dark">If 92h playlist chosen</div>
              </div>
            </div>

            <p className="text-[11px] text-muted-light dark:text-muted-dark leading-relaxed">
              <strong>Notice:</strong> Multipliers account for notes, pause time, and problem solving. They are applied directly to source video runtimes and never divided by playback speed again.
            </p>
          </div>

          {/* DBMS Variant Switcher Box */}
          <div className="p-4 border border-hairline rounded bg-background space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs">DBMS Course Selection (Crash vs Full)</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded">
                Only one active at a time
              </span>
            </div>
            <p className="text-muted-light dark:text-muted-dark text-[11px]">
              User preference: ~35h crash course (52.5 effective hours) to avoid 138 effective hours of the 92h full course.
            </p>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="dbms_variant"
                  checked={courses.find((c) => c.id === "course-dbms-crash")?.selected}
                  onChange={() => handleSelectDbmsVariant("course-dbms-crash")}
                  className="accent-black dark:accent-white"
                />
                <span>35h Crash Course (Preferred, 52.5h effective)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="dbms_variant"
                  checked={courses.find((c) => c.id === "course-dbms-full")?.selected}
                  onChange={() => handleSelectDbmsVariant("course-dbms-full")}
                  className="accent-black dark:accent-white"
                />
                <span>92h Full Playlist (Alternative, 138h effective)</span>
              </label>
            </div>
          </div>

          {/* Courses & Lectures Table */}
          <div className="border border-hairline rounded overflow-hidden">
            <div className="p-3 bg-surface-light dark:bg-surface-dark border-b border-hairline font-bold text-xs uppercase tracking-wider">
              GATE Core Subjects & Multipliers
            </div>
            <div className="divide-y divide-hairline text-xs">
              {gateCourses.map((course) => {
                const effectiveHours = course.sourceRuntimeHours * course.effectiveMultiplier;
                const isWeak = course.subjectId === "subj-prob-stats" || course.subjectId === "subj-dbms";

                return (
                  <div key={course.id} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-neutral-50 dark:hover:bg-neutral-900">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{course.label}</span>
                        {isWeak && (
                          <span className="px-1.5 py-0.2 text-[9px] font-mono border border-hairline rounded">
                            Weak Baseline
                          </span>
                        )}
                        {course.subjectId === "subj-aptitude" && (
                          <span className="px-1.5 py-0.2 text-[9px] font-mono bg-neutral-200 dark:bg-neutral-800 rounded">
                            Locked until Dec 1
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-light dark:text-muted-dark mt-0.5">
                        {course.totalLectures ? `${course.totalLectures} lectures` : "Unknown lecture count"} &bull; Multiplier: {course.effectiveMultiplier}x
                      </div>
                    </div>

                    <div className="text-left sm:text-right shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-hairline sm:border-transparent">
                      <div className="font-mono tabular-nums font-semibold">
                        {course.sourceRuntimeHours}h video &rarr; {effectiveHours}h elapsed
                      </div>
                      <div className="text-[10px] text-muted-light dark:text-muted-dark">
                        {course.selected ? "Active in Schedule" : "Inactive Alternative"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === "ese" && (
        <div className="space-y-4">
          <div className="p-4 border border-hairline rounded bg-surface-light dark:bg-surface-dark space-y-2 text-xs">
            <div className="font-semibold text-xs uppercase tracking-wider">
              Semester Exam Target: Minimum 80 / 100 Total
            </div>
            <p className="text-[11px] text-muted-light dark:text-muted-dark leading-relaxed">
              Exclusively scheduled during the 16–27 Nov examination window (GATE study is 0 minutes by instruction). Safety margins are configurable; arithmetic goals do not represent confirmed institutional grade boundaries.
            </p>
          </div>

          <div className="border border-hairline rounded overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-light dark:bg-surface-dark border-b border-hairline text-muted-light dark:text-muted-dark uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3">Subject</th>
                  <th className="p-3">IA Marks</th>
                  <th className="p-3">Sem Exam Needed</th>
                  <th className="p-3">Difficulty Weight</th>
                  <th className="p-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {eseSubjects.map((s, idx) => (
                  <tr key={idx} className="hover:bg-neutral-50 dark:hover:bg-neutral-900">
                    <td className="p-3 font-semibold">{s.name}</td>
                    <td className="p-3 font-mono tabular-nums">{s.ia} / 20</td>
                    <td className="p-3 font-mono tabular-nums font-semibold">{s.needed} / 80</td>
                    <td className="p-3 font-mono text-[11px]">{s.weight}</td>
                    <td className="p-3 text-[11px] text-muted-light dark:text-muted-dark">{s.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
