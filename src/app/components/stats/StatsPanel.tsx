"use client";

import { type ComponentType, type ReactNode, useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  CalendarDays,
  CheckCheck,
  CheckCircle2,
  Clock3,
  Flame,
  Layers3,
  ListTodo,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-react';
import type { Habit, PomodoroRecord, Task } from '@/lib/store';

type StatsPanelProps = {
  tasks: Task[];
  habits: Habit[];
  pomodoroRecords: PomodoroRecord[];
};

type StatsTab = 'overview' | 'tasks' | 'focus';

type DailyRollup = {
  key: string;
  label: string;
  weekday: string;
  created: number;
  completed: number;
  focusMinutes: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const FOCUS_DAILY_TARGET_MINUTES = 120;
const PRIORITY_META = [
  { key: 'low', label: '低优先级', color: 'from-emerald-400/90 to-teal-400/80' },
  { key: 'medium', label: '中优先级', color: 'from-amber-400/90 to-orange-400/80' },
  { key: 'high', label: '高优先级', color: 'from-rose-400/90 to-pink-400/80' },
] as const;
const STATS_TABS: Array<{ key: StatsTab; label: string }> = [
  { key: 'overview', label: '总览' },
  { key: 'tasks', label: '任务' },
  { key: 'focus', label: '专注' },
];

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const addDays = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

const formatDayKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDayLabel = (date: Date) => `${date.getMonth() + 1}/${date.getDate()}`;
const formatWeekdayLabel = (date: Date) => ['日', '一', '二', '三', '四', '五', '六'][date.getDay()];

const formatMinutes = (minutes: number) => {
  if (minutes <= 0) return '0m';
  const hours = Math.floor(minutes / 60);
  const remain = minutes % 60;
  if (!hours) return `${minutes}m`;
  if (!remain) return `${hours}h`;
  return `${hours}h ${remain}m`;
};

const clampRate = (value: number) => Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));

const buildLinePath = (values: number[], width: number, height: number, padding: number) => {
  if (!values.length) return '';
  const max = Math.max(...values, 1);
  const step = values.length === 1 ? 0 : (width - padding * 2) / (values.length - 1);
  return values
    .map((value, index) => {
      const x = padding + step * index;
      const y = height - padding - (value / max) * (height - padding * 2);
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
};

const buildAreaPath = (values: number[], width: number, height: number, padding: number) => {
  if (!values.length) return '';
  const line = buildLinePath(values, width, height, padding);
  const step = values.length === 1 ? 0 : (width - padding * 2) / (values.length - 1);
  const baseline = height - padding;
  const firstX = padding;
  const lastX = padding + step * (values.length - 1);
  return `${line} L ${lastX.toFixed(2)} ${baseline.toFixed(2)} L ${firstX.toFixed(2)} ${baseline.toFixed(2)} Z`;
};

const getLinePoint = (values: number[], index: number, width: number, height: number, padding: number) => {
  const max = Math.max(...values, 1);
  const step = values.length === 1 ? 0 : (width - padding * 2) / (values.length - 1);
  return {
    x: padding + step * index,
    y: height - padding - (values[index] / max) * (height - padding * 2),
  };
};

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  accentClassName,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  detail: string;
  accentClassName: string;
}) {
  return (
    <div className="glass-panel-soft motion-enter rounded-[24px] border-[color:var(--ui-border-soft)] px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--ui-text-muted)]">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-[color:var(--ui-text-strong)]">{value}</p>
          <p className="mt-1 text-xs text-[color:var(--ui-text-secondary)]">{detail}</p>
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br ${accentClassName}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
    </div>
  );
}

