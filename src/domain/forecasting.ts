/**
 * StudyOS Capacity & Demand Feasibility Forecasting Engine
 * Pure domain logic implementing Section 3 of StudyOS Implementation Plan.
 * Mathematically honest: never promises feasibility or fabricates positive outcomes.
 */

import { addDaysIST, diffDaysIST } from "./dates";
import { DayCapacity, FeasibilitySummary, ScenarioProjection, StudyTask } from "./types";

export interface ForecastOptions {
  currentLocalDate: string;
  examDate: string; // e.g. "2027-02-06"
  targetScoreGoal?: number; // 80 (Informational only, not used to predict score)
}

/**
 * Calculates remaining incomplete work minutes across tasks.
 * Embedded problems in lectures are accounted for inside lecture times and NOT double counted.
 */
export function calculateRemainingWorkMinutes(tasks: StudyTask[]): {
  totalRemainingMinutes: number;
  bySubject: Record<string, number>;
  byType: Record<string, number>;
} {
  let totalRemainingMinutes = 0;
  const bySubject: Record<string, number> = {};
  const byType: Record<string, number> = {};

  for (const task of tasks) {
    if (task.status === "done" || task.status === "canceled") {
      continue;
    }

    const remaining = Math.max(0, task.estimatedMinutes - task.completedMinutes);
    totalRemainingMinutes += remaining;

    bySubject[task.subjectId] = (bySubject[task.subjectId] || 0) + remaining;
    byType[task.type] = (byType[task.type] || 0) + remaining;
  }

  return {
    totalRemainingMinutes,
    bySubject,
    byType,
  };
}

/**
 * Calculates total available net capacity minutes from day capacities within the planning window.
 */
export function calculateRemainingCapacityMinutes(
  dayCapacities: DayCapacity[],
  startDate: string,
  endDate: string
): {
  totalNetMinutes: number;
  totalGrossMinutes: number;
  availableDaysCount: number;
  byDate: Record<string, number>;
} {
  let totalNetMinutes = 0;
  let totalGrossMinutes = 0;
  let availableDaysCount = 0;
  const byDate: Record<string, number> = {};

  for (const cap of dayCapacities) {
    if (cap.localDate >= startDate && cap.localDate <= endDate) {
      totalNetMinutes += cap.netAvailableMinutes;
      totalGrossMinutes += cap.grossAvailableMinutes;
      if (cap.netAvailableMinutes > 0) {
        availableDaysCount++;
      }
      byDate[cap.localDate] = cap.netAvailableMinutes;
    }
  }

  return {
    totalNetMinutes,
    totalGrossMinutes,
    availableDaysCount,
    byDate,
  };
}

/**
 * Core Feasibility Calculation
 */
