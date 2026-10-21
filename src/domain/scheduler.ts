/**
 * StudyOS Adaptive Deterministic Replanning Engine
 * Pure domain logic implementing Section 3 of StudyOS Implementation Plan.
 * Features:
 * - Deterministic: Same input -> byte-identical assignments
 * - Idempotent: Replanning twice produces identical schedule, no duplicate chunks
 * - 25-120 min chunking for regular study tasks
 * - 180 min atomic uninterrupted slots for full-length mocks
 * - Strict calendar lock enforcement (ESE only, Project freeze, Aptitude start)
 * - Explicit residual backlog (never drops tasks or overfills days)
 * - Explainable why notes for every assignment
 */

import { addDaysIST, diffDaysIST } from "./dates";
import { checkTaskEligibilityOnDate } from "./calendar";
import { computeFeasibility } from "./forecasting";
import {
  DayCapacity,
  PlanPreview,
  ScheduleAssignment,
  StudyTask,
  TaskType,
} from "./types";

export interface ReplannerInputs {
  tasks: StudyTask[];
  currentLocalDate: string;
  examDate: string; // e.g. "2027-02-06"
  dayCapacities: DayCapacity[];
  existingAssignments?: ScheduleAssignment[];
  currentPlanVersion?: number;
  weakSubjectIds?: Set<string>; // e.g. subj-prob-stats, subj-dbms
}

/**
 * Standard chunking rules (Section 3 step 5)
 */
export const MIN_CHUNK_MINUTES = 25;
export const MAX_CHUNK_MINUTES = 120;
export const DEFAULT_CHUNK_MINUTES = 60;
export const MOCK_EXAM_MINUTES = 180;

interface UnscheduledItem {
  task: StudyTask;
  reason: string;
}

interface InternalTaskQueueItem {
  task: StudyTask;
  remainingMinutes: number;
  chunkIndex: number;
}

/**
 * Runs the deterministic scheduling algorithm.
 */
