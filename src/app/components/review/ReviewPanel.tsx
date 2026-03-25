"use client";

import React, { useEffect, useMemo, useState } from 'react';
import type { Task } from '@/lib/store';
import {
  CheckCircle2,
  Clock3,
  Eye,
  Layers3,
  ArrowRight,
  CalendarClock,
  SkipForward,
  ExternalLink,
  Hourglass,
  FolderKanban,
  Rows,
  RotateCcw,
  ListChecks,
  Sparkles,
  ChevronRight,
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
  overdue: { label: '需要立刻检查', description: '已经逾期，优先确认是否继续、改期或完成。' },
  today: { label: '今天要过一遍', description: '今天要看的任务，避免今天结束前遗忘。' },
  upcoming: { label: '接下来 7 天', description: '提前看一遍，把快到期的事情先理顺。' },
  someday: { label: '最近无明确日期', description: '没有明确截止，但应该定期回头扫一眼。' },
};

const resultTypeMeta: Record<ReviewResultType, { label: string; shortLabel: string; tone: string; icon: typeof CheckCircle2 }> = {
  completed: { label: '已完成', shortLabel: '完成', tone: 'text-emerald-100 bg-emerald-500/10 border-emerald-500/20', icon: CheckCircle2 },
  rescheduled: { label: '已改期', shortLabel: '改期', tone: 'text-amber-100 bg-amber-500/10 border-amber-500/20', icon: CalendarClock },
  reviewed_today: { label: '今天已检查', shortLabel: '已检查', tone: 'text-sky-100 bg-sky-500/10 border-sky-500/20', icon: Eye },
  back_to_context: { label: '回到原任务', shortLabel: '回上下文', tone: 'text-violet-100 bg-violet-500/10 border-violet-500/20', icon: ExternalLink },
};

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
const REVIEW_DISMISSED_STORAGE_KEY = 'recall_review_dismissed_until';

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

const isSameLocalDay = (left: Date, right: Date) => (
  left.getFullYear() === right.getFullYear()
  && left.getMonth() === right.getMonth()
  && left.getDate() === right.getDate()
);

