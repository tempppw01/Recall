"use client";

import { useEffect, useMemo, useState } from 'react';
import type { Task } from '@/lib/store';
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock3,
  ExternalLink,
  Eye,
  FolderKanban,
  Hourglass,
  Layers3,
  ListChecks,
  RotateCcw,
  Rows,
  SkipForward,
  Sparkles,
  Undo2,
} from 'lucide-react';

type ReviewPanelProps = {
  tasks: Task[];
  selectedTask: Task | null;
  onSelectTask: (task: Task) => void;
  onToggleTaskStatus: (taskId: string) => void;
  onQuickSetDuePreset: (taskId: string, preset: 'today' | 'tomorrow' | 'tonight' | 'nextWeek') => void;
  onUpdateTaskDueDate: (taskId: string, dueDate?: string, timezoneOffset?: number) => void;
  onOpenTaskContext: (task: Task) => void;
  defaultTimezoneOffset: number;
  getTimezoneOffset: (task: Task) => number;
  formatZonedDateTime: (iso: string, offsetMinutes: number) => string;
  formatZonedDate: (iso: string, offsetMinutes: number) => string;
  isTaskOverdue: (task: Task) => boolean;
};

type ReviewBucketKey = 'all' | 'overdue' | 'today' | 'upcoming' | 'someday';
type ReviewMode = 'time' | 'category';
type CategoryBucketKey = 'all' | 'uncategorized' | string;
type ReviewResultType = 'completed' | 'rescheduled' | 'reviewed_today' | 'back_to_context';

type ReviewGroupMeta = {
  key: string;
  label: string;
  description: string;
  count: number;
};

type ReviewActionRecord = {
  id: string;
  taskId: string;
  taskTitle: string;
  type: ReviewResultType;
  createdAt: string;
  detail: string;
  groupKey: string;
  groupLabel: string;
};

type ReviewFeedback = {
  tone: 'success' | 'info';
  title: string;
  description: string;
};

const bucketMeta: Record<Exclude<ReviewBucketKey, 'all'>, { label: string; description: string }> = {
  overdue: {
    label: '逾期',
    description: '已经超过截止时间，优先决定是完成、改期还是暂时移出今天的检查流。',
  },
  today: {
    label: '今天',
    description: '今天必须过一遍，避免临近结束时还有没判断清楚的任务。',
  },
  upcoming: {
    label: '未来 7 天',
    description: '提前扫一遍快到期的任务，把资源和节奏先排好。',
  },
  someday: {
    label: '无明确日期',
    description: '没有硬时间点，但也需要定期回头重新归位。',
  },
};

const resultTypeMeta: Record<ReviewResultType, { label: string; shortLabel: string; tone: string; icon: typeof CheckCircle2 }> = {
  completed: {
    label: '已完成',
    shortLabel: '完成',
    tone: 'text-emerald-100 bg-emerald-500/10 border-emerald-500/20',
    icon: CheckCircle2,
  },
  rescheduled: {
    label: '已改期',
    shortLabel: '改期',
    tone: 'text-amber-100 bg-amber-500/10 border-amber-500/20',
    icon: CalendarClock,
  },
  reviewed_today: {
    label: '今天已看过',
    shortLabel: '已看过',
    tone: 'text-sky-100 bg-sky-500/10 border-sky-500/20',
    icon: Eye,
  },
  back_to_context: {
    label: '回到原任务',
    shortLabel: '回原文',
    tone: 'text-violet-100 bg-violet-500/10 border-violet-500/20',
    icon: ExternalLink,
  },
};

const REVIEW_DISMISSED_STORAGE_KEY = 'recall_review_dismissed_until';

const isSameLocalDay = (left: Date, right: Date) => (
  left.getFullYear() === right.getFullYear()
  && left.getMonth() === right.getMonth()
  && left.getDate() === right.getDate()
);

const startOfLocalDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const addDays = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

const toDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getTaskSortTime = (task: Task) => new Date(task.dueDate || task.updatedAt || task.createdAt).getTime();
const getCategoryLabel = (task: Task) => task.category?.trim() || '未分类';

const readDismissedMap = (): Record<string, string> => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(REVIEW_DISMISSED_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as Record<string, string>;
  } catch {
    return {};
  }
};

const writeDismissedMap = (map: Record<string, string>) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(REVIEW_DISMISSED_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore storage write errors
  }
};

const formatDateKeyByOffset = (date: Date, offsetMinutes: number) => {
  const zoned = new Date(date.getTime() + offsetMinutes * 60 * 1000);
  return `${zoned.getUTCFullYear()}-${String(zoned.getUTCMonth() + 1).padStart(2, '0')}-${String(zoned.getUTCDate()).padStart(2, '0')}`;
};

const getTaskTimeBucket = (
  task: Task,
  isTaskOverdue: (task: Task) => boolean,
  defaultTimezoneOffset: number,
): Exclude<ReviewBucketKey, 'all'> => {
  const offset = task.timezoneOffset ?? defaultTimezoneOffset;
  const todayKey = formatDateKeyByOffset(new Date(), offset);
  const nextWeekDate = new Date();
  nextWeekDate.setDate(nextWeekDate.getDate() + 7);
  const nextWeekKey = formatDateKeyByOffset(nextWeekDate, offset);

  if (task.dueDate && isTaskOverdue(task)) {
    return 'overdue';
  }

  if (task.dueDate) {
    const dueKey = formatDateKeyByOffset(new Date(task.dueDate), offset);
    if (dueKey === todayKey) return 'today';
    if (dueKey > todayKey && dueKey <= nextWeekKey) return 'upcoming';
  }

  return 'someday';
};

