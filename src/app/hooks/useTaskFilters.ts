import { useMemo } from 'react';
import type { Task } from '@/lib/store';

export type ActiveFilter =
  | 'todo'
  | 'inbox'
  | 'today'
  | 'next7'
  | 'calendar'
  | 'quadrant'
  | 'countdown'
  | 'habit'
  | 'pomodoro'
  | 'agent'
  | 'completed'
  | 'category'
  | 'tag'
  | 'timeline'
  | string;

export function useTaskFilters(params: {
  tasks: Task[];
  activeFilter: ActiveFilter;
  activeCategory: string | null;
  activeTag: string | null;
  now: Date;
  isTaskOverdue: (task: Task) => boolean;
  isTaskDueToday: (task: Task, now: Date) => boolean;
  isTaskDueWithinDays: (task: Task, now: Date, days: number) => boolean;
}) {
  const {
    tasks,
    activeFilter,
    activeCategory,
    activeTag,
    now,
    isTaskOverdue,
    isTaskDueToday,
    isTaskDueWithinDays,
  } = params;

  return useMemo(() => {
    const filtered = tasks.filter((t) => {
      if (activeFilter === 'agent') return true;
      if (activeFilter === 'completed') return t.status === 'completed';
      if (activeFilter === 'today') {
        return t.status !== 'completed' && isTaskDueToday(t, now);
      }
      if (activeFilter === 'next7') {
        return t.status !== 'completed' && isTaskDueWithinDays(t, now, 7);
      }
      if (activeFilter === 'category') {
        return activeCategory ? t.category === activeCategory : true;
      }
      if (activeFilter === 'tag') {
        return activeTag ? (t.tags || []).includes(activeTag) : true;
      }

      // default: show non-completed
      return t.status !== 'completed';
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
    now,
    isTaskOverdue,
    isTaskDueToday,
    isTaskDueWithinDays,
  ]);
}