const getTaskTimeBucket = (task: Task, isTaskOverdue: (task: Task) => boolean): Exclude<ReviewBucketKey, 'all'> => {
  const today = startOfLocalDay(new Date());
  const nextWeek = addDays(today, 7);

  if (task.dueDate && isTaskOverdue(task)) {
    return 'overdue';
  }

  if (task.dueDate) {
    const dueDay = startOfLocalDay(new Date(task.dueDate));
    if (dueDay.getTime() === today.getTime()) return 'today';
    if (dueDay > today && dueDay <= nextWeek) return 'upcoming';
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
      groups[getTaskTimeBucket(task, isTaskOverdue)].push(task);
    });

    Object.values(groups).forEach((list) => {
      list.sort((a, b) => getTaskSortTime(a) - getTaskSortTime(b));
    });

    return groups;
  }, [reviewEligibleTasks, isTaskOverdue]);

  const categoryGroups = useMemo(() => {
    const grouped = new Map<string, Task[]>();

    reviewEligibleTasks.forEach((task) => {
      const label = getCategoryLabel(task);
      const list = grouped.get(label) ?? [];
      list.push(task);
      grouped.set(label, list);
    });

    const entries = Array.from(grouped.entries())
      .map(([label, list]) => ({
        key: label === '未分类' ? 'uncategorized' : label,
        label,
        description: label === '未分类' ? '没有进入任何列表的任务，适合先归位。' : `按「${label}」列表逐项过一遍。`,
        tasks: list.sort((a, b) => getTaskSortTime(a) - getTaskSortTime(b)),
      }))
      .sort((a, b) => {
        if (a.label === '未分类') return -1;
        if (b.label === '未分类') return 1;
        return b.tasks.length - a.tasks.length || a.label.localeCompare(b.label, 'zh-CN');
      });

    return entries;
  }, [reviewEligibleTasks]);

  const dismissedTodayCount = reviewedTodayTasks.length;

  const reviewCounts = {
    all: Object.values(reviewGroups).reduce((sum, list) => sum + list.length, 0),
    overdue: reviewGroups.overdue.length,
    today: reviewGroups.today.length,
    upcoming: reviewGroups.upcoming.length,
    someday: reviewGroups.someday.length,
  };

  const categoryCounts = {
    all: reviewEligibleTasks.length,
    categoryGroups: categoryGroups.length,
    uncategorized: categoryGroups.find((group) => group.key === 'uncategorized')?.tasks.length ?? 0,
    largestGroup: categoryGroups[0]?.tasks.length ?? 0,
  };

  const timeGroupMeta: ReviewGroupMeta[] = [
    { key: 'all', label: '全部待检查', description: '按逾期、今天、未来 7 天、无明确日期的顺序检查。', count: reviewCounts.all },
    { key: 'overdue', label: '逾期', description: bucketMeta.overdue.description, count: reviewCounts.overdue },
    { key: 'today', label: '今天', description: bucketMeta.today.description, count: reviewCounts.today },
    { key: 'upcoming', label: '未来 7 天', description: bucketMeta.upcoming.description, count: reviewCounts.upcoming },
    { key: 'someday', label: '无明确日期', description: bucketMeta.someday.description, count: reviewCounts.someday },
  ];

  const categoryGroupMeta: ReviewGroupMeta[] = [
    {
      key: 'all',
      label: '全部列表',
      description: '按列表把活重新扫一遍，适合周回顾和重新聚焦。',
      count: reviewEligibleTasks.length,
    },
    ...categoryGroups.map((group) => ({
      key: group.key,
      label: group.label,
      description: group.description,
      count: group.tasks.length,
    })),
  ];

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
  }, [reviewMode, activeBucket, reviewGroups, activeCategoryBucket, categoryGroups]);

  const currentGroupMeta = reviewMode === 'time'
    ? timeGroupMeta.find((item) => item.key === activeBucket)
    : categoryGroupMeta.find((item) => item.key === activeCategoryBucket);

  const fallbackFocusTask = selectedTask && selectedTask.status !== 'completed' && reviewList.some((task) => task.id === selectedTask.id)
    ? selectedTask
    : reviewList[0] || null;

  const focusTask = reviewList.find((task) => task.id === focusedTaskId) || fallbackFocusTask;
  const focusIndex = focusTask ? reviewList.findIndex((task) => task.id === focusTask.id) : -1;
  const reviewedCount = focusIndex >= 0 ? focusIndex : 0;
  const remainingCount = focusIndex >= 0 ? Math.max(reviewList.length - focusIndex - 1, 0) : reviewList.length;
  const progressPercent = reviewList.length > 0
    ? Math.max(6, Math.round(((reviewedCount + (focusTask ? 1 : 0)) / reviewList.length) * 100))
    : 0;

  const categorySummaryText = focusTask
    ? `当前列表：${getCategoryLabel(focusTask)} · 适合顺手把同类事项一起清掉。`
    : '可以按列表一组一组扫，减少在不同上下文里频繁切换。';

  const getTaskGroupKey = (task: Task) => {
    if (reviewMode === 'time') {
      const timeBucket = getTaskTimeBucket(task, isTaskOverdue);
      return activeBucket === 'all' ? timeBucket : activeBucket;
    }
    const categoryKey = getCategoryLabel(task) === '未分类' ? 'uncategorized' : getCategoryLabel(task);
    return activeCategoryBucket === 'all' ? categoryKey : activeCategoryBucket;
  };

  const getTaskGroupLabel = (task: Task) => {
    if (reviewMode === 'time') {
      const timeBucket = getTaskTimeBucket(task, isTaskOverdue);
      return activeBucket === 'all' ? bucketMeta[timeBucket].label : (timeGroupMeta.find((item) => item.key === activeBucket)?.label ?? '当前时间组');
    }
    const categoryLabel = getCategoryLabel(task);
    return activeCategoryBucket === 'all' ? categoryLabel : (categoryGroupMeta.find((item) => item.key === activeCategoryBucket)?.label ?? categoryLabel);
  };

  const currentNaturalGroupTasks = useMemo(() => {
    if (!focusTask) return [] as Task[];

    if (reviewMode === 'time') {
      const bucket = getTaskTimeBucket(focusTask, isTaskOverdue);
      return reviewGroups[bucket];
    }

    const categoryLabel = getCategoryLabel(focusTask);
    return categoryGroups.find((group) => group.label === categoryLabel)?.tasks ?? [];
  }, [focusTask, reviewMode, reviewGroups, categoryGroups, isTaskOverdue]);

  const currentNaturalGroupKey = focusTask ? getTaskGroupKey(focusTask) : null;
  const currentNaturalGroupLabel = focusTask ? getTaskGroupLabel(focusTask) : null;
  const currentNaturalGroupRemaining = useMemo(() => {
    if (!focusTask) return [] as Task[];
    return currentNaturalGroupTasks.filter((task) => task.id !== focusTask.id);
  }, [focusTask, currentNaturalGroupTasks]);

  const actionCounts = useMemo(() => {
    return actionLog.reduce<Record<ReviewResultType, number>>((acc, item) => {
      acc[item.type] += 1;
      return acc;
    }, {
      completed: 0,
      rescheduled: 0,
      reviewed_today: 0,
      back_to_context: 0,
    });
  }, [actionLog]);

  const recentActions = actionLog.slice(0, 6);

  const nextAvailableGroupMeta = useMemo(() => {
    if (reviewMode === 'time') {
      const currentIndex = timeGroupMeta.findIndex((item) => item.key === (currentNaturalGroupKey ?? activeBucket));
      if (currentIndex === -1) return null;
      return timeGroupMeta.slice(currentIndex + 1).find((item) => item.key !== 'all' && item.count > 0) ?? null;
    }

    const metas = activeCategoryBucket === 'all'
      ? categoryGroupMeta.filter((item) => item.key !== 'all')
      : categoryGroupMeta;
    const currentIndex = metas.findIndex((item) => item.key === (currentNaturalGroupKey ?? activeCategoryBucket));
    if (currentIndex === -1) return null;
    return metas.slice(currentIndex + 1).find((item) => item.count > 0) ?? null;
  }, [reviewMode, timeGroupMeta, categoryGroupMeta, currentNaturalGroupKey, activeBucket, activeCategoryBucket]);

  const focusStepText = focusTask
    ? `第 ${focusIndex + 1} / ${reviewList.length} 项`
    : '当前分组已清空';

  const currentGroupSummary = currentGroupMeta
    ? `${reviewMode === 'time' ? '当前时间组' : '当前列表组'}：${currentGroupMeta.label} · ${currentGroupMeta.count} 项`
    : '还没有可检查的分组';

  const nextStepTitle = !focusTask
    ? '切到下一组继续'
    : reviewMode === 'time'
      ? '先对这 1 项做判断'
      : '先把这类任务重新摆正';

  const nextStepDescription = !focusTask
    ? '这一组已经扫完，可以切换到下一组继续保持节奏。'
    : reviewMode === 'time'
      ? '完成、改期，或回到原任务补上下文；做完会优先留在当前更紧急的同组任务里。'
      : `先确认「${getCategoryLabel(focusTask)}」这组里当前最该推进的是哪一项，再决定完成、改期或回到原任务。`;

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
  }, [reviewMode, activeCategoryBucket, categoryGroups]);

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
  }, [reviewList, focusTask]);

  const getPriorityScore = (task: Task) => {
    const bucket = getTaskTimeBucket(task, isTaskOverdue);
    const bucketScore = bucket === 'overdue' ? 4000000000000 : bucket === 'today' ? 3000000000000 : bucket === 'upcoming' ? 2000000000000 : 1000000000000;
    const dueScore = 1000000000000 - Math.min(getTaskSortTime(task), 1000000000000);
    const priorityScore = task.priority * 1000000;
    const statusScore = task.status === 'in_progress' ? 500000 : 0;
    return bucketScore + dueScore + priorityScore + statusScore;
  };

  const registerAction = (task: Task, type: ReviewResultType, detail: string, overrideTitle?: string) => {
    const groupLabel = getTaskGroupLabel(task);
    const groupKey = getTaskGroupKey(task);
    setActionLog((prev) => [{
      id: getActionId(),
      taskId: task.id,
      taskTitle: task.title,
      type,
      createdAt: new Date().toISOString(),
      detail,
      groupKey,
      groupLabel,
    }, ...prev].slice(0, 40));
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
      ? remaining.filter((task) => {
          if (reviewMode === 'time') {
            return getTaskTimeBucket(task, isTaskOverdue) === getTaskTimeBucket(currentTask, isTaskOverdue);
          }
          return getCategoryLabel(task) === getCategoryLabel(currentTask);
        })
      : [];

    const candidatePool = sameNaturalGroup.length > 0 ? sameNaturalGroup : remaining;
    const nextTask = [...candidatePool].sort((a, b) => getPriorityScore(b) - getPriorityScore(a))[0] ?? remaining[0] ?? null;

    setFocusedTaskId(nextTask?.id ?? null);
    if (nextTask) {
      onSelectTask(nextTask);
      if (currentTask && sameNaturalGroup.length === 0) {
        const nextLabel = reviewMode === 'time'
          ? bucketMeta[getTaskTimeBucket(nextTask, isTaskOverdue)].label
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
    setDismissedTaskMap((prev) => {
      const next = { ...prev, [taskId]: until };
      writeDismissedMap(next);
      return next;
    });
  };

  const clearTaskReviewedForToday = (taskId: string) => {
    setDismissedTaskMap((prev) => {
      if (!(taskId in prev)) return prev;
      const next = { ...prev };
      delete next[taskId];
      writeDismissedMap(next);
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
      description: `已把「${task.title}」恢复到今天的检查流。`,
    });
  };

  const restoreAllReviewedToday = () => {
    if (!reviewedTodayTasks.length) return;
    setDismissedTaskMap((prev) => {
      const next = { ...prev };
      reviewedTodayTasks.forEach((task) => {
        delete next[task.id];
      });
      writeDismissedMap(next);
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
      description: `已把今天已检查的 ${reviewedTodayTasks.length} 项恢复到今天的检查流。`,
    });
  };

  const handleCustomReschedule = () => {
    if (!focusTask || !customDate) return;
    const offset = focusTask.timezoneOffset ?? defaultTimezoneOffset;
    onUpdateTaskDueDate(focusTask.id, `${customDate}T09:00:00.000Z`, offset);
    registerAction(focusTask, 'rescheduled', `已把「${focusTask.title}」改到 ${customDate}`);
    setCustomDate('');
    moveFocusSmartly(focusTask.id);
  };

  const handleComplete = () => {
    if (!focusTask) return;
    clearTaskReviewedForToday(focusTask.id);
    onToggleTaskStatus(focusTask.id);
    registerAction(focusTask, 'completed', `已完成「${focusTask.title}」，继续下一项`);
    moveFocusSmartly(focusTask.id);
  };

  const handlePreset = (preset: 'today' | 'tomorrow' | 'tonight', text: string) => {
    if (!focusTask) return;
    clearTaskReviewedForToday(focusTask.id);
    onQuickSetDuePreset(focusTask.id, preset);
    registerAction(focusTask, 'rescheduled', `已将「${focusTask.title}」${text}`);
    moveFocusSmartly(focusTask.id);
  };

  const handleOpenContext = () => {
    if (!focusTask) return;
    onOpenTaskContext(focusTask);
    registerAction(focusTask, 'back_to_context', `已回到「${focusTask.title}」的原任务上下文`);
  };

  const handleDoneForToday = () => {
    if (!focusTask) return;
    markTaskReviewedForToday(focusTask.id);
    registerAction(focusTask, 'reviewed_today', `已把「${focusTask.title}」标记为今天已检查，明天再回来`);
    moveFocusSmartly(focusTask.id);
  };

  const handleBringBackToday = () => {
    if (!focusTask) return;
    clearTaskReviewedForToday(focusTask.id);
    setFeedback({
      tone: 'info',
      title: '已恢复到今天',
      description: `已恢复「${focusTask.title}」到今天的检查流。`,
    });
  };

  const handleBatchReviewToday = () => {
    if (!currentNaturalGroupRemaining.length || !currentNaturalGroupLabel) return;
    currentNaturalGroupRemaining.forEach((task) => {
      markTaskReviewedForToday(task.id);
    });
    setActionLog((prev) => {
      const nextRecords = currentNaturalGroupRemaining.map((task) => ({
        id: getActionId(),
        taskId: task.id,
        taskTitle: task.title,
        type: 'reviewed_today' as const,
        createdAt: new Date().toISOString(),
        detail: `批量将「${task.title}」标记为今天已检查`,
        groupKey: getTaskGroupKey(task),
        groupLabel: getTaskGroupLabel(task),
      }));
      return [...nextRecords, ...prev].slice(0, 40);
    });
    setFeedback({
      tone: 'success',
      title: '本组已批量标记',
      description: `已将「${currentNaturalGroupLabel}」剩余 ${currentNaturalGroupRemaining.length} 项标记为今天已检查。`,
    });
    if (focusTask) moveFocusSmartly(focusTask.id);
  };

  const handleBatchRescheduleTomorrow = () => {
    if (!currentNaturalGroupTasks.length || !currentNaturalGroupLabel) return;
    currentNaturalGroupTasks.forEach((task) => {
      clearTaskReviewedForToday(task.id);
      onQuickSetDuePreset(task.id, 'tomorrow');
    });
    setActionLog((prev) => {
      const nextRecords = currentNaturalGroupTasks.map((task) => ({
        id: getActionId(),
        taskId: task.id,
        taskTitle: task.title,
        type: 'rescheduled' as const,
        createdAt: new Date().toISOString(),
        detail: `批量将「${task.title}」改到明天`,
        groupKey: getTaskGroupKey(task),
        groupLabel: getTaskGroupLabel(task),
      }));
      return [...nextRecords, ...prev].slice(0, 40);
    });
    setFeedback({
      tone: 'success',
      title: '本组已统一改期',
      description: `已将「${currentNaturalGroupLabel}」这组 ${currentNaturalGroupTasks.length} 项统一改到明天。`,
    });
    if (focusTask) moveFocusSmartly(focusTask.id);
  };

  return (
    <div className="stack-gap flex flex-col gap-5 px-3 pb-4 sm:gap-6 sm:px-6 sm:pb-6 xl:gap-7">
      <div className="glass-panel motion-enter rounded-[32px] border-[color:var(--ui-border-strong)] p-4 shadow-[0_18px_40px_rgba(0,0,0,0.18)] sm:p-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(260px,0.9fr)] lg:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-sm font-semibold tracking-tight text-[#F3F6FF]">Review / 检查</div>
              <span className="rounded-full border border-[color:var(--ui-border-soft)] bg-[rgba(0,0,0,0.18)] px-2.5 py-1 text-[10px] text-[#7d8595]">
                0.0.4 工作流增强轮
              </span>
            </div>
            <div className="mt-2 text-xs leading-6 text-[#7d8595]">
              不只按时间扫一遍，也可以按列表重新过一轮；本轮会记录处理类型、支持批量动作，并在组切换时给出明确反馈。
            </div>
          </div>

          <div className="glass-panel-soft rounded-[24px] border-[color:var(--ui-border-soft)] p-3.5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.14em] text-[#AAB3C6]">先看这里</div>
                <div className="mt-2 space-y-2 text-sm text-[#DCE3F4]">
                  <div>1. {currentGroupSummary}</div>
                  <div>2. 当前焦点：{focusTask ? focusTask.title : '本组暂时没有任务'}</div>
                  <div>3. 下一步：{nextStepTitle}</div>
                </div>
              </div>
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/8 px-3 py-2 text-right">
                <div className="text-[10px] uppercase tracking-[0.14em] text-emerald-200">今天已检查</div>
                <div className="mt-1 text-lg font-semibold tracking-tight text-[#F3F6FF]">{dismissedTodayCount}</div>
              </div>
            </div>
            <div className="mt-3 text-xs leading-5 text-[#7d8595]">{nextStepDescription}</div>
            {dismissedTodayCount > 0 ? (
              <div className="mt-3 flex flex-wrap items-center gap-2 rounded-[20px] border border-emerald-500/20 bg-emerald-500/6 px-3 py-2.5">
                <ListChecks className="h-4 w-4 text-emerald-200" />
                <div className="min-w-0 flex-1 text-xs text-emerald-100">
                  今日已移出检查流 {dismissedTodayCount} 项，可在右侧“今天已检查”区直接恢复。
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {(reviewMode === 'time'
          ? [
              { key: 'overdue', label: '需立刻检查', value: reviewCounts.overdue, icon: Clock3, tone: 'text-red-200 bg-red-500/10 border-red-500/20' },
              { key: 'today', label: '今天要过', value: reviewCounts.today, icon: Eye, tone: 'text-amber-200 bg-amber-500/10 border-amber-500/20' },
              { key: 'upcoming', label: '未来 7 天', value: reviewCounts.upcoming, icon: Layers3, tone: 'text-blue-200 bg-blue-500/10 border-blue-500/20' },
              { key: 'all', label: '待检查总数', value: reviewCounts.all, icon: CheckCircle2, tone: 'text-emerald-200 bg-emerald-500/10 border-emerald-500/20' },
            ]
          : [
              { key: 'all', label: '待检查总数', value: categoryCounts.all, icon: CheckCircle2, tone: 'text-emerald-200 bg-emerald-500/10 border-emerald-500/20' },
              { key: 'groups', label: '列表数量', value: categoryCounts.categoryGroups, icon: FolderKanban, tone: 'text-sky-200 bg-sky-500/10 border-sky-500/20' },
              { key: 'uncategorized', label: '未分类任务', value: categoryCounts.uncategorized, icon: Rows, tone: 'text-amber-200 bg-amber-500/10 border-amber-500/20' },
              { key: 'largest', label: '最大列表堆积', value: categoryCounts.largestGroup, icon: Layers3, tone: 'text-violet-200 bg-violet-500/10 border-violet-500/20' },
            ]).map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.key} className="glass-panel-soft motion-enter rounded-[28px] border-[color:var(--ui-border-soft)] p-3.5 sm:p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.14em] text-[#AAB3C6]">{item.label}</div>
                    <div className="mt-2 text-2xl font-semibold tracking-tight text-[#F3F6FF]">{item.value}</div>
                  </div>
                  <div className={`rounded-2xl border px-2.5 py-2 ${item.tone}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.18fr)_minmax(320px,0.82fr)]">
        <div className="glass-panel-soft motion-enter space-y-4 rounded-[28px] border-[color:var(--ui-border-soft)] p-3.5 sm:p-4">
          <div className="space-y-1">
            <div className="text-[11px] uppercase tracking-[0.14em] text-[#AAB3C6]">第 1 步：选择检查视角</div>
            <div className="text-xs text-[#7d8595]">先决定按时间扫，还是按列表逐组检查；下面再选当前这一组。</div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {([
              { key: 'time', label: '按时间检查', icon: Clock3 },
              { key: 'category', label: '按列表检查', icon: FolderKanban },
            ] as const).map((item) => {
              const Icon = item.icon;
              const active = reviewMode === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setReviewMode(item.key)}
                  className={`inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border motion-card motion-press ui-state-hover ui-state-press ${
                    active
                      ? 'border-blue-400/60 bg-blue-500/15 text-blue-200 shadow-[0_0_0_4px_rgba(var(--theme-accent),0.10)]'
                      : 'border-[color:var(--ui-border-soft)] bg-[rgba(255,255,255,0.02)] text-[#7C8499] hover:text-[#E1E8FF] hover:border-[#5A6690]'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-2">
              <div className="text-[11px] uppercase tracking-[0.14em] text-[#AAB3C6]">第 2 步：选择当前要扫的组</div>
              <div className="flex flex-wrap items-center gap-2">
                {(reviewMode === 'time' ? timeGroupMeta : categoryGroupMeta).map((item) => {
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
                      className={`text-xs px-3 py-1.5 rounded-full border motion-card motion-press ui-state-hover ui-state-press ${
                        active
                          ? 'border-blue-400/60 bg-blue-500/15 text-blue-200 shadow-[0_0_0_4px_rgba(var(--theme-accent),0.10)]'
                          : 'border-[color:var(--ui-border-soft)] bg-[rgba(255,255,255,0.02)] text-[#7C8499] hover:text-[#E1E8FF] hover:border-[#5A6690]'
                      }`}
                    >
                      {item.label}
                      <span className="ml-1.5 text-[10px] opacity-80">{item.count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="rounded-[20px] border border-[color:var(--ui-border-soft)] bg-[rgba(255,255,255,0.02)] px-3.5 py-3 text-[11px] leading-5 text-[#7d8595] xl:max-w-[280px]">
              <div className="text-[#DCE3F4]">{currentGroupSummary}</div>
              <div className="mt-1.5">当前展示：{reviewList.length} 项</div>
            </div>
          </div>
        </div>

        <div className="glass-panel-soft motion-enter rounded-[28px] border-[color:var(--ui-border-soft)] p-3.5 sm:p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.14em] text-[#AAB3C6]">今天已检查</div>
              <div className="mt-2 text-sm text-[#DCE3F4]">已暂时移出检查流 {dismissedTodayCount} 项</div>
              <div className="mt-1 text-xs leading-5 text-[#7d8595]">这里可以看具体任务、逐项恢复，也可以一键全部恢复到今天。</div>
            </div>
            <button
              type="button"
              onClick={() => setShowReviewedTodayList((prev) => !prev)}
              className="btn btn-ghost btn-sm rounded-2xl"
            >
              <ListChecks className="h-4 w-4" />
              {showReviewedTodayList ? '收起列表' : '查看列表'}
            </button>
          </div>

          {dismissedTodayCount > 0 ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={restoreAllReviewedToday}
                className="btn btn-secondary btn-sm rounded-2xl"
              >
                <RotateCcw className="h-4 w-4" />
                全部恢复到今天
              </button>
              <span className="rounded-full border border-emerald-500/20 bg-emerald-500/8 px-2.5 py-1 text-[11px] text-emerald-100">
                明天会自动重新出现在检查流里
              </span>
            </div>
          ) : null}

          {showReviewedTodayList ? (
            <div className="mt-3 space-y-2">
              {reviewedTodayTasks.length === 0 ? (
                <div className="rounded-[20px] border border-dashed border-[var(--ui-border-soft)] bg-[rgba(255,255,255,0.02)] px-3 py-5 text-xs text-[#7d8595]">
                  目前还没有被标记为“今天已检查”的任务。
                </div>
              ) : reviewedTodayTasks.map((task) => (
                <div key={task.id} className="glass-panel-soft rounded-[20px] border-[color:var(--ui-border-soft)] px-3 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-[#F3F6FF] break-words">{task.title}</div>
                      <div className="mt-1 text-[11px] text-[#7d8595]">{getCategoryLabel(task)}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => restoreTaskToToday(task)}
                      className="btn btn-secondary btn-sm rounded-2xl shrink-0"
                    >
                      <Undo2 className="h-4 w-4" />
                      恢复
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="glass-panel-soft motion-enter rounded-[28px] border-[color:var(--ui-border-soft)] p-3.5 sm:p-4">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)] lg:items-center">
          <div>
            <div className="text-[11px] uppercase tracking-[0.14em] text-[#AAB3C6]">第 3 步：确认当前焦点与进度</div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[#DCE3F4]">
              <span>当前：{focusStepText}</span>
              <span>本组共 {reviewList.length} 项</span>
              <span>剩余 {remainingCount} 项</span>
            </div>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,rgba(92,123,250,0.9),rgba(110,231,255,0.85))] transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
          <div className="rounded-[22px] border border-[color:var(--ui-border-soft)] bg-[rgba(255,255,255,0.025)] px-4 py-3">
            <div className="text-[11px] uppercase tracking-[0.14em] text-[#AAB3C6]">当前组提示</div>
            <div className="mt-2 text-sm text-[#DCE3F4]">{currentGroupSummary}</div>
            <div className="mt-2 text-xs leading-5 text-[#7d8595]">
              {reviewMode === 'time'
                ? (focusTask
                    ? '优先继续当前更紧急的同组任务；如果本组清空，会明确提示切换到下一组。'
                    : '这一组已经扫完了，可以切去下一组继续。')
                : categorySummaryText}
            </div>
            {nextAvailableGroupMeta ? (
              <div className="mt-2 inline-flex items-center gap-1 rounded-full border border-[color:var(--ui-border-soft)] bg-[rgba(255,255,255,0.02)] px-2.5 py-1 text-[11px] text-[#DCE3F4]">
                <ChevronRight className="h-3.5 w-3.5 text-[#7d8595]" />
                下一组候选：{nextAvailableGroupMeta.label}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="glass-panel-soft motion-enter rounded-[28px] border-[color:var(--ui-border-soft)] p-3.5 sm:p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.14em] text-[#AAB3C6]">第 3.5 步：检查总结</div>
            <div className="mt-2 text-sm text-[#DCE3F4]">当前这一轮已经做了哪些类型的处理，一眼能看清。</div>
            <div className="mt-1 text-xs text-[#7d8595]">完成、改期、今天已检查、回到原任务，都会记到这里。</div>
          </div>
          <div className="rounded-[20px] border border-[color:var(--ui-border-soft)] bg-[rgba(255,255,255,0.02)] px-3 py-2 text-xs text-[#7d8595]">
            本轮累计 {actionLog.length} 次处理
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {(Object.keys(resultTypeMeta) as ReviewResultType[]).map((type) => {
            const meta = resultTypeMeta[type];
            const Icon = meta.icon;
            return (
              <div key={type} className="glass-panel-soft rounded-[22px] border-[color:var(--ui-border-soft)] p-3.5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.14em] text-[#AAB3C6]">{meta.label}</div>
                    <div className="mt-2 text-2xl font-semibold tracking-tight text-[#F3F6FF]">{actionCounts[type]}</div>
                  </div>
                  <div className={`rounded-2xl border px-2.5 py-2 ${meta.tone}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)]">
          <div className="rounded-[22px] border border-[color:var(--ui-border-soft)] bg-[rgba(255,255,255,0.02)] px-4 py-3">
            <div className="text-[11px] uppercase tracking-[0.14em] text-[#AAB3C6]">处理类型</div>
            <div className="mt-3 flex flex-wrap gap-2">
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
          </div>

          <div className="rounded-[22px] border border-[color:var(--ui-border-soft)] bg-[rgba(255,255,255,0.02)] px-4 py-3">
            <div className="text-[11px] uppercase tracking-[0.14em] text-[#AAB3C6]">最近处理</div>
            <div className="mt-3 space-y-2">
              {recentActions.length === 0 ? (
                <div className="text-xs text-[#7d8595]">还没开始处理时，这里会显示本轮最新几次动作。</div>
              ) : recentActions.map((item) => {
                const meta = resultTypeMeta[item.type];
                const Icon = meta.icon;
                return (
                  <div key={item.id} className="flex items-start gap-3 rounded-[18px] border border-[color:var(--ui-border-soft)] bg-[rgba(255,255,255,0.02)] px-3 py-2.5">
                    <div className={`mt-0.5 rounded-xl border px-2 py-1 ${meta.tone}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-[#F3F6FF] break-words">{item.taskTitle}</div>
                      <div className="mt-1 text-[11px] text-[#7d8595]">{meta.label} · {item.groupLabel}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(420px,0.92fr)] xl:items-start">
        <div className="glass-panel motion-enter rounded-[30px] border-[color:var(--ui-border-strong)] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold tracking-tight text-[#F3F6FF]">
                {currentGroupMeta?.label ?? '待检查列表'}
              </div>
              <div className="mt-1 text-xs text-[#7d8595]">
                {currentGroupMeta?.description ?? '逐项过一遍任务，确保每件事都回到该在的位置。'}
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            {reviewList.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-[var(--ui-border-soft)] bg-[rgba(255,255,255,0.02)] px-4 py-8 text-sm text-[#7d8595]">
                这一组目前没有需要检查的任务。
              </div>
            ) : (
              reviewList.map((task) => {
                const offset = task.dueDate
                  ? getTimezoneOffset(task)
                  : (task.timezoneOffset ?? defaultTimezoneOffset);
                const dueLabel = task.dueDate
                  ? formatZonedDateTime(task.dueDate, offset)
                  : formatZonedDate(task.updatedAt || task.createdAt, offset);
                const overdue = task.dueDate ? isTaskOverdue(task) : false;
                const isFocus = focusTask?.id === task.id;

                return (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => {
                      setFocusedTaskId(task.id);
                      onSelectTask(task);
                    }}
                    className={`w-full text-left rounded-[24px] border p-3.5 transition-all ${
                      isFocus
                        ? 'border-[rgba(var(--theme-accent),0.36)] bg-[rgba(var(--theme-accent),0.09)] shadow-[0_12px_28px_rgba(0,0,0,0.22)]'
                        : 'border-[color:var(--ui-border-soft)] bg-[rgba(255,255,255,0.025)] hover:bg-[rgba(255,255,255,0.04)] hover:border-[color:var(--ui-border-strong)]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] ${
                            overdue
                              ? 'text-red-200 bg-red-500/12 border-red-500/25'
                              : task.dueDate
                                ? 'text-blue-200 bg-blue-500/12 border-blue-500/25'
                                : 'text-[#C7CFDF] bg-[rgba(255,255,255,0.04)] border-[color:var(--ui-border-soft)]'
                          }`}>
                            {overdue ? '逾期待处理' : task.dueDate ? '有日期' : '待整理'}
                          </span>
                          <span className="text-[10px] text-indigo-200 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-full">
                            {getCategoryLabel(task)}
                          </span>
                          {focusTask && currentNaturalGroupRemaining.some((item) => item.id === task.id) ? (
                            <span className="text-[10px] text-sky-100 bg-sky-500/10 border border-sky-500/20 px-2.5 py-1 rounded-full">
                              同组待推进
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-2 text-[14px] font-medium leading-6 text-[#F3F6FF] break-words">
                          {task.title}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-[#7d8595]">
                          <span>{task.dueDate ? `截止：${dueLabel}` : `最近更新：${dueLabel}`}</span>
                          {(task.tags?.length ?? 0) > 0 ? (
                            <span>{task.tags?.filter(Boolean).slice(0, 4).map((tag) => `#${tag}`).join(' ')}</span>
                          ) : null}
                        </div>
                      </div>
                      <ArrowRight className={`h-4 w-4 shrink-0 text-[#697386] transition-transform ${isFocus ? 'translate-x-0.5' : ''}`} />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="glass-panel motion-enter rounded-[30px] border-[color:var(--ui-border-strong)] p-4 xl:sticky xl:top-4">
          <div className="space-y-3">
            <div>
              <div className="text-sm font-semibold tracking-tight text-[#F3F6FF]">第 4 步：左右对照处理当前焦点</div>
              <div className="mt-1 text-xs text-[#7d8595]">
                {reviewMode === 'time'
                  ? '左边看任务原始信息，右边直接做决定；今天看过一次的任务，可以直接标成“今天已检查”，当天不再重复出现。'
                  : '按列表检查时，左边先确认任务本身，右边再决定完成、回到上下文，还是改期。'}
              </div>
            </div>

            <div className="rounded-[22px] border border-[color:var(--ui-border-soft)] bg-[rgba(255,255,255,0.025)] px-3.5 py-3">
              <div className="text-[11px] uppercase tracking-[0.14em] text-[#AAB3C6]">你现在在哪里</div>
              <div className="mt-2 text-sm text-[#DCE3F4]">{currentGroupSummary}</div>
              <div className="mt-1.5 text-sm text-[#DCE3F4]">当前焦点：{focusTask ? focusTask.title : '本组暂时没有任务'}</div>
              <div className="mt-1.5 text-xs leading-5 text-[#7d8595]">下一步：{nextStepDescription}</div>
              {dismissedTodayCount > 0 ? (
                <div className="mt-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/8 px-3 py-2 text-xs text-emerald-100">
                  今天已暂时移出检查流：{dismissedTodayCount} 项
                </div>
              ) : null}
              {currentNaturalGroupLabel ? (
                <div className="mt-2 rounded-2xl border border-sky-500/20 bg-sky-500/8 px-3 py-2 text-xs text-sky-100">
                  当前自然分组：{currentNaturalGroupLabel} · 剩余同组 {currentNaturalGroupRemaining.length} 项
                </div>
              ) : null}
            </div>
          </div>

          {focusTask ? (
            <div className="mt-4 space-y-3">
              {feedback ? (
                <div className={`rounded-[20px] border px-3.5 py-3 text-xs ${
                  feedback.tone === 'success'
                    ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-100'
                    : 'border-sky-500/20 bg-sky-500/10 text-sky-100'
                }`}>
                  <div className="font-medium">{feedback.title}</div>
                  <div className="mt-1 opacity-90">{feedback.description}</div>
                </div>
              ) : null}

              <div className="rounded-[20px] border border-[color:var(--ui-border-soft)] bg-[rgba(255,255,255,0.02)] px-3.5 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.14em] text-[#AAB3C6]">批量处理当前组</div>
                    <div className="mt-1 text-xs leading-5 text-[#7d8595]">
                      适合当前焦点所在的自然分组：{currentNaturalGroupLabel ?? '暂无'}。
                    </div>
                  </div>
                  <Sparkles className="h-4 w-4 text-[#AAB3C6]" />
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={handleBatchReviewToday}
                    disabled={currentNaturalGroupRemaining.length === 0}
                    className="btn btn-secondary btn-md rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Eye className="h-4 w-4" />
                    本组剩余项全标今天已检查
                  </button>
                  <button
                    type="button"
                    onClick={handleBatchRescheduleTomorrow}
                    disabled={currentNaturalGroupTasks.length === 0}
                    className="btn btn-secondary btn-md rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <CalendarClock className="h-4 w-4" />
                    本组全部改到明天
                  </button>
                </div>
              </div>

              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
                <div className="glass-panel-soft rounded-[24px] border-[color:var(--ui-border-soft)] p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.14em] text-[#AAB3C6]">左侧：当前任务</div>
                      <div className="mt-2 text-[15px] font-medium leading-6 text-[#F3F6FF]">{focusTask.title}</div>
                    </div>
                    <span className="rounded-full border border-blue-500/25 bg-blue-500/10 px-2.5 py-1 text-[10px] text-blue-200">
                      {focusStepText}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs text-[#7d8595]">
                    <div>状态：{focusTask.status === 'in_progress' ? '进行中' : '待处理'}</div>
                    <div>列表：{getCategoryLabel(focusTask)}</div>
                    <div>进度：当前第 {focusIndex + 1} 项 / 本组共 {reviewList.length} 项</div>
                    <div>
                      时间：
                      {focusTask.dueDate
                        ? formatZonedDateTime(focusTask.dueDate, getTimezoneOffset(focusTask))
                        : formatZonedDate(focusTask.updatedAt || focusTask.createdAt, focusTask.timezoneOffset ?? defaultTimezoneOffset)}
                    </div>
                    {(focusTask.tags?.length ?? 0) > 0 ? (
                      <div>标签：{focusTask.tags?.filter(Boolean).slice(0, 6).map((tag) => `#${tag}`).join(' ')}</div>
                    ) : null}
                  </div>

                  {(focusTask.subtasks?.length ?? 0) > 0 ? (
                    <div className="rounded-[20px] border border-[color:var(--ui-border-soft)] bg-[rgba(255,255,255,0.02)] px-3 py-3">
                      <div className="text-[11px] uppercase tracking-[0.14em] text-[#AAB3C6]">子任务进度</div>
                      <div className="mt-2 space-y-2 text-sm text-[#D8DEEF]">
                        {focusTask.subtasks?.map((subtask) => (
                          <div key={subtask.id} className="flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full ${subtask.completed ? 'bg-emerald-400' : 'bg-[#63708A]'}`} />
                            <span className={subtask.completed ? 'line-through text-[#707789]' : 'text-[#D8DEEF]'}>{subtask.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="glass-panel-soft rounded-[24px] border-[color:var(--ui-border-soft)] p-4 space-y-3">
                  <div className="space-y-1">
                    <div className="text-[11px] uppercase tracking-[0.14em] text-[#AAB3C6]">右侧：处理动作</div>
                    <div className="text-xs text-[#7d8595]">对着左边这项直接处理，主操作放上面，改期放下面，避免来回找。</div>
                  </div>

                  <div className="space-y-2.5">
                    <div className="text-[11px] uppercase tracking-[0.14em] text-[#AAB3C6]">主操作</div>
                    <div className="grid gap-2 sm:grid-cols-2">
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
                        回到原任务
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2.5 rounded-[20px] border border-[color:var(--ui-border-soft)] bg-[rgba(255,255,255,0.02)] px-3 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.14em] text-[#AAB3C6]">今天先不再检查</div>
                        <div className="text-xs text-[#7d8595]">这项今天已经看过的话，可以先移出今天的检查流，默认明天再回来。当前已移出 {dismissedTodayCount} 项。</div>
                      </div>
                      <span className="rounded-full border border-sky-500/20 bg-sky-500/8 px-2.5 py-1 text-[10px] text-sky-100">结果类型：今天已检查</span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={handleDoneForToday}
                        className="btn btn-secondary btn-md rounded-2xl"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        今天已检查
                      </button>
                      <button
                        type="button"
                        onClick={handleBringBackToday}
                        className="btn btn-secondary btn-md rounded-2xl"
                      >
                        <ArrowRight className="h-4 w-4" />
                        恢复到今天
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2.5 rounded-[20px] border border-[color:var(--ui-border-soft)] bg-[rgba(255,255,255,0.02)] px-3 py-3">
                    <div className="text-[11px] uppercase tracking-[0.14em] text-[#AAB3C6]">稍后处理</div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => handlePreset('tomorrow', '跳到明天再看')}
                        className="btn btn-secondary btn-md rounded-2xl"
                      >
                        <SkipForward className="h-4 w-4" />
                        跳过到明天
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
                  </div>

                  <div className="space-y-2.5 rounded-[20px] border border-[color:var(--ui-border-soft)] bg-[rgba(255,255,255,0.02)] px-3 py-3">
                    <div className="text-[11px] uppercase tracking-[0.14em] text-[#AAB3C6]">改期</div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handlePreset('today', '重新拉回到今天')}
                        className="btn btn-secondary btn-sm rounded-2xl"
                      >
                        改到今天
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePreset('tomorrow', '稍后到明天处理')}
                        className="btn btn-secondary btn-sm rounded-2xl"
                      >
                        稍后再看
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={customDate}
                        onChange={(event) => setCustomDate(event.target.value)}
                        min={toDateInput(new Date())}
                        className="w-full bg-[rgba(255,255,255,0.03)] border border-[var(--ui-border-soft)] rounded-2xl px-3 py-2.5 text-sm text-[#E8ECF8] focus:outline-none focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={handleCustomReschedule}
                        disabled={!customDate}
                        className="btn btn-secondary btn-md rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed"
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
            <div className="mt-4 rounded-[24px] border border-dashed border-[var(--ui-border-soft)] bg-[rgba(255,255,255,0.02)] px-4 py-8 text-sm text-[#7d8595]">
              <div>当前分组已经检查完了，可以切到下一组继续扫。</div>
              {nextAvailableGroupMeta ? (
                <div className="mt-2 text-xs text-[#DCE3F4]">建议下一组：{nextAvailableGroupMeta.label}</div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
