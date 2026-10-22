import { useMemo } from 'react';
import type { Task } from '@/lib/store';

export type ActiveFilter =
  | 'todo'
  | 'inbox'
  | 'today'
  | 'tomorrow'
  | 'next7'
  | 'assigned'
  | 'abandoned'
  | 'completed'
  | 'calendar'
  | 'quadrant'
  | 'countdown'
  | 'habit'
  | 'pomodoro'
  | 'stats'
  | 'agent'
  | 'category'
  | 'tag'
  | 'timeline'
  | string;

/** 「指派给我」使用的负责人占位值。 */
export const SELF_ASSIGNEE = 'me';

/** 任务是否指派给了当前用户。历史数据没有 assignee，视为指派给自己。 */
export const isAssignedToMe = (task: Task) => !task.assignee || task.assignee === SELF_ASSIGNEE;

const isDueOnDate = (task: Task, target: Date) => {
  if (!task.dueDate) return false;
  const due = new Date(task.dueDate);
  if (Number.isNaN(due.getTime())) return false;
  return (
    due.getFullYear() === target.getFullYear() &&
    due.getMonth() === target.getMonth() &&
    due.getDate() === target.getDate()
  );
};

export function useTaskFilters(params: {
  tasks: Task[];
  activeFilter: ActiveFilter;
  activeCategory: string | null;
  activeTag: string | null;
  searchQuery?: string;
  now: Date;
  isTaskOverdue: (task: Task) => boolean;
  isTaskDueToday: (task: Task, now: Date) => boolean;
  isTaskDueWithinDays: (task: Task, now: Date, days: number) => boolean;
  showCompletedTasks?: boolean;
}) {
  const {
    tasks,
    activeFilter,
    activeCategory,
    activeTag,
    searchQuery = '',
    now,
    isTaskOverdue,
    isTaskDueToday,
    isTaskDueWithinDays,
    showCompletedTasks = false,
  } = params;

  return useMemo(() => {
    const canShowTask = (task: Task) => showCompletedTasks || task.status !== 'completed';

    const filtered = tasks.filter((t) => {
      if (activeFilter === 'abandoned') {
        return t.status === 'abandoned';
      }
      // 已放弃的任务不出现在常规视图里，只在「已放弃」入口展示。
      if (t.status === 'abandoned') return false;
      if (activeFilter === 'agent') return true;
      if (activeFilter === 'completed') return t.status === 'completed';
      if (activeFilter === 'search') {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return canShowTask(t);
        return (
          canShowTask(t) &&
          (t.title || '').toLowerCase().includes(query) &&
          !(t.tags || []).some((tag) => tag.toLowerCase().includes(query))
        );
      }
      if (activeFilter === 'inbox') {
        return canShowTask(t) && !t.category;
      }
      if (activeFilter === 'today') {
        return canShowTask(t) && isTaskDueToday(t, now);
      }
      if (activeFilter === 'tomorrow') {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return canShowTask(t) && isDueOnDate(t, tomorrow);
      }
      if (activeFilter === 'next7') {
        return canShowTask(t) && isTaskDueWithinDays(t, now, 7);
      }
      if (activeFilter === 'assigned') {
        return canShowTask(t) && isAssignedToMe(t);
      }
      if (activeFilter === 'category') {
        return canShowTask(t) && (activeCategory ? t.category === activeCategory : true);
      }
      if (activeFilter === 'tag') {
        return canShowTask(t) && (activeTag ? (t.tags || []).includes(activeTag) : true);
      }

      return canShowTask(t);
    });

    const activeDueTasks = filtered.filter((task) => task.status !== 'completed' && task.dueDate);
    const overdueCount = activeDueTasks.filter((task) => isTaskOverdue(task)).length;

    return {
      filteredTasks: filtered,
      overdueCount,
      activeDueCount: activeDueTasks.length,
    };
  }, [
    tasks,
    activeFilter,
    activeCategory,
    activeTag,
    searchQuery,
    now,
    isTaskOverdue,
    isTaskDueToday,
    isTaskDueWithinDays,
    showCompletedTasks,
  ]);
}
