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
  embedding?: number[];
  createdAt: string;
  sortOrder?: number;
}

export type RepeatType = 'none' | 'daily' | 'weekly' | 'monthly' | 'custom';

export interface TaskRepeatRule {
  type: RepeatType;
  interval?: number;
  weekdays?: number[];
  monthDay?: number;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface HabitLog {
  date: string;
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
  targetDate: string;
  pinned: boolean;
  createdAt: string;
}

export const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i += 1) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (!denominator) return 0;
  return dotProduct / denominator;
};
