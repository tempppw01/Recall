export interface Task {
  id: string;
  title: string;
  dueDate?: string;
  priority: number;
  category?: string;
  status: 'todo' | 'in_progress' | 'completed';
  tags: string[];
  subtasks?: Subtask[];
  repeat?: TaskRepeatRule;
  embedding?: number[]; // 存储向量
  createdAt: string;
}

export type RepeatType = 'none' | 'daily' | 'weekly' | 'monthly' | 'custom';

export interface TaskRepeatRule {
  type: RepeatType;
  interval?: number; // 自定义间隔天数
  weekdays?: number[]; // 0(日) - 6(六)
  monthDay?: number; // 1-31
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface HabitLog {
  date: string; // YYYY-MM-DD
}

export interface Habit {
  id: string;
  title: string;
  createdAt: string;
  logs: HabitLog[];
}

export interface Countdown {
  id: string;
  title: string;
  targetDate: string; // YYYY-MM-DD 或 ISO
  pinned: boolean;
  createdAt: string;
}

const STORAGE_KEY = 'recall_tasks_v1';
const HABIT_STORAGE_KEY = 'recall_habits_v1';
const COUNTDOWN_STORAGE_KEY = 'recall_countdowns_v1';

// 计算余弦相似度
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (!denominator) return 0;
  return dotProduct / denominator;
}

export const taskStore = {
  getAll: (): Task[] => {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  add: (task: Task) => {
    const tasks = taskStore.getAll();
    tasks.unshift(task);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  },

  update: (updatedTask: Task) => {
    const tasks = taskStore.getAll();
    const index = tasks.findIndex(t => t.id === updatedTask.id);
    if (index !== -1) {
      tasks[index] = updatedTask;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    }
  },

  remove: (id: string) => {
    const tasks = taskStore.getAll().filter(task => task.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  },

  // 批量覆盖任务（用于 AI 整理后整体替换）
  replaceAll: (tasks: Task[]) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  },

  search: (queryEmbedding: number[], threshold = 0.7): Task[] => {
    const tasks = taskStore.getAll();
    return tasks
      .map(task => ({
        ...task,
        similarity: task.embedding ? cosineSimilarity(task.embedding, queryEmbedding) : 0
      }))
      .filter(item => item.similarity > threshold)
      .sort((a, b) => b.similarity - a.similarity);
  }
};

export const habitStore = {
  getAll: (): Habit[] => {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(HABIT_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  replaceAll: (habits: Habit[]) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(HABIT_STORAGE_KEY, JSON.stringify(habits));
  },
};

export const countdownStore = {
  getAll: (): Countdown[] => {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(COUNTDOWN_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  add: (countdown: Countdown) => {
    const all = countdownStore.getAll();
    all.push(countdown);
    localStorage.setItem(COUNTDOWN_STORAGE_KEY, JSON.stringify(all));
  },

  update: (updatedCountdown: Countdown) => {
    const all = countdownStore.getAll();
    const index = all.findIndex(item => item.id === updatedCountdown.id);
    if (index !== -1) {
      all[index] = updatedCountdown;
      localStorage.setItem(COUNTDOWN_STORAGE_KEY, JSON.stringify(all));
    }
  },

  remove: (id: string) => {
    const next = countdownStore.getAll().filter(item => item.id !== id);
    localStorage.setItem(COUNTDOWN_STORAGE_KEY, JSON.stringify(next));
  },

  replaceAll: (countdowns: Countdown[]) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(COUNTDOWN_STORAGE_KEY, JSON.stringify(countdowns));
  },
};