export function generateSchedulePlan(inputs: ReplannerInputs): PlanPreview {
  const {
    tasks,
    currentLocalDate,
    examDate,
    dayCapacities,
    existingAssignments = [],
    currentPlanVersion = 1,
    weakSubjectIds = new Set(["subj-prob-stats", "subj-dbms"]),
  } = inputs;

  const nextVersion = currentPlanVersion + 1;
  const assignments: ScheduleAssignment[] = [];
  const unscheduledTasks: UnscheduledItem[] = [];
  const conflicts: PlanPreview["conflicts"] = [];

  // Deep clone day capacities to track simulated usage during placement
  const capacityMap = new Map<string, DayCapacity>();
  for (const cap of dayCapacities) {
    if (cap.localDate >= currentLocalDate) {
      capacityMap.set(cap.localDate, {
        ...cap,
        assignedMinutes: 0,
        remainingCapacityMinutes: cap.netAvailableMinutes,
      });
    }
  }

  // 1. Separate pinned/completed tasks vs mutable planning work
  const completedTaskIds = new Set<string>();
  const activeTasks: StudyTask[] = [];

  for (const t of tasks) {
    if (t.status === "done" || t.status === "canceled") {
      completedTaskIds.add(t.id);
    } else {
      activeTasks.push(t);
    }
  }

  // 2. Identify manual pinned assignments
  const pinnedAssignments = existingAssignments.filter(
    (a) => a.localDate >= currentLocalDate && tasks.find((t) => t.id === a.taskId)?.pinned
  );

  for (const pinned of pinnedAssignments) {
    assignments.push({
      ...pinned,
      planVersion: nextVersion,
      why: "User pinned assignment (Manual override preserved)",
    });
    const cap = capacityMap.get(pinned.localDate);
    if (cap) {
      cap.assignedMinutes += pinned.plannedMinutes;
      cap.remainingCapacityMinutes = Math.max(0, cap.remainingCapacityMinutes - pinned.plannedMinutes);
    }
  }

  const pinnedTaskIds = new Set(pinnedAssignments.map((a) => a.taskId));

  // 3. Prepare task queue for unpinned incomplete work
  const queue: InternalTaskQueueItem[] = activeTasks
    .filter((t) => !pinnedTaskIds.has(t.id))
    .map((t) => ({
      task: t,
      remainingMinutes: Math.max(0, t.estimatedMinutes - t.completedMinutes),
      chunkIndex: 0,
    }))
    .filter((item) => item.remainingMinutes > 0);

  // 4. Deterministic Priority Sorting (Section 3 step 4)
  // Tie-breakers are 100% deterministic (no Math.random())
  queue.sort((a, b) => {
    // 4a. Due date urgency (closer due date first)
    if (a.task.dueLocalDate && b.task.dueLocalDate) {
      const cmp = a.task.dueLocalDate.localeCompare(b.task.dueLocalDate);
      if (cmp !== 0) return cmp;
    } else if (a.task.dueLocalDate && !b.task.dueLocalDate) {
      return -1;
    } else if (!a.task.dueLocalDate && b.task.dueLocalDate) {
      return 1;
    }

    // 4b. Explicit user priority (1 = highest)
    if (a.task.priority !== b.task.priority) {
      return a.task.priority - b.task.priority;
    }

    // 4c. Subject weakness prioritization (e.g. Prob & Stats, DBMS first)
    const aWeak = weakSubjectIds.has(a.task.subjectId) ? 1 : 0;
    const bWeak = weakSubjectIds.has(b.task.subjectId) ? 1 : 0;
    if (aWeak !== bWeak) {
      return bWeak - aWeak; // Weak subjects scheduled earlier
    }

    // 4d. Task type priority: ESE > revision > video > pyq > mock
    const typeRank: Record<TaskType, number> = {
      ese: 1,
      revision: 2,
      video: 3,
      notes: 4,
      embedded_problems: 5,
      independent_pyq: 6,
      mock: 7,
      analysis: 8,
    };
    if (typeRank[a.task.type] !== typeRank[b.task.type]) {
      return typeRank[a.task.type] - typeRank[b.task.type];
    }

    // 4e. Stable deterministic tie-breaker: task ID
    return a.task.id.localeCompare(b.task.id);
  });

  // 5. Sorted Dates list from today to examDate
  const sortedDates = Array.from(capacityMap.keys()).sort();

  // Keep track of which tasks have been completely scheduled
  const scheduledTaskIds = new Set<string>([...completedTaskIds, ...pinnedTaskIds]);

  // 6. Greedy placement loop respecting net capacity, uninterrupted mocks & locks
  for (const date of sortedDates) {
    const dayCap = capacityMap.get(date)!;
    if (dayCap.remainingCapacityMinutes <= 0) {
      continue;
    }

    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      if (item.remainingMinutes <= 0) continue;

      // Check prerequisites
      const prerequisitesMet = item.task.prerequisites.every((preId) =>
        scheduledTaskIds.has(preId)
      );
      if (!prerequisitesMet) {
        continue;
      }

      // Check date lock eligibility
      const eligibility = checkTaskEligibilityOnDate(item.task, date);
      if (!eligibility.allowed) {
        continue;
      }

      // Special rule: MOCK EXAMS (180 minutes uninterrupted)
      if (item.task.type === "mock") {
        if (dayCap.remainingCapacityMinutes < MOCK_EXAM_MINUTES) {
          // Cannot place 180 min uninterrupted mock on days with insufficient continuous time
          continue;
        }

        const plannedMinutes = MOCK_EXAM_MINUTES;
        const assignmentId = `asgn-${item.task.id}-${date}`;

        assignments.push({
          id: assignmentId,
          userId: item.task.userId,
          taskId: item.task.id,
          localDate: date,
          plannedMinutes,
          planVersion: nextVersion,
          status: "todo",
          why: `Uninterrupted 3h Mock Session (${item.task.title})`,
        });

        dayCap.assignedMinutes += plannedMinutes;
        dayCap.remainingCapacityMinutes -= plannedMinutes;
        item.remainingMinutes = 0;
        scheduledTaskIds.add(item.task.id);
        continue;
      }

      // Standard Task Chunking (25 to 120 minutes)
      const maxAllocatable = Math.min(
        item.remainingMinutes,
        dayCap.remainingCapacityMinutes,
        MAX_CHUNK_MINUTES
      );

      // If available space is smaller than MIN_CHUNK_MINUTES and item has more left, skip to next day
      if (maxAllocatable < MIN_CHUNK_MINUTES && item.remainingMinutes > maxAllocatable) {
        continue;
      }

      const chunkSize = maxAllocatable;
      item.chunkIndex++;
      const assignmentId = `asgn-${item.task.id}-${date}-c${item.chunkIndex}`;

      const whyReason = weakSubjectIds.has(item.task.subjectId)
        ? `Weak subject priority (${item.task.subjectId})`
        : `Scheduled within net capacity for ${item.task.type}`;

      assignments.push({
        id: assignmentId,
        userId: item.task.userId,
        taskId: item.task.id,
        localDate: date,
        plannedMinutes: chunkSize,
        planVersion: nextVersion,
        status: "todo",
        why: whyReason,
      });

      dayCap.assignedMinutes += chunkSize;
      dayCap.remainingCapacityMinutes -= chunkSize;
      item.remainingMinutes -= chunkSize;

      if (item.remainingMinutes <= 0) {
        scheduledTaskIds.add(item.task.id);
      }

      if (dayCap.remainingCapacityMinutes < MIN_CHUNK_MINUTES) {
        break; // Day is saturated
      }
    }
  }

  // 7. Residual tasks that could not fit before deadline
  for (const item of queue) {
    if (item.remainingMinutes > 0) {
      unscheduledTasks.push({
        task: item.task,
        reason: `Insufficient net study capacity before exam deadline ${examDate} (${Math.round(
          item.remainingMinutes
        )} min unplaced).`,
      });
    }
  }

  // 8. Generate conflict alerts if any
  if (unscheduledTasks.length > 0) {
    conflicts.push({
      type: "overload",
      description: `${unscheduledTasks.length} tasks cannot fit into net available capacity before exam date ${examDate}.`,
      isHardConflict: true,
    });
  }

  // 9. Compute Feasibility Summary for preview
  const updatedCapacities = Array.from(capacityMap.values());
  const feasibility = computeFeasibility(tasks, updatedCapacities, {
    currentLocalDate,
    examDate,
  });

  return {
    planVersion: nextVersion,
    generatedAt: new Date().toISOString(),
    assignments,
    unscheduledTasks,
    dayCapacities: updatedCapacities,
    conflicts,
    feasibility,
  };
}