function SectionCard({
  title,
  description,
  icon: Icon,
  children,
  action,
}: {
  title: string;
  description?: string;
  icon: ComponentType<{ className?: string }>;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="glass-panel motion-enter rounded-[30px] border-[color:var(--ui-border-strong)] p-4 shadow-[0_18px_42px_rgba(0,0,0,0.18)] sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-[rgba(var(--theme-accent),0.22)] bg-[rgba(var(--theme-accent),0.12)] text-[color:var(--ui-text-strong)]">
              <Icon className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-[color:var(--ui-text-strong)] sm:text-[15px]">{title}</h3>
              {description ? <p className="mt-1 text-xs text-[color:var(--ui-text-muted)]">{description}</p> : null}
            </div>
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function RingGauge({
  value,
  total,
  label,
  footnote,
  accent,
}: {
  value: number;
  total: number;
  label: string;
  footnote: string;
  accent: string;
}) {
  const safeTotal = Math.max(total, 1);
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const progress = clampRate((value / safeTotal) * 100);
  const dashoffset = circumference * (1 - progress / 100);

  return (
    <div className="glass-panel-soft rounded-[24px] border-[color:var(--ui-border-soft)] px-4 py-4">
      <div className="flex items-center gap-4">
        <div className="relative h-[108px] w-[108px] shrink-0">
          <svg viewBox="0 0 108 108" className="h-full w-full -rotate-90">
            <circle cx="54" cy="54" r={radius} fill="none" stroke="rgba(148,163,184,0.16)" strokeWidth="10" />
            <circle
              cx="54"
              cy="54"
              r={radius}
              fill="none"
              stroke={accent}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashoffset}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-semibold text-[color:var(--ui-text-strong)]">{Math.round(progress)}%</span>
            <span className="mt-0.5 text-[11px] text-[color:var(--ui-text-muted)]">{label}</span>
          </div>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[color:var(--ui-text-strong)]">
            {value.toLocaleString()} / {safeTotal.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-[color:var(--ui-text-secondary)]">{footnote}</p>
        </div>
      </div>
    </div>
  );
}

function TrendChart({ days }: { days: DailyRollup[] }) {
  const width = 420;
  const height = 184;
  const padding = 18;
  const createdValues = days.map((day) => day.created);
  const completedValues = days.map((day) => day.completed);
  const createdPath = buildLinePath(createdValues, width, height, padding);
  const createdArea = buildAreaPath(createdValues, width, height, padding);
  const completedPath = buildLinePath(completedValues, width, height, padding);
  const createdLastPoint = getLinePoint(createdValues, createdValues.length - 1, width, height, padding);
  const completedLastPoint = getLinePoint(completedValues, completedValues.length - 1, width, height, padding);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/20 bg-sky-400/10 px-2.5 py-1 text-sky-100">
          <span className="h-2 w-2 rounded-full bg-sky-300" />
          新增任务
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-emerald-100">
          <span className="h-2 w-2 rounded-full bg-emerald-300" />
          完成任务
        </span>
      </div>

      <div className="relative overflow-hidden rounded-[24px] border border-[color:var(--ui-border-soft)] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] px-3 py-3">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-[184px] w-full">
          {[0.2, 0.4, 0.6, 0.8].map((ratio) => (
            <line
              key={ratio}
              x1={padding}
              y1={height - padding - (height - padding * 2) * ratio}
              x2={width - padding}
              y2={height - padding - (height - padding * 2) * ratio}
              stroke="rgba(148,163,184,0.12)"
              strokeDasharray="4 6"
            />
          ))}
          <path d={createdArea} fill="rgba(56,189,248,0.12)" />
          <path d={createdPath} fill="none" stroke="rgba(125,211,252,0.95)" strokeWidth="3" strokeLinecap="round" />
          <path d={completedPath} fill="none" stroke="rgba(74,222,128,0.95)" strokeWidth="3" strokeLinecap="round" />
          <circle cx={createdLastPoint.x} cy={createdLastPoint.y} r="4.5" fill="rgba(125,211,252,1)" />
          <circle cx={completedLastPoint.x} cy={completedLastPoint.y} r="4.5" fill="rgba(74,222,128,1)" />
        </svg>

        <div className="mt-2 grid grid-cols-7 gap-1 text-center text-[11px] text-[color:var(--ui-text-muted)]">
          {days.map((day) => (
            <div key={day.key}>
              <p>{day.label}</p>
              <p className="mt-0.5 text-[10px] text-[color:var(--ui-text-faint)]">{day.weekday}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DistributionRows({
  rows,
  emptyText,
}: {
  rows: Array<{ label: string; value: number; toneClassName?: string }>;
  emptyText: string;
}) {
  const max = Math.max(...rows.map((row) => row.value), 1);

  if (!rows.length) {
    return <div className="rounded-[22px] border border-dashed border-[color:var(--ui-border-soft)] px-4 py-6 text-center text-xs text-[color:var(--ui-text-muted)]">{emptyText}</div>;
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.label} className="space-y-1.5">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="truncate text-[color:var(--ui-text-primary)]">{row.label}</span>
            <span className="shrink-0 text-[color:var(--ui-text-secondary)]">{row.value}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[rgba(148,163,184,0.12)]">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${row.toneClassName ?? 'from-sky-400/85 to-indigo-400/80'}`}
              style={{ width: `${Math.max((row.value / max) * 100, row.value ? 12 : 0)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function StatsPanel({ tasks, habits, pomodoroRecords }: StatsPanelProps) {
  const [activeTab, setActiveTab] = useState<StatsTab>('overview');

  const stats = useMemo(() => {
    const now = new Date();
    const today = startOfDay(now);
    const todayKey = formatDayKey(today);
    const weekStart = addDays(today, -6);
    const dayList = Array.from({ length: 7 }, (_, index) => addDays(today, index - 6));
    const dayKeys = new Set(dayList.map((day) => formatDayKey(day)));

    const activeTasks = tasks.filter((task) => task.status !== 'completed');
    const completedTasks = tasks.filter((task) => task.status === 'completed');
    const overdueTasks = activeTasks.filter((task) => task.dueDate && new Date(task.dueDate).getTime() < now.getTime());
    const todayTasks = activeTasks.filter((task) => task.dueDate && formatDayKey(new Date(task.dueDate)) === todayKey);
    const upcomingTasks = activeTasks.filter((task) => {
      if (!task.dueDate) return false;
      const dueDate = new Date(task.dueDate);
      return dueDate >= today && dueDate <= addDays(today, 7);
    });
    const noDateTasks = activeTasks.filter((task) => !task.dueDate);
    const totalTasks = tasks.length;
    const completionRate = totalTasks ? Math.round((completedTasks.length / totalTasks) * 100) : 0;

    const priorityCounts = activeTasks.reduce(
      (acc, task) => {
        const nextPriority = typeof task.priority === 'number' ? Math.max(0, Math.min(2, task.priority)) : 0;
        acc[nextPriority] += 1;
        return acc;
      },
      [0, 0, 0],
    );

    const categoryCounts = activeTasks.reduce<Record<string, number>>((acc, task) => {
      const key = task.category?.trim() || '未分类';
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

    const sortedCategories = Object.entries(categoryCounts)
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], 'zh-CN'))
      .slice(0, 5);

    const dayRollupMap = new Map<string, DailyRollup>(
      dayList.map((day) => [
        formatDayKey(day),
        {
          key: formatDayKey(day),
          label: formatDayLabel(day),
          weekday: formatWeekdayLabel(day),
          created: 0,
          completed: 0,
          focusMinutes: 0,
        },
      ]),
    );

    tasks.forEach((task) => {
      const createdKey = formatDayKey(new Date(task.createdAt));
      if (dayRollupMap.has(createdKey)) {
        dayRollupMap.get(createdKey)!.created += 1;
      }
      if (task.status === 'completed') {
        const completedAt = task.updatedAt || task.createdAt;
        const completedKey = formatDayKey(new Date(completedAt));
        if (dayRollupMap.has(completedKey)) {
          dayRollupMap.get(completedKey)!.completed += 1;
        }
      }
    });

    const focusMinutesByDay = new Map<string, number>();
    pomodoroRecords.forEach((record) => {
      const key = formatDayKey(new Date(record.startTime));
      focusMinutesByDay.set(key, (focusMinutesByDay.get(key) ?? 0) + record.durationMinutes);
      if (dayRollupMap.has(key)) {
        dayRollupMap.get(key)!.focusMinutes += record.durationMinutes;
      }
    });

    const dayRollups = dayList.map((day) => dayRollupMap.get(formatDayKey(day))!);
    const focusTodayMinutes = focusMinutesByDay.get(todayKey) ?? 0;
    const focusWeekMinutes = dayRollups.reduce((sum, day) => sum + day.focusMinutes, 0);
    const focusTotalMinutes = pomodoroRecords.reduce((sum, record) => sum + record.durationMinutes, 0);
    const longestFocusSession = pomodoroRecords.reduce((max, record) => Math.max(max, record.durationMinutes), 0);
    const averageFocusSession = pomodoroRecords.length ? Math.round(focusTotalMinutes / pomodoroRecords.length) : 0;

    let focusStreak = 0;
    for (let index = 0; index < 365; index += 1) {
      const key = formatDayKey(addDays(today, -index));
      if ((focusMinutesByDay.get(key) ?? 0) > 0) {
        focusStreak += 1;
      } else {
        break;
      }
    }

    const habitSummaries = habits.map((habit) => {
      const logKeys = new Set(habit.logs.map((log) => log.date));
      let streak = 0;
      for (let index = 0; index < 365; index += 1) {
        const key = formatDayKey(addDays(today, -index));
        if (logKeys.has(key)) {
          streak += 1;
        } else {
          break;
        }
      }

      const weekCount = dayList.reduce((sum, day) => sum + (logKeys.has(formatDayKey(day)) ? 1 : 0), 0);
      return {
        id: habit.id,
        title: habit.title,
        streak,
        weekCount,
        doneToday: logKeys.has(todayKey),
      };
    }).sort((left, right) => right.streak - left.streak || right.weekCount - left.weekCount || left.title.localeCompare(right.title, 'zh-CN'));

    const topHabits = habitSummaries.slice(0, 4);
    const habitBestStreak = habitSummaries[0]?.streak ?? 0;
    const habitTodayCount = habitSummaries.filter((habit) => habit.doneToday).length;
    const habitWeekLogs = habitSummaries.reduce((sum, habit) => sum + habit.weekCount, 0);

    const recentFocusRecords = [...pomodoroRecords]
      .sort((left, right) => new Date(right.startTime).getTime() - new Date(left.startTime).getTime())
      .slice(0, 6);

    const attentionTasks = [...activeTasks]
      .sort((left, right) => {
        const leftTime = left.dueDate ? new Date(left.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
        const rightTime = right.dueDate ? new Date(right.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
        if (leftTime !== rightTime) return leftTime - rightTime;
        return (right.priority ?? 0) - (left.priority ?? 0);
      })
      .slice(0, 6)
      .map((task) => ({
        id: task.id,
        title: task.title,
        dueLabel: !task.dueDate
          ? '未设日期'
          : new Date(task.dueDate).getTime() < now.getTime()
          ? '已逾期'
          : formatDayKey(new Date(task.dueDate)) === todayKey
          ? '今天'
          : formatDayKey(new Date(task.dueDate)),
        priority: task.priority ?? 0,
      }));

    const createdThisWeek = dayRollups.reduce((sum, day) => sum + day.created, 0);
    const completedThisWeek = dayRollups.reduce((sum, day) => sum + day.completed, 0);
    const focusGoalRate = clampRate((focusTodayMinutes / FOCUS_DAILY_TARGET_MINUTES) * 100);

    return {
      totalTasks,
      activeTasks,
      completedTasks,
      overdueTasks,
      todayTasks,
      upcomingTasks,
      noDateTasks,
      completionRate,
      priorityCounts,
      sortedCategories,
      dayRollups,
      focusTodayMinutes,
      focusWeekMinutes,
      focusTotalMinutes,
      focusStreak,
      longestFocusSession,
      averageFocusSession,
      topHabits,
      habitBestStreak,
      habitTodayCount,
      habitWeekLogs,
      recentFocusRecords,
      attentionTasks,
      createdThisWeek,
      completedThisWeek,
      focusGoalRate,
      weekStartLabel: `${formatDayLabel(weekStart)} - ${formatDayLabel(today)}`,
      activeWeekFocusDays: dayRollups.filter((day) => day.focusMinutes > 0).length,
      completedThisWeekRatio: createdThisWeek ? clampRate((completedThisWeek / createdThisWeek) * 100) : 0,
      tasksCompletedCount: completedTasks.length,
      dayKeys,
    };
  }, [habits, pomodoroRecords, tasks]);

  const overviewMetrics = [
    {
      icon: ListTodo,
      label: '进行中',
      value: stats.activeTasks.length.toLocaleString(),
      detail: `今天到期 ${stats.todayTasks.length} 项`,
      accentClassName: 'from-sky-500 to-cyan-400',
    },
    {
      icon: CheckCheck,
      label: '完成率',
      value: `${stats.completionRate}%`,
      detail: `已完成 ${stats.tasksCompletedCount} / ${stats.totalTasks}`,
      accentClassName: 'from-emerald-500 to-teal-400',
    },
    {
      icon: Clock3,
      label: '逾期任务',
      value: stats.overdueTasks.length.toLocaleString(),
      detail: `未来 7 天还有 ${stats.upcomingTasks.length} 项`,
      accentClassName: 'from-rose-500 to-orange-400',
    },
    {
      icon: Zap,
      label: '今日专注',
      value: formatMinutes(stats.focusTodayMinutes),
      detail: `目标达成 ${Math.round(stats.focusGoalRate)}%`,
      accentClassName: 'from-violet-500 to-indigo-400',
    },
  ];

  const priorityRows = PRIORITY_META.map((priority, index) => ({
    label: priority.label,
    value: stats.priorityCounts[index],
    toneClassName: priority.color,
  }));

  const categoryRows = stats.sortedCategories.map(([label, value], index) => ({
    label,
    value,
    toneClassName: index % 2 === 0 ? 'from-sky-400/85 to-indigo-400/80' : 'from-violet-400/85 to-fuchsia-400/80',
  }));

  return (
    <div className="theme-native-surface stack-gap flex flex-col px-3 pb-4 sm:px-6 sm:pb-6">
      <section className="glass-panel motion-enter rounded-[32px] border-[color:var(--ui-border-strong)] p-4 shadow-[0_20px_48px_rgba(0,0,0,0.2)] sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(var(--theme-accent),0.22)] bg-[rgba(var(--theme-accent),0.09)] px-3 py-1 text-[11px] font-medium text-[color:var(--ui-text-secondary)]">
              <Sparkles className="h-3.5 w-3.5" />
              统计面板
            </div>
            <h2 className="mt-3 text-[24px] font-semibold tracking-[-0.04em] text-[color:var(--ui-text-strong)] sm:text-[30px]">
              用任务、专注和习惯数据，看清下一步节奏
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-[color:var(--ui-text-secondary)]">
              先看趋势，再决定今天该压缩什么、推进什么。
            </p>
          </div>

          <div className="inline-flex rounded-[18px] border border-[color:var(--ui-border-soft)] bg-[rgba(255,255,255,0.03)] p-1">
            {STATS_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-[14px] px-4 py-2 text-sm font-medium transition-all ${
                  activeTab === tab.key
                    ? 'bg-[linear-gradient(135deg,rgba(var(--theme-accent),0.92),rgba(var(--theme-grad-end),0.82))] text-white shadow-[0_14px_28px_rgba(var(--theme-accent),0.22)]'
                    : 'text-[color:var(--ui-text-secondary)] hover:text-[color:var(--ui-text-strong)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
          <div className="overflow-hidden rounded-[28px] border border-[rgba(var(--theme-accent),0.22)] bg-[linear-gradient(135deg,rgba(var(--theme-accent),0.18),rgba(var(--theme-grad-end),0.08)_52%,rgba(7,11,18,0.16))] px-4 py-4 sm:px-5">
            <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[color:var(--ui-text-muted)]">
              <span>过去 7 天</span>
              <span className="rounded-full border border-white/10 px-2 py-1 normal-case tracking-normal text-[color:var(--ui-text-secondary)]">
                {stats.weekStartLabel}
              </span>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-[color:var(--ui-text-secondary)]">新增任务</p>
                <p className="mt-1 text-3xl font-semibold text-[color:var(--ui-text-strong)]">{stats.createdThisWeek}</p>
              </div>
              <div>
                <p className="text-xs text-[color:var(--ui-text-secondary)]">完成任务</p>
                <p className="mt-1 text-3xl font-semibold text-[color:var(--ui-text-strong)]">{stats.completedThisWeek}</p>
              </div>
              <div>
                <p className="text-xs text-[color:var(--ui-text-secondary)]">专注总时长</p>
                <p className="mt-1 text-3xl font-semibold text-[color:var(--ui-text-strong)]">{formatMinutes(stats.focusWeekMinutes)}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <div className="glass-panel-soft rounded-[22px] border-[color:var(--ui-border-soft)] px-4 py-3.5">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--ui-text-muted)]">专注连续天数</p>
              <p className="mt-2 text-2xl font-semibold text-[color:var(--ui-text-strong)]">{stats.focusStreak} 天</p>
            </div>
            <div className="glass-panel-soft rounded-[22px] border-[color:var(--ui-border-soft)] px-4 py-3.5">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--ui-text-muted)]">习惯完成</p>
              <p className="mt-2 text-2xl font-semibold text-[color:var(--ui-text-strong)]">
                {stats.habitTodayCount}/{habits.length || 0}
              </p>
            </div>
            <div className="glass-panel-soft rounded-[22px] border-[color:var(--ui-border-soft)] px-4 py-3.5">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--ui-text-muted)]">待处理积压</p>
              <p className="mt-2 text-2xl font-semibold text-[color:var(--ui-text-strong)]">{stats.overdueTasks.length + stats.noDateTasks.length}</p>
            </div>
          </div>
        </div>
      </section>

      {activeTab === 'overview' ? (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {overviewMetrics.map((metric) => (
              <MetricCard key={metric.label} {...metric} />
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
            <SectionCard title="任务节奏" description="新增和完成是否在一个合理的推进曲线上" icon={TrendingUp}>
              <TrendChart days={stats.dayRollups} />
            </SectionCard>

            <div className="space-y-4">
              <SectionCard title="核心达成" description="先看任务完成率，再看今日专注目标" icon={Target}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <RingGauge
                    value={stats.tasksCompletedCount}
                    total={stats.totalTasks}
                    label="任务完成"
                    footnote="累计完成占比"
                    accent="rgba(74,222,128,0.95)"
                  />
                  <RingGauge
                    value={stats.focusTodayMinutes}
                    total={FOCUS_DAILY_TARGET_MINUTES}
                    label="今日专注"
                    footnote="以 120 分钟为目标"
                    accent="rgba(129,140,248,0.95)"
                  />
                </div>
              </SectionCard>

              <SectionCard title="习惯动量" description="哪些重复动作已经开始形成惯性" icon={Flame}>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="glass-panel-soft rounded-[22px] border-[color:var(--ui-border-soft)] px-3.5 py-3">
                    <p className="text-[11px] text-[color:var(--ui-text-muted)]">今日打卡</p>
                    <p className="mt-1 text-xl font-semibold text-[color:var(--ui-text-strong)]">{stats.habitTodayCount}</p>
                  </div>
                  <div className="glass-panel-soft rounded-[22px] border-[color:var(--ui-border-soft)] px-3.5 py-3">
                    <p className="text-[11px] text-[color:var(--ui-text-muted)]">最佳连续</p>
                    <p className="mt-1 text-xl font-semibold text-[color:var(--ui-text-strong)]">{stats.habitBestStreak} 天</p>
                  </div>
                  <div className="glass-panel-soft rounded-[22px] border-[color:var(--ui-border-soft)] px-3.5 py-3">
                    <p className="text-[11px] text-[color:var(--ui-text-muted)]">本周打卡</p>
                    <p className="mt-1 text-xl font-semibold text-[color:var(--ui-text-strong)]">{stats.habitWeekLogs}</p>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {stats.topHabits.length ? stats.topHabits.map((habit) => (
                    <div key={habit.id} className="flex items-center justify-between gap-3 rounded-[20px] border border-[color:var(--ui-border-soft)] bg-[rgba(255,255,255,0.025)] px-3.5 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm text-[color:var(--ui-text-strong)]">{habit.title}</p>
                        <p className="mt-1 text-xs text-[color:var(--ui-text-muted)]">本周打卡 {habit.weekCount} 次</p>
                      </div>
                      <span className="shrink-0 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-xs text-emerald-100">
                        {habit.streak} 天连续
                      </span>
                    </div>
                  )) : (
                    <div className="rounded-[22px] border border-dashed border-[color:var(--ui-border-soft)] px-4 py-6 text-center text-xs text-[color:var(--ui-text-muted)]">
                      还没有习惯数据，先从一次打卡开始。
                    </div>
                  )}
                </div>
              </SectionCard>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard title="列表重心" description="当前任务主要堆在哪些分类里" icon={Layers3}>
              <DistributionRows rows={categoryRows} emptyText="暂时没有分类数据。" />
            </SectionCard>

            <SectionCard title="最近专注记录" description="最近几次专注是什么时候，持续了多久" icon={Activity}>
              <div className="space-y-3">
                {stats.recentFocusRecords.length ? stats.recentFocusRecords.map((record) => (
                  <div key={record.id} className="flex items-center justify-between gap-3 rounded-[20px] border border-[color:var(--ui-border-soft)] bg-[rgba(255,255,255,0.025)] px-3.5 py-3">
                    <div>
                      <p className="text-sm text-[color:var(--ui-text-strong)]">
                        {new Date(record.startTime).toLocaleString('zh-CN', {
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      <p className="mt-1 text-xs text-[color:var(--ui-text-muted)]">
                        结束于 {new Date(record.endTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full border border-violet-400/20 bg-violet-400/10 px-2.5 py-1 text-xs text-violet-100">
                      {formatMinutes(record.durationMinutes)}
                    </span>
                  </div>
                )) : (
                  <div className="rounded-[22px] border border-dashed border-[color:var(--ui-border-soft)] px-4 py-6 text-center text-xs text-[color:var(--ui-text-muted)]">
                    暂无专注记录，开始一个番茄钟后这里会出现节奏轨迹。
                  </div>
                )}
              </div>
            </SectionCard>
          </div>
        </>
      ) : null}

      {activeTab === 'tasks' ? (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard icon={CalendarDays} label="今天到期" value={String(stats.todayTasks.length)} detail="今天要推进的任务" accentClassName="from-cyan-500 to-blue-400" />
            <MetricCard icon={Clock3} label="逾期" value={String(stats.overdueTasks.length)} detail="优先清空积压" accentClassName="from-rose-500 to-orange-400" />
            <MetricCard icon={Target} label="未来 7 天" value={String(stats.upcomingTasks.length)} detail="提前安排资源" accentClassName="from-indigo-500 to-violet-400" />
            <MetricCard icon={Sparkles} label="无日期" value={String(stats.noDateTasks.length)} detail="需要补时间锚点" accentClassName="from-slate-500 to-slate-400" />
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
            <SectionCard title="任务推进趋势" description="观察过去 7 天新增与完成是否失衡" icon={BarChart3}>
              <TrendChart days={stats.dayRollups} />
            </SectionCard>

            <SectionCard title="优先级分布" description="高优先级是否被低优任务挤占" icon={Target}>
              <DistributionRows rows={priorityRows} emptyText="当前没有进行中的任务。" />
            </SectionCard>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard title="分类占比" description="把注意力最多的几个列表先看清" icon={Layers3}>
              <DistributionRows rows={categoryRows} emptyText="暂时没有分类数据。" />
            </SectionCard>

            <SectionCard title="最该先处理" description="按日期和优先级排出的待关注任务" icon={CheckCircle2}>
              <div className="space-y-3">
                {stats.attentionTasks.length ? stats.attentionTasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between gap-3 rounded-[20px] border border-[color:var(--ui-border-soft)] bg-[rgba(255,255,255,0.025)] px-3.5 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-[color:var(--ui-text-strong)]">{task.title}</p>
                      <p className="mt-1 text-xs text-[color:var(--ui-text-muted)]">{task.dueLabel}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs ${
                      task.priority === 2
                        ? 'border border-rose-400/20 bg-rose-400/10 text-rose-100'
                        : task.priority === 1
                        ? 'border border-amber-400/20 bg-amber-400/10 text-amber-100'
                        : 'border border-emerald-400/20 bg-emerald-400/10 text-emerald-100'
                    }`}>
                      {task.priority === 2 ? '高优' : task.priority === 1 ? '中优' : '低优'}
                    </span>
                  </div>
                )) : (
                  <div className="rounded-[22px] border border-dashed border-[color:var(--ui-border-soft)] px-4 py-6 text-center text-xs text-[color:var(--ui-text-muted)]">
                    当前没有需要优先处理的任务。
                  </div>
                )}
              </div>
            </SectionCard>
          </div>
        </>
      ) : null}

      {activeTab === 'focus' ? (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard icon={Zap} label="今日专注" value={formatMinutes(stats.focusTodayMinutes)} detail="当日累计时长" accentClassName="from-violet-500 to-indigo-400" />
            <MetricCard icon={TrendingUp} label="本周专注" value={formatMinutes(stats.focusWeekMinutes)} detail={`${stats.activeWeekFocusDays} 天有记录`} accentClassName="from-sky-500 to-cyan-400" />
            <MetricCard icon={Flame} label="连续天数" value={`${stats.focusStreak} 天`} detail="有助于形成稳定节律" accentClassName="from-rose-500 to-orange-400" />
            <MetricCard icon={Clock3} label="平均单次" value={formatMinutes(stats.averageFocusSession)} detail={`最长 ${formatMinutes(stats.longestFocusSession)}`} accentClassName="from-emerald-500 to-teal-400" />
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
            <SectionCard title="7 天专注柱状图" description="先看你把时间真正投给了哪几天" icon={Activity}>
              <div className="grid h-[240px] grid-cols-7 items-end gap-3 rounded-[24px] border border-[color:var(--ui-border-soft)] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] px-3 py-4">
                {stats.dayRollups.map((day) => {
                  const max = Math.max(...stats.dayRollups.map((item) => item.focusMinutes), 1);
                  const height = day.focusMinutes ? Math.max((day.focusMinutes / max) * 100, 12) : 4;
                  return (
                    <div key={day.key} className="flex h-full flex-col items-center justify-end gap-2">
                      <span className="text-[11px] text-[color:var(--ui-text-secondary)]">{day.focusMinutes ? formatMinutes(day.focusMinutes) : '0m'}</span>
                      <div className="flex w-full max-w-[44px] flex-1 items-end rounded-full bg-[rgba(148,163,184,0.1)] p-1">
                        <div
                          className="w-full rounded-full bg-[linear-gradient(180deg,rgba(129,140,248,0.96),rgba(56,189,248,0.9))] shadow-[0_10px_24px_rgba(99,102,241,0.2)]"
                          style={{ height: `${height}%` }}
                        />
                      </div>
                      <div className="text-center text-[11px] text-[color:var(--ui-text-muted)]">
                        <p>{day.label}</p>
                        <p className="mt-0.5 text-[10px] text-[color:var(--ui-text-faint)]">{day.weekday}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>

            <SectionCard title="专注强度" description="看目标达成和总量，不只看次数" icon={Target}>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <RingGauge
                  value={stats.focusTodayMinutes}
                  total={FOCUS_DAILY_TARGET_MINUTES}
                  label="今日目标"
                  footnote="默认参考值 120 分钟"
                  accent="rgba(129,140,248,0.95)"
                />
                <RingGauge
                  value={stats.focusWeekMinutes}
                  total={Math.max(FOCUS_DAILY_TARGET_MINUTES * 5, stats.focusWeekMinutes)}
                  label="周累计"
                  footnote="用来判断这周是否真正留出了深度时间"
                  accent="rgba(56,189,248,0.95)"
                />
              </div>
            </SectionCard>
          </div>

          <SectionCard title="最近专注片段" description="用最近几次记录判断节奏是否稳定" icon={Activity}>
            <div className="grid gap-3 lg:grid-cols-2">
              {stats.recentFocusRecords.length ? stats.recentFocusRecords.map((record) => (
                <div key={record.id} className="rounded-[22px] border border-[color:var(--ui-border-soft)] bg-[rgba(255,255,255,0.025)] px-4 py-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-[color:var(--ui-text-strong)]">
                        {new Date(record.startTime).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}
                      </p>
                      <p className="mt-1 text-xs text-[color:var(--ui-text-muted)]">
                        {new Date(record.startTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })} -{' '}
                        {new Date(record.endTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <span className="rounded-full border border-violet-400/20 bg-violet-400/10 px-2.5 py-1 text-xs text-violet-100">
                      {formatMinutes(record.durationMinutes)}
                    </span>
                  </div>
                </div>
              )) : (
                <div className="col-span-full rounded-[22px] border border-dashed border-[color:var(--ui-border-soft)] px-4 py-6 text-center text-xs text-[color:var(--ui-text-muted)]">
                  暂无专注记录，开始一次番茄后再回来复盘会更有感觉。
                </div>
              )}
            </div>
          </SectionCard>
        </>
      ) : null}
    </div>
  );
}
