import { useMemo } from 'react';
import type { Task } from '@/lib/store';

export type ActiveFilter =
  | 'todo'
  | 'inbox'
  | 'today'
  | 'next7'
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

export function useTaskFilters(params: {
  tasks: Task[];
  activeFilter: ActiveFilter;
  activeCategory: string | null;
  activeTag: string | null;
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
    now,
    isTaskOverdue,
    isTaskDueToday,
    isTaskDueWithinDays,
    showCompletedTasks = false,
  } = params;

  return useMemo(() => {
    const canShowTask = (task: Task) => showCompletedTasks || task.status !== 'completed';

    const filtered = tasks.filter((t) => {
      if (activeFilter === 'agent') return true;
      if (activeFilter === 'completed') return t.status === 'completed';
      if (activeFilter === 'inbox') {
        return canShowTask(t) && !t.dueDate;
      }
      if (activeFilter === 'today') {
        return canShowTask(t) && isTaskDueToday(t, now);
      }
      if (activeFilter === 'next7') {
        return canShowTask(t) && isTaskDueWithinDays(t, now, 7);
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
    now,
    isTaskOverdue,
    isTaskDueToday,
    isTaskDueWithinDays,
    showCompletedTasks,
  ]);
}
