"use client";

import React, { useState } from "react";
import { Clock, CheckCircle2, AlertTriangle, Calendar, Info, RefreshCw } from "lucide-react";
import { AppStateData, updateAttendance } from "@/lib/api";
import { formatDisplayDateIST } from "@/domain/dates";
import { AttendanceDayRecord } from "@/domain/types";

interface AttendanceViewProps {
  appState: AppStateData;
  onRefresh: () => void;
}

export function AttendanceView({ appState, onRefresh }: AttendanceViewProps) {
  const { attendance = [] } = appState;

  // Institutional threshold states
  const [requiredPercent, setRequiredPercent] = useState<number>(75);
  const [totalClassesHeld, setTotalClassesHeld] = useState<number>(100);
  const [totalClassesAttended, setTotalClassesAttended] = useState<number>(82);

  // Sorting attendance records
  const sortedAttendance = [...attendance].sort((a, b) => a.localDate.localeCompare(b.localDate));

  // Institutional working days count
  const institutionalWorkingDays = sortedAttendance.filter((r) => r.isWorkingDay);
  const plannedAttendingDays = sortedAttendance.filter((r) => r.isWorkingDay && r.plannedAttendance);
  const plannedLeaveDays = sortedAttendance.filter((r) => r.isWorkingDay && !r.plannedAttendance);

  // Attendance projection calculation
  // Assuming 5 classes per institutional working day
  const classesPerDay = 5;
  const projectedFutureHeld = institutionalWorkingDays.length * classesPerDay;
  const projectedFutureAttended = plannedAttendingDays.length * classesPerDay;

  const totalProjectedHeld = totalClassesHeld + projectedFutureHeld;
  const totalProjectedAttended = totalClassesAttended + projectedFutureAttended;

  const currentPercent =
    totalClassesHeld > 0 ? Number(((totalClassesAttended / totalClassesHeld) * 100).toFixed(1)) : null;
  const projectedPercent =
    totalProjectedHeld > 0
      ? Number(((totalProjectedAttended / totalProjectedHeld) * 100).toFixed(1))
      : null;

  const isAttendanceAtRisk = projectedPercent !== null && projectedPercent < requiredPercent;

  const handleToggleDayAttendance = async (record: AttendanceDayRecord) => {
    if (!record.isWorkingDay) {
      alert("Cannot alter attendance on weekends or public holidays (college is closed).");
      return;
    }

    try {
      const nextPlanned = !record.plannedAttendance;
      await updateAttendance(record.localDate, {
        plannedAttendance: nextPlanned,
        userConfirmed: true,
      });
      onRefresh();
    } catch (err: any) {
      alert(`Failed to update attendance day: ${err.message}`);
    }
  };

  const handleApplyAlternatingProposal = async () => {
    if (!confirm("Apply alternating-day attendance proposal across all January working days? (Day 1 attend, Day 2 off, etc.)")) return;
    try {
      let counter = 0;
      for (const rec of sortedAttendance) {
        if (rec.isWorkingDay) {
          counter++;
          const shouldAttend = counter % 2 === 1;
          await updateAttendance(rec.localDate, {
            plannedAttendance: shouldAttend,
            userConfirmed: true,
          });
        }
      }
      onRefresh();
    } catch (err: any) {
      alert(`Failed to apply proposal: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 border-b border-hairline pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">January Attendance Planner</h1>
          <p className="text-xs text-muted-light dark:text-muted-dark mt-0.5">
            College resumption (11 Jan 2027) &bull; 4h commute accounting &bull; Institutional compliance check
          </p>
        </div>

        <button
          onClick={handleApplyAlternatingProposal}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-hairline rounded text-xs font-medium hover:bg-neutral-100 dark:hover:bg-neutral-900 self-start sm:self-center"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Apply Alternating Proposal</span>
        </button>
      </div>

      {/* Compliance Risk Warning Banner (Section 4.9) */}
      {isAttendanceAtRisk && (
        <div className="p-3.5 bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded text-xs space-y-1">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="w-4 h-4 text-black dark:text-white shrink-0" />
            <span>Attendance Compliance Warning: Below {requiredPercent}% Threshold</span>
          </div>
          <p className="text-muted-light dark:text-muted-dark pl-6 leading-relaxed">
            Your planned attendance would result in a projected attendance of{" "}
            <strong className="text-foreground tabular-nums font-bold">{projectedPercent}%</strong>, which breaches your institution&apos;s required threshold of {requiredPercent}%. StudyOS never recommends violating compulsory attendance rules. Please increase your planned college attendance days.
          </p>
        </div>
      )}

      {/* Commute and Rules Explanation Box */}
      <div className="p-4 border border-hairline rounded bg-surface-light dark:bg-surface-dark space-y-2 text-xs leading-relaxed">
        <div className="font-semibold text-xs uppercase tracking-wider flex items-center gap-2">
          <Info className="w-4 h-4" />
          <span>Section 4.9 Planning Invariants</span>
        </div>
        <ul className="list-disc pl-4 space-y-1 text-muted-light dark:text-muted-dark text-[11px]">
          <li>
            <strong>College Working Day:</strong> ~2h outbound + ~2h return commute (~4 hours roundtrip); home ~18:00. Commuting is <strong>not</strong> counted as study time. Evening capacity defaults to a realistic <strong>105 minutes (1.75h)</strong>.
          </li>
          <li>
            <strong>Off-College Self-Study Day:</strong> Full daytime study capacity defaults to <strong>450 minutes (7.5h)</strong>.
          </li>
          <li>
            <strong>Public Holidays & Weekends:</strong> 26 Jan is India Republic Day (public holiday). Weekends are closed. College attendance cannot be scheduled on non-working days.
          </li>
        </ul>
      </div>

      {/* Institutional Attendance Calculator Card */}
      <div className="p-4 border border-hairline rounded bg-background space-y-3 text-xs">
        <div className="font-semibold text-xs uppercase tracking-wider pb-1 border-b border-hairline">
          Institutional Attendance Tracker
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-medium mb-1">Required Threshold (%)</label>
            <input
              type="number"
              min={50}
              max={100}
              value={requiredPercent}
              onChange={(e) => setRequiredPercent(Number(e.target.value))}
              className="w-full p-2 border border-hairline rounded bg-transparent text-xs"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium mb-1">Classes Held So Far</label>
            <input
              type="number"
              min={0}
              value={totalClassesHeld}
              onChange={(e) => setTotalClassesHeld(Number(e.target.value))}
              className="w-full p-2 border border-hairline rounded bg-transparent text-xs"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium mb-1">Classes Attended So Far</label>
            <input
              type="number"
              min={0}
              max={totalClassesHeld}
              value={totalClassesAttended}
              onChange={(e) => setTotalClassesAttended(Number(e.target.value))}
              className="w-full p-2 border border-hairline rounded bg-transparent text-xs"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 text-xs">
          <div className="p-2.5 border border-hairline rounded bg-surface-light dark:bg-surface-dark space-y-0.5">
            <div className="text-[10px] text-muted-light dark:text-muted-dark uppercase tracking-wider">Current Attendance</div>
            <div className="text-base font-bold tabular-nums">
              {currentPercent !== null ? `${currentPercent}%` : "Insufficient Data"}
            </div>
            <div className="text-[10px] text-muted-light dark:text-muted-dark">{totalClassesAttended}/{totalClassesHeld} classes</div>
          </div>

          <div className="p-2.5 border border-hairline rounded bg-surface-light dark:bg-surface-dark space-y-0.5">
            <div className="text-[10px] text-muted-light dark:text-muted-dark uppercase tracking-wider">Projected Attendance</div>
            <div className={`text-base font-bold tabular-nums ${isAttendanceAtRisk ? "text-red-600 dark:text-red-400" : ""}`}>
              {projectedPercent !== null ? `${projectedPercent}%` : "Insufficient Data"}
            </div>
            <div className="text-[10px] text-muted-light dark:text-muted-dark">After planned Jan days</div>
          </div>

          <div className="p-2.5 border border-hairline rounded bg-surface-light dark:bg-surface-dark space-y-0.5">
            <div className="text-[10px] text-muted-light dark:text-muted-dark uppercase tracking-wider">Jan Working Days</div>
            <div className="text-base font-bold tabular-nums">{institutionalWorkingDays.length} days</div>
            <div className="text-[10px] text-muted-light dark:text-muted-dark">Excluding weekends & 26 Jan</div>
          </div>

          <div className="p-2.5 border border-hairline rounded bg-surface-light dark:bg-surface-dark space-y-0.5">
            <div className="text-[10px] text-muted-light dark:text-muted-dark uppercase tracking-wider">Planned Attendance</div>
            <div className="text-base font-bold tabular-nums">{plannedAttendingDays.length} days</div>
            <div className="text-[10px] text-muted-light dark:text-muted-dark">{plannedLeaveDays.length} self-study days</div>
          </div>
        </div>
      </div>

      {/* Attendance Days Grid */}
      <div className="border border-hairline rounded overflow-hidden">
        <div className="p-3 bg-surface-light dark:bg-surface-dark border-b border-hairline font-bold text-xs uppercase tracking-wider flex items-center justify-between">
          <span>January 2027 Calendar Grid</span>
          <span className="text-[11px] text-muted-light dark:text-muted-dark normal-case font-normal">
            Click any working day to toggle between College Attendance (105m) and Self-Study (450m)
          </span>
        </div>

        <div className="divide-y divide-hairline text-xs">
          {sortedAttendance.map((rec) => {
            const isCollege = rec.isWorkingDay && rec.plannedAttendance;
            const isOffDay = rec.isWorkingDay && !rec.plannedAttendance;
            const isHolidayOrWeekend = !rec.isWorkingDay;

            return (
              <div
                key={rec.localDate}
                className={`p-3 flex items-center justify-between transition-colors ${
                  rec.isWorkingDay ? "hover:bg-neutral-50 dark:hover:bg-neutral-900 cursor-pointer" : "opacity-60 bg-neutral-50/50 dark:bg-neutral-900/50"
                }`}
                onClick={() => rec.isWorkingDay && handleToggleDayAttendance(rec)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 font-mono text-[11px] text-muted-light dark:text-muted-dark shrink-0">
                    {rec.localDate.substring(8)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{formatDisplayDateIST(rec.localDate)}</span>
                      {rec.isPublicHoliday && (
                        <span className="px-1.5 py-0.2 text-[9px] font-mono border border-hairline rounded">
                          Republic Day Holiday
                        </span>
                      )}
                      {!rec.isWorkingDay && !rec.isPublicHoliday && (
                        <span className="px-1.5 py-0.2 text-[9px] font-mono border border-hairline rounded">
                          Weekend
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-light dark:text-muted-dark mt-0.5">
                      {isCollege && "Attending College (~4h commute; light evening study: 105m)"}
                      {isOffDay && "Off-College Self-Study Day (Full daytime capacity: 450m)"}
                      {isHolidayOrWeekend && "College Closed (Holiday capacity: 450m)"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="font-mono tabular-nums text-right text-[11px]">
                    <div className="font-semibold">{rec.focusedStudyCapacityMinutes} min capacity</div>
                    <div className="text-[10px] text-muted-light dark:text-muted-dark">
                      {rec.isWorkingDay ? (rec.plannedAttendance ? "College Day" : "Self-Study") : "Holiday"}
                    </div>
                  </div>

                  {rec.isWorkingDay && (
                    <button
                      type="button"
                      className={`px-2.5 py-1 text-[11px] rounded border border-hairline font-medium ${
                        isCollege
                          ? "bg-solid-black text-solid-white dark:bg-solid-black dark:text-background"
                          : "bg-surface-light dark:bg-surface-dark text-muted-light dark:text-muted-dark"
                      }`}
                    >
                      {isCollege ? "Attending" : "Self-Study"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