const getActionId = () => `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export default function ReviewPanel(props: ReviewPanelProps) {
  const {
    tasks,
    selectedTask,
    onSelectTask,
    onToggleTaskStatus,
    onQuickSetDuePreset,
    onUpdateTaskDueDate,
    onOpenTaskContext,
    defaultTimezoneOffset,
    getTimezoneOffset,
    formatZonedDateTime,
    formatZonedDate,
    isTaskOverdue,
  } = props;

  const [reviewMode, setReviewMode] = useState<ReviewMode>('time');
  const [activeBucket, setActiveBucket] = useState<ReviewBucketKey>('all');
  const [activeCategoryBucket, setActiveCategoryBucket] = useState<CategoryBucketKey>('all');
  const [customDate, setCustomDate] = useState('');
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(selectedTask?.id ?? null);
  const [dismissedTaskMap, setDismissedTaskMap] = useState<Record<string, string>>({});
  const [actionLog, setActionLog] = useState<ReviewActionRecord[]>([]);
  const [feedback, setFeedback] = useState<ReviewFeedback | null>(null);
  const [showReviewedTodayList, setShowReviewedTodayList] = useState(false);

  const activeTasks = useMemo(() => tasks.filter((task) => task.status !== 'completed'), [tasks]);

  const reviewedTodayTasks = useMemo(() => {
    const now = new Date();
    return activeTasks
      .filter((task) => {
        const dismissedUntil = dismissedTaskMap[task.id];
        if (!dismissedUntil) return false;
        const dismissedDate = new Date(dismissedUntil);
        if (Number.isNaN(dismissedDate.getTime())) return false;
        return isSameLocalDay(dismissedDate, now);
      })
      .sort((a, b) => getTaskSortTime(a) - getTaskSortTime(b));
  }, [activeTasks, dismissedTaskMap]);
  const dismissedTodayCount = reviewedTodayTasks.length;

  const reviewEligibleTasks = useMemo(() => {
    const reviewedTodayIds = new Set(reviewedTodayTasks.map((task) => task.id));
    return activeTasks.filter((task) => !reviewedTodayIds.has(task.id));
  }, [activeTasks, reviewedTodayTasks]);

  const reviewGroups = useMemo(() => {
    const groups: Record<Exclude<ReviewBucketKey, 'all'>, Task[]> = {
      overdue: [],
      today: [],
      upcoming: [],
      someday: [],
    };

    reviewEligibleTasks.forEach((task) => {
      groups[getTaskTimeBucket(task, isTaskOverdue, defaultTimezoneOffset)].push(task);
    });

    Object.values(groups).forEach((list) => {
      list.sort((a, b) => getTaskSortTime(a) - getTaskSortTime(b));
    });

    return groups;
  }, [defaultTimezoneOffset, isTaskOverdue, reviewEligibleTasks]);

  const categoryGroups = useMemo(() => {
    const grouped = new Map<string, Task[]>();

    reviewEligibleTasks.forEach((task) => {
      const label = getCategoryLabel(task);
      const list = grouped.get(label) ?? [];
      list.push(task);
      grouped.set(label, list);
    });

    return Array.from(grouped.entries())
      .map(([label, list]) => ({
        key: label === '未分类' ? 'uncategorized' : label,
        label,
        description: label === '未分类'
          ? '这组任务还没有归位，适合一起整理清楚。'
          : `把“${label}”这一组重新扫一遍，统一决定下一步。`,
        tasks: list.sort((a, b) => getTaskSortTime(a) - getTaskSortTime(b)),
      }))
      .sort((a, b) => {
        if (a.label === '未分类') return -1;
        if (b.label === '未分类') return 1;
        return b.tasks.length - a.tasks.length || a.label.localeCompare(b.label, 'zh-CN');
      });
  }, [reviewEligibleTasks]);

  const reviewCounts = useMemo(() => ({
    all: Object.values(reviewGroups).reduce((sum, list) => sum + list.length, 0),
    overdue: reviewGroups.overdue.length,
    today: reviewGroups.today.length,
    upcoming: reviewGroups.upcoming.length,
    someday: reviewGroups.someday.length,
  }), [reviewGroups]);

  const categoryCounts = {
    all: reviewEligibleTasks.length,
    categoryGroups: categoryGroups.length,
    uncategorized: categoryGroups.find((group) => group.key === 'uncategorized')?.tasks.length ?? 0,
    largestGroup: categoryGroups[0]?.tasks.length ?? 0,
  };

  const timeGroupMeta = useMemo<ReviewGroupMeta[]>(() => [
    {
      key: 'all',
      label: '全部待检查',
      description: '按逾期、今天、未来 7 天、无明确日期的顺序整体过一轮。',
      count: reviewCounts.all,
    },
    { key: 'overdue', label: bucketMeta.overdue.label, description: bucketMeta.overdue.description, count: reviewCounts.overdue },
    { key: 'today', label: bucketMeta.today.label, description: bucketMeta.today.description, count: reviewCounts.today },
    { key: 'upcoming', label: bucketMeta.upcoming.label, description: bucketMeta.upcoming.description, count: reviewCounts.upcoming },
    { key: 'someday', label: bucketMeta.someday.label, description: bucketMeta.someday.description, count: reviewCounts.someday },
  ], [reviewCounts]);

  const categoryGroupMeta = useMemo<ReviewGroupMeta[]>(() => [
    {
      key: 'all',
      label: '全部列表',
      description: '把所有列表重新扫一遍，适合周回顾和重新收口。',
      count: reviewEligibleTasks.length,
    },
    ...categoryGroups.map((group) => ({
      key: group.key,
      label: group.label,
      description: group.description,
      count: group.tasks.length,
    })),
  ], [categoryGroups, reviewEligibleTasks.length]);

  const reviewList = useMemo(() => {
    if (reviewMode === 'time') {
      return activeBucket === 'all'
        ? [...reviewGroups.overdue, ...reviewGroups.today, ...reviewGroups.upcoming, ...reviewGroups.someday]
        : reviewGroups[activeBucket];
    }

    if (activeCategoryBucket === 'all') {
      return categoryGroups.flatMap((group) => group.tasks);
    }

    return categoryGroups.find((group) => group.key === activeCategoryBucket)?.tasks ?? [];
  }, [activeBucket, activeCategoryBucket, categoryGroups, reviewGroups, reviewMode]);

  const currentGroupMeta = reviewMode === 'time'
    ? timeGroupMeta.find((item) => item.key === activeBucket)
    : categoryGroupMeta.find((item) => item.key === activeCategoryBucket);

  const fallbackFocusTask = selectedTask
    && selectedTask.status !== 'completed'
    && reviewList.some((task) => task.id === selectedTask.id)
    ? selectedTask
    : reviewList[0] || null;

  const focusTask = reviewList.find((task) => task.id === focusedTaskId) || fallbackFocusTask;
  const focusIndex = focusTask ? reviewList.findIndex((task) => task.id === focusTask.id) : -1;
  const reviewedCount = focusIndex >= 0 ? focusIndex : 0;
  const remainingCount = focusIndex >= 0 ? Math.max(reviewList.length - focusIndex - 1, 0) : reviewList.length;
  const progressPercent = reviewList.length > 0
    ? Math.max(6, Math.round(((reviewedCount + (focusTask ? 1 : 0)) / reviewList.length) * 100))
    : 0;

  const getTaskGroupKey = (task: Task) => {
    if (reviewMode === 'time') {
      const bucket = getTaskTimeBucket(task, isTaskOverdue, defaultTimezoneOffset);
      return activeBucket === 'all' ? bucket : activeBucket;
    }
    const categoryKey = getCategoryLabel(task) === '未分类' ? 'uncategorized' : getCategoryLabel(task);
    return activeCategoryBucket === 'all' ? categoryKey : activeCategoryBucket;
  };

  const getTaskGroupLabel = (task: Task) => {
    if (reviewMode === 'time') {
      const bucket = getTaskTimeBucket(task, isTaskOverdue, defaultTimezoneOffset);
      return activeBucket === 'all'
        ? bucketMeta[bucket].label
        : (timeGroupMeta.find((item) => item.key === activeBucket)?.label ?? '当前时间组');
    }
    const categoryLabel = getCategoryLabel(task);
    return activeCategoryBucket === 'all'
      ? categoryLabel
      : (categoryGroupMeta.find((item) => item.key === activeCategoryBucket)?.label ?? categoryLabel);
  };

  const currentNaturalGroupTasks = useMemo(() => {
    if (!focusTask) return [] as Task[];
    if (reviewMode === 'time') {
      const bucket = getTaskTimeBucket(focusTask, isTaskOverdue, defaultTimezoneOffset);
      return reviewGroups[bucket];
    }

    const categoryLabel = getCategoryLabel(focusTask);
    return categoryGroups.find((group) => group.label === categoryLabel)?.tasks ?? [];
  }, [categoryGroups, defaultTimezoneOffset, focusTask, isTaskOverdue, reviewGroups, reviewMode]);

  const currentNaturalGroupLabel = focusTask ? getTaskGroupLabel(focusTask) : null;
  const currentNaturalGroupRemaining = useMemo(() => {
    if (!focusTask) return [] as Task[];
    return currentNaturalGroupTasks.filter((task) => task.id !== focusTask.id);
  }, [currentNaturalGroupTasks, focusTask]);

  const actionCounts = useMemo(() => actionLog.reduce<Record<ReviewResultType, number>>((acc, item) => {
    acc[item.type] += 1;
    return acc;
  }, {
    completed: 0,
    rescheduled: 0,
    reviewed_today: 0,
    back_to_context: 0,
  }), [actionLog]);

  const recentActions = actionLog.slice(0, 6);

  const nextAvailableGroupMeta = useMemo(() => {
    if (reviewMode === 'time') {
      const metas = timeGroupMeta.filter((item) => item.key !== 'all');
      const currentKey = focusTask ? getTaskTimeBucket(focusTask, isTaskOverdue, defaultTimezoneOffset) : activeBucket;
      const currentIndex = metas.findIndex((item) => item.key === currentKey);
      if (currentIndex === -1) return metas.find((item) => item.count > 0) ?? null;
      return metas.slice(currentIndex + 1).find((item) => item.count > 0) ?? null;
    }

    const metas = categoryGroupMeta.filter((item) => item.key !== 'all');
    const currentKey = focusTask ? (getCategoryLabel(focusTask) === '未分类' ? 'uncategorized' : getCategoryLabel(focusTask)) : activeCategoryBucket;
    const currentIndex = metas.findIndex((item) => item.key === currentKey);
    if (currentIndex === -1) return metas.find((item) => item.count > 0) ?? null;
    return metas.slice(currentIndex + 1).find((item) => item.count > 0) ?? null;
  }, [activeBucket, activeCategoryBucket, categoryGroupMeta, defaultTimezoneOffset, focusTask, isTaskOverdue, reviewMode, timeGroupMeta]);

  const focusStepText = focusTask
    ? `第 ${focusIndex + 1} / ${reviewList.length} 项`
    : '当前组已清空';

  const currentGroupSummary = currentGroupMeta
    ? `${reviewMode === 'time' ? '当前时间组' : '当前列表组'}：${currentGroupMeta.label} · ${currentGroupMeta.count} 项`
    : '当前还没有可检查的分组';

  const nextStepTitle = !focusTask
    ? '切到下一组继续'
    : reviewMode === 'time'
      ? '先对眼前这项做判断'
      : '把这一类任务重新摆正';

  const nextStepDescription = !focusTask
    ? '这一组已经扫完，可以切换到下一组，继续保持节奏。'
    : reviewMode === 'time'
      ? '完成、改期，或者先标记为今天已看过。做完后会尽量留在同一自然分组里继续推进。'
      : `先确认“${getCategoryLabel(focusTask)}”这组里当前最该推进的是哪一项，再决定完成、改期或回到原任务上下文。`;

  const reviewOverviewCards = reviewMode === 'time'
    ? [
        { key: 'overdue', label: '逾期', value: reviewCounts.overdue, icon: Clock3, tone: 'text-red-200 bg-red-500/10 border-red-500/20' },
        { key: 'today', label: '今天', value: reviewCounts.today, icon: Eye, tone: 'text-amber-200 bg-amber-500/10 border-amber-500/20' },
        { key: 'upcoming', label: '未来 7 天', value: reviewCounts.upcoming, icon: Layers3, tone: 'text-blue-200 bg-blue-500/10 border-blue-500/20' },
        { key: 'all', label: '待检查', value: reviewCounts.all, icon: CheckCircle2, tone: 'text-emerald-200 bg-emerald-500/10 border-emerald-500/20' },
      ]
    : [
        { key: 'all', label: '待检查', value: categoryCounts.all, icon: CheckCircle2, tone: 'text-emerald-200 bg-emerald-500/10 border-emerald-500/20' },
        { key: 'groups', label: '列表数', value: categoryCounts.categoryGroups, icon: FolderKanban, tone: 'text-sky-200 bg-sky-500/10 border-sky-500/20' },
        { key: 'uncategorized', label: '未分类', value: categoryCounts.uncategorized, icon: Rows, tone: 'text-amber-200 bg-amber-500/10 border-amber-500/20' },
        { key: 'largest', label: '最大组', value: categoryCounts.largestGroup, icon: Layers3, tone: 'text-violet-200 bg-violet-500/10 border-violet-500/20' },
      ];

  const activeGroupOptions = reviewMode === 'time' ? timeGroupMeta : categoryGroupMeta;
  const activeModeLabel = reviewMode === 'time' ? '按时间' : '按列表';
  const activeModeHint = reviewMode === 'time'
    ? '先清逾期和今天，再看未来 7 天与无明确日期。'
    : '按列表逐组检查，减少在不同上下文之间频繁切换。';
  const reviewedTodayPreview = showReviewedTodayList ? reviewedTodayTasks : reviewedTodayTasks.slice(0, 4);

  useEffect(() => {
    if (selectedTask?.id) {
      setFocusedTaskId(selectedTask.id);
    }
  }, [selectedTask?.id]);

  useEffect(() => {
    setDismissedTaskMap(readDismissedMap());
  }, []);

  useEffect(() => {
    if (reviewMode === 'category' && activeCategoryBucket !== 'all') {
      const exists = categoryGroups.some((group) => group.key === activeCategoryBucket);
      if (!exists) {
        setActiveCategoryBucket('all');
      }
    }
  }, [activeCategoryBucket, categoryGroups, reviewMode]);

  useEffect(() => {
    if (!reviewList.length) {
      setFocusedTaskId(null);
      return;
    }
    if (!focusTask) {
      setFocusedTaskId(reviewList[0].id);
      return;
    }
    if (!reviewList.some((task) => task.id === focusTask.id)) {
      setFocusedTaskId(reviewList[0].id);
    }
  }, [focusTask, reviewList]);

  const updateDismissedMap = (updater: (previous: Record<string, string>) => Record<string, string>) => {
    setDismissedTaskMap((previous) => {
      const next = updater(previous);
      writeDismissedMap(next);
      return next;
    });
  };

  const getPriorityScore = (task: Task) => {
    const bucket = getTaskTimeBucket(task, isTaskOverdue, defaultTimezoneOffset);
    const bucketScore = bucket === 'overdue'
      ? 4_000_000_000_000
      : bucket === 'today'
      ? 3_000_000_000_000
      : bucket === 'upcoming'
      ? 2_000_000_000_000
      : 1_000_000_000_000;
    const dueScore = 1_000_000_000_000 - Math.min(getTaskSortTime(task), 1_000_000_000_000);
    const priorityScore = task.priority * 1_000_000;
    const statusScore = task.status === 'in_progress' ? 500_000 : 0;
    return bucketScore + dueScore + priorityScore + statusScore;
  };

  const registerAction = (task: Task, type: ReviewResultType, detail: string, overrideTitle?: string) => {
    const groupLabel = getTaskGroupLabel(task);
    const groupKey = getTaskGroupKey(task);
    setActionLog((previous) => [
      {
        id: getActionId(),
        taskId: task.id,
        taskTitle: task.title,
        type,
        createdAt: new Date().toISOString(),
        detail,
        groupKey,
        groupLabel,
      },
      ...previous,
    ].slice(0, 40));
    setFeedback({
      tone: type === 'back_to_context' ? 'info' : 'success',
      title: overrideTitle ?? resultTypeMeta[type].label,
      description: detail,
    });
  };

  const moveFocusSmartly = (taskId: string) => {
    const remaining = reviewList.filter((task) => task.id !== taskId);
    if (!remaining.length) {
      setFocusedTaskId(null);
      return;
    }

    const currentTask = reviewList.find((task) => task.id === taskId) ?? null;
    const sameNaturalGroup = currentTask
      ? remaining.filter((task) => (
          reviewMode === 'time'
            ? getTaskTimeBucket(task, isTaskOverdue, defaultTimezoneOffset) === getTaskTimeBucket(currentTask, isTaskOverdue, defaultTimezoneOffset)
            : getCategoryLabel(task) === getCategoryLabel(currentTask)
        ))
      : [];

    const candidatePool = sameNaturalGroup.length > 0 ? sameNaturalGroup : remaining;
    const nextTask = [...candidatePool].sort((a, b) => getPriorityScore(b) - getPriorityScore(a))[0] ?? remaining[0] ?? null;

    setFocusedTaskId(nextTask?.id ?? null);
    if (nextTask) {
      onSelectTask(nextTask);
      if (currentTask && sameNaturalGroup.length === 0) {
        const nextLabel = reviewMode === 'time'
          ? bucketMeta[getTaskTimeBucket(nextTask, isTaskOverdue, defaultTimezoneOffset)].label
          : getCategoryLabel(nextTask);
        setFeedback({
          tone: 'info',
          title: '当前组已清空',
          description: `这一组已经处理完，已切到下一组：${nextLabel}。`,
        });
      }
    }
  };

  const markTaskReviewedForToday = (taskId: string) => {
    const until = new Date().toISOString();
    updateDismissedMap((previous) => ({ ...previous, [taskId]: until }));
  };

  const clearTaskReviewedForToday = (taskId: string) => {
    updateDismissedMap((previous) => {
      if (!(taskId in previous)) return previous;
      const next = { ...previous };
      delete next[taskId];
      return next;
    });
  };

  const restoreTaskToToday = (task: Task) => {
    clearTaskReviewedForToday(task.id);
    setFocusedTaskId(task.id);
    onSelectTask(task);
    setFeedback({
      tone: 'info',
      title: '已恢复到今天',
      description: `已把“${task.title}”恢复到今天的检查流。`,
    });
  };

  const restoreAllReviewedToday = () => {
    if (!reviewedTodayTasks.length) return;
    updateDismissedMap((previous) => {
      const next = { ...previous };
      reviewedTodayTasks.forEach((task) => {
        delete next[task.id];
      });
      return next;
    });
    const firstTask = reviewedTodayTasks[0];
    if (firstTask) {
      setFocusedTaskId(firstTask.id);
      onSelectTask(firstTask);
    }
    setFeedback({
      tone: 'info',
      title: '已全部恢复',
      description: `已把今天标记为“已看过”的 ${reviewedTodayTasks.length} 项任务恢复回来。`,
    });
  };

  const handleCustomReschedule = () => {
    if (!focusTask || !customDate) return;
    const offset = focusTask.timezoneOffset ?? defaultTimezoneOffset;
    const utcMs = Date.UTC(
      Number(customDate.slice(0, 4)),
      Number(customDate.slice(5, 7)) - 1,
      Number(customDate.slice(8, 10)),
      9,
      0,
    ) - offset * 60 * 1000;
    onUpdateTaskDueDate(focusTask.id, new Date(utcMs).toISOString(), offset);
    registerAction(focusTask, 'rescheduled', `已把“${focusTask.title}”改到 ${customDate}`);
    setCustomDate('');
    moveFocusSmartly(focusTask.id);
  };

  const handleComplete = () => {
    if (!focusTask) return;
    clearTaskReviewedForToday(focusTask.id);
    onToggleTaskStatus(focusTask.id);
    registerAction(focusTask, 'completed', `已完成“${focusTask.title}”，继续下一项。`);
    moveFocusSmartly(focusTask.id);
  };

  const handlePreset = (preset: 'today' | 'tomorrow' | 'tonight', detail: string) => {
    if (!focusTask) return;
    clearTaskReviewedForToday(focusTask.id);
    onQuickSetDuePreset(focusTask.id, preset);
    registerAction(focusTask, 'rescheduled', `已将“${focusTask.title}”${detail}`);
    moveFocusSmartly(focusTask.id);
  };

  const handleOpenContext = () => {
    if (!focusTask) return;
    onOpenTaskContext(focusTask);
    registerAction(focusTask, 'back_to_context', `已回到“${focusTask.title}”的原任务上下文。`);
  };

  const handleDoneForToday = () => {
    if (!focusTask) return;
    markTaskReviewedForToday(focusTask.id);
    registerAction(focusTask, 'reviewed_today', `已将“${focusTask.title}”标记为今天已看过。`);
    moveFocusSmartly(focusTask.id);
  };

  const handleBatchReviewToday = () => {
    if (!currentNaturalGroupRemaining.length || !currentNaturalGroupLabel) return;
    const until = new Date().toISOString();
    updateDismissedMap((previous) => {
      const next = { ...previous };
      currentNaturalGroupRemaining.forEach((task) => {
        next[task.id] = until;
      });
      return next;
    });
    setActionLog((previous) => [
      ...currentNaturalGroupRemaining.map((task) => ({
        id: getActionId(),
        taskId: task.id,
        taskTitle: task.title,
        type: 'reviewed_today' as const,
        createdAt: new Date().toISOString(),
        detail: `批量将“${task.title}”标记为今天已看过`,
        groupKey: getTaskGroupKey(task),
        groupLabel: getTaskGroupLabel(task),
      })),
      ...previous,
    ].slice(0, 40));
    setFeedback({
      tone: 'success',
      title: '本组已批量标记',
      description: `已将“${currentNaturalGroupLabel}”剩余 ${currentNaturalGroupRemaining.length} 项标记为今天已看过。`,
    });
    if (focusTask) {
      moveFocusSmartly(focusTask.id);
    }
  };

  const handleBatchRescheduleTomorrow = () => {
    if (!currentNaturalGroupTasks.length || !currentNaturalGroupLabel) return;
    currentNaturalGroupTasks.forEach((task) => {
      clearTaskReviewedForToday(task.id);
      onQuickSetDuePreset(task.id, 'tomorrow');
    });
    setActionLog((previous) => [
      ...currentNaturalGroupTasks.map((task) => ({
        id: getActionId(),
        taskId: task.id,
        taskTitle: task.title,
        type: 'rescheduled' as const,
        createdAt: new Date().toISOString(),
        detail: `批量将“${task.title}”改到明天`,
        groupKey: getTaskGroupKey(task),
        groupLabel: getTaskGroupLabel(task),
      })),
      ...previous,
    ].slice(0, 40));
    setFeedback({
      tone: 'success',
      title: '本组已统一改期',
      description: `已将“${currentNaturalGroupLabel}”这组 ${currentNaturalGroupTasks.length} 项统一改到明天。`,
    });
    if (focusTask) {
      moveFocusSmartly(focusTask.id);
    }
  };

  return (
    <div className="app-page-stack stack-gap flex flex-col px-3 pb-4 sm:px-6 sm:pb-6">
      <section className="app-toolbar app-hero-compact motion-enter">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(var(--theme-accent),0.18)] bg-[rgba(var(--theme-accent),0.07)] px-2.5 py-1 text-[10px] text-[color:var(--ui-text-secondary)]">
              <Sparkles className="h-3.5 w-3.5" />
              Review 工作台
            </div>
            <h2 className="mt-2 text-[18px] font-semibold tracking-[-0.04em] text-[color:var(--ui-text-strong)] sm:text-[22px]">
              先判断最该处理的任务，不让辅助信息挤占主流程
            </h2>
            <p className="app-clamp-1 mt-1 max-w-2xl text-xs text-[color:var(--ui-text-secondary)] sm:text-sm">
              左边选组，中间处理当前任务，右边只保留批量动作和恢复记录。
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {reviewOverviewCards.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.key} className="app-micro-card rounded-[18px] px-3 py-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--ui-text-muted)]">{item.label}</div>
                      <div className="mt-1.5 text-xl font-semibold tracking-tight text-[color:var(--ui-text-strong)]">{item.value}</div>
                    </div>
                    <div className={`rounded-2xl border px-2.5 py-2 ${item.tone}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <div className="grid gap-3 xl:h-[calc(100dvh-10.75rem)] xl:grid-cols-[260px_minmax(0,1fr)_300px]">
        <aside className="app-section order-2 flex min-h-0 flex-col overflow-hidden rounded-[24px] p-3.5 xl:order-1">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--ui-text-muted)]">视角</p>
              <p className="mt-1 text-sm font-medium text-[color:var(--ui-text-strong)]">{activeModeLabel}</p>
            </div>
            <span className="rounded-full border border-[color:var(--ui-border-soft)] bg-[rgba(255,255,255,0.03)] px-2.5 py-1 text-[10px] text-[color:var(--ui-text-secondary)]">
              {activeGroupOptions.length} 组
            </span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            {([
              { key: 'time', label: '按时间', icon: Clock3 },
              { key: 'category', label: '按列表', icon: FolderKanban },
            ] as const).map((item) => {
              const Icon = item.icon;
              const active = reviewMode === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setReviewMode(item.key)}
                  className={`flex items-center justify-center gap-2 rounded-[18px] border px-3 py-3 text-sm transition-all ${
                    active
                      ? 'border-blue-400/55 bg-blue-500/14 text-blue-100 shadow-[0_0_0_4px_rgba(var(--theme-accent),0.08)]'
                      : 'border-[color:var(--ui-border-soft)] bg-[rgba(255,255,255,0.02)] text-[color:var(--ui-text-secondary)] hover:border-[color:var(--ui-border-strong)] hover:text-[color:var(--ui-text-strong)]'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="app-section-quiet mt-3 rounded-[18px] px-3 py-2.5">
            <p className="text-xs leading-5 text-[color:var(--ui-text-secondary)]">{activeModeHint}</p>
            {currentGroupMeta ? (
              <div className="mt-3 rounded-[18px] border border-[rgba(var(--theme-accent),0.2)] bg-[rgba(var(--theme-accent),0.08)] px-3 py-2.5">
                <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--ui-text-muted)]">当前组</p>
                <p className="mt-1 text-sm text-[color:var(--ui-text-strong)]">{currentGroupMeta.label}</p>
              </div>
            ) : null}
          </div>

          <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
            <div className="space-y-2">
              {activeGroupOptions.map((item) => {
                const active = reviewMode === 'time'
                  ? activeBucket === item.key
                  : activeCategoryBucket === item.key;

                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      if (reviewMode === 'time') {
                        setActiveBucket(item.key as ReviewBucketKey);
                      } else {
                        setActiveCategoryBucket(item.key);
                      }
                    }}
                    className={`w-full rounded-[20px] border px-3.5 py-3 text-left transition-all ${
                      active
                        ? 'border-[rgba(var(--theme-accent),0.34)] bg-[rgba(var(--theme-accent),0.12)] shadow-[0_14px_28px_rgba(0,0,0,0.18)]'
                        : 'border-[color:var(--ui-border-soft)] bg-[rgba(255,255,255,0.02)] hover:border-[color:var(--ui-border-strong)] hover:bg-[rgba(255,255,255,0.04)]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className={`truncate text-sm font-medium ${active ? 'text-[color:var(--ui-text-strong)]' : 'text-[color:var(--ui-text-primary)]'}`}>
                          {item.label}
                        </div>
                        {active ? (
                          <div className="mt-1 text-xs leading-5 text-[color:var(--ui-text-secondary)]">{item.description}</div>
                        ) : null}
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] ${
                        active
                          ? 'border border-blue-400/30 bg-blue-500/12 text-blue-100'
                          : 'border border-[color:var(--ui-border-soft)] bg-[rgba(255,255,255,0.03)] text-[color:var(--ui-text-muted)]'
                      }`}>
                        {item.count}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        <section className="app-section order-1 flex min-h-0 flex-col overflow-hidden rounded-[24px] p-3.5 xl:order-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--ui-text-muted)]">当前处理台</p>
              <h3 className="mt-1 text-lg font-semibold text-[color:var(--ui-text-strong)]">
                {focusTask ? focusTask.title : (currentGroupMeta?.label ?? '当前分组')}
              </h3>
              <p className="mt-1 text-sm text-[color:var(--ui-text-secondary)]">
                {focusTask ? currentGroupSummary : '这一组已经清空，可以直接切到下一组继续推进。'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[color:var(--ui-border-soft)] bg-[rgba(255,255,255,0.03)] px-2.5 py-1 text-[11px] text-[color:var(--ui-text-secondary)]">
                {focusStepText}
              </span>
              {nextAvailableGroupMeta ? (
                <span className="rounded-full border border-[rgba(var(--theme-accent),0.18)] bg-[rgba(var(--theme-accent),0.08)] px-2.5 py-1 text-[11px] text-[color:var(--ui-text-primary)]">
                  下一组：{nextAvailableGroupMeta.label}
                </span>
              ) : null}
            </div>
          </div>

          <div className="app-section-quiet mt-3 rounded-[18px] px-3 py-2.5">
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-[color:var(--ui-text-primary)]">
              <span>本组 {reviewList.length} 项</span>
              <span>已过 {reviewedCount} 项</span>
              <span>剩余 {remainingCount} 项</span>
            </div>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,rgba(92,123,250,0.92),rgba(110,231,255,0.88))] transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {focusTask ? (
            <div className="mt-4 grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(300px,0.95fr)]">
              <div className="flex min-h-0 flex-col gap-4">
                <div className="rounded-[26px] border border-[rgba(var(--theme-accent),0.24)] bg-[linear-gradient(180deg,rgba(var(--theme-accent),0.12),rgba(255,255,255,0.03))] px-4 py-4 shadow-[0_16px_32px_rgba(0,0,0,0.16)]">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-[rgba(var(--theme-accent),0.22)] bg-[rgba(var(--theme-accent),0.12)] px-2.5 py-1 text-[11px] text-blue-100">
                      {focusTask.status === 'in_progress' ? '进行中' : '待处理'}
                    </span>
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] ${
                      focusTask.dueDate && isTaskOverdue(focusTask)
                        ? 'border-red-500/25 bg-red-500/12 text-red-100'
                        : focusTask.dueDate
                          ? 'border-blue-500/25 bg-blue-500/12 text-blue-100'
                          : 'border-[color:var(--ui-border-soft)] bg-[rgba(255,255,255,0.05)] text-[color:var(--ui-text-secondary)]'
                    }`}>
                      {focusTask.dueDate && isTaskOverdue(focusTask) ? '已逾期' : focusTask.dueDate ? '有截止时间' : '未设日期'}
                    </span>
                    <span className="rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-1 text-[11px] text-indigo-100">
                      {getCategoryLabel(focusTask)}
                    </span>
                  </div>

                  <div className="mt-3 break-words text-[17px] font-medium leading-7 text-[color:var(--ui-text-strong)]">
                    {focusTask.title}
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <div className="rounded-[18px] border border-[color:var(--ui-border-soft)] bg-[rgba(255,255,255,0.025)] px-3 py-2.5">
                      <div className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--ui-text-muted)]">时间</div>
                      <div className="mt-1 text-sm text-[color:var(--ui-text-primary)]">
                        {focusTask.dueDate
                          ? formatZonedDateTime(focusTask.dueDate, getTimezoneOffset(focusTask))
                          : formatZonedDate(focusTask.updatedAt || focusTask.createdAt, focusTask.timezoneOffset ?? defaultTimezoneOffset)}
                      </div>
                    </div>
                    <div className="rounded-[18px] border border-[color:var(--ui-border-soft)] bg-[rgba(255,255,255,0.025)] px-3 py-2.5">
                      <div className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--ui-text-muted)]">同组剩余</div>
                      <div className="mt-1 text-sm text-[color:var(--ui-text-primary)]">{currentNaturalGroupRemaining.length} 项</div>
                    </div>
                  </div>

                  {(focusTask.tags?.length ?? 0) > 0 ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {focusTask.tags?.filter(Boolean).slice(0, 6).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-[color:var(--ui-border-soft)] bg-[rgba(255,255,255,0.04)] px-2.5 py-1 text-[11px] text-[color:var(--ui-text-secondary)]"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {(focusTask.subtasks?.length ?? 0) > 0 ? (
                    <div className="mt-4 rounded-[20px] border border-[color:var(--ui-border-soft)] bg-[rgba(255,255,255,0.03)] px-3.5 py-3">
                      <div className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--ui-text-muted)]">子任务</div>
                      <div className="mt-2 max-h-40 space-y-2 overflow-y-auto pr-1">
                        {focusTask.subtasks?.map((subtask) => (
                          <div key={subtask.id} className="flex items-center gap-2 text-sm">
                            <span className={`h-2 w-2 rounded-full ${subtask.completed ? 'bg-emerald-400' : 'bg-[#63708A]'}`} />
                            <span className={subtask.completed ? 'text-[#707789] line-through' : 'text-[#D8DEEF]'}>{subtask.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="min-h-0 flex flex-1 flex-col overflow-hidden rounded-[24px] border border-[color:var(--ui-border-soft)] bg-[rgba(255,255,255,0.025)]">
                  <div className="flex items-center justify-between gap-3 border-b border-[color:var(--ui-border-soft)] px-4 py-3">
                    <div>
                      <div className="text-sm font-medium text-[color:var(--ui-text-strong)]">待处理队列</div>
                      <div className="mt-1 text-xs text-[color:var(--ui-text-muted)]">{currentGroupMeta?.description ?? '按当前分组顺序继续处理。'}</div>
                    </div>
                    <span className="rounded-full border border-[color:var(--ui-border-soft)] bg-[rgba(255,255,255,0.03)] px-2.5 py-1 text-[11px] text-[color:var(--ui-text-secondary)]">
                      {reviewList.length}
                    </span>
                  </div>

                  <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3">
                    {reviewList.map((task) => {
                      const offset = task.dueDate
                        ? getTimezoneOffset(task)
                        : (task.timezoneOffset ?? defaultTimezoneOffset);
                      const dueLabel = task.dueDate
                        ? formatZonedDateTime(task.dueDate, offset)
                        : formatZonedDate(task.updatedAt || task.createdAt, offset);
                      const overdue = task.dueDate ? isTaskOverdue(task) : false;
                      const isFocus = focusTask.id === task.id;

                      return (
                        <button
                          key={task.id}
                          type="button"
                          onClick={() => {
                            setFocusedTaskId(task.id);
                            onSelectTask(task);
                          }}
                          className={`w-full rounded-[18px] border px-3 py-3 text-left transition-all ${
                            isFocus
                              ? 'border-[rgba(var(--theme-accent),0.34)] bg-[rgba(var(--theme-accent),0.12)] shadow-[0_10px_24px_rgba(0,0,0,0.16)]'
                              : 'border-[color:var(--ui-border-soft)] bg-[rgba(255,255,255,0.02)] hover:border-[color:var(--ui-border-strong)] hover:bg-[rgba(255,255,255,0.04)]'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-medium text-[color:var(--ui-text-strong)]">{task.title}</div>
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-[color:var(--ui-text-muted)]">
                                <span>{overdue ? '已逾期' : task.dueDate ? dueLabel : '未设日期'}</span>
                                <span>{getCategoryLabel(task)}</span>
                              </div>
                            </div>
                            <ArrowRight className={`mt-0.5 h-4 w-4 shrink-0 text-[#697386] transition-transform ${isFocus ? 'translate-x-0.5' : ''}`} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex min-h-0 flex-col gap-4">
                <div className="rounded-[24px] border border-[color:var(--ui-border-soft)] bg-[rgba(255,255,255,0.025)] px-4 py-4">
                  <div className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--ui-text-muted)]">主要操作</div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={handleComplete}
                      className="btn btn-primary btn-md rounded-2xl"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      标记完成
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenContext}
                      className="btn btn-secondary btn-md rounded-2xl"
                    >
                      <ExternalLink className="h-4 w-4" />
                      查看原任务
                    </button>
                    <button
                      type="button"
                      onClick={handleDoneForToday}
                      className="btn btn-secondary btn-md rounded-2xl"
                    >
                      <Eye className="h-4 w-4" />
                      今天已看过
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePreset('today', '拉回到今天继续处理')}
                      className="btn btn-secondary btn-md rounded-2xl"
                    >
                      <ArrowRight className="h-4 w-4" />
                      拉回今天
                    </button>
                  </div>
                </div>

                <div className="rounded-[24px] border border-[color:var(--ui-border-soft)] bg-[rgba(255,255,255,0.025)] px-4 py-4">
                  <div className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--ui-text-muted)]">改期和稍后处理</div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => handlePreset('tomorrow', '跳到明天再处理')}
                      className="btn btn-secondary btn-md rounded-2xl"
                    >
                      <SkipForward className="h-4 w-4" />
                      明天再看
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePreset('tonight', '安排到今晚再看')}
                      className="btn btn-secondary btn-md rounded-2xl"
                    >
                      <CalendarClock className="h-4 w-4" />
                      今晚再看
                    </button>
                  </div>

                  <div className="mt-3 rounded-[20px] border border-[color:var(--ui-border-soft)] bg-[rgba(255,255,255,0.03)] px-3 py-3">
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={customDate}
                        onChange={(event) => setCustomDate(event.target.value)}
                        min={toDateInput(new Date())}
                        className="w-full rounded-2xl border border-[var(--ui-border-soft)] bg-[rgba(255,255,255,0.03)] px-3 py-2.5 text-sm text-[#E8ECF8] focus:border-blue-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleCustomReschedule}
                        disabled={!customDate}
                        className="btn btn-secondary btn-md rounded-2xl disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Hourglass className="h-4 w-4" />
                        应用
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-4 flex flex-1 items-center justify-center rounded-[26px] border border-dashed border-[color:var(--ui-border-soft)] bg-[rgba(255,255,255,0.02)] px-6 py-10 text-center">
              <div className="max-w-md">
                <div className="text-lg font-medium text-[color:var(--ui-text-strong)]">{nextStepTitle}</div>
                <div className="mt-2 text-sm leading-6 text-[color:var(--ui-text-secondary)]">{nextStepDescription}</div>
                {nextAvailableGroupMeta ? (
                  <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[rgba(var(--theme-accent),0.18)] bg-[rgba(var(--theme-accent),0.08)] px-3 py-1.5 text-sm text-[color:var(--ui-text-primary)]">
                    <ChevronRight className="h-4 w-4" />
                    试试下一组：{nextAvailableGroupMeta.label}
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </section>

        <aside className="app-section order-3 flex min-h-0 flex-col gap-3 overflow-hidden rounded-[24px] p-3.5">
          <div className="rounded-[22px] border border-[color:var(--ui-border-soft)] bg-[rgba(255,255,255,0.025)] px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--ui-text-muted)]">当前提示</div>
                <div className="mt-2 text-sm text-[color:var(--ui-text-strong)]">{feedback?.title ?? nextStepTitle}</div>
                <div className="mt-1.5 text-xs leading-5 text-[color:var(--ui-text-secondary)]">
                  {feedback?.description ?? nextStepDescription}
                </div>
              </div>
              <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-[color:var(--ui-text-faint)]" />
            </div>
            {currentNaturalGroupLabel ? (
              <div className="mt-3 rounded-[18px] border border-sky-500/20 bg-sky-500/8 px-3 py-2.5 text-xs text-sky-100">
                当前自然分组：{currentNaturalGroupLabel}，剩余 {currentNaturalGroupRemaining.length} 项
              </div>
            ) : null}
          </div>

          <div className="rounded-[22px] border border-[color:var(--ui-border-soft)] bg-[rgba(255,255,255,0.025)] px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--ui-text-muted)]">整组操作</div>
                <div className="mt-1 text-xs leading-5 text-[color:var(--ui-text-secondary)]">
                  对当前自然分组统一处理，适合快速清空不需要逐项判断的一组任务。
                </div>
              </div>
              <Sparkles className="h-4 w-4 text-[color:var(--ui-text-faint)]" />
            </div>
            <div className="mt-3 grid gap-2">
              <button
                type="button"
                onClick={handleBatchReviewToday}
                disabled={currentNaturalGroupRemaining.length === 0}
                className="btn btn-secondary btn-md rounded-2xl disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Eye className="h-4 w-4" />
                本组剩余标记为今天已看过
              </button>
              <button
                type="button"
                onClick={handleBatchRescheduleTomorrow}
                disabled={currentNaturalGroupTasks.length === 0}
                className="btn btn-secondary btn-md rounded-2xl disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CalendarClock className="h-4 w-4" />
                本组全部改到明天
              </button>
            </div>
          </div>

          <div className="min-h-0 rounded-[22px] border border-[color:var(--ui-border-soft)] bg-[rgba(255,255,255,0.025)] px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--ui-text-muted)]">今天已看过</div>
                <div className="mt-1 text-sm text-[color:var(--ui-text-strong)]">{dismissedTodayCount} 项</div>
              </div>
              <button
                type="button"
                onClick={() => setShowReviewedTodayList((previous) => !previous)}
                className="btn btn-ghost btn-sm rounded-2xl"
              >
                <ListChecks className="h-4 w-4" />
                {showReviewedTodayList ? '收起' : '展开'}
              </button>
            </div>
            {dismissedTodayCount > 0 ? (
              <button
                type="button"
                onClick={restoreAllReviewedToday}
                className="btn btn-secondary btn-sm mt-3 rounded-2xl"
              >
                <RotateCcw className="h-4 w-4" />
                全部恢复
              </button>
            ) : null}

            <div className="mt-3 space-y-2 overflow-y-auto pr-1">
              {reviewedTodayPreview.length === 0 ? (
                <div className="rounded-[18px] border border-dashed border-[var(--ui-border-soft)] bg-[rgba(255,255,255,0.02)] px-3 py-4 text-xs text-[color:var(--ui-text-muted)]">
                  还没有被移出今天检查流的任务。
                </div>
              ) : reviewedTodayPreview.map((task) => (
                <div key={task.id} className="rounded-[18px] border border-[color:var(--ui-border-soft)] bg-[rgba(255,255,255,0.02)] px-3 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="break-words text-sm text-[color:var(--ui-text-strong)]">{task.title}</div>
                      <div className="mt-1 text-[11px] text-[color:var(--ui-text-muted)]">{getCategoryLabel(task)}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => restoreTaskToToday(task)}
                      className="btn btn-secondary btn-sm shrink-0 rounded-2xl"
                    >
                      <Undo2 className="h-4 w-4" />
                      恢复
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <details className="group rounded-[22px] border border-[color:var(--ui-border-soft)] bg-[rgba(255,255,255,0.025)] px-4 py-3">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--ui-text-muted)]">本轮动作</div>
                <div className="mt-1 text-sm text-[color:var(--ui-text-strong)]">{actionLog.length} 次处理</div>
              </div>
              <div className="inline-flex items-center gap-1 rounded-full border border-[color:var(--ui-border-soft)] bg-[rgba(255,255,255,0.03)] px-2.5 py-1 text-[11px] text-[color:var(--ui-text-secondary)]">
                <ChevronRight className="h-3.5 w-3.5 transition-transform group-open:rotate-90" />
                展开
              </div>
            </summary>

            <div className="mt-4 space-y-4">
              <div className="flex flex-wrap gap-2">
                {(Object.keys(resultTypeMeta) as ReviewResultType[]).map((type) => {
                  const meta = resultTypeMeta[type];
                  const Icon = meta.icon;
                  return (
                    <div key={type} className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${meta.tone}`}>
                      <Icon className="h-3.5 w-3.5" />
                      <span>{meta.shortLabel}</span>
                      <span className="opacity-80">{actionCounts[type]}</span>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-2">
                {recentActions.length === 0 ? (
                  <div className="text-xs text-[color:var(--ui-text-muted)]">开始处理后，这里会记录最近几次动作。</div>
                ) : recentActions.map((item) => {
                  const meta = resultTypeMeta[item.type];
                  const Icon = meta.icon;
                  return (
                    <div key={item.id} className="flex items-start gap-3 rounded-[18px] border border-[color:var(--ui-border-soft)] bg-[rgba(255,255,255,0.02)] px-3 py-2.5">
                      <div className={`mt-0.5 rounded-xl border px-2 py-1 ${meta.tone}`}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="break-words text-sm text-[color:var(--ui-text-strong)]">{item.taskTitle}</div>
                        <div className="mt-1 text-[11px] text-[color:var(--ui-text-muted)]">{meta.label} · {item.groupLabel}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </details>
        </aside>
      </div>
    </div>
  );
}