export function computeFeasibility(
  tasks: StudyTask[],
  dayCapacities: DayCapacity[],
  options: ForecastOptions
): FeasibilitySummary {
  const { currentLocalDate, examDate } = options;

  const { totalRemainingMinutes } = calculateRemainingWorkMinutes(tasks);
  const { totalNetMinutes, availableDaysCount } = calculateRemainingCapacityMinutes(
    dayCapacities,
    currentLocalDate,
    examDate
  );

  const surplusOrDeficitMinutes = totalNetMinutes - totalRemainingMinutes;
  const deficitHours = Number((Math.abs(surplusOrDeficitMinutes) / 60).toFixed(1));
  const workHours = Number((totalRemainingMinutes / 60).toFixed(1));
  const capHours = Number((totalNetMinutes / 60).toFixed(1));

  // Required average hours per available day
  const requiredAverageHoursPerAvailableDay =
    availableDaysCount > 0
      ? Number((totalRemainingMinutes / 60 / availableDaysCount).toFixed(1))
      : 0;

  // Determine minimum achievable completion date by accumulating daily net capacity
  let accumulatedCap = 0;
  let minimumAchievableCompletionDate: string | null = null;

  // Sort capacities chronologically
  const sortedCapacities = [...dayCapacities]
    .filter((c) => c.localDate >= currentLocalDate)
    .sort((a, b) => a.localDate.localeCompare(b.localDate));

  for (const cap of sortedCapacities) {
    accumulatedCap += cap.netAvailableMinutes;
    if (accumulatedCap >= totalRemainingMinutes && totalRemainingMinutes > 0) {
      minimumAchievableCompletionDate = cap.localDate;
      break;
    }
  }

  // Determine Feasibility Status and explicit reasons
  const reasons: string[] = [];
  let status: "on_track" | "at_risk" | "infeasible" = "on_track";

  if (surplusOrDeficitMinutes < 0) {
    status = "infeasible";
    reasons.push(
      `HARD TIME DEFICIT: Remaining study demand (${workHours}h) exceeds net available capacity (${capHours}h) by ${deficitHours} hours before exam date ${examDate}.`
    );
  } else if (surplusOrDeficitMinutes < totalNetMinutes * 0.15) {
    status = "at_risk";
    reasons.push(
      `TIGHT CAPACITY MARGIN: Remaining surplus is only ${Number((surplusOrDeficitMinutes / 60).toFixed(1))}h (${Math.round((surplusOrDeficitMinutes / totalNetMinutes) * 100)}% buffer), leaving little room for unexpected delays.`
    );
  } else {
    reasons.push(
      `NET TIME SURPLUS: Net study capacity exceeds demand by ${Number((surplusOrDeficitMinutes / 60).toFixed(1))} hours.`
    );
  }

  if (minimumAchievableCompletionDate && minimumAchievableCompletionDate > examDate) {
    reasons.push(
      `COMPLETION AFTER DEADLINE: Earliest achievable completion date (${minimumAchievableCompletionDate}) falls after the target exam date (${examDate}).`
    );
  }

  // Scenarios Model (Clearly labeled as mathematical models, NOT predictions)
  const scenarios = {
    bestCase: evaluateScenario(
      totalRemainingMinutes,
      sortedCapacities,
      examDate,
      0.85, // 15% faster due to high recall
      0, // 0 missed days
      "Best-Case (15% faster recall, 0 missed days)"
    ),
    baseCase: evaluateScenario(
      totalRemainingMinutes,
      sortedCapacities,
      examDate,
      1.0, // Baseline multiplier
      3, // 3 unforeseen missed days
      "Base-Case (Standard multiplier, 3 missed days)"
    ),
    worstCase: evaluateScenario(
      totalRemainingMinutes,
      sortedCapacities,
      examDate,
      1.25, // 25% slower / difficult topics
      7, // 7 missed/sick days
      "Worst-Case (25% slower pace, 7 missed days)"
    ),
  };

  return {
    status,
    totalRemainingWorkMinutes: totalRemainingMinutes,
    totalRemainingCapacityMinutes: totalNetMinutes,
    surplusOrDeficitMinutes,
    requiredAverageHoursPerAvailableDay,
    minimumAchievableCompletionDate,
    totalAvailableDays: availableDaysCount,
    scenarios,
    reasons,
  };
}

function evaluateScenario(
  baseWorkMinutes: number,
  capacities: DayCapacity[],
  examDate: string,
  paceFactor: number,
  missedDaysAssumption: number,
  label: string
): ScenarioProjection {
  const adjustedWork = Math.round(baseWorkMinutes * paceFactor);
  let accumulated = 0;
  let completionDate: string | null = null;

  // Skip the first N eligible days according to missedDaysAssumption
  let skipped = 0;
  for (const cap of capacities) {
    if (cap.netAvailableMinutes > 0 && skipped < missedDaysAssumption) {
      skipped++;
      continue;
    }

    accumulated += cap.netAvailableMinutes;
    if (accumulated >= adjustedWork && completionDate === null) {
      completionDate = cap.localDate;
      break;
    }
  }

  let status: "on_track" | "at_risk" | "infeasible" = "on_track";
  if (!completionDate || completionDate > examDate) {
    status = "infeasible";
  } else if (diffDaysIST(completionDate, examDate) < 5) {
    status = "at_risk";
  }

  // Feasible mock count estimation: 180 min per mock + 120 min review = 300 min per mock
  const remainingForMocks = Math.max(0, accumulated - adjustedWork);
  const feasibleMocks = Math.min(15, Math.floor(remainingForMocks / 300));

  return {
    label,
    multiplierAdjustment: paceFactor,
    missedDaysAssumption,
    projectedCompletionDate: completionDate,
    feasibleMocksCount: feasibleMocks,
    status,
  };
}
